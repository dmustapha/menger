# Tech Stack: MENGER

`Primary:` Python 3 + FastAPI (the admission-control engine, 8 contract routes, ~3,750 lines across `app/*.py`), Cypher (every read is a single parameterised query in `app/cypher.py`)

`Secondary:` Next.js console (operator view over slots, verdicts, and receipts), Docker (pinned engine container), bash (the drills and the claim verifier, so a judge needs no toolchain beyond Docker and Python)

`Sponsor:` FalkorDB `v4.22.1`, pinned by image digest tag `falkordb/falkordb:v4.22.1` (graph module `ver 42201`, confirmed live by `MODULE LIST`). Graph `menger`. Algorithms: `algo.maxFlow` for source independence over a node-split provenance DAG, `algo.SPpaths` with `weightProp` for source reliability over `-ln(trust)` edges. Read path `GRAPH.RO_QUERY`, which refuses writes server-side.

## Pin rationale

`:latest` resolves to `v4.22.1` on this registry despite the 6.0 release notes, and `algo.AStar` exists only on 4.x, so the tag is written out rather than inferred. The version is asserted at boot, not assumed.

## Deliberately absent

No LLM in the decision path. The verdict is arithmetic over graph algorithm output, which is why it replays. No key material, no signing, no on-chain component.
