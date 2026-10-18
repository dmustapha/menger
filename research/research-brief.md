# Research Brief — Graph Hacks (WeMakeDevs × FalkorDB)

**Produced by** hackathon-intel v3.1 · Intel Depth ID 9 (Deep Intelligence) · run_profile **SPRINT**
**Written** 2026-10-18 12:20 WAT · **Deadline** 2026-10-18 23:59 IST = **19:29 WAT** (~7h to go)
**Sources consulted** 58 · All findings carry NATO Admiralty tags.

---

## 0. THE ONE-PARAGRAPH VERSION

Graph Hacks is a **single-sponsor, sponsor-judged** edition. There is **no live demo and no call — judges score the submitted artifacts and nothing else** [B2], and the panel is almost certainly FalkorDB's own engineers, who published the agent-memory thesis on **day 2 of the hackathon** and the graph-pathfinding engineering post **six days before the deadline**. The KICKOFF's recommended direction — an agent that writes experience into a graph and does multi-hop retrieval — is **`pip install graphiti-core[falkordb]`**, documented first-party by the sponsor. A roster audit of **384 repos** created on/after 2026-10-14 found **Track 02 is the thinnest track (17 sole-commit vs 71 for Track 01)** — but a named-competitor sweep then found that **shared multi-agent memory is itself table stakes inside Track 02**, with ≥8 entries doing exactly that. The only unoccupied ground left is **the arbitration function**: autonomously naming a winner between two uncorrected rival assertions via a composite of corroboration-depth × recency × source-trust, **computed in Cypher**. Every competitor and every framework either preserves both claims, picks the newer one, or escalates to a human.

---

## 1. HARD CONSTRAINTS (disqualifiers — Rules §§2,3,5,6,8,10,11,12,13)

| # | Rule | Operational consequence |
|---|---|---|
| 1 | **FalkorDB must be load-bearing** — *"if the product still works once FalkorDB is taken out, the graph is decoration rather than the thing the product runs on"* [A1] | Need a one-sentence decoration answer in the README. |
| 2 | **Graph must not merely visualize** — *"The graph must perform essential functions, not merely visualize data"* [A1] | The bundled Browser UI (:3000) is **explicitly non-load-bearing**. B-roll only. |
| 3 | **Fresh code only** — main coding/design work must begin after 2026-10-15 [A1] | **Do NOT port LEASH / 0g-fleet code.** Public libs/frameworks/datasets fine. |
| 4 | **No private data** — no login-protected, paywalled, personal or restricted data in the graph [A1] | Synthetic data + a **seed script committed to the repo**. |
| 5 | **Disclose AI assistance**; fully AI-generated work with no real understanding may be rejected [A1] | Disclosure section in README. |
| 6 | **Must be able to explain** model, queries, architecture [A1] | The README *is* the explanation — there is no call to recover in. |
| 7 | **Multi-track allowed, every track entered must be named at submission** (§5) [A1] | Free expected-value upside. |

### Submission checklist (all mandatory, Rules §10)
- [ ] Public source-code repository URL
- [ ] README with setup instructions **and the graph data model**
- [ ] **The Cypher queries / graph algorithms the product depends on, as a separately-listed artifact**
- [ ] Demo video (no max published for this edition; **180s** inferred from Kunal Kushwaha's First Commit guidance [B2])
- [ ] Live deployment URL (*preferred*) or complete local setup instructions
- [ ] Track designation(s)
- [ ] AI-assistance disclosure

---

## 2. JUDGING — WHO SCORES, AND HOW

**Process:** *"Judges score what you submit and nothing else. There is no live demo and no call."* [B2 — house process across sibling editions]
→ **The README + demo video + form prose ARE the product.** Nothing is recoverable live.

**Rubric:** Graph Hacks publishes **none**; `/judges` is a hard 404 [A1 negative]. The six criteria below are the WeMakeDevs house template, **verbatim-identical** across *Agents of SigNoz*, *The Hangover Part AI* (Cognee) and *2 Fast 2 MCP* (Archestra), with slot 4 swapped to the sponsor name [B2]. Only *TrueForge* states weighting — *"6 equally weighted"* [B2]. **Treat as [D4] applied here.**

| Criterion | Weight (derived) |
|---|---|
| Potential Impact | 16.7% |
| Creativity & Innovation | 16.7% |
| Technical Excellence | 16.7% |
| **Best Use of FalkorDB** | 16.7% |
| User Experience | 16.7% |
| Presentation Quality | 16.7% |

**Likely panel** (inferred [D4]; roles [A1]):

| Person | Role | What they demonstrably care about |
|---|---|---|
| **Guy Korland** | CEO, co-founder | Authored *"Your Agent's Memory Problem Is a Retrieval Architecture Problem"* (2026-08-15) |
| **Roi Lipman** | CTO, co-founder (RedisGraph lineage) | Byline on *"Shortest path at any distance: Dijkstra, A*, and CCH"* (**2026-10-12 — 6 days pre-deadline**) |
| **Avi Avni** | Chief Architect | Engine internals; FalkorDB 6.0 Rust rewrite |
| **Liz Zhang** | FalkorDB | Authored the agent-memory post that landed **on day 2 of the hackathon** (2026-10-16) |
| **Kunal Kushwaha** | Founder, WeMakeDevs | *"a small problem solved well beats a big one solved vaguely"*; *"clean and obvious beats clever and confusing"*; *"Write detailed answers. Short one-liners make it hard for us to see what you built."* [B2] |

**Reading:** this panel wrote the thesis we are building against. They will recognise a Graphiti reimplementation instantly, and they reward **real algorithm usage and latency numbers**. `algo.dijkstra` / `algo.SPpaths` / `algo.pageRank` in the critical path is the highest-signal sponsor alignment available, because the CTO personally shipped that post this week.

---

## 3. COMPETITIVE LANDSCAPE

### 3.1 Track crowding (roster audit — 384 repos created ≥ 2026-10-14 mentioning FalkorDB; 267 with explicit hackathon markers) [A1]

| Track | Sole-track repos | Density |
|---|---:|---|
| 01 — Agents That Act on Connected Data | **71** | **HIGH (red ocean)** |
| 03 — Company Brain | **33** | **HIGH** |
| 02 — Agent Memory and Coordination | **17** | **MEDIUM** |

Only **18 of 267** repos have **both** a live deploy and a demo video. **Finishing the submission checklist is itself a differentiator.**

> **KICKOFF §3 was wrong.** It inferred Company Brain was most crowded. Track 01 is, by 2.2×. KICKOFF §4's conclusion (favour agent memory) survives — but for a different, now-evidenced reason, reinforced by Track 02's description being lifted verbatim from Korland's/Zhang's published memory-stack taxonomy. **Track 02 is simultaneously the thinnest track and the sponsor's home turf.**

### 3.2 Named competitors (15 profiled in depth from a ~100-repo sweep) [B2]

| Repo | What it does | Track | Model in README | State | Commits |
|---|---|---|---|---|---:|
| **HamzaShaikh-source/Quorum-falkordb** | *"Git revert for AI agent beliefs."* Correction quarantines a wrong fact + everything derived. 28 MCP tools, 660+ tests, **corroboration_eval benchmark** | 02 | Yes | **Best-executed entry in the entire set** — CI, releases, a11y, load tests | 59+ |
| **sushanshetty1/airspace** | *"Air-traffic control for parallel coding agents"* over a FalkorDB code graph; MCP server; 17/18 green merges | 01/02 | Partial | Heaviest build; polished branding | 100+ |
| **MOHITPRADHAN35/agentmesh** | *"Multi-Agent Persistent Memory & Contradiction Engine."* Literal `[:CONTRADICTS]`, `[:SUPPORTS]`, `(:Conflict)` node, `(:Agent)-[:CREATED]->(:Memory)` | 02+03 | **Yes, full schema** | Mid; video placeholder; 2 days stale | 11 |
| **Tejas-Sands/undograph** | Repairs agent context + pending work after an operator corrects a source | 02 | Partial | Live demo deployed | 43 |
| **BishtNikhil/falkordb-memory-mesh** | *"Universal Memory Mesh"* — CoW sandboxes, Graph-PACC compaction | 02+01+03 | Yes | Finished: live demo, video, DEV.to + Medium | 32 |
| **sanskar21gusain/tether** | Dataflow governance: allow/block/reroute with graph-path evidence | 02-adj | Yes | Early (created 10-18) | 19 |
| **wakebecoming/tollbooth-graph** | Two agents, one shared memory; claims/sources/reviews as provenance edges; "integrity query" | 02+03 | Yes (schema.cypher) | Modest but coherent | 17 |
| **Aryan7098/codemem** | Shared memory for coding agents; beliefs anchored to AST symbols + test runs | 02 | Yes | Mid; video placeholder | 15 |
| **HalaNaaz/ContinuumAI** | Persistent memory + multi-agent handoffs, workspace isolation | 02 | Yes | Self-declared "Under Active Development"; **likely abandoned** | 14 |
| **lurui1997/rationale-guard** | Shows which past decision a diff breaks | 02 | Partial | Live on Railway | 12 |
| **shobanravichandran/ninaivu** | 3 agents + curator coordinating **only** via graph; `Fact` validity windows + `SUPERSEDES` | **02 explicit** | **Yes + Track-02 mapping table** | Live demo, load-tested | 9 |
| **Nassami1/graph-hacks** | Coordinator + 2 workers on one shared graph; `DEPENDS_ON` scheduler | all 3 | Yes | Working demo, real-time UI | 9 |
| **tejas-raskar/premise** | Records *why* a decision was made; flags stale premises | 02 | Partial | Thin; stale since 10-15 | 6 |
| **Nithin-Bhargav-07/memory-relay** | 8-dimension policy engine (authorization, freshness, provenance, conflict) gating memory admission | **02 explicit** | Yes | **README far ahead of code** | 3 |
| **alisk-pixel/graph-brain** | 3 detective agents, shared Task/Thought/Finding + HANDOFF | all 3 | Yes | **Abandoned stub** | 2 |

**Unlocated residual:** DEV.to post *"MANDATE — Multi-Agent Epistemic Memory, Invalidation & Guarded Remediation"* (amanm006, Oct 17) and *Pheromone* (karan kartikeya). `gh search repos` returned `[]` for both. **MANDATE is the most threatening name on the board and its code was never found.** [C3/D4 — open gap]

### 3.3 KILL LIST — what is already taken

| Idea | Status | Evidence |
|---|---|---|
| **Agent writes experience to a graph + multi-hop retrieval** | ☠️ **DEAD — it is a pip install** | `pip install graphiti-core[falkordb]`; sponsor publishes first-party docs for Graphiti, Cognee, Mem0 and a Graphiti MCP server [A1] |
| **Shared multi-agent memory in ONE FalkorDB graph** | ☠️ **DEAD — table stakes** | ≥8 hackathon entries state it verbatim in the repo description (ninaivu, tollbooth-graph, Nassami1, memory-relay, codemem, agentmesh, memory-mesh, graph-brain) [B2] |
| **FalkorDB MCP server integration** | ☠️ **DEAD — 41% of scanned repos** | roster scan of 267 repos [A1] |
| **Graph visualisation as the product** | ☠️ **DEAD + DISQUALIFYING** | Rules §§2/3 [A1] |
| **Contradiction *detection* / `[:CONTRADICTS]` edges** | ⚠️ **OCCUPIED at the detect-and-flag level** | agentmesh owns this vocabulary exactly — but it *preserves both facts* rather than arbitrating [B2] |
| **Temporal supersession ("newer wins")** | ⚠️ **OCCUPIED** | ninaivu `SUPERSEDES` + validity windows; Graphiti/Zep `invalid_at`/`expired_at` is purely bi-temporal [B2] |
| **Provenance-chain trust scoring** | ⚠️ **ONE SERIOUS OCCUPANT — Quorum** | Quorum's `corroboration_eval`: *"Corroboration requires a different asserter, no shared lineage, a different source and host, and different wording"*; uses `shortestPath()` in FalkorDB [B2] |
| **Human-in-the-loop conflict escalation** | ⚠️ Occupied | Trust-Aware Multi-Agent Traceability (arXiv 2606.17203) routes conflicts to human review [B2] |

### 3.4 THE REMAINING WEDGE

> **Autonomous arbitration.** A composite score over **corroboration-depth × recency × source-trust** that **names a winner** between two *uncorrected* rival assertions, **computed in Cypher** rather than in application code.

Why it survives the kill list:
- **agentmesh** detects and *preserves both* — no arbitration function, no corroboration count, no recency decay, no source-trust weighting.
- **ninaivu / Graphiti / Zep / TOKI** resolve by **recency only** (bi-temporal).
- **Mem0** open-source v3 is ADD-only; contradictions accumulate and are resolved **at read time by the reader LLM**, not in the store.
- **Cognee** ships contradiction detection + supersession, resolved by LLM judgement.
- **Quorum** — the closest — propagates truth **supplied externally by a human correction** down a lineage; it has no scoring that picks a winner between two uncorrected rivals, and it states its ranking blend lives **in the API process, not in Cypher**.
- **MAP-Graph** (arXiv 2608.10509) does multiplicative path-trust over ancestry but on an *execution-lineage* graph, and the paper states it *"does not perform open-domain contradiction resolution."*

**Two standing warnings:**
1. **agentmesh owns the vocabulary.** Differentiate on *arbitration vs detection* explicitly, in the first line of the README, or a skimming judge reads a duplicate.
2. **Quorum will out-polish us on execution** regardless of wedge (59+ commits, 660+ tests, CI, benchmarks, a11y). **Lead with the arbitration demo it structurally cannot show.**

---

## 4. CAPABILITY MAP — FalkorDB (15 primitives)

**Engine version verified live:** `v4.22.1` (graph module ver **42201**) via `MODULE LIST` against `falkordb/falkordb:latest`, 2026-10-18.
Full machine-readable map with all four columns per primitive: `intel-state.json → capability_map.primitives[]`. Re-proven clean by `utils/intel-capability-map-gate.sh` (exit 1 = clean).

### 4.1 Load-bearing candidates

| Primitive | Can | Can't | Load-bearing for |
|---|---|---|---|
| **Variable-length traversal** `-[:R*1..3]->` | named paths, `shortestPath()`, pattern predicates | **bound cannot be a parameter** — `*1..$d` → *"Encountered unhandled type in inlined properties"*; forces string interpolation (injection surface) | **THE core retrieval path.** What a flat vector store structurally cannot do — the honest answer to the decoration test |
| **11 algorithms** (complete set probed live) | `BFS, SPpaths, SSpaths, WCC, SCC, pageRank, betweenness, labelPropagation, AStar, dijkstra, maxFlow` | **no Louvain/Leiden, no triangle count, no node2vec**; `labelPropagation` non-deterministic; `maxFlow` `capacityProperty` doc-bug | **Judge-visible "real graph work."** Lipman shipped the pathfinding post 6 days ago — highest-signal alignment available |
| **Multi-graph** `select_graph` + `GRAPH.COPY` | many named graphs; server-side clone (snapshot/rollback demos) | **NO cross-graph queries** — one statement cannot touch two graphs | Multi-agent topology. **This limit is what makes shared memory a real design problem** |
| **`GRAPH.RO_QUERY`** | server-side rejection of any write | **Python client only** — TS has no binding (#408) | Safety boundary for LLM-authored Cypher. Without it, generated Cypher can DELETE the memory graph |
| **Constraints** (unique/mandatory) | exact-match-index-backed | **no Cypher DDL**; creation is **async, returns PENDING** — must poll or writes race it | Entity-resolution integrity: one canonical node per real entity |
| **Flex UDFs** | `levenshtein()`, `jaroWinkler()` in Cypher | thin, undocumented, no fuzzy index — per-row at query time | Dedup/entity resolution without an extra LLM call |

### 4.2 Use with care

| Primitive | The trap |
|---|---|
| **Vector index (HNSW)** | Combines poorly with property filters. **#2233: a plain Python list silently bypasses the index** — no error, full scan. **#2848: concurrent KNN returns duplicates.** Fine as a seed-node entry point; **vector-only = decoration**. |
| **Full-text index** | Prefix matching **only at the end of a word** (#3248). |
| **CCH index** | 4.x only, absent in 6.0; preprocessing must re-run on mutation — **bad fit for a continuously-written memory graph**. |
| **Python client 1.8.0** | **No retries by default (#306)** — one transient reconnect raises mid-demo. Wrap every call. No `py.typed` (#269). |
| **Persistence** | Image declares **no VOLUME**, `appendonly=no` → the documented `docker run --rm` quickstart **loses the whole graph silently**. |

### 4.3 Explicitly NOT load-bearing / avoid

| Primitive | Why |
|---|---|
| **GraphRAG-SDK 1.4.0** | **Openly broken on 6.0.x (#344) with a 30s circuit-breaker lockout.** Sponsor-aligned but a known-fragile dependency on a 7-hour critical path. **Not recommended.** |
| **Browser UI (:3000)** | Rules §§2/3 — leaning on it is the most direct route to the decoration disqualifier. Demo garnish only. |
| **Mem0 integration** | **CONTRADICTION:** `docs.falkordb.com/agentic-memory/mem0` documents it [B2], but mem0's own docs state *"Graph memory is removed from the open-source SDK"* [A1]. **FalkorDB's page is stale — do not rely on it.** |

### 4.4 PINNED RUNTIME (binding)

```bash
docker run -d --name falkor -p 6379:6379 -p 3000:3000 \
  -v falkordb_data:/var/lib/falkordb/data \
  falkordb/falkordb:v4.22.1
```
`:latest` resolves to **v4.22.1** despite the 6.0.0 release notes claiming otherwise — verified live. Pin explicitly. `algo.AStar` and CCH exist **only** in 4.x; GraphRAG-SDK is broken on 6.0.x.

**Time to Hello World: < 30 min** (low friction, safe bet) — `docker run` + `pip install falkordb` + a 3-line query.

---

## 5. ORGANIZER-FEEDBACK SEAM (16 entries → `intel-state.json`)

5 **critical**: `:latest`≠6.0 tag mismatch · the official tutorial's flagship query doesn't run as written · #2233 silent vector data-loss · #2848 concurrent-KNN duplicates · GraphRAG-SDK 30s lockout.
4 **high**: unparameterizable path bounds · async constraints with no blocking option · TS client missing `RO_QUERY` · Python client no-retry default.
Plus the no-VOLUME persistence trap, the Cloud free-tier eviction risk, the stale mem0 page, the `maxFlow` doc-bug, the full-text prefix limit, the missing `py.typed`, and **1 praise entry** (a well-formed `llms.txt` — genuinely made machine-reading the docs fast).

> **Blog-prize whitespace [B2]:** 65 DEV.to posts exist under the `falkordb` tag. Many report FalkorDB bugs *incidentally*; **none is the consolidated "FalkorDB sharp edges and how to work around them" post.** The 16 entries above are a live-verified draft of exactly that. **Cheap second shot at the AirPods bounty (§2 bonus) if the build lands with time to spare.**

---

## 6. SPONSOR VINTAGE (primitives shipped in the last ~90 days — L5: mid-window primitives take podiums)

| Primitive | Shipped | Source |
|---|---|---|
| **Agent memory stack** (working/episodic/semantic/procedural) — *"Memory should be the SSD"* | **2026-10-16 — day 2 of the hackathon** | falkordb.com/blog/agent-memory-for-long-running-agents/ |
| **agent-memory-bench** (open source) | 2026-10 | falkordb.com/blog |
| **CCH index + A\* + Dijkstra pathfinding** | **2026-10-12** | falkordb.com/blog (Gomez & Lipman) |
| FalkorDB 6.0 (Rust engine) | 2026-09 | falkordb.com/blog — ⚠ `:latest` is still v4.22.1 |
| Graphiti FalkorDB backend + FalkorDBLite | 2026-09 | getzep/graphiti #1240 |

**Track 02's own description is the sponsor's published taxonomy, verbatim.** Speaking their vocabulary back to them is free alignment. Benchmarks in the public air: LongMemEval, LOCOMO, DMR, HaluMem, HotpotQA, MuSiQue, 2WikiMultihopQA, BEAM, and **agent-memory-bench (theirs, 2 days old)**.

> **HaluMem finding worth carrying:** measured **<60% extraction recall across all four tested memory systems** — memory systems silently drop and fabricate facts at write time. Nobody gates the write.

---

## 7. STRATEGIC RECOMMENDATIONS

1. **Track 02 primary** (thinnest + sponsor home turf). Declare secondary tracks only where the build *honestly* qualifies — §5 requires naming every track entered.
2. **Lead the README's first line with arbitration, not memory.** "Shared agent memory" reads as a duplicate of 8 other entries; "the graph decides which agent is right" does not.
3. **Put a real algorithm on the critical path** (`algo.SPpaths` / `dijkstra` / `pageRank` over provenance chains) and **publish latency numbers.** The CTO shipped that post this week.
4. **Arbitration must be computed in Cypher**, not Python. That is the precise line Quorum does not cross, and it is also the decoration-test answer.
5. **Finish the checklist.** Only 18/267 competitors have both a deploy and a video. Reserve **30 min** for the login-gated submission form.
6. **Ship a measured number.** An honest eval against a named benchmark separates us from a field of README-ahead-of-code entries.
7. **Hygiene:** pin `v4.22.1`, mount a volume, wrap every client call in a retry, never let LLM-authored Cypher run outside `RO_QUERY`.

---

## 8. GAPS, CONTRADICTIONS AND LOW-CONFIDENCE ITEMS

| Item | Status |
|---|---|
| **Submission form fields** | **UNEXTRACTED.** Login-gated SPA returns only *"Pulling up this hackathon"* to WebFetch. Must be read in Dami's real Chrome (**browser is a singleton — never delegate to a subagent**). 30 min reserved. |
| **Judges** | `/judges` is a hard **404** [A1 negative]. Panel is **inferred** [D4]. |
| **Rubric** | None published for this edition. Six criteria are the house template [D4 applied here]. |
| **Demo video max length** | Not published. 180s inferred from First Commit guidance [B2]. |
| **Discord** | FalkorDB Discord **not joined** — joining a server on Dami's account requires his explicit authorization. **Phase 2 social intelligence is partial.** |
| **Reddit** | **UNSEARCHED** — blocked to the search user-agent. **Not cleared.** |
| **MANDATE / Pheromone** | DEV.to posts exist; `gh search repos` returned `[]`. **Code never located** [D4]. |
| **CONTRADICTION — mem0** | `docs.falkordb.com/agentic-memory/mem0` [B2] says supported; mem0's own docs [A1] say graph memory was removed from the OSS SDK. **Resolution: mem0 is higher-reliability and more specific — FalkorDB's page is stale. Do not rely on mem0+FalkorDB.** |
| **FalkorDB Cloud** | Free tier: no persistence, no backups, idle-stop at 1 day, delete at 7 — and **no judging date is published**. **Resolution: self-host; the repo's seed script is the real durability guarantee.** |
