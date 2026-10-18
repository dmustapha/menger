# Honesty Ledger: MENGER

Three tiers: what a command re-derives, what is simplified, and what was never built. The
full per-number table lives in `CLAIMS.md`, and the build's own deviations live in
`BUILD-REPORT.md`.

This document exists because a judge cannot test everything in three minutes, and the only
useful thing a builder can offer in that situation is a precise account of where the line
sits. Knowing exactly what is real is the claim. A submission that cannot draw this line
has not finished checking its own work.

Verified: 2026-10-18, against the live engine on image `falkordb/falkordb:v4.22.1`.

---

## Tier 1: Real

Each row re-derives by running the command. Nothing here is read back out of a document.

| What | Command | Result |
|------|---------|--------|
| Engine is the pinned image | `docker exec gh-falkor redis-cli MODULE LIST` | `graph`, `ver 42201` |
| An echo chamber scores independence `1` | `bash tests/boot_drill.sh` (T-1) | `node_split_echo 1 == 1` |
| Two vertex-disjoint origins score `2` | `bash tests/boot_drill.sh` (T-2) | `node_split_independent 2 == 2` |
| Reliability is a weighted path, not a hop count | `bash tests/boot_drill.sh` (T-3) | `sp_path_weight 0.21072 == 0.21072`, and `0.21072` against hop count `5` |
| The read path refuses writes server-side | `bash tests/boot_drill.sh` (T-4) | `graph.RO_QUERY is to be executed only on read-only queries` |
| No `cap` property leaks onto a non-flow edge | `bash tests/boot_drill.sh` | `cap_on_non_flow 0` |
| All 8 contract routes are live | `curl -s http://127.0.0.1:8000/openapi.json` | `POST /remember`, `GET /slots`, `GET /slots/{key}/graph`, `GET /slots/{key}`, `GET /receipts/{id}`, `POST /receipts/{id}/replay`, `GET /review`, `GET /health` |
| Health is green and publishes its constants | `curl -s http://127.0.0.1:8000/health` | `ok: true`, `epsilon 0.05`, `lambda 0.008` |
| Nine-step end-to-end drill | `bash tests/drill.sh` | 9 steps OK |
| A losing write is refused, recorded, and leaves the incumbent untouched | `bash tests/drill.sh` step 9 | `verdict BLOCK`, `status REFUSED`, `recorded true`, `receipt_id` non-null, incumbent byte-identical before and after |
| Scoring math, no engine required | `bash tests/unit/arbiter_math.test.sh` | 14/14 |
| Every published number | `bash scripts/verify-claims.sh all` | all PASS |
| Corpus size | the seed report plus `/health` | 40 agents, 150 sources, 65 claims, 21 slots |
| One relationship type carrying `kind` | `MATCH ()-[r:DERIVED_FROM]->() RETURN count(r)` | `0` |
| Unit capacity on every flow edge | `MATCH ()-[f:FLOW]->() WHERE f.cap <> 1.0 RETURN count(f)` | `0` |
| `algo.dijkstra` and `algo.SCC` are absent | `CALL dbms.procedures()` filtered on `algo.` | 11 procedures, neither of those two |

---

## Tier 2: Simplified

Real, running, and deliberately narrower than it could sound.

- **The corpus is synthetic.** 574 nodes, 40 agents, 150 sources, 65 claims, 21 slots,
  hand-crafted to exercise three set-pieces and two boot controls. It is committed
  in-repo, contains no private data, and is not claimed to be representative of anything.
- **Scores are ordinal, never cardinal.** Independence, reliability, and the composite
  score rank candidate writes against each other. They are not probabilities, not
  confidence values, and not percentages. The scoring surface is grep-checked clean of
  that vocabulary. A score of `2` means more independent than a score of `1`, and nothing
  more than that.
- **Concurrency is single-writer.** Admission control is evaluated and the write applied
  without a distributed lock or a transactional read-modify-write across competing
  writers. The drill exercises sequential writes. Two agents racing the same slot in the
  same millisecond is untested.
- **Epsilon and lambda are unmeasured server constants.** Epsilon `0.05`, lambda
  `0.008`/hour (86.6 hour half-life). Their values are pinned by evidence: lambda was
  settled by arithmetic when three project documents disagreed, because a published
  recency output pins the constant that produced it. Their *calibration against reality*
  is not claimed. They are defaults chosen to make the three verdict states reachable,
  and the standing rule is to re-seed the trusts rather than re-tune lambda, because
  tuning a published constant to make a demo read better is the one thing this project
  must never do. Read both from `GET /health`, never from a document.
- **`GRAPH.COPY` latency is bounded, not benchmarked.** Roughly 20 ms to 83 ms,
  load-sensitive, n=3 per run, one graph size, `docker exec` overhead subtracted rather
  than isolated. Both runs are recorded, including the slower one, because quoting the
  20 ms figure alone would be selecting the measurement that flatters.
- **One read-latency figure is carried, not re-derived.** 41 ms cold / 11 ms warm, measured
  in an earlier session on a graph roughly 23 times this corpus. That graph is not in this
  repo, so no command here reproduces the number. It is logged as `UNVERIFIABLE` in
  `CLAIMS.md` rather than quietly promoted.

---

## Tier 3: Not built

- **The counterfactual feature (P3) does not exist.** It was scoped as a stretch, gated
  behind a go/no-go, and the gate never opened. `app/counterfactual.py` is absent, and the
  `/x/counterfactual` route in `app/api.py` is behind an import guard that does not
  resolve, so the route is not served. Nothing in this submission depends on it and
  nothing claims it works.
- **CI has never executed.** `.github/workflows/ci.yml` is scaffolded. Scaffolded is not
  green. There was no remote and no commit at the time the engine was built, so Actions
  cannot have run even once.
- **The clean-room proof is INCONCLUSIVE, not passing.** `scripts/clean-room.sh` ships and
  exits `2 INCONCLUSIVE`. The tree had zero commits when it ran, so there was no ref to
  clone. That exit code was chosen deliberately over a `1 FAIL`: a clean-room run that
  reports FAIL because there is nothing to clone is lying about what it measured. The
  cold-clone proof is owed and has not been collected.
- **No live deployment.** Local setup only, which the rules permit as the alternative to a
  deployment URL.
- **No demo video in the repo** as of this writing. See `submission/SUBMISSION-GUIDE.md`.
- **No throughput, requests-per-second, or p99.** Never measured.
- **No accuracy, precision, recall, or F1.** MENGER decides admissibility, not correctness.
  There is no ground-truth labelling against which an accuracy number would mean anything.
- **No comparison against any other system.** None was run.
- **No behaviour at scale.** Every number here comes from a 574-node graph.

---

## Known deviations from the plan

Eight, written up in full in `BUILD-REPORT.md` as DEV-001 through DEV-008. Four of them
were silent failures: nothing raised, nothing crashed, the output was simply wrong or
empty. The two worth reading are DEV-005 (a receipt replay check that compared mismatched
key sets, so `matches_original` could never be `true`, which is worse than no check at all
because the receipt reports it as a finding) and DEV-006 (macOS bash 3.2 brace-expanding a
Cypher config map inside nested command substitution, so a boot assertion silently
received a different statement than the one written).
