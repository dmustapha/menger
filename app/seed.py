# app/seed.py
"""Builds the entire MENGER corpus from a fixed RNG seed. Run once, before the API starts:

    python -m app.seed

NOT importable by the server (section 5.2). A stray import of this module into a request
path is how a demo wipes its own corpus mid-judging, so there is no side-effect-free surface
here to tempt one: the only public entry point is seed(), and it deletes the graph first.

Order of operations, and why it is this order:
  1. DELETE the graph key. Necessary, not tidiness: `menger` currently holds 7-node warroom
     probe leftovers with label `N` and relationship type `E` ([VERIFIED section 3-P10],
     section 16.5). Seeding on top of them would leave non-provenance edges inside the graph
     that algo.maxFlow runs over.
  2. Create the 18 range indexes (section 4.5) BEFORE the data, so the bulk MATCHes in steps
     3-9 are indexed rather than scanning.
  3. super-source -> 4. agents -> 5. sources (+ both split halves + the SPLIT edge)
     -> 6. ORIGIN edges -> 7. DERIVED edges -> 8. slots -> 9. claims -> 10. citations.
     Each step only MATCHes what an earlier step created; there are no forward references.
  11. Set the three counters to the high-water marks actually used.
  12. VERIFY the three boot constants here, so a bad seed fails at seed time rather than
      surfacing later as a 503 from GET /health with nobody around to read it.
"""
from __future__ import annotations

import math
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from falkordb import FalkorDB

from app import config, cypher
from app.graph import Engine

# ===========================================================================
# SEED_WRITES — the seed's OWN write registry, passed to Engine.write_channel()
# (section 7.4). Keys, never caller-supplied text: Decision D-4 holds here too.
#
# These statements are deliberately NOT in app/cypher.py WRITES. That registry is what the
# REQUEST path can execute, and nothing a request can reach should be able to create 300
# nodes in one go. Two registries, two blast radii.
#
# Every statement is a bulk UNWIND, so the whole corpus is nine round trips, not thousands.
# ===========================================================================

SEED_WRITES = {
    "seed.supersource": "CREATE (:SuperSource {nid:$nid, created_at:$now})",
    "seed.agents": (
        "UNWIND $rows AS r "
        "CREATE (:Agent {id:r.id, name:r.name, trust:r.trust})"
    ),
    # One statement creates the :Source, BOTH split halves, the two :SPLIT_OF edges, and the
    # SPLIT :FLOW edge that IS the vertex capacity (DS-1, section 4.3). They are created
    # together because a :Source without its split pair is an unscoreable node — there is no
    # legal intermediate state, so there is no statement that can produce one.
    "seed.sources": (
        "UNWIND $rows AS r "
        "CREATE (s:Source {id:r.id, kind:r.kind, trust:r.trust, is_origin:r.is_origin, "
        "label:r.label}) "
        "CREATE (si:SourceIn {nid:r.si, sid:r.id}) "
        "CREATE (so:SourceOut {nid:r.so, sid:r.id}) "
        "CREATE (si)-[:SPLIT_OF]->(s) "
        "CREATE (so)-[:SPLIT_OF]->(s) "
        "CREATE (si)-[:FLOW {cap:1.0, nl:r.nl, kind:'SPLIT'}]->(so)"
    ),
    "seed.origin_edges": (
        "MATCH (ss:SuperSource {nid:$ss}) "
        "UNWIND $rows AS r "
        "MATCH (si:SourceIn {nid:r.si}) "
        "CREATE (ss)-[:FLOW {cap:1.0, nl:0.0, kind:'ORIGIN'}]->(si)"
    ),
    "seed.derived_edges": (
        "UNWIND $rows AS r "
        "MATCH (so:SourceOut {nid:r.parent_so}), (si:SourceIn {nid:r.child_si}) "
        "CREATE (so)-[:FLOW {cap:1.0, nl:r.nl, kind:'DERIVED'}]->(si)"
    ),
    "seed.slots": (
        "UNWIND $rows AS r "
        "CREATE (:Slot {key:r.key, subject:r.subject, predicate:r.predicate})"
    ),
    "seed.claims": (
        "UNWIND $rows AS r "
        "MATCH (a:Agent {id:r.agent_id}), (sl:Slot {key:r.slot_key}) "
        "CREATE (c:Claim {nid:r.id, id:r.id, subject:r.subject, predicate:r.predicate, "
        "object:r.object, slot_key:r.slot_key, asserted_at:r.asserted_at, status:'SEEDED'}) "
        "CREATE (c)-[:FILLS]->(sl) "
        "CREATE (a)-[:ASSERTED {at:r.asserted_at}]->(c)"
    ),
    # The CITED flow edge and the human-readable :CITES edge, created as a pair. Note the
    # directions are OPPOSITE: flow runs source -> claim, citation runs claim -> source
    # (section 4.2). :CITES carries no `cap` — invariant SCH-2, checked at boot by B-5.
    "seed.citations": (
        "UNWIND $rows AS r "
        "MATCH (c:Claim {id:r.claim_id}), (si:SourceIn {sid:r.source_id}), "
        "(so:SourceOut {sid:r.source_id}) "
        "CREATE (so)-[:FLOW {cap:1.0, nl:0.0, kind:'CITED'}]->(c) "
        "CREATE (c)-[:CITES]->(si)"
    ),
}

# ===========================================================================
# The 18 range indexes of section 4.5, in that order.
# ===========================================================================

INDEXES: List[Tuple[str, str]] = [
    ("SuperSource", "nid"),
    ("SourceIn", "nid"),
    ("SourceIn", "sid"),
    ("SourceOut", "nid"),
    ("SourceOut", "sid"),
    ("Source", "id"),
    ("Agent", "id"),
    ("Claim", "id"),
    ("Claim", "nid"),
    ("Claim", "slot_key"),
    ("Claim", "status"),
    ("Slot", "key"),
    ("Receipt", "id"),
    ("Receipt", "claim_id"),
    ("Review", "id"),
    ("Review", "slot_key"),
    ("Review", "state"),
    ("Counter", "name"),
]

# ===========================================================================
# Vocabularies. Fixed, small, and boring on purpose: a judge should be able to read the
# corpus and recognise it as synthetic without being told (section 6.1).
# ===========================================================================

ROLES = [
    "planner", "scraper", "crawler", "summariser",
    "router", "auditor", "indexer", "broker",
]
AGENTS_PER_ROLE = 5                 # 8 roles x 5 = 40 agents (section 6.2)

# The 8 source kinds and the trust band each GENERATED source draws from (section 6.2).
# Hand-named fixtures below override these bands deliberately; see FIXTURE_SOURCES.
TRUST_BANDS: Dict[str, Tuple[float, float]] = {
    "system_export": (0.88, 0.94),
    "contract": (0.88, 0.94),
    "ticket": (0.70, 0.82),
    "wiki": (0.60, 0.75),
    "press": (0.55, 0.70),
    "chatlog": (0.45, 0.60),
    "forum": (0.35, 0.50),
    "blog": (0.35, 0.50),
}
KINDS = list(TRUST_BANDS)           # insertion order is fixed -> deterministic cycling

TOTAL_SOURCES = 150
GENERATED_DERIVED = 54              # + 6 fixture derivations = 60 = 40% of 150
TOTAL_CLAIMS = 60
TOTAL_SLOTS = 20

# --- the hand-built fixtures (section 6.3, 6.4) ----------------------------
# (source_id, kind, trust, parent_source_id or None, fidelity)
# fidelity is only meaningful when there is a parent; it is the DERIVED edge's weight basis.
FIXTURE_SOURCES: List[Tuple[str, str, float, Optional[str], float]] = [
    # Set-piece 1 — the echo chamber. All three at trust 0.90, which is OUT OF the `blog`
    # band on purpose (section 6.3): the echo is as trustworthy as the CRM export and still
    # loses, because it loses on independence alone. fidelity 1.0 -> the DERIVED edges are
    # free, so the cheapest chain pays exactly two SPLIT edges = 2 x -ln(0.90) = 0.21072.
    ("src_blog_hub", "blog", 0.90, None, 1.0),
    ("src_blog_echo_a", "blog", 0.90, "src_blog_hub", 1.0),
    ("src_blog_echo_b", "blog", 0.90, "src_blog_hub", 1.0),
    # Set-piece 2 — genuine corroboration. Two independent origins, both 0.90, both in band.
    ("src_crm_export", "system_export", 0.90, None, 1.0),
    ("src_contract_pdf", "contract", 0.90, None, 1.0),
    # Set-piece 3 — the near-tie. The two mirrors exist to make each side an ECHO (two
    # citations, one origin) without affecting either side's path weight: the direct citation
    # is always the cheaper chain, so the mirror's own trust never enters the number.
    ("src_nw_portal", "wiki", 0.72, None, 1.0),
    ("src_nw_portal_mirror", "blog", 0.45, "src_nw_portal", 1.0),
    ("src_nw_email", "chatlog", 0.71, None, 1.0),
    ("src_nw_email_mirror", "blog", 0.45, "src_nw_email", 1.0),
    # Boot controls (section 6.4). Every one is 0.90 AND in band, so sp_path_weight is
    # exactly 2 x -ln(0.90) with no out-of-band value anywhere near the asserted number.
    ("src_boot_hub", "system_export", 0.90, None, 1.0),
    ("src_boot_echo_a", "system_export", 0.90, "src_boot_hub", 1.0),
    ("src_boot_echo_b", "system_export", 0.90, "src_boot_hub", 1.0),
    ("src_boot_ind_a", "system_export", 0.90, None, 1.0),
    ("src_boot_ind_b", "contract", 0.90, None, 1.0),
]

# (slot_key, subject, predicate) — the 4 pinned slots. The 16 generated ones follow.
FIXTURE_SLOTS: List[Tuple[str, str, str]] = [
    ("control:boot|echo", "control:boot", "echo"),
    ("control:boot|independent", "control:boot", "independent"),
    ("customer:acme|primary_region", "customer:acme", "primary_region"),
    ("vendor:northwind|sla_tier", "vendor:northwind", "sla_tier"),
]

# (claim_id, slot_key, object, [source_ids], age_hours_before_SEED_NOW)
FIXTURE_CLAIMS: List[Tuple[str, str, str, List[str], float]] = [
    # clm_0001 cites ONLY the two echoes, never the hub. If it cited the hub the cheapest
    # chain would be one SPLIT edge (0.10536) and the 0.21072 assertion would be wrong.
    ("clm_0001", "control:boot|echo", "boot-control-echo",
     ["src_boot_echo_a", "src_boot_echo_b"], 48.0),
    ("clm_0002", "control:boot|independent", "boot-control-independent",
     ["src_boot_ind_a", "src_boot_ind_b"], 48.0),
    # 9.6 h is CONTRACT.md section 2.1's worked example age (section 6.3).
    ("clm_0007", "customer:acme|primary_region", "eu-west-1",
     ["src_crm_export", "src_contract_pdf"], 9.6),
    ("clm_0019", "vendor:northwind|sla_tier", "silver",
     ["src_nw_portal", "src_nw_portal_mirror"], 3.0),
]

# The 4 pinned slots hold EXACTLY their pinned claims and nothing else. The 56 generated
# claims are distributed over the 16 generated slots only. This is deliberate: a random
# contender landing on `customer:acme|primary_region` could out-score clm_0007 (it only needs
# two origin citations), and the hero beat of the whole submission would then depend on an
# RNG draw. The set-piece slots are kept clean so the demo is deterministic, and that choice
# is stated rather than hidden.
GEN_SUBJECTS = [
    "customer:globex", "customer:initech", "customer:umbrella", "vendor:soylent",
    "vendor:tyrell", "service:billing", "service:auth", "service:search",
    "region:eu-west-1", "region:us-east-1", "dataset:churn", "dataset:ltv",
    "policy:retention", "policy:pii", "incident:inc-204", "incident:inc-311",
]
GEN_PREDICATES = [
    "primary_region", "sla_tier", "owner_team", "retention_days",
    "status", "tier", "contact_email", "renewal_month",
]
OBJECT_VOCAB: Dict[str, List[str]] = {
    "primary_region": ["eu-west-1", "us-east-1", "ap-south-1", "us-west-2"],
    "sla_tier": ["bronze", "silver", "gold", "platinum"],
    "owner_team": ["team-atlas", "team-borealis", "team-cinder"],
    "retention_days": ["30", "90", "365", "730"],
    "status": ["active", "suspended", "churned"],
    "tier": ["free", "pro", "enterprise"],
    # .invalid is the reserved-by-RFC-2606 TLD. Nothing here can resolve to a real mailbox.
    "contact_email": ["ops@example.invalid", "sec@example.invalid", "dpo@example.invalid"],
    "renewal_month": ["2026-01", "2026-04", "2026-07", "2026-10"],
}


# ===========================================================================
# Helpers
# ===========================================================================

def _clamp_trust(t: float) -> float:
    """Trust lives in [0.05, 0.99]. NEVER 0.0: -ln(0) is infinite (section 14.1), and never
    1.0, so every real source costs something and a chain always pays."""
    return max(0.05, min(0.99, round(t, 2)))


def _nl(x: float) -> float:
    """nl = -ln(x), rounded to 6 d.p. — one more place than path_weight is published at
    (5 d.p., config.DP_PATH_WEIGHT), so rounding here cannot move the published number."""
    return round(-math.log(x), 6)


def _iso(dt: datetime) -> str:
    """ISO-8601 UTC with a literal Z, which is the only form MENGER writes (section 4.1)."""
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _parse_seed_now() -> datetime:
    """The corpus's reference instant, against which every fixture age is anchored.

    Ages are RELATIVE: the near-tie incumbent is seeded at age 9.6h, the incoming claim
    at age 0. The arbiter scores against real wall-clock (arbiter.py), so if this instant
    is frozen in the past the incumbent's recency decays forever and the near-tie margin
    eventually drifts out of the epsilon band — the set-piece expires. Anchoring to NOW
    by default keeps every relative age (and so the designed margin) constant whenever a
    judge seeds. CONTRACT.md's worked example (recency 0.9261 @ 9.6h) is preserved because
    it depends only on the relative age, not on the absolute instant.

    Set MENGER_SEED_NOW to the frozen literal to reproduce a fixed-timestamp corpus.
    """
    pinned = os.getenv("MENGER_SEED_NOW")
    if pinned:
        return datetime.strptime(pinned, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc)


def _wipe() -> bool:
    """DELETE the graph key if it exists. Returns True if something was deleted.

    Uses the falkordb client directly — the second of the two documented imports outside
    app/graph.py (section 5.2) — because Graph.delete() and FalkorDB.list_graphs() are CLIENT
    methods, not Cypher. There is no statement that can express them, so they cannot live in
    a registry at all.

    Existence is CHECKED first rather than deleting and swallowing the exception: the error
    FalkorDB v4.22.1 raises for deleting a missing key is [UNVERIFIED], and swallowing an
    unverified exception is how a real failure gets hidden. list_graphs() and
    Graph.delete() -> None are [VERIFIED section 3-P40, re-confirmed P48].
    """
    db = FalkorDB.from_url(config.REDIS_URL)
    try:
        if config.GRAPH_NAME not in db.list_graphs():
            return False
        db.select_graph(config.GRAPH_NAME).delete()
        return True
    finally:
        db.close()


def _build_agents(rng: random.Random) -> List[Dict[str, Any]]:
    rows = []
    for role in ROLES:
        for n in range(1, AGENTS_PER_ROLE + 1):
            rows.append(
                {
                    "id": f"agt_{role}_{n}",
                    "name": f"{role}-{n}",
                    # :Agent.trust is seeded and NOT an input to the score. Section 14.5
                    # states why it is unused rather than letting a reader assume it is.
                    "trust": _clamp_trust(rng.uniform(0.50, 0.95)),
                }
            )
    return rows


def _build_sources(rng: random.Random) -> Tuple[Dict[str, Dict[str, Any]], List[str]]:
    """Returns (sources_by_id, insertion_order).

    Each source dict carries: id, kind, trust, parent (or None), fidelity, label.
    `is_origin` is derived from `parent is None` and denormalised onto the node (section 4.1)
    so the response layer never has to re-derive it by traversal.
    """
    sources: Dict[str, Dict[str, Any]] = {}
    order: List[str] = []

    for sid, kind, trust, parent, fidelity in FIXTURE_SOURCES:
        sources[sid] = {
            "id": sid,
            "kind": kind,
            "trust": _clamp_trust(trust),
            "parent": parent,
            "fidelity": fidelity,
            "label": sid[len("src_"):].replace("_", " "),
        }
        order.append(sid)

    # Candidate parents for the generated derivations: anything already created that is
    # itself an origin. Derived-from-derived chains are therefore never created by the bulk
    # generator, which keeps the deepest generated chain at 5 hops and leaves
    # config.MAX_PATH_HOPS = 12 as genuine slack rather than a tuned bound (LIM-5).
    origins = [s for s in order if sources[s]["parent"] is None]

    generated = TOTAL_SOURCES - len(FIXTURE_SOURCES)      # 150 - 14 = 136
    for i in range(generated):
        kind = KINDS[i % len(KINDS)]
        lo, hi = TRUST_BANDS[kind]
        sid = f"src_{kind}_{i:03d}"
        is_derived = i < GENERATED_DERIVED                # the first 54 are derivations
        parent = rng.choice(origins) if is_derived else None
        sources[sid] = {
            "id": sid,
            "kind": kind,
            "trust": _clamp_trust(rng.uniform(lo, hi)),
            "parent": parent,
            "fidelity": round(rng.uniform(0.70, 1.00), 2) if is_derived else 1.0,
            "label": f"{kind.replace('_', ' ')} {i:03d}",
        }
        order.append(sid)
        if not is_derived:
            origins.append(sid)

    return sources, order


def _build_slots() -> List[Dict[str, str]]:
    rows = [
        {"key": key, "subject": subject, "predicate": predicate}
        for key, subject, predicate in FIXTURE_SLOTS
    ]
    for i, subject in enumerate(GEN_SUBJECTS):
        predicate = GEN_PREDICATES[i % len(GEN_PREDICATES)]
        rows.append(
            {"key": f"{subject}|{predicate}", "subject": subject, "predicate": predicate}
        )
    assert len(rows) == TOTAL_SLOTS, f"slot count drifted: {len(rows)} != {TOTAL_SLOTS}"
    return rows


def _build_claims(
    rng: random.Random,
    now: datetime,
    slots: List[Dict[str, str]],
    agent_ids: List[str],
    source_ids: List[str],
) -> Tuple[List[Dict[str, Any]], List[Dict[str, str]]]:
    """Returns (claim_rows, citation_rows)."""
    slot_by_key = {s["key"]: s for s in slots}
    generated_slots = [s for s in slots if s["key"] not in slot_by_key or True]
    generated_slots = [
        s for s in slots if s["key"] not in {k for k, _s, _p in FIXTURE_SLOTS}
    ]

    claim_rows: List[Dict[str, Any]] = []
    citation_rows: List[Dict[str, str]] = []
    pinned_ids = {cid for cid, _sk, _o, _src, _age in FIXTURE_CLAIMS}

    def emit(claim_id: str, slot_key: str, obj: str, srcs: List[str], age_h: float) -> None:
        slot = slot_by_key[slot_key]
        asserted = now - timedelta(hours=age_h)
        claim_rows.append(
            {
                "id": claim_id,
                "slot_key": slot_key,
                "subject": slot["subject"],
                "predicate": slot["predicate"],
                "object": obj,
                "asserted_at": _iso(asserted),
                "agent_id": rng.choice(agent_ids),
            }
        )
        for sid in srcs:
            citation_rows.append({"claim_id": claim_id, "source_id": sid})

    for claim_id, slot_key, obj, srcs, age_h in FIXTURE_CLAIMS:
        emit(claim_id, slot_key, obj, srcs, age_h)

    # The 56 remaining ids, in order, over the 16 generated slots only.
    free_ids = [f"clm_{n:04d}" for n in range(1, TOTAL_CLAIMS + 1) if f"clm_{n:04d}" not in pinned_ids]
    for i, claim_id in enumerate(free_ids):
        slot = generated_slots[i % len(generated_slots)]
        obj = rng.choice(OBJECT_VOCAB[slot["predicate"]])
        n_src = rng.randint(1, 3)
        srcs = rng.sample(source_ids, n_src)
        age_h = round(rng.uniform(0.5, 240.0), 1)
        emit(claim_id, slot["key"], obj, srcs, age_h)

    assert len(claim_rows) == TOTAL_CLAIMS, (
        f"claim count drifted: {len(claim_rows)} != {TOTAL_CLAIMS}"
    )
    return claim_rows, citation_rows


# ===========================================================================
# Self-verification — the three boot constants, checked at seed time.
# ===========================================================================

def _verify(engine: Engine) -> Dict[str, Any]:
    """Run the three boot reads against the corpus just created.

    This duplicates app/bootcheck.py on purpose. bootcheck.py protects the SERVICE (it is
    what returns 503 BOOT_ASSERTION_FAILED); this protects the SEED, so a broken corpus is
    reported by the process that broke it, while the operator is still looking at a terminal.
    A seed that silently produces a wrong graph and a /health that 503s an hour later are the
    same bug with very different debugging costs.
    """
    echo_rows = engine.read.run(
        "seed.verify.echo",
        cypher.READS["independence.maxFlow"],
        {"src": config.SS_NID, "claim": config.BOOT_ECHO_CLAIM},
    )
    ind_rows = engine.read.run(
        "seed.verify.independent",
        cypher.READS["independence.maxFlow"],
        {"src": config.SS_NID, "claim": config.BOOT_INDEPENDENT_CLAIM},
    )
    sp_rows = engine.read.run(
        "seed.verify.sp_weight",
        cypher.READS["reliability.SPpaths"],
        {"src": config.SS_NID, "claim": config.BOOT_ECHO_CLAIM},
    )

    echo = int(round(float(echo_rows[0][0]))) if echo_rows else -1
    independent = int(round(float(ind_rows[0][0]))) if ind_rows else -1
    weight = round(float(sp_rows[0][0]), config.DP_PATH_WEIGHT) if sp_rows else None
    hops = int(sp_rows[0][1]) if sp_rows else -1

    return {
        "node_split_echo": {
            "expected": config.BOOT_ECHO_EXPECTED,
            "actual": echo,
            "pass": echo == config.BOOT_ECHO_EXPECTED,
        },
        "node_split_independent": {
            "expected": config.BOOT_INDEPENDENT_EXPECTED,
            "actual": independent,
            "pass": independent == config.BOOT_INDEPENDENT_EXPECTED,
        },
        "sp_path_weight": {
            "expected": config.BOOT_SP_WEIGHT_EXPECTED,
            "actual": weight,
            "pass": weight is not None
            and abs(weight - config.BOOT_SP_WEIGHT_EXPECTED)
            <= config.BOOT_SP_WEIGHT_TOLERANCE,
        },
        # The AF-3 trap guard that needs no memorised constant: if the weight key regressed,
        # pathWeight would equal pathCost (the hop count). [VERIFIED section 3-P35].
        "sp_weight_is_not_hop_count": {
            "expected": "pathWeight != pathCost",
            "actual": f"{weight} vs {hops}",
            "pass": weight is not None and abs(weight - float(hops)) > 1e-9,
        },
    }


# ===========================================================================
# The entry point
# ===========================================================================

def seed() -> Dict[str, Any]:
    rng = random.Random(config.SEED_RNG)
    now = _parse_seed_now()

    deleted = _wipe()

    engine = Engine()
    graph = engine.raw_graph()          # client methods only; see Engine.raw_graph (7.4)
    write = engine.write_channel(SEED_WRITES)

    # --- 2. indexes, before the data -------------------------------------
    for label, prop in INDEXES:
        graph.create_node_range_index(label, prop)

    # --- 3. the super-source ---------------------------------------------
    write.run("seed.supersource", {"nid": config.SS_NID, "now": _iso(now)})

    # --- 4. agents --------------------------------------------------------
    agent_rows = _build_agents(rng)
    write.run("seed.agents", {"rows": agent_rows})

    # --- 5. sources, both split halves, and the SPLIT (capacity) edge -----
    sources, order = _build_sources(rng)
    source_rows = [
        {
            "id": s["id"],
            "kind": s["kind"],
            "trust": s["trust"],
            "is_origin": s["parent"] is None,
            "label": s["label"],
            "si": config.si(s["id"]),
            "so": config.so(s["id"]),
            "nl": _nl(s["trust"]),          # trust is paid ONCE, on this edge (section 4.3)
        }
        for s in (sources[sid] for sid in order)
    ]
    write.run("seed.sources", {"rows": source_rows})

    # --- 6. ORIGIN edges: ss -> si, free (nl 0.0) -------------------------
    origin_rows = [
        {"si": config.si(sid)} for sid in order if sources[sid]["parent"] is None
    ]
    write.run("seed.origin_edges", {"ss": config.SS_NID, "rows": origin_rows})

    # --- 7. DERIVED edges: so:parent -> si:child, nl = -ln(fidelity) ------
    derived_rows = [
        {
            "parent_so": config.so(sources[sid]["parent"]),
            "child_si": config.si(sid),
            "nl": _nl(sources[sid]["fidelity"]),
        }
        for sid in order
        if sources[sid]["parent"] is not None
    ]
    write.run("seed.derived_edges", {"rows": derived_rows})

    # --- 8. slots ---------------------------------------------------------
    slot_rows = _build_slots()
    write.run("seed.slots", {"rows": slot_rows})

    # --- 9/10. claims and their citations ---------------------------------
    claim_rows, citation_rows = _build_claims(
        rng, now, slot_rows, [a["id"] for a in agent_rows], order
    )
    write.run("seed.claims", {"rows": claim_rows})
    write.run("seed.citations", {"rows": citation_rows})

    # --- 11. counters, set to the high-water marks ACTUALLY used ----------
    # counter.next does `value = value + 1` and RETURNS the new value, so setting `claim` to
    # the number of seeded claims makes the first live allocation clm_0061 (section 7.8).
    write_server = engine.write                     # app/cypher.py WRITES
    write_server.run("counter.set", {"name": "claim", "value": len(claim_rows)})
    write_server.run("counter.set", {"name": "review", "value": 0})
    write_server.run("counter.set", {"name": "receipt", "value": 0})

    # --- 12. verify, loudly ----------------------------------------------
    checks = _verify(engine)
    summary = {
        "graph": config.GRAPH_NAME,
        "wiped_existing_key": deleted,
        "indexes": len(INDEXES),
        "agents": len(agent_rows),
        "sources": len(source_rows),
        "split_nodes": 2 * len(source_rows),
        "origin_edges": len(origin_rows),
        "derived_edges": len(derived_rows),
        "slots": len(slot_rows),
        "claims": len(claim_rows),
        "citations": len(citation_rows),
        "counters": {"claim": len(claim_rows), "review": 0, "receipt": 0},
        "boot_checks": checks,
    }
    return summary


def main() -> int:
    summary = seed()
    for key, value in summary.items():
        if key != "boot_checks":
            print(f"{key:>20}: {value}")
    print("-" * 52)
    failures = []
    for name, check in summary["boot_checks"].items():
        state = "PASS" if check["pass"] else "FAIL"
        print(f"{name:>30}: {state}  expected={check['expected']} actual={check['actual']}")
        if not check["pass"]:
            failures.append(name)
    if failures:
        # Non-zero exit. A seed that produced a corpus the boot assertions reject must not be
        # mistaken for a successful seed by a script, a Makefile, or a tired human at 18:00.
        print(f"\nSEED FAILED: {', '.join(failures)}")
        return 1
    print("\nseed OK — boot assertions reproduce on the seeded corpus")
    return 0


if __name__ == "__main__":
    sys.exit(main())
