# app/docket.py
"""The DOCKET receipt: persist, fetch, replay.

A receipt is the credibility artifact — everything a skeptic needs to re-derive a verdict by
hand (CONTRACT.md section 2.5). Its load-bearing field is `cypher[]`: the VERBATIM
PARAMETERISED text that was executed, with the params AS BOUND, in execution order. That is
what makes a receipt replayable, and it is why app/graph.py CypherLog stores statement text
rather than a rendered string — a query with its parameters already substituted in is no
longer the parameterised statement that ran.

Note the wording, because it matters for how this is described: a receipt replays A SINGLE
PARAMETERISED CYPHER QUERY per statement. FalkorDB v4.22.1 exposes 25 built-in procedures
([VERIFIED section 3-P1]) and no user-defined-procedure surface, so there is nothing
server-side holding the logic — the text in the receipt IS the logic.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Dict, List, Optional

from app import config, cypher
from app.errors import MengerError
from app.graph import Engine

# FalkorDB has no null property: setting a property to null is setting no property, so
# `r.winner_claim_id` on a slot with no winner would come back MISSING rather than null and
# the projection would have to distinguish absent from null. The empty string is written
# instead, and converted back to JSON null at the response boundary (section 9.3).
NO_WINNER = ""


def _row_to_dict(header_names: List[str], row: List[Any]) -> Dict[str, Any]:
    return dict(zip(header_names, row))


# the column order of app/cypher.py READS['receipt.by_id'], which is fixed in that file
RECEIPT_COLUMNS = [
    "receipt_id", "claim_id", "slot_key", "verdict", "margin", "epsilon",
    "lambda_per_hour", "winner_claim_id", "candidates_json", "cypher_json",
    "engine_json", "created_at",
]


# ===========================================================================
# persist
# ===========================================================================

def persist(
    engine: Engine,
    *,
    receipt_id: str,
    claim_id: str,
    slot_key: str,
    verdict: str,
    margin: float,
    winner_claim_id: Optional[str],
    candidates: List[Dict[str, Any]],
    statements: List[Dict[str, Any]],
    created_at: str,
) -> str:
    """Write one :Receipt. Returns receipt_id.

    epsilon and lambda are frozen INTO the receipt from config at write time (section 4.1).
    This is the whole point of storing them: a receipt read next week must say which band
    produced the verdict, not which band is configured now. A console that recomputes the
    verdict from a live /health epsilon would silently disagree with an old receipt.
    """
    engine.write.run(
        "receipt.create",
        {
            "receipt_id": receipt_id,
            "claim_id": claim_id,
            "slot_key": slot_key,
            "verdict": verdict,
            "margin": round(float(margin), config.DP_MARGIN),
            "epsilon": config.EPSILON,
            "lambda_per_hour": config.LAMBDA_PER_HOUR,
            "winner_claim_id": winner_claim_id or NO_WINNER,
            # sort_keys so two receipts over the same data are byte-identical, which is what
            # lets `/replay` compare JSON blobs instead of walking them field by field.
            "candidates_json": json.dumps(candidates, sort_keys=True),
            "cypher_json": json.dumps(statements, sort_keys=True),
            "engine_json": json.dumps(engine.identity(), sort_keys=True),
            "created_at": created_at,
        },
    )
    return receipt_id


# ===========================================================================
# fetch
# ===========================================================================

def fetch(engine: Engine, receipt_id: str) -> Dict[str, Any]:
    """Read one receipt and rehydrate it. Raises 404 RECEIPT_NOT_FOUND if absent."""
    rows = engine.read.run(
        "receipt.by_id", cypher.READS["receipt.by_id"], {"receipt_id": receipt_id}
    )
    if not rows:
        raise MengerError.receipt_not_found(receipt_id)
    record = _row_to_dict(RECEIPT_COLUMNS, rows[0])
    record["candidates"] = json.loads(record.pop("candidates_json") or "[]")
    record["cypher"] = json.loads(record.pop("cypher_json") or "[]")
    record["engine"] = json.loads(record.pop("engine_json") or "{}")
    # the sentinel, reversed exactly once, here (section 9.3)
    if record.get("winner_claim_id") == NO_WINNER:
        record["winner_claim_id"] = None
    return record


# ===========================================================================
# replay
# ===========================================================================

def _numbers_of(statement_label: str, rows: List[List[Any]]) -> Dict[str, Any]:
    """The comparable scalars a replayed statement produces.

    Only the scalars are compared, never the whole result set. The witness EDGE SET can
    legitimately differ between two runs with the same max-flow value — maxFlow is free to
    saturate a different set of equally valid edges — so comparing edge sets would report
    spurious divergence. The flow VALUE and the path WEIGHT cannot differ unless the graph
    changed, which is exactly the condition `GRAPH_MUTATED` names.
    """
    if not rows:
        return {}
    if statement_label == "independence.maxFlow":
        return {"max_flow": int(round(float(rows[0][0])))}
    if statement_label == "reliability.SPpaths":
        # path_cost (the hop count) is deliberately NOT returned, even though the statement
        # yields it. The receipt never recorded it — `_original_numbers` reads the comparable
        # scalars back out of `candidates[].reliability_path`, which stores `path_weight`
        # alone. Returning `path_cost` here made the two dicts differ in their KEY SET on
        # every replay, so `original == replayed` was unconditionally False and
        # `matches_original` could never be true. A replay that always cries wolf is worse
        # than no replay: a reader learns to ignore it.
        #
        # ARCHITECTURE.md section 7.10 carries this inconsistency between its own
        # `_numbers_of` and `_original_numbers`. It was transcribed faithfully and is
        # corrected here rather than preserved. See DEV-005.
        #
        # The hop count still earns its keep — it is the T-3b guard (`pathWeight != pathCost`)
        # that catches the AF-3 silent-trap regression. That guard lives in bootcheck.py,
        # where both numbers come from the SAME read. It is not a cross-time quantity, so it
        # has no place in a replay diff.
        return {"path_weight": round(float(rows[0][0]), config.DP_PATH_WEIGHT)}
    return {}


def replay(engine: Engine, receipt_id: str, replayed_at: str) -> Dict[str, Any]:
    """Re-execute the receipt's recorded statements verbatim and report reproduction.

    CONTRACT.md section 2.6. Three rules it fixes, and this function obeys all three:

      1. `409 REPLAY_MISMATCH` is raised ONLY when a statement fails to EXECUTE. A changed
         NUMBER is a 200 with a `divergence` entry, not an error. A 409 for a changed number
         would make "the graph moved on" indistinguishable from "the receipt is corrupt".
      2. `matches_original` IGNORES recency drift. Time moving is expected and benign; it is
         reported with `reason: "RECENCY_DECAY"` and does not falsify the receipt.
      3. The recorded TEXT is re-run. Not a regenerated statement, not a re-derived one. If
         app/cypher.py changes tomorrow, an old receipt still replays its own old text, which
         is the only thing that makes "replayable" mean anything.

    All of it goes through GRAPH.RO_QUERY (AF-8): a replay cannot mutate what it audits, and
    that is enforced by the engine, not by trusting this function ([VERIFIED section 3-P2]).
    """
    record = fetch(engine, receipt_id)

    statements_out: List[Dict[str, Any]] = []
    all_match = True
    # A receipt covers EVERY candidate in the slot, so there are N maxFlow statements and N
    # SPpaths statements for N candidates. `seen` counts occurrences PER LABEL so the i-th
    # maxFlow statement is compared against the i-th candidate's recorded numbers. Without
    # this counter every statement would be compared against candidates[0] and a divergence
    # on the second candidate would be reported as a divergence on the first.
    seen: Dict[str, int] = {}

    for entry in record["cypher"]:
        label = entry.get("label", "<unlabelled>")
        occurrence = seen.get(label, 0)
        seen[label] = occurrence + 1
        try:
            rows = engine.read.run(label, entry["query"], entry.get("params") or {})
        except MengerError as exc:
            # The statement itself failed to execute — rule 1 above. This is the ONLY path
            # to a 409 from this endpoint.
            raise MengerError.replay_mismatch(label, exc.message) from exc

        replayed = _numbers_of(label, rows)
        original = _original_numbers(record, label, occurrence)
        match = (not original) or (original == replayed)
        all_match = all_match and match
        statements_out.append(
            {
                "label": label,
                "duration_ms": entry.get("duration_ms"),
                "original": original,
                "replayed": replayed,
                "match": match,
            }
        )

    components_then = {
        c["claim_id"]: {
            "independence": c["components"]["independence"],
            "reliability": c["components"]["reliability"],
            "recency": c["components"]["recency"],
        }
        for c in record["candidates"]
    }
    components_now, divergence = _recompute_now(engine, record, replayed_at)

    # ENGINE_DIFF: the image/graph/read_path the receipt was produced under vs now. Checked
    # explicitly because a receipt produced on a different engine build is not reproducible
    # even if every number happens to agree.
    if record["engine"] != engine.identity():
        all_match = False
        divergence.append(
            {
                "claim_id": None,
                "field": "engine",
                "then": record["engine"],
                "now": engine.identity(),
                "reason": "ENGINE_DIFF",
            }
        )

    # Rule 2: only GRAPH_MUTATED and ENGINE_DIFF falsify a receipt.
    fatal = [d for d in divergence if d["reason"] in ("GRAPH_MUTATED", "ENGINE_DIFF")]
    return {
        "receipt_id": receipt_id,
        "replayed_at": replayed_at,
        "matches_original": bool(all_match and not fatal),
        "statements": statements_out,
        "components_then": components_then,
        "components_now": components_now,
        "divergence": divergence,
    }


def _original_numbers(
    record: Dict[str, Any], label: str, occurrence: int
) -> Dict[str, Any]:
    """The scalars the receipt RECORDED for the `occurrence`-th statement labelled `label`.

    They are read back out of the candidate blocks rather than stored a second time
    alongside the statement, because two copies of the same number in one receipt can
    disagree and then the receipt has to adjudicate itself.

    Statements are matched to candidates POSITIONALLY within their label group, in the order
    app/api.py scored them — which is the order candidates[] is written in (section 12). That
    coupling between two files is the price of not storing the numbers twice, and it is the
    reason section 12 states the scoring order as a normative step rather than an incidental
    detail. An out-of-range occurrence returns {} (no comparison) rather than raising: a
    receipt with more statements than candidates is a receipt from a future version, and
    refusing to replay it at all would be worse than replaying it without the diff.
    """
    candidates = record.get("candidates") or []
    if occurrence >= len(candidates):
        return {}
    candidate = candidates[occurrence]
    if label == "independence.maxFlow":
        return {"max_flow": candidate["independence_witness"]["max_flow"]}
    if label == "reliability.SPpaths":
        weight = candidate["reliability_path"].get("path_weight")
        return {} if weight is None else {"path_weight": weight}
    return {}


def _recompute_now(
    engine: Engine, record: Dict[str, Any], replayed_at: str
) -> tuple:
    """Recompute each candidate's three components NOW and diff them against the receipt.

    This is where the divergence taxonomy is applied, and the taxonomy is the [ASSUMED] part
    of this file — CONTRACT.md section 2.6 fixes the three reason VALUES but not the rule for
    choosing between them. The rule here:

      * independence or path_weight changed  -> GRAPH_MUTATED. Both are pure functions of the
        graph. Neither can move on its own, so if one moved, the graph moved.
      * recency changed and nothing else did -> RECENCY_DECAY. recency is a pure function of
        (asserted_at, lambda, now); `now` always moves, so this is expected.
      * engine identity changed              -> ENGINE_DIFF, handled by the caller.

    One honest gap: a change to MENGER_LAMBDA_PER_HOUR between the decision and the replay
    also moves recency, and this rule would label it RECENCY_DECAY. The receipt carries the
    lambda it used, so the difference is VISIBLE in the body — but it is not a separate
    reason code, because CONTRACT.md section 2.6 fixes the enum at three values and the
    contract is frozen. Logged in section 16 rather than silently relabelled.
    """
    from app import arbiter   # local import: docket is imported by api, arbiter is not a
                              # dependency of persist/fetch, and a module-level import here
                              # would make the audit path depend on the scoring path.

    now = arbiter.parse_iso(replayed_at)
    components_now: Dict[str, Dict[str, Any]] = {}
    divergence: List[Dict[str, Any]] = []

    for candidate in record.get("candidates") or []:
        claim_id = candidate["claim_id"]
        then = candidate["components"]

        ind, _flow_edges = arbiter.independence(engine, claim_id)
        rel, path_weight, _cost, _nodes, _edges = arbiter.reliability(engine, claim_id)

        rows = engine.read.run(
            "claim.asserted_at",
            "MATCH (c:Claim {id:$claim_id}) RETURN c.asserted_at AS asserted_at",
            {"claim_id": claim_id},
        )
        if rows:
            age_h = arbiter.age_hours(rows[0][0], now)
            rec = arbiter.recency(age_h)
        else:
            # The claim is gone. That is a mutation, and a severe one.
            age_h, rec = 0.0, 0.0
            divergence.append(
                {
                    "claim_id": claim_id,
                    "field": "claim",
                    "then": "present",
                    "now": "absent",
                    "reason": "GRAPH_MUTATED",
                }
            )

        components_now[claim_id] = {
            "independence": ind,
            "reliability": round(rel, config.DP_COMPONENT),
            "recency": round(rec, config.DP_COMPONENT),
        }

        if ind != then["independence"]:
            divergence.append(
                {
                    "claim_id": claim_id,
                    "field": "independence",
                    "then": then["independence"],
                    "now": ind,
                    "reason": "GRAPH_MUTATED",
                }
            )
        now_weight = (
            None if path_weight is None else round(path_weight, config.DP_PATH_WEIGHT)
        )
        if now_weight != then.get("path_weight"):
            divergence.append(
                {
                    "claim_id": claim_id,
                    "field": "path_weight",
                    "then": then.get("path_weight"),
                    "now": now_weight,
                    "reason": "GRAPH_MUTATED",
                }
            )
        now_recency = round(rec, config.DP_COMPONENT)
        if now_recency != then["recency"]:
            divergence.append(
                {
                    "claim_id": claim_id,
                    "field": "recency",
                    "then": then["recency"],
                    "now": now_recency,
                    "reason": "RECENCY_DECAY",
                }
            )

    return components_now, divergence
