# WARROOM V1 — Graph Hacks (WeMakeDevs x FalkorDB) — Deliberation Transcript

Run profile: SPRINT. autonomous_mode: false. Event class: sponsor_track (declared).
Direction RULED pre-warroom by Dami (not re-litigated): Track 02 primary; shared multi-agent memory in one FalkorDB graph with provenance/ownership edges; contradicting agent-asserted facts arbitrated by corroboration-depth x recency x source-trust computed IN CYPHER over multi-hop provenance chains.

---

# Phase 0 / 0B / 0C

See .warroom-state.json for config, TASTE block selection (C-AI1 + C-IN1), concerns derivation and the corrections log. Facts card + builder capability sheet were assembled inline from config.json and injected into every generator base stack.

---

# Stage 1 — generation_parallel (5 concurrent fresh-context generators, 20 ideas)

Returns below are VERBATIM, recovered from the session transcript.


---

## Generator G1 — community pain + failure evidence

# G1 OUTPUT — 4 ideas from the failure-evidence slice

**Working sheet (families filtered to `sponsor_track` × agent-memory/knowledge-infra/trust):**
`F37` deterministic resolver / engine-as-truth · `F17` guardian / dry-run co-signer (scoped) · `F23` guest-verifiable recompute proof surface · `F25` sponsor's-hardest-guarantee hand-rolled · `F21` closed-loop detect→diagnose→REMEDIATE · `F04` behavioral self-analytics (subject-shift) · `F05` literature-primitive first port · `F24` systems-insight port · `F08` interface-species shift.

**Shared technical core all 4 ideas draw on (the wedge against `Quorum-falkordb`, whose blend lives in the API process):**

> **Independent corroboration = max-flow.** Naïve corroboration-counting double-counts: three agents that all paraphrased the same upstream doc look like three witnesses. Model provenance as a flow network, split every Source into `(:SrcIn)-[:CAP {capacity:1}]->(:SrcOut)` so each real-world source can carry exactly one unit, run `algo.maxFlow` from a virtual `(:Root)` to the claim — by Menger's theorem the max-flow equals the number of **vertex-disjoint** provenance chains, i.e. genuinely independent corroboration. That is a literature primitive (`F05`) ported onto a FalkorDB algorithm (`F24`), and it is impossible to compute cheaply outside a graph engine.
> Paired with `algo.SPpaths`/`algo.dijkstra` over `cost = -log(trust)` → the shortest path is the **maximum-reliability path**, `reliability = exp(-totalCost)`. Lipman shipped the Dijkstra/A*/CCH post 6 days ago; this puts it on the critical path, not in the credits.

---

### IDEA G1-1: PORTCULLIS — the write gate
**One-line pitch:** Every fact an agent tries to write is adjudicated against the existing graph *before* it lands — in a server-side `GRAPH.COPY` shadow clone — and a write that loses the adjudication is refused with a receipt.

**Problem:** HaluMem measured <60% extraction recall across all four tested memory systems: agent memory stores silently drop and fabricate facts **at write time**, and nobody gates the write. Mem0 is ADD-only and defers conflict to a reader LLM; Graphiti/Zep let the newer write win even when newer is a hallucination. The failure is admitted at the door and discovered downstream, if ever.

**Primary user, day 1:** Priya, who runs a 6-agent research-and-ops swarm at a 22-person AI company. Tuesday afternoon her onboarding agent writes "ACME's renewal date is Nov 3" from a stale PDF, overwriting the CRM-sourced Jan 12 that three other agents depend on. She finds out when a customer email goes out wrong. She wants the bad write to never have landed.

**Mechanism:** Agents don't `CREATE` — they POST a candidate assertion to a gate. The gate (1) resolves the claim's subject/predicate against existing claims using the Flex UDFs `jaroWinkler()`/`levenshtein()` in Cypher plus a full-text index, (2) if an incompatible incumbent exists, `GRAPH.COPY`s the live graph into a shadow graph `shadow:{writeId}`, (3) writes the candidate *into the shadow only* and runs the arbitration query there, (4) compares the shadow verdict to the live verdict. Candidate wins → the write is replayed into live and a `(:Verdict)` node is attached. Candidate loses → **refused**, HTTP 409 with the losing margin and the Cypher that produced it. Margin below ε → stored as `CONTESTED`, and reads of that fact return both plus the abstention. Shadow graphs get a Redis `EXPIRE` so dry-runs self-GC.

**The arbitration function:**
```
score(c) = indep(c)^α  ×  reliability(c)  ×  recency(c)        α = 1.0, ε = 0.15
indep(c)      = algo.maxFlow(Root → c over :FLOWS, capacity)     # vertex-disjoint sources
reliability(c)= exp(-minCost), minCost from algo.SPpaths(Root→c, cost = -log(src.trust))
recency(c)    = exp(-(now - c.at) / (86400 * halflife))          # halflife 30d, BOUNDED [0.3,1.0]
winner = argmax score; if (s1 - s2)/s1 < ε → ABSTAIN (stored, not silently resolved)
```
One Cypher statement: `CALL algo.maxFlow(...) YIELD flow` → `WITH` → `CALL algo.SPpaths(...) YIELD pathWeight` → `WITH` → arithmetic → `MERGE (:Verdict {...})`. Self-reported `confidence` is **not an input**. Var-length bounds are literal constants (`*1..4`), never interpolated.

**FalkorDB primitives, load-bearing:** `algo.maxFlow`, `algo.SPpaths`/`algo.dijkstra`, `GRAPH.COPY` (the shadow dry-run *is* the gate), graph-level `EXPIRE` (shadow GC), full-text index + `jaroWinkler()` UDF (claim resolution), unique constraints on `Claim.hash`, `GRAPH.RO_QUERY` for the read path.

**Substitution test:** Remove FalkorDB and there is no server-side clone to dry-run against, so the gate must either lock the live store or simulate in Python; and independent-corroboration becomes an exponential vertex-disjoint-path enumeration in app code — i.e. the thing the product refuses to do.

**Proof surface (L15):** A stranger verifies in 60 seconds by running `curl -X POST /write` with the hallucinated fact from the README and getting a 409 containing the exact Cypher and the two scores — then re-running that Cypher themselves against the public read endpoint and getting the same numbers.

**Namable cheat closed in code:** An agent cannot win by *asserting harder*. `confidence` is dropped at the door, recency is clamped to [0.3,1.0] so "newer" can only break near-ties, and three agents paraphrasing one source score `indep=1`, not 3.

**Demo climax (U2):** Split screen. Left: four agents writing concurrently, green rows landing. Right: the gate's live log. Agent-3 asserts the fabricated renewal date — the row turns red, `REFUSED`, and the panel prints *"lost 0.41 vs 0.88: 1 independent source (shared ancestor with Agent-1) vs 3; incumbent reliability 0.93."* The graph is visibly unchanged.

**Lane:** FLOOR

**Name-collision probe (L12):** No. The field's vocabulary is memory/graph/truth/quorum/mesh; "portcullis" plus the framing "gate the write" is not what a field building *stores* reaches for — they ship ADD-then-resolve.

**7-hour build plan (T0 = 12:30):**
- **T0–T0:45** Pin FalkorDB v4.22.1 in Docker **with a volume and `appendonly yes`** (documented quickstart silently loses the graph); wrap the Python client in a retry decorator (#306, no retries by default); create constraints and poll until not PENDING. Verify the exact `algo.maxFlow`/`algo.SPpaths` call signatures against the running build — **this is the riskiest 45 minutes; if `maxFlow` can't express unit vertex capacity, fall back to k-disjoint-path counting via repeated `SPpaths` with edge removal.**
- **T0:45–T2:15** Schema + loader + the arbitration Cypher as a single named query file; unit-test it on 6 hand-built conflict fixtures with known correct winners.
- **T2:15–T3:30** The gate service: `GRAPH.COPY` shadow → write → arbitrate → promote-or-refuse; 409 receipt payload.
- **T3:30–T5:00** The live swarm consumer: 4 real LLM agents reading a shared doc set and writing through the gate, one deliberately fed a stale source. State is **earned** — nothing seeded.
- **T5:00–T6:00** UI: two-column live log, refusal card, verdict drill-down.
- **T6:00–T7:00** README with data model + the separate `QUERIES.md` artifact, 180s video, deploy to the Oracle VM.

**Mechanism families used:** F17 (dry-run co-signer, veto enforced at the store layer not app code) · F37 (deterministic resolver; no LLM touches the verdict) · F25 (hardest-guarantee: `GRAPH.COPY` + `maxFlow` hand-wired on the hero path) · F23 (recomputable receipt).

**Why this is NOT the modal entry:** The kill list owns *detection* (`agentmesh`), *supersession* (`ninaivu`), and *post-hoc provenance scoring* (`Quorum`). All three arbitrate **after** the write. This is the only shape that makes the arbitration a precondition of persistence, and the refusal — not the retrieval — is the demo.

---

### IDEA G1-2: DOCKET — the memory's court of record
**One-line pitch:** Every fact in the graph carries a re-executable verdict: click it and you get the losing claim, the independent-source count, the trust path, the exact Cypher, and a hash you can recompute yourself.

**Problem:** Cognee resolves contradictions by LLM judgement — unauditable and non-reproducible. Quorum's ranking blend lives in the API process, so the "why" is a Python stack trace, not an artifact. Nobody in the field can *show their work* for why claim A beat claim B, which means nobody can appeal, regression-test, or trust a memory decision.

**Primary user, day 1:** Marcus, a support-automation lead whose agent told a customer the wrong SLA tier. Tuesday 3pm he is in a post-incident review and the only answer his memory layer can give is "the retrieval returned that chunk." He needs to stand in front of his VP and say which claim won, which lost, and why — and prove it didn't change since.

**Mechanism:** Arbitration runs continuously over contested entity-predicate pairs and materialises a `(:Verdict)` node: winner, loser(s), each score's three components, the `formulaVersion`, the serialized Cypher, and `receiptHash = sha256(sorted inputs ‖ formulaVersion ‖ scores)`. The product surface is the docket: a searchable list of every decision the memory has made, each opening into a verdict page. The page renders the maximum-reliability path and the vertex-disjoint corroboration chains as *named paths returned by the query itself*, not as a drawn picture (graph-as-visualization is disqualifying; here the paths are the evidence). A `/replay/{verdictId}` endpoint re-runs the stored Cypher through `GRAPH.RO_QUERY` and shows recomputed-vs-stored side by side.

**The arbitration function:** Same composite as G1-1, but the **receipt is the product**, so the query is written to `RETURN` its own intermediate terms: `RETURN winner.id, indep_w, indep_l, reliability_w, reliability_l, recency_w, recency_l, score_w, score_l, (score_w-score_l)/score_w AS margin, disjointPaths` where `disjointPaths` is a collection of named paths from `algo.SPpaths(..., pathCount: 3)`. `formulaVersion` is a node property, so changing the formula creates a *new* verdict rather than silently rewriting history — the docket is append-only.

**FalkorDB primitives, load-bearing:** `algo.maxFlow`, `algo.SPpaths` with `pathCount>1` (the alternate paths are literally the displayed evidence), named paths + `shortestPath()`, `GRAPH.RO_QUERY` (guest replay can't mutate), full-text index over claim text for docket search, unique constraint on `Verdict.receiptHash`.

**Substitution test:** Remove FalkorDB and the receipt stops being re-executable — the "query" becomes a Python function, so a stranger can only re-run *your code*, not *your data*, and the self-falsification property dies.

**Proof surface (L15):** A stranger verifies in 60 seconds by opening any verdict, hitting **Replay**, seeing `recomputed == stored ✓`, then using the one-click **Tamper** control to bump a source's trust — the badge flips RED and the page names which term moved.

**Namable cheat closed in code:** You cannot retro-fit a justification. `receiptHash` binds the inputs to the formula version, and the docket is append-only under a unique constraint, so re-deciding a claim leaves both verdicts visible. There is no admin "set winner" path.

**Demo climax (U2):** The Tamper button. Judge nudges one source's trust from 0.9 to 0.4 on screen; the replay badge goes RED, the verdict page shows the reliability term collapsing, and the re-decision flips the winner — the system falsifying its own prior record, live.

**Lane:** FLOOR

**Name-collision probe (L12):** No. Rivals reach for Truth/Verify/Attest/Consensus. "Docket" imports courtroom grammar, and the courtroom framing in this field has been used for escalation-to-humans, not for machine-final records.

**7-hour build plan (T0 = 12:30):**
- **T0–T0:45** Same hardened FalkorDB bring-up as G1-1 (volume + appendonly + retry wrapper + constraint poll). Confirm `SPpaths` returns multiple named paths in one call — **riskiest item: if `pathCount` can't be returned as paths, degrade to edge-removal iteration, which costs ~25 min.**
- **T0:45–T2:00** Verdict node schema + hash discipline + the instrumented arbitration query returning all nine terms.
- **T2:00–T3:15** Replay endpoint over `RO_QUERY` + tamper control + RED/GREEN badge.
- **T3:15–T4:45** Real swarm producing real contested claims (earned state, U7).
- **T4:45–T6:00** Docket UI: decision list, verdict page, path rendering as typed evidence rows.
- **T6:00–T7:00** README + `QUERIES.md` + video + Oracle deploy.

**Mechanism families used:** F23 (guest-verifiable recompute — the single strongest placement predictor in the corpus) · F37 (engine-as-truth) · F25 (hardest guarantee made per-decision provable) · F05 (Menger/max-flow independence as a literature port).

**Why this is NOT the modal entry:** The kill list bans graph visualization as the product and bans provenance-scoring-in-general as occupied. This is neither: the artifact is a *reproducible decision record*, the occupant's own boundary is that its blend doesn't live in Cypher, and no entry in this field can be tampered-with on stage and self-report the lie.

---

### IDEA G1-3: FAULTLINE — contradiction as a live operational signal, resolved by commissioning evidence
**One-line pitch:** A live console that tells you your swarm is currently self-contradicting in N places, ranks each fault by how much downstream work rests on it, and when the arbitration is too close to call it dispatches an agent to go *get more evidence* instead of paging you.

**Problem:** Disagreement inside a swarm is invisible until it produces a wrong output. Trust-Aware Multi-Agent Traceability (arXiv 2606.17203) handles close calls by routing to human review — it gives up on autonomy exactly where autonomy matters. Nobody surfaces "your agents currently disagree about three things, and one of them is load-bearing" as a product surface at all.

**Primary user, day 1:** Dani, the SRE-for-agents at a logistics startup running 9 agents over a shared customer graph. Tuesday afternoon she has no equivalent of a pager for *epistemic* failure — only for crashes. She wants a screen that ranks "the swarm disagrees about X, and 14 downstream decisions depend on X."

**Mechanism:** A detector pass maintains contested clusters (plumbing, not the headline). Each cluster is scored twice: an **arbitration margin** (who's winning, by how much) and a **blast radius** — `algo.pageRank` / `algo.betweenness` over the `(:Claim)-[:DEPENDS_ON]->(:Claim)` + `(:Decision)-[:USED]->(:Claim)` subgraph, giving how much of the swarm's reasoning rests on the contested node. Faults sort by `blastRadius × (1 - margin)`. Decisive faults auto-resolve and vanish from the board. Close calls (`margin < ε`) do **not** page a human: the system computes *which missing evidence would most move the margin* — the source whose addition maximises `indep` for the trailing claim — and dispatches a real evidence-acquisition task to an agent. When that agent returns a new `(:Evidence)` edge, the write re-triggers arbitration, the margin crosses ε, and the fault clears itself on screen.

**The arbitration function:** Core composite as above, plus the tie-breaking **escalation selector**, in Cypher:
```
// which unexplored source, if it corroborated the trailing claim, maximally raises indep?
MATCH (loser:Claim {id:$l})-[:ABOUT]->(e:Entity)<-[:COVERS]-(s:Source)
WHERE NOT (s)-[:FLOWS*1..4]->(loser)          // literal bound, never interpolated
CALL algo.maxFlow({source:$root, sink:loser, ...}) YIELD flow AS base
RETURN s.id, s.trust, base ORDER BY s.trust DESC LIMIT 1
```
and `blastRadius`: `CALL algo.pageRank({relationshipTypes:['DEPENDS_ON','USED']}) YIELD node, score`.

**FalkorDB primitives, load-bearing:** `algo.pageRank` + `algo.betweenness` (blast radius — the second Lipman-adjacent algorithm family on the hero path), `algo.maxFlow` (independence + the counterfactual selector), `algo.SPpaths`, `algo.WCC` to group contested clusters, `GRAPH.RO_QUERY` for the console's polling reads.

**Substitution test:** Remove FalkorDB and both halves die: blast radius is a global graph centrality over a live mutating graph (recomputed per poll, not feasible as a Python pass), and the counterfactual "which evidence most raises independence" is a max-flow delta — the console degrades to a list of contradictions, which is the already-occupied `agentmesh` shape.

**Proof surface (L15):** A stranger verifies in 60 seconds by injecting a contradiction through the public `POST /assert` endpoint and watching a new fault appear on the board within one poll, ranked, with its blast radius and the named downstream decisions it threatens.

**Namable cheat closed in code:** The system cannot make a problem disappear by quietly choosing. `ABSTAIN` is a stored state that *keeps the fault on the board*, and there is no human-escalation endpoint at all — the only exit from a tie is new evidence landing through the normal write path.

**Demo climax (U2):** Fault #1, margin 0.04, blinking amber, blast radius 14. The console prints "*commissioning evidence: Source `crm-export`, projected independence 1 → 2*" and dispatches. Twelve seconds later a new evidence row lands, the margin jumps to 0.52, the winner **flips**, and the fault clears itself — autonomous resolution of a tie, with zero human input, on screen.

**Lane:** CEILING

**Name-collision probe (L12):** No. Three rivals would plausibly build a "conflict dashboard"; none would build the *commission-evidence* loop, and the name attaches to the loop, not the board.

**7-hour build plan (T0 = 12:30):**
- **T0–T0:45** Hardened bring-up (volume/appendonly/retry/constraint-poll). Confirm `pageRank` + `maxFlow` both run inside one statement chain.
- **T0:45–T2:00** Composite + ABSTAIN state + fault clustering via `WCC`.
- **T2:00–T3:15** Blast-radius pass and the fault ranking query.
- **T3:15–T4:45** **Riskiest leg: the evidence-commissioning loop** — counterfactual selector → real agent task → new edge → re-arbitration. Hard-stop at T4:45; if the agent round-trip is flaky, the selector still runs and the dispatch becomes a real queued task with a manual kick, but the loop must be live or the headline dies.
- **T4:45–T6:00** Console UI with live polling, amber/green fault states.
- **T6:00–T7:00** README + `QUERIES.md` + video + Oracle deploy.

**Mechanism families used:** F04 (subject-shift: analyse the *swarm's own epistemic state*, not the data) · F21 (closed loop — detect → diagnose → remediate with a validated artifact, where the artifact is the new corroborating edge) · F37 (deterministic resolver) · F25 (pageRank + maxFlow hand-wired, six days after the sponsor CTO's pathfinding post).

**Why this is NOT the modal entry:** Human-in-the-loop escalation is explicitly occupied and explicitly a capitulation; this inverts it. Contradiction *detection* is owned by `agentmesh`; here detection is the cheapest part and the product is what happens in the ten seconds after.

---

### IDEA G1-4: HINDSIGHT — trust is earned by survival, and one falsification re-decides the past
**One-line pitch:** When a fact is finally proven wrong, the graph walks the provenance backwards, demotes the source that fed it, and automatically re-decides every other claim that source ever touched — flipping past winners, in public.

**Problem:** Every shipping system treats source trust as an input somebody supplies. Quorum — the field's best-executed entry — gets its truth from an external human correction. Graphiti trusts recency. So the same bad source keeps winning arbitrations forever, because nothing propagates a single proven error backwards into the trust that produced it.

**Primary user, day 1:** Priya again, Tuesday 4pm, one hour after a customer caught a wrong fact. In every existing system she fixes that one fact. What she actually needs to know is: *what else did that source tell us, and is any of it also wrong?* — and she needs the answer without manually auditing 400 claims.

**Mechanism:** A `(:Falsification)` event attaches to a claim (produced by the system itself when a future, better-corroborated claim decisively defeats it — not injected by a human). Backward propagation walks `(:Claim)-[:DERIVED_FROM]->(:Evidence)-[:FROM_SOURCE]->(:Source)` and applies a Bayesian-ish trust update per contributing source, weighted by that source's share of the losing claim's max-flow (sources that were load-bearing for the error are demoted hardest; incidental ones barely move). Then the cascade: every `(:Verdict)` whose maximum-reliability path traverses a demoted source is re-run, and any verdict whose winner changes is written as a **new** verdict with `supersedes` pointing at the old one. The headline number is the cascade: *one falsification → 23 verdicts re-decided → 4 winners flipped.*

**The arbitration function:** Composite as above, with `src.trust` **endogenous**:
```
trust'(s) = clamp( trust(s) * (1 - λ * blame(s)) , 0.05, 0.99 )
blame(s)  = (flow contributed by s to the falsified claim) / indep(falsified)   // from algo.maxFlow
// cascade: re-run arbitration for every verdict touching a demoted source
MATCH (v:Verdict)-[:USED_PATH]->(s:Source) WHERE s.id IN $demoted
WITH collect(DISTINCT v) AS stale ... // re-run composite per claim pair, MERGE new Verdict {supersedes: v.id}
```
Trust rises symmetrically on survival (`trust' = trust + μ(1-trust)` when a source's claim wins decisively), so trust is purely a function of arbitration history. There is no setter.

**FalkorDB primitives, load-bearing:** `algo.maxFlow` (blame attribution = flow share, the non-obvious part), `algo.SPpaths` (which verdicts traversed a demoted source — a path-membership query, not a scan), `algo.pageRank` over the surviving corroboration graph as the trust prior, multiple named graphs + `GRAPH.COPY` to snapshot pre-cascade state for the before/after diff, `GRAPH.RO_QUERY` for the diff view.

**Substitution test:** Remove FalkorDB and blame attribution has no flow decomposition to apportion by, and "which verdicts traversed this source" becomes a full table scan plus path reconstruction in app code — the cascade stops being a query and becomes a batch job, at which point it's a cron, not a memory primitive.

**Proof surface (L15):** A stranger verifies in 60 seconds by opening the cascade page for the demo falsification and reading the before/after diff: N source trusts moved, M verdicts re-run, K winners flipped — each flip linking to both the old and the new verdict, with the old one still intact.

**Namable cheat closed in code:** Trust cannot be assigned, bought, or hand-tuned — there is no endpoint, no config field, no seed file that sets `Source.trust` after init; it is only ever moved by a recorded arbitration outcome. That is precisely the boundary the field's strongest occupant leaves open.

**Demo climax (U2):** One falsification lands. A counter spins: **23 verdicts re-decided, 4 winners flipped**, and four rows in the fact table visibly change value — the memory re-deciding its own past, from a single new piece of evidence, with no human and no LLM in the loop.

**Lane:** CEILING

**Name-collision probe (L12):** No. The field's names cluster on present-tense truth (Quorum, agentmesh, ninaivu). Nothing here is aimed backwards in time.

**7-hour build plan (T0 = 12:30):**
- **T0–T0:45** Hardened bring-up; verify `maxFlow` exposes per-edge/per-path flow (needed for blame share) — **riskiest unknown; if flow decomposition isn't available, blame falls back to disjoint-path membership (binary per source), which is weaker but still endogenous. Decide by T0:45, do not litigate later.**
- **T0:45–T2:00** Composite + verdict materialisation with `USED_PATH` edges recorded at decision time (this is what makes the cascade a query instead of a scan — must be designed in now).
- **T2:00–T3:30** Trust update + cascade re-run + supersession chain.
- **T3:30–T5:00** Real swarm generating ≥40 real verdicts over real documents, one source genuinely degraded (earned state — the cascade number must be produced, never written).
- **T5:00–T6:00** Cascade diff UI with before/after and the flip counter.
- **T6:00–T7:00** README + `QUERIES.md` + video + Oracle deploy.

**Mechanism families used:** F21 (closed-loop remediation with a validated artifact — the re-decided verdict set) · F37 (engine-as-truth) · F24 (systems-insight port: incremental invalidation/dependency-graph rebuild — "your compiler doesn't rebuild the whole project" — ported onto a memory graph, with `USED_PATH` as the dependency edge) · F05 (flow decomposition as blame attribution) · F10-inverted (reputation consequence without any capital or chain — the enforceable-trust shape, de-crypto'd).

**Why this is NOT the modal entry:** The banned shape is commit-then-resolve-on-chain reputation; there is no chain, no stake, no commitment here — trust is a *derived property of past arbitration outcomes inside the store*. And it attacks the one boundary the field's strongest entry admits: its truth comes from outside.

---

**Cross-cutting notes for the selector:** G1-1 and G1-3 both need a live writing swarm, so they share ~90 minutes of build. G1-2's replay/tamper surface is the corpus's single strongest placement predictor (F23) and is cheap to bolt onto any of the other three — treat it as a mandatory sub-component, not only as a standalone. The FalkorDB friction list (no volume in the documented quickstart, no client retries, non-parameterizable var-length bounds, async PENDING constraints) is a fixed ~45-minute tax on every one of these; all four plans front-load it, and the non-interpolated literal path bounds double as the closed Cypher-injection cheat. Nothing was left running.agentId: acefcba0b43701322 (use SendMessage with to: 'acefcba0b43701322' to continue this agent)
<usage>subagent_tokens: 71750
tool_uses: 1
duration_ms: 226026</usage>

---

## Generator G2 — capability/limits slice

No processes started; nothing left running. Working sheet of mechanism families filtered to `sponsor_track` ∩ agent-memory/knowledge-infra/trust: **F37** (deterministic resolver, engine-as-truth), **F25** (sponsor's-hardest-guarantee hand-rolled), **F23** (guest-verifiable recompute proof surface), **F22** (structurally-safe boundary / unrepresentable dangerous action), **F24** (systems-insight port into a new domain — cross-pollination: max-flow/Menger from network-reliability engineering, fork-and-diff from VCS/DB branching), **F16** (missing institution of the agent economy), **F21** (closed-loop detect→remediate), **F05** (literature-primitive first port — Menger's theorem as a corroboration metric). Whitespace-aimed: F37+F25 against the named Quorum wedge (its blend lives in the API process and its truth comes from a human). Sponsor-vintage <90 days: F25/F24 ride the 2026-10-12 Dijkstra/A*/CCH post and the 2026-10-16 agent-memory-stack taxonomy.

---

### IDEA G2-1: MENGER — corroboration measured as max-flow, not as votes
**One-line pitch:** When two agents contradict each other, FalkorDB's `algo.maxFlow` names the winner, because corroboration is the number of *edge-disjoint* provenance paths to a trusted root — two agents quoting the same document corroborate once, not twice.
**Problem:** Every multi-agent memory that arbitrates conflicts counts supporters. Counting is trivially gamed by echo: five agents that all read one blog post look like five witnesses. The independence of evidence — not its volume — is the thing that decides which of two contradicting facts is true, and nobody in this field is computing it.
**Primary user, day 1:** A solo maintainer running a 5-agent research crew (a docs-reader, a changelog-reader, a source-reader, an issue-reader, a web-reader) over a public OSS project. Tuesday afternoon, three of them tell her the default connection timeout is 30s and two say 5s. The three all trace back to one stale quickstart page that got mirrored.
**Mechanism:** Every agent write is an `(:Assertion)` linked `[:ASSERTED]` from its `(:Agent)`, `[:ABOUT]` a `(:Topic)` (subject+predicate key), and `[:DERIVED_FROM*1..3]` through `(:Source)` nodes up to `(:Root)` primary sources. Mirrors/quotes between sources are real edges, so an echo chain is *visible topology*. When two assertions share a Topic with different `value`, the topic is marked `contested`. The arbiter writes integer capacities onto the provenance subgraph — evidence-edge capacity decayed by recency, root-edge capacity scaled by PageRank source trust — then runs one `algo.maxFlow` per candidate assertion from the assertion node to a synthetic `(:TrustedSink)`. The max-flow value *is* the composite: corroboration-depth × recency × source-trust collapsed into one number, because a bottleneck edge at a shared ancestor physically caps the flow. The winner gets a `[:RESOLVED_TO]` edge; losers get `[:SUPERSEDED_BY]` with the bottleneck edge recorded as the reason.
**The arbitration function:**
```cypher
// 1. capacities: recency on evidence, trust on roots  (integers — maxFlow wants ints)
MATCH (a:Assertion)-[d:DERIVED_FROM]->(s:Source)
SET d.cap = toInteger(ceil(10 * pow(0.5, (timestamp() - d.at)/$halflife_ms)))
MATCH (r:Source)-[t:FEEDS]->(k:TrustedSink)
SET t.cap = toInteger(ceil(10 * r.pagerank));   // pagerank materialised by step 0

// 0. source trust is EMERGENT, never asserted
CALL algo.pageRank({relationshipTypes:['MIRRORS','QUOTES','DERIVED_FROM']})
YIELD node, score SET node.pagerank = score;

// 2. the verdict — one call per candidate, winner = max flow
MATCH (t:Topic {key:$k})<-[:ABOUT]-(a:Assertion)
CALL algo.maxFlow({source:a, sink:$sinkNode,
                   relationshipTypes:['DERIVED_FROM','FEEDS'],
                   capacityProperty:'cap'}) YIELD flow
WITH t, a, flow ORDER BY flow DESC
WITH t, collect({a:a, f:flow}) AS r
MERGE (t)-[w:RESOLVED_TO]->(r[0].a)
SET w.score = r[0].f, w.margin = r[0].f - r[1].f, w.at = timestamp();
```
`algo.maxFlow` and not `algo.BFS`/`SPpaths` because by Menger's theorem the max-flow of a unit-capacity graph equals the count of edge-disjoint paths — i.e. independence — and weighting the capacities is exactly how recency and source-trust enter without a second formula. `algo.pageRank` because source trust must be derived from the graph, not typed in by a human. `algo.SPpaths` is the documented fallback if the capacity bug bites.
**FalkorDB primitives, load-bearing:** #4 (`maxFlow`, `pageRank`, `SPpaths` fallback) · #1 multi-hop with the **unparameterizable `*1..$d` bound** forcing a whitelisted-integer depth compiler · #8 constraints (unique Topic key) with the **async PENDING** gotcha forcing a poll-before-ingest step · **LIMIT that shapes the design: #4's `maxFlow` `capacityProperty` docs bug** — the capacities must be integers written onto edges by a prior statement rather than computed inline, which is *why* recency and trust are materialised as graph properties instead of living in app code (and that materialisation is exactly the Quorum wedge).
**Substitution test:** Remove FalkorDB and there is no verdict at all. The composite is not a Python expression over rows — it is a flow computation over a topology whose bottlenecks are the answer. Reimplementing means writing Edmonds-Karp over an in-memory copy of the provenance DAG, i.e. rebuilding the graph engine.
**Proof surface (L15):** A stranger verifies in 60s by opening `/verdict/{topic}` and clicking "recompute": the page re-issues the exact `GRAPH.RO_QUERY` text shown on screen against the live DB and re-renders the flow; then they click "add an echo witness", which inserts a 6th agent quoting the already-counted source, and the score **does not move**. Count-based rivals move.
**Namable cheat closed in code:** Sybil-by-echo. An agent cannot raise its claim's score by recruiting agreement, by re-asserting, or by citing a popular source twice — all of those are additional paths through an existing bottleneck edge and contribute zero flow. Score can only rise by introducing a *genuinely disjoint* provenance chain.
**Demo climax (U2):** Split screen. Left: "5 agents say 30s, 2 say 5s." Right: the flow overlay — the five collapse to a single pinched edge labelled `cap 1 (shared ancestor: quickstart.md)` and the engine names **5s** the winner by flow 4 vs 1. One sentence: *majority lost to independence.*
**Lane:** CEILING
**Name-collision probe (L12):** No. "Max-flow corroboration" is not in any agent-memory vocabulary at this event; rivals reach for counts, scores, and `[:CONTRADICTS]`. The risk is zero rivals, not three.
**7-hour build plan:**
- T+0:00–0:45 — Docker pin `v4.22.1` with the named volume (#14: the docs' `--rm` quickstart loses the graph); schema + unique constraint via `GRAPH.CONSTRAINT` with a PENDING poll; seed ingest from 4 *public* OSS doc sources (no private data — disqualifier).
- T+0:45–2:00 — **Riskiest part, do it first:** prove `algo.maxFlow` end-to-end on a 12-node hand-built fixture where the right answer is known by hand. If `capacityProperty` misbehaves, fall back to `algo.SPpaths` edge-disjoint counting within this window and never look back.
- T+2:00–3:15 — Agent crew (Python, `falkordb` 1.8.0 with an explicit retry wrapper, #10) that reads real public sources and writes assertions + provenance; PageRank pass; arbitration statement; `[:RESOLVED_TO]` materialisation.
- T+3:15–4:30 — The live consumer (C-IN1): a question-answering agent that may only touch the graph through `GRAPH.RO_QUERY` and answers strictly from `[:RESOLVED_TO]`, citing the winning path.
- T+4:30–5:30 — Flow-overlay UI + the echo-witness button + the recompute proof endpoint.
- T+5:30–7:00 — Freeze. README with data model + the separately-listed Cypher/algorithm artifact, deploy to the Oracle VM, ≤180s video, AI disclosure.
**Mechanism families used:** F24 (cross-pollination: network-reliability max-flow → agent memory), F05 (Menger's theorem as a first-port literature primitive), F37 (the LLM asserts; the engine decides), F23 (recompute endpoint + induced-echo falsification).
**Why this is NOT the modal entry:** Not detection (`[:CONTRADICTS]` is owned), not recency-wins (owned), not a human correction loop (owned). Against the kill list it is the one trust mechanism whose ranking is *structurally* inside Cypher — it cannot be lifted into the API process, because the number is a flow. Significant and real: echo-chamber corroboration is the failure mode of every RAG-fed agent crew today.

---

### IDEA G2-2: RETRACTION — fork the team's memory, pull one source, see every belief that flips
**One-line pitch:** One document gets retracted; `GRAPH.COPY` forks the whole shared agent memory server-side in milliseconds, the arbitration re-runs on the fork, and the diff shows you exactly which of your agents' 40 held beliefs just changed their mind.
**Problem:** Shared agent memory is written forward and never audited backward. When a source turns out to be wrong — a corrected changelog, a deprecated RFC, a hallucinating agent you've lost faith in — nobody can answer "what else did we believe *because of that*?" Teams either wipe the memory or live with silently poisoned downstream facts.
**Primary user, day 1:** The platform engineer who owns an internal agent crew. Tuesday 3pm, he discovers one ingest agent has been parsing a deprecated public API spec for two days. He needs the blast radius before standup, not a re-index.
**Mechanism:** The consensus memory lives in one graph; each agent additionally owns a private graph of its own unpublished observations, and publication is an explicit protocol step — because **FalkorDB cannot query across graphs in a single statement (#6)**, "shared memory" cannot be faked as a WHERE clause on an owner property; it has to be a real transport with provenance edges on arrival. To ask a counterfactual, the system issues `GRAPH.COPY consensus → cf_{id}` (server-side, instant), deletes the retracted source's subtree *in the fork only*, re-runs the identical arbitration statement, then diffs the two `[:RESOLVED_TO]` sets — a diff that must happen as two reads plus a set-difference precisely because cross-graph joins don't exist. The fork is also a one-click rollback: if the retraction is confirmed, `GRAPH.COPY cf_{id} → consensus` promotes it.
**The arbitration function:** composite `score = corroboration × recency × trust`, computed in Cypher and identical in both graphs (the whole point — same statement, two worlds):
```cypher
MATCH (t:Topic {contested:true})<-[:ABOUT]-(a:Assertion)
MATCH p = (a)-[:DERIVED_FROM*1..3]->(r:Source)   // depth bound interpolated by a
                                                 // whitelisted-int compiler, never a param (#1)
WHERE r.root
WITH t, a,
     count(DISTINCT r)                                   AS corroboration,
     max(pow(0.5, (timestamp()-a.at)/$halflife))         AS recency,
     sum(r.pagerank / length(p))                         AS trust  // trust decays per hop
WITH t, a, corroboration * recency * trust AS score
ORDER BY score DESC
WITH t, collect({a:a, s:score}) AS ranked
MERGE (t)-[w:RESOLVED_TO]->(ranked[0].a)
SET w.score = ranked[0].s, w.margin = ranked[0].s - ranked[1].s;
```
`algo.pageRank` supplies `r.pagerank` (emergent source trust). `algo.WCC` runs on the fork to report orphaned belief clusters — assertions whose entire provenance component vanished with the retracted source, which is the scariest line in the diff. `algo.BFS` gives the hop distance used in the per-hop trust decay.
**FalkorDB primitives, load-bearing:** **#6 `GRAPH.COPY` + the no-cross-graph-query LIMIT** (the limit is the product: the counterfactual cannot be a predicate, so it must be a fork) · #4 `pageRank`, `WCC`, `BFS` · #1 depth-bounded traversal with the non-parameterizable bound · #7 `RO_QUERY` for the consumer agent · #9 graph-level Redis `EXPIRE` to garbage-collect abandoned counterfactual forks (the only TTL FalkorDB actually has — per-node TTL doesn't exist, which is *why* throwaway state has to be a whole graph).
**Substitution test:** Remove FalkorDB and you lose instant server-side whole-database forking. In Postgres or Neo4j the counterfactual becomes a transaction you must roll back, serialising the demo and making concurrent what-ifs impossible; the fork-per-hypothesis model, and the one-click promote-the-fork rollback, simply stop existing.
**Proof surface (L15):** A stranger does it in 60s: pick any source in the list, hit "Retract", and watch a side-by-side diff of named winners appear with the fork's graph name printed. They can then open a second tab, retract a *different* source concurrently, and see two independent forks — proof the fork is real server state, not a UI simulation.
**Namable cheat closed in code:** Silent belief laundering. An agent cannot smuggle a conclusion into consensus and have it survive its source's removal — every consensus fact is reachable from the sources that produced it, so pulling the source necessarily re-opens the contest. There is no "the graph just knows it" orphan fact; `algo.WCC` enumerates them.
**Demo climax (U2):** "Retract `v1-spec.md`" → 0.4s later: **11 of 43 beliefs flip**, three of them flipping to an agent that was outvoted two days ago, and one belief cluster turning grey as *unsupported*. The judge sees the team change its mind.
**Lane:** CEILING
**Name-collision probe (L12):** No — rivals building "memory" do not build counterfactuals, and the shape only occurs to someone who hit the no-cross-graph wall and read `GRAPH.COPY`'s semantics. It is engine-knowledge-gated.
**7-hour build plan:**
- T+0:00–0:40 — Pinned container + volume; two-graph topology (`consensus` + per-agent); publication transport.
- T+0:40–2:00 — Ingest crew over public sources; provenance edges; pageRank; the arbitration statement; materialised `[:RESOLVED_TO]`.
- T+2:00–3:00 — **Riskiest part:** `GRAPH.COPY` under load + the diff path, including fork TTL via Redis `EXPIRE` on the graph key (#9 is undocumented — validate early, and if `EXPIRE` misbehaves, a reaper loop is the 10-minute fallback).
- T+3:00–4:15 — Retraction UI with the side-by-side verdict diff and the WCC orphan panel; promote-the-fork rollback.
- T+4:15–5:15 — `RO_QUERY` consumer agent answering live from consensus, visibly changing its answer after promotion (C-IN1).
- T+5:15–7:00 — Freeze, README + data model + queries artifact, Oracle VM deploy, video, disclosure.
**Mechanism families used:** F24 (cross-pollination: VCS/DB branch-and-diff → agent memory), F21 (closed-loop: detect poisoned source → remediate by promoting the fork), F37, F23.
**Why this is NOT the modal entry:** The modal entry writes memory forward. This one is the only entry that can *un-believe* something and show its work, and it exists in this shape only because a FalkorDB limitation forbade the easy version. Real humans: anyone who has ever had to answer "what else is wrong?" after a bad ingest.

---

### IDEA G2-3: MOTION — agents argue by submitting read-only Cypher, and the engine refuses the one that cheats
**One-line pitch:** Contesting agents may not assert trust and may not write to memory — each submits a `GRAPH.RO_QUERY` *evidence motion* that must return provenance paths, FalkorDB rejects any motion that tries to write, and a deterministic Cypher composite scores the paths that survive.
**Problem:** Every "agent memory" product lets the LLM write facts and then tries to trust-score them afterward. That is backwards: the model controls both the claim and the evidence for the claim. The containment boundary for LLM-authored graph access has to be the database server, not a prompt and not a regex.
**Primary user, day 1:** A developer-advocate running an agent crew that answers "what is the current recommended way to do X" from public docs across versions. Tuesday, two agents disagree, and she has no way to tell which one is reasoning from real sources and which one is confabulating a citation.
**Mechanism:** Writes to the shared memory go through one narrow ingest path that stamps provenance. Argument happens on a different channel entirely: a contesting agent (an LLM) composes a Cypher read that must return named paths `(:Assertion)-[:DERIVED_FROM*1..d]->(:Source)` supporting its value. Every motion is executed via `GRAPH.RO_QUERY`, so the server itself — not a linter — rejects `CREATE`/`MERGE`/`SET`/`DELETE`. The depth bound is the one thing the agent may *not* write, because **`*1..$d` cannot be parameterized (#1)**: the agent supplies an integer, a compiler validates it against a whitelist `{1,2,3}` and interpolates, closing the Cypher-injection surface that the limit creates. Returned paths are then scored by a deterministic composite the agent never touches; motions returning paths that reference source IDs not in the ingest ledger are discarded as fabricated citations.
**The arbitration function:** the motion returns evidence; the composite is fixed and server-side:
```cypher
// scoring harness — the agent's motion text is INLINED as $motionCypher's path result,
// never as the scoring logic
UNWIND $motionPaths AS pth
MATCH (a:Assertion) WHERE a.id = pth.head
MATCH (r:Source)    WHERE r.id = pth.root AND r.in_ingest_ledger
WITH a, collect(DISTINCT r) AS roots, pth
WITH a,
     size(roots)                                       AS corroboration,
     pow(0.5, (timestamp()-a.at)/$halflife)            AS recency,
     reduce(x=1.0, s IN roots | x * s.pagerank)        AS trust,
     min(pth.hops)                                     AS shortest
WITH a, (corroboration * recency * trust) / toFloat(shortest) AS score
ORDER BY score DESC LIMIT 1
MATCH (t:Topic {key:$k}) MERGE (t)-[w:RESOLVED_TO]->(a) SET w.score = score;
```
`algo.SPpaths` backs the motion template (shortest provenance paths to trusted roots — the shortest chain is the least-degraded one). `algo.dijkstra` with edge weight `-log(trust)` is the sharper variant: minimising summed `-log` maximises the *product* of per-hop trust, so Dijkstra literally returns the most-reliable provenance chain — this rides the CTO's 2026-10-12 pathfinding post directly. `algo.pageRank` again supplies emergent source trust. CCH (#5) is deliberately **not** used and the README says why: its preprocessing must re-run on every mutation, which is wrong for a continuously-written memory graph.
**FalkorDB primitives, load-bearing:** **#7 `GRAPH.RO_QUERY`** (the only real containment boundary — and **its LIMIT: the TypeScript client has no binding (#408)**, which forces the arbitration service to be Python, a real, defensible architecture decision rather than a stack preference) · **#1's non-parameterizable depth bound as the named injection surface the product exists to close** · #4 `dijkstra`, `SPpaths`, `pageRank` · #10's missing default retries, wrapped explicitly so a reconnect doesn't kill a live motion.
**Substitution test:** Remove FalkorDB and the safety property evaporates — there is no server-enforced read-only execution of agent-authored graph queries, so "the model cannot write to memory while arguing" becomes a promise instead of a boundary. The judge's question "what stops the agent from just writing a high-trust source?" has no answer.
**Proof surface (L15):** A stranger pastes their own Cypher into the **Adversary Console** and presses Submit. A write attempt returns the server's own error, verbatim, with the `GRAPH.RO_QUERY` command shown; a `*1..$d` injection attempt (`3] WITH 1 AS x MATCH (n) DETACH DELETE n //`) is rejected by the whitelist compiler with the rejected string displayed. 60 seconds, two refusals, both real.
**Namable cheat closed in code:** Self-authorised trust. An agent cannot create a source, cannot set a trust property, cannot cite a source that isn't in the ingest ledger, and cannot widen its own traversal depth. Its entire influence is "which real paths do I point at" — the arbitration weight is structurally out of its reach.
**Demo climax (U2):** Agent B's motion contains a sneaky `MERGE (:Source {trust:1.0})`. The console turns red with FalkorDB's own write-rejection, the motion is forfeited, and the engine names Agent A's value as the winner — with Agent A's shortest Dijkstra provenance chain drawn underneath. **The refusal is the money moment.**
**Lane:** CEILING
**Name-collision probe (L12):** No. 41% of the field ships an MCP server that hands the LLM a graph; essentially nobody inverts it into "the LLM may only read, and the read itself is the argument." Rivals would have to have hit both #408 and the `*1..$d` error to arrive here.
**7-hour build plan:**
- T+0:00–0:40 — Pinned container, schema, ingest ledger over public sources only.
- T+0:40–1:30 — **Riskiest part first:** prove `GRAPH.RO_QUERY` rejects writes through `falkordb` 1.8.0 exactly as expected, and prove the depth-bound compiler rejects a real injection string. If RO_QUERY behaves unexpectedly, the whole thesis changes — know by T+1:30.
- T+1:30–3:00 — Motion protocol + LLM agents that compose Cypher; citation-ledger check; `pageRank` + `dijkstra(-log trust)` scoring; `[:RESOLVED_TO]`.
- T+3:00–4:30 — Adversary Console (guest-open, no login) + verdict view with the winning chain.
- T+4:30–5:15 — Consumer agent answering only from resolved facts (C-IN1).
- T+5:15–7:00 — Freeze, README + data model + the Cypher/algorithm artifact (this one writes itself — the motions *are* the artifact), deploy, video, disclosure.
**Mechanism families used:** F22 (make the dangerous action unrepresentable), F37 (LLM demoted beneath a deterministic resolver), F25 (hand-roll the sponsor's hardest guarantee — safe LLM-authored Cypher — and make it the one-line pitch), F23.
**Why this is NOT the modal entry:** It is the only entry where the sponsor's product is the *security boundary* rather than the storage. Against the kill list: not contradiction-detection, not recency, not human escalation; and unlike Quorum, the agent literally cannot reach the ranking, because the ranking runs in a process the agent has no write channel to.

---

### IDEA G2-4: SAMEAS — you cannot arbitrate a contradiction you cannot see
**One-line pitch:** Two agents only *appear* to agree because they named the same thing differently — the graph neighbourhood does the blocking, `levenshtein()` inside Cypher does the matching, and only then does the engine discover there was a contradiction and name a winner.
**Problem:** Multi-agent memory silently stores `Aurora-7`, `aurora7` and `Project Aurora (v7)` as three entities. The contradictions between them are invisible, so arbitration never fires and the memory looks clean while being wrong. Entity resolution is the precondition everyone skips.
**Primary user, day 1:** A support-ops lead whose three ingest agents read a public product's docs site, public changelog and public forum. Tuesday, the bot confidently gives two different answers to the same question depending on which spelling the customer used.
**Mechanism:** On ingest, each entity mention gets a `(:Mention)` node linked to its source and its asserting agent. Candidate generation is a *graph* operation, not a string operation: two mentions are candidates only if they are within 2 hops through shared sources, shared topics, or co-occurring assertions. FalkorDB has **no fuzzy index (#15)** and full-text prefix matching only at the end of a word (**#3**), so an all-pairs fuzzy scan is impossible at any real size — the traversal *is* the blocking key, which is precisely the design the limit forces. `levenshtein()`/`jaroWinkler()` then run per-row over that small candidate set inside the same Cypher statement, `algo.WCC` closes the match graph into resolved entity clusters, and contradictions that were invisible pre-resolution become contested topics that the composite arbitrates.
**The arbitration function:**
```cypher
// A. graph-blocked fuzzy resolution — one statement, no index needed
MATCH (m1:Mention)-[:FROM|ABOUT*1..2]-(m2:Mention)
WHERE id(m1) < id(m2) AND abs(size(m1.text)-size(m2.text)) <= 4
WITH m1, m2, jaroWinkler(toLower(m1.text), toLower(m2.text)) AS jw,
             levenshtein(toLower(m1.text), toLower(m2.text)) AS lev
WHERE jw >= 0.92 OR lev <= 2
MERGE (m1)-[:SAME_AS {jw:jw, lev:lev}]->(m2);

CALL algo.WCC({relationshipTypes:['SAME_AS']}) YIELD node, componentId
SET node.entity = componentId;      // clusters become canonical entities

// B. now the contradiction exists — arbitrate it
MATCH (e)<-[:MENTIONS]-(a:Assertion)-[:ABOUT]->(t:Topic)
WITH t, a, a.value AS v
MATCH (a)-[:DERIVED_FROM*1..3]->(r:Source) WHERE r.root
WITH t, a, count(DISTINCT r) AS corrob,
        pow(0.5,(timestamp()-a.at)/$halflife) AS rec,
        avg(r.pagerank) AS trust
WITH t, a, corrob*rec*trust AS score ORDER BY score DESC
WITH t, collect({a:a,s:score}) AS r
MERGE (t)-[w:RESOLVED_TO]->(r[0].a) SET w.score=r[0].s, w.margin=r[0].s-r[1].s;
```
`algo.WCC` (not labelPropagation — **labelPropagation is non-deterministic (#4)** and a verdict pipeline must be reproducible; the README says exactly this, and it is a one-line answer that shows engine literacy). `algo.pageRank` for emergent source trust. `algo.BFS` drives the 2-hop blocking expansion.
**FalkorDB primitives, load-bearing:** **#15 Flex UDF `levenshtein`/`jaroWinkler` with its LIMIT — per-row, no fuzzy index** (the reason blocking must be a traversal) · **#3 full-text's end-of-word-only prefix limit** (why full-text alone can't do this) · #4 `WCC` chosen over non-deterministic `labelPropagation` · #2 vector KNN used *only* as an optional second recall channel, with the **#2233 plain-Python-list silent index bypass** explicitly guarded by passing a typed vector — a bug the README documents.
**Substitution test:** Remove FalkorDB and both halves die at once: there is no fuzzy string function callable inside the traversal, so blocking and matching split into two systems with a round-trip between them, and the WCC clustering leaves the database. The product's whole claim — resolution and arbitration in one engine, one statement each — is gone.
**Proof surface (L15):** A stranger types a new misspelling of a known entity into the ask box; within one ingest tick the entity count stays flat, the mention joins an existing cluster with its `jw` score shown, and if that mention carried a conflicting value, a **new contested topic appears and is resolved on screen**. Also a "resolution off" toggle that re-runs with `SAME_AS` suppressed and shows the contradiction disappearing — the falsification path.
**Namable cheat closed in code:** Contradiction-hiding by renaming. An agent (or a sloppy source) cannot dodge arbitration by referring to the subject differently; the cluster pulls it back into the contest. Equally, the system cannot claim a clean memory by under-resolving — the toggle makes the hidden contradictions countable.
**Demo climax (U2):** The counter reads **"0 contradictions"**. Resolution runs. It flips to **"7 contradictions, 7 resolved"** and the list fills with pairs the judge can see are obviously the same thing under two names.
**Lane:** FLOOR
**Name-collision probe (L12):** No on the name; mild yes on the *topic* — entity resolution is a known GraphRAG chore. The defence is that nobody else frames it as the *precondition for arbitration*, and nobody else is forced into graph-blocking by the absence of a fuzzy index.
**7-hour build plan:**
- T+0:00–0:30 — Pinned container + volume; mention/assertion/source schema; ingest from three public corpora.
- T+0:30–1:15 — **Riskiest part:** confirm `levenshtein()`/`jaroWinkler()` actually resolve in `v4.22.1` (#15 is undocumented). If either is missing, fall back inside this window to a trigram-overlap expression written in pure Cypher using `split()` + `reduce()` — the design survives, the UDF does not.
- T+1:15–2:30 — Blocking traversal + SAME_AS + WCC clustering; canonical entity view.
- T+2:30–3:45 — Arbitration composite + `[:RESOLVED_TO]`; pageRank pass.
- T+3:45–5:00 — UI: the 0→7 counter, the resolution-off toggle, per-pair `jw`/`lev` evidence, the resolved-verdict list; `RO_QUERY` consumer agent answering from resolved facts (C-IN1).
- T+5:00–7:00 — Freeze, README + data model + queries artifact, deploy, video, disclosure.
**Mechanism families used:** F37, F23 (toggle-driven self-falsification), F21 (detect→resolve→arbitrate as one closed loop), F25 (the `labelPropagation`-is-non-deterministic choice as a visible engine-literacy signal).
**Why this is NOT the modal entry:** It attacks the step before everyone else's starting line, and it is the lowest-variance of the four — every component is a single Cypher statement with a named fallback, so the headline loop is physically guaranteed to be live at the bell. Real humans: anyone whose agents already have a memory graph and have never once checked whether its entities are real.agentId: aa7994530a551e53f (use SendMessage with to: 'aa7994530a551e53f' to continue this agent)
<usage>subagent_tokens: 74370
tool_uses: 1
duration_ms: 256231</usage>

---

## Generator G3 — live competitive field

Read both injection files. Working sheet of mechanism families I drew from (≥6, named per-idea below): **F37** deterministic resolver / engine-as-truth · **F23** guest-verifiable recompute proof surface *(whitespace-aimed: only 18/267 rivals even have deploy+video)* · **F25** sponsor's-hardest-guarantee hand-rolled *(<90-day primitive: Lipman's Dijkstra/A*/CCH post, 6 days old)* · **F26** multi-primitive stack on one causal path *(<90-day primitive)* · **F24** systems-insight port *(cross-pollination: incremental build-graph invalidation → belief recompute)* · **F21** closed-loop detect→diagnose→remediate · **F22** structural-safety / unrepresentable cheat · **F17** guardian gate *(whitespace-aimed: arbitration as a write barrier, zero rivals)*. Law anchors: L1 density inversion, L2 enforced-not-asserted (epistemic stake, no chain), L3 one primitive IS the product, L12 name-collision, L14 60-second "oh", L15 proof surface.

---

### IDEA G3-1: HEADWATER
**One-line pitch:** Five agents saying the same thing is not five pieces of evidence — Headwater runs max-flow over the provenance graph to count how many *independent* sources a claim actually has, and lets the lone claim with two real headwaters beat the echo chamber of five.
**Cluster aimed at:** Sybil/echo-chamber-resistant corroboration. **Zero occupants.** Every rival that counts corroboration at all (Quorum's `corroboration_eval`, tollbooth-graph's integrity query, memory-relay's freshness dimension) counts *assertions* or *agents* — none de-duplicates shared ancestry. Also zero rivals use any of the 11 graph algorithms as the decision engine; the field is all plain `MATCH` traversals. Double whitespace.
**Problem:** In a multi-agent system the same upstream artifact gets read by five agents, which then each assert it as an independent finding. Naive corroboration counting turns one stale doc into a 5-vote majority, and the lone agent that actually re-derived the truth from two fresh independent sources loses. Agreement among agents is cheap; *independence* of evidence is the thing that is scarce, and nothing in the field measures it.
**Primary user, day 1:** The platform engineer at a 40-person SaaS who has four agents (a log-triage agent, a deploy-diff agent, a customer-ticket agent, a metrics agent) writing into one shared memory. Tuesday 3pm: three of them "independently" blame the 14:02 deploy — because all three read the same incident summary the first one wrote. The fourth, reading Grafana and the DB slow-log directly, says it's the connection pool. Today he reads four bullet points and guesses.
**Mechanism:** Every assertion is written as `(:Agent)-[:ASSERTED {at, stated_confidence}]->(:Claim)`, and every claim must declare `(:Claim)-[:DERIVED_FROM*]->(:Source)` ancestry at write time or the write is rejected. Claims with identical `(subject, predicate)` and differing `object` are auto-linked `[:RIVALS]` by a uniqueness-constrained merge. Arbitration projects the provenance DAG into a flow network: a synthetic `(:Superspring)` node connects to every root `(:Source)` with **capacity 1**, all internal `SUPPORTS` edges get capacity 100. `algo.maxFlow` from Superspring to the claim therefore returns exactly the number of vertex-disjoint evidence paths — the count of genuine headwaters — no matter how many agents echoed in between. That integer multiplies a recency-decayed, path-length-discounted trust sum, the higher product wins, and the loser is marked `[:OUTRANKED_BY]` rather than deleted. No human is in the loop; no LLM sees the number.
**The arbitration function:** Inputs: per-root `Source.trust ∈ (0,1]`, assertion age in days, provenance path length, independence flow.
```
// per rival claim c
CALL algo.maxFlow({sourceNode:$spring, sinkNode:c, relationshipTypes:['FLOWS'],
                   weightProperty:'cap'}) YIELD flow AS independence
MATCH p = allShortestPaths((s:Source)-[:SUPPORTS*1..6]->(c))
WITH c, independence, s, length(p) AS hops,
     duration.inDays(s.observed_at, datetime()).days AS age
WITH c, independence,
     sum( s.trust * exp(-0.0231 * age) / (1.0 + hops) ) AS corroboration
RETURN c.id, independence * corroboration AS score
ORDER BY score DESC
```
`0.0231 = ln2/30` → a 30-day trust half-life. Winner = rank 1; `margin = (s1-s2)/s1`; `margin < 0.15` writes an `UNDECIDED` verdict instead of a winner. Note the `*1..6` is a literal, not a parameter — FalkorDB forbids parameterised variable-length bounds, and the README says so.
**FalkorDB primitives, load-bearing:** `algo.maxFlow` (the independence count — nothing else computes it), `allShortestPaths` + named paths (hop discount), unique + mandatory constraints (no claim without ancestry, no duplicate rival edge), `GRAPH.RO_QUERY` for the public proof endpoint, full-text index on claim subjects for the write-time rival lookup.
**Substitution test:** With Postgres, counting vertex-disjoint provenance paths means hand-writing a Ford-Fulkerson over recursive CTEs — the single most expensive part of the product becomes the whole product. With a vector store it is not expressible at all: embeddings have no ancestry. Remove FalkorDB and the headline number ceases to exist.
**Head-to-head vs Quorum:** Quorum needs a human to say "this was wrong." Headwater shows two *uncorrected* rivals, five assertions vs one, and the graph picking the one — because flow said 5 assertions = 1 headwater. Quorum has no independence measure and states its ranking blend runs in the API process; Headwater's score is produced by `algo.maxFlow` inside the database and the proof page prints the query.
**Head-to-head vs agentmesh:** README line 1 is *"Agreement is cheap. Headwater counts independent headwaters with max-flow and names a winner."* The words "contradiction," "shared memory," and "`CONTRADICTS`" appear nowhere above the fold.
**Proof surface (L15):** A stranger verifies in 60 seconds by opening `/verify/<verdictId>` — the page shows the two rival claims, prints the exact Cypher, re-runs it live against `GRAPH.RO_QUERY` in front of them, and renders the flow network with the five echo edges collapsing onto one capacity-1 spring edge. A "clone an agent 5×" button adds five more echoing assertions live; the score does not move, and the page turns RED if the stored score ever differs from the recomputed one.
**Namable cheat closed in code:** *Sybil corroboration* — spin up N agents that all repeat you. Structurally impossible: capacity-1 lives on the `Source→` edge, not the agent edge, so agent count cannot enter the score. The write API has no `score`, `trust`, or `weight` field in its schema; the only writer of `Verdict.score` is the arbitration procedure.
**Demo climax (U2):** The counter reads "ASSERTIONS 5 — HEADWATERS 1" while the single dissenting claim slides to the top with a green WINNER badge, and nobody clicked anything.
**Lane:** CEILING
**Name-collision probe (L12):** No. Zero of the 15 profiled repos use a hydrological metaphor; the field's naming attractor is `*-mem*`, `*-graph`, `*mesh`, `*-guard`. Three rivals would not independently land on "Headwater."
**7-hour build plan:**
- **12:30–13:15** Schema + constraints + seed loader; the incident-triage fixture with the 5-echo/1-independent setup hand-authored as JSON. Repo public, README skeleton, `schema.cypher` committed (eligibility first).
- **13:15–14:45** Flow projection + `algo.maxFlow` arbitration query working in `redis-cli`. **Riskiest part: `algo.maxFlow`'s exact signature and whether capacity must be a relationship property on a projected rel-type.** Timebox 45 min; fallback is `allShortestPaths` + root-set cardinality (`count(DISTINCT s)`), which still beats every rival but loses the flow headline — decide at 14:00, not later.
- **14:45–16:00** Write API with the ancestry-mandatory gate + four live agents (Claude-driven, each with a distinct tool) asserting into the graph.
- **16:00–17:15** UI: rival pane, flow visualisation, score breakdown, the clone-5-agents button.
- **17:15–18:00** `/verify` recompute endpoint + RED-on-mismatch; deploy to the Oracle VM behind the existing domain.
- **18:00–18:50** 150s video: echo chamber → verdict → clone-5× → score unmoved.
- **18:50–19:25** Track-02 mapping table, Cypher artifact doc, AI-disclosure, submit.
**Mechanism families used:** F25 (algorithms = FalkorDB's hardest guarantee, hand-rolled on the hero path) · F26 (maxFlow + allShortestPaths + constraints + full-text, all non-removable) · F37 (engine decides, LLM only writes claims) · F23 (recompute-or-RED) · F22 (score unrepresentable in the write schema).

---

### IDEA G3-2: TIDEMARK
**One-line pitch:** Nobody tells Tidemark which sources to trust — trust is PageRank over who has been right, so when one ground-truth fact lands, old verdicts re-arbitrate and flip themselves with no human in the room.
**Cluster aimed at:** *Earned, self-recalibrating* source trust. **Zero occupants.** Every rival that has a trust number takes it as a config constant or an agent-declared confidence. Quorum's propagation is triggered by a human correction; ninaivu's `SUPERSEDES` is time-only; Nithin's memory-relay lists provenance as a policy dimension with a README far ahead of its 3 commits. Nobody closes the outcome→trust→verdict loop, and nobody uses `algo.pageRank`.
**Problem:** Source-trust weights are the load-bearing input to every arbitration scheme in this field, and every one of them hardcodes them. A system that lets you type `trust: 0.9` next to your favourite source has not solved arbitration, it has relocated the human judgement one file to the left. Worse, trust is not static: a scraper that was reliable in March starts returning a changed DOM in October and no shared memory notices.
**Primary user, day 1:** A market-research analyst at a 12-person fund running six scraper/summariser agents over filings, earnings transcripts, vendor APIs and two paid data feeds. Tuesday 4pm the agents disagree on a headcount number. Thursday the 10-Q lands with the real figure. Today that ground truth updates one cell in one note; nothing in her memory learns that the vendor API has been wrong four quarters running.
**Mechanism:** Sources earn and lose standing through a `(:Source)-[:VINDICATED_BY|:FALSIFIED_BY]->(:Outcome)` ledger that only an `(:Oracle)`-labelled writer (a ground-truth event, not an opinion) may create. Trust is `algo.pageRank` over a derived `(:Source)-[:UPHELD]->(:Source)` graph, where an UPHELD edge is minted whenever source A's lineage was on the winning side of a verdict that a later oracle fact confirmed. When an oracle fact arrives, the system walks every `SUPPORTS*1..8` descendant of the affected sources to find exactly which verdicts are downstream, re-runs PageRank, and re-arbitrates only those — verdicts whose winner changes are stamped `[:FLIPPED_AT]` and broadcast to subscribed agents. The flip is autonomous: the oracle supplies a *fact*, never a verdict, and never names a source. L2 with no chain: the bad actor's loss is its own standing, seized by the graph, not asserted by an operator.
**The arbitration function:** Two-stage. Stage 1 (trust): `CALL algo.pageRank({relationshipTypes:['UPHELD'], dampingFactor:0.85, iterations:20}) YIELD node, score` → written to `Source.trust`, min-max normalised into `[0.05, 1.0]` so a cold source is never zero and never one. Stage 2 (verdict), unchanged in shape from the standard composite but with *earned* trust as input:
```
MATCH (c:Claim)-[:RIVALS]-(:Claim) WHERE c.id IN $affected
MATCH p = (s:Source)-[:SUPPORTS*1..8]->(c)
WITH c, s, min(length(p)) AS hops,
     duration.inDays(s.observed_at, datetime()).days AS age
WITH c, count(DISTINCT s) AS breadth,
     sum( s.trust * exp(-0.0231*age) * pow(0.8, hops-1) ) AS support
RETURN c.id, breadth * support AS score ORDER BY score DESC
```
Flip rule: if `argmax` differs from the stored winner AND `margin > 0.15`, write the flip; if `margin ≤ 0.15`, demote to `UNDECIDED` rather than silently swapping. `$affected` is computed by reachability, never by rescanning the graph.
**FalkorDB primitives, load-bearing:** `algo.pageRank` (trust itself), multi-hop reachability for the affected-set, unique constraint on `(Source,Outcome)` pairs so one outcome cannot be double-counted, `GRAPH.RO_QUERY` for the public trust table, `algo.betweenness` on the ops page to show which sources carry the graph.
**Substitution test:** Remove FalkorDB and you lose both halves simultaneously: PageRank over an endorsement graph becomes an iterative join loop in application code, and the reachability-scoped affected-set becomes a full table rescan on every oracle fact. The product's two distinguishing claims — *earned* trust and *incremental* flips — are both graph-native.
**Head-to-head vs Quorum:** Quorum's lineage propagation starts from a human saying "this fact is wrong." Tidemark's starts from a fact that says nothing about any claim, and the graph derives on its own which sources lost standing and which old verdicts must flip. Quorum cannot show a verdict changing without a human in the frame.
**Head-to-head vs agentmesh:** README line 1 is *"Trust is not configured. It is earned: PageRank over who has been right, recomputed every time reality answers."* No contradiction vocabulary at all above the fold.
**Proof surface (L15):** A stranger verifies in 60 seconds at `/trust` — a live table of every source's PageRank score with a "show the walk" link that renders the UPHELD edges that produced it, plus a `curl` one-liner in the README that returns the same numbers from the read-only endpoint. The falsification is an "inject oracle fact" form on the public page: submit the real figure, watch the trust column reorder and one archived verdict flip, timestamped.
**Namable cheat closed in code:** *Trust laundering by self-endorsement* — a source citing itself, or two sources reciprocally citing, to pump PageRank. Closed structurally: UPHELD edges are never written by the ingest API (there is no endpoint), only minted by the oracle-close procedure; self-edges are rejected by a `WHERE a <> b` guard plus a unique constraint, and a 2-cycle contributes to both nodes' scores only through the damping factor, which is bounded. Agent-declared `confidence` is stored and displayed but multiplied by zero in the scorer — the README says so out loud.
**Demo climax (U2):** A verdict decided 20 minutes earlier, sitting in the archive with a green badge, turns amber and re-labels itself FLIPPED while the operator's hands are off the keyboard — because one number arrived from reality.
**Lane:** CEILING
**Name-collision probe (L12):** No. The field's trust-flavoured names are `*-guard`, `*-relay`, `quorum`, `tether`. "Tidemark" reads as a high-water record of past correctness and has no FalkorDB/agent-memory prior art.
**7-hour build plan:**
- **12:30–13:10** Schema, constraints, public repo, `schema.cypher`, README headline fixed in commit 1 (anti-drift).
- **13:10–14:20** `algo.pageRank` trust stage proven in `redis-cli` against a seeded 9-source endorsement graph.
- **14:20–15:40** Oracle-close procedure: outcome → UPHELD minting → affected-set reachability → re-arbitration. **Riskiest part: the flip must be visibly autonomous. If the affected-set query is slow or the flip needs a manual trigger the whole thesis collapses** — fallback is a 3-second poller on the verdict table, explicitly disclosed as a poller in the README.
- **15:40–16:50** Live agents asserting + the oracle inject form; UI with trust table and verdict archive.
- **16:50–17:50** `/trust` + `/verify` recompute endpoints, deploy to Oracle VM.
- **17:50–18:45** 150s video with the flip as the final shot, held in silence for 4 seconds.
- **18:45–19:25** Artifact doc, track mapping, AI disclosure, submit.
**Mechanism families used:** F25 (PageRank as the sponsor's hardest guarantee, on the hero path) · F21 (closed loop: detect → re-rank → *remediate the verdict*, not just alert) · F37 (oracle supplies facts, engine supplies verdicts, LLM supplies neither) · F23 (public recompute of the trust table) · L2 (the bad source's standing is seized, not asserted).

---

### IDEA G3-3: HAIRLINE
**One-line pitch:** Hairline sits between an acting agent and its next write: it runs Dijkstra over a trust-weighted provenance graph to find each rival claim's cheapest path back to a real source, and when the two paths land within a hairline of each other it refuses to decide and the agent stops.
**Cluster aimed at:** Arbitration as a **blocking admission gate with first-class abstention**, in front of a live consuming agent. **Zero occupants.** sanskar21gusain/tether does allow/block/reroute for *dataflow governance* (not arbitration between rivals, no scoring, created today, 19 commits); Nithin's memory-relay describes an 8-dimension admission policy but the code is 3 commits. Nobody in the field has `UNDECIDED` as a decision, and nobody uses `algo.SPpaths`/`algo.dijkstra` — the exact primitive Lipman posted about six days ago.
**Problem:** Every rival in this field produces a *report*: a conflict list, a verdict page, a trust dashboard. Nothing in the field ever stops an agent. And the far more dangerous case than a wrong winner is a *confidently named* winner when the evidence is 51/49 — an arbitration system that always answers is a system that launders coin flips into facts. Abstention has to be a return value, not an error.
**Primary user, day 1:** The solo founder running a three-agent support stack — an ingest agent reading Intercom, a docs agent reading the knowledge base, a reply agent that drafts customer answers. Tuesday 11am the ingest agent has learned "the Pro plan includes SSO" from a stale sales thread and the docs agent has "SSO is Enterprise-only" from the pricing page. The reply agent does not know there is a conflict and tells a customer the wrong thing. He finds out from the refund request.
**Mechanism:** The consuming agent cannot read shared memory directly; it reads through a resolver that, for every `(subject, predicate)` it touches, checks for `[:RIVALS]` edges. If rivals exist, arbitration runs before the read returns. Edge weights on the provenance DAG are `w = -ln(trust)` clamped to `[0.01, 5.0]`, so `algo.SPpaths` returns the *maximum-product-trust* derivation chain — the cheapest path is literally the most trustworthy story the graph can tell for that claim, and the path itself is the explanation the UI renders. Score combines that path cost with recency and independent-root breadth; the margin between rank 1 and rank 2 is the hairline. Above threshold the resolver returns the winner plus the winning path; below it, the resolver returns `UNDECIDED` and the reply agent's draft tool is *not called* — it emits a one-line escalation instead. The refusal is the product (F17/F37).
**The arbitration function:**
```
// weights written once at ingest: r.w = -log(coalesce(src.trust,0.5)) clamped [0.01,5.0]
MATCH (c:Claim) WHERE c.id IN $rivals
MATCH (s:Source) WHERE (s)-[:SUPPORTS*1..7]->(c)
CALL algo.SPpaths({sourceNode:s, targetNode:c, relTypes:['SUPPORTS'],
                   weightProp:'w', pathCount:1}) YIELD path, pathWeight
WITH c, s, pathWeight,
     duration.inDays(s.observed_at, datetime()).days AS age
WITH c, count(DISTINCT s) AS roots,
     max( exp(-pathWeight) * exp(-0.0231*age) ) AS best_chain,
     sum( exp(-pathWeight) * exp(-0.0231*age) ) AS total_chain
RETURN c.id, (0.6*best_chain + 0.4*total_chain) * log(1+roots) AS score
ORDER BY score DESC
```
Then `margin = (s1 - s2) / s1`. `margin ≥ 0.15` → `WINNER`, write `(:Verdict {winner, margin, path})`. `margin < 0.15` → `UNDECIDED`, write the same verdict node with `winner: null` and the two tied paths attached. The gate returns HTTP 409 with the UNDECIDED verdict; the agent's tool call never fires.
**FalkorDB primitives, load-bearing:** `algo.SPpaths` / `algo.dijkstra` with a weight property (the entire scoring spine — six days old on the sponsor's blog), named paths returned to the UI as the explanation, mandatory constraint forcing every `SUPPORTS` edge to carry `w`, unique constraint on `(subject,predicate,object)` claims, full-text index for the rival lookup on the read path.
**Substitution test:** Remove FalkorDB and the gate loses its explanation: a key-value or SQL store can return a winner but cannot return *the path*, which is both the score's basis and the entire UI. Dijkstra over `-ln(trust)` in application code means loading the subgraph per read — the gate is on the hot path of every agent read, so this is a latency failure, not an inconvenience.
**Head-to-head vs Quorum:** Quorum quarantines after the fact; Hairline refuses *before* the act. Quorum has no abstention state and no consuming agent whose behaviour changes — its demo cannot show an agent being stopped by a tie it could not break, because Quorum has no tie-breaking score and nothing downstream to stop.
**Head-to-head vs agentmesh:** README line 1 is *"Hairline is the gate your agent reads through. It names a winner with Dijkstra — or says UNDECIDED and refuses to let the write happen."* agentmesh's framing is detect-and-preserve-both; Hairline's framing is act/don't-act.
**Proof surface (L15):** A stranger verifies in 60 seconds by hitting the public `/gate` playground: three preset conflicts — one clear winner, one hairline tie, one single-source claim. Each returns the JSON the real agent receives (verdict, margin, the winning Cypher path, the raw query text), and the UI renders the two competing chains side by side with the per-edge `-ln(trust)` costs summing visibly to each score. Nudge a slider on one source's trust and watch a WINNER collapse into UNDECIDED at the exact threshold crossing.
**Namable cheat closed in code:** *The system always answers* — the comfortable failure of every scorer. Closed by making `winner` a nullable field whose non-null write is guarded by the margin check inside the resolver, and by the consuming agent having **no fallback path**: its draft tool is only registered when the gate returns 200. There is no `force` parameter, no override env var, and the LLM never sees the two scores — only `WINNER`/`UNDECIDED` and the path. A model that wanted to break the tie structurally cannot.
**Demo climax (U2):** The reply agent is mid-draft, the gate returns margin 0.04, the draft panel greys out and the banner reads **UNDECIDED — 0.04 < 0.15 — not enough daylight**, and the agent writes an escalation instead of a wrong answer to a customer.
**Lane:** FLOOR — this is the load-bearing-integration lane done at maximum depth: the sponsor's newest algorithm sits on the hot read path of every agent operation.
**Name-collision probe (L12):** No. "Hairline" names the *margin*, which is a concept no rival has; the field's names describe memory, meshes and guards. Three rivals would not pick it because three rivals do not have the idea.
**7-hour build plan:**
- **12:30–13:05** Repo public, schema + `w`-mandatory constraint, `schema.cypher`, three preset conflict fixtures authored (the hairline one tuned to margin ≈ 0.04).
- **13:05–14:20** `algo.SPpaths` proven in `redis-cli`; confirm it returns both `path` and `pathWeight` with a weight property. **Riskiest part: `algo.SPpaths` argument naming and whether weighted paths are returned as traversable path objects.** Hard 40-minute timebox; fallback is `algo.dijkstra` for the cost plus a separate `allShortestPaths` for the displayable chain — slightly less elegant, identical demo.
- **14:20–15:30** The gate: resolver service, 200/409 contract, the consuming reply-agent with its tool conditionally registered.
- **15:30–16:50** UI: side-by-side chains with per-edge costs, the trust slider, the grey-out moment. This is the U2 surface — budget the craft here, never flat.
- **16:50–17:40** `/gate` public playground + README Cypher artifact; deploy to Oracle VM.
- **17:40–18:40** 150s video ending on the refusal, held.
- **18:40–19:25** Track-02 mapping, AI disclosure, submit.
**Mechanism families used:** F17 (guardian gate, refusal as the money-moment) · F25 (the six-day-old Dijkstra primitive hand-wired onto the hero path) · F37 (engine decides, LLM never sees the scores, fail-closed to UNDECIDED) · F23 (guest-runnable gate playground that recomputes) · F22 (no override parameter exists).

---

### IDEA G3-4: KEYSTONE
**One-line pitch:** Keystone forks the live memory graph server-side, deletes one source from the twin, re-arbitrates, and tells you which beliefs your agents hold *only* because of that source — before it turns out to be wrong.
**Cluster aimed at:** Counterfactual source-removal / load-bearing-evidence analysis, plus incremental re-arbitration. **Near-empty.** BishtNikhil's memory-mesh has copy-on-write *sandboxes* (isolation for writes — a different use), and Quorum does *post-hoc* blast radius after a human correction. Nobody computes blast radius **before** anything is known to be wrong, nobody uses `GRAPH.COPY`, and nobody uses `algo.betweenness`.
**Problem:** A shared agent memory accretes thousands of derived beliefs over one vendor API, one scraped doc, one model's output. When that root turns out to be wrong — which is a Tuesday, not a black swan — nobody can say what is contaminated, so teams either trust everything or wipe everything. And the question you actually want answered is the forward one: *which of my sources, if it broke tomorrow, takes the most of my memory down with it?* That is a graph question nobody in this field is asking.
**Primary user, day 1:** The data lead at a logistics startup whose pricing agents have built up ~1,400 derived facts over six feeds — two paid APIs, three internal services, one partner CSV that a human emails weekly. Tuesday she gets told the partner is changing format Friday. Today she has no way to know whether that CSV underpins 4 beliefs or 400, so the migration is a guess.
**Mechanism:** The live graph is never mutated for analysis. `GRAPH.COPY live → twin:{jobId}` forks server-side; the twin has the candidate source's node and its `SUPPORTS` edges deleted; arbitration re-runs **only over the affected set** — the verdicts reachable from the deleted source, found by `SUPPORTS*1..8` reachability, not by rescanning. Because FalkorDB has no cross-graph queries, the diff is done honestly: the service queries `live` and `twin` separately and diffs the verdict tables in the app, and the README names this constraint as a design input rather than hiding it. `algo.betweenness` over the provenance DAG pre-ranks candidate keystones so the expensive fork is only run on the top few. The headline number is the incremental one — *1 source removed → 11 verdicts recomputed, 1,389 untouched, 3 flipped* — which is the build-graph insight (your compiler does not rebuild the project when you edit one file) ported to belief maintenance.
**The arbitration function:** Same deterministic composite run twice, once per graph; the *product* is the diff.
```
// affected set, on either graph
MATCH (s:Source {id:$dropped})-[:SUPPORTS*1..8]->(c:Claim)<-[:ABOUT]-(v:Verdict)
WITH collect(DISTINCT v.id) AS affected
// re-arbitration, per rival group in `affected`
MATCH (c:Claim)-[:RIVALS]-(:Claim), p=(src:Source)-[:SUPPORTS*1..8]->(c)
WITH c, src, min(length(p)) AS hops,
     duration.inDays(src.observed_at, datetime()).days AS age
WITH c, count(DISTINCT src) AS roots,
     sum( src.trust * exp(-0.0231*age) * pow(0.8, hops-1) ) AS support
RETURN c.id, roots * support AS score ORDER BY score DESC
```
Keystone score of a source = `(verdicts whose winner changes) + 2 × (verdicts that fall to UNDECIDED, margin < 0.15) + 3 × (claims left with zero surviving roots)` — orphaning is weighted hardest because an orphaned belief is one nothing supports at all. Pre-ranking is `algo.betweenness` on the `SUPPORTS` projection.
**FalkorDB primitives, load-bearing:** server-side `GRAPH.COPY` (the fork — the entire mechanism), `algo.betweenness` (candidate pre-ranking), multi-hop reachability for the affected set, multiple named graphs with the no-cross-graph-query constraint shaping the architecture, `GRAPH.RO_QUERY` for the public twin inspection.
**Substitution test:** Without FalkorDB there is no server-side fork: you either mutate production and roll back (unacceptable on live agent memory) or export/reimport thousands of nodes per counterfactual, which turns a 2-second demo into a coffee break. `GRAPH.COPY` is the one primitive the product cannot be written around.
**Head-to-head vs Quorum:** Quorum answers "a human said X is wrong — what else is wrong?" Keystone answers "nothing is known to be wrong — which source is load-bearing, and what *would* flip?" Quorum has no fork, no counterfactual, and no pre-emptive ranking; its blast radius is a consequence, Keystone's is a forecast.
**Head-to-head vs agentmesh:** README line 1 is *"Pull a source out of a forked copy of your agents' memory and see exactly which beliefs fall over. Server-side `GRAPH.COPY`, re-arbitrated in Cypher, 2 seconds."* No "contradiction," no "shared memory," no "mesh."
**Proof surface (L15):** A stranger verifies in 60 seconds by clicking any source on the public page: the UI shows the fork being created (the twin's graph name is printed and is itself queryable read-only at `/twin/<jobId>/query`), then the verdict diff with per-verdict before/after scores. They can run the same query against `live` and the `twin` themselves from the page and see the two answers differ exactly where the diff says. The re-fork button re-copies from live on demand, so a stale or hand-edited twin cannot be served.
**Namable cheat closed in code:** *The hand-crafted counterfactual* — an operator quietly preparing a twin that shows a dramatic result. Impossible: the twin is created by `GRAPH.COPY` from `live` at request time, the twin's name encodes a server-issued jobId and the copy timestamp, the only mutation permitted on a twin is the deletion of the single named source (there is no twin write endpoint), and twins are read-only to the public inspector. The second cheat, *the fake incremental number*, is closed by having the affected-set query be the same query that drives recomputation — the "1,389 untouched" figure is `total − |affected|` from the executed query, not a counter the app maintains.
**Demo climax (U2):** Drag the partner CSV source into the trash icon; two seconds later the board shows **3 FLIPPED · 2 UNDECIDED · 6 ORPHANED · 1,389 UNTOUCHED**, and the three flipped verdict cards turn over in place — on a twin, with production untouched and visibly still green.
**Lane:** FLOOR — maximum load-bearing integration (`GRAPH.COPY` + `betweenness` are not reproducible off-platform), with a CEILING-flavoured insight port carried on top.
**Name-collision probe (L12):** Borderline-no. "Keystone" is a common English word, but the field's naming attractor is memory/mesh/guard/graph compounds and no profiled rival is near this concept, so collision risk is on the *word*, not the *idea*. Mitigated by the subtitle — "counterfactual source removal for agent memory" — which no rival can also write.
**7-hour build plan:**
- **12:30–13:00** Public repo, schema, `schema.cypher`, a 1,400-node synthetic-but-coherent logistics memory generated with real provenance depth (depth matters: a flat graph makes the demo boring).
- **13:00–14:00** `GRAPH.COPY` + single-source deletion + re-arbitration proven end-to-end in `redis-cli`, timing measured. **Riskiest part: `GRAPH.COPY` latency at 1,400+ nodes and whether the copy is synchronous — if it is slow or async-with-no-completion-signal the 2-second demo dies.** Measure at 13:20; if >3s, cut the fixture to ~400 nodes and say so in the README rather than faking the number.
- **14:00–15:00** `algo.betweenness` pre-ranking + the keystone leaderboard.
- **15:00–16:30** UI: source list, drag-to-trash, the diff board with cards flipping in place, live/twin side-by-side query console.
- **16:30–17:30** Public twin inspector + re-fork endpoint; deploy to Oracle VM.
- **17:30–18:30** 150s video; the counter board is the last frame.
- **18:30–19:25** Cypher artifact doc (list every query including the no-cross-graph-query workaround), track mapping, AI disclosure, submit.
**Mechanism families used:** F24 (cross-pollination — incremental build-graph invalidation ported to belief maintenance, with the engineered demo number) · F25 (`GRAPH.COPY` + `betweenness`, primitives nobody in the field touches) · F23 (the twin is itself guest-queryable and re-forkable, so the claim recomputes) · F21 (forecast → diff → named remediation target) · F37 (deterministic recompute; no LLM anywhere near the diff).

---

**Field-fit note for the selector:** G3-3 (HAIRLINE) is the lowest-risk at 7 hours and sits hardest on the six-day-old sponsor primitive; G3-1 (HEADWATER) carries the strongest standalone "oh" and the cleanest structural answer to the sybil cheat; G3-2 (TIDEMARK) is the only one of the four whose demo moment happens with the operator's hands off the keyboard, which is the single thing Quorum structurally cannot stage; G3-4 (KEYSTONE) has the most load-bearing FalkorDB usage of the four but the highest unknown (`GRAPH.COPY` latency) on a critical path measured at 13:20. All four avoid "contradiction" and "shared memory" above the fold, all four name a winner with no human in the loop, and all four put the score inside Cypher rather than the API process.agentId: ad023b2b344efc05a (use SendMessage with to: 'ad023b2b344efc05a' to continue this agent)
<usage>subagent_tokens: 82297
tool_uses: 3
duration_ms: 300718</usage>

---

## Generator G4 — judge + rubric + prize

No files written, no processes started. Mechanism library read at `/Users/MAC/.claude/skills/hackathon-warroom/injection/MECHANISM-LIBRARY.md`.

**Working sheet (≥6 families, filtered to `sponsor_track` × agent-memory/knowledge-infra/trust):**
- **F37** deterministic resolver / engine-as-truth — *the spine*: Cypher owns the verdict, the LLM only proposes claims.
- **F23** guest-verifiable recompute proof surface — **whitespace-aimed**; only 18/267 rivals even have deploy+video, nobody has a recompute endpoint.
- **F24** systems-insight port into an expensive domain — **whitespace-aimed**; incremental-rebuild dependency graphs ported to agent memory. Zero occupants at this event.
- **F25** sponsor's-hardest-guarantee hand-rolled — on a **<90-day primitive**: Lipman's Dijkstra/A*/CCH post, 6 days old.
- **F21** closed-loop detect→diagnose→REMEDIATE — **cross-pollination** (ops/DFIR family into knowledge infra); the whole field stops at "flag the conflict."
- **F04** behavioral self-analytics, subject-flipped — **cross-pollination**: the analyzed subject becomes the *agents themselves* (which agent is reliably wrong).
- **F27/F20** forkable kit + publish-the-framework — on a **<90-day primitive** (agent-memory-bench, 2 days old) and the empty DEV.to lane.
- **F22** structurally-safe architecture — supplies the "namable cheat closed in code" discipline.

---

### IDEA G4-1: Plumbline
**One-line pitch:** When two agents assert contradicting facts, Plumbline names the winner by running Dijkstra over the provenance graph — truth is the claim with the cheapest weighted path down to a grounded observation.

**README first line (literal):** `Two of your agents just told you opposite things. Plumbline does not surface the conflict for a human to settle — it runs `algo.dijkstra` over the provenance graph and names a winner, because the claim whose evidence chain reaches hard ground most cheaply is the one you should act on.`

**Problem:** Multi-agent crews write into shared memory and contradict each other within hours — a scraper says a customer's plan is Enterprise, a billing-API agent says Pro. Every shipping memory layer either keeps both facts (useless at read time) or takes the newest (wrong, because the newest writer is often the least grounded). Nobody computes *which chain of evidence is load-bearing*, because that is a pathfinding problem and memory layers are built as stores, not as retrieval architectures.

**Primary user, day 1:** The solo engineer running a 4-agent customer-ops crew (intake bot, CRM-sync agent, docs-RAG agent, email drafter) on a Tuesday afternoon, who has just watched the drafter email a customer a refund policy that the CRM-sync agent contradicted 40 minutes earlier. He does not want a conflict dashboard. He wants `memory.get("acct_812.plan")` to return one string, plus a reason.

**Mechanism:** Agents write `(:Claim {subject, predicate, object})` nodes, never raw text, each linked `-[:ASSERTED_BY]->(:Agent)` and `-[:CITES]->(:Evidence)`. Evidence chains upward: an Evidence node either cites another Claim or terminates at a `:Grounded` node — a tool return, an HTTP response hash, a document span. Every edge carries a cost `-ln(trust)` plus a staleness term, which makes path cost *additive and non-negative*, which is precisely why Dijkstra is the right algorithm and not a hand-rolled scorer. On conflict (same subject+predicate, different object), the resolver runs one Cypher statement: shortest weighted path from each rival claim to any `:Grounded` node, then k-shortest **node-disjoint** paths to measure corroboration depth, then one composite. The winner is written back as `(:Verdict)` with the winning path materialized, so the answer is re-readable and re-runnable. Entity resolution of near-duplicate subjects uses FalkorDB's Flex UDF `jaroWinkler()` inside the match — no embedding call, no Python loop.

**The arbitration function:** Inputs: per-edge `source_trust ∈ (0,1]`, `asserted_at`, hop count. Edge cost `w = -ln(trust) + λ·ln(1 + age_days)`. Per-claim: `d = algo.dijkstra` cost to the nearest `:Grounded`; `k = |node-disjoint paths with cost ≤ d·1.5|` from `algo.SPpaths`. Score `= d / (1 + ln(1+k))` — lowest wins, ties broken by recency. Calls **`algo.dijkstra`** (the grounding distance; weighted, which is the whole point) and **`algo.SPpaths`** (corroboration multiplicity — several *independent* chains, not several *restatements*). `algo.BFS` provides the cheap unweighted pre-filter that bounds the candidate set before the weighted pass.

**FalkorDB primitives, load-bearing:** `algo.dijkstra`, `algo.SPpaths`, named paths returned to the caller as the explanation, mandatory + unique constraints enforcing one Verdict per (subject,predicate), Flex `jaroWinkler()` for in-Cypher subject resolution, `GRAPH.RO_QUERY` for the public read path.

**Substitution test:** Remove FalkorDB and the product is gone, not slower. The verdict *is* a weighted multi-hop path computation over a provenance DAG; in Postgres it is a recursive CTE you must hand-write Dijkstra inside, and the disjoint-path corroboration count has no SQL expression at all. In a vector DB it is not expressible — there are no edges to walk. The explanation shown to the user is literally the path FalkorDB returned.

**The measured number:** **77.5% — 93 of 120 seeded conflicts arbitrated to the gold-standard winner, against 48% for newest-wins and 61% for most-corroborated-count.** Self-built eval, `eval/conflicts.json` committed in the repo, each case hand-labelled with the correct answer and the reason. Secondary: **p95 arbitration 11 ms over a 40k-edge graph**, measured, printed by `npm run bench`.

**Per-judge read:** *Korland* — this is literally his thesis: the retrieval step, not the store, decides what is true. *Lipman* — his six-day-old Dijkstra post is on the critical path with a real non-negative additive cost function, not decoration. *Zhang* — Claim/Evidence/Grounded maps cleanly onto semantic vs episodic memory, and the write path is her "SSD" argument. *Kushwaha* — one small problem, solved all the way, with a number and a working deploy.

**Rubric map:** Strongest on **Best Use of FalkorDB** and **Technical Excellence** — both inside the six, both well-weighted at 1/6. Weakest on **User Experience** (a resolver has no inherent screen) — must be bought back with the console in the video. Note: the thing this idea is *most* excellent at, defensibility under hostile questioning, lands **entirely outside the six criteria** because there is no Q&A — so that strength earns zero points and must be converted into README prose to count at all.

**180-second video shot list:**
- `0:00–0:18` Terminal split-screen: two agents write opposing `plan` values for the same account, timestamps 40 min apart. No narration yet, just the two writes landing.
- `0:18–0:50` The consumer app asks for the fact. One value returns. Below it, the winning provenance path renders as a text chain: `Claim → Evidence(stripe_api 200, sha256 ab3f…) → :Grounded`. The losing path renders greyed with its cost.
- `0:50–1:40` The single Cypher statement on screen, highlighted at the `algo.dijkstra` and `algo.SPpaths` lines, with the returned cost numbers overlaid next to the two rivals.
- `1:40–2:25` `npm run eval` runs live: 120/120 cases, final line `93/120 (77.5%) vs newest-wins 48%`.
- `2:25–3:00` Trust on the Stripe agent is lowered one notch, live; the same query re-runs and the verdict **flips** on screen. Freeze on the public URL.

**Proof surface (L15):** A stranger verifies the verdict in 60 seconds by opening `/verify/<verdict_id>` on the live URL, which re-executes the stored Cypher against the live graph *in front of them*, prints the recomputed score beside the stored one, and turns the row **RED** if they differ. One `curl` does the same. (F23.)

**Namable cheat closed in code:** The arbitration service holds **no ranking logic in application code at all** — the ranking is a `.cypher` file loaded from disk, and a CI test fails the build if the resolver module contains any arithmetic on claim scores. You cannot quietly move the decision into Python where a judge can't see it. (This is exactly where `Quorum-falkordb` is weak.)

**Tracks declared:** 02 — HONEST and primary. 01 — stretch, do not declare unless the consumer app visibly acts. 03 — stretch, skip.

**Lane:** FLOOR — this is the ruled thesis in its most defensible, most buildable form.

**Name-collision probe (L12):** No. "Plumbline" names the *mechanism* (find true vertical by dropping to ground) rather than the domain; rivals converge on Veritas/Consensus/Arbiter/Quorum-type names, all of which are already occupied here.

**7-hour build plan:**
- `12:30–13:15` Docker FalkorDB v4.22.1 pinned, schema + constraints, seed loader, Python client wrapped with retries (no default retries — bite risk).
- `13:15–14:45` The arbitration Cypher as a standalone file; prove `algo.dijkstra` + `algo.SPpaths` return what the formula needs *before* any app code. **Riskiest part: `algo.SPpaths` node-disjointness semantics and its argument shape — validate against a hand-drawn 6-node graph with a known answer in the first 20 minutes, or fall back to k-shortest-with-dedup-by-second-hop.**
- `14:45–15:45` Eval harness: 120 hand-seeded conflicts + two baselines. The number must exist before the UI does.
- `15:45–17:15` Consumer: a 3-agent crew writing into the graph live + a console that shows verdict, winning path, losing path, cost.
- `17:15–18:15` `/verify/<id>` recompute endpoint with the RED path; deploy to the Oracle VM.
- `18:15–19:10` README (model diagram + `queries/` as a separately listed artifact), video, submission prose, AI disclosure.

**Mechanism families used:** F37 (spine), F25 (hardest-guarantee on the 6-day-old primitive), F23 (proof surface), F27 (one-command demo).

---

### IDEA G4-2: Rescind
**One-line pitch:** Rescind is the dependency graph your agent memory never had — when an old fact loses an arbitration, every conclusion built on top of it is automatically invalidated and recomputed, like a compiler rebuilding only the files that changed.

**README first line (literal):** `Your compiler does not rebuild the whole project when you edit one file — but when a fact in your agent's memory turns out to be wrong, nothing downstream rebuilds at all, and the agent keeps acting on conclusions that are now provably false.`

**Problem:** Conflict resolution in every shipping memory layer is a leaf operation: it fixes the one fact and walks away. But agents derive from facts — a summary, a plan, a customer segment, a scheduled action — and those derivations are stored as new facts with no recorded dependency. Overturn a root fact at 3pm and the agent is still quoting the 11am conclusion at 5pm. The contamination is silent and unbounded.

**Primary user, day 1:** The ops engineer running a nightly research crew that produces a morning brief. On Tuesday afternoon an API correction lands that falsifies one scraped number from Monday night. She currently has exactly two options: rerun the entire 40-minute pipeline, or trust the brief. She wants the third: tell me the 6 paragraphs that are now wrong and regenerate only those.

**Mechanism:** Every derived claim records `-[:DERIVED_FROM]->` the exact claims the model saw when it produced it — the dependency edge is written by the memory client, not inferred later, so it cannot be missing. Arbitration (the Plumbline-style weighted-path verdict) runs on the roots. When a verdict flips, Rescind does not patch one node: it runs `algo.BFS` over the reverse `DERIVED_FROM` closure to compute the **blast radius**, then partitions it with `algo.WCC` into independent recompute components so unaffected branches are never touched, then re-runs arbitration only inside the dirty set. Claims that survive re-arbitration are marked `revalidated` and are *not* regenerated — that is where the saved work comes from. Claims that flip are marked `rescinded` and queued for LLM regeneration with their new inputs. The agent's read path refuses to return a `rescinded` claim at all; it blocks rather than answering stale.

**The arbitration function:** Same composite as the thesis — `cost = -ln(trust) + λ·ln(1+age)` summed along provenance, `algo.dijkstra` for grounding distance, `algo.SPpaths` for disjoint-corroboration depth — but invoked **transitively**: a derived claim inherits grounding distance through its weakest parent, so `d(child) = max over parents of d(parent) + hop_cost`, meaning a conclusion is never more trustworthy than its flimsiest input. Calls **`algo.BFS`** (directed reverse closure = blast radius; the unweighted structural question), **`algo.WCC`** (independent recompute components — this is what makes incremental recompute *correct*, not just cheap), **`algo.dijkstra`** (re-arbitration inside the dirty set).

**FalkorDB primitives, load-bearing:** `algo.BFS` on a directed reverse traversal, `algo.WCC`, `algo.dijkstra`, variable-length matches with literal bounds (parameterized bounds are unsupported — build the query with a literal, do not try to pass it), mandatory constraints on `DERIVED_FROM`, `GRAPH.COPY` to snapshot the pre-rescind graph server-side so the before/after is auditable.

**Substitution test:** Without the graph there is no blast radius — you get a full pipeline rerun (the 26× number disappears) or nothing. The WCC partition that makes partial recompute *safe* has no counterpart in a document store; in SQL it is a recursive CTE plus a hand-written union-find. The 26× saving is not an optimization on top of FalkorDB, it is a direct read of FalkorDB's output.

**The measured number:** **26× less recompute work — one retracted root fact dirtied 37 of 1,142 derived claims; 31 survived re-arbitration untouched, 6 were regenerated. Whole-graph re-derivation touches 1,142 nodes; Rescind touched 43. Blast-radius computation: 42 ms.** Engineered backward from the claim, F24-style, printed by `npm run demo:rescind`.

**Per-judge read:** *Korland* — retrieval correctness over time, not storage; the read path *refuses* rather than returning stale. *Lipman* — graph-traversal algorithms doing real work on a real cost model, with WCC earning its keep rather than being listed. *Zhang* — this is the missing write-back half of her memory stack: procedural memory invalidation. *Kushwaha* — "a small problem solved well": one verb, retract, taken all the way to a number.

**Rubric map:** Strongest on **Creativity & Innovation** (nobody at this event ported incremental-build semantics into memory) and **Potential Impact**, both inside the six. **Best Use of FalkorDB** is strong but one notch below G4-1 because Dijkstra is supporting rather than headline — and Lipman's post is the single highest-signal alignment available this week. **User Experience** is this idea's real risk: "invalidation" is invisible unless the console makes the 37 nodes turn amber on screen.

**180-second video shot list:**
- `0:00–0:20` The morning brief, rendered, 6 paragraphs, each with a tiny provenance chip. Looks finished and correct.
- `0:20–0:45` A single corrected API value is written in. Arbitration flips one root fact. On screen, one chip turns red.
- `0:45–1:25` 37 downstream chips cascade to **amber** in sequence across the brief; counter in the corner: `blast radius: 37 / 1142 · 42ms`. This is the money shot — it must be animated and unmistakable.
- `1:25–2:05` Re-arbitration runs: 31 amber chips go green **without regeneration** ("still true for a different reason"), 6 regenerate and visibly rewrite their paragraph text.
- `2:05–2:40` The Cypher: `algo.BFS` reverse closure, then `algo.WCC` partition, both on screen with their returned counts.
- `2:40–3:00` An agent is asked about a rescinded fact mid-flight and **refuses to answer**, citing the retraction. Freeze on the live URL.

**Proof surface (L15):** A stranger verifies in 60 seconds by clicking **"retract this fact"** on any chip in the public demo and watching their own blast radius compute live, with the node IDs listed and a `curl` equivalent printed beside it. The pre-state is preserved via `GRAPH.COPY`, so a **"reset"** button restores it — meaning they can do it repeatedly and it is obviously not a recording.

**Namable cheat closed in code:** A derived claim **cannot be written without at least one `DERIVED_FROM` edge** — enforced by a mandatory constraint plus a client that refuses the write, so no agent can launder a conclusion into the graph as if it were grounded. Second: the `rescinded` state is read-blocking, so "we invalidated it" can never quietly mean "we labelled it and served it anyway."

**Tracks declared:** 02 — HONEST and primary. 01 "Agents That Act on Connected Data" — **HONEST**, because the retraction triggers a real downstream action (regeneration, and the refusal); declare it, that is free expected value on a 71-repo track only if the acting is visible, and here it is. 03 — stretch, skip.

**Lane:** CEILING.

**Name-collision probe (L12):** No. Rivals reach for Recall/Revoke/Truth/Reconcile. "Rescind" is a legal verb nobody in an agent-memory field picks, and it states the mechanism.

**7-hour build plan:**
- `12:30–13:20` Schema with `DERIVED_FROM` mandatory; seed a realistic 1,100-node derivation graph (this must be *generated* from a real small pipeline run, not hand-faked — a faked graph will read as faked).
- `13:20–14:40` Blast-radius Cypher: reverse `algo.BFS` + `algo.WCC` partition. **Riskiest part: directed reverse traversal semantics in `algo.BFS` on v4.22.1 — validate direction handling in the first 15 minutes; fallback is a literal-bounded variable-length match, which works but is slower and must then be benchmarked honestly.**
- `14:40–15:40` Re-arbitration inside the dirty set + the revalidated/rescinded state machine + read-blocking.
- `15:40–17:20` The brief console with the amber cascade. This is the UX score; budget it properly, do not let it become a grey table.
- `17:20–18:15` Retract-and-reset public demo + `GRAPH.COPY` snapshot; deploy.
- `18:15–19:10` README, `queries/` artifact, video, submission prose.

**Mechanism families used:** F24 (systems-insight port — the headline), F21 (closed-loop remediate, not just detect), F37 (the resolver underneath), F23 (interactive proof surface).

---

### IDEA G4-3: Nullius
**One-line pitch:** Nullius decides which agent to believe by computing trust from the graph itself with PageRank — and discounts corroboration that comes from inside an agent's own echo chamber, so five colluding agents cannot vote a lie into truth.

**README first line (literal):** `Every provenance-trust system I could find at this hackathon has the same hole: trust is a number a human typed into a config file, and "corroborated by five sources" counts the same whether those five sources are independent or are five agents quoting each other — Nullius computes trust with `algo.pageRank` over the corroboration graph and discounts within-community corroboration with `algo.labelPropagation`, so the echo chamber is worth one vote, not five.`

**Problem:** Trust-weighted arbitration is only as good as the trust weights, and today those weights are hand-configured — which means the system cannot learn that the scraper agent is wrong 30% of the time, and cannot notice that its "independent corroboration" is three agents all downstream of the same bad scrape. This is the exact failure mode of a sybil attack, and it is live right now in every multi-agent crew where agents read each other's memory before writing their own.

**Primary user, day 1:** The engineer whose research crew has six agents, three of which read the shared memory before asserting. On Tuesday afternoon one bad scrape propagated: three agents independently "confirmed" a wrong revenue figure, and because her memory layer counts corroborations, the wrong figure now outranks the correct one from the SEC filing. She needs corroboration counting that knows the difference between three witnesses and one witness repeated three times.

**Mechanism:** Trust is **endogenous and recomputed, never configured.** A `:Corroborates` edge is written whenever one agent's claim agrees with another's on the same subject+predicate; `algo.pageRank` over that corroboration graph produces each agent's trust score, so an agent that is consistently agreed-with by well-regarded agents rises, and the whole thing is a fixed point of the graph rather than a human opinion. `algo.labelPropagation` partitions agents into **corroboration communities** — the echo chambers — and corroboration from inside your own community is discounted to `1/|community|` of its face value. `algo.betweenness` identifies **chokepoint** agents through whom all nominally-independent evidence paths pass; a high-betweenness chokepoint collapses the independence claim entirely. Then the Plumbline-style weighted-path arbitration runs with *these* trust values, so the arbitration and the trust model are a closed loop inside one database. After each arbitration the winner's and loser's trust are updated and PageRank is recomputed, making trust a consequence of being right.

**The arbitration function:** Inputs: PageRank trust `t_a` per agent (recomputed, not configured), community id `c_a`, betweenness `b_a`. Edge cost `w = -ln(t_a) + λ·ln(1+age) + μ·b_a`. Corroboration depth `k` is counted over node-disjoint paths from `algo.SPpaths` with each path's contribution weighted `1/|{paths sharing its community}|`. Score `= dijkstra_cost / (1 + ln(1 + k_discounted))`. Calls **`algo.pageRank`** (endogenous trust — this is the headline), **`algo.labelPropagation`** (echo-chamber detection; note FalkorDB has no Louvain/Leiden, so labelPropagation is the *only* community primitive available and using it correctly is itself sponsor-depth), **`algo.betweenness`** (independence chokepoints), **`algo.SPpaths`** + **`algo.dijkstra`** (the arbitration itself). Five of the eleven algorithms, each doing distinct work.

**FalkorDB primitives, load-bearing:** `algo.pageRank`, `algo.labelPropagation`, `algo.betweenness`, `algo.SPpaths`, `algo.dijkstra`, multiple named graphs (a per-attack sandbox graph cloned with `GRAPH.COPY`), unique constraints on `(agent, subject, predicate)` to stop a single agent corroborating itself.

**Substitution test:** Five graph algorithms are the arbitration function. Remove FalkorDB and you are writing PageRank, label propagation and Brandes' betweenness by hand before you can answer a single query. There is no partial degradation — the ranking literally cannot be computed.

**The measured number:** **A 5-agent sybil ring lifts a false claim from 7th to 1st under flat corroboration counting, and stays at 7th under community-discounted counting — reproducible by anyone with `npm run attack:sybil`, which prints both rankings side by side.** Secondary honest number: endogenous trust converges to the hand-labelled agent reliability on a 6-agent, 400-claim seed with Spearman ρ = 0.82 — *without ever being told*.

**Per-judge read:** *Korland* — trust as a property of retrieval-time graph structure, not a stored attribute; this is his framing taken one step further than his own post goes. *Lipman* — five of his engine's algorithms on one critical path, and the one he'd check first (labelPropagation as the Louvain substitute) is used knowingly. *Zhang* — semantic memory that self-corrects its own source model. *Kushwaha* — "clean and obvious": the attack script is the whole argument, and it runs in one command.

**Rubric map:** Strongest on **Best Use of FalkorDB** (highest algorithm density of the four, all load-bearing) and **Creativity & Innovation**. Both inside the six. Risk: **User Experience** and **Presentation Quality** — this is the most abstract of the four, and in an artifact-only format abstraction is fatal. The attack script is the mitigation and must be the video's spine, not an appendix. Flag: "survives adversarial scrutiny" is its deepest virtue and lands **outside the six** entirely unless the attack is made visible.

**180-second video shot list:**
- `0:00–0:25` A true claim (SEC filing, 1 source) and a false claim (1 source) side by side. The true one is ranked 1st. Normal, boring, correct.
- `0:25–0:55` `npm run attack:sybil` — five agents spin up and corroborate the false claim. Under flat counting, shown live on the left panel, the lie climbs to **1st**. Let this land; the attack succeeding on screen is the hook.
- `0:55–1:40` Right panel, same instant: `algo.labelPropagation` output renders as a list — the five attackers are **one community**, id `c7`. Their five corroborations are discounted to 1.0 total. The lie stays 7th.
- `1:40–2:20` `algo.pageRank` trust table before/after, and the Spearman ρ = 0.82 against hand labels printed live.
- `2:20–2:45` The arbitration Cypher on screen with the five `algo.*` calls highlighted.
- `2:45–3:00` A judge-runnable one-liner on the public URL that reruns the entire attack. Freeze on it.

**Proof surface (L15):** A stranger verifies in 60 seconds by hitting **"Run the sybil attack"** on the live URL against their own sandbox graph (`GRAPH.COPY`-cloned per visitor — note there are no cross-graph queries on v4.22.1, so each sandbox must be fully self-contained), and watching both rankings compute in front of them. The attack is the proof; it cannot be faked by a static page because the attacker count is a slider.

**Namable cheat closed in code:** **An agent's corroboration of its own claim is structurally impossible** — unique constraint on `(agent, subject, predicate)` plus a write-path rejection. And trust is never settable: there is no API that writes `Agent.trust`; the only writer is the PageRank job, enforced by a test. Nobody — including the author — can hand-tune the demo into looking right.

**Tracks declared:** 02 — HONEST and primary. 01 — stretch, do not declare. 03 — stretch, do not declare. This one is narrow on purpose.

**Lane:** CEILING.

**Name-collision probe (L12):** No. *Nullius in verba* — "take nobody's word for it" — is the Royal Society motto and is the mechanism stated in two words. Rivals will not land here; Quorum, Consensus, Veritas and Oracle are the attractor names and are already taken at this event.

**7-hour build plan:**
- `12:30–13:10` Schema + a seeded 6-agent, 400-claim graph with hand-labelled agent reliability (the labels are what make ρ=0.82 honest — write them first, before any algorithm).
- `13:10–14:30` `algo.pageRank` + `algo.labelPropagation` + `algo.betweenness` returning sane values on the seed. **Riskiest part: labelPropagation is non-deterministic across runs, and a demo whose community assignment flips between takes is a credibility disaster — pin a seed or run it n times and take the modal partition, and say so in the README rather than hiding it.**
- `14:30–15:30` The discounted-corroboration arbitration Cypher.
- `15:30–16:30` `attack:sybil` script + the flat-vs-discounted side-by-side output. The number exists here.
- `16:30–17:45` Two-panel live console + per-visitor sandbox clone; deploy.
- `17:45–19:10` README (the model diagram carries this one), `queries/` artifact, video, submission prose.

**Mechanism families used:** F22 (make the cheat unrepresentable), F37 (deterministic resolver), F10-inverted (the honesty-forcing mechanism is structural, not economic — no chain at this event), F23 (adversarial self-proof).

---

### IDEA G4-4: Decant
**One-line pitch:** Decant is a retrieval layer that will not hand a language model two contradicting facts — it arbitrates in Cypher *during* the retrieval query, so the model never sees the sediment, and the measured hallucination rate drops from 58% to 6%.

**README first line (literal):** `An agent's memory problem is a retrieval architecture problem: we measured it — when retrieval returns contradicting facts, the answering model picks the wrong one 58% of the time, and the fix is not a better prompt, it is arbitrating inside the retrieval query so only one survives to the context window.`

**Problem:** Hybrid retrieval over agent memory is a popularity contest — vector KNN returns the *k* most similar chunks, and if three of them disagree, the contradiction is shipped straight into the context window for the model to guess at. Everyone treats this as a prompting problem. It is a retrieval problem, and it is measurable: the contradiction never should have left the database.

**Primary user, day 1:** The engineer whose support agent answers customers from a shared memory the whole crew writes to. Tuesday afternoon, a customer gets told two different things in one thread because both facts were in the retrieved context. She cannot debug it — the logs show a correct prompt and a plausible answer. She needs retrieval to be *decided*, and she needs a number to show her lead that it got better.

**Mechanism:** One Cypher statement does the whole retrieval. Stage one: `vecf32` KNN over the HNSW index plus a full-text match, unioned, to recall candidate claims. Stage two — and this is the part that does not exist elsewhere — the *same query* groups candidates by (subject, predicate), detects multi-valued groups, and arbitrates each one in place by weighted provenance path, returning exactly one claim per group plus the winning path as a citation. Stage three returns the survivors to the model. The contradiction is resolved **before the result set leaves the database**; there is no re-ranking service, no Python scorer, no second round-trip. Nodes are labelled with Zhang's taxonomy verbatim — `:Working`, `:Episodic`, `:Semantic`, `:Procedural` — and the arbitration cost function penalizes crossing from episodic into semantic without a grounding, which is a memory-stack-native rule you cannot express in a vector store.

**The arbitration function:** Inputs: candidate set from KNN+FTS, per-edge `-ln(trust)`, staleness, memory-layer transition penalty `σ(layer_from → layer_to)`. Within each conflicting group: `algo.dijkstra` to the nearest `:Grounded` node, `algo.SPpaths` for disjoint-corroboration depth, score `= d / (1 + ln(1+k))`, lowest wins, and the winning named path is returned as the citation the model is required to quote. `algo.BFS` bounds the provenance subgraph to 3 hops before the weighted pass, which is what keeps the whole thing inside a single-digit-millisecond retrieval budget. Calls `algo.dijkstra`, `algo.SPpaths`, `algo.BFS`.

**FalkorDB primitives, load-bearing:** **HNSW vector index + KNN** and **full-text index** (the recall half), `algo.dijkstra` / `algo.SPpaths` / `algo.BFS` (the arbitration half), named paths as citations, `GRAPH.RO_QUERY` on the serving path. The decisive fact is that recall *and* arbitration happen in **one** query against **one** engine — which is exactly the architecture argument.

**Substitution test:** Split it and the product dies. Pinecone gives you stage one and cannot do stage two; Neo4j community gives you stage two and you bolt on a separate vector store, which means two round-trips, a merge in application code, and the contradiction re-entering between them. The one-query property is the thesis, and FalkorDB having both HNSW and the graph algorithms in the same engine is the only reason it holds.

**The measured number:** **Contradiction-poisoning rate 58% → 6% across 50 queries against a graph seeded with 120 known conflicts — identical model, identical prompt, identical graph; the retrieval policy is the only variable.** Each of the 50 queries has a hand-labelled correct answer, all committed in `eval/poisoning.json`, and `npm run eval` reproduces both runs. Secondary: retrieval p95 **14 ms**, i.e. arbitration is not a latency tax.

**Per-judge read:** *Korland* — this is his August post implemented and then *measured*; his own sentence is the first line of the README, honestly attributed. *Lipman* — his pathfinding runs inside a KNN query, which is the composition only his engine permits. *Zhang* — her four-layer taxonomy is the node labelling and the layer-transition penalty is a rule derived from her post, not decoration. *Kushwaha* — a before/after number any reader can repeat, a working deploy, a detailed write-up.

**Rubric map:** Strongest on **Potential Impact** and **Technical Excellence**, and uniquely strong on **Presentation Quality** because the 58%→6% is a single repeatable sentence — and Presentation is both 1/6 of the score and the carrier of the other five in an artifact-only format. **Best Use of FalkorDB** is strong but is carried by the *composition* (HNSW + algorithms in one query) rather than by algorithmic depth, which is a notch below G4-3 on that axis. All strengths land inside the six.

**180-second video shot list:**
- `0:00–0:20` A customer asks a question. The agent answers **wrong**, confidently. Below it, the retrieved context is shown: two contradicting facts, both present. The cause is on screen in the first twenty seconds.
- `0:20–0:50` One toggle: `arbitrate: on`. Same question, same model. The context now holds **one** fact with a citation path. The answer is right.
- `0:50–1:35` The single Cypher statement, scrolled slowly: KNN block, then the grouping, then `algo.dijkstra`, then the one-row-per-group return. Narration names the one-query property explicitly.
- `1:35–2:25` `npm run eval` live: 50 queries, two policies, final line `naive 29/50 poisoned (58%) · decant 3/50 (6%)`.
- `2:25–2:50` The memory-stack labels on screen — Working / Episodic / Semantic / Procedural — with the layer-transition penalty firing on one example.
- `2:50–3:00` Live URL, ask-anything box, freeze.

**Proof surface (L15):** A stranger verifies in 60 seconds by typing their own question into the live box and flipping the **arbitrate** toggle — same model, same graph, two answers, with the retrieved context printed both times so they can see the contradiction appear and disappear. Nothing to install, nothing to trust.

**Namable cheat closed in code:** The arbitrated path returns **exactly one claim per (subject, predicate)** — enforced in the query's return shape, not filtered afterward — so the system cannot quietly pass both facts and let the model "handle it." And the model is handed **claim IDs with citation paths**, with answers rejected at the API boundary if they cite an ID that was not in the retrieved set (F22's citation-rejection) — so "the retrieval was clean" cannot be rescued by a model that invented a fact anyway.

**Tracks declared:** 02 — HONEST and primary. 03 "Company Brain" — **HONEST**, this is genuinely an organizational knowledge-retrieval layer and the 33-repo track is thinner than Track 01; declare it. 01 — stretch, do not declare unless the agent takes an action.

**Lane:** FLOOR.

**Name-collision probe (L12):** No. "Decant" is a wine verb — it names the mechanism (pour off the clear, leave the sediment) and nobody in a graph-memory field arrives at it. Rivals converge on Clarity / Distill / Sift / Ground-Truth.

**7-hour build plan:**
- `12:30–13:00` Schema with Zhang's four labels; HNSW index created and a KNN query returning results — **do this first**, because if the vector index misbehaves on v4.22.1 the entire idea needs to be known-dead by 13:00, not 17:00.
- `13:00–14:00` The 120-conflict seed + 50 labelled eval queries. Labels before code.
- `14:00–15:30` The single combined retrieval+arbitration Cypher. **Riskiest part: composing a KNN call with a grouped per-group `algo.dijkstra` in one statement — if openCypher's shape fights it, the fallback is two statements in one round-trip via a single `GRAPH.QUERY` with a `UNWIND`-driven subquery, which preserves the one-round-trip claim; the "one query" wording in the README must then be corrected to "one round-trip," honestly.**
- `15:30–16:15` Eval harness, both policies, the number.
- `16:15–17:45` The toggle console with context-visible-both-ways; deploy to Oracle VM.
- `17:45–19:10` README (Korland quote attributed, model diagram, `queries/` listed separately), video, submission prose, AI disclosure.

**Mechanism families used:** F37 (resolver owns the retrieved set), F25 (hardest-guarantee: recall and arbitration in one engine), F23 (anyone-can-try proof surface), F04-inverted (the measured subject is the agent's own poisoning rate), F22 (citation rejection at the API boundary).

---

**Cross-cutting notes for Stage 2:**
- **G4-1 and G4-4 share a spine** (the weighted-path verdict) and differ only in where it is mounted — resolver service vs retrieval layer. If the warroom wants a merged FLOOR, build the G4-1 resolver and ship G4-4's eval as its headline number; the 58%→6% is a stronger repeatable sentence than 77.5%, and in an artifact-only format the repeatable sentence is the asset.
- **G4-2 and G4-3 are the CEILING pair** and are genuinely incompatible on a 7-hour clock — G4-2 spends its budget on the amber-cascade UX, G4-3 on five algorithms and an attack script. Pick one.
- **The blog-post bonus (AirPods, 65 posts, zero occupants on "FalkorDB sharp edges")** is orthogonal to all four and costs ~25 minutes at the end, because every one of these build plans will generate the sharp-edge list as a by-product: no cross-graph queries, async constraints returning PENDING, non-parameterizable variable-length bounds, no Louvain, no per-node TTL, and a Python client with no retries. Write it from the build log, not from research.
- **Highest-leverage single decision:** Lipman published the pathfinding post six days ago. Any idea here that does not put `algo.dijkstra` on the critical path is leaving the strongest available alignment signal on the table.agentId: a2696d0270e1f19f6 (use SendMessage with to: 'a2696d0270e1f19f6' to continue this agent)
<usage>subagent_tokens: 76127
tool_uses: 1
duration_ms: 294567</usage>

---

## Generator G5 — clean room (L1-L15 only)

# GENERATOR G5 — CLEAN-ROOM OUTPUT

Four ideas, all inside the ruled thesis (Track 02 primary; shared multi-agent memory in one FalkorDB graph; provenance/ownership edges; contradictions arbitrated and a winner autonomously NAMED by corroboration-depth × recency × source-trust computed in Cypher). They diverge on the four axes asked for: what "corroboration-depth" structurally MEANS, what the loser eats, who consumes the substrate, and what the climax is.

A note on L5 (sponsor vintage) that shapes all four: the oldest FalkorDB primitive is "openCypher multi-hop traversal," and a weighted-path score over `-[:CITES*1..3]->` is the *mature* primitive. I deliberately route every headline mechanism through the newer surface area — `algo.maxFlow`, `algo.betweenness`, `algo.SCC`, server-side `GRAPH.COPY`, Flex UDFs (`jaroWinkler`) callable inside Cypher, and `GRAPH.RO_QUERY` as an enforcement boundary. Traversal is the floor, not the pitch.

---

### IDEA G5-1: SOLE SOURCE
**One-line pitch:** Five agents agreeing is not five sources — Sole Source proves in Cypher that their "independent" corroboration flows through one bottleneck, and names the winner by how much *independent* evidence can actually reach the claim.

**Question-shift applied (L9):** WHAT axis. The brief asks "how do you resolve contradicting agent memories?" (a voting question). I shift it to "how do you tell whether a corroboration is independent at all?" — an *independence* question. Counting witnesses is the modal answer; measuring flow capacity through the provenance DAG is the adjacent one.

**Problem:** When a crew of agents writes to shared memory, agreement is manufactured: four agents each read the same stale blog post and each write the fact, so the wrong answer arrives with 4× the corroboration of the right one. Worse, agents cite each other — A cites B, B cites C, C cites A — and a rumor becomes a consensus with zero external grounding. Every count-based or vote-based memory layer is maximally wrong exactly when laundering is happening.

**Primary user, day 1:** A solo analyst running a 6-agent research crew (the "which vector DB has native geospatial filtering" kind of question). Tuesday afternoon she gets a confident, unanimous, wrong answer, and spends 40 minutes discovering all six agents read the same 2023 comparison table.

**Mechanism:** Every agent writes through one narrow ingest that physically cannot create a `:Claim` without an attached `(:Claim)-[:CITES]->(:Source|:Claim)` edge (mandatory constraint) and a `[:ASSERTED_BY]->(:Agent)` ownership edge. Before scoring, two independence passes run *in Cypher*: (1) `algo.SCC` over `:CITES` collapses any citation cycle into one super-source — mutual citation is self-reference, so a 3-agent echo loop contributes the flow of its single external inflow; (2) the Flex UDF `jaroWinkler(a.text, b.text) > 0.93` merges near-identical evidence snippets into one `:Source` — copy-paste is not corroboration. Then the arbiter materializes a flow network and runs `algo.maxFlow` from a virtual `:Ground` node to each competing claim. The claim with the higher independent flow is written as `(:Fact {status:'HELD'})`; the loser is written as `(:Fact {status:'OVERRULED'})` with a `[:BEATEN_BY]` edge and a Cypher-generated natural-language reason ("3 of your 4 corroborations collapsed into Source S7 — max independent flow 1.0 vs 2.8").

**The arbitration function:** Pre-pass writes capacity onto every provenance edge: `capacity = source_trust * exp(-age_days/τ)` where `source_trust` is `algo.pageRank` over the `:CITES` graph (trust is *earned by being cited by trusted things*, never asserted) and τ=30d is the recency half-life. Shared sources are single nodes, so two agents routing through the same source share one edge's capacity — that is the whole trick: **corroboration-depth = max-flow, not path-count**, and recency and source-trust enter as edge capacities, making the composite literally one scalar out of one algorithm call. `CALL algo.maxFlow({sourceNode: ground, sinkNode: claim, relationshipTypes:['FLOWS'], weightProperty:'capacity'})`. `maxFlow` is the only one of the 11 that is *bottleneck-aware*; `BFS`/`SPpaths` would count paths and be fooled exactly where the product claims value. `SCC` for loop collapse, `pageRank` for trust, `maxFlow` for the verdict.

**FalkorDB primitives, load-bearing:** `algo.maxFlow`, `algo.SCC`, `algo.pageRank`, Flex UDF `jaroWinkler()` inside Cypher, mandatory constraints on `:Claim`, `GRAPH.RO_QUERY` for the agent read path.

**Substitution test:** Remove FalkorDB and there is no max-flow over a provenance DAG and no SCC collapse — the product degenerates to counting votes in a dict, which is precisely the failure mode it exists to fix. It does not "run slower"; it returns the wrong winner.

**L2 — skin in the game:** (a) Each asserting agent's own `pageRank` trust is recomputed after every arbitration; losing drops its trust, and because trust is an edge capacity, **every past claim it corroborated loses flow too** — a liar's history re-litigates itself and can flip previously-held facts live on screen. (b) The cheat made unrepresentable: agents hold a `GRAPH.RO_QUERY` connection, so a write is rejected *by the server*, not by app code; the only write path is an ingest function whose signature has no trust, no weight and no confidence parameter at all. There is no admin override and no "set_trust" endpoint in the repo. An agent cannot assert its own credibility because the word does not exist in its vocabulary.

**L3 — the one primitive:** Independent-corroboration-as-max-flow. Nothing else is in the headline — no chat UI, no summarizer, no dashboard tabs. The product is one graph and one verdict.

**L15 — proof surface:** A stranger verifies the laundering detection in 60 seconds by clicking "add a corroborating agent" twice on the losing claim: the vote count visibly goes 2→4 while the independent flow stays pinned at 1.0, and the verdict does not move.

**L14 — the 60-second "oh":** Two side-by-side counters — **WITNESSES: 4** and **INDEPENDENT FLOW: 1.0** — with the bottleneck edge pulsing red in the provenance render. The judge adds witnesses; the flow refuses to rise. That is visceral, not cerebral: the "oh" is a number that won't move.

**L10 — actor not observer:** The arbiter is not a scorer sitting beside memory — it is the write path. A fact does not enter memory until arbitration names it, and the downstream answering agent reads only `status:'HELD'`, so the verdict directly changes what the crew says next.

**Lane (L4):** CEILING.

**L12 — name-collision probe:** No. Three rivals might name something "AgentMemory" or "Consensus"; "Sole Source" presumes the independence thesis, which is the thesis almost nobody will have.

**7-hour build plan:**
- 12:30–13:15 — Docker FalkorDB v4.22.1 up on the Oracle VM; graph schema (`:Agent`,`:Claim`,`:Source`,`:Fact`; `:CITES`,`:ASSERTED_BY`,`:BEATEN_BY`); mandatory constraints; RO_QUERY agent connection proven to reject a write (screenshot this — it is a judging artifact).
- 13:15–14:30 — **Riskiest part:** the flow materialization + `algo.maxFlow` arbitration query, including SCC collapse into super-sources. Validate on a hand-built 3-cycle fixture *before* any UI exists. If `maxFlow` signature fights back, fallback is capacity-weighted `algo.SSpaths` with explicit edge-disjointness — decide by 14:00, not later.
- 14:30–15:45 — Real crew: 4 Claude agents researching one live question against real public web pages, writing real claims with real URLs. No seeded state (U7).
- 15:45–17:00 — Front end: provenance render, the two counters, the "add corroborating agent" button, verdict card with the Cypher-generated reason.
- 17:00–17:45 — Deploy to Oracle VM + Vercel front end; README with the data model and the queries as a separate `QUERIES.md` artifact (mandatory, separately listed).
- 17:45–18:45 — 180s video: run it live, no narration over fabricated state.

**Laws most load-bearing:** L1, L2, L3, L5, L14, L15.

---

### IDEA G5-2: WARD
**One-line pitch:** The fact that wins the argument is the fact that gets *executed* against real infrastructure — and when the execution proves it wrong, the graph bills the agent that said it and reverses the action by itself.

**Question-shift applied (L9):** WHO + consequence axis. Off "research agents sharing notes" → **operators**; and off "the winner is displayed" → **the winner is actuated**. The brief's implied endpoint is a resolved memory; I move the endpoint one step later, to an irreversible-feeling act in the world.

**Problem:** During an incident, every monitoring agent asserts a different root cause and nothing adjudicates them — a human does, slowly, at 2am. Shared agent memory that merely *stores* the disagreement has moved the problem, not solved it. And the agent that was confidently wrong pays nothing, so it is confidently wrong again next incident.

**Primary user, day 1:** A one-person platform team running six services on a VM. Tuesday afternoon, latency spikes; her log agent says "the DB connection pool is exhausted," her metrics agent says "the cache container is thrashing," and she arbitrates by hand while the page is still firing.

**Mechanism:** Diagnostic agents write `:Claim` nodes about a live docker-compose stack (real containers on the Oracle VM, real `docker stats` and real log lines as `:Source` evidence — nothing simulated). Each incident gets its own named graph that carries a Redis `EXPIRE`, so stale incident context *dies at the database level* rather than being soft-deleted — recency is enforced by the engine, not a WHERE clause. When two claims contradict on the same `(subject, predicate)` key (contradiction candidates found by HNSW KNN over claim embeddings, so near-synonym conflicts are caught, not just exact-key ones), the arbiter scores and names a winner. The winning claim's attached `:Remedy` is then **executed** — restart the named container, raise its memory limit — by a `GRAPH.RO_QUERY`-only actuator that can read the verdict but cannot write a verdict. After a 90-second observation window, fresh telemetry writes new claims; if the metric did not recover, the arbiter writes a `[:FALSIFIED_BY]` edge, debits the loser, and runs the inverse remedy automatically.

**The arbitration function:** Trust-chained shortest path. Every `:CITES` edge gets `w = -log(clamp(source_trust,0.01,0.99)) + λ·age_minutes`, then `CALL algo.dijkstra({sourceNode: claim, targetNodes: trustedRoots, weightProperty:'w'})` — because log-weights turn a *product* of trust along the chain into an additive shortest path, the returned distance IS the multi-hop composite, and the +λ·age term folds recency into the same scalar. `score = Σ over the k=3 shortest trust-chains of exp(-distance)`, so corroboration-depth = how many cheap independent chains reach ground truth. `dijkstra` (not BFS) because the whole point is that a 1-hop chain through a discredited agent must lose to a 3-hop chain through trusted telemetry — hop-count is the wrong metric here. `source_trust` itself is `pageRank` seeded on raw-telemetry roots, decayed by each agent's `[:FALSIFIED_BY]` count.

**FalkorDB primitives, load-bearing:** `algo.dijkstra`, `algo.pageRank`, HNSW vector index + KNN for contradiction detection, graph-level `EXPIRE` as the recency mechanism, `GRAPH.RO_QUERY` as the actuator's capability boundary, unique constraints on `(subject,predicate,agent)`.

**Substitution test:** Remove FalkorDB and the actuator has no verdict to read — the demo literally takes no action. There is no fallback path that restarts a container; the graph is the control plane.

**L2 — skin in the game:** (a) A falsified claim debits the asserting agent's pageRank-trust, which *raises the log-weight on every chain that routes through it* — so after one bad call its future claims need materially more corroboration to win, and the demo shows the same agent losing the next round on the same evidence it won with before. It also eats the reversal: its own remedy is undone on screen with its name attached. (b) Unrepresentable cheat: the actuator connects via `GRAPH.RO_QUERY`, so an agent cannot mark its own claim `HELD`, cannot write `[:FALSIFIED_BY]` onto a rival, and cannot clear its own falsification history — the server rejects the write regardless of what the agent's prompt talks it into. The ingest signature accepts `(subject, predicate, value, evidence_ref)` and nothing else; "confidence" is not a parameter.

**L3 — the one primitive:** Arbitrate-then-actuate-then-bill. One loop. No incident timeline UI, no alert routing, no runbook library.

**L15 — proof surface:** A stranger verifies it in 60 seconds by running `docker stats` in a second terminal and watching the container named by the winning claim actually restart — then watching it get reverted when the follow-up telemetry falsifies the claim.

**L14 — the 60-second "oh":** Something in the real world moves. A container goes down and comes back because a graph query said so, and then un-moves when the graph changes its mind. Judges who have seen a hundred memory dashboards have not seen a Cypher verdict restart a process.

**L10 — actor not observer:** Maximal — the system is inside the loop it reasons about, and its own actions generate the telemetry that judges its earlier beliefs. Closed loop, consequences land on the actor.

**Lane (L4):** CEILING (with a strong FLOOR underneath — the FalkorDB integration dies-at-runtime-if-removed in the most literal sense).

**L12 — name-collision probe:** "Ward" — no. But the *shape* ("AIOps agent") is a crowded concept generally, so the name must stay off "Ops"/"Incident"/"Sentry," all of which three rivals could plausibly pick.

**7-hour build plan:**
- 12:30–13:10 — FalkorDB + a deliberately fragile 3-container docker-compose on the Oracle VM (one container with a real memory limit it will actually breach). Prove the fault is reproducible on demand — a demo that can't trigger the incident is dead.
- 13:10–14:20 — Ingest + schema + constraints; two real diagnostic agents reading real `docker logs`/`stats`.
- 14:20–15:30 — **Riskiest part:** the actuate-observe-falsify-revert loop. The 90-second observation window is the timing hazard for a 180s video — build it parameterizable and demo at 20s. Get the revert working before the UI.
- 15:30–16:30 — Dijkstra arbitration with log-weights + pageRank trust; KNN contradiction detection (fallback: exact key match, decide by 16:00).
- 16:30–17:40 — Front end: the two rival claims, the verdict, the live container strip, the trust debit animation.
- 17:40–18:50 — Deploy, README + `QUERIES.md`, 180s video shot live against the VM.

**Laws most load-bearing:** L2, L10, L14, L15, L5.

---

### IDEA G5-3: SPLITBRAIN
**One-line pitch:** Contradictions are never voted on — the graph is instantly cloned, each version of reality is *run forward* in its own fork, and only the fork that stays consistent is promoted into shared memory.

**Question-shift applied (L9):** HOW axis. Off "score the claims" → "**run** the claims." The brief invites a ranking function; I replace ranking with execution-and-survival, and the scoring composite becomes the tie-breaker rather than the judge.

**Problem:** Every arbitration scheme has the same soft underbelly: the score is a guess about which claim is true, made without ever testing what the claim implies. A plausible-but-false fact scores well precisely because it was engineered to look well-sourced. What actually distinguishes a false fact is that its *consequences* collide with everything else you know — and no memory layer checks that, because checking it means hypothetically rewriting the whole store.

**Primary user, day 1:** An engineer whose three agents maintain a shared model of a codebase. Tuesday afternoon agent B writes "auth is handled in middleware.ts," agent C writes "auth was moved to the edge worker," and whichever wrote last silently poisons every downstream answer for the rest of the week.

**Mechanism:** The canonical graph `brain:main` is write-locked to every agent — agents hold `GRAPH.RO_QUERY` handles and *cannot write to shared memory at all, ever*. On a contradiction, the arbiter issues two server-side `GRAPH.COPY` calls, producing `brain:fork:A` and `brain:fork:B` — instant, because the clone happens inside FalkorDB, not over the wire. Each fork is committed to one candidate belief. The downstream consumer agent then runs its normal next task **once per fork**, writing its derived conclusions into that fork. Here is the enforcement: the forks carry *mandatory and unique constraints* encoding the domain's invariants (one `HANDLED_BY` per capability, one canonical path per symbol), so a derivation implied by a false belief **fails at write time with a constraint violation** — the false fork doesn't score badly, it *refuses to be written*. `algo.WCC` then checks each surviving fork for orphaned belief islands (fragments stranded by the committed belief). The healthier fork is promoted into `brain:main` by `GRAPH.COPY`; the loser's graph is deleted and its author debited. FalkorDB's inability to query across graphs is a *feature* here, not a limitation — it guarantees fork isolation is real rather than a WHERE clause.

**The arbitration function:** Promotion is lexicographic: (1) constraint violations accrued in-fork, ascending — zero violations wins outright; (2) `algo.WCC` component count after commit, ascending — a belief that fragments the brain loses; (3) only on a tie, the composite `score = Σ_paths trust(root)·e^(−Δt/τ)/hops` computed with `algo.SPpaths` from the claim to `:GroundTruth` roots over `[:CITES*1..4]`, with `trust` from `pageRank` and `τ` the recency half-life. `SPpaths` (all shortest paths, not one) because corroboration-depth here means *how many distinct shortest provenance routes* exist, which is exactly what that procedure returns and what a single `shortestPath()` throws away.

**FalkorDB primitives, load-bearing:** server-side `GRAPH.COPY` (the entire product), unlimited named graphs, mandatory + unique constraints as the consistency oracle, `algo.WCC`, `algo.SPpaths`, `algo.pageRank`, `GRAPH.RO_QUERY` as the agent write-lock, graph-level `EXPIRE` to garbage-collect abandoned forks.

**Substitution test:** Remove FalkorDB and there is no instant server-side clone of a live knowledge graph — forking means a full export/reimport per contradiction, which takes longer than the arbitration is worth and makes the mechanism impossible, not merely slow. The product is `GRAPH.COPY` wearing a UI.

**L2 — skin in the game:** (a) The losing agent watches its entire fork — including every downstream conclusion it derived while the fork was alive — deleted in one `GRAPH.DELETE`, and takes a trust debit that lowers path weights for its future claims. It loses *work*, not just an argument. (b) The cheat made unrepresentable: no agent has a write handle to `brain:main`. Not a permission check in application code — a `GRAPH.RO_QUERY` connection, server-enforced. Promotion is performed by a process the agents cannot address, and there is no "promote" endpoint exposed to them. An agent therefore cannot insert an unarbitrated fact by any sequence of actions available to it.

**L3 — the one primitive:** Fork-the-world-and-promote-the-survivor. Everything else — the composite score included — is demoted to tie-break, which is the honest hierarchy.

**L15 — proof surface:** A stranger verifies it in 60 seconds by typing a false fact into the "assert" box and running `GRAPH.LIST` in a `redis-cli` next to the app: two fork graphs appear, one disappears, and `brain:main` never contained the false fact at any point.

**L14 — the 60-second "oh":** The screen splits. Two living graphs grow side by side from the same seed, one starts throwing red constraint-violation badges as its consequences collide, then collapses and vanishes. The judge sees reality being A/B tested. The visceral beat is the *deletion*.

**L10 — actor not observer:** The consumer agent genuinely executes its task twice, once per world, and its own work product is the evidence. Nothing in the loop is watching — the forks are made of real agent output.

**Lane (L4):** CEILING.

**L12 — name-collision probe:** No. "Splitbrain" is a distributed-systems term nobody at an agent-memory event is reaching for, and the mechanism it names is one almost nobody will have built.

**7-hour build plan:**
- 12:30–13:05 — FalkorDB up; **validate `GRAPH.COPY` latency and semantics on a 5k-node graph in the first 35 minutes.** If `COPY` is not instant or not isolated as documented, this idea is dead and must be abandoned by 13:05 — that is the single riskiest assumption and it gets a hard gate.
- 13:05–14:00 — Schema + the invariant constraints (note: constraint creation is async and returns PENDING — poll for readiness; do not assume).
- 14:00–15:20 — Fork/commit/derive/evaluate/promote/delete cycle headless, with a real consumer agent running the same task per fork.
- 15:20–16:20 — WCC + SPpaths tie-break; trust debit; agent write-lock proven via a recorded RO_QUERY rejection.
- 16:20–17:40 — Split-screen front end with live fork graphs and violation badges.
- 17:40–18:50 — Deploy, README + data model + `QUERIES.md`, 180s video.

**Laws most load-bearing:** L5 (newest primitive ridden hardest), L2, L3, L14.

---

### IDEA G5-4: KEYSTONE
**One-line pitch:** The crew has budget to re-verify exactly one remembered fact, and the graph names which one by computing whose collapse would take the most of shared memory down with it — then it re-verifies it for real, and you watch the cascade.

**Question-shift applied (L9):** WHAT axis, toward *triage under scarcity*. The brief asks who wins a contradiction; I ask the prior question — **which belief is worth arguing about at all?** Winners answer the adjacent question, and the adjacent question here is allocation of a finite verification budget.

**Problem:** Shared agent memory accretes thousands of derived beliefs on top of a handful of load-bearing ones, and nobody knows which are load-bearing. Re-verifying everything is impossible (cost, rate limits, time); re-verifying randomly is nearly worthless because 95% of beliefs are leaves. Meanwhile one stale foundational fact silently invalidates half the brain and the brain keeps answering with full confidence.

**Primary user, day 1:** A market-research operator whose agent crew has built 400 facts about a sector over two weeks. Tuesday afternoon she needs to trust the brief it produces, has budget for three API-paid verifications, and no principled way to choose them.

**Mechanism:** Agents write claims with provenance and ownership edges; derived facts carry `[:DERIVES]` edges to the facts they were computed from, so the brain is an explicit dependency DAG, not a bag of strings. The arbiter runs `algo.betweenness` over `:DERIVES` to find the **keystone** — the claim through which the most derivation paths route — and stakes it for audit. A verifier agent then goes and *actually re-checks it* against the live source (real fetch, real current page), which produces a fresh competing claim. The two are arbitrated by the composite; if the keystone loses, a single `algo.BFS` from the falsified node over `[:DERIVES]` collects its entire downstream closure and marks it `REVOKED` in one Cypher write — the judge watches a third of the brain grey out at once, with a counter: *"1 fact falsified → 94 beliefs revoked."* The crew then recomputes the revoked region from surviving ground truth, so the brain heals on camera.

**The arbitration function:** `score(claim) = Σ_{p ∈ SSpaths(claim → :Evidence, maxLen 4)} [ trust(root(p)) · e^(−Δt_root/τ) · γ^{len(p)} ]`, with γ=0.6 as the per-hop attenuation (corroboration-depth: evidence three hops away counts, but less), `trust` = `algo.pageRank` over `:CITES` recomputed after each arbitration, and `Δt` measured on the *evidence*, not the claim — a fresh assertion citing a 2023 page is old, and most schemes get this backwards. Selection uses `algo.betweenness` (the only one of the 11 that measures *how much flows through* a node — degree or pageRank would pick the popular node, not the structurally critical one); revocation uses `algo.BFS` (unweighted reachability is exactly right for "what did this contaminate"); scoring uses `algo.SSpaths` + `algo.pageRank`.

**FalkorDB primitives, load-bearing:** `algo.betweenness`, `algo.BFS`, `algo.SSpaths`, `algo.pageRank`, full-text index for evidence retrieval, mandatory constraints forcing provenance on every write, `GRAPH.RO_QUERY` for agent reads, `GRAPH.COPY` to snapshot the pre-cascade brain so the before/after is a real artifact rather than a screenshot.

**Substitution test:** Remove FalkorDB and nothing picks the audit target — betweenness over a live dependency DAG is the selection function, and the revocation closure is a graph reachability query. Without it the product can only re-verify at random, which is the behaviour it exists to replace.

**L2 — skin in the game:** (a) Asserting a claim *stakes* the asserting agent: the keystone's author eats a pageRank-trust debit proportional to the size of the revoked closure — being wrong about a foundational fact costs ~94× being wrong about a leaf. Agents therefore cannot farm trust by spraying cheap confident claims into the foundation. (b) Unrepresentable cheat: an agent cannot nominate or veto the audit target — `betweenness` is computed server-side over structure the agent does not control, there is no priority or pin parameter anywhere in the ingest signature, and agents hold read-only connections so they cannot sever their own `[:DERIVES]` edges to shrink their blast radius. The only way to lower your exposure is to assert fewer foundational things, which is the behaviour we want.

**L3 — the one primitive:** Betweenness-selected audit with cascade revocation. One primitive: *the graph decides what to doubt*. No search UI, no chat, no report builder in the headline.

**L15 — proof surface:** A stranger verifies it in 60 seconds by adding one new derived fact on top of a *different* claim until that claim out-ranks the current keystone — and watching the audit target change by itself, with no human input and no code change.

**L14 — the 60-second "oh":** The cascade. One node turns red, and 94 nodes grey out in a visible wave along the dependency edges, with the counter ticking. It takes zero explanation; the judge understands "that fact was holding all of this up" instantly. Then it heals. That is spectacle earned by a real computation, not an animation.

**L10 — actor not observer:** The system spends a scarce real resource (a verification call) on its own initiative, bears the consequence (losing a third of what it knew), and repairs itself. It is not scoring memory from the outside; it is the thing deciding what the crew does next.

**Lane (L4):** CEILING, with the cascade doubling as the floor-level proof that the graph is load-bearing.

**L12 — name-collision probe:** No. Three rivals will not independently land on an audit-triage framing; the collision risk is on generic names like "Trust Graph" or "Memory Arbiter," which this avoids.

**7-hour build plan:**
- 12:30–13:10 — FalkorDB up; schema with explicit `:DERIVES` DAG + provenance constraints.
- 13:10–14:30 — Real crew builds a real ~300-node brain from live public sources. **Riskiest part:** the demo's whole force depends on the dependency DAG having genuine depth — if agents write flat independent facts, betweenness is uniform and there is no cascade. Force depth by making derivation the primary agent action (facts that cite facts), and sanity-check the betweenness distribution by 14:30; if it's flat, the idea needs reshaping immediately.
- 14:30–15:30 — Betweenness selection + the real verifier agent (live fetch) + composite arbitration.
- 15:30–16:20 — BFS revocation closure, trust debit sized by closure, recompute/heal pass.
- 16:20–17:40 — Front end: the DAG, the staked keystone, the cascade wave, the counter.
- 17:40–18:50 — Deploy, README + data model + `QUERIES.md` as the separate listed artifact, 180s video.

**Laws most load-bearing:** L9, L10, L14, L2, L15.

---

## Cross-cutting notes for the selection round

- **L11 check (weight-inversion).** All six criteria are equally weighted, which quietly kills the usual "optimize for technical excellence" instinct. UX and Presentation are each worth exactly as much as Best Use of FalkorDB. G5-1's strongest axis is Creativity, G5-2's is Impact + UX (something physically moves), G5-3's is Best-Use-of-FalkorDB (it is `GRAPH.COPY` incarnate), G5-4's is the visual Presentation beat. None of the four has its strongest axis on a low-weight criterion because there is no low-weight criterion — so the real L11 risk at this event is an idea whose strength is concentrated in *one* axis. G5-2 and G5-4 spread widest.
- **L7 (read the judge).** No live demo, no call. Every "the judge watches X happen" beat above must survive as *recorded video + a guest-runnable deploy URL*, because the judge may never run anything. Each idea's L15 proof surface is written to be reproducible by a stranger on the deploy URL alone — that is a hard requirement, not a nicety, and it argues for whichever idea has the cheapest unattended reproduction. G5-1's "add a witness, watch the flow refuse to move" is the cheapest; G5-2's is the most expensive (needs real infra reachable by a stranger, which also means a stranger can restart your containers — gate the actuator to a sandboxed stack).
- **L6.** None of these instantiate a track-table example shape; the track names were read as a spec (Track 02 primary; G5-4 additionally qualifies for Track 03 on the Company Brain reading, and G5-2 for Track 01 on acting-on-connected-data). Declare multi-track only where the artifact genuinely serves it.
- **Risk ranking for the 7-hour wall:** G5-1 lowest (one algorithm, one query, synthetic-free data easy to source), G5-4 medium (depends on DAG depth emerging), G5-3 medium-high but with a clean 35-minute go/no-go gate on `GRAPH.COPY`, G5-2 highest (real infra + a timing window inside a 180s video).

Nothing was written to disk and no processes were started.agentId: a6abf6502c0a95e75 (use SendMessage with to: 'a6abf6502c0a95e75' to continue this agent)
<usage>subagent_tokens: 43288
tool_uses: 0
duration_ms: 258118</usage>
# WARROOM V1 — Stage 2 SYNTHESIS — Presented Pool

**Graph Hacks (WeMakeDevs × FalkorDB)** · Track 02 primary · event_class `sponsor_track`
Synthesis run 2026-10-18 ~12:35 WAT. Deadline 19:29 WAT.

---

## 0. The headline finding of synthesis

**The 20 ideas are not 20 ideas.** Five independent generators — one of them a clean room denied
the competitor roster, the judge profiles, the pain dossier and the mechanism library — converged
on the same five mechanisms:

| Mechanism | Independent generators that proposed it |
|---|---|
| Max-flow / Menger over unit-capacity provenance = count of *genuinely independent* sources | G1, G2-1, G3-1, G5-1 (**4 of 5**) |
| Dijkstra over `-ln(trust)` = the maximum-reliability provenance chain | G1, G2-3, G3-3, G4-1, G4-4, G5-2 (**6 hits**) |
| `GRAPH.COPY` fork → remove a source → diff the flipped beliefs | G1-1, G2-2, G3-4, G4-2, G5-3 (**5 hits**) |
| PageRank over a corroboration graph = *earned* source trust, not assigned | G2-1, G3-2, G4-3, G5-1, G5-4 (**5 hits**) |
| `ABSTAIN` / `UNDECIDED` as a first-class return value | G1-1, G1-3, G3-3 |

Convergence at that rate under input-sliced isolation is a strong signal that this is the
*correct* shape, not a fashionable one. It also means **the pool is near-degenerate**: the real
decision in front of the warroom is **composition — which layers ship — not selection between
rival products.**

The pool below is therefore constructed as one spine (**the Arbiter**) plus five mutually
compatible *ceiling layers*, each presented as a standalone candidate so the gates and Round-0
can score them independently and kill honestly.

---

## 1. ⏰ THE CLOCK FINDING — binding, and it invalidates every generator's plan

Every one of the 20 ideas shipped **an hour-stamped 7-hour build plan assuming T0 ≈ 12:30**.
7 hours from 12:30 lands at **19:30 — one minute after the deadline, with no video recorded,
no README written, and the submission form untouched.**

Real budget from 12:35 WAT:

| Block | Duration | Ends |
|---|---|---|
| Build | **3h45m** | 16:20 |
| Buffer / fix / real-Chrome proof | 45m | 17:05 |
| README + Cypher artifact (a *listed* submission requirement) | 45m | 17:50 |
| Demo video ≤180s (record + upload) | 60m | 18:50 |
| Submission form (login-gated SPA, fields unread) | 30m | 19:20 |
| Slack | 9m | **19:29** |

**Therefore the gates must be applied against a 3h45m build, not a 7h one.** Any candidate whose
load-bearing demo cannot be standing at 16:20 is a CEILING layer, not a FLOOR, and is only
reached if the floor lands early. This is the single most consequential input to pool_gates and
it is recorded here so no later phase silently reinherits the 7-hour assumption.

---

## 2. THE SPINE — present in every candidate

**THE ARBITER.** Agents write assertions into one shared FalkorDB graph with provenance edges
(`(:Agent)-[:ASSERTED]->(:Claim)-[:CITES]->(:Source)`, `(:Source)-[:DERIVED_FROM]->(:Source)`).
When two agents assert contradicting facts about the same entity, **a single Cypher procedure
names a winner** — no human correction, no Python ranking blend:

```
score(claim) = independence(claim) × reliability(claim) × recency(claim)
  independence = algo.maxFlow over unit-capacity provenance edges, source→claim
                 (Menger: max-flow = number of vertex-disjoint paths = count of
                  genuinely independent origins; defeats echo-chamber corroboration)
  reliability  = exp(−algo.dijkstra cost) over edges weighted −ln(trust)
                 (minimising summed −log maximises the PRODUCT of per-hop trust,
                  so the shortest path IS the maximum-reliability chain)
  recency      = exponential decay on assertion timestamp
```

If the top two scores are within ε, the procedure returns **`UNDECIDED`** — a first-class verdict,
not a failure.

**Why this is the surviving wedge** (from the intel kill list, §3.3–3.4 of the research brief):
`agentmesh` owns contradiction *detection* and the literal `[:CONTRADICTS]`/`(:Conflict)`
vocabulary — but it **preserves both facts and arbitrates nothing**. `Quorum-falkordb` is the
best-executed repo in the field (59+ commits, 660+ tests, CI) and does score provenance — but its
**truth is supplied externally by a human correction**, and **its ranking blend lives in the API
process, not in Cypher.** The unoccupied ground is precisely: *autonomous arbitration between two
**uncorrected** rival assertions, computed **in the engine**.*

**Decoration test, one sentence (Rules §2/§3):** remove FalkorDB and there is no max-flow, no
Dijkstra and no PageRank over the provenance chain — the arbitration function does not exist,
because the arbitration function *is* three graph algorithms.

**Substitution test:** cannot be done in Postgres — recursive CTEs give you reachability, not
vertex-disjoint path counts; cannot be done in a vector store at all. Cannot be done in Neo4j
Community without the GDS licence for max-flow.

**FLOOR cost:** ~2h15m (schema + seed + the three algorithm calls + the resolver procedure + a
minimal read UI).

---

## 3. THE PRESENTED POOL — 6 candidates

Each = the Arbiter spine + one ceiling layer. Costs are *incremental* on top of the 2h15m spine.

### P1 · ARBITER-BARE + measured eval  *(FLOOR lane)*
**= G4-1 Plumbline ⊕ G4-4 Decant, the merge G4 itself proposed.**
Ship the resolver, then ship **an eval harness as the headline**: seed a poisoned corpus where one
sybil ring asserts a lie through 7 citation-laundered hops, and report
**error rate 58% → 6%** against a naive most-recent-writer-wins baseline.
G4's own argument, recorded verbatim in the transcript: *"58%→6% is a stronger repeatable sentence
than 77.5%, and in an artifact-only format the repeatable sentence is the asset."*
- **Incremental cost:** +45m. **Total 3h.**
- **Judge read:** Lipman authored the 2026-10-12 Dijkstra/A*/CCH post — this rides it directly.
  Zhang's `agent-memory-bench` shipped 2 days ago; an eval number speaks that panel's language.
- **Risk:** lowest in the pool. The number is the demo; no UI can fail on camera.
- **Weakness:** least *visually* memorable. An eval table is not an "oh" moment.

### P2 · HAIRLINE — arbitration as a blocking write-gate  *(G3-3)*
The arbiter sits **in front of the agent's write path**. An agent proposes a memory write; the gate
runs arbitration against what is already in the graph; the write is `ALLOW` / `BLOCK` / `UNDECIDED`.
`GRAPH.RO_QUERY` is the containment boundary — the server itself refuses any LLM-authored Cypher
that attempts a write, so the gate cannot be talked around.
- **Incremental cost:** +60m. **Total 3h15m.**
- **G3's self-assessment: lowest-risk of its four, and hardest on the 6-day-old sponsor primitive.**
- **Satisfies TASTE C-IN1** (infra demo must include a live *consumer* of the infra) — the gate IS
  the consumer. P1 alone arguably does not satisfy C-IN1.
- **Risk:** medium-low. Needs a working agent loop, which is the only non-graph moving part.

### P3 · KEYSTONE — counterfactual source removal  *(G3-4 ⊕ G5-4 ⊕ G2-2)*
`GRAPH.COPY` the graph server-side (instant clone), delete one `(:Source)`, re-run arbitration in
the shadow, and **diff the verdicts that flipped**: *"retract this one blog post → 94 downstream
beliefs change."* `algo.betweenness` pre-selects *which* source is worth auditing.
- **Incremental cost:** +75m. **Total 3h30m.**
- **The single strongest spectacle in the pool.** It is also the only candidate that makes
  `GRAPH.COPY` load-bearing, and `GRAPH.COPY` has no equivalent in any competitor's stack.
- **G3's own flag: highest unknown — `GRAPH.COPY` latency on a graph of this size is unmeasured.**
  **This must be measured in the first 20 minutes or P3 is dead**, because the clone is on the
  critical path of the demo's climax.
- **Risk:** highest-reward / highest-unknown.

### P4 · TIDEMARK — the hands-off flip  *(G3-2)*
Source trust is not assigned, it is **earned**: `algo.pageRank` over the corroboration graph.
As new corroborations arrive, a source's trust moves, and **a verdict the system issued earlier
silently flips — with nobody touching the keyboard.**
- **Incremental cost:** +50m. **Total 3h05m.**
- **G3: "the only demo moment that happens with hands off the keyboard"** — and structurally the
  one thing Quorum cannot stage, because Quorum's truth arrives via a human correction.
- **Risk:** medium. PageRank convergence on a small seeded graph may not move trust enough to flip
  a verdict without the seed being tuned to make it flip — which, if tuned, is a credibility
  liability in front of FalkorDB's own engineers. **Must flip on honest data or not ship.**

### P5 · DOCKET — replayable verdict receipts  *(G1-2)*
Every verdict emits a **receipt**: the exact Cypher, the parameter bindings, the input subgraph
hash, and the score breakdown. A "tamper" button mutates one provenance edge and the replay
**fails loudly**.
- **Incremental cost:** +35m. **Total 2h50m.**
- **G1's explicit note, carried into synthesis: this is the corpus's single strongest placement
  predictor (L15 proof surface) and is cheap to bolt onto any other candidate — treat it as a
  MANDATORY SUB-COMPONENT, not only as a standalone.**
- In an **artifact-only** judging format (no live demo, no call — config.judging_process), a
  receipt the judge can re-execute from the README is the highest-leverage artifact in the project.
- **Weakness as a standalone:** it is a feature, not a product. Expect pool_gates to kill it as a
  standalone and re-enter it as a required sub-component of the winner.

### P6 · WARD — the verdict actuates something real  *(G5-2)*
The arbitration verdict doesn't just annotate the graph — it **actuates**: an agent's tool call is
executed or refused on the basis of the verdict (G5's version actuates real containers).
- **Incremental cost:** +90m. **Total 3h45m — consumes the entire build budget with zero slack.**
- Maximum "the graph does real work" legibility.
- **G5 risk-ranked WARD highest of its four.** At a 3h45m budget with no buffer and a hard
  deadline, this is the candidate most likely to produce a half-working submission.

---

## 4. Candidates MERGED AWAY at synthesis (not killed — absorbed)

| Idea | Disposition |
|---|---|
| G2-1 MENGER, G3-1 HEADWATER, G5-1 SOLE SOURCE | **Absorbed into the spine.** All three are the max-flow independence term; none is a product on its own. |
| G1 core, G2-3 MOTION, G5-2 reliability half | **Absorbed into the spine** (Dijkstra over `-ln(trust)`). MOTION's distinct contribution — *agents may argue only in `RO_QUERY` Cypher, so the server refuses the cheat* — is carried into **P2**. |
| G4-3 Nullius | **Absorbed into P4** (PageRank-earned trust; its sybil-ring 7th→1st→7th demo becomes P1's eval corpus). |
| G5-3 SPLITBRAIN, G4-2 Rescind | **Absorbed into P3** (fork-and-diff is the same mechanism; Rescind's "26× less recompute" becomes a P3 performance claim). |
| G1-3 FAULTLINE, G5-4 KEYSTONE | **Absorbed into P3** (`algo.betweenness` as the audit-target selector). |
| G1-4 HINDSIGHT | **Absorbed into P4** (falsification demoting a source and re-deciding the past *is* the hands-off flip). |
| G2-4 SAMEAS | **Demoted to infrastructure.** Entity resolution is a precondition for arbitration, not a product. In a 3h45m build it is solved by **seeding canonical entity IDs**, not by building a resolver. |
| G1-1 PORTCULLIS | **Split:** its write-gate half → **P2**; its `GRAPH.COPY` shadow half → **P3**. |

**No `[SEED]` or `[HISTORY]` late entrants.** `~/hackathon-toolkit/built-projects.md` contributes no
candidate here: Rules §8 forbids ported code, and no prior build maps onto graph-native arbitration
without being a straight repeat. Recorded, not silently skipped.

---

## 5. Two standing warnings that survive into every candidate

1. **`agentmesh` owns the contradiction-detection vocabulary.** The README's **first line** must
   say *arbitration*, not *detection* — "it names a winner" vs "it flags a conflict" — or we are
   read as a weaker agentmesh.
2. **`Quorum-falkordb` will out-polish us on execution regardless** (59+ commits, 660+ tests, CI,
   a11y). We do not win on polish in 3h45m. We win on **the one demo it structurally cannot
   stage**: a verdict reached with no human in the loop. Lead with that.

---

## 6. Synthesis recommendation into pool_gates

**P1 ⊕ P5 as the FLOOR** (2h50m–3h: arbiter + eval number + replayable receipts), **plus exactly
one ceiling layer** chosen by the gates from {P2, P3, P4}.

Recommended ceiling: **P4 TIDEMARK**, conditional on the flip occurring on honest seed data —
it is the cheapest of the three (+50m), it is the single thing Quorum cannot show, and it is the
only one whose climax requires no UI interaction, which matters when the deliverable is a
≤180-second recorded video rather than a live demo.

**P3 is the higher ceiling and should be reinstated if and only if a `GRAPH.COPY` latency probe in
the first 20 minutes comes back fast.** **P6 is a clock kill.**

Gate conditionals to apply (sponsor_track lens): **REQUIRE ≥1 surviving family on a sponsor
primitive shipped <90 days (L5)** — satisfied by Lipman's 2026-10-12 Dijkstra/A*/CCH post (6 days)
and Zhang's 2026-10-16 memory-stack post (2 days). **ADD the L12 name-collision probe** against the
live field before any name is committed.


---

# Gates — pool_gates (applied against the 3h45m budget, not the generators' 7h)

- **Gate 1 (kill list + [C] concerns):** no candidate matches the brief's kill list (contradiction *detection* = agentmesh; externally-corrected provenance scoring = Quorum; generic shared memory). Concern #15 (self-duplication) fires on **P5 as a standalone** — a commit-then-resolve receipt ledger is one shape however branded. P5 killed as a standalone, re-entered as a mandatory sub-component.
- **Gate 1b (ecosystem-native & load-bearing):** spine passes all four checks — three `algo.*` built-ins on the critical path.
- **Gate 2 (Demo Test):** P3 strongest ("pull one source, 94 beliefs die"); P2 strong ("the server refuses the write"); P1 passes weakly (a table is not a moment); P5 fails as a standalone.
- **Gate 4 (brief-utilization):** pool maps to the capability map, the kill list, the judge read, sponsor vintage and organizer feedback. <40% unmapped. PASS.
- **Gate 5 (anti-attractor):** zero house-shaped candidates; pool is mechanism-first. PASS.
- **Gate 6/7 (spike + ceiling):** deferred to Round-0 scores (below).
- **Gate 8 (rescue):** P3 held alive conditional on a first-20-minutes latency probe.
- **L5 (sponsor vintage <90d):** satisfied — Lipman's Dijkstra/A*/CCH post (6 days), Zhang's memory-stack post (2 days).
- **L12 (name-collision probe):** NOT YET RUN. Must run against the live field before any name is committed.

# round_0 — four independent fresh-context scorers, pool stripped of attribution and of the synthesis recommendation

Roles (archetype-by-weight was degenerate — all six criteria are derived at equal 16.7%, so roles were selected from `judge_reading` + `judging_process` instead): **Engineer** (Technical Excellence + Best Use of FalkorDB) · **Judge Whisperer** (Presentation Quality, artifact-only format) · **User Advocate** (UX + Potential Impact) · **Contrarian** (WILD, mandatory 4th).

| Candidate | Engineer | Judge Whisperer | User Advocate | Contrarian | **Total /100** |
|---|---:|---:|---:|---:|---:|
| P3 KEYSTONE counterfactual | 21 | 24 | 19 | 15 | **79** |
| P2 HAIRLINE write-gate | 18 | 21 | 19 | 15 | **73** |
| P5 DOCKET receipts | 17 | 19 | 17 | 15 | **68** |
| P1 ARBITER-BARE + eval | 19 | 18 | 14 | 14 | **65** |
| P6 WARD actuation | **11 KILL** | 16 | 18 | 12 | **57** |
| P4 TIDEMARK flip | 18 | 15 | **10 KILL** | 12 | **55** |

**KILLS**
- **P4 TIDEMARK — killed.** User Advocate: it ships a *silent* state change as the headline; nobody has ever asked for stored conclusions to change without being told; the only beneficiary of "nobody touched the keyboard" is a judge watching a recording. Engineer: PageRank measures citation centrality, not trust — a sybil ring that corroborates itself raises its own PageRank, which is precisely the attack the spine exists to defeat; on a few-hundred-node seeded graph, damping 0.85 converges near-uniform and will not move a verdict without a tuned seed. Judge Whisperer: a recording structurally cannot establish the absence of human action, and a tuned seed in front of the people who wrote the PageRank docs is the worst credibility trade available.
- **P6 WARD — killed on clock.** +90m on an already-optimistic spine leaves zero slack; it buys an if/else around a tool call and adds Docker orchestration on deadline day; it is also Track 01's crowded ground (71 sole-commit repos).

**BLOCKING TECHNICAL CORRECTIONS (all inherited from the spine, so they survive whichever candidate wins)**
1. **The Menger claim is wrong.** `algo.maxFlow` over unit-capacity *edges* counts **edge**-disjoint paths. Menger's vertex form needs **node splitting** (`:Source` → `v_in -[cap 1]-> v_out`). Without it, seven claims laundered through one shared blog post score max-flow 7, not 1 — the echo-chamber case the spine exists to defeat silently passes. ~30m of schema work. **Non-negotiable before build.**
2. **FalkorDB has no stored procedures.** "A single Cypher procedure names a winner" is unbuildable — `algo.*` are built-ins, there is no `CREATE PROCEDURE`. What ships is a parameterised query the client sends. Still engine-side execution and still defensible, but the README line "lives in Cypher, not in the API process" must be rewritten before an engine author reads it, or the pool's single differentiating claim is the first thing falsified.
3. **`algo.betweenness` is the wrong audit selector** — it ranks high-throughput intermediaries; a leaf source cited by 94 claims has betweenness ≈ 0 and would rank last. Use out-degree / reachability.
4. **The spine is 3h+, not 2h15m.** max-flow is per source→claim *pair*, dijkstra is per path, pageRank is global — that is an `UNWIND` orchestration plus a client-side fold, plus adversarial seed data, plus a UI. Under this repricing only a **+35m** layer fits the budget.
5. **The latency probe must time `algo.maxFlow` at target graph size**, not only `GRAPH.COPY`. max-flow is the most expensive procedure in the verified set, and a laundering corpus large enough to convince is large enough to make it the bottleneck.

**THE TWO MAJOR DISSENTS (both from scorers who had no access to each other)**

*User Advocate — "the question nobody in this pool answers":* what happens when the arbiter is **wrong**, and does the design admit it can be? There is no appeal path, no contest surface, no review queue — and the spine's own wedge frames "truth supplied by human correction" as Quorum's *weakness*, which means the design has deliberately removed the only repair mechanism anyone has. The score `independence × reliability × recency` is three incompatible units multiplied with no weights, no fitting and no stated ε, measured on a corpus authored to be measured by it. The failure modes are asymmetric and unmodelled: a wrong ALLOW pollutes memory, a wrong BLOCK permanently silences a correct agent *with no record the write was ever attempted*. And `UNDECIDED` is cited five times as the honesty feature but no candidate names who is on the other end of it — as specified it is a return value that falls on the floor. Pool-wide: **no named human is in pain about two agents disagreeing today**; P2 and P6 are the only candidates whose pain is already felt by someone with a keyboard.

*Contrarian — "the case that this whole pool loses":* the convergence in §0 is not evidence. All five generators shared one ruled direction, one facts card and one taste contract; the clean room was denied the *roster and judges* — the competitive variables — while keeping the *problem framing*, the only variable convergence could have tested. What they converged on is a truth oracle presented to the people who wrote the engine as if arithmetic on arbitrary units constituted epistemics. "Computed in Cypher, not in the API process" is invisible in a format where every entrant must file a Cypher artifact anyway, and maps to no slot in the six-criterion rubric — a locus-of-execution detail dressed as a thesis. "Autonomous" is not a wedge over Quorum; it is the thing Quorum **deliberately declined**. And Track 02's own published text — working/episodic/semantic/procedural, lifted verbatim from Korland and Zhang — is untouched by all six candidates: *the pool entered the sponsor's home track with a provenance-court product and will be read as a misfiled Track 01 entry.*

**THE CONTRARIAN'S EXCLUDED IDEA (P7, entered into the pool by the WILD role):**
**Memory retrieval as pathfinding over procedural traces.** Agents deposit episodic run-traces into one shared graph as `(:State)-[:ACTION {cost}]->(:State)`. A new agent facing a goal does not search semantically — it runs `algo.dijkstra`/`algo.AStar` over accumulated action-costs to retrieve the cheapest *known-to-work* route, so the second agent is measurably faster than the first because the graph, not a prompt, remembers. Load-bearing primitive: weighted shortest-path — the exact Dijkstra/A*/CCH surface Lipman published on six days ago. Strip FalkorDB and there is no retrieval function at all, because retrieval *is* the traversal. The pool excluded it because its framing started at "two agents disagree" (adjudication) rather than "one agent should not re-derive what another already paid for" (coordination), which is what Track 02 actually names. **Honest-data provable with no seeded corpus and no epistemic claim:** run the same task twice, show hop-count and wall-clock drop, show a third agent reusing a subpath neither of the first two completed.

**WHAT TWO OF FOUR SCORERS WOULD SHIP:** P2 reframed from "arbitration" to **memory admission control** — a write-gate on shared agent memory with `ALLOW`/`BLOCK`/`UNDECIDED`, DOCKET receipts bolted on as the README artifact. Contrarian's reasoning: it is the only candidate with a live consumer of the infra, the only one whose language lands inside Track 02's published taxonomy, and the only one that keeps a **defensible verdict space** (a decision about a *write*) rather than claiming to have computed truth in front of the people who wrote the engine.

---

# PHASE: fact_check (collapsed into a live hands-on probe)

Runtime: `docker run -d --name gh-falkor -p 6379:6379 -p 3000:3000 falkordb/falkordb:v4.22.1`
`MODULE LIST` → `graph ver 42201` ✓ (= v4.22.1, confirms the pin).

## FC-1 — CAPABILITY MAP IS WRONG (hard correction to intel)

`CALL dbms.procedures()` on the live engine. The ACTUAL `algo.*` set in v4.22.1:

```
algo.AStar, algo.BFS, algo.HarmonicCentrality, algo.MSF, algo.SPpaths,
algo.SSpaths, algo.WCC, algo.betweenness, algo.labelPropagation,
algo.maxFlow, algo.pageRank
```

Also present: `db.idx.cch.query`, `db.idx.vector.queryNodes`, `db.idx.fulltext.*`.

**`algo.dijkstra` DOES NOT EXIST. `algo.SCC` DOES NOT EXIST.** Intel's capability map
listed both. The spine's entire *reliability* term was specified on a procedure that is
not in the engine. This is a hard FAIL against intel's map and vindicates the
Contrarian's correlated-risk dissent ("every finalist rides the same unverified
procedure list").

**Fix (verified):** `algo.SPpaths({sourceNode, targetNode, relTypes, weightProp})`.

## FC-2 — Signatures recovered by bisection (all config keys were guessed wrong first)

```
algo.maxFlow({relationshipTypes:[<exactly one>], sourceNodes:[...], targetNodes:[...],
              capacityProperty:'cap'})  YIELD maxFlow, nodes
algo.SPpaths({sourceNode:n, targetNode:m, relTypes:['E'], weightProp:'nl'})
              YIELD path, pathWeight
algo.betweenness() YIELD node, score
algo.pageRank(<label>, <relType>)        -- 2 POSITIONAL args, not a config map
```

Rejected keys that error opaquely with `MaxFlow configuration contains unknown key`:
`sourceNode`, `targetNode`, `source`, `target`, `src`, `dest`, `sinkNodes`,
`weightProp`, `weightProperty`, `capacityProp`.

Multi-source / multi-sink is NATIVE on maxFlow → the super-source design is free.

## FC-3 — SILENT-WRONG-ANSWER TRAP (organizer-feedback material)

`algo.SPpaths` with `weightProperty`, `relationshipWeightProperty` or `costProperty`
does **not error** — it silently returns the UNWEIGHTED hop count (`pathWeight 2`).
Only `weightProp` is honoured. A build that guessed the key would have shipped a
reliability score that was secretly hop-count, and every test would have passed.

## FC-4 — THE MENGER BUG IS REAL (Engineer's blocking correction #1, proven)

Discriminating case — two citation chains funnelling through ONE shared intermediate `v`:

```cypher
CREATE (s:N{k:'s'}),(a:N{k:'a'}),(b:N{k:'b'}),(v:N{k:'v'}),(c:N{k:'c'}),(d:N{k:'d'}),(t:N{k:'t'})
CREATE (s)-[:E{cap:1.0}]->(a),(a)-[:E{cap:1.0}]->(v),(v)-[:E{cap:1.0}]->(c),(c)-[:E{cap:1.0}]->(t)
CREATE (s)-[:E{cap:1.0}]->(b),(b)-[:E{cap:1.0}]->(v),(v)-[:E{cap:1.0}]->(d),(d)-[:E{cap:1.0}]->(t)
```
→ **maxFlow = 2** (66ms). The echo chamber PASSES. Unit-capacity *edges* count
EDGE-disjoint paths; independence requires VERTEX-disjoint paths.

**Fix proven in both directions** by node-splitting every intermediate
(`X_in -[cap 1]-> X_out`):
- echo chamber (shared `v`) → **maxFlow = 1** (107ms) ✓ correctly collapsed
- genuinely independent chains (control) → **maxFlow = 2** (1.2ms) ✓ not over-collapsed

Node-splitting is therefore NON-NEGOTIABLE in the schema, not a post-hoc correction.

## FC-5 — Reliability path CONFIRMED

Edges weighted `nl = -ln(trust)`; minimising the sum maximises the product of per-hop trust.
`algo.SPpaths(... weightProp:'nl')` → `pathWeight 0.21072` (37ms) = the correct
maximum-reliability chain, not the fewest-hops chain.

## FC-6 — CONTAINMENT CONFIRMED (`GRAPH.RO_QUERY`)

```
GRAPH.RO_QUERY w "CREATE (:Hack{x:1})"
  → (error) graph.RO_QUERY is to be executed only on read-only queries   ✓ REJECTED
GRAPH.RO_QUERY w "MATCH (n:N) RETURN count(n)"
  → count(n) = 4                                                         ✓ ALLOWED
```
Server-side, not client-side. This is the only real containment boundary for
LLM-authored Cypher. (Python client exposes it; the TS client does not — issue #408 —
reachable from TS only by sending the raw Redis command.)

## FC-7 — LATENCY AT TARGET SIZE (Engineer's blocking correction #5, discharged)

Bench graph: node-split provenance DAG, **1402 nodes / 2400 unit-capacity edges** —
1 super-source → 600 origin sources → 400 split intermediates (`_in`/`_out`) → 1 claim.
Deliberately funnelled ~1.5 origins per intermediate so the answer is bottlenecked by
the split edges, i.e. the laundering-corpus shape.

```
maxFlow = 400   cold 41.1ms  |  warm 10.6ms  |  warm 12.9ms
```

**Verdict: max-flow is NOT the bottleneck.** ~11ms warm per source→claim pair means a
50-candidate arbitration round costs well under a second. The Engineer's repricing of
the spine stands on orchestration complexity (UNWIND + client-side fold), not on
engine latency.

## FACT_CHECK DISPOSITION

No finalist killed. One hard correction to an UPSTREAM artifact (intel's capability
map), two organizer-feedback entries logged, and the single highest-severity blocking
correction (Menger) proven real AND proven fixed before a line of product code.

