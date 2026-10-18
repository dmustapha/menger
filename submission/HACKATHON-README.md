# MENGER

**An admission-control gate on agent memory.**

**Track 02: Agent Memory and Coordination** (sole track).
Source: https://github.com/dmustapha/menger

---

## The problem

Give several agents one shared memory and the first write wins. Agent A writes
`customer:acme | primary_region = eu-west-1`. Agent B, an hour later, writes
`ap-south-1` into the same slot, citing two blog posts. Both are now in memory. Every
downstream agent reads whichever the store happened to keep, and nothing in the system can
say which one had the better basis.

The usual answer is to let the later write win, or to let a human arbitrate later. Both
answers throw away the one thing the store actually knows: where each claim came from.

## What we built

MENGER puts a gate in front of the write. When an agent tries to assert a fact into an
occupied slot, the graph itself answers **ALLOW / BLOCK / UNDECIDED**, and the answer ships
with a replayable receipt naming the verbatim Cypher that produced it.

A refused write is **recorded, never dropped**. `recorded` is always `true`, every verdict
carries a `receipt_id`, and on a BLOCK the incumbent is left byte-identical, `asserted_at`
and all.

## The graph is the computation, not the storage

Two graph algorithms produce the verdict:

- **Source independence** is **Menger's theorem**, evaluated as `algo.maxFlow` over a
  *node-split* provenance DAG. Max vertex-disjoint s-t paths equals the min vertex cut, so
  the flow value *is* the number of genuinely separate origins behind a claim. Two citations
  of the same document count once.
- **Source reliability** is `algo.SPpaths` over `nl = -ln(trust)` edges. Negative-log turns a
  multiplicative trust chain into an additive shortest path.

So **removing the graph algorithms does not degrade the product, it removes the output
entirely.** There is no fallback path that produces a verdict without them. The vendor is
portable; the algorithms are not.

The node split is the load-bearing detail. Unit-capacity max-flow over *edges* counts
edge-disjoint paths, and the claim needs *vertex*-disjoint, so every source is a
`SourceIn`/`SourceOut` pair joined by one `cap:1.0` edge. Remove the split and the echo
chamber silently starts scoring the citation count instead of `1`, with no error anywhere.

## Verify in 60s

One command, from a cold clone, re-derives the headline claim. Nothing is displayed to you
that the engine did not just compute.

```bash
docker run -d --name gh-falkor -p 6379:6379 -p 3000:3000 falkordb/falkordb:v4.22.1
python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
python3 -m app.seed
bash scripts/verify.sh
```

Two rows in the output carry the whole argument:

```
CLM-1      PASS         expected=1 actual=1      # echo chamber scores 1
CLM-2      PASS         expected=2 actual=2      # two vertex-disjoint origins score 2
```

Either number alone proves nothing. `1` without `2` could be a broken query returning
nothing; `2` without `1` could be a naive citation count. The pair is what proves the node
split is doing its work.

21 claim rows re-derive, all PASS or MEASURED. Transcript committed at
[`evidence/claims.txt`](../evidence/claims.txt).

## What makes this different

- **Boot is itself a check.** `GET /health` re-runs assertions T-1..T-4 against the control
  fixtures and returns **503 BOOT_ASSERTION_FAILED** rather than serving a wrong number. One
  of those assertions exists purely to catch a silent engine trap: on FalkorDB v4.22.1,
  `algo.SPpaths` accepts only `weightProp`, and `weightProperty` or `costProperty` return the
  hop count with no error at all. T-3b reproduces the trap on purpose.
- **Receipts replay.** Statement text is never concatenated and never has parameters
  interpolated, so a receipt can be re-executed verbatim. `GET /receipts/{id}` replay reports
  `matches_original: true`.
- **Read-path isolation is server-side.** Every read goes through `GRAPH.RO_QUERY`, which
  refuses writes at the engine, not by client convention.
- **Scores are ordinal, never cardinal.** `score_is_ordinal` is always `true`. There is no
  confidence, probability or percentage anywhere on the scoring surface, and a vocabulary
  grep in the release gate keeps it that way.

## Try it

Complete local setup, the graph data model, and the full HTTP surface are in the repo README:
[Complete local setup](../README.md#complete-local-setup) ·
[The graph data model](../README.md#the-graph-data-model) ·
[Cypher queries and graph algorithms](../README.md#cypher-queries-and-graph-algorithms).

Every statement the engine executes is quoted from source in
[`docs/CYPHER-QUERIES.md`](../docs/CYPHER-QUERIES.md), the separately listed Cypher and
graph-algorithm artifact.

Shortest route to seeing it behave, once set up:

1. `bash scripts/verify.sh`, and watch CLM-1 return `1` and CLM-2 return `2`.
2. `python3 -m uvicorn app.api:app --port 8000 &` then `bash tests/drill.sh`. Nine steps, and
   step 9 refuses a write and leaves the incumbent untouched.
3. `GET /receipts/{id}` on the receipt step 9 printed, and read the Cypher that decided it.

## Demo notes: real, seeded, not built

- **Real:** both graph algorithms, the eight-route HTTP surface, the boot assertions, the
  receipts and their replay, the write gate and its refusal, `GRAPH.RO_QUERY` on every read.
- **Seeded:** the corpus. 586 nodes, 861 relationships, deterministic
  (`SEED_RNG = 20261018`, frozen instant `2026-10-18T14:30:00Z`), synthetic and committed
  in-repo. No private data anywhere.
- **Pinned, not calibrated:** `lambda = 0.0080` per hour is fixed by evidence, not fitted to
  reality. Calibration against real data is **not claimed**.
- **Not built:** the counterfactual replay (`/x/counterfactual` sits behind a dead import
  guard). CI has never executed. `scripts/clean-room.sh` exits `2 INCONCLUSIVE`. No hosted
  deployment, which the rules permit.

Full three-tier breakdown: [`HONESTY-LEDGER.md`](HONESTY-LEDGER.md). The eight deviations
from plan: [`BUILD-REPORT.md`](../BUILD-REPORT.md).

## AI assistance

Built with Claude Code. The disclosure, including what the AI did and what the human decided,
is a required section of the repo README:
[AI-assistance disclosure](../README.md#ai-assistance-disclosure).
