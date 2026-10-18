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
