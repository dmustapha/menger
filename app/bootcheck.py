# app/bootcheck.py
"""The boot assertions (AF-16), and the service's refusal to serve without them.

Six checks. Three are NAMED BY THE CONTRACT and appear at the top level of `boot_checks`
with the exact keys CONTRACT.md section 2.8 publishes:

  T-1  node_split_echo        -> 1        the echo chamber collapses  [VERIFIED section 3-P11]
  T-2  node_split_independent -> 2        two disjoint origins count  [VERIFIED section 3-P13]
  T-3  sp_path_weight         -> 0.21072  the weightProp key works    [VERIFIED section 3-P7]

Three more are MENGER's own, and they live under `boot_checks["extra"]` so that adding them
is additive to the frozen contract rather than a change to it (a console reading the three
contract keys sees exactly what section 2.8 promised, and a console that wants more can look):

  T-3b sp_weight_is_not_hop_count   pathWeight != pathCost      [VERIFIED section 3-P35]
  T-4  ro_query_refuses_write       RO_QUERY rejects a CREATE   [VERIFIED section 3-P2/P39]
  B-5  cap_on_non_flow              invariant SCH-2 holds       [VERIFIED section 3-P47a]

WHY T-3b EXISTS WHEN T-3 ALREADY CHECKS 0.21072. T-3 depends on one memorised constant and
on the corpus that produces it. If someone re-seeds with a different trust value, T-3 fails
for a reason that has nothing to do with the AF-3 trap, and the temptation is then to update
the constant — at which point a genuine weight-key regression would be absorbed by the same
edit. T-3b is corpus-independent: a wrong weight key makes algo.SPpaths return the HOP COUNT
in `pathWeight`, so `pathWeight == pathCost`, for ANY corpus. The two checks fail for
different reasons, which is the only reason to have both.

WHY T-4 IS TWO STEPS. ReadChannel converts both an engine refusal and a dead socket into the
same MengerError (section 7.4), so "the write attempt raised" alone cannot distinguish
"RO_QUERY contained it" from "the container is down". T-4 therefore runs a control MATCH
FIRST and requires it to SUCCEED; only then does the CREATE attempt have to fail. A dead
connection fails the control and is reported as such.

NOTHING IN THIS FILE WRITES. T-4 attempts a write and REQUIRES it to be refused; it goes
through ReadChannel, so GRAPH.RO_QUERY is what refuses it. The boot path cannot mutate the
graph it is asserting over, and that is enforced by the engine rather than by this docstring.
"""
from typing import Any, Dict, Optional, Tuple

from app import config, cypher
from app.errors import MengerError
from app.graph import Engine

# The three keys CONTRACT.md section 2.8 names. Held as a constant so that a refactor that
# renames one breaks loudly here instead of quietly changing the published surface.
CONTRACT_CHECK_KEYS = ("node_split_echo", "node_split_independent", "sp_path_weight")


def _check(expected: Any, actual: Any, ok: bool) -> Dict[str, Any]:
    """The {expected, actual, pass} triple CONTRACT.md section 2.8 publishes.

    `actual` is always included, including when the check FAILED — that is the whole value of
    the surface. A failure that reports only `pass: false` tells an operator nothing.
    """
    return {"expected": expected, "actual": actual, "pass": bool(ok)}


def _max_flow(engine: Engine, claim_id: str) -> int:
    """The independence of one boot-control claim. -1 when the claim is MISSING.

    -1 rather than 0: zero is a legitimate flow value (a claim with no chain), and a missing
    control claim is a corpus that was never seeded. Collapsing the two would let an empty
    graph report "expected 1, got 0 — the node-split is not in effect", which sends an
    operator to debug the split when the real fault is that app/seed.py never ran.
    """
    rows = engine.read.run(
        "boot.independence.maxFlow",
        cypher.READS["independence.maxFlow"],
        {"src": config.SS_NID, "claim": claim_id},
    )
    if not rows:
        return -1
    return int(round(float(rows[0][0])))


def _sp_weight_and_cost(engine: Engine, claim_id: str) -> Tuple[Optional[float], int]:
    """(path_weight, path_cost) for one boot-control claim. (None, -1) when absent.

    Both come back in ONE row from ONE statement ([VERIFIED section 3-P35]), so T-3 and T-3b
    cost one read between them, not two.
    """
    rows = engine.read.run(
        "boot.reliability.SPpaths",
        cypher.READS["reliability.SPpaths"],
        {"src": config.SS_NID, "claim": claim_id},
    )
    if not rows:
        return None, -1
    return round(float(rows[0][0]), config.DP_PATH_WEIGHT), int(rows[0][1])


def _ro_query_refuses_write(engine: Engine) -> Dict[str, Any]:
    """T-4. Reproduce [VERIFIED section 3-P2] live, on every boot.

    Step 1: a control read must SUCCEED, which proves the connection is alive.
    Step 2: a CREATE through the SAME channel must FAIL, which proves the engine — not this
            process — is what contains generated Cypher.
    """
    try:
        engine.read.run(
            "boot.ro_control", "RETURN 1 AS ok", {}
        )
    except MengerError as exc:
        return _check(
            "a control read succeeds, then a CREATE is refused",
            f"the control read itself failed: {exc.message}",
            False,
        )

    try:
        engine.read.run(
            "boot.ro_write_probe",
            cypher.BOOT_RO_WRITE_PROBE,
            {"ts": "boot"},
        )
    except MengerError as exc:
        # Refused, as required. The engine's own words are carried through so the surface
        # shows WHY it was refused rather than only that it was.
        return _check("CREATE refused by GRAPH.RO_QUERY", f"refused: {exc.message}", True)

    # Reached only if the CREATE SUCCEEDED, which means the read path is not RO_QUERY and
    # AF-8 containment is not in effect. This is the most serious failure in the file: every
    # other check is about a number, this one is about whether generated Cypher is contained.
    return _check(
        "CREATE refused by GRAPH.RO_QUERY",
        "ACCEPTED — the read path is not read-only; AF-8 containment is NOT in effect",
        False,
    )


def _cap_on_non_flow(engine: Engine) -> Dict[str, Any]:
    """B-5 / invariant SCH-2 (section 4.2): no non-:FLOW relationship carries `cap`."""
    rows = engine.read.run(
        "boot.cap_on_non_flow", cypher.READS["boot.cap_on_non_flow"], {}
    )
    offenders = int(rows[0][0]) if rows else -1
    return _check(0, offenders, offenders == 0)


def verify(engine: Engine) -> Dict[str, Any]:
    """Run all six checks and return the CONTRACT.md section 2.8 `boot_checks` block.

    Run LIVE on every /health. It is four reads (two maxFlow, one SPpaths, one control, one
    write-probe, one count — six statements, all tiny), against an engine measured at 11 ms
    warm on a graph 23x the size of this corpus ([VERIFIED section 3 / AF-7]). Caching the
    result would make /health report the state of the graph at process start rather than now,
    which is the opposite of what a status strip is for.
    """
    echo = _max_flow(engine, config.BOOT_ECHO_CLAIM)
    independent = _max_flow(engine, config.BOOT_INDEPENDENT_CLAIM)
    weight, hops = _sp_weight_and_cost(engine, config.BOOT_ECHO_CLAIM)

    checks: Dict[str, Any] = {
        # --- the three the contract names, with the contract's keys ---------
        "node_split_echo": _check(
            config.BOOT_ECHO_EXPECTED, echo, echo == config.BOOT_ECHO_EXPECTED
        ),
        "node_split_independent": _check(
            config.BOOT_INDEPENDENT_EXPECTED,
            independent,
            independent == config.BOOT_INDEPENDENT_EXPECTED,
        ),
        "sp_path_weight": _check(
            config.BOOT_SP_WEIGHT_EXPECTED,
            weight,
            weight is not None
            and abs(weight - config.BOOT_SP_WEIGHT_EXPECTED)
            <= config.BOOT_SP_WEIGHT_TOLERANCE,
        ),
    }

    # --- MENGER's own three, additive to the contract ----------------------
    checks["extra"] = {
        "sp_weight_is_not_hop_count": _check(
            "pathWeight != pathCost",
            f"{weight} vs {hops}",
            weight is not None and abs(weight - float(hops)) > 1e-9,
        ),
        "ro_query_refuses_write": _ro_query_refuses_write(engine),
        "cap_on_non_flow": _cap_on_non_flow(engine),
    }

    failed = [k for k in CONTRACT_CHECK_KEYS if not checks[k]["pass"]]
    failed += [f"extra.{k}" for k, v in checks["extra"].items() if not v["pass"]]
    checks["passed"] = not failed
    checks["failed"] = failed
    return checks


def first_failure_message(checks: Dict[str, Any]) -> str:
    """The message for 503 BOOT_ASSERTION_FAILED, in CONTRACT.md section 2.8's own style:
    'node_split_echo expected 1, got 2 — the node-split is not in effect'.

    One message, naming ONE check, because an operator reading a 503 needs the first thing to
    go and look at. The full block travels in `detail.boot_checks`, so nothing is lost.
    """
    reasons = {
        "node_split_echo": "the node-split is not in effect",
        "node_split_independent": "the node-split is not in effect",
        "sp_path_weight": "the algo.SPpaths weight key regressed (AF-3)",
        "extra.sp_weight_is_not_hop_count": "pathWeight equals the hop count — the "
        "algo.SPpaths weight key is wrong (AF-3)",
        "extra.ro_query_refuses_write": "the read path is not GRAPH.RO_QUERY (AF-8)",
        "extra.cap_on_non_flow": "a non-FLOW relationship carries `cap` (invariant SCH-2)",
    }
    for name in checks.get("failed") or []:
        node = (
            checks["extra"][name.split(".", 1)[1]]
            if name.startswith("extra.")
            else checks[name]
        )
        return (
            f"{name} expected {node['expected']!r}, got {node['actual']!r} — "
            f"{reasons.get(name, 'a boot control did not reproduce')}"
        )
    return "a boot control did not reproduce"


# ===========================================================================
# the corpus census — MEASURED, never asserted
# ===========================================================================

# CONTRACT.md section 2.8 publishes exactly these four keys under `corpus`, and says the
# numbers are "build-determined and the console must read them, never hardcode them". The
# mapping is from node LABEL to the contract's key.
CORPUS_LABELS = {"Agent": "agents", "Source": "sources", "Claim": "claims", "Slot": "slots"}


def corpus(engine: Engine) -> Dict[str, int]:
    """The four contract corpus counts, COUNTED from the graph.

    Not read from config, not taken from app/seed.py's return value, not asserted. The
    numbers in section 6 (40 agents, 150 sources, 60 claims, 20 slots) are the seed's
    INTENTIONS; these are what is actually in the graph. If a seed half-failed, /health shows
    the real figures and the discrepancy is visible rather than reassuring.

    Labels present in the graph but absent from CORPUS_LABELS (SourceIn, SourceOut, Review,
    Receipt, Counter, SuperSource) are deliberately NOT published here: the contract fixes
    `corpus` at four keys and the split-half count is derivable as 2 x sources.
    """
    rows = engine.read.run("corpus.counts", cypher.READS["corpus.counts"], {})
    census = {str(label): int(n) for label, n in rows}
    return {key: census.get(label, 0) for label, key in CORPUS_LABELS.items()}


def seeded_at(engine: Engine) -> Optional[str]:
    """CONTRACT.md section 2.8 `seeded_at` — the instant the corpus was WRITTEN.

    Read off the super-source (section 4.1), not from config.SEED_NOW. config.SEED_NOW is the
    corpus's frozen REFERENCE instant for computing claim ages; `seeded_at` is when the write
    happened. In the seeded corpus they are the same value by construction, and they are
    still two different facts — publishing the config constant would report a seed that never
    completed as having completed.
    """
    rows = engine.read.run(
        "corpus.seeded_at", cypher.READS["corpus.seeded_at"], {"src": config.SS_NID}
    )
    return str(rows[0][0]) if rows else None


# ===========================================================================
# the gate — what makes a failure a 503 instead of a log line
# ===========================================================================

_PASSED_ONCE = False


def gate(engine: Engine) -> None:
    """Raise 503 BOOT_ASSERTION_FAILED unless the boot controls reproduce.

    Every endpoint except GET /health depends on this (section 7.12). /health is exempt
    because /health is how an operator FINDS OUT: a /health that 503'd with a bare error and
    no `boot_checks` block would be a status endpoint that refuses to report status.

    The caching rule, and why it is this way round:
      * Once the checks have passed in this process, they are NOT re-run per request. They
        are a property of the corpus and the engine build, and re-running six statements in
        front of every request would make the gate the slowest thing in the request path.
      * While they are FAILING, they ARE re-run every request. That means re-seeding a broken
        corpus brings the service back WITHOUT a restart, and the first request after the
        re-seed is the one that notices. Caching a failure would be fail-closed in the worst
        way: unrecoverable without an operator action nobody documented.
    """
    global _PASSED_ONCE
    if _PASSED_ONCE:
        return
    checks = verify(engine)
    if not checks["passed"]:
        raise MengerError.boot_assertion_failed(first_failure_message(checks), checks)
    _PASSED_ONCE = True


# ===========================================================================
# CLI — python -m app.bootcheck [--json]
# ===========================================================================

if __name__ == "__main__":
    import json
    import sys

    from app.graph import engine as _engine_factory

    _eng = _engine_factory()
    _checks = verify(_eng)

    if "--json" in sys.argv:
        # PLAN.md §11.2 expected shape:
        # {"passed":true,"checks":{"node_split_echo":{...},...}}
        _output = {
            "passed": _checks["passed"],
            "checks": {
                k: _checks[k]
                for k in CONTRACT_CHECK_KEYS
            },
            "extra": _checks["extra"],
            "failed": _checks.get("failed", []),
        }
        print(json.dumps(_output, indent=2))
    else:
        for k in CONTRACT_CHECK_KEYS:
            node = _checks[k]
            state = "PASS" if node["pass"] else "FAIL"
            print(f"{k:>30}: {state}  expected={node['expected']} actual={node['actual']}")
        for k, node in _checks["extra"].items():
            state = "PASS" if node["pass"] else "FAIL"
            print(f"extra.{k:>25}: {state}  expected={node['expected']} actual={node['actual']}")

    sys.exit(0 if _checks["passed"] else 1)
