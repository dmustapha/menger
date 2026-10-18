# app/api.py
"""The 8 endpoints of CONTRACT.md section 2, and the response projection of section 9.

Three things about this file are deliberate and are the reasons it is shaped the way it is.

1. THE PROJECTION LIVES HERE, NOT IN A 14th FILE. CONTRACT.md's response shapes are defined
   exactly once, by the `_project_*` functions below. app/schema.py mirrors the contract's
   REQUEST types in Pydantic and documents the scored-claim shape; the audit surfaces
   (receipt, replay, subgraph) are projected as plain dicts here because they are rehydrated
   from stored JSON and a round trip through a model would re-serialise data that was already
   serialised at decision time (section 7.6). One definition, one place to check it against
   the contract.

2. NOTHING HERE MULTIPLIES THE COMPONENTS. The product is computed once, in
   app/arbiter.score_claim (section 7.9). This file carries `score` alongside the three
   components and never recomputes it. CONTRACT.md section 0 rule 1 is mechanised by that
   division of labour, not by a comment.

3. THE BOOT GATE IS A DEPENDENCY, NOT A CONVENTION. Every endpoint except /health declares
   `Depends(_gate)`. Adding an endpoint without the dependency is visible in the signature.
"""
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app import arbiter, bootcheck, config, cypher, docket, ids
from app.errors import MengerError
from app.graph import CypherLog, Engine, engine as get_engine
from app.schema import VERDICT_TO_STATUS, RememberRequest

app = FastAPI(
    title="MENGER",
    version="1.0",
    description=(
        "Admission control on agent memory. POST /remember returns ALLOW / BLOCK / "
        "UNDECIDED with a replayable DOCKET receipt. MENGER decides ADMISSIBILITY, "
        "never veracity."
    ),
)

# CORS is wide open, and that is a considered choice for THIS build rather than a default
# nobody looked at: seven of the eight endpoints are reads, there is no authentication and
# therefore no credential to steal, `allow_credentials` is left at its default of False, and
# the console is served from a different origin during the demo. A deployed instance that
# grows an auth token must narrow this in the same commit that adds the token — recorded as
# an exposure limitation in section 15.6, not as a TODO in the code.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ===========================================================================
# error handling — CONTRACT.md section 3, with nothing leaking past it
# ===========================================================================

@app.exception_handler(MengerError)
async def _handle_menger_error(_request: Request, exc: MengerError) -> JSONResponse:
    """Every deliberate refusal in MENGER arrives here and leaves as the contract's
    `Error` envelope with the contract's HTTP status. There is exactly one encoder for
    error bodies, so no endpoint can invent a shape (section 7.3)."""
    return JSONResponse(status_code=exc.http, content=exc.body())


@app.exception_handler(RequestValidationError)
async def _handle_validation_error(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    """FastAPI's own 422 reshaped into the contract's 400 VALIDATION_ERROR.

    FastAPI returns 422 with its own `detail` array for a bad QUERY PARAMETER; the contract
    has no 422 VALIDATION_ERROR row — its 422s are UNKNOWN_AGENT and UNKNOWN_SOURCE, which
    are semantic, not structural. Letting FastAPI's default through would put a shape MENGER
    never documented on the wire under a status the contract reserves for something else.
    Request BODY validation does not reach here: POST /remember validates its body by hand
    (below) because NO_SOURCES has to be decided before shape validation.
    """
    errors = exc.errors()
    first = errors[0] if errors else {}
    location = ".".join(str(p) for p in (first.get("loc") or [])[1:]) or None
    return JSONResponse(
        status_code=400,
        content=MengerError.validation(
            str(first.get("msg", "invalid request")), location
        ).body(),
    )


@app.exception_handler(Exception)
async def _handle_unexpected(_request: Request, exc: Exception) -> JSONResponse:
    """The last line. An unexpected exception becomes 503 ENGINE_UNAVAILABLE with the
    exception's type and message, never a FastAPI HTML error page and never a stack trace
    on the wire. 503 rather than 500 because the contract's table has no 500 row, and an
    unhandled fault in a process whose only dependency is the engine is, in practice,
    the engine — section 15.6 records the cases where that is a generous reading.
    """
    return JSONResponse(
        status_code=503,
        content=MengerError.engine_unavailable(
            f"{type(exc).__name__}: {exc}"
        ).body(),
    )


# ===========================================================================
# the boot gate
# ===========================================================================

def _gate() -> Engine:
    """FastAPI dependency: hand the endpoint an Engine, but only if the boot controls hold.

    Returns the Engine so that an endpoint cannot accidentally obtain one WITHOUT passing
    the gate — the gate and the handle are the same object.
    """
    engine = get_engine()
    bootcheck.gate(engine)
    return engine


# ===========================================================================
# time
# ===========================================================================

def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    """The one ISO-8601 writer. Always UTC, always a trailing Z, always second precision.

    Second precision, not microsecond: `asserted_at` and `decided_at` appear in receipts and
    in review items that a human reads side by side, and microseconds make two timestamps
    that differ by nothing look like they differ. Age is computed in hours (section 7.9), so
    sub-second precision cannot change a score.
    """
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ===========================================================================
# section 9 — the response projection. ONE definition per contract shape.
# ===========================================================================

def _project_components(scored: Dict[str, Any]) -> Dict[str, Any]:
    """CONTRACT.md section 1 `Components`. Five fields, always all five.

    Rounding happens HERE and only here (config.DP_*): every number upstream of this function
    is full precision, so no comparison, no ordering and no margin is ever computed on a
    rounded value. `path_weight` passes through as None when there is no chain — it is the
    one nullable component and section 7.9 explains why 0.0 would be a lie.
    """
    return {
        "independence": int(scored["independence"]),
        "reliability": round(float(scored["reliability"]), config.DP_COMPONENT),
        "recency": round(float(scored["recency"]), config.DP_COMPONENT),
        "path_weight": (
            None
            if scored["path_weight"] is None
            else round(float(scored["path_weight"]), config.DP_PATH_WEIGHT)
        ),
        "age_hours": round(float(scored["age_hours"]), 2),
    }


def _claim_sources(engine: Engine, claim_id: str) -> List[Dict[str, Any]]:
    """CONTRACT.md section 1 `ScoredClaim.sources[]`.

    `is_origin` is READ, not derived: it is denormalised onto :Source at seed time (section
    4.1) so that the response layer never has to re-derive "does an ORIGIN edge exist" with
    a second traversal per source.
    """
    rows = engine.read.run("claim.sources", cypher.READS["claim.sources"], {"claim_id": claim_id})
    return [
        {
            "source_id": str(r[0]),
            "kind": str(r[1]),
            "trust": float(r[2]),
            "is_origin": bool(r[3]),
        }
        for r in rows
    ]


def _project_scored_claim(engine: Engine, scored: Dict[str, Any]) -> Dict[str, Any]:
    """CONTRACT.md section 1 `ScoredClaim`. `score_is_ordinal` is ALWAYS true.

    It is a literal here rather than a computed value because there is no circumstance in
    which it is false. CONTRACT.md section 4 forbids the console from rendering `score` as a
    cardinal magnitude; this field is the machine-readable form of that prohibition,
    and it rides on every scored object so no consumer can receive a score without it.
    """
    return {
        "claim_id": scored["claim_id"],
        "object": scored["object"],
        "agent_id": scored["agent_id"],
        "agent_name": scored["agent_name"],
        "asserted_at": scored["asserted_at"],
        "status": scored["status"],
        "components": _project_components(scored),
        "score": round(float(scored["score"]), config.DP_COMPONENT),
        "score_is_ordinal": True,
        "sources": _claim_sources(engine, scored["claim_id"]),
    }


def _project_candidate(scored: Dict[str, Any]) -> Dict[str, Any]:
    """CONTRACT.md section 2.5 `candidates[]` — the receipt's per-claim block.

    This is the block a skeptic re-derives the verdict from by hand, so it carries the
    WITNESS as well as the numbers: which origins the flow actually used, and which chain the
    shortest-path walk actually took. `independence_witness.max_flow` and
    `components.independence` are the same number by construction and are both present on
    purpose — one is the contract's component, the other is the evidence for it, and a
    receipt in which they disagreed would be the single most useful thing a replay could find.
    """
    witness = arbiter.decompose_flow(
        scored["flow_edges"], config.SS_NID, scored["claim_id"]
    )
    return {
        "claim_id": scored["claim_id"],
        "object": scored["object"],
        "components": _project_components(scored),
        "score": round(float(scored["score"]), config.DP_COMPONENT),
        "independence_witness": {
            "max_flow": int(scored["independence"]),
            "witness_nodes": witness["witness_nodes"],
            "paths": witness["paths"],
        },
        "reliability_path": {
            "nodes": scored["path_nodes"],
            "edges": [_project_path_edge(e) for e in scored["path_edges"]],
            "path_weight": (
                None
                if scored["path_weight"] is None
                else round(float(scored["path_weight"]), config.DP_PATH_WEIGHT)
            ),
        },
    }


def _project_path_edge(edge: List[Any]) -> Dict[str, Any]:
    """One edge of `reliability_path.edges` (CONTRACT.md section 2.5).

    The row is [start_nid, end_nid, nl, kind] from app/cypher.py READS['reliability.SPpaths'].
    `trust` is RECONSTRUCTED as exp(-nl) rather than re-read from the :Source, for two
    reasons: it costs no round trip, and it shows the reader that nl and trust are the same
    fact in two forms. On an ORIGIN or CITED edge (nl = 0.0) that reconstruction gives
    trust = 1.0, which is correct — those edges are free, they are plumbing, and they are not
    where trust is paid (section 4.3).
    """
    nl = float(edge[2])
    return {
        "from": str(edge[0]),
        "to": str(edge[1]),
        "type": _wire_edge_type(str(edge[3])),
        "trust": round(pow(2.718281828459045, -nl), 2),
        "nl": round(nl, config.DP_PATH_WEIGHT),
    }


def _wire_edge_type(kind: str) -> str:
    """The `kind` property -> the contract's `edges[].type` string.

    Decision D-3 (section 2.3) makes `:FLOW` the only relationship type, with the semantic
    kind in a property, because algo.maxFlow takes EXACTLY ONE relationship type
    ([VERIFIED section 3-P24]). CONTRACT.md section 2.4's example, written before that probe
    landed, shows a `DERIVED_FROM` edge type on the wire. The frozen shape is preserved by
    mapping kind='DERIVED' to the string "DERIVED_FROM" and everything else to "FLOW": the
    console gets exactly the vocabulary it was promised, and the graph keeps the single
    relationship type the algorithm requires. The contradiction is recorded in section 16.1;
    this function is the whole of the reconciliation.
    """
    return "DERIVED_FROM" if kind == "DERIVED" else "FLOW"


def _project_receipt(record: Dict[str, Any]) -> Dict[str, Any]:
    """CONTRACT.md section 2.5, from a rehydrated :Receipt (section 7.10 `fetch`).

    Two field renames happen here and nowhere else:
      * stored `lambda_per_hour` -> wire `lambda`. `lambda` is a Python keyword, so it cannot
        be a parameter name or an attribute; the contract's wire key is still `lambda`.
      * stored `created_at` -> wire `decided_at`. The receipt is written in the same
        statement sequence as the decision, so they are the same instant; the wire name says
        what the instant MEANS.
    """
    return {
        "receipt_id": record["receipt_id"],
        "slot_key": record["slot_key"],
        "verdict": record["verdict"],
        "decided_at": record["created_at"],
        "margin": round(float(record["margin"]), config.DP_MARGIN),
        "epsilon": float(record["epsilon"]),
        "lambda": float(record["lambda_per_hour"]),
        "score_is_ordinal": True,
        "winner_claim_id": record["winner_claim_id"],
        "engine": record["engine"],
        "candidates": record["candidates"],
        "cypher": record["cypher"],
        "replay": {
            "endpoint": f"POST /receipts/{record['receipt_id']}/replay",
            # CONTRACT.md section 2.5 fixes this at true. What it asserts is narrow and worth
            # stating: the RECORDED SCALARS (max_flow, path_weight) reproduce against an
            # unmutated graph. It does NOT assert that the witness EDGE SET is identical —
            # maxFlow may saturate a different set of equally valid edges — which is exactly
            # why section 7.10 `_numbers_of` compares scalars only. [ASSUMED]: no probe in
            # section 3 ran the same statement twice to measure stability.
            "deterministic": True,
        },
    }


def _winner_of(scored: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """The claim currently holding a slot, or None.

    CONTRACT.md section 2.2 says `winner` is "null when no claim has been admitted". Taken
    literally that would make every slot in the seeded corpus winner-less, because seeded
    claims carry status SEEDED and were never adjudicated through /remember (CONTRACT.md
    section 1) — and the contract's own section 2.2 example names clm_0007, a seeded claim,
    as the winner. [ASSUMED], and resolved by reading "admitted" as "not refused and not
    awaiting review": a claim holds the slot if its status is ADMITTED or SEEDED. REFUSED and
    QUEUED claims are excluded, which is the part that matters — a blocked claim must never
    appear as the holder of the slot it was blocked from.
    """
    holders = [s for s in scored if s["status"] in ("ADMITTED", "SEEDED")]
    if not holders:
        return None
    return max(holders, key=lambda s: (s["score"], s["asserted_at"], s["claim_id"]))


def _score_slot(
    engine: Engine, slot_key: str, log: Optional[CypherLog] = None
) -> List[Dict[str, Any]]:
    """Score every claim in a slot, best first.

    Ordering is by score descending, then asserted_at descending, then claim_id descending —
    the same total order app/arbiter.pick_incumbent uses, so `ranking[0]` and the incumbent a
    decision chose can never disagree.
    """
    now = _utc_now()
    rows = engine.read.run(
        "slot.claims", cypher.READS["slot.claims"], {"slot_key": slot_key}, log
    )
    scored = [
        arbiter.score_claim(
            engine,
            {
                "claim_id": str(r[0]),
                "object": str(r[1]),
                "asserted_at": str(r[2]),
                "status": str(r[3]),
                "agent_id": None if r[4] is None else str(r[4]),
                "agent_name": None if r[5] is None else str(r[5]),
            },
            now,
            log,
        )
        for r in rows
    ]
    scored.sort(key=lambda s: (s["score"], s["asserted_at"], s["claim_id"]), reverse=True)
    return scored


def _last_receipt_by_slot(engine: Engine) -> Dict[str, Dict[str, Any]]:
    """slot_key -> the most recent receipt's {verdict, decided_at, receipt_id}.

    READS['receipts.all'] returns every receipt ordered by (created_at, id) ASCENDING, and
    this walks them keeping the last seen per slot. That is a Python-side fold over the whole
    receipt table, which is honest at demo scale (the corpus starts with zero receipts and a
    demo adds a handful) and is the first thing that would have to change at real scale —
    recorded in section 14.4 with the specific replacement named.
    """
    rows = engine.read.run("receipts.all", cypher.READS["receipts.all"], {})
    latest: Dict[str, Dict[str, Any]] = {}
    for slot_key, receipt_id, verdict, created_at in rows:
        latest[str(slot_key)] = {
            "receipt_id": str(receipt_id),
            "verdict": str(verdict),
            "decided_at": str(created_at),
        }
    return latest


# ===========================================================================
# 2.1  POST /remember — the write gate
# ===========================================================================

@app.post("/remember")
async def remember(request: Request, engine: Engine = Depends(_gate)) -> Dict[str, Any]:
    """CONTRACT.md section 2.1. The full lifecycle is traced in section 12.

    The body is parsed and validated BY HAND rather than by a `body: RememberRequest`
    signature, for one contractual reason: CONTRACT.md section 3 gives `sources` absent or
    empty its OWN code, 400 NO_SOURCES, distinct from 400 VALIDATION_ERROR. A Pydantic model
    in the signature would reject an absent `sources` as a shape error before any MENGER code
    ran, and the caller would get the wrong code for the one refusal that is about the
    MECHANISM rather than the payload — a claim with no provenance cannot be scored, and
    saying so precisely is the point of the endpoint.
    """
    # --- 1. the body is JSON at all ---------------------------------------
    try:
        payload = await request.json()
    except Exception:
        raise MengerError.validation("request body is not valid JSON")
    if not isinstance(payload, dict):
        raise MengerError.validation("request body must be a JSON object")

    # --- 2. NO_SOURCES, before shape validation ---------------------------
    raw_sources = payload.get("sources")
    if raw_sources is None or (isinstance(raw_sources, list) and not raw_sources):
        raise MengerError.no_sources()

    # --- 3. everything else is Pydantic's job -----------------------------
    try:
        body = RememberRequest(**payload)
    except ValidationError as exc:
        first = exc.errors()[0]
        field = ".".join(str(p) for p in (first.get("loc") or [])) or None
        raise MengerError.validation(str(first.get("msg", "invalid request")), field)

    slot_key = body.slot_key()
    asserted_at = body.asserted_at or _iso(_utc_now())

    # --- 4. the agent must exist (422 UNKNOWN_AGENT) ----------------------
    if not engine.read.run(
        "agent.by_id", cypher.READS["agent.by_id"], {"agent_id": body.agent_id}
    ):
        raise MengerError.unknown_agent(body.agent_id)

    # --- 5. every source must exist (422 UNKNOWN_SOURCE) ------------------
    # One round trip for any number of sources: the statement returns the HITS, the offenders
    # are the set difference, computed here (section 7.5). Order is preserved so the error
    # lists the offenders in the order the caller sent them.
    found_rows = engine.read.run(
        "sources.found", cypher.READS["sources.found"], {"sources": body.sources}
    )
    found = set(found_rows[0][0] or []) if found_rows else set()
    unknown = [s for s in body.sources if s not in found]
    if unknown:
        raise MengerError.unknown_source(unknown)

    # --- 6. allocate the id and CREATE the claim --------------------------
    # The claim must exist in the graph BEFORE it can be scored: it is the maxFlow TARGET and
    # the SPpaths targetNode. There is no way to score a claim that is not in the graph, which
    # is why `recorded` is contractually ALWAYS true — a refused write is recorded, never
    # dropped (CONTRACT.md section 0 rule 4). Status is written as QUEUED and corrected in
    # step 10; QUEUED is a real ClaimStatus meaning "not yet adjudicated", which is exactly
    # true for the interval between these two writes. Section 14.7 covers the process dying
    # inside that interval.
    claim_id = ids.next_id(engine, "claim")
    engine.write.run(
        "claim.create",
        {
            "agent_id": body.agent_id,
            "claim_id": claim_id,
            "slot_key": slot_key,
            "subject": body.subject,
            "predicate": body.predicate,
            "object": body.object,
            "asserted_at": asserted_at,
            "status": "QUEUED",
            "sources": body.sources,
        },
    )

    # --- 7/8. score the slot, INCOMING FIRST ------------------------------
    # The order is NORMATIVE, not incidental: app/docket.py `_original_numbers` matches the
    # i-th statement of a label group to candidates[i], and candidates[] is written in this
    # order. Scoring the incoming claim first also means the receipt reads top-down as
    # "here is what was submitted, here is what it was up against".
    log = CypherLog()
    now = _utc_now()
    claim_rows = engine.read.run(
        "slot.claims", cypher.READS["slot.claims"], {"slot_key": slot_key}, log
    )
    rows = [
        {
            "claim_id": str(r[0]),
            "object": str(r[1]),
            "asserted_at": str(r[2]),
            "status": str(r[3]),
            "agent_id": None if r[4] is None else str(r[4]),
            "agent_name": None if r[5] is None else str(r[5]),
        }
        for r in claim_rows
    ]
    incoming_row = next((r for r in rows if r["claim_id"] == claim_id), None)
    if incoming_row is None:
        # The claim was written in step 6 and is not in the slot read in step 7. That is not
        # a client error; it is the graph disagreeing with itself one statement later.
        raise MengerError.engine_unavailable(
            f"claim {claim_id} was created but is not present in slot {slot_key!r}"
        )
    others = [r for r in rows if r["claim_id"] != claim_id]

    scored = [arbiter.score_claim(engine, incoming_row, now, log)]
    scored += [arbiter.score_claim(engine, r, now, log) for r in others]
    scored_incoming = scored[0]

    # --- 9. the epsilon-band decision ------------------------------------
    incumbent = arbiter.pick_incumbent(scored, claim_id)
    verdict, margin = arbiter.decide(scored_incoming, incumbent)
    status = VERDICT_TO_STATUS[verdict]
    decided_at = _iso(now)

    # --- 10. the incoming claim's final status ---------------------------
    engine.write.run("claim.set_status", {"claim_id": claim_id, "status": status})
    scored_incoming["status"] = status

    # --- 11. the DOCKET receipt ------------------------------------------
    winner = _winner_of(scored)
    receipt_id = ids.next_id(engine, "receipt")
    docket.persist(
        engine,
        receipt_id=receipt_id,
        claim_id=claim_id,
        slot_key=slot_key,
        verdict=verdict,
        margin=margin,
        winner_claim_id=None if winner is None else winner["claim_id"],
        candidates=[_project_candidate(s) for s in scored],
        statements=log.as_list(),
        created_at=decided_at,
    )

    # --- 12. UNDECIDED also writes a :Review -----------------------------
    review_id: Optional[str] = None
    if verdict == "UNDECIDED":
        review_id = ids.next_id(engine, "review")
        engine.write.run(
            "review.create",
            {
                "review_id": review_id,
                "slot_key": slot_key,
                "claim_id": claim_id,
                # the "" sentinel, never None — section 7.5 on null properties
                "incumbent_claim_id": (
                    docket.NO_WINNER if incumbent is None else incumbent["claim_id"]
                ),
                "margin": round(float(margin), config.DP_MARGIN),
                "epsilon": config.EPSILON,
                "reason": "WITHIN_EPSILON",
                "receipt_id": receipt_id,
                "created_at": decided_at,
            },
        )

    # --- 13. the response ------------------------------------------------
    return {
        "verdict": verdict,
        "slot_key": slot_key,
        "claim_id": claim_id,
        "status": status,
        "recorded": True,
        "decided_at": decided_at,
        "margin": round(float(margin), config.DP_MARGIN),
        "epsilon": config.EPSILON,
        "score_is_ordinal": True,
        "incoming": _project_scored_claim(engine, scored_incoming),
        "incumbent": (
            None if incumbent is None else _project_scored_claim(engine, incumbent)
        ),
        "receipt_id": receipt_id,
        "review_id": review_id,
    }


# ===========================================================================
# 2.2  GET /slots
# ===========================================================================

@app.get("/slots")
async def list_slots(
    contested: Optional[bool] = Query(default=None),
    has_review: Optional[bool] = Query(default=None),
    limit: int = Query(default=config.SLOT_LIMIT_DEFAULT, ge=1, le=config.SLOT_LIMIT_MAX),
    offset: int = Query(default=0, ge=0),
    engine: Engine = Depends(_gate),
) -> Dict[str, Any]:
    """CONTRACT.md section 2.2.

    `total` is the count AFTER filtering and BEFORE paging, which is what a pager needs.
    Filtering and paging happen in Python over one `slots.all` read: with 20 slots that is
    one round trip instead of four parameterised variants of the same statement, and the
    filter predicates (claim_count >= 2, open_review_count >= 1) are over columns that
    statement already returns.

    THE COST, STATED. `winner` carries a full `Components` block, so the slots on the
    requested PAGE have their claims scored — two reads per claim. The page is sliced BEFORE
    scoring, so the cost is bounded by `limit`, not by the size of the corpus. At the demo's
    20 slots and ~3 claims each that is ~120 reads against an engine measured at 11 ms warm
    on a graph 23x larger ([VERIFIED section 3 / AF-7]); no total latency is claimed for this
    endpoint (section 17). Section 14.4 names the fix at real scale: denormalise the winner
    onto :Slot at decision time, which is a write-path change, not a read-path one.
    """
    rows = engine.read.run("slots.all", cypher.READS["slots.all"], {})
    records = [
        {
            "slot_key": str(r[0]),
            "subject": str(r[1]),
            "predicate": str(r[2]),
            "claim_count": int(r[3]),
            "open_review_count": int(r[4]),
        }
        for r in rows
    ]
    if contested is not None:
        records = [r for r in records if (r["claim_count"] >= 2) == contested]
    if has_review is not None:
        records = [r for r in records if (r["open_review_count"] >= 1) == has_review]

    total = len(records)
    page = records[offset : offset + limit]
    latest = _last_receipt_by_slot(engine) if page else {}

    slots_out: List[Dict[str, Any]] = []
    for record in page:
        scored = _score_slot(engine, record["slot_key"])
        winner = _winner_of(scored)
        last = latest.get(record["slot_key"])
        slots_out.append(
            {
                "slot_key": record["slot_key"],
                "subject": record["subject"],
                "predicate": record["predicate"],
                "claim_count": record["claim_count"],
                "contested": record["claim_count"] >= 2,
                "winner": (
                    None
                    if winner is None
                    else {
                        "claim_id": winner["claim_id"],
                        "object": winner["object"],
                        "score": round(float(winner["score"]), config.DP_COMPONENT),
                        "score_is_ordinal": True,
                        "components": _project_components(winner),
                    }
                ),
                "last_verdict": None if last is None else last["verdict"],
                "last_decided_at": None if last is None else last["decided_at"],
                "last_receipt_id": None if last is None else last["receipt_id"],
                "open_review_count": record["open_review_count"],
            }
        )

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "epsilon": config.EPSILON,
        "slots": slots_out,
    }


# ===========================================================================
# 2.3  GET /slots/{key}
# ===========================================================================

@app.get("/slots/{key:path}/graph")
async def slot_graph(key: str, engine: Engine = Depends(_gate)) -> Dict[str, Any]:
    """CONTRACT.md section 2.4 — the node-split provenance DAG, for the console to draw.

    The split pairs are returned AS THEMSELVES. CONTRACT.md section 2.4: "the split is visible
    on purpose". A console that drew a source as one node would be drawing a graph in which
    the independence number is unexplainable, because the thing that makes edge-disjoint equal
    vertex-disjoint — the single unit-capacity si->so edge — would be invisible (Decision D-2).

    `witness_sets` is per claim: the saturated split edges, which are the independent origins
    the flow actually used. It costs one maxFlow per claim in the slot, and it is the number
    the console highlights, so it is computed here rather than left to the receipt.

    NOTE: this route is registered BEFORE /slots/{key} (the non-graph detail route) because
    FastAPI/Starlette routes are matched in registration order. With :path converters, the
    more-specific `/graph` suffix must come first or it will be absorbed by the detail route.
    """
    if not engine.read.run("slot.by_key", cypher.READS["slot.by_key"], {"slot_key": key}):
        raise MengerError.slot_not_found(key)

    node_rows = engine.read.run(
        "graph.slot_nodes", cypher.READS["graph.slot_nodes"], {"slot_key": key}
    )
    edge_rows = engine.read.run(
        "graph.slot_edges", cypher.READS["graph.slot_edges"], {"slot_key": key}
    )

    nodes = [
        {
            "id": str(r[0]),
            "label": str(r[1]),
            "caption": str(r[2]),
            # null for the super-source and for claims — neither has a trust value, and
            # inventing 1.0 for them would put a number on the wire that means nothing.
            "trust": None if r[3] is None else float(r[3]),
            # Always present, null when not applicable. A null key is additive to the
            # contract's example (which omits them where they do not apply) and means a
            # console can read node.source_id without a key check.
            "source_id": None if r[4] is None else str(r[4]),
            "claim_id": None if r[5] is None else str(r[5]),
        }
        for r in node_rows
    ]
    edges = [
        {
            "from": str(r[0]),
            "to": str(r[1]),
            "type": _wire_edge_type(str(r[4])),
            "cap": float(r[2]),
            # The REAL nl, not null. CONTRACT.md section 2.4's example shows `nl: null` on a
            # si->so FLOW edge while section 2.5's example shows that same edge carrying
            # nl 0.10536 — the contract disagrees with itself (section 16.6). The recorded
            # value is published, because `nl` on the SPLIT edge is where trust is paid and a
            # console rendering edge weights needs it. A consumer that wants the contract's
            # literal null can ignore the field; one that needs the weight cannot invent it.
            "nl": None if r[3] is None else round(float(r[3]), config.DP_PATH_WEIGHT),
        }
        for r in edge_rows
    ]

    witness_sets: Dict[str, List[str]] = {}
    for node in nodes:
        if node["label"] != "Claim" or node["claim_id"] is None:
            continue
        _flow, flow_edges = arbiter.independence(engine, node["claim_id"])
        witness_sets[node["claim_id"]] = arbiter.decompose_flow(
            flow_edges, config.SS_NID, node["claim_id"]
        )["witness_nodes"]

    return {"slot_key": key, "nodes": nodes, "edges": edges, "witness_sets": witness_sets}


@app.get("/slots/{key:path}")
async def slot_detail(key: str, engine: Engine = Depends(_gate)) -> Dict[str, Any]:
    """CONTRACT.md section 2.3.

    `{key:path}` rather than `{key}`: a slot key contains `|` and often `:`
    (`customer:acme|primary_region`). The contract says the key is URL-encoded, and Starlette
    decodes URL-escape sequences before routing, so a correctly-encoded `%7C` arrives as a literal
    `|`. The `:path` converter means a caller who forgets to encode a `/` inside a subject
    still routes here and gets 404 SLOT_NOT_FOUND for the key they actually sent, instead of
    a 404 from the router for a route that does not exist. The 404 then names the key, so the
    encoding mistake is visible in the error. [ASSUMED] — the decoding behaviour is
    Starlette's documented one and is not probed in section 3.
    """
    slot_rows = engine.read.run("slot.by_key", cypher.READS["slot.by_key"], {"slot_key": key})
    if not slot_rows:
        raise MengerError.slot_not_found(key)
    _slot_key, subject, predicate = str(slot_rows[0][0]), str(slot_rows[0][1]), str(slot_rows[0][2])

    scored = _score_slot(engine, key)
    ranking = [s["claim_id"] for s in scored]
    # `top_margin` is score(ranking[0]) - score(ranking[1]), and null with fewer than 2
    # claims. It is NOT the verdict margin: the verdict margin is incoming vs best-other at
    # DECISION time and lives in the receipt. This is the live gap at the top of the slot, and
    # the two can legitimately differ once time has moved the recency terms.
    top_margin = (
        round(float(scored[0]["score"] - scored[1]["score"]), config.DP_MARGIN)
        if len(scored) >= 2
        else None
    )

    all_receipts = engine.read.run("receipts.all", cypher.READS["receipts.all"], {})
    receipts = [
        {
            "receipt_id": str(r[1]),
            "verdict": str(r[2]),
            "decided_at": str(r[3]),
        }
        for r in all_receipts
        if str(r[0]) == key
    ]
    review_rows = engine.read.run(
        "reviews.open_by_slot", cypher.READS["reviews.open_by_slot"], {"slot_key": key}
    )

    return {
        "slot_key": key,
        "subject": subject,
        "predicate": predicate,
        "contested": len(scored) >= 2,
        "epsilon": config.EPSILON,
        "lambda": config.LAMBDA_PER_HOUR,
        "score_is_ordinal": True,
        "claims": [_project_scored_claim(engine, s) for s in scored],
        "ranking": ranking,
        "top_margin": top_margin,
        "last_receipt_id": receipts[-1]["receipt_id"] if receipts else None,
        "receipts": receipts,
        "open_reviews": [
            {
                "review_id": str(r[0]),
                "claim_id": str(r[1]),
                "margin": round(float(r[2]), config.DP_MARGIN),
            }
            for r in review_rows
        ],
    }


# ===========================================================================
# 2.5  GET /receipts/{receipt_id}
# ===========================================================================

@app.get("/receipts/{receipt_id}")
async def get_receipt(receipt_id: str, engine: Engine = Depends(_gate)) -> Dict[str, Any]:
    """CONTRACT.md section 2.5. The credibility artifact.

    Nothing is recomputed here. The receipt is rendered from what was stored at decision
    time, including the verbatim parameterised Cypher. A receipt endpoint that re-derived its
    own numbers would be a live query wearing an audit record's clothes.
    """
    return _project_receipt(docket.fetch(engine, receipt_id))


# ===========================================================================
# 2.6  POST /receipts/{receipt_id}/replay
# ===========================================================================

@app.post("/receipts/{receipt_id}/replay")
async def replay_receipt(
    receipt_id: str, engine: Engine = Depends(_gate)
) -> Dict[str, Any]:
    """CONTRACT.md section 2.6. Request body: none (empty or {}).

    The body is not read at all, so an empty body, `{}`, and a body with junk in it all
    behave identically — there is no field for a caller to get wrong. Everything this does is
    in section 7.10 `replay`, and all of it goes through GRAPH.RO_QUERY: a replay cannot
    mutate what it audits, and the engine is what guarantees that ([VERIFIED section 3-P2]).
    """
    return docket.replay(engine, receipt_id, _iso(_utc_now()))


# ===========================================================================
# 2.7  GET /review
# ===========================================================================

@app.get("/review")
async def review_queue(
    status: str = Query(default="OPEN", pattern="^(OPEN|RESOLVED|ALL)$"),
    limit: int = Query(default=config.SLOT_LIMIT_DEFAULT, ge=1, le=config.SLOT_LIMIT_MAX),
    offset: int = Query(default=0, ge=0),
    engine: Engine = Depends(_gate),
) -> Dict[str, Any]:
    """CONTRACT.md section 2.7 — every UNDECIDED write. The 'nothing is silently lost' surface.

    v1.0 writes only state OPEN; there is no resolve endpoint and the console must not assume
    one (CONTRACT.md section 2.7). `status=RESOLVED` is therefore a legitimate query that
    returns an empty list today, and it is accepted rather than rejected so that adding
    resolution later is not an API change.

    The `components` blocks come out of the RECEIPT, not out of the :Review node. They were
    computed once, at decision time, and they are already stored verbatim in
    `receipt.candidates_json` — storing them again on the review node would create two
    records that can disagree, and then the queue would have to adjudicate itself. One
    statement joins Review -> Receipt and Review -> Claim -> Agent (section 7.5
    `reviews.all`), so the whole queue is one round trip rather than an N+1.
    """
    rows = engine.read.run("reviews.all", cypher.READS["reviews.all"], {"state": status})
    total = len(rows)
    items: List[Dict[str, Any]] = []

    for row in rows[offset : offset + limit]:
        (
            review_id, state, created_at, slot_key, margin, epsilon, reason,
            receipt_id, claim_id, incumbent_claim_id, candidates_json,
            incoming_object, incoming_agent_id, incumbent_object, incumbent_agent_id,
        ) = row

        candidates = json.loads(candidates_json or "[]")
        by_claim = {c["claim_id"]: c for c in candidates}

        def side(
            cid: Optional[str], obj: Any, agent: Any
        ) -> Optional[Dict[str, Any]]:
            """One side of the review item. None when there is no such claim.

            `object` and `agent_id` come from the LIVE join when present and fall back to the
            receipt's stored block when the claim has since been deleted. The components and
            the score always come from the receipt: they are what the decision used, and a
            review item that showed today's recomputed numbers beside a margin computed last
            week would be comparing two different measurements.
            """
            if not cid:
                return None
            block = by_claim.get(str(cid))
            if block is None:
                return None
            return {
                "claim_id": str(cid),
                "object": block["object"] if obj is None else str(obj),
                "agent_id": None if agent is None else str(agent),
                "score": block["score"],
                "components": block["components"],
            }

        incumbent_cid = (
            None if incumbent_claim_id in (None, docket.NO_WINNER) else str(incumbent_claim_id)
        )
        items.append(
            {
                "review_id": str(review_id),
                "status": str(state),
                "created_at": str(created_at),
                "slot_key": str(slot_key),
                "margin": round(float(margin), config.DP_MARGIN),
                "reason": str(reason),
                "receipt_id": str(receipt_id),
                "incoming": side(str(claim_id), incoming_object, incoming_agent_id),
                "incumbent": side(incumbent_cid, incumbent_object, incumbent_agent_id),
            }
        )

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "epsilon": config.EPSILON,
        "items": items,
    }


# ===========================================================================
# 2.8  GET /health — liveness, the boot assertions, epsilon and lambda
# ===========================================================================

@app.get("/health")
async def health() -> JSONResponse:
    """CONTRACT.md section 2.8. The ONLY endpoint without Depends(_gate).

    It must not be gated, because this is the endpoint that REPORTS the gate. A /health that
    returned a bare 503 BOOT_ASSERTION_FAILED without its `boot_checks` block would be a
    status endpoint that refuses to report status, and an operator would have nothing to act
    on. So it computes the checks itself and returns them in BOTH outcomes: 200 with
    `boot_checks` when they pass, 503 with the same block under `detail.boot_checks` when
    they do not (CONTRACT.md section 2.8's two documented responses).

    AF-17: epsilon and lambda are published here and this is their single runtime authority.
    The console must read them from here and must not hold its own copy.

    It also constructs its own Engine handle rather than taking one from _gate, so that an
    unreachable container surfaces as 503 ENGINE_UNAVAILABLE from the normal error handler
    with the connection error in the message — which is a different and more useful answer
    than BOOT_ASSERTION_FAILED.
    """
    engine = get_engine()
    checks = bootcheck.verify(engine)
    if not checks["passed"]:
        error = MengerError.boot_assertion_failed(
            bootcheck.first_failure_message(checks), checks
        )
        return JSONResponse(status_code=error.http, content=error.body())

    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "engine": engine.identity(),
            "epsilon": config.EPSILON,
            "lambda": config.LAMBDA_PER_HOUR,
            "seeded_at": bootcheck.seeded_at(engine),
            "corpus": bootcheck.corpus(engine),
            "boot_checks": checks,
        },
    )


# ===========================================================================
# the stretch route — NOT in CONTRACT.md. Section 7.13 / section 10.
# ===========================================================================

try:
    from app import counterfactual
except ImportError:                      # pragma: no cover — the file may be deleted
    counterfactual = None                # type: ignore[assignment]

if counterfactual is not None:

    @app.post("/x/counterfactual")
    async def what_if(request: Request, engine: Engine = Depends(_gate)) -> Dict[str, Any]:
        """STRETCH (R4, gated at 16:25 per DS-11). NOT part of the frozen contract.

        Namespaced under /x/ for one reason: CONTRACT.md section 4 says the console must not
        assume any endpoint outside section 2 exists. The prefix makes "outside the contract"
        visible in the URL, so nothing can come to depend on it by accident, and section 10
        explains how this file plus this route delete together.

        Its latency is NOT_CLAIMED. GRAPH.COPY was never probed (.law12-feasibility.json
        DS-10) and no number for it appears anywhere in MENGER.
        """
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        if not isinstance(payload, dict):
            raise MengerError.validation("request body must be a JSON object")
        claim_id = payload.get("claim_id")
        drop = payload.get("drop_sources") or []
        if not isinstance(claim_id, str) or not claim_id.strip():
            raise MengerError.validation("claim_id is required", "claim_id")
        if not isinstance(drop, list) or not all(isinstance(s, str) for s in drop):
            raise MengerError.validation(
                "drop_sources must be an array of source ids", "drop_sources"
            )
        return counterfactual.what_if(engine, claim_id, drop)
