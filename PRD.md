# PRD — MENGER

**Product:** MENGER — an admission-control gate on agent memory.
**Track declared:** 02 — Agent Memory and Coordination (sole). `[VERIFIED]` — `config.json` `tracks[1]`, `warroom/WINNER-BRIEF.md` line 4.
**Hackathon:** Graph Hacks (WeMakeDevs × FalkorDB). Deadline 2026-10-18 **19:29 WAT**. Hard. `[VERIFIED]` — `config.json` `deadline_local_wat`.
**Document owner:** `forge` (redo dispatch). **Status:** v1.0, written 2026-10-18, post-contract-freeze.
**Authority above this file:** `PULSE.md` Active Facts `AF-1..AF-17` > `CONTRACT.md` v1.0 (FROZEN) > `warroom/WINNER-BRIEF.md` > this PRD.
**This file does not redesign the mechanism.** The mechanism is ruled (LEDGER R1/R4). Where this PRD found a genuine flaw it is written into §8 as a risk and into §12 as a contradiction — never silently corrected.

---

## 0. How to read this document

### 0.1 The tag law

Every technical claim in this document carries exactly one state tag. A claim without a tag is a defect in this document.

| Tag | Means | Backed by |
|---|---|---|
| `[VERIFIED]` | A live probe recorded in `/Users/MAC/graph-hacks/.law12-feasibility.json`, or a `PULSE.md` Active Fact `AF-n`, or a line of a frozen source file, backs this exactly. | the probe record / the AF row / the cited file+line |
| `[UNVERIFIED]` | Derived by reasoning from `[VERIFIED]` facts. Sound but not measured. Could be wrong. | the reasoning chain stated inline |
| `[ASSUMED]` | A proposed value or belief with no measurement behind it at all. Named so it can be attacked. | nothing — that is the point of the tag |
| `NOT_CLAIMED` | We do not know and will not guess. An acceptable, expected answer in this project. | n/a |

### 0.2 The only measured numbers that exist in this project

**No MENGER endpoint has been built, started, or probed.** `[VERIFIED]` — `SUBMISSION_STATUS.md` §"What is NOT built", `PULSE.md` VF-F3. Therefore **every** performance figure, verdict output, response latency, or score value attributed to *MENGER itself* in this document is `NOT_CLAIMED`.

The measured numbers that do exist were taken against the **engine**, not the app, by `warroom/fact_check` against the live container `gh-falkor` (image `falkordb/falkordb:v4.22.1`):

| Number | What it measures | Tag | Record |
|---|---|---|---|
| `0.21072` | `pathWeight` returned by `algo.SPpaths` with `weightProp:'nl'` on the control fixture | `[VERIFIED]` | AF-3, `.law12-feasibility.json` AF-3, transcript §FC-5 |
| echo → `1` | `algo.maxFlow` on a node-split echo graph (two chains through one shared intermediate) | `[VERIFIED]` | AF-6, transcript §FC-4 |
| independent → `2` | `algo.maxFlow` on a node-split genuinely-independent control | `[VERIFIED]` | AF-6, transcript §FC-4 |
| 41ms cold / 11ms warm | `algo.maxFlow` on 1402 nodes / 2400 unit-capacity edges | `[VERIFIED]` | AF-7, transcript §FC-7 (41.1ms cold, 10.6ms and 12.9ms warm) |

`epsilon = 0.05` and `lambda = 0.01/hour` are **proposed, unmeasured defaults** — `[ASSUMED]`. They are calibrated during build slice B2 against the seeded deliberate-tie set-piece, and the value that ships is whatever `GET /health` reports. `[VERIFIED]` — `PULSE.md` DS-14, `PLAN.md` §5, `PULSE.md` VF-F4. See §12 C-2: the sources do not currently agree on λ.

### 0.3 Vocabulary discipline (prohibitions, not description)

These wordings are graded against us. A single instance in a judged artifact is a defect. `[VERIFIED]` — `PULSE.md` DS-3, DS-4; `warroom/WINNER-BRIEF.md` R-2, R-5; `CONTRACT.md` §4.

| # | Prohibited | Why it is fatal | Write instead |
|---|---|---|---|
| V-1 | Calling FalkorDB's `algo.*` algorithm calls "stored procedures" | FalkorDB has no such construct. The judging panel wrote this engine (`config.json` `likely_panel`). The sentence would be falsified on first read and would mark us as not having used the product. `[VERIFIED]` — DS-3 | **"a single parameterised Cypher query"** |
| V-2 | "detects conflicts" | That is the named competitor `agentmesh`'s claim and vocabulary. Borrowing it makes us a worse version of them. `[VERIFIED]` — DS-4, R-5 | **"refuses"**, **"admission control"** |
| V-3 | Any wording asserting MENGER establishes what is factually so (the veracity word) | Overreach we cannot support, in front of the panel least likely to grant it. MENGER decides **admissibility**. `[VERIFIED]` — DS-4, R-2 | **"admission control"**, **"source independence"** |

V-1/V-2/V-3 bind the README (`hackathon-package`), the console copy (`design-forge`, enforced by `CONTRACT.md` §4), the video narration (`hackathon-demo`), the submission-form prose (`hackathon-verify`), **and the API's own field names and error strings** (`PLAN.md` §7). Not just marketing copy — the API is read by judges.

### 0.4 Who must act on this document

| Reader | Read | Why |
|---|---|---|
| `hackathon-build` (engine chat) | §1, §2, §4, §5, §6, §8, §11 | §4 is the behaviour contract in product terms; §11 is what "done" means |
| `design-forge` (console chat) | §2, §3, §4, §5, §6, §8 R-4/R-9 | §5 is why the three components must stay unblended on screen |
| `hackathon-package` (README + Cypher artifact) | §0.3, §1, §2, §6, §7, §9, §10, §12 | §7 is the artifact script; §12 is what must not be published as fact |
| `hackathon-demo` (≤180s video) | §7 in full | the beat sheet is there |
| `hackathon-critique` | §8, §12 | the risks and the contradictions are where the attack surface is |
| A judge | §1, §2, §6 | that is the order a stranger will actually read in |

---

## 1. The problem

### 1.1 One sentence

Shared agent memory accepts a claim that looks corroborated and is actually **one source echoed through many mouths**, and nothing in the write path can tell the difference, because the difference is a property of the provenance *graph* and not of the claim's text.

### 1.2 The concrete failure, step by step

This is the scenario MENGER exists for. It is written as a sequence because the defect is a sequence — no single step looks wrong.

A multi-agent system maintains shared memory about customers. Five agents write to it: a planner, a scraper, a crawler, a CRM-sync worker, and a summariser. Shared memory holds a **slot** — a subject plus a predicate, e.g. `customer:acme` + `primary_region` — and the slot can hold one answer at a time because downstream agents act on it. `[VERIFIED]` — slot derivation is `slot_key = subject + "|" + predicate`, `CONTRACT.md` §2.1.

1. **The slot is filled correctly.** The CRM-sync worker writes `customer:acme | primary_region = eu-west-1`, citing a CRM export and a signed contract PDF. Two sources, two different systems, two different origins.
2. **A blog post appears.** Someone writes "Acme consolidates on us-east-1". It is wrong, or stale, or about a different Acme.
3. **The blog is syndicated.** Four aggregators repost it. Each reposts from the original, not from each other. Each now reads as its own source with its own URL, its own publication date, its own author.
4. **The scraper writes.** The scraper agent proposes `customer:acme | primary_region = us-east-1`, citing **four** of the aggregators. By every count the write path can perform, this is better supported than the incumbent: four citations against two.
5. **Shared memory accepts it.** Count-based corroboration — "how many sources agree?" — scores 4 > 2. Recency scores the new claim higher: it is minutes old, the incumbent is hours old. Text-similarity checks find nothing wrong; the four aggregator posts *do* say the same thing, which is precisely the problem.
6. **The error propagates.** Every downstream agent that reads the slot now plans against `us-east-1`. The planner provisions in the wrong region. The summariser writes it into a customer-facing brief. The error is now cited *by MENGER's own memory*, which is itself a new source.
7. **Nobody can reconstruct why.** The write succeeded. There is no record of what was compared, against what, with what weights, at what time. Post-mortem is archaeology.

Step 5 is the product's reason to exist. Steps 6–7 are why a receipt is mandatory rather than nice.

### 1.3 Why the obvious fixes do not work

| Fix | Why it fails | Tag |
|---|---|---|
| Count the citations | This is exactly the failure. Four echoes beat two origins. | `[UNVERIFIED]` — reasoning from §1.2; the counting failure is arithmetic, not measured |
| Weight by source trust alone | Each aggregator may have a respectable individual trust score. Four mediocre-trust independent sources *should* outweigh two good ones; four mediocre-trust **echoes** should not. Trust is a per-node property and cannot see the shared ancestor. | `[UNVERIFIED]` — reasoning |
| Deduplicate by text | The four posts are legitimately distinct documents. Text dedup either misses them or over-collapses genuinely independent reports of the same event. | `[UNVERIFIED]` — reasoning |
| Keep both facts and flag the contradiction | This is `agentmesh`'s approach and it is a real product. `[VERIFIED]` — `WINNER-BRIEF.md` §"Why this wins". But it moves the decision to the reader: the downstream planner still has to pick a region, now with less information and more ceremony. | `[VERIFIED]` for the competitor's behaviour; `[UNVERIFIED]` for the critique |
| Have a human resolve it | This is `Quorum-falkordb`'s approach. `[VERIFIED]` — `WINNER-BRIEF.md` §"Why this wins". It does not scale to a write path, and the write path is where the error enters. | as above |
| Count independent *paths* in the provenance graph | Correct quantity — and it is a graph computation, not a field comparison. This is MENGER. | `[VERIFIED]` — AF-6 proves the quantity is computable and that the naive version of it is wrong |

### 1.4 Why this is a graph problem and not a data problem

The quantity that separates step 1 from step 4 is: **how many genuinely independent origin-to-claim chains exist in the provenance graph?** Not how many citations. Not how many distinct URLs. How many chains that share no intermediate source.

That is **Menger's theorem**: the maximum number of vertex-disjoint paths between two vertices equals the minimum vertex cut between them, and it is computed as a max-flow. `[VERIFIED]` — the identity is textbook mathematics; what is `[VERIFIED]` by probe is that FalkorDB computes it: `algo.maxFlow` exists with the signature `{relationshipTypes:[exactly one], sourceNodes:[], targetNodes:[], capacityProperty:'cap'} YIELD maxFlow, nodes` (AF-4, `.law12-feasibility.json` AF-4).

And the naive version of it is **wrong in exactly the direction that would have let the echo chamber through**. `algo.maxFlow` over unit-capacity *edges* counts **edge**-disjoint paths. The discriminating case — two chains funnelling through one shared intermediate `v` — returned `maxFlow = 2`. `[VERIFIED]` — AF-6, transcript §FC-4, exact Cypher recorded. The fix is to **node-split** every source into an in/out pair joined by one unit-capacity edge, which makes edge-disjoint equal vertex-disjoint. After the split: echo graph → `1`, independent control → `2`. `[VERIFIED]` — AF-6, both directions proven live.

**This is the single most load-bearing design decision in the project, and it exists because a probe failed.** `[VERIFIED]` — `.law12-feasibility.json` AF-6 evidence, verbatim. Without it the product's headline claim is false in the demo's own hero scenario.

### 1.5 The substitution test

The disqualifier that kills most entries to this hackathon is "FalkorDB not load-bearing — if the product still works once FalkorDB is taken out, the graph is decoration". `[VERIFIED]` — `config.json` `disqualifiers[0]`, quoted from the organizer rules.

> Remove FalkorDB and there is no max-flow over the provenance DAG and no minimum-`-ln(trust)` path — so there is no independence score and no reliability score, so there is no verdict. The arbitration function **is** two graph algorithms. The product does not degrade without the graph; it ceases to have an output.

`[VERIFIED]` — this is the ruled substitution test, `WINNER-BRIEF.md` §"Substitution test", carried verbatim.

The strong form: MENGER's output type is `ALLOW | BLOCK | UNDECIDED`. Both inputs to that decision are graph-algorithm results. Delete the graph and the function has no arguments. There is no degraded mode to fall back to, because there is no non-graph way to compute "how many vertex-disjoint chains". `[UNVERIFIED]` — reasoning from the above.

---

## 2. What MENGER is, and what it is not

### 2.1 The product, in one sentence

MENGER is an **admission-control gate on agent memory** — when an agent tries to write a fact into shared memory, the graph itself returns **ALLOW**, **BLOCK**, or **UNDECIDED**, and every verdict ships with a replayable receipt. `[VERIFIED]` — `WINNER-BRIEF.md` §Thesis, locked wording; `LEDGER.md` §1.

### 2.2 README line 1 (locked — do not reword)

> An agent tried to write a memory. The graph refused it — ALLOW / BLOCK / UNDECIDED, decided by max-flow and shortest-path inside the engine.

`[VERIFIED]` — `WINNER-BRIEF.md` §Thesis "README line 1 (locked)". Owner: `hackathon-package`. Acceptance: DS-4 — line 1 matches this wording. This PRD does not have authority to change it; neither does `package`.

### 2.3 The boundary: admissibility, not veracity

**MENGER decides whether a write is admissible. It never decides whether a claim is factually so.** This is not modesty and it is not framing — it is the specification, and it is enforced structurally in five places.

| # | Where the boundary is enforced | How | Tag |
|---|---|---|---|
| B-1 | The output type | The verdict is about a **write**, not about a claim's standing in the world. `ALLOW` means "this write is admitted into the slot". `BLOCK` means "this write is refused". | `[VERIFIED]` — `CONTRACT.md` §1 `Verdict`, §2.1 decision rule |
| B-2 | `UNDECIDED` is first-class | A third of the output space is "the gate declines to rule". A veracity oracle has no such state; an admission controller must. `UNDECIDED` is not an error path — it writes a `(:Review)` node and returns a `review_id`. | `[VERIFIED]` — `CONTRACT.md` §2.1, §2.7 |
| B-3 | A refusal is recorded, not erased | `recorded: true` on **every** `/remember` response, including `BLOCK`. A refused claim persists as `(:Claim {status:'REFUSED'})` with its receipt retained, so the refusal is inspectable and appealable. MENGER refuses a write; it does not delete a position. | `[VERIFIED]` — `CONTRACT.md` §0 rule 4, §2.1; `PLAN.md` §7 |
| B-4 | The score is ordinal | The number ranks candidates against each other within one slot. It is not a probability, a confidence, or a percentage, and `score_is_ordinal: true` is stamped on every scored object so the console cannot quietly reinterpret it. | `[VERIFIED]` — `CONTRACT.md` §0 rule 2, §1 `ScoredClaim`, §4 |
| B-5 | The components are named for what they measure | `independence` counts vertex-disjoint origin chains. `reliability` is a product of per-hop trust. `recency` is an age decay. None of the three is named for a property of the world. | `[VERIFIED]` — `CONTRACT.md` §1 `Components` |

A judge who wants to attack this will ask: *if you rank by independence × reliability × recency and admit the winner, have you not just asserted the winner is right?* The answer that holds: **no — we have asserted the winner is better-sourced, and we have published the exact Cypher that produced that ordering so you can disagree with it specifically.** The receipt makes the claim falsifiable rather than authoritative. `[UNVERIFIED]` — reasoning; the receipt mechanism is `[VERIFIED]` (`CONTRACT.md` §2.5), the rhetorical sufficiency is not.

### 2.4 What MENGER is NOT

| Not | Why it matters | Tag |
|---|---|---|
| Not a fact-checker | It has no model of the world and no external corpus. It reads only the provenance graph it was given. | `[VERIFIED]` — schema is closed, `PLAN.md` §5 |
| Not a contradiction detector | Detection is `agentmesh`'s product and vocabulary (V-2). MENGER's output is a decision about a write, not a flag on a pair of facts. | `[VERIFIED]` — DS-4, R-5 |
| Not a human-in-the-loop resolver | `Quorum-falkordb` requires a human to supply the correction. MENGER refuses the write with no human in the loop, then shows the receipt. Adding a resolve endpoint would blunt exactly this differentiator — which is why `GET /review` is read-only in v1.0. | `[VERIFIED]` — `PLAN.md` §10, `CONTRACT.md` §2.7 ("v1.0 is read-only") |
| Not a query console | The demo is a writing agent being refused, visibly, and the refusal changing what the next agent reads. A graph browser with a search box is the failure mode this project was explicitly steered away from. | `[VERIFIED]` — `WINNER-BRIEF.md` §"Live consumer of the infra (TASTE C-IN1)" |
| Not a retrieval or RAG layer | It does not answer questions. It gates writes. Reads of the decided state are a side effect (`/slots`), not the product. | `[UNVERIFIED]` — reasoning from the endpoint set |
| Not multi-tenant, authenticated, or rate-limited | Out of scope, deliberately and recorded. See §10.2. | `[VERIFIED]` — `PLAN.md` §7, §10 |
| Not a general trust framework | Source trust values are **inputs** from the seeded corpus. MENGER does not learn, infer, or update them. | `[VERIFIED]` — `(:Source {id, kind, trust})` is seed data, `PLAN.md` §5 |

### 2.5 The one-slot invariant, stated plainly

A slot holds at most one admitted claim at a time, and contention is resolved at write time rather than read time. This is what makes it an **admission** problem: the decision happens at the gate, so a downstream reader never sees an ambiguous slot. `[UNVERIFIED]` — this is the reading of `CONTRACT.md` §2.2 (`winner` is a single object, nullable) and §2.1 (the decision compares incoming against `best_incumbent`). The contract does not state the invariant in those words; §12 OQ-3 flags that.

---

## 3. Personas

Three human personas and one machine persona. The judge persona is split because the panel is not homogeneous and the artifacts are read by all of them with no chance to adapt.

### 3.1 M1 — the writing agent (machine persona, the primary caller)

| Field | Value |
|---|---|
| Who | An autonomous agent in a multi-agent system with write access to shared memory |
| Calls | `POST /remember` and nothing else |
| Wants | A synchronous, deterministic answer it can branch on, in a single round trip |
| Cannot do | Interpret prose, retry thoughtfully, or ask a human |
| Needs from the product | A three-value enum, a stable field layout, and an id it can log |
| Fails if | The gate is slow enough to time out, or returns a verdict the agent cannot branch on |
| Served by | The decision is synchronous because max-flow is not the bottleneck at demo scale: 41ms cold / 11ms warm on 1402n/2400e, which is larger than the planned corpus. `[VERIFIED]` — AF-7. MENGER's own end-to-end `/remember` latency is `NOT_CLAIMED`. |

Design consequence: `/remember` returns the full decision — verdict, margin, epsilon, both scored claims, and a receipt id — in one response, so the agent never needs a second call to decide what to do. `[VERIFIED]` — `CONTRACT.md` §2.1.

### 3.2 H1 — the agent-platform engineer (the buyer)

| Field | Value |
|---|---|
| Who | Builds and operates the multi-agent system whose memory is being corrupted |
| Pain | §1.2 happened to them and the post-mortem took a day and produced nothing |
| Wants | A gate they can put in front of writes, and an audit record per decision |
| Evaluates by | "Can I see why it blocked that?" and "can I reproduce it?" |
| Served by | `GET /receipts/{id}` and `POST /receipts/{id}/replay` — the verbatim Cypher, the witness set, and a re-execution. `[VERIFIED]` — `CONTRACT.md` §2.5, §2.6 (shapes frozen; behaviour `NOT_CLAIMED`, not built) |
| Objects that | Two constants (ε, λ) decide a lot. Answer: both are published by `/health` and echoed on every decision, so they are inspectable rather than buried. `[VERIFIED]` — AF-17 |

### 3.3 H2 — the memory reviewer / operator

| Field | Value |
|---|---|
| Who | The human who owns the shared memory's quality |
| Wants | To know what the gate declined to rule on, and to not have anything disappear |
| Served by | `GET /review` — every `UNDECIDED` write, with its margin, the reason `WITHIN_EPSILON`, the receipt id, and both scored claims. `[VERIFIED]` — `CONTRACT.md` §2.7 |
| Explicitly not served in v1.0 | There is no resolve action. H2 can see the queue and cannot act on it through the API. This is a known, recorded limitation and a deliberate scope decision, not an oversight. `[VERIFIED]` — `PLAN.md` §10, `CONTRACT.md` §2.7 |

The honest statement for the README: *v1.0 shows the reviewer everything and lets them change nothing.* Owner: `hackathon-package`. Saying it is better than having a judge find it.

### 3.4 J-cluster — the judges

Judging is **artifact-only: no live demo, no call.** `[VERIFIED]` — AF-10, `config.json` `judging_process.live_demo: false` with the verbatim organizer line. The panel is not published (`/judges` is a hard 404, `[VERIFIED]` VF-I2); the likely panel is inferred.

| Id | Persona | Reads for | What wins them | What loses them |
|---|---|---|---|---|
| J1 | **Engine author** (inferred: FalkorDB CTO / Chief Architect; `config.json` `likely_panel`) | Whether the graph work is real | Exact Cypher, the correct `algo.*` call set, a named engine constraint we hit and worked around | One wrong call name, V-1, or an algorithm used decoratively. This reader will recognise `algo.dijkstra` as non-existent instantly. `[VERIFIED]` — AF-1 |
| J2 | **Agent-memory thesis author** (inferred: FalkorDB CEO / the Oct-16 agent-memory post author) | Whether this is a real memory-architecture problem | The admission-control framing, `UNDECIDED` as first-class, the slot model | A CRUD-over-a-graph read. `config.json` `judge_reading`: "will instantly read CRUD-over-a-graph as decoration" `[VERIFIED]` |
| J3 | **Hackathon host** (inferred: WeMakeDevs founder) | Whether it works and whether it is explained | "a small problem solved well beats a big one solved vaguely"; "clean and obvious beats clever and confusing"; "Write detailed answers. Short one-liners make it hard for us to see what you built." `[VERIFIED]` — `config.json` `likely_panel[4].cares_about`, quoted | Thin form prose. He has said so explicitly. |
| J4 | **The stranger** | Everything, alone, in one sitting, with nobody to ask | A README that orders itself problem → mechanism → receipt → run it | Any sentence that assumes a conversation |

J4 is not a hypothetical. AF-10 means a stranger is literally who reads it. **Every artifact is written for J4 and checked against J1.** `[VERIFIED]` — AF-10.

### 3.5 Anti-persona

**Not for:** a team that wants to keep every assertion and reconcile later (that is a different product, and `agentmesh` makes it); a team that wants a learned trust model; a team that needs authenticated multi-tenant memory. Saying who it is not for is part of "a small problem solved well". `[UNVERIFIED]` — positioning.

---

## 4. The product surface — user flows for all eight endpoints

The HTTP surface is **frozen at `CONTRACT.md` v1.0** and is not restated here field-by-field. `[VERIFIED]` — AF-15. This section is the **flow** layer: who calls it, when, what they are trying to accomplish, what they see, what breaks, and what it earns in §9. Field names and types come from the contract and from nowhere else.

Eight endpoints, frozen: `POST /remember`, `GET /slots`, `GET /slots/{key}`, `GET /slots/{key}/graph`, `GET /receipts/{receipt_id}`, `POST /receipts/{receipt_id}/replay`, `GET /review`, `GET /health`. `[VERIFIED]` — `CONTRACT.md` §2.

**Standing claim-state for all of §4:** no endpoint has been built or probed. Every shape below is `[VERIFIED]` against the frozen contract; every *behaviour* and every *number* is `NOT_CLAIMED`. `[VERIFIED]` — `PULSE.md` VF-F3, `CONTRACT.md` §5.

### 4.1 `POST /remember` — the write gate (the hero flow)

**Actor:** M1, the writing agent. **Trigger:** the agent has concluded a fact and wants it in shared memory.

**Preconditions:** `agent_id` exists as `(:Agent {id})`; every entry in `sources` exists as `(:Source {id})`; `sources` has at least one element. `[VERIFIED]` — `CONTRACT.md` §2.1 field notes, §3 error table.

**Flow:**

1. The agent posts `agent_id`, `subject`, `predicate`, `object`, `sources[]`, and optionally `asserted_at`.
2. MENGER derives `slot_key = subject + "|" + predicate`. **The slot is never supplied by the caller** — a caller cannot aim a write at a slot of its choosing. `[VERIFIED]` — `CONTRACT.md` §2.1.
3. The incoming claim is **created in the graph regardless of the verdict**. This is what makes `recorded: true` structurally honest rather than a reassuring field. `[VERIFIED]` — `CONTRACT.md` §2.1 (`claim_id` "the id assigned to the incoming claim (always created)").
4. MENGER scores the incoming claim and the best incumbent: `independence` via `algo.maxFlow` over the node-split DAG, `reliability` via `algo.SPpaths` with `weightProp`, `recency` via `exp(-λ·age_hours)`. All reads go through `GRAPH.RO_QUERY`. `[VERIFIED]` — `CONTRACT.md` §0 rules 5–7, AF-8.
5. `margin = score(incoming) - score(best_incumbent)`, with `score(best_incumbent) = 0.0` when the slot is empty. `[VERIFIED]` — `CONTRACT.md` §2.1 decision rule.
6. The ε-band rule assigns the verdict (§5.2).
7. On `UNDECIDED`, a `(:Review)` node is written and `review_id` is returned non-null.
8. A DOCKET receipt is persisted and `receipt_id` is returned — **always**, on all three verdicts. `[VERIFIED]` — `CONTRACT.md` §2.1 (`receipt_id` "always present").

**What the caller sees:** one `200` carrying the verdict, the slot key, the new claim id, its `ClaimStatus`, `recorded: true`, `margin`, `epsilon`, `score_is_ordinal: true`, the full `ScoredClaim` for both incoming and incumbent, the receipt id, and the review id or null. `[VERIFIED]` — `CONTRACT.md` §2.1.

**The hero beat.** The seeded echo-chamber set-piece: a claim citing two blog sources that look like corroboration scores `independence: 1`, because both funnel through one shared origin and the node-split collapses them to a single unit of capacity. The write is refused. `[VERIFIED]` for the mechanism and for the `1` on the probe fixture (AF-6); `NOT_CLAIMED` for the value MENGER will return on the not-yet-written seed corpus.

**Failure modes and what the caller gets:**

| Case | Response | Why this and not something else |
|---|---|---|
| `sources: []` or absent | `400 NO_SOURCES` | A claim with no provenance cannot be scored. Returning a verdict on no evidence would be the product contradicting itself. `[VERIFIED]` — `CONTRACT.md` §3 |
| Missing/malformed field, wrong type, empty string | `400 VALIDATION_ERROR` | `[VERIFIED]` — `CONTRACT.md` §3 |
| `agent_id` not in the graph | `422 UNKNOWN_AGENT` | 422 not 404: the request is well-formed, the referent does not exist. `[VERIFIED]` — `CONTRACT.md` §3 |
| One or more sources not in the graph | `422 UNKNOWN_SOURCE`, offenders in `detail.unknown` | Named offenders, so an agent can retry with a corrected citation list. `[VERIFIED]` — `CONTRACT.md` §1 `Error`, §3 |
| Engine unreachable | `503 ENGINE_UNAVAILABLE` | Not a stack trace. `[VERIFIED]` — `PLAN.md` §6 edge table |
| A boot assertion is red | `503 BOOT_ASSERTION_FAILED` | The service refuses to serve rather than serve a wrong headline number. `[VERIFIED]` — AF-16 |

**Earns:** Potential Impact, Best Use of FalkorDB, Creativity (§9).

### 4.2 `GET /slots` — the slot list

**Actor:** H1/H2 via the console; J4 via the deployed URL. **Trigger:** first contact with the running product.

**Flow:** the caller lands, filters `contested=true` to see only slots with two or more claims, and reads each row: `slot_key`, `claim_count`, `contested`, the current `winner` (nullable, with its own components), `last_verdict`, `last_decided_at`, `last_receipt_id`, `open_review_count`. The response also carries `epsilon` at the top level. `[VERIFIED]` — `CONTRACT.md` §2.2.

**Why `winner` is nullable:** a slot can be contested with nothing admitted. An interface that assumes a winner will render blank or crash on exactly the most interesting rows. `[UNVERIFIED]` — reasoning from the nullable annotation.

**Why `last_receipt_id` is on the list row:** it makes "list → receipt" a two-click path rather than a drill-down chain. For J4 reading a deployed URL alone, the shortest path from landing to the credibility artifact is the single most important navigation decision in the product. `[UNVERIFIED]` — reasoning; owner `design-forge`.

**Failure modes:** pagination bounds (`limit` 1..200, default 50) are the only validation surface; a `limit` outside the range is `400 VALIDATION_ERROR`. `[VERIFIED]` — `CONTRACT.md` §2.2, §3.

**Earns:** User Experience, Presentation Quality.

### 4.3 `GET /slots/{key}` — slot detail

**Actor:** H1/H2/J4. **Trigger:** a row in §4.2 looked contested.

**Key encoding:** `{key}` is the **URL-encoded** `slot_key`. `customer:acme|primary_region` becomes `customer%3Aacme%7Cprimary_region`. `[VERIFIED]` — `CONTRACT.md` §2.3. A raw `:` and `|` must still resolve or return `404 SLOT_NOT_FOUND` — never a 500. `[VERIFIED]` — `PLAN.md` §6 edge table.

**Flow:** the caller sees every contending claim as a full `ScoredClaim` with its own three components, the `ranking` array of claim ids best-first, `top_margin`, `epsilon` **and** `lambda`, `score_is_ordinal: true`, the receipt history for the slot, and the open review items with their margins. `[VERIFIED]` — `CONTRACT.md` §2.3.

**The product point of this screen:** it is where a reader can see that **the highest-citation claim is not the winner**. That is the thesis, visible without narration. `[UNVERIFIED]` — design reasoning; owner `design-forge`.

**Earns:** User Experience, Technical Excellence.

### 4.4 `GET /slots/{key}/graph` — the provenance subgraph

**Actor:** `design-forge`'s graph view; J1 and J4 reading it. **Trigger:** "show me why independence is 1".

**Flow:** returns `nodes[]`, `edges[]`, and `witness_sets`. Node ids are frozen conventions: `ss` for the super-source, `si:<source_id>` / `so:<source_id>` for a split pair, the bare `claim_id` for a claim. Edges carry `type` (`FLOW` / `DERIVED_FROM`), `cap`, and `nl`. `witness_sets` maps each claim id to the saturated split edges — the independent origins. `[VERIFIED]` — `CONTRACT.md` §2.4.

**The split is visible on purpose.** `si`/`so` pairs are the mechanism, not an implementation detail to hide. A reader who sees two aggregator chains visibly pinch through one `so:` node has understood the product without being told. `[VERIFIED]` — `CONTRACT.md` §2.4, stated normatively ("The split is visible on purpose").

**This endpoint exists so the console never has to negotiate the contract mid-build.** UX is 16.7% of the grade and `design_forge` runs concurrently with the engine; a visualisation that had to invent its own node-id scheme would diverge. `[VERIFIED]` — `PULSE.md` forge §Done, Decision #7.

**Known tension flagged, not fixed:** the edges in this response carry two relationship types, while `algo.maxFlow` accepts **exactly one** `relationshipTypes` entry (AF-4). See §8 R-10 and §12 C-5 — this is the most consequential open item in the document.

**Earns:** User Experience, Best Use of FalkorDB.

### 4.5 `GET /receipts/{receipt_id}` — the DOCKET receipt

Covered in full in §6. Flow summary: the caller gets the verdict, the margin, ε, λ, the winning claim id, the engine block (`image`, `graph`, `read_path`), one `candidates[]` entry per contending claim with its components, its `independence_witness` (max-flow value, witness nodes, and the explicit vertex-disjoint paths), its `reliability_path` (nodes, edges with per-hop `trust` and `nl`, and `path_weight`), the `cypher[]` log of verbatim parameterised statements with their params and durations, and the `replay` pointer. `[VERIFIED]` — `CONTRACT.md` §2.5.

**Earns:** Technical Excellence, Best Use of FalkorDB, Presentation Quality.

### 4.6 `POST /receipts/{receipt_id}/replay` — replay by id

**Actor:** H1 proving the gate to themselves; J1 and J4 proving it to themselves. **Trigger:** "I do not believe that number."

**Flow:** empty body. MENGER re-executes `receipt.cypher[]` verbatim through `GRAPH.RO_QUERY` against the live graph and returns `matches_original`, a per-statement `original` / `replayed` / `match` triple, `components_then`, `components_now`, and a typed `divergence[]`. `[VERIFIED]` — `CONTRACT.md` §2.6.

**The divergence taxonomy is the subtle product decision.** Three reasons: `RECENCY_DECAY`, `GRAPH_MUTATED`, `ENGINE_DIFF`. `matches_original` **ignores recency drift** — time moves, so `recency` will differ on every replay and that is expected and benign — and is `false` only on `GRAPH_MUTATED` or `ENGINE_DIFF`. `[VERIFIED]` — `CONTRACT.md` §2.6.

Without that distinction, replay would be useless: every receipt would "fail" to reproduce for a reason that has nothing to do with correctness, and a judge would reasonably conclude the receipts are decorative. Naming the three reasons separately is what makes a non-match meaningful. `[UNVERIFIED]` — reasoning.

**Failure modes:** `404 RECEIPT_NOT_FOUND`; `409 REPLAY_MISMATCH` **only when a recorded statement fails to execute** (not when a value differs); `503 ENGINE_UNAVAILABLE`. `[VERIFIED]` — `CONTRACT.md` §2.6, §3.

**Earns:** Technical Excellence, Potential Impact.

### 4.7 `GET /review` — the review queue

**Actor:** H2. **Trigger:** "what did the gate decline to rule on?"

**Flow:** returns `total`, pagination, `epsilon`, and `items[]`. Each item: `review_id`, `status` (`OPEN` / `RESOLVED`), `created_at`, `slot_key`, `margin`, `reason` (`WITHIN_EPSILON` — the only value in v1.0), `receipt_id`, and both scored claims with components. Query `status` is `OPEN` / `RESOLVED` / `ALL`, default `OPEN`. `[VERIFIED]` — `CONTRACT.md` §2.7.

**This is the "nothing is silently lost" surface**, and it is the product-level answer to the fairest attack on the whole design: *what happens to the writes you got wrong?* They are in a queue, with the margin that put them there and a receipt that shows the working. `[VERIFIED]` — `CONTRACT.md` §0 rule 4; the rhetorical sufficiency is `[UNVERIFIED]`.

**v1.0 is read-only.** The `RESOLVED` state exists in the enum and `REVIEW_NOT_FOUND` is reserved in the error table, but no mutation endpoint exists and the console must not assume one. `[VERIFIED]` — `CONTRACT.md` §2.7, §3.

**Earns:** Potential Impact, User Experience.

### 4.8 `GET /health` — liveness and the boot assertions

**Actor:** the console status strip; J1 verifying the headline claim; `hackathon-package` reading the live ε/λ to write the README.

**Flow:** returns `ok`, the engine block, `epsilon`, `lambda`, `seeded_at`, the `corpus` counts, and `boot_checks` with all three assertions as `{expected, actual, pass}` triples: `node_split_echo` = 1, `node_split_independent` = 2, `sp_path_weight` = 0.21072. Any mismatch returns **`503 BOOT_ASSERTION_FAILED`** with the failing check in `detail`. `[VERIFIED]` — AF-16, `CONTRACT.md` §2.8.

**Why this is a product feature and not an ops endpoint.** Two of the project's highest-severity risks — the node-split being wrong (R-1, critical) and the `weightProp` key regressing silently (R-3, high) — are failure modes that *produce a plausible wrong number with no error*. A green test suite cannot see either. Publishing the three controls as a public field turns both mitigations into evidence a judge can check in one request, with no explanation from us, and makes the service **fail closed**: it refuses to serve rather than serve a wrong headline number. `[VERIFIED]` — AF-16; `PULSE.md` forge §Additions names this as the session's new transferable practice.

**Three consumer rules, normative:**
- The console **must not** hardcode `epsilon`, `lambda`, or the corpus counts — it reads them here. `[VERIFIED]` — AF-17, DS-8, R-4, `CONTRACT.md` §4.
- `hackathon-package` **must not** copy `0.05` out of `PLAN.md` into the README — it reads the live value. `[VERIFIED]` — `PULSE.md` forge §"For Next Skill: package".
- The corpus counts in the contract example are the seed's targets, not measurements. `[VERIFIED]` — `CONTRACT.md` §2.8 closing note.

**Earns:** Technical Excellence, Best Use of FalkorDB, Presentation Quality.

### 4.9 Flow-to-criterion coverage check

| Endpoint | Primary persona | Primary criterion earned |
|---|---|---|
| `POST /remember` | M1 | Potential Impact / Best Use of FalkorDB |
| `GET /slots` | H1, J4 | User Experience |
| `GET /slots/{key}` | H1, J4 | User Experience / Technical Excellence |
| `GET /slots/{key}/graph` | J1, J4 | Best Use of FalkorDB / User Experience |
| `GET /receipts/{id}` | H1, J1 | Technical Excellence / Presentation Quality |
| `POST /receipts/{id}/replay` | H1, J1 | Technical Excellence |
| `GET /review` | H2 | Potential Impact |
| `GET /health` | J1, `package` | Technical Excellence / Best Use of FalkorDB |

Every endpoint has a named persona and a named criterion. An endpoint with neither would be scope to cut. `[UNVERIFIED]` — mapping judgement; the criterion weights are §9.

---

## 5. Decision semantics as a product surface

The decision rule is not an internal detail. It is rendered, echoed on every response, and published. This section is why each part of it is shaped the way it is.

### 5.1 The three components

```
independence(claim) = algo.maxFlow(:SuperSource -> claim) over unit-capacity edges
                      of a NODE-SPLIT provenance DAG
                    = the number of VERTEX-disjoint origin->claim chains
                    = Menger's theorem                                   -> INTEGER

reliability(claim)  = exp(-pathWeight),  pathWeight = algo.SPpaths over
                      edges weighted nl = -ln(trust), key `weightProp`   -> float 0..1

recency(claim)      = exp(-lambda * age_hours)                           -> float 0..1

score               = independence * reliability * recency   -- ORDINAL, NOT CARDINAL
```

`[VERIFIED]` — carried verbatim from `WINNER-BRIEF.md` §Mechanism and `PLAN.md` §5; the `algo.*` signatures are AF-3/AF-4.

**Why `-ln(trust)`:** minimising a sum of `-ln(trust)` maximises the **product** of per-hop trust along the chain. Shortest-path machinery is additive; trust composes multiplicatively; the log converts one into the other. So `exp(-pathWeight)` is the product of per-hop trust along the best chain, recovered as a number in 0..1. `[VERIFIED]` — the identity is arithmetic; the FalkorDB behaviour is AF-3 / transcript §FC-5 (`pathWeight 0.21072` on the control fixture, the maximum-reliability chain rather than the fewest-hops chain).

**Degenerate inputs to watch:** `trust = 1` gives `nl = 0`; `trust = 0` gives an infinite weight. The seed must keep `trust` in `(0, 1]`. `[VERIFIED]` — `PLAN.md` §9 R-3 decision tree states exactly this.

### 5.2 The verdict and the epsilon band

```
margin = score(incoming) - score(best_incumbent)   // 0.0 when the slot is empty

margin  >  +epsilon   ->  ALLOW      status ADMITTED   review_id null
margin  <  -epsilon   ->  BLOCK      status REFUSED    review_id null
|margin| <= epsilon   ->  UNDECIDED  status QUEUED     review_id set, a (:Review) is written
```

`[VERIFIED]` — `CONTRACT.md` §2.1, normative. The `verdict` → `status` mapping is total and fixed: `ALLOW→ADMITTED`, `BLOCK→REFUSED`, `UNDECIDED→QUEUED`. `[VERIFIED]` — same.

**Why a band and not a threshold.** A bare `>` comparison forces a ruling on every write, including the ones where the two candidates are indistinguishable under a score that is explicitly ordinal. The band is the product admitting that an ordinal comparison has a resolution limit, and routing everything below that limit to a human instead of guessing. The band is what makes `UNDECIDED` principled rather than a fallback. `[UNVERIFIED]` — design reasoning; the rule itself is `[VERIFIED]`.

**Why ε is echoed on every decision and not just documented.** A verdict without its ε is not interpretable: `margin = 0.04` is `UNDECIDED` at ε=0.05 and `ALLOW` at ε=0.01. Shipping the constant with the verdict makes every response self-contained, and makes the console structurally incapable of drifting out of sync with the server. `[VERIFIED]` — AF-17, `CONTRACT.md` §0 rule 9; the reasoning is `[UNVERIFIED]`.

**The current values.** ε = 0.05 and λ = 0.01/hour are **proposed, unmeasured defaults** — `[ASSUMED]`. They are calibrated in build slice B2 so the seeded deliberate-tie set-piece actually lands inside the band, and the shipped value is whatever `/health` reports. `[VERIFIED]` — DS-14, `PLAN.md` §5, `PULSE.md` VF-F4. **The sources do not currently agree on λ** — see §12 C-2.

**Calibration is a seed property, not a tuning dial.** The honest statement, which `hackathon-package` should make: ε was chosen so that a deliberately-constructed near-tie lands in the review queue. Any ε can be defended; what cannot be defended is choosing ε after seeing which answer we wanted. `[UNVERIFIED]` — reasoning; the calibration instruction is `[VERIFIED]` (DS-14).

### 5.3 Why the score is ORDINAL and not cardinal

`score_is_ordinal: true` is stamped on every object that carries a `score`. The console may not render `score` as a percentage, a confidence, or a probability. `[VERIFIED]` — `CONTRACT.md` §0 rule 2, §4.

The reasons, in the order a skeptic will raise them:

1. **The units do not compose into anything.** `independence` is a count of chains. `reliability` is a product of trust values in 0..1. `recency` is a decay in 0..1. Their product has no unit and no interpretation except "bigger ranks higher". Claiming otherwise would be the single most attackable sentence in the submission. `[UNVERIFIED]` — reasoning; this is the User Advocate's standing dissent, R-4, `[VERIFIED]` as a recorded dissent.
2. **It is only ever compared within one slot.** `margin` is a difference between two scores for the same `slot_key`. No code path compares scores across slots, and no response invites it. `[VERIFIED]` — `CONTRACT.md` §2.1, §2.3 (`top_margin` is within-slot).
3. **The components are published, so the ordering is auditable component-by-component.** A reader who disagrees with the fold can rank by `independence` alone from the same response. That is a feature of surfacing them separately. `[UNVERIFIED]` — reasoning.
4. **A cardinal reading invites a calibration question we cannot answer.** "Is 1.50 twice as good as 0.75?" has no answer. "Does 1.50 rank above 0.75 in this slot?" has exactly one. `[UNVERIFIED]` — reasoning.

**Attack and answer.** *If the score is only ordinal, how can ε — an absolute threshold on a difference of ordinal scores — mean anything?* The honest answer: ε is a **resolution floor on the ordering**, not a magnitude in any unit. It says "differences this small are not a reliable ordering", which is a statement about the ordering and not about the world. It is calibrated empirically against a constructed near-tie, which is the only honest way to set it, and it is published so it can be argued with. This is the sharpest available attack on the design and it should be answered **in the README**, not left for a judge to find. Owner: `hackathon-package`. `[UNVERIFIED]` — reasoning; flagged as R-9 in §8.

### 5.4 Why the three components are surfaced separately and never blended

The structural commitment: **no code path produces a blended number before the response layer.** `arbiter.score` returns the three components as separate typed fields all the way through; the only blend that exists as a variable is the ordinal `score` itself. `[VERIFIED]` — `PLAN.md` §4.

What this buys:

| Consequence | Why it matters |
|---|---|
| `path_weight` is surfaced **raw** next to `reliability` | The `weightProp` hop-count trap becomes auditable from the receipt by a judge with no help from us: an integer `path_weight` is a tell. `[VERIFIED]` — `CONTRACT.md` §0 rule 7 |
| `independence` is typed **integer**, not float | A count of chains is a count. A float here would be a category error and would invite a cardinal reading. `[VERIFIED]` — `CONTRACT.md` §0 rule 6 |
| `age_hours` ships with `recency` | A reader can recompute `exp(-λ·age_hours)` from the response and λ from `/health`. `[VERIFIED]` — `CONTRACT.md` §1 `Components` |
| The console cannot accidentally blend | `CONTRACT.md` §4 forbids it; the API never offers a blended field to render. `[VERIFIED]` |

This is R-4 answered **structurally rather than by argument**: you cannot surface a blend if the blend never exists as a variable. `[VERIFIED]` — `PLAN.md` §9 R-4 decision tree, verbatim intent.

### 5.5 Worked reading of a decision (shapes verified, numbers illustrative)

Using the contract's own illustrative example `[VERIFIED]` as a shape, `NOT_CLAIMED` as values — `CONTRACT.md` §2.1:

- **Incoming** (`clm_0061`, `us-east-1`, cites two blog sources): `independence: 1`, `reliability: 0.5220`, `recency: 1.0`, `path_weight: 0.65021`, `score: 0.5220`.
- **Incumbent** (`clm_0007`, `eu-west-1`, cites a CRM export and a contract PDF): `independence: 2`, `reliability: 0.8100`, `recency: 0.9261`, `path_weight: 0.21072`, `score: 1.5002`.

What a reader can do with this unaided: check `exp(-0.65021) = 0.5220` and `exp(-0.21072) = 0.8100`; check `2 × 0.8100 × 0.9261 = 1.5003`; observe that the incoming claim has **more citations** and **less independence**, which is the entire thesis in two integers.

**What they will also find, and we must fix before publishing:** the example's `margin` is `-0.3104`, while `0.5220 - 1.5002 = -0.9782`. The numbers are labelled illustrative `[VERIFIED]` — `CONTRACT.md` §5 — so this is not fabrication, but a judge who recomputes will find it, and the recomputability is the whole point of the receipt. **Every published example must be regenerated from a real run, never hand-written.** See §8 R-11 and §12 C-1. Owners: `hackathon-build` (generate), `hackathon-package` (publish only generated output).

---

## 6. The DOCKET receipt — the headline product feature

### 6.1 What it is

Every verdict — `ALLOW`, `BLOCK`, and `UNDECIDED` alike — persists a receipt, retrievable by id, containing everything needed to re-derive the verdict by hand. `[VERIFIED]` — `CONTRACT.md` §2.1 (`receipt_id` always present), §2.5. Receipts are **Dami-mandated**, not optional: "P5 DOCKET receipts MANDATORY". `[VERIFIED]` — `PULSE.md` Decision #4, LEDGER R4.

### 6.2 The seven things a judge can do with one, unaided

This is the acceptance test for the receipt as a product feature. Each row is something J1 or J4 can do alone, with no explanation from us, from a single `GET`.

| # | What they do | What makes it possible | Tag |
|---|---|---|---|
| D-1 | **Read the exact Cypher that ran.** Not a paraphrase, not a representative example — the verbatim parameterised text that was executed, with the params separate, in execution order. | `receipt.cypher[]`, each entry `{label, read_command, query, params, duration_ms}` | `[VERIFIED]` shape — `CONTRACT.md` §2.5 |
| D-2 | **Check we used the right key.** `weightProp` appears in the recorded `algo.SPpaths` text. The panel wrote this engine and knows `weightProperty` silently returns hop count. Seeing the correct key in the receipt is a credential. | the `reliability.SPpaths` entry's `query` | `[VERIFIED]` — AF-3; the key is pinned in `CONTRACT.md` §2.5 with the trap documented in situ |
| D-3 | **Check the containment boundary.** Every statement carries `read_command: "GRAPH.RO_QUERY"`, and `receipt.engine.read_path` says the same. `GRAPH.RO_QUERY` rejects writes **server-side** — CREATE rejected, MATCH allowed. | `engine.read_path`, per-statement `read_command` | `[VERIFIED]` — AF-8, transcript §FC-6 |
| D-4 | **See the witness set.** `independence_witness` gives `max_flow`, the `witness_nodes` (the saturated split edges = the independent origins), and the explicit vertex-disjoint `paths` as node-id arrays. The independence number is not asserted; the chains that justify it are listed. | `candidates[].independence_witness` | `[VERIFIED]` shape — `CONTRACT.md` §2.5 |
| D-5 | **See the reliability path hop by hop.** `reliability_path` gives the node sequence, each edge with its `trust` and its `nl`, and the `path_weight`. A reader can verify `nl = -ln(trust)` per hop and that the hops sum to `path_weight`. | `candidates[].reliability_path` | `[VERIFIED]` shape; see §12 C-4 — the contract's illustrative instance does **not** sum, and must not be published as-is |
| D-6 | **Check the engine.** `engine.image` names `falkordb/falkordb:v4.22.1` and `engine.graph` names the graph. The pin is load-bearing, not cosmetic: GraphRAG-SDK is broken on 6.0.x. | `receipt.engine` | `[VERIFIED]` — AF-9 |
| D-7 | **Replay it.** `POST /receipts/{id}/replay` re-executes the recorded statements verbatim and reports whether they reproduce, with typed divergence. | `receipt.replay`, §4.6 | `[VERIFIED]` shape; behaviour `NOT_CLAIMED` |

**The product claim this supports, stated at the strength it can hold:** a skeptic can disagree with a MENGER verdict **specifically** — naming the statement, the witness chain, or the constant they object to — rather than generally. That is the difference between an auditable gate and an opaque one. `[UNVERIFIED]` — reasoning; every mechanism it rests on is `[VERIFIED]` as a frozen shape.

### 6.3 Replay, and what a non-match means

`matches_original` ignores `recency` drift. Time passes between the decision and the replay, so `recency` will differ on every replay; `reason: "RECENCY_DECAY"` is expected and benign. `matches_original` is `false` only for `GRAPH_MUTATED` or `ENGINE_DIFF`. `[VERIFIED]` — `CONTRACT.md` §2.6.

| Divergence reason | Means | What the reader should conclude |
|---|---|---|
| `RECENCY_DECAY` | Only `recency` moved, because the clock moved | Nothing is wrong. The receipt reproduces. |
| `GRAPH_MUTATED` | A component other than `recency` changed because the provenance graph changed since the decision | The verdict was correct **at the time**, and the graph has since changed. The receipt is still a faithful record. |
| `ENGINE_DIFF` | A recorded statement returned a different result on the same graph | Something is actually wrong — engine version drift or non-determinism. This is the only alarming case. |

Separating these three is what makes replay a credibility feature instead of a liability. A single boolean would be `false` almost always, for the most boring possible reason. `[UNVERIFIED]` — reasoning.

### 6.4 Why receipts are stored flat and not as a subgraph

Receipts are `(:Receipt)` nodes with JSON-encoded string properties, not graph structure. `[VERIFIED]` — `PLAN.md` §5.

The reason is a correctness hazard, not a style preference: `algo.maxFlow` takes `relationshipTypes` with **exactly one** type (AF-4, `[VERIFIED]`), so any extra relationship type living in the same graph is a hazard near the headline number. An audit log modelled as edges would put non-provenance edges inside the graph the flow algorithms run over. Keep the audit log flat. `[VERIFIED]` — `PLAN.md` §5, verbatim reasoning.

### 6.5 What the receipt must NOT do

- It must not contain a blended score presented as the reason. The components are the reason. `[VERIFIED]` — `CONTRACT.md` §0 rules 1–2.
- It must not contain hand-written numbers. See §8 R-11.
- It must not use V-1/V-2/V-3 vocabulary in any `label` or prose field. `[VERIFIED]` — `PLAN.md` §7 ("enforced in the API's own strings, not only in the README").
- It must not be the only place the Cypher appears. A **separately listed artifact** of the Cypher queries and algorithms is a stated submission requirement, and the receipt's `cypher[]` is what that artifact is generated from. `[VERIFIED]` — `config.json` `submission_requirements[2]`, DS-5, `CONTRACT.md` §2.5.

---

## 7. Demo script — written for artifact-only judging

**AF-10: judging is artifact-only. No live demo, no call.** `[VERIFIED]` — AF-10, `config.json` `judging_process` with the verbatim organizer line: "Judges score what you submit and nothing else."

Consequence: there is no moment where a human explains anything. The README, the ≤180s video, and the submission-form prose **are** the product. This section is the script a stranger follows alone. It is written so that `hackathon-package` and `hackathon-demo` execute it rather than re-invent it.

### 7.1 Asset inventory and owners

| Asset | Owner skill | Requirement source | Tag |
|---|---|---|---|
| Public source-code repository URL | `deploy-to-github` | `config.json` `submission_requirements[0]` | `[VERIFIED]` |
| README with setup instructions **and the graph data model** | `hackathon-package` | `submission_requirements[1]` | `[VERIFIED]` |
| The Cypher queries / graph algorithms as a **separately listed artifact** | `hackathon-package` | `submission_requirements[2]`, DS-5 | `[VERIFIED]` |
| Demo video ≤180s | `hackathon-demo` | `config.json` `demo_video_requirements.max_seconds: 180`; note the field itself records "No max length published for Graph Hacks specifically" — treated as a hard cap because shorter is safe either way | `[VERIFIED]` for the config value; `[ASSUMED]` for 180s being binding (A-I2, resolved as a hard cap) |
| Live deployment URL (preferred) | `deploy-to-github`, livetest folded | `submission_requirements[4]`, DS-12 | `[VERIFIED]` |
| Track designation — Track 02, sole | `hackathon-verify` at form entry | `submission_requirements[5]`, DS-7 | `[VERIFIED]` |
| AI-assistance disclosure in README | `hackathon-package` | `submission_requirements[6]`, DS-6 | `[VERIFIED]` |
| Submission-form prose | `hackathon-verify`, real Chrome, singleton browser | form fields are **UNEXTRACTED** — login-gated SPA | `[VERIFIED]` that they are unextracted (`config.json` `submission_form_fields_status`); the fields themselves are `NOT_CLAIMED` |

### 7.2 The README spine (ordered for J4, the stranger reading alone)

Each section has an acceptance test a grep or a glance can resolve.

| # | Section | Must contain | Acceptance |
|---|---|---|---|
| 1 | **Line 1** | The locked sentence from §2.2, verbatim | DS-4: line 1 matches `WINNER-BRIEF.md` |
| 2 | **The failure, in five lines** | §1.2 compressed: four aggregator citations beat two origins, memory accepts it, downstream acts on it | a reader who stops here still knows what the product is for |
| 3 | **What MENGER does** | ALLOW / BLOCK / UNDECIDED on a write; admissibility, not veracity (§2.3) | no V-1/V-2/V-3 instance anywhere in the file |
| 4 | **The graph data model** | The node-split schema verbatim from `WINNER-BRIEF.md` §Schema, with the `si`/`so` pair explained as the vertex capacity | explicitly required by `submission_requirements[1]` |
| 5 | **The two algorithms** | `algo.maxFlow` for independence, `algo.SPpaths` with `weightProp` for reliability, with the exact call forms | links to the separate Cypher artifact (DS-5) |
| 6 | **Why the node-split exists** | The probe failed: unit-cap edges count edge-disjoint paths; echo → 2 before the split, 1 after; independent → 2 | this is the strongest single paragraph available and it is `[VERIFIED]` (AF-6) |
| 7 | **The receipt** | §6.2's seven affordances, with one real receipt pasted in | the pasted receipt is generated, never typed (R-11) |
| 8 | **ε and the ordinal score** | ε stated explicitly, read from `/health`; the score stated as ordinal not cardinal; §5.3's attack answered | DS-8 |
| 9 | **The substitution test** | §1.5 verbatim | directly answers `config.json` `disqualifiers[0]` |
| 10 | **Run it** | `docker run` with the pinned tag, seed, start, then `curl /health` and read the three boot checks | a stranger gets to a green `/health` with no help |
| 11 | **What is not built** | Review resolution, auth, rate limiting, multi-tenancy; and the stretch's status | §10; honesty is cheaper than being caught |
| 12 | **AI-assistance disclosure** | Required section | DS-6 |
| 13 | **Track declaration** | Track 02 only | DS-7 |

Section 10's first command carries the engine pin: `falkordb/falkordb:v4.22.1`, explicitly tagged, never `:latest`. `:latest` currently resolves to 4.22.1 but GraphRAG-SDK is broken on 6.0.x, so the pin is load-bearing. `[VERIFIED]` — AF-9, R-8, `config.json` `pinned_runtime`.

### 7.3 The ≤180s video — beat sheet

Owner `hackathon-demo`. No voice-over claim is made here about what MENGER returns; every on-screen value must be a real response from a running instance at recording time. Timings are a budget, `[ASSUMED]`.

| Beat | Budget | On screen | Said |
|---|---|---|---|
| 1. The failure | 0:00–0:25 | The slot `customer:acme | primary_region` holding `eu-west-1` with two citations; then a second claim arriving with four | "Four citations against two. Every count-based memory takes the four." |
| 2. The write is refused | 0:25–0:55 | A real `POST /remember`, the response rendered: `BLOCK`, `independence: 1` on the four-citation claim | "The graph refused it. Four citations, one independent origin." |
| 3. Why — the subgraph | 0:55–1:30 | `GET /slots/{key}/graph` rendered: the four chains visibly pinching through one `so:` node | "The node-split gives every source one unit of capacity. Four chains through one source is one chain." |
| 4. The receipt | 1:30–2:15 | `GET /receipts/{id}`: the verbatim Cypher with `weightProp`, `read_command: GRAPH.RO_QUERY`, the witness set, the two components | "Every verdict ships the exact query that produced it." |
| 5. Replay | 2:15–2:40 | `POST /receipts/{id}/replay` → `matches_original: true`, with the `RECENCY_DECAY` divergence row visible | "Re-run it. It reproduces — except recency, because time moved." |
| 6. Health / the honesty beat | 2:40–3:00 | `GET /health`: the three boot checks green, ε and λ published | "If the node-split ever stops working, this returns 503 and the service refuses to serve." |

Hard constraints on the recording: no V-1/V-2/V-3 wording in narration or captions; no number on screen that was not produced by a live call; the engine tag visible at least once. `[VERIFIED]` — DS-3, DS-4, AF-9.

**Beat 3 is the one that cannot be cut.** It is the only beat that shows the mechanism rather than the output, and the mechanism is the differentiator. `[UNVERIFIED]` — judgement.

### 7.4 Submission-form prose

The form fields are **UNEXTRACTED** — a login-gated SPA that returns only a placeholder to a fetcher, and must be read in real Chrome before submission. `[VERIFIED]` — `config.json` `submission_form_fields_status`; `PULSE.md` intel §"Blockers for Downstream". The actual field list is `NOT_CLAIMED`.

What is known about how to fill it: the host has said, verbatim, *"Write detailed answers. Short one-liners make it hard for us to see what you built."* `[VERIFIED]` — `config.json` `likely_panel[4].cares_about`. So every free-text field gets a real paragraph, and the four paragraphs to have pre-written are:

1. **What it does** — §2.1 plus the §1.2 failure in two sentences.
2. **How FalkorDB is load-bearing** — the substitution test (§1.5) verbatim, plus the two algorithm names and the fact that `GRAPH.RO_QUERY` is the containment boundary.
3. **The hardest technical thing** — the node-split: the probe returned `2` on an echo graph, which would have made the headline claim false; the fix is a schema change proven in both directions; it is asserted at boot and published by `/health`. This paragraph is entirely `[VERIFIED]` (AF-6, AF-16) and is the strongest paragraph the project has.
4. **What is not built** — §10, stated plainly.

Track 02 named explicitly, sole. `[VERIFIED]` — DS-7.

### 7.5 What a stranger does, in order, with no help

This is the sequence the artifacts must support end to end. Each step names the thing that makes it possible.

1. Opens the repo README; reads line 1 and knows what the product is. (§7.2 row 1)
2. Reads the failure in five lines and knows why it exists. (row 2)
3. Watches the ≤180s video and sees a write refused and a receipt. (§7.3)
4. Opens the live URL; lands on `/slots`, filters contested. (§4.2, DS-12)
5. Clicks a contested slot; sees the highest-citation claim is not the winner. (§4.3)
6. Opens the provenance graph; sees the chains pinch through one node. (§4.4)
7. Opens the receipt; reads the Cypher. (§6.2)
8. Clicks replay; sees it reproduce. (§6.3)
9. Curls `/health`; sees the three boot checks green. (§4.8)
10. Opens the separate Cypher artifact and reads every query the product depends on. (DS-5)

If any step requires us to be in the room, that step is a defect. `[UNVERIFIED]` — this is the acceptance standard, not a measurement.

---

## 8. Risk register

Severity is impact if it fires. Likelihood is `[ASSUMED]` throughout — no base rates exist for a one-day build. Owner is the **registry skill name** that acts, matching `PLAN.md` §11's routing tokens.

### 8.1 Inherited register (from `WINNER-BRIEF.md`, carried, not re-derived)

| ID | Sev | Likelihood | Risk | Mitigation | Owner | Tag |
|---|---|---|---|---|---|---|
| R-1 | CRITICAL | LOW | Node-split omitted or done wrong, so `maxFlow` counts edge-disjoint paths and the demo's echo set-piece scores high — the headline claim is false | Seed asserts both controls at boot (echo→1, independent→2) and **refuses to run** if either fails; both are published by `/health`; a red assertion is `503` | `hackathon-build` | `[VERIFIED]` — R-1, DS-1, AF-16 |
| R-2 | CRITICAL | MED | The panel reads the framing as an overreaching claim to compute what is factually so | Framing is admission control throughout (§2.3); `UNDECIDED` is first-class; a refusal is recorded and appealable; V-3 is banned in every artifact including API strings | `hackathon-package`, enforced by `CONTRACT.md` §4 | `[VERIFIED]` — R-2, DS-4 |
| R-3 | HIGH | MED | `algo.SPpaths` weight-key trap: a wrong key silently returns hop count, so the reliability score is secretly hop count and **every test passes** | Boot assertion `T-3` reproduces `pathWeight 0.21072` on the control fixture; `0.21072` is not an integer, so a hop-count regression cannot pass; `path_weight` is surfaced raw in every receipt | `hackathon-build` | `[VERIFIED]` — R-3, AF-3, transcript §FC-3 |
| R-4 | HIGH | MED | The score multiplies three incompatible units with no stated weights (the User Advocate's standing dissent) | Answered structurally: three separate typed fields, `score_is_ordinal: true` on every parent, ε echoed and published, `path_weight` raw, console forbidden from rendering a percentage | `design-forge` + `hackathon-package` | `[VERIFIED]` — R-4, DS-8 |
| R-5 | MED | MED | `agentmesh` owns the contradiction-detection vocabulary; borrowing it makes us a worse version of them | V-2 banned; line 1 says refused / admission control | `hackathon-package` | `[VERIFIED]` — R-5 |
| R-6 | MED | HIGH | `Quorum-falkordb` out-polishes us (59+ commits, 660+ tests, CI) | Lead with the demo they structurally cannot stage: they need a human to supply the correction; MENGER refuses the write with no human in the loop, then shows the receipt | `design-forge` + `hackathon-demo` | `[VERIFIED]` — R-6 |
| R-7 | MED | HIGH | Clock. Every generator's plan overran the deadline by design | The verify_milestone gate is hard; the stretch dies there if the spine is not standing; "we ran out of time" is not a recorded decision | `hackathon-verify` | `[VERIFIED]` — R-7; note the gate time contradiction, §12 C-3 |
| R-8 | LOW | LOW | Engine pin drift (`:latest` → 6.0 breaks GraphRAG-SDK) | Explicit tag `falkordb/falkordb:v4.22.1` in compose, README, and `receipt.engine.image` | `deploy-to-github` | `[VERIFIED]` — R-8, AF-9 |

### 8.2 Risks this PRD adds

| ID | Sev | Likelihood | Risk | Mitigation | Owner | Tag |
|---|---|---|---|---|---|---|
| R-9 | HIGH | MED | **ε is an absolute threshold on an explicitly ordinal difference.** A sharp judge asks how a cutoff can have meaning on a scale with no units, and the submission has no written answer | Answer it **in the README** before it is asked: ε is a resolution floor on the ordering, calibrated against a constructed near-tie, published by `/health` so it can be argued with (§5.3). Do not leave this to be discovered | `hackathon-package` | `[UNVERIFIED]` — the attack is reasoning; that the design is open to it is structural |
| R-10 | **HIGH** | MED | **`algo.maxFlow` takes exactly one `relationshipTypes` entry (AF-4), but the provenance network spans two edge types.** `(:SuperSource)-[:FLOW]->(:SourceIn)`, the `[:FLOW]` split edge, and `(:SourceOut)-[:FLOW]->(:Claim)` are `FLOW`; the source-to-source citation chains are `(:SourceOut)-[:DERIVED_FROM]->(:SourceIn)`. A `FLOW`-only max-flow cannot traverse a citation chain — so a non-origin echo source may have **no path at all** from the super-source, while `CONTRACT.md` §2.4's own `witness_sets` example (`"clm_0061": ["so:src_blog_hub"]`) presumes the chain is traversable | **Do not silently fix.** This is a schema/parameterisation question the build chat must resolve explicitly and record: either the citation chains carry the same relationship type as the rest of the flow network, or independence is defined over a single materialised type. Whatever is chosen must keep `T-1`/`T-2` green and must be reflected in `/slots/{key}/graph`'s `type` field and in the receipt's recorded Cypher | `hackathon-build`, escalate to master chat if it needs a `CONTRACT.md` v1.1 | `[VERIFIED]` that the constraint and the two edge types both exist (AF-4; `WINNER-BRIEF.md` §Schema; `CONTRACT.md` §2.4). `[UNVERIFIED]` that it breaks in practice — unprobed. See §12 C-5 |
| R-11 | HIGH | HIGH | **Hand-written example numbers in published artifacts.** The contract's illustrative `/remember` example does not satisfy its own decision rule (`margin -0.3104` vs a computed `-0.9782`), and its illustrative `reliability_path` does not sum to its own `path_weight`. The contract labels these illustrative and is therefore honest — but the receipt's entire value is that a reader can recompute it. A published example that fails recomputation inverts the headline feature | **Every number in the README, the video, the Cypher artifact and the form prose is generated from a real run and pasted, never typed.** Add it as a package-phase check: recompute `exp(-path_weight)`, `independence × reliability × recency`, and `margin` from every published example before shipping | `hackathon-package`, generated by `hackathon-build` | `[VERIFIED]` — the arithmetic, computed from `CONTRACT.md` §2.1 / §2.5 values. See §12 C-1, C-4 |
| R-12 | HIGH | LOW | **The node-split gets "optimised" away** by a later slice — a build pass that notices `si`/`so` doubles the node count and collapses the pair, or a seed refactor that lets something bypass it (a `:Claim`→`:SourceOut` or `:SuperSource`→`:SourceOut` edge) | `T-1`/`T-2` are boot assertions that **stop the seed from running**, not tests that can be skipped; both are published fields on `/health`; `PLAN.md` §9 R-1 decision tree names the exact bypasses to check. **Never adjust the expected value, never soften to a range, never proceed with the assertion disabled** | `hackathon-build`, reviewed by `hackathon-critique` | `[VERIFIED]` — DS-1 acceptance, `PLAN.md` §9 R-1 verbatim |
| R-13 | HIGH | LOW | **Silent `weightProp` key regression.** A refactor, an autocomplete, or a copy from FalkorDB's own documentation substitutes `weightProperty` / `relationshipWeightProperty` / `costProperty`. No error is raised; `pathWeight` becomes hop count; every functional test still passes and the reliability score is silently wrong | `T-3` asserts `0.21072`, which is not an integer, so the degenerate value cannot pass; a red `T-3` makes `/health` return `503`; `path_weight` is in every receipt so a judge can see an integer; `PLAN.md` §6 includes the **inverse drill** — deliberately set the wrong key and confirm `T-3` fails, proving the assertion has teeth rather than being decorative | `hackathon-build` | `[VERIFIED]` — AF-3, `PLAN.md` §6 adversarial table, §9 R-3 tree |
| R-14 | MED | MED | **The stretch entangles the spine.** `counterfactual.py` acquires an importer, or a route handler starts depending on it, and it stops being deletable at the gate | Hard structural rule: `counterfactual.py` imports the resolver and is **imported by nothing**; deletable as one file plus one route. `GRAPH.COPY` latency is `NOT_CLAIMED` and must be measured before the stretch is even considered | `hackathon-build`, gated by `hackathon-verify` | `[VERIFIED]` — `PLAN.md` §3 C8, DS-10, DS-11 |
| R-15 | MED | MED | **The console hardcodes ε, λ, or the corpus counts**, then drifts from the server after B2 calibration, so the README and the running product disagree | `CONTRACT.md` §4 forbids it; `/health` publishes all three; ε is echoed on every decision; `package` reads the live value rather than copying `0.05` out of `PLAN.md` | `design-forge`, `hackathon-package` | `[VERIFIED]` — AF-17, DS-8, DS-14 |
| R-16 | MED | MED | **The deployed instance is unauthenticated and writable**, so anyone — including another entrant — can write claims into the judged demo graph during the 168h judging window | Recorded now rather than discovered at deploy time: the graph is disposable synthetic data re-seedable from `seed.py`; the write path can only create `:Claim`/`:Review`/`:Receipt`; reads are hard-bounded by `GRAPH.RO_QUERY` so no request can delete or rewrite the provenance corpus. Durable tier already chosen: stateful, 168h window, no spin-to-zero | `deploy-to-github` (DS-12, DS-15) | `[VERIFIED]` — `PLAN.md` §7 public-exposure row, `SUBMISSION_STATUS.md` |
| R-17 | MED | LOW | **`GET /review` is read-only and a judge reads that as unfinished** rather than as a scope decision | State it as a decision with its reason in the README (§7.2 row 11): resolution needs a human-in-the-loop story, and needing a human to supply the correction is precisely the competitor weakness MENGER is positioned against | `hackathon-package` | `[VERIFIED]` — `PLAN.md` §10 |
| R-18 | LOW | MED | **The seed corpus reads as cherry-picked.** Three hand-crafted set-pieces inside ~20 contested slots invites "you built the graph that gives your answer" | The set-pieces are **declared** as hand-crafted in the README, with the generator committed in-repo so anyone can re-seed and re-run. The probe evidence that matters (echo→1, independent→2) is on a minimal 7-node discriminating case, not on the demo corpus | `hackathon-package` | `[VERIFIED]` — set-pieces are declared in `PLAN.md` §5; the 7-node case is transcript §FC-4 |
| R-19 | MED | MED | **A-W2 fires: the panel reads "admission control" itself as over-claiming** rather than as the bounded term it is — i.e. the mitigation for R-2 is read as the thing it was meant to prevent | Never use the term bare. Every use is attached to its object: admission control **on a write**. Line 1 already does this ("An agent tried to write a memory. The graph refused it"). The first paragraph of the README must make the object of the decision unmistakable before the term appears, and `UNDECIDED` must appear in the first screen so the panel sees the gate declining to rule | `hackathon-package`, checked by `hackathon-critique` | `[VERIFIED]` that A-W2 is a recorded WILL-BREAK assumption — `PULSE.md` warroom §Assumptions. `[ASSUMED]` that the attachment discipline is sufficient — untested, and untestable before judging |

### 8.3 The three risks the brief named explicitly

Cross-reference so none is lost: the panel reading admission control as over-claiming is **R-19** (A-W2, `[VERIFIED]` as a recorded WILL-BREAK assumption). A silent `weightProp` key regression is **R-13**. The node-split being optimised away is **R-12**. All three are HIGH-or-above and all three are of the same family: **failures that produce a plausible number instead of an error.** That family is why `/health` publishes its assertions and why the service fails closed. `[VERIFIED]` — AF-16.

---

## 9. Judging-criteria mapping

Six criteria, each weighted **16.7%**. `[VERIFIED]` — `config.json` `judging_criteria`, all six with `weight_pct: 16.7`.

**Provenance warning, which must not be lost:** the weights are **DERIVED, not published**. Graph Hacks publishes no rubric and `/hackathons/falkordb/judges` is a hard 404. The six slots are the verbatim WeMakeDevs house template observed across sibling editions, with slot 4 swapped to the sponsor name; only one sibling edition states weighting ("6 equally weighted"). `[VERIFIED]` — `config.json` `judging_criteria_provenance`, VF-I3 (state: UNVERIFIABLE — no rubric exists). Treat the equal weighting as `[ASSUMED]` (A-I1). The practical consequence: **no criterion can be traded away**, because we cannot know which one carries weight.

| # | Criterion | 16.7% | What earns it | Deliverable | Owner | Pointer |
|---|---|---|---|---|---|---|
| 1 | **Potential Impact** | 16.7% | A named, concrete failure in multi-agent memory (§1.2) and a gate that sits in the write path rather than a dashboard beside it. `UNDECIDED` + the review queue show the product knows the limits of its own authority | §1.2 in the README; `POST /remember`; `GET /review` | `hackathon-package`, `hackathon-build` | §1.2, §4.1, §4.7 |
| 2 | **Creativity & Innovation** | 16.7% | Menger's theorem used as the definition of source independence — the decision **is** the algorithm, not a heuristic with a graph behind it. Plus the node-split: a correctness fix discovered by a probe that failed | §1.4; README row 6; video beat 3 | `hackathon-package`, `hackathon-demo` | §1.4, §7.2 row 6, §7.3 beat 3 |
| 3 | **Technical Excellence** | 16.7% | Boot assertions that make the service **fail closed**; receipts replayable by id with typed divergence; `GRAPH.RO_QUERY` as a server-side containment boundary; all three components surfaced separately with `path_weight` raw | `GET /health` (503 on mismatch); `GET /receipts/{id}`; `POST /receipts/{id}/replay` | `hackathon-build` | §4.8, §6, AF-16, AF-8 |
| 4 | **Best Use of FalkorDB** | 16.7% | The substitution test (§1.5): remove the graph and there is no output. Both algorithms are real engine calls with correct signatures, and we hit and documented three engine-specific constraints the panel will recognise — `algo.dijkstra`/`algo.SCC` absent, the `weightProp`-only key, `relationshipTypes` taking exactly one type | §1.5 in the README; the separately listed Cypher artifact (DS-5); `receipt.cypher[]` | `hackathon-package`, `hackathon-build` | §1.5, §6.2 D-1/D-2/D-3, AF-1/AF-3/AF-4 |
| 5 | **User Experience** | 16.7% | A console that renders a refusal, the provenance subgraph with the split visible, and the receipt — three components never blended, `score` never a percentage. `design_forge` runs **in full** in its own chat specifically because this is 16.7% of the grade | The console; `GET /slots`, `/slots/{key}`, `/slots/{key}/graph` | `design-forge` IN FULL (R5) | §4.2–§4.4, `CONTRACT.md` §4, Decision #7 |
| 6 | **Presentation Quality** | 16.7% | The README spine (§7.2), the ≤180s video (§7.3), and detailed form prose (§7.4) — "Write detailed answers. Short one-liners make it hard for us to see what you built." Plus an honest "what is not built" section | README; video; form prose; §10 | `hackathon-package`, `hackathon-demo`, `hackathon-verify` | §7, §10 |

### 9.1 Coverage check — every deliverable earns something

| Deliverable | Criteria it earns |
|---|---|
| Node-split schema + both boot controls | 2, 3, 4 |
| `GET /health` fail-closed | 3, 4, 6 |
| DOCKET receipt + replay | 1, 3, 4, 6 |
| `GET /review` | 1, 5 |
| Console with the split visible | 2, 5 |
| Separately listed Cypher artifact (DS-5) | 4, 6 |
| ≤180s video | 6 |
| Live URL (DS-12) | 5, 6 |
| AI-assistance disclosure (DS-6) | compliance gate, not a criterion — but its absence is a stated disqualifier `[VERIFIED]` `config.json` `disqualifiers[4]` |
| Track declaration (DS-7) | compliance gate — `submission_requirements[5]` |

Two deliverables are **compliance gates rather than scoring opportunities**: an undisclosed-AI-assistance submission and an unexplainable graph model are both listed disqualifiers. `[VERIFIED]` — `config.json` `disqualifiers[4]`, `disqualifiers[5]` ("Inability to explain the graph model, the queries, and the architecture"). The separately listed Cypher artifact is the direct answer to the second.

---

## 10. Scope boundaries

### 10.1 Committed scope

Exactly **P2 admission control + P5 DOCKET receipts**. `[VERIFIED]` — LEDGER R4, `PULSE.md` Decision #4, `PLAN.md` §1. P4, P6 and P7 are dead and are not referenced again. P7 was declined.

### 10.2 Explicitly out of scope

| Out | Why | Tag |
|---|---|---|
| **Resolving a review item.** No `POST /review/{id}/resolve`. `GET /review` is read-only in v1.0 | Resolution needs a human-in-the-loop story, and needing a human to supply the correction is precisely `Quorum-falkordb`'s weakness MENGER is positioned against (R-6). Adding it would blunt the differentiator | `[VERIFIED]` — `PLAN.md` §10, `CONTRACT.md` §2.7 |
| **Auth, multi-tenancy, rate limiting** beyond the documented `429` shape | Hackathon artifact, synthetic data, local/demo. Recorded as a limitation rather than omitted | `[VERIFIED]` — `PLAN.md` §7, `CONTRACT.md` §0 |
| **Learned or inferred trust.** `(:Source {trust})` is seed data | MENGER consumes trust; it does not model it | `[VERIFIED]` — `PLAN.md` §5 |
| **`algo.betweenness`** | Dropped by `WINNER-BRIEF.md` correction #3: it ranks intermediaries, not leaf sources — the wrong selector. Not used anywhere | `[VERIFIED]` — `WINNER-BRIEF.md` §corrections row 3 |
| **Any use of `algo.dijkstra` or `algo.SCC`** | They do not exist in FalkorDB v4.22.1. Verified live set: AStar, BFS, HarmonicCentrality, MSF, SPpaths, SSpaths, WCC, betweenness, labelPropagation, maxFlow, pageRank | `[VERIFIED]` — AF-1, VF-W5, transcript §FC-1 |
| **Cross-slot score comparison** | The score is ordinal within a slot. Nothing compares across slots | `[VERIFIED]` — §5.3 reason 2 |
| **Non-synthetic data** | Private, login-gated, paywalled or personal data in the graph is a stated disqualifier | `[VERIFIED]` — `config.json` `disqualifiers[3]` |
| **Any code ported from other repositories** | Fresh code only; repo initialised today; main coding work must begin after 2026-10-15 | `[VERIFIED]` — `config.json` `disqualifiers[2]`, LEDGER §5.6 |
| **Committing, pushing, or merging `fix/p0-2b`** | Not authorized; the push is HELD; Dami's call only | `[VERIFIED]` — LEDGER R3, `PULSE.md` Decision #3 |

### 10.3 The P3 `GRAPH.COPY` counterfactual — stretch only

**What it would be:** `GRAPH.COPY` the graph, delete one source, re-run the arbitration, diff the verdicts — "which single source, if removed, flips the most verdicts." `[VERIFIED]` — `WINNER-BRIEF.md` §Stretch.

**Its status, precisely:**

| Property | Value | Tag |
|---|---|---|
| Committed? | **No.** Stretch only | `[VERIFIED]` — LEDGER R4, Decision #4 |
| Gate | **16:25**, at `verify_milestone`, as an explicit recorded go/no-go. Not earlier | `[VERIFIED]` — DS-11. Note: `WINNER-BRIEF.md` still says 14:45; the later sources win. See §12 C-3 |
| Isolation | `counterfactual.py` imports the resolver and is **imported by nothing**. Deletable as **one file plus one route** | `[VERIFIED]` — `PLAN.md` §3 C8, `PULSE.md` forge §Done |
| `GRAPH.COPY` latency | **`NOT_CLAIMED`** — never probed. Must be measured before the stretch is even considered | `[VERIFIED]` that it is unprobed — VF-W6, DS-10, `.law12-feasibility.json` DS-10 (`load_bearing: false`, `ts: ""`) |
| Load-bearing? | **No.** Deliberately excluded from `deepIntegration`. No forge artifact depends on it | `[VERIFIED]` — `.law12-feasibility.json` DS-10 evidence |

**The rule for every artifact:** if the stretch is not built, no artifact mentions it except as an acknowledged non-feature. If it is built, nothing in the spine's prose may depend on it. **No latency claim about `GRAPH.COPY` may be made in any artifact under any circumstance unless DS-10's timed probe has run** — and if it runs, the measured number is what gets published, not an estimate. `[VERIFIED]` — DS-10.

### 10.4 Owned by other chats (not out of scope — out of *this* scope)

| Surface | Owner skill | Source |
|---|---|---|
| The engine (C1–C7) | `hackathon-build` | `PLAN.md` §11 |
| The console / UX | `design-forge` **IN FULL** (R5) | `PLAN.md` §11, Decision #7 |
| Reachable live URL | `deploy-to-github` **IN FULL** (livetest folded) | DS-12 |
| Repo/portfolio README surface | `deploy-to-github` | `PLAN.md` §11 |
| README, Cypher artifact, disclosure, track, the ε + ordinal statement | `hackathon-package` **IN FULL** | DS-3..DS-8 |
| ≤180s video | `hackathon-demo` **IN FULL** | `PLAN.md` §11 |
| Adversarial read | `hackathon-critique` | `PLAN.md` §11 |
| Join, real-Chrome proof, stretch go/no-go | `hackathon-verify` | DS-11, DS-13 |
| Final form entry in the login-gated SPA | `hackathon-verify`, master chat, real Chrome, singleton browser | `PLAN.md` §11 |

`[VERIFIED]` — all rows from `PLAN.md` §11 Skill-Ownership Map, which uses registry skill names as the machine-read `owner:` token.

---

## 11. Success criteria

Machine-verifiable wherever possible. Each row carries a resolvable pointer. "Resolves" is the literal check. **No row below is currently green** — nothing has been built. `[VERIFIED]` — `SUBMISSION_STATUS.md`.

### 11.1 Engine (resolvable by command)

| ID | Criterion | Resolves by | Pointer | State |
|---|---|---|---|---|
| S-1 | The service fails closed on a broken assumption | `curl -s localhost:8000/health \| jq '.boot_checks'` → `node_split_echo.actual == 1`, `node_split_independent.actual == 2`, `sp_path_weight.actual == 0.21072`, `passed == true`. Any mismatch → HTTP `503` with `error.code == "BOOT_ASSERTION_FAILED"` | `PLAN.md` DC-1; `CONTRACT.md` §2.8; AF-16 | not built |
| S-2 | All three verdicts are reachable on seeded data | Three `POST /remember` calls against the three set-pieces return `ALLOW`, `BLOCK`, `UNDECIDED` | `PLAN.md` DC-2; `PLAN.md` §6 drill steps 2–4 | not built |
| S-3 | Nothing is silently lost | Every `/remember` response has `recorded == true`; the `UNDECIDED` response's `review_id` appears in `GET /review`; the `BLOCK` persists `(:Claim {status:'REFUSED'})` | `PLAN.md` DC-3; `CONTRACT.md` §0 rule 4 | not built |
| S-4 | Every verdict is replayable | `GET /receipts/{id}` returns verbatim `cypher[]` + three separate components + `reliability_path` + `independence_witness`; `POST /receipts/{id}/replay` → `matches_original == true`, modulo `RECENCY_DECAY` | `PLAN.md` DC-4; `CONTRACT.md` §2.5–§2.6 | not built |
| S-5 | Contract conformance | Every endpoint in `CONTRACT.md` §2 responds with the documented shape, and the console renders against the real API with **zero** contract amendments | `PLAN.md` DC-5; DS-13. **Cannot be self-certified by the engine chat** — resolves at `verify_milestone` when the two chats join | not built |
| S-6 | The `weightProp` assertion has teeth | Inverse drill: substitute `weightProperty`, confirm `pathWeight` degenerates to an integer and `T-3` **fails**. A passing inverse drill would prove the assertion is decorative | `PLAN.md` §6 adversarial table, row 2 | not built |
| S-7 | The echo attack generalises | One actor cites itself through 5 relabelled intermediates → `independence == 1`, not 5. `T-1` generalised; this is the attack the panel will run | `PLAN.md` §6 adversarial table, row 1 | not built |
| S-8 | Containment is real | `GRAPH.RO_QUERY <graph> "CREATE (:X{a:1})"` errors; `MATCH` is allowed | `PLAN.md` §6 `T-4`; AF-8; transcript §FC-6 | engine-level `[VERIFIED]`; in-app wiring not built |

### 11.2 Artifacts (resolvable by grep or glance)

| ID | Criterion | Resolves by | Pointer | State |
|---|---|---|---|---|
| S-9 | README line 1 is the locked sentence | String match against `WINNER-BRIEF.md` §Thesis "README line 1 (locked)" | DS-4; §2.2 | not written |
| S-10 | No prohibited wording in any judged artifact | grep README, console copy, video captions, and form prose for V-1/V-2/V-3; "procedure" appears only in a correct sense if at all | DS-3, DS-4; §0.3 | not written |
| S-11 | The Cypher queries and algorithms exist as a **separately listed artifact** | A distinct file exists and is linked from both the README and the submission form | DS-5; `config.json` `submission_requirements[2]` | not written |
| S-12 | AI-assistance disclosure present | Section exists in the README | DS-6; `config.json` `submission_requirements[6]` | not written |
| S-13 | Track declared, Track 02 sole | Stated in the README and in the submission form | DS-7; `submission_requirements[5]` | not written |
| S-14 | ε stated explicitly and the score stated as ordinal, not cardinal | Both present in the README; ε matches the **live** `/health` value, not a copied constant | DS-8, DS-14; §5.3 | not written |
| S-15 | The graph data model is in the README | Node-split schema present, `si`/`so` explained as the vertex capacity | `config.json` `submission_requirements[1]` | not written |
| S-16 | A reachable live deployment URL exists | The URL loads `/slots` without a signup | DS-12; `submission_requirements[4]` | not deployed |
| S-17 | Video is ≤180s | Duration check | `config.json` `demo_video_requirements.max_seconds`; A-I2 | not recorded |
| S-18 | Every published number recomputes | For each example in the README, the Cypher artifact and the video: `exp(-path_weight) == reliability`, `independence × reliability × recency == score`, `margin == score(incoming) − score(incumbent)`, and `recency == exp(-λ·age_hours)` with λ from `/health` | R-11; §5.5; §12 C-1, C-4 | not written |
| S-19 | The engine pin is visible | `falkordb/falkordb:v4.22.1` appears in the README run command, the compose file, and `receipt.engine.image`. `:latest` appears nowhere | AF-9, R-8 | not written |
| S-20 | Honest "what is not built" section exists | Review resolution, auth, rate limiting, multi-tenancy, and the stretch's status all named | §10.2; `SUBMISSION_STATUS.md` | partially written (`SUBMISSION_STATUS.md` exists) |

### 11.3 Process criteria

| ID | Criterion | Resolves by | Pointer |
|---|---|---|---|
| S-21 | The stretch go/no-go is an explicit recorded decision | A written go/no-go at the verify_milestone gate. "We ran out of time" is not a recorded decision | DS-11; `PLAN.md` §9 R-7 |
| S-22 | `GRAPH.COPY` latency is measured before any claim about it | A timed probe exists, or no claim is made | DS-10; `.law12-feasibility.json` DS-10 |
| S-23 | The integrated product is seen in real Chrome before completion is claimed | Real-Chrome evidence at the integrate step; the browser is a singleton driven from the master chat, never delegated | `PLAN.md` §6 Evidence law |
| S-24 | A persistence-class choice is recorded before provisioning | `durability-tier.json` exists with an explicit tier and an explicit `spendApproved` | DS-15; `SUBMISSION_STATUS.md` (recorded: stateful, 168h, no spin-to-zero, `spendApproved: false`) — **this one is already green** |

---

## 12. Contradictions found between sources, and open questions

Found by reading the sources against each other. **None of these were fixed by this document** — `CONTRACT.md` is frozen and the mechanism is ruled. Each is routed.

### 12.1 Contradictions

| ID | Sev | Contradiction | Sources | Routed to |
|---|---|---|---|---|
| **C-1** | HIGH | **The contract's illustrative `/remember` example does not satisfy its own normative decision rule.** `margin` is given as `-0.3104`, but the example's own scores give `0.5220 − 1.5002 = −0.9782`. (`0.9782` does appear in the contract, as `top_margin` in the §2.3 example.) Both verdicts are `BLOCK` either way, so the *verdict* is unaffected | `CONTRACT.md` §2.1 worked example vs §2.1 decision rule vs §2.3 | `hackathon-build` (generate real examples) + `hackathon-package` (publish only generated output). **Not a fabrication** — §5 labels all example numbers illustrative. Does **not** need a v1.1: no field name or type changes |
| **C-2** | MED | **λ has three different values across the sources.** `PLAN.md` §5 and the redo brief say `0.01/hour`; `CONTRACT.md` §2.3/§2.5/§2.8 publish `0.0077`; and the contract's own `recency 0.9261` at `age_hours 9.6` implies λ ≈ `0.008` (`−ln(0.9261)/9.6 = 0.00800`), which reproduces neither | `PLAN.md` §5 vs `CONTRACT.md` §2.3/§2.5/§2.8 | `hackathon-build`. **Resolution is already specified and is not a conflict in practice**: λ is a server constant calibrated in B2 and published by `/health` (DS-14, AF-17). Every artifact reads the live value. All three written values are `[ASSUMED]` |
| **C-3** | LOW | **The stretch gate has two times.** `WINNER-BRIEF.md` §Stretch and §Build plan say **14:45**; `PULSE.md` DS-11, `PLAN.md` §11/§9, `SUBMISSION_STATUS.md` and the redo brief all say **16:25** | `WINNER-BRIEF.md` vs DS-11 / `PLAN.md` / `LEDGER.md` schedule | Later sources win: **16:25**, at `verify_milestone`. The brief predates the schedule slip recorded in `LEDGER.md` §3. No action needed beyond not quoting 14:45 |
| **C-4** | MED | **The contract's illustrative `reliability_path` does not sum to its own `path_weight`.** The listed edge is `si:src_crm_export → so:src_crm_export` with `trust 0.90`, `nl 0.10536` (correct: `−ln(0.90) = 0.10536`), while `path_weight` is `0.21072` — exactly twice it. The `nodes` array has three entries (two hops), so one hop is elided; if the elided hop is the `so: → claim` FLOW edge, §2.4 shows FLOW edges with `nl: null`. Separately, `0.21072` is the **boot-assertion control-fixture** value (AF-3), and reusing it as a demo claim's displayed value conflates the fixture with the corpus | `CONTRACT.md` §2.5 vs §2.4 vs AF-3 | `hackathon-build`. Same remedy as C-1: generate, never type. **And keep the boot fixture's `0.21072` distinct from whatever the demo corpus produces** — a judge who recomputes `−ln(0.90)` will notice |
| **C-5** | **HIGH** | **`algo.maxFlow` accepts exactly one `relationshipTypes` entry (AF-4), but the independence computation spans two relationship types.** `PLAN.md` §5 specifies max-flow "over FLOW"; the schema puts source-to-source citation chains on `DERIVED_FROM`; and `CONTRACT.md` §2.4's own `witness_sets` entry `"clm_0061": ["so:src_blog_hub"]` requires reaching a hub through a citation chain. Under a `FLOW`-only max-flow, a non-origin echo source has no edge from the super-source at all | AF-4 vs `WINNER-BRIEF.md` §Schema vs `PLAN.md` §5 vs `CONTRACT.md` §2.4 | **`hackathon-build`, with an explicit recorded decision; escalate to the master chat if it needs `CONTRACT.md` v1.1.** This is R-10 and it is the most consequential item in this document. It is `[UNVERIFIED]` — a reading of the sources, not a probe. The probe that settles it is one `algo.maxFlow` call against a two-edge-type fixture |
| **C-6** | LOW | **Transcript §FC-2 lists `weightProp` among keys that "error opaquely with `MaxFlow configuration contains unknown key`".** Read in scope this is correct — it is the **maxFlow** config, where `weightProp` is indeed unknown — but a careless reader will take it as contradicting AF-3, which says `weightProp` is the **only** key that works on `algo.SPpaths` | transcript §FC-2 vs AF-3 / §FC-3 | No action beyond awareness. The two statements are about two different algorithm calls. Worth a one-line clarification if `hackathon-package` quotes §FC-2 in the blog post (DS-9) |

### 12.2 Open questions a human must chase

| ID | Question | Why it cannot be answered here | Owner |
|---|---|---|---|
| **OQ-1** | **Does independence traverse one relationship type or two?** (C-5 / R-10) | It needs one probe against a two-edge-type fixture, and this document is not authorized to redesign the mechanism | `hackathon-build`, then master chat if v1.1 is needed |
| **OQ-2** | **What are ε and λ, actually?** | Calibrated in B2 against the seeded tie; `NOT_CLAIMED` until `/health` reports them. Every artifact must read the live value, never the `0.05` / `0.01` / `0.0077` written in the docs | `hackathon-build`, then `hackathon-package` |
| **OQ-3** | **Is "a slot holds at most one admitted claim" a stated invariant?** | §2.5 reads it out of `CONTRACT.md` §2.2's single nullable `winner` and §2.1's `best_incumbent`, but the contract never states it in those words. If a slot can hold several admitted claims, `ALLOW` means something different | `hackathon-build` to confirm; `hackathon-package` to state it in the README either way |
| **OQ-4** | **What does `GRAPH.COPY` cost?** | `NOT_CLAIMED` — never probed (DS-10, VF-W6). No artifact may claim anything about it until a timed probe exists | `hackathon-build`, before the 16:25 gate |
| **OQ-5** | **What are the submission form's actual fields?** | UNEXTRACTED — login-gated SPA that returns only a placeholder to a fetcher. Must be read in real Chrome. `NOT_CLAIMED` | `hackathon-verify` (verify_preflight), master chat, singleton browser |
| **OQ-6** | **Are the judging weights really equal?** | DERIVED from the house template, not published; `/judges` is a 404; one sibling edition states equal weighting. `[ASSUMED]` (A-I1). Consequence: no criterion can be traded away | nobody — it is unresolvable before judging. Plan for all six |
| **OQ-7** | **Does the panel read "admission control" as bounded?** (A-W2 / R-19) | A WILL-BREAK assumption with no way to test it before judging. Mitigation is attachment discipline (§8.2 R-19) | `hackathon-critique` to attack the wording; `hackathon-package` to fix it |
| **OQ-8** | **Who produced and who reviewed the probes?** | `.law12-feasibility.json` `producer_model` and `reviewer_model` are **deliberately empty** — no model attribution exists anywhere upstream, and inventing one would be fabrication. The LAW#12 reviewer-independence leg is open and routed | `hackathon-critique`, which is itself a fresh-context independent reviewer and can attest its own identity |
| **OQ-9** | **Upstream: `intel` claimed complete with a red gate.** `config.json` asserts `roster_audit.discovered == true` but `research/roster-audit/strategy-density.md` does not exist | Not this document's to fix; surfaced so it is not inherited silently | master chat |
| **OQ-10** | **Reddit was never searched** during competitor discovery — blocked to the search user-agent, recorded rather than papered over. The competitor picture (R-6) may be incomplete | A gap in the intel phase, recorded in `config.json` `roster_audit.reddit` | nobody before the deadline; noted so R-6's likelihood is read as a floor, not a ceiling |

---

## 13. Claim census for this document

Counts are of tag **occurrences** in this file, not of distinct claims; a claim restated in two sections is counted twice. They are measured, not estimated — reproduce with:

```bash
grep -o '\[VERIFIED\]\|\[UNVERIFIED\]\|\[ASSUMED\]\|NOT_CLAIMED' PRD.md | sort | uniq -c
```

| Tag | Count | Concentrated in |
|---|---|---|
| `[VERIFIED]` | 190 | §0.2, §4 (contract shapes), §8.1, §9, §10 — almost all of it is "a frozen source file says this", not "we measured this" |
| `[UNVERIFIED]` | 31 | §1.3, §2.3, §5.2–§5.4, §6.2, §7.5 — design reasoning derived from verified facts |
| `[ASSUMED]` | 11 | ε, λ, the 16.7% weights (A-I1), the 180s cap (A-I2), R-19's sufficiency (A-W2), all likelihood ratings in §8 |
| `NOT_CLAIMED` | 17 | every MENGER endpoint behaviour, every MENGER latency, `GRAPH.COPY` latency, the submission form fields, the shipped ε/λ |

The counts above include the four occurrences in this table and the one inside the command block. File length at census: 841 lines.

**The honest summary of this document's epistemic state:** the mechanism is `[VERIFIED]` at the **engine** level — four measured numbers, all upstream, all on FalkorDB rather than on MENGER. The product is entirely unbuilt. Everything this document says MENGER *will* do is a specification, not a report.

---

## Appendix A — source index

| Source | Used for |
|---|---|
| `PULSE.md` | AF-1..AF-17 (authoritative), Decisions Log, Downstream Items DS-1..DS-15, the forge/warroom/intel sections |
| `CONTRACT.md` v1.0 FROZEN | every endpoint shape in §4, the decision rule in §5.2, the receipt in §6, the console prohibitions in §0.3 |
| `.law12-feasibility.json` | the definition of `[VERIFIED]`: AF-1, AF-3, AF-4, AF-6, AF-7, AF-8, AF-9, DS-10 |
| `warroom/WINNER-BRIEF.md` | the thesis, the locked README line 1, the mechanism, the node-split schema, risks R-1..R-8 |
| `warroom/deliberation-transcript.md` §FC-1..FC-7 | the exact probe Cypher and the raw timings |
| `PLAN.md` | done-criteria DC-1..DC-5, components C1–C8, the boot drill T-1..T-4, the risk decision trees, the Skill-Ownership Map |
| `SUBMISSION_STATUS.md` | the built-vs-not register, the open blockers |
| `config.json` | judging criteria and weights, submission requirements, disqualifiers, the likely panel, the engine pin |
| `LEDGER.md` | Dami's standing rulings R1–R6, the schedule, the hard constraints |
| `docs/CHAT-KICKOFF-forge.md` | the original dispatch, rules R1–R5, DS-1..DS-15 |

## Appendix B — what this document deliberately did not do

- Did not amend, reword, or contradict `CONTRACT.md`. It is frozen at v1.0 and two other chats consume it live.
- Did not redesign the mechanism. C-5 / R-10 is a genuine flaw and it is **flagged**, not fixed.
- Did not invent a single number. Every numeric value here is either one of the four measured upstream numbers, an explicitly illustrative value quoted from the contract, or arithmetic performed on those (shown with its working).
- Did not commit, push, stage, or touch the `gh-falkor` container.
- Did not write any file other than this one.
