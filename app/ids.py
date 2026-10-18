# app/ids.py
"""Monotonic, human-readable id allocation.

Every id MENGER mints is `<prefix><4-digit counter>`: clm_0061, rev_0001, rcpt_0001. The
counter lives in the graph as (:Counter {name, value}) so that ids survive a process restart
and are sequential in the order decisions were actually made — which matters because a judge
reading a receipt list should see a story, not UUIDs.

One statement per id (app/cypher.py WRITES['counter.next']), which does the read and the
increment as a single engine operation:

    MERGE (ct:Counter {name:$name})
    ON CREATE SET ct.value = 1
    ON MATCH  SET ct.value = ct.value + 1
    RETURN ct.value AS value

[ASSUMED] that this is ATOMIC under concurrency. FalkorDB executes a query against a graph
key as a unit, but NO probe in ARCHITECTURE.md section 3 tested two concurrent allocations,
so the claim is not [VERIFIED]. Recorded as LIM-4 (section 15.4). Why it is an acceptable
risk at this deadline, stated rather than glossed:
  * the demo has exactly one submitter, so the race is not reachable;
  * if it were reachable, the failure is two claims minted with the same id, and
    `claim.create` would then CREATE a second :Claim with a duplicate `id` — there is no
    unique constraint (LIM-3), so the two would coexist and `claim.sources` would return the
    union. Section 14.6 traces that failure end to end.
This is the single place in MENGER where concurrency matters, and it is 20 lines long on
purpose: if it has to be replaced with a Redis INCR, this is the only file that changes.
"""
from app.graph import Engine

# The three counters of section 4.1, and the id prefix each one mints.
PREFIXES = {
    "claim": "clm_",
    "review": "rev_",
    "receipt": "rcpt_",
}


def next_id(engine: Engine, counter: str) -> str:
    """Allocate and return the next id for `counter`.

    Raises RuntimeError — not a MengerError — for an unknown counter name, because that is a
    programming error, not a client error: there is no request a caller can send that reaches
    this with a bad name.
    """
    if counter not in PREFIXES:
        raise RuntimeError(
            f"ids.next_id: {counter!r} is not a counter. Known: {sorted(PREFIXES)}"
        )
    rows = engine.write.run("counter.next", {"name": counter})
    if not rows or rows[0][0] is None:
        # counter.next always RETURNs a value on both MERGE branches, so an empty result set
        # means the engine did not execute what we think it executed. Fail loudly rather than
        # mint id "0000" and corrupt the sequence.
        raise RuntimeError(
            f"ids.next_id: counter.next returned no value for {counter!r}; "
            "the id sequence cannot be trusted"
        )
    return f"{PREFIXES[counter]}{int(rows[0][0]):04d}"
