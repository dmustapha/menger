# MENGER

**Track 02: Agent Memory and Coordination** (sole track)

MENGER is an admission-control gate on agent memory. When an agent tries to write a fact into a shared FalkorDB graph, the graph answers ALLOW, BLOCK, or UNDECIDED, and every verdict ships with a replayable receipt.

## Run the proof first

Four commands, no credentials, no cloud account. Full setup is in the README.

- **`bash tests/boot_drill.sh`**: refuses to let the engine start unless the graph still behaves. It asserts an echo chamber scores independence `1`, two vertex-disjoint origins score `2`, the weighted path totals `0.21072` (not the hop count `5`), and the read path refuses a `CREATE` server-side.
- **`bash tests/drill.sh`**: nine steps against the live API. Step 9 is the headline: a losing write into an occupied slot comes back `verdict BLOCK`, `status REFUSED`, `recorded true`, with a non-null `receipt_id`, and the drill then re-reads the slot and proves the incumbent is byte-identical across the attempted write.
- **`bash scripts/verify-claims.sh all`**: re-derives every number in `CLAIMS.md` from the running engine. Nothing is read back out of a document.
- **`bash tests/unit/arbiter_math.test.sh`**: 14 cases on the scoring band, no engine needed.

## The mechanism

- **Source independence is Menger's theorem:** `algo.maxFlow` over a node-split provenance DAG with unit-capacity edges. Max-flow over unit capacities counts edge-disjoint paths, and the claim needs vertex-disjoint paths, so every source is stored as a `SourceIn`/`SourceOut` pair. That split is what stops ten citations funnelling through one origin from looking like ten independent witnesses. The `1`-versus-`2` boot pair is the only evidence the split does its job, and either number alone proves nothing.
- **Source reliability is a weighted shortest path:** `algo.SPpaths` over `nl = -ln(trust)`, so multiplying trust along a chain becomes adding weights, and reliability is `exp(-pathWeight)`. Only the `weightProp` key works on this engine; `weightProperty` silently returns the hop count with no error raised, which is why the boot control expects a deliberately non-integer `0.21072`.
- **The verdict:** corroboration depth times recency decay times source trust, compared against the incumbent occupying the slot. A margin inside epsilon lands UNDECIDED with an open review handle, not a coin flip. Epsilon `0.05` and lambda `0.008`/hour are server constants published by `GET /health`, never read from a document.
- **Every verdict is replayable:** the DOCKET stores the verbatim executed Cypher plus its numbers. `POST /receipts/{id}/replay` re-runs the stored statement and reports `matches_original`, with recency decay named as the expected source of divergence.
- **Refusals are recorded:** a BLOCK is a first-class memory event with a receipt, not a silently dropped write.

## Why the graph is load-bearing

The rules say that if the product still works once FalkorDB is taken out, the graph is decoration. Here the verdict is a graph computation: removing the GRAPH ALGORITHMS does not degrade the product, it removes the output entirely. There is no independence score without `algo.maxFlow` over the node split, and no reliability score without `algo.SPpaths` over `-ln(trust)`. Strip those two calls and nothing is left to return. `app/cypher.py` holds every statement in the system as a single parameterised Cypher query per read, and the read path is `GRAPH.RO_QUERY`, which the server itself refuses to let write.

## Track fit

Track 02 asks for shared memory and coordination. Multi-agent memory fails in a specific way: two agents write contradicting facts into the same slot and the last writer wins. MENGER puts a gate in front of the write and makes the graph arbitrate, so the coordination rule lives in the data rather than in whichever agent ran last. 40 agents, 150 sources, 65 claims, and 21 slots are seeded as synthetic corpus, committed in-repo.

## What is honest about this

`submission/HONESTY-LEDGER.md` separates what a command re-derives from what is simplified and what was not built. The counterfactual feature was scope-gated and never written. The clean-room script exits `2 INCONCLUSIVE`. CI has never executed. Scores are ordinal rankings, never cardinal probabilities. The eight build deviations are written up in `BUILD-REPORT.md` with the silent failure behind each one.

Stack and sponsor detail: `submission/copy/tech-stack.md`, `submission/sponsor-tracks.md`.
