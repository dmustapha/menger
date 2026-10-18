# Sponsor Track: MENGER

## Track 02: Agent Memory and Coordination

One track, declared sole. MENGER is not entered in Track 01 or Track 03.

### What we use

FalkorDB `v4.22.1`, pinned, running as container `gh-falkor` on image
`falkordb/falkordb:v4.22.1` (graph module `ver 42201`). Graph name `menger`. Two graph
algorithms carry the product:

- `algo.maxFlow` with `capacityProperty:'cap'` and `relationshipTypes:['FLOW']`, for source
  independence over a node-split provenance DAG.
- `algo.SPpaths` with `weightProp:'nl'`, for source reliability over `-ln(trust)` edges.

Every read goes through `GRAPH.RO_QUERY`. Every statement is a single parameterised Cypher
query, held in one registry. FalkorDB has no procedure-storage mechanism, and none is implied anywhere in this bundle.

### Where in the code

| What | Path | Line |
|------|------|------|
| The independence statement (`algo.maxFlow`) | `app/cypher.py` | 45 to 52 |
| The reliability statement (`algo.SPpaths`) | `app/cypher.py` | 75 to 78 |
| Why only one `relationshipTypes` entry is allowed | `app/cypher.py` | 6 |
| The silent-wrong-key hazard, written down next to the query | `app/cypher.py` | 63 to 64 |
| `independence()` calls max-flow and casts the float | `app/arbiter.py` | 72 to 94 |
| `reliability()` calls SPpaths and handles the zero-row case | `app/arbiter.py` | 104 to 121 |
| Flow decomposition into witness nodes | `app/arbiter.py` | 154 |
| Read channel, `GRAPH.RO_QUERY` only | `app/graph.py` | 65 to 96 |
| Boot control T-1 and T-2 (max-flow `1` and `2`) | `app/bootcheck.py` | 57, 154 |
| Boot control T-3 (weighted path `0.21072`) | `app/bootcheck.py` | 75, 162 |
| Boot control T-4 (read path refuses a write) | `app/bootcheck.py` | 91 |
| Fail-closed gate in front of every route | `app/bootcheck.py` | 267 |
| Receipt persistence and replay of verbatim Cypher | `app/docket.py` | 49, 150 |
| Seed that builds the node split | `app/seed.py` | whole file, 606 lines |

### What it does

An agent calls `POST /remember` with a fact for a slot. The engine computes, in the graph:

1. **Independence.** `algo.maxFlow` from a shared `SuperSource` to the claim over
   unit-capacity `:FLOW` edges. Because max-flow over unit capacities counts
   edge-disjoint paths and the measure needs vertex-disjoint paths, every source is
   stored as a `SourceIn`/`SourceOut` pair and no edge bypasses the split. An echo
   chamber of several citations funnelling through one origin therefore scores `1`, not
   the citation count. Two genuinely separate origins score `2`.
2. **Reliability.** `algo.SPpaths` over `nl = -ln(trust)`, which turns a product of
   trusts along a chain into a sum of weights. Reliability is `exp(-pathWeight)`.
3. **The verdict.** Corroboration depth, recency decay (lambda `0.008`/hour), and source
   trust are combined and compared against the claim currently holding the slot. Outside
   the epsilon band the write is ALLOWED or the incumbent holds and the write is REFUSED.
   Inside the band the verdict is UNDECIDED and a review row opens.
4. **The receipt.** The verbatim executed Cypher and its numbers are stored.
   `POST /receipts/{id}/replay` re-runs the stored statement and reports
   `matches_original`.

### Proof of integration

Every line below is a command a judge runs.

| Proof | Command | Result |
|-------|---------|--------|
| Pin is real | `docker exec gh-falkor redis-cli MODULE LIST` | `graph`, `ver 42201` |
| Node split converts edge-disjoint into vertex-disjoint | `bash tests/boot_drill.sh` | `node_split_echo 1 == 1`, `node_split_independent 2 == 2` |
| Weight is a weight, not a hop count | same drill | `sp_path_weight 0.21072 == 0.21072`, and `sp_weight_is_not_hop_count` shows `0.21072` against `5` |
| Misspelling the weight key fails silently | the T-3 statement with `weightProperty` instead of `weightProp` | returns `5`, equal to `pathCost`, no error raised |
| The read path is a server refusal, not a client convention | `GRAPH.RO_QUERY menger "CREATE (:BootProbe {x:1})"` | `graph.RO_QUERY is to be executed only on read-only queries` |
| Unit capacity holds everywhere | `MATCH ()-[f:FLOW]->() WHERE f.cap <> 1.0 RETURN count(f)` | `0` |
| One relationship type, carrying `kind` | `MATCH ()-[r:DERIVED_FROM]->() RETURN count(r)` | `0`, and `DISTINCT f.kind` returns `ORIGIN, SPLIT, CITED, DERIVED` |
| A refusal is real and recorded | `bash tests/drill.sh` step 9 | `verdict BLOCK`, `status REFUSED`, `recorded true`, `receipt_id` non-null, incumbent byte-identical before and after |
| Every published number re-derives | `bash scripts/verify-claims.sh all` | all PASS, evidence written to `evidence/claims.txt` |
| Scoring math holds with no engine | `bash tests/unit/arbiter_math.test.sh` | 14/14 |

### Integration depth

The rules name the disqualifier directly: if the product still works once FalkorDB is
taken out, the graph is decoration rather than the thing the product runs on. Answering
that head-on: **removing the GRAPH ALGORITHMS does not degrade the product, it removes the
output entirely.**

There is no fallback path. The verdict has exactly two inputs that are not arithmetic on a
timestamp, and both are graph algorithm outputs. Delete the `algo.maxFlow` call and
independence has no value, so corroboration depth is undefined and no verdict exists.
Delete the `algo.SPpaths` call and reliability has no value, with the same consequence.
There is no cached score, no heuristic substitute, and no relational mirror of the
provenance DAG to fall back on. The graph is not storage that happens to be a graph: the
node split exists purely so that a max-flow computation means vertex-disjointness, which
is a modelling decision made for the algorithm's sake and for nothing else.

The vendor is portable, and that is stated rather than hidden. Another engine exposing
max-flow and weighted shortest paths over labelled relationships could run the same model.
The algorithms are what cannot be removed. FalkorDB is where they actually exist at
`v4.22.1`, with the precise behaviours this engine depends on: `algo.maxFlow` accepting
exactly one relationship type, `weightProp` being the only key `algo.SPpaths` honours, and
`GRAPH.RO_QUERY` refusing writes server-side.

### Honest note

- `algo.dijkstra` and `algo.SCC` do not exist on this engine. The mechanism uses what is
  actually there, verified live by `CALL dbms.procedures()`, not what the documentation
  implies.
- The corpus is synthetic: 40 agents, 150 sources, 65 claims, 21 slots, 574 nodes,
  hand-crafted to exercise three set-pieces and two boot controls. No claim is made that
  it is representative, and no behaviour at scale is claimed.
- Epsilon `0.05` and lambda `0.008`/hour are server constants published by `GET /health`.
  Their values are pinned by evidence. Their calibration against reality is not claimed.
- `GRAPH.COPY` of this corpus measured between roughly 20 ms and 83 ms, load-sensitive,
  n=3. That is a bounded measurement, not a benchmark, and it exists only so one scope
  decision was made against a real number.
