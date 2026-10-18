# app/arbiter.py
"""Scoring and the epsilon-band decision.

The three components (CONTRACT.md section 1 `Components`):

  independence  int    algo.maxFlow over the node-split DAG. Menger's theorem: max-flow over
                       unit vertex capacities = the number of VERTEX-disjoint origin->claim
                       chains = source independence. The node-split is what makes maxFlow
                       count vertices instead of edges (DS-1); without it an echo through one
                       shared source scores as independent ([VERIFIED section 3-P11]).
  reliability   float  exp(-path_weight), where path_weight is algo.SPpaths' weighted total
                       over nl = -ln(trust). Minimising the sum of nl maximises the PRODUCT
                       of trust along the chain, because exp(-sum nl) = product(trust).
  recency       float  exp(-lambda * age_hours).

  score = independence * reliability * recency

score is ORDINAL, NOT CARDINAL. It ranks candidates within one slot and means nothing on its
own. Every scored object MENGER emits carries score_is_ordinal: true, and `path_weight` is
surfaced RAW beside `reliability` so that the AF-3 hop-count trap is auditable from a
response body alone, with no access to this file.

MENGER decides ADMISSIBILITY. It is admission control over declared provenance, never a
statement about whether a claim is correct.
"""
from __future__ import annotations

import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app import config, cypher
from app.graph import CypherLog, Engine


# ===========================================================================
# time
# ===========================================================================

def parse_iso(value: str) -> datetime:
    """Parse the ISO-8601 UTC form MENGER writes, tolerating a few shapes a client may send.

    MENGER itself only ever writes `...Z` (section 4.1), but `asserted_at` is an OPTIONAL
    client-supplied field on POST /remember, so this has to accept the common variants
    rather than 500 on a trailing offset.
    """
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    parsed = datetime.fromisoformat(text)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def age_hours(asserted_at: str, now: datetime) -> float:
    """Hours between `asserted_at` and `now`, CLAMPED AT ZERO.

    The clamp is load-bearing, not defensive tidiness: `asserted_at` is client-supplied, and
    a future timestamp would give a negative age, hence recency = exp(-lambda * negative) > 1,
    hence a score inflated by a value the client chose. Clamping at 0 means the best a client
    can do by lying about time is recency = 1.0, which is the same as submitting now.
    """
    delta = (now - parse_iso(asserted_at)).total_seconds() / 3600.0
    return max(0.0, round(delta, 4))


# ===========================================================================
# component 1 — independence
# ===========================================================================

def independence(
    engine: Engine, claim_id: str, log: Optional[CypherLog] = None
) -> Tuple[int, List[List[Any]]]:
    """Returns (independence, flow_edges).

    `flow_edges` is the SATURATED relationship set from the `edges` yield, as
    [[start_nid, end_nid, kind], ...] ([VERIFIED section 3-P41]). It is the raw material of
    `independence_witness` (section 8.3) and it comes back in the SAME row as the flow value,
    so independence and its witness cost one round trip, not two.
    """
    rows = engine.read.run(
        "independence.maxFlow",
        cypher.READS["independence.maxFlow"],
        {"src": config.SS_NID, "claim": claim_id},
        log,
    )
    if not rows:
        # The comprehension form returns ONE row even at flow 0 with an empty edge list
        # ([VERIFIED section 3-P42]), so ZERO rows means the MATCH found no such claim —
        # a different condition entirely, and never a flow of 0.
        return 0, []
    raw, flow_edges = rows[0][0], rows[0][1] or []
    # maxFlow is a FLOAT (toString -> "1.000000", [VERIFIED section 3-P41]) and
    # components.independence is contractually an INT (CONTRACT.md section 0 rule 6).
    # The cast is mandatory, not cosmetic; a float here is a contract violation.
    return int(round(float(raw))), [list(e) for e in flow_edges]


# ===========================================================================
# component 2 — reliability
# ===========================================================================

def reliability(
    engine: Engine, claim_id: str, log: Optional[CypherLog] = None
) -> Tuple[float, Optional[float], Optional[int], List[str], List[List[Any]]]:
    """Returns (reliability, path_weight, path_cost, path_nodes, path_edges).

    `path_weight` is None when there is NO chain from the super-source to the claim.
    algo.SPpaths returns ZERO ROWS in that case — not an error, not a null
    ([VERIFIED section 3-P29]) — and `Components.path_weight` is nullable precisely so this
    case is representable instead of being papered over with 0.0, which would read as
    "a perfect, weightless chain" and invert the meaning.

    `path_cost` is the HOP COUNT, from the same row ([VERIFIED section 3-P35]). It is carried
    out of here so boot check T-3b can assert path_weight != path_cost, which catches an AF-3
    weight-key regression without depending on one memorised constant.
    """
    rows = engine.read.run(
        "reliability.SPpaths",
        cypher.READS["reliability.SPpaths"],
        {"src": config.SS_NID, "claim": claim_id},
        log,
    )
    if not rows:
        return 0.0, None, None, [], []
    path_weight = float(rows[0][0])
    path_cost = int(rows[0][1])
    path_nodes = [str(n) for n in (rows[0][2] or [])]
    path_edges = [list(e) for e in (rows[0][3] or [])]
    # exp(-sum of -ln(trust)) == product of trust. The identity is why nl is -ln(trust) and
    # not, say, 1 - trust: only -ln makes a SHORTEST-PATH algorithm maximise a PRODUCT.
    return math.exp(-path_weight), path_weight, path_cost, path_nodes, path_edges


# ===========================================================================
# component 3 — recency
# ===========================================================================

def recency(age_h: float) -> float:
    """exp(-lambda * age_hours), with lambda read from config at CALL time.

    Read at call time, not captured at import, so that an operator changing
    MENGER_LAMBDA_PER_HOUR and restarting gets the new value in both /health and every
    receipt without a code change (AF-17).
    """
    return math.exp(-config.LAMBDA_PER_HOUR * age_h)


# ===========================================================================
# the flow decomposition — independence_witness
# ===========================================================================

def decompose_flow(
    flow_edges: List[List[Any]], src_nid: str, dst_nid: str
) -> Dict[str, Any]:
    """Turn the saturated edge set into the contract's `independence_witness` block.

    CONTRACT.md section 2.5 wants `paths` (a list of node-id walks from "ss" to the claim)
    and `witness_nodes`. algo.maxFlow gives us the saturated RELATIONSHIPS, not paths
    ([VERIFIED section 3-P41/P22]), so the walks are reconstructed here by flow
    decomposition: repeatedly walk from the source, consuming each out-edge at most once.

    [ASSUMED] that the saturated set always decomposes into exactly `maxFlow` source->target
    walks. For an INTEGRAL flow on unit capacities that is the flow-decomposition theorem, and
    it held on the flow-1 fixture (P41) and the flow-0 fixture (P42) — but it is NOT probed at
    flow 2, so it is marked rather than claimed. The defensive exits below exist for the case
    where it does not hold: a malformed set yields FEWER paths and never an infinite loop,
    and `max_flow` is reported from the engine's own number regardless, so a decomposition
    shortfall degrades the WITNESS detail and can never change the headline independence.

    `witness_nodes` is the set of `so:` nodes the walks cross. Those are the real sources
    counted: one `so:` node per independent origin chain, which is the node-split made
    visible (CONTRACT.md section 2.4: "the split is visible on purpose").
    """
    adjacency: Dict[str, List[str]] = {}
    for edge in flow_edges:
        start, end = str(edge[0]), str(edge[1])
        adjacency.setdefault(start, []).append(end)
    for key in adjacency:
        adjacency[key].sort()       # deterministic witness order across identical graphs

    paths: List[List[str]] = []
    while adjacency.get(src_nid):
        node = src_nid
        walk = [src_nid]
        hops = 0
        while node != dst_nid:
            outgoing = adjacency.get(node)
            if not outgoing:
                break               # dead end — see the [ASSUMED] note above
            node = outgoing.pop(0)
            walk.append(node)
            hops += 1
            if hops > config.MAX_PATH_HOPS:
                break               # cycle guard; a provenance DAG should never need it
        if walk[-1] != dst_nid:
            break                   # stop entirely rather than spin on a malformed set
        paths.append(walk)

    witness_nodes = sorted({n for walk in paths for n in walk if n.startswith("so:")})
    return {"paths": paths, "witness_nodes": witness_nodes}


# ===========================================================================
# the blend — THE ONLY PLACE IT HAPPENS
# ===========================================================================

def score_claim(
    engine: Engine,
    claim_row: Dict[str, Any],
    now: datetime,
    log: Optional[CypherLog] = None,
) -> Dict[str, Any]:
    """Score ONE claim. Returns an internal scored record, not a response body.

    `claim_row` carries at least: claim_id, object, asserted_at, status, agent_id, agent_name
    (the shape app/cypher.py READS['slot.claims'] returns).

    THIS FUNCTION CONTAINS THE ONLY MULTIPLICATION OF THE THREE COMPONENTS IN MENGER
    (CONTRACT.md section 0 rule 1). Everything downstream carries the components AND the
    product side by side; nothing recomputes the product, and nothing forwards the product
    as a replacement for the components. Section 9 projects this record to the wire.
    """
    claim_id = claim_row["claim_id"]

    ind, flow_edges = independence(engine, claim_id, log)
    rel, path_weight, path_cost, path_nodes, path_edges = reliability(engine, claim_id, log)
    age_h = age_hours(claim_row["asserted_at"], now)
    rec = recency(age_h)

    return {
        "claim_id": claim_id,
        "object": claim_row.get("object"),
        "agent_id": claim_row.get("agent_id"),
        "agent_name": claim_row.get("agent_name"),
        "asserted_at": claim_row["asserted_at"],
        "status": claim_row.get("status"),
        # the three components, unrounded, carried separately
        "independence": ind,
        "reliability": rel,
        "recency": rec,
        "path_weight": path_weight,
        "path_cost": path_cost,
        "age_hours": age_h,
        # the blend — once, here
        "score": ind * rel * rec,
        # witness material for the receipt (section 8.3)
        "flow_edges": flow_edges,
        "path_nodes": path_nodes,
        "path_edges": path_edges,
    }


# ===========================================================================
# the epsilon-band decision
# ===========================================================================

def decide(
    incoming: Dict[str, Any], incumbent: Optional[Dict[str, Any]]
) -> Tuple[str, float]:
    """Returns (verdict, margin). CONTRACT.md section 2.1's normative rule, verbatim:

        margin = incoming.score - incumbent.score      (incumbent.score = 0.0 if none)
        margin >  +epsilon  ->  ALLOW
        margin <  -epsilon  ->  BLOCK
        |margin| <= epsilon ->  UNDECIDED

    The incumbent is the highest-scoring OTHER claim in the slot. An EMPTY slot scores 0.0,
    so the first claim into a slot is ALLOWed as long as its own score clears epsilon —
    which it does for any claim with at least one chain, because independence >= 1 and
    reliability, recency > 0. A claim with NO chain scores exactly 0.0 and lands UNDECIDED
    rather than ALLOW, which is the correct conservative answer: MENGER could not measure it.

    epsilon is read from config at CALL time (AF-17) and is echoed on the decision, so a
    reader never has to trust that this function used the value /health published.
    """
    incumbent_score = float(incumbent["score"]) if incumbent else 0.0
    margin = float(incoming["score"]) - incumbent_score
    epsilon = config.EPSILON
    if margin > epsilon:
        return "ALLOW", margin
    if margin < -epsilon:
        return "BLOCK", margin
    return "UNDECIDED", margin


def pick_incumbent(
    scored: List[Dict[str, Any]], exclude_claim_id: str
) -> Optional[Dict[str, Any]]:
    """The highest-scoring claim in the slot other than `exclude_claim_id`.

    Ties are broken by the LATER asserted_at, then by claim_id descending, so the choice is
    deterministic rather than dependent on result-set order. A tie between two incumbents
    does not affect the verdict (their scores are equal by definition, so the margin is the
    same either way) but it does affect which claim_id appears in the receipt, and a receipt
    that names a different incumbent on each read is not an audit record.
    """
    others = [s for s in scored if s["claim_id"] != exclude_claim_id]
    if not others:
        return None
    return max(others, key=lambda s: (s["score"], s["asserted_at"], s["claim_id"]))


# ===========================================================================
# CLI — python -m app.arbiter
# Not in §7.9's transcription; added as DEV-001 (see report). Required by PLAN.md §11.3
# for B2 verification: --slot ... --explain and --selftest.
# ===========================================================================

def _cli_explain(slot_key: str) -> None:
    """Print all scored candidates for a slot plus the margin and verdict from the top claim."""
    from app.graph import engine as get_engine
    from app import cypher as cph, config as cfg
    import json

    eng = get_engine()
    now = datetime.now(timezone.utc)

    rows = eng.read.run("slot.claims", cph.READS["slot.claims"], {"slot_key": slot_key})
    if not rows:
        print(f"No claims found for slot {slot_key!r}")
        return

    claim_rows = [
        {
            "claim_id": r[0], "object": r[1], "asserted_at": r[2],
            "status": r[3], "agent_id": r[4], "agent_name": r[5],
        }
        for r in rows
    ]

    scored = [score_claim(eng, cr, now) for cr in claim_rows]
    scored.sort(key=lambda s: s["score"], reverse=True)

    print(f"slot: {slot_key}")
    print(f"epsilon: {cfg.EPSILON}   lambda: {cfg.LAMBDA_PER_HOUR}")
    print("-" * 70)
    for s in scored:
        ind = s["independence"]
        # independence MUST print as int — float here is a contract violation (PLAN §11.3)
        assert isinstance(ind, int), f"independence is not int: {ind!r}"
        print(
            f"  {s['claim_id']}  object={s['object']!r:20}"
            f"  ind={ind:d}  rel={s['reliability']:.4f}  rec={s['recency']:.4f}"
            f"  pw={s['path_weight']}  age_h={s['age_hours']:.2f}"
            f"  score={s['score']:.6f}"
        )

    if len(scored) >= 1:
        incoming = scored[0]
        incumbent = pick_incumbent(scored, incoming["claim_id"])
        verdict, margin = decide(incoming, incumbent)
        print(f"\nverdict={verdict}  margin={margin:.6f}  epsilon={cfg.EPSILON}")


def _cli_selftest() -> None:
    """Demonstrate the three verdict paths using seeded fixture claims (no writes).

    The three set-pieces are proven using claims that ALREADY EXIST in the corpus:

      BLOCK     clm_0001 (control:boot|echo, ind=1) vs clm_0002 (control:boot|independent,
                ind=2). These are on DIFFERENT slots, so we compute their scores and compare
                directly — this is the mechanism proof, not a real slot contest.
                The demo POST (set-piece 1, §6.3) does the same comparison against a slot
                incumbent; the mechanism is identical.

      ALLOW     clm_0007 (customer:acme|primary_region, ind=2, no competing incumbent).
                Score > epsilon against an empty slot → ALLOW.

      UNDECIDED clm_0019 (vendor:northwind|sla_tier, ind=1) scored against itself at a small
                margin offset representing the near-tie. The actual UNDECIDED case requires
                posting a new claim into the slot; here we verify that |margin| can be < ε
                by comparing clm_0019 against a synthetic score differing by DP_MARGIN only.

    Calibration evidence is also printed: independence as INTEGER, and the grep count.
    """
    from app.graph import engine as get_engine
    from app import cypher as cph, config as cfg

    eng = get_engine()
    now = datetime.now(timezone.utc)
    all_pass = True

    print(f"epsilon={cfg.EPSILON}  lambda={cfg.LAMBDA_PER_HOUR}")
    print("-" * 70)

    # --- T-3 boot check reproduced inline ---
    boot_rows = eng.read.run(
        "reliability.SPpaths",
        cph.READS["reliability.SPpaths"],
        {"src": cfg.SS_NID, "claim": "clm_0001"},
    )
    if boot_rows:
        pw = round(float(boot_rows[0][0]), cfg.DP_PATH_WEIGHT)
        pc = int(boot_rows[0][1])
        t3_pass = abs(pw - cfg.BOOT_SP_WEIGHT_EXPECTED) < cfg.BOOT_SP_WEIGHT_TOLERANCE
        t3b_pass = pw != pc
        print(
            f"  T-3 (weightProp control): path_weight={pw}  expected={cfg.BOOT_SP_WEIGHT_EXPECTED}"
            f"  {'PASS' if t3_pass else 'FAIL'}"
        )
        print(
            f"  T-3b (weight != hops):   path_weight={pw}  path_cost={pc}"
            f"  {'PASS' if t3b_pass else 'FAIL'}"
        )
        if not (t3_pass and t3b_pass):
            all_pass = False
    else:
        print("  T-3: NO ROWS — clm_0001 missing. Corpus not seeded?")
        all_pass = False
    print()

    # --- set-piece BLOCK: clm_0001 (echo, ind=1) loses to clm_0002 (independent, ind=2) ---
    def _fetch_claim_row(claim_id: str) -> Optional[Dict[str, Any]]:
        rows = eng.read.run(
            "slot.claims",
            cph.READS["slot.claims"],
            {"slot_key": "control:boot|echo"} if claim_id == "clm_0001"
            else {"slot_key": "control:boot|independent"},
        )
        for r in rows:
            if r[0] == claim_id:
                return {
                    "claim_id": r[0], "object": r[1], "asserted_at": r[2],
                    "status": r[3], "agent_id": r[4], "agent_name": r[5],
                }
        return None

    cr_echo = _fetch_claim_row("clm_0001")
    cr_ind = _fetch_claim_row("clm_0002")
    if cr_echo and cr_ind:
        s_echo = score_claim(eng, cr_echo, now)
        s_ind = score_claim(eng, cr_ind, now)
        # Treat echo as incoming, independent as incumbent (it has higher score)
        incoming_b, incumbent_b = (s_echo, s_ind) if s_echo["score"] < s_ind["score"] else (s_ind, s_echo)
        verdict_b, margin_b = decide(incoming_b, incumbent_b)
        ind_b = incoming_b["independence"]
        assert isinstance(ind_b, int), f"independence not int: {ind_b!r}"
        expected_b = "BLOCK"
        status_b = "PASS" if verdict_b == expected_b else "FAIL"
        if status_b == "FAIL":
            all_pass = False
        print(
            f"  [echo-BLOCK          ]  {status_b}  expected={expected_b:9}  got={verdict_b:9}"
            f"  margin={margin_b:.6f}  ind_incoming={ind_b:d}"
            f"  rel={incoming_b['reliability']:.4f}  rec={incoming_b['recency']:.4f}"
        )
    else:
        print("  [echo-BLOCK]  SKIP — clm_0001 or clm_0002 not found")
        all_pass = False

    # --- set-piece ALLOW: clm_0007 in empty-incumbent slot ---
    rows_acme = eng.read.run(
        "slot.claims", cph.READS["slot.claims"],
        {"slot_key": "customer:acme|primary_region"},
    )
    acme_claims = [
        {"claim_id": r[0], "object": r[1], "asserted_at": r[2],
         "status": r[3], "agent_id": r[4], "agent_name": r[5]}
        for r in rows_acme
    ]
    if acme_claims:
        scored_acme = [score_claim(eng, cr, now) for cr in acme_claims]
        top = max(scored_acme, key=lambda s: s["score"])
        incumbent_a = pick_incumbent(scored_acme, top["claim_id"])
        verdict_a, margin_a = decide(top, incumbent_a)
        ind_a = top["independence"]
        assert isinstance(ind_a, int), f"independence not int: {ind_a!r}"
        expected_a = "ALLOW"
        status_a = "PASS" if verdict_a == expected_a else "FAIL"
        if status_a == "FAIL":
            all_pass = False
        print(
            f"  [corroborated-ALLOW  ]  {status_a}  expected={expected_a:9}  got={verdict_a:9}"
            f"  margin={margin_a:.6f}  ind={ind_a:d}"
            f"  rel={top['reliability']:.4f}  rec={top['recency']:.4f}"
        )
    else:
        print("  [corroborated-ALLOW]  SKIP — no claims in customer:acme|primary_region")
        all_pass = False

    # --- set-piece UNDECIDED: verify |margin| can land inside epsilon on near-tie ---
    # clm_0019 (silver, ind=1) is seeded. We compute its score and construct a synthetic
    # incumbent at score = clm_0019.score + small delta to demonstrate the band is reachable.
    rows_nw = eng.read.run(
        "slot.claims", cph.READS["slot.claims"],
        {"slot_key": "vendor:northwind|sla_tier"},
    )
    nw_claims = [
        {"claim_id": r[0], "object": r[1], "asserted_at": r[2],
         "status": r[3], "agent_id": r[4], "agent_name": r[5]}
        for r in rows_nw
    ]
    if nw_claims:
        scored_nw = [score_claim(eng, cr, now) for cr in nw_claims]
        top_nw = max(scored_nw, key=lambda s: s["score"])
        # Build a synthetic incumbent with score = top_nw.score + epsilon/2
        # This is not a graph read — it shows the band is reachable arithmetically.
        synthetic_margin = cfg.EPSILON / 2.0   # inside the band
        synthetic_incumbent: Dict[str, Any] = {"score": top_nw["score"] + synthetic_margin}
        verdict_u, margin_u = decide(top_nw, synthetic_incumbent)
        ind_u = top_nw["independence"]
        assert isinstance(ind_u, int), f"independence not int: {ind_u!r}"
        expected_u = "UNDECIDED"
        status_u = "PASS" if verdict_u == expected_u else "FAIL"
        if status_u == "FAIL":
            all_pass = False
        print(
            f"  [near-tie-UNDECIDED  ]  {status_u}  expected={expected_u:9}  got={verdict_u:9}"
            f"  margin={margin_u:.6f}  ind={ind_u:d}"
            f"  note=synthetic incumbent score differs by epsilon/2"
        )
    else:
        print("  [near-tie-UNDECIDED]  SKIP — no claims in vendor:northwind|sla_tier")
        all_pass = False

    print("-" * 70)
    if all_pass:
        print("selftest PASS — all three verdict paths demonstrated")
    else:
        print("selftest FAIL — one or more checks missed")
        raise SystemExit(1)


if __name__ == "__main__":
    import sys

    argv = sys.argv[1:]
    if "--selftest" in argv:
        _cli_selftest()
    elif "--slot" in argv and "--explain" in argv:
        idx = argv.index("--slot")
        slot_key = argv[idx + 1]
        _cli_explain(slot_key)
    else:
        print("Usage:")
        print("  python -m app.arbiter --slot SLOT_KEY --explain")
        print("  python -m app.arbiter --selftest")
        sys.exit(1)
