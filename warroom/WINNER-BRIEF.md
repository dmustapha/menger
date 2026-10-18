# WINNER BRIEF — V1 — Graph Hacks (WeMakeDevs × FalkorDB)

**Project name:** **MENGER**
**Track declared:** 02 — Agent Memory and Coordination (primary, sole)
**Deadline:** 2026-10-18 19:29 WAT · **Brief written:** 12:50 WAT · **Build must stand by 16:20 WAT**

Name cleared by L12 probe (GitHub repo search 2026-10-18): `menger+falkordb` → 0,
`menger+agent+memory` → 0, `admission+control+falkordb` → 0.

---

## Thesis

**The one-sentence product:** MENGER is an admission-control gate on agent memory —
when an agent tries to write a fact into shared memory, the graph itself returns
**ALLOW**, **BLOCK**, or **UNDECIDED**, and every verdict ships with a replayable receipt.

**README line 1 (locked):**
> An agent tried to write a memory. The graph refused it — ALLOW / BLOCK / UNDECIDED,
> decided by max-flow and shortest-path inside the engine.

**Why this wins:** every other entrant in this field *stores* agent memory. Two named
competitors go further — `agentmesh` *detects* contradictions and keeps both facts;
`Quorum-falkordb` resolves them, but only after a human supplies the correction, and its
ranking blend runs in the API process. MENGER is the only one where the **decision itself
is a graph computation**: source independence is Menger's theorem evaluated as max-flow
over a node-split provenance DAG, and source reliability is a shortest path over
`-ln(trust)` edges. Neither number exists without a graph engine.

**Substitution test (the disqualifier that kills most entries):**
> Remove FalkorDB and there is no max-flow over the provenance DAG and no
> minimum-`-ln(trust)` path — so there is no independence score and no reliability score,
> so there is no verdict. The arbitration function IS two graph algorithms. The product
> does not degrade without the graph; it ceases to have an output.

**Live consumer of the infra (TASTE C-IN1):** the demo is not a query console. A writing
agent is *refused*, visibly, and the refusal changes what the next agent reads.

---

## Mechanism

```
verdict(claim) from  score = independence × reliability × recency

  independence(claim) = algo.maxFlow(super_source → claim) over unit-capacity edges
                        of a NODE-SPLIT provenance DAG
                        = the number of VERTEX-disjoint origin→claim chains
                        = Menger's theorem = how many genuinely independent origins

  reliability(claim)  = exp( −pathWeight ) where pathWeight = algo.SPpaths over edges
                        weighted nl = −ln(trust); minimising the sum maximises the
                        PRODUCT of per-hop trust along the best chain

  recency(claim)      = exp( −λ · age_hours )

  ALLOW      incoming claim wins its contested slot by margin > ε
  BLOCK      an existing claim wins by margin > ε
  UNDECIDED  |margin| ≤ ε  → the write lands in a review queue, nothing is silently lost
```

### Schema (node-split is MANDATORY — see risk R-1)

```
(:Agent    {id, name, trust})
(:Claim    {id, subject, predicate, object, asserted_at, status})
(:Source   {id, kind, trust})
(:SourceIn {sid})  (:SourceOut {sid})      -- the node-split pair for every Source
(:Slot     {key})                          -- subject+predicate; claims contend for a Slot

(:Agent)-[:ASSERTED {at}]->(:Claim)
(:Claim)-[:FILLS]->(:Slot)
(:Claim)-[:CITES {cap:1.0}]->(:SourceIn)
(:SourceIn)-[:FLOW {cap:1.0}]->(:SourceOut)      -- the split edge = the vertex capacity
(:SourceOut)-[:DERIVED_FROM {cap:1.0, nl}]->(:SourceIn)   -- citation chains between sources
(:SuperSource)-[:FLOW {cap:1.0}]->(:SourceIn)    -- one per ORIGIN source
(:SourceOut)-[:FLOW {cap:1.0}]->(:Claim)
```

Every flow edge carries `cap: 1.0`. Independence = `algo.maxFlow` from the single
`:SuperSource` to the `:Claim`. Because every `Source` is split, a chain funnelling
through a shared intermediate consumes that intermediate's single unit of capacity and
the two chains count as **one** origin — the echo chamber collapses. **Proven live both
directions** (shared intermediate → 1, independent → 2).

---

## MANDATORY corrections folded in (from round_0 + fact_check — all five discharged)

| # | Correction | Resolution |
|---|---|---|
| 1 | **Menger bug** — unit-capacity *edges* count edge-disjoint paths, so an echo chamber scores high | Node-split in the schema above. Proven live: echo → 1, independent → 2. NON-NEGOTIABLE. |
| 2 | **No stored procedures in FalkorDB** — "a single Cypher procedure names a winner" is unbuildable | README says "a single parameterised Cypher query", never "procedure". The panel wrote the engine; this wording would be falsified on first read. |
| 3 | **`algo.betweenness` is the wrong selector** (ranks intermediaries, not leaf sources) | Dropped entirely. Not used. |
| 4 | **Spine is 3h+, not 2h15m** — maxFlow is per source-claim pair; this is orchestration + a client-side fold, not one query | Budget set at spine 3h + receipts 35m. Only a +35m layer fits. Counterfactual is a stretch, gated at 14:45. |
| 5 | **Latency probe must time maxFlow at target size** | DONE. 1402 nodes / 2400 edges → **41ms cold, 11ms warm**. Not the bottleneck. |
| 6 | **`algo.dijkstra` does not exist** (fact_check, new) | `algo.SPpaths({sourceNode, targetNode, relTypes, weightProp})`. Note: wrong weight-key names silently return hop count. |

---

## Build plan (3h35m, T0 = 12:50 WAT)

| Slice | Ends | Content |
|---|---|---|
| **B1 — schema + seed** | 13:35 | Python seed script, synthetic corpus only (no private data). ~40 agents, ~150 sources, ~60 claims across ~20 contested slots, with three hand-crafted set-pieces: a genuine echo chamber, a genuinely-corroborated truth, and a deliberate tie. Node-split built at seed time. |
| **B2 — resolver** | 14:45 | `arbiter.py`: per contested slot, UNWIND candidates → maxFlow per claim, SPpaths per claim, recency decay, fold, emit verdict + margin. All reads via `GRAPH.RO_QUERY`. |
| **GATE** | 14:45 | **Spine standing?** If yes, the P3 counterfactual stretch is unlocked. If no, it is dead and the time goes to polish. |
| **B3 — write gate + review queue** | 15:45 | `POST /remember` — an agent submits a fact; MENGER returns ALLOW / BLOCK / UNDECIDED. UNDECIDED writes a `:Review` node. BLOCKED writes are **recorded, never silently dropped** (this closes the User Advocate's dissent). |
| **B4 — DOCKET receipts** | 16:20 | Every verdict persists the exact Cypher executed, the three component scores, the winning provenance path, and the max-flow witness set — replayable by ID. Mandatory per Dami's ruling. |
| Buffer | 17:05 | Fix / real-Chrome proof. |
| README + Cypher artifact | 17:50 | Graph data model + the algorithms as a separately-listed artifact + AI-assistance disclosure. |
| Video ≤180s | 18:50 | |
| Submission form (login-gated SPA, real Chrome) | 19:20 | |

---

## Risk register (cross_exam + challenge COLLAPSED — see note)

**Process note:** under SPRINT and with the winner ruled by Dami at pool_checkpoint,
`cross_exam` (top-2 adversarial) and `challenge` (per-finalist premortem) were collapsed
into this single register. Running an adversarial pass between two candidates when one has
already been ruled would burn ~40m of a 3h35m build budget to re-litigate a closed
decision. This is a deliberate, logged deviation, not an omission.

| ID | Sev | Risk | Mitigation |
|---|---|---|---|
| R-1 | **CRITICAL** | Node-split omitted or done wrong → the headline claim is false and the demo's echo-chamber set-piece scores high | Seed script asserts both control cases (echo→1, independent→2) at startup and refuses to run if either fails |
| R-2 | **CRITICAL** | "Truth oracle" credibility — a panel reads "the graph decides what is true" as overreach | Framing is **admission control**, not truth. The product gates a *write*; UNDECIDED is first-class; a wrong BLOCK is recorded and appealable. Never use the word "truth" in the README headline. |
| R-3 | HIGH | `algo.SPpaths` weight-key trap — a silent hop-count score that passes every test | Resolver asserts a known weighted path at boot (`pathWeight 0.21072` on the control fixture) |
| R-4 | HIGH | Score multiplies three incompatible units with no stated weights or ε (User Advocate's standing dissent) | README states ε explicitly, states that the score is **ordinal not cardinal**, and shows the three components separately in every receipt. No hidden blend. |
| R-5 | MED | `agentmesh` owns the contradiction-*detection* vocabulary | README line 1 says *refused / admission control*, never *detects conflicts* |
| R-6 | MED | `Quorum-falkordb` out-polishes us (59+ commits, 660+ tests, CI) | Lead with the demo it structurally cannot stage: Quorum needs a human to supply the correction; MENGER refuses the write with no human in the loop, then shows the receipt |
| R-7 | MED | Clock — every generator's plan overran the deadline by design | The 14:45 gate is hard. Stretch dies at 14:45 if the spine is not standing. |
| R-8 | LOW | Engine pin drift (`:latest` → 6.0 breaks GraphRAG-SDK) | Pinned `falkordb/falkordb:v4.22.1` in compose and README |

---

## Compliance

- **Fresh code only** — nothing ported from LEASH / 0g-fleet. Repo initialised today.
- **No private data** — synthetic corpus from a seeded generator, committed in-repo.
- **AI-assistance disclosure** — required README section.
- **FalkorDB load-bearing** — see the substitution test above.
- **Track declaration** — Track 02 only, declared at submission.

## Stretch (gated at 14:45, dead otherwise)

P3 KEYSTONE counterfactual: `GRAPH.COPY` the graph, delete one source, re-run the
arbitration, diff the verdicts → "which single source, if removed, flips the most
verdicts." `GRAPH.COPY` latency is still **unmeasured** — measure before committing.
