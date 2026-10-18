# USER-ONBOARDING — MENGER

**Project:** MENGER — an admission-control gate on agent memory.
**Owner of this file:** `forge` (artifact E). **Status:** specification. Nothing described here has
been built or probed; every behavioural statement is `[UNVERIFIED]` unless tagged otherwise.
**Reads against:** `CONTRACT.md` v1.0 (FROZEN) · `PULSE.md` AF-1..AF-17 · `warroom/WINNER-BRIEF.md`.

---

## 0. What this file is, and what it is not

This file freezes the **user model**: who arrives, what they arrive with, and what they must
understand before they can act. `ROUTE-ARCHITECTURE.md` derives the route surface from it.

**It is not design.** No layout, component, type, colour, motion or copy decision is made here.
The console/UX is routed to the `design-forge` skill, which runs **in full in its own chat**
(PULSE Decision #7, LEDGER R5) and consumes `CONTRACT.md` directly. Where this file says
"must be legible in ten seconds", it is stating an *obligation to be met*, never a way to meet
it. `design_forge` owns every how. If a sentence here reads like a visual instruction, treat it
as a defect in this file and ignore it.

#### The genesis problem, stated exactly

Judging is **artifact-only — no live demo, no call** (`[VERIFIED]` PULSE AF-10, intel). The
operator is not in the room. Whatever a newcomer fails to understand from the artifact alone is
simply not understood. So the cold-stranger path is not a nicety here; it *is* the delivery
mechanism for 100% of the grade.

Two consequences bind everything below:

1. **No explanation may depend on a person.** Every claim must be self-evidencing on the surface
   that makes it, or checkable by one command printed beside it.
2. **No understanding may depend on the newcomer first authoring data.** A stranger who must
   invent an agent, a source chain and a contested slot before anything happens will see nothing.
   The seeded corpus is the entry point, not a fallback.

---

## 1. FIRST-CONTACT AXIS — the one thing, in ten seconds

> **Two citations that look like corroboration were scored `independence: 1`, and the write was
> refused.**

That is the whole product compressed. It is a single concrete event with a number attached, and
the number is one of the three published boot assertions (`node_split_echo` = 1, `[VERIFIED]`
AF-6 / VF-W2 / AF-16), so the headline a stranger reads in second three is the same number the
service refuses to start without.

**Why this sentence and not a thesis sentence.** "Admission control on agent memory" is accurate
and teaches nothing — it describes a category. The refusal event teaches the mechanism, because a
reader who understands *why* two citations collapsed to one has already understood node-splitting,
vertex-disjointness, and why a graph engine is load-bearing. The abstraction is then free.

**What must NOT be in the first ten seconds:** Menger's theorem by name, the word
"vertex-disjoint", the scoring formula, ε, λ, the schema, FalkorDB's procedure set. Every one of
those is a *second-beat* payoff for a reader who already has the refusal in hand. Leading with
them converts a legible product into a paper.

**The ten-second test, as a procedure anyone can run:** show a reader the first screen for ten
seconds, take it away, and ask what MENGER did. A pass is any answer of the shape "it rejected
something an agent tried to remember, because the sources weren't really independent." A fail is
"it's a graph database thing" or "it scores claims." `[UNVERIFIED]` — this test has not been run
against a built surface; it is the acceptance criterion, not a result.

---

## COLD-STRANGER GENESIS — §2

A cold stranger has: no account, no API key, no seeded expectations, no operator, and — on the
deployed instance — nothing but a URL. MENGER requires no credentials of any user (`[VERIFIED]`
by construction: `CONTRACT.md` §0 states **Auth: none**; the corpus is synthetic), so the genesis
path has no setup step at all. The entire risk is comprehension, not access.

#### The genesis→value path (gated; each step must hold before the next is offered)

| # | Step | What it must establish | Value delivered | Depends on |
|---|------|------------------------|-----------------|------------|
| G0 | Arrive at `/` | That this is a **gate on writes**, not a store or a search box | Orientation | `GET /health` |
| G1 | See the refusal | That a specific write was **refused**, with a reason that is a number | The first-contact axis | seeded corpus + one receipt |
| G2 | See the two numbers side by side | That `1` and `2` are the *same computation* on two different source shapes | The mechanism | the two set-pieces (§4) |
| G3 | Open the receipt | That the verdict is **re-derivable by hand** — exact Cypher, three components | Credibility | `GET /receipts/{id}` |
| G4 | Replay the receipt | That the number reproduces against the live engine, not a cached string | Falsifiability | `POST /receipts/{id}/replay` |
| G5 | Submit a write | That the gate answers *their* input, not only the seed | Agency | `POST /remember` |
| G6 | Find the review queue | That `UNDECIDED` exists and nothing was silently dropped | Trust | `GET /review` |

**The gate between G1 and G2 is the load-bearing one.** A stranger who sees a refusal but never
sees the independent case has been shown an opinion. The two numbers together are the proof,
because they differ *only* in source shape — same engine, same query, same capacities.

**G5 is deliberately late.** Asking a stranger to compose `agent_id` + `subject` + `predicate` +
`object` + `sources[]` (`CONTRACT.md` §2.1, all required, `422 UNKNOWN_AGENT` /
`422 UNKNOWN_SOURCE` on anything not already in the graph) before they know what a verdict means
is the classic empty-state failure. By G5 they know what they are asking for, and the existing
agents and sources are already in front of them to pick from.

#### REAL vs DEMO path — they are the same path

- **REAL:** a stranger lands on `/`, reads the refusal set-piece from the seeded corpus, opens the
  receipt, replays it, then submits their own claim through `POST /remember` against seeded agents
  and sources. Every step is a real request to the real engine over the frozen contract.
- **DEMO:** identical, in the same order, against the same seeded corpus and the same eight
  endpoints. The demo is a *path through the product*, with nothing added for it.

There is **no simulate control, no stubbed response, no pre-rendered result, and no alternate
demo-only surface** anywhere in this specification. The reason is a standing rule (LAW#7 /
WA-R-075): a demo-shaped shortcut silently redefines the product's user model, and it survives
review because every individual gate it touches passes. The protection here is structural — the
console has no data source other than the eight frozen endpoints (`ROUTE-ARCHITECTURE.md` §2), so
a demo-only path has nowhere to live.

The one asymmetry is **ordering, not capability**: the artifact-only judge is expected to walk
G0→G4 and may never reach G5, so no understanding is allowed to depend on G5. A writing agent, the
actual product consumer, starts at G5 and never renders a page at all.

---

## USER CLASSES — §3

Four classes arrive, with genuinely different genesis states. They are listed in order of grading
weight, not population: the judge is one reader and carries 100% of the outcome (AF-10).

### Class 1 — The cold judge (artifact-only reader)

- **WHO:** A Graph Hacks judge, reading the README, the video and a deployed URL, alone, with no
  one to ask. Likely wrote or works on the engine (`warroom` correction #2 assumes panel fluency
  in FalkorDB internals — so wrong vocabulary is not a cosmetic error, it is a falsification).
  Time budget per entry: unknown, `NOT_CLAIMED`. Assume the shortest plausible: a first screen and
  a scroll.
- **GENESIS:** Arrives at `/` with zero context, from a link. Nothing is installed; nothing is
  configured; no data is theirs.
- **ONBOARDING:** G0→G4 with no step requiring authored input. The refusal must be visible without
  a click; the independent counter-case must be reachable in one; the receipt in two. By the end
  they must be able to answer three questions unaided: *what did it refuse*, *on what number*, and
  *can I re-run that number myself*.
- **INTEGRATION:** None. This class never integrates; it reads, and possibly clicks **replay**
  once. Replay is therefore the single most important interactive affordance in the product, as it
  is the only one this class is likely to exercise.
- **Failure mode to design against:** they read `score` as a confidence or a percentage. The
  contract forbids that rendering outright (`CONTRACT.md` §4, `score_is_ordinal: true` on every
  scored object, R-4 / DS-8). A judge who thinks we published a probability has been handed the
  User Advocate's dissent as a finding.

### Class 2 — The writing agent (programmatic consumer)

- **WHO:** An autonomous agent in a multi-agent system attempting to commit a fact to shared
  memory. Not a human; renders nothing. This is MENGER's *actual* user and the reason the product
  exists — Track 02 is agent memory and coordination.
- **GENESIS:** Holds an `agent_id` that already exists as `(:Agent {id})` and one or more
  `source_id`s that already exist as `(:Source {id})`. Its first call is `POST /remember`. It has
  no onboarding surface and cannot be taught anything at runtime.
- **ONBOARDING:** The contract is the onboarding. Three things must be learnable from a single
  response without documentation: the verdict enum is exactly `ALLOW | BLOCK | UNDECIDED`;
  `recorded: true` is always present so a refusal is never a dropped write; and `epsilon` is echoed
  on the decision so the caller never needs a local copy of the threshold (AF-17 / DS-8 / R-4).
  Errors must be actionable on first read — `422 UNKNOWN_SOURCE` returns the offenders in
  `detail.unknown` (`CONTRACT.md` §3), which is what lets an agent self-correct rather than retry
  blind.
- **INTEGRATION:** `POST /remember` on every memory write; `GET /slots/{key}` before a write if it
  wants to know what it is contending with; `GET /receipts/{id}` to understand a refusal it
  received. Nothing else. A refused agent's correct next action is to cite a genuinely independent
  origin — which is the behavioural claim of the whole project.
- **Failure mode to design against:** the agent treats `UNDECIDED` as a failure and retries in a
  loop. `UNDECIDED` is first-class and terminal for the caller: a `(:Review)` node was written and
  a `review_id` returned. Retrying the identical claim will land in the same band.

### Class 3 — The memory operator (review-queue worker)

- **WHO:** The human accountable for shared memory in a system that uses MENGER. Arrives because
  something is sitting in `UNDECIDED` and someone must look at it.
- **GENESIS:** Arrives at the review queue, not the landing page — typically from an alert or a
  bookmark, with a `slot_key` or `review_id` in mind. Already knows what MENGER is; needs no
  first-contact beat and should not be forced through one.
- **ONBOARDING:** One concept only, and it is the honest one: **v1.0 is read-only.** `GET /review`
  lists every `UNDECIDED` write with its `margin`, its `reason` (`WITHIN_EPSILON` — the only value
  in v1.0) and both contending claims. There is **no resolution endpoint in the contract**, and the
  console must not imply one exists (`CONTRACT.md` §2.7, explicit). This class's genuine value in
  v1.0 is *visibility*: nothing was lost, here is exactly how close it was, here is the receipt.
- **INTEGRATION:** `GET /review` → `GET /slots/{key}` → `GET /receipts/{id}`. Read-only throughout.
- **Failure mode to design against:** presenting an affordance that looks like it resolves a review
  item. That is a fabricated capability on the primary honesty surface of the product — the worst
  possible place for one. Stating the limitation plainly is strictly better than hiding the gap.

### Class 4 — The skeptic (auditor arriving with a receipt)

- **WHO:** Anyone who does not believe the number. Overlaps with Class 1 but has a different
  genesis and must be served separately, because this is the class the project's credibility is
  built for. The DOCKET receipt exists for exactly this reader (Dami's ruling, PULSE Decision #4:
  P5 receipts **MANDATORY**).
- **GENESIS:** Arrives with a `receipt_id` — from the video, the README, a shared link, or a
  response they received. Does not want the tour. Wants the Cypher.
- **ONBOARDING:** None required beyond the receipt being complete. A receipt must stand alone:
  `engine.image` (`falkordb/falkordb:v4.22.1`), `engine.read_path` (`GRAPH.RO_QUERY`), the three
  components separately with `path_weight` raw alongside, the `independence_witness` with its
  `witness_nodes` and enumerated `paths`, the `reliability_path` with per-edge `nl`, and
  `cypher[]` — the verbatim parameterised statements that were executed, in execution order
  (`CONTRACT.md` §2.5).
- **INTEGRATION:** `GET /receipts/{id}` then `POST /receipts/{id}/replay`. The replay response is
  the answer to the only question this class is asking.
- **Failure mode to design against:** a receipt that paraphrases its Cypher instead of carrying it
  verbatim. A paraphrase is unreplayable, and this reader will notice immediately — particularly on
  `weightProp`, where a wrong key name silently returns hop count with no error (`[VERIFIED]`
  AF-3). The literal string `weightProp` appearing in the receipt is itself evidence that the trap
  was not fallen into.

**Count: 4 classes, 2 of them non-human-authoring (Class 1 reads, Class 2 calls).** Classes 1, 3
and 4 each enter at a different route with a different precondition, which is why the surface is
multi-route by derivation and not by preference (`ROUTE-ARCHITECTURE.md` §3).

---

## 4. THE SEEDED-CORPUS ENTRY POINT

A stranger must see the mechanism work **before authoring anything**. The corpus is synthetic,
generated by a seeded script and committed in-repo — no private, personal, paywalled or
login-gated data, ever (a stated hackathon disqualifier; `PLAN.md` §5, constraint 6/7).

**Targets** (`PLAN.md` §5, `[UNVERIFIED]` — not yet seeded): ~40 agents, ~150 sources, ~60 claims
across ~20 contested slots, with the node-split built **at seed time**, never retrofitted.
`GET /health` returns the actual `corpus` counts and **the console must read them, never hardcode
them** (`CONTRACT.md` §2.8). Actual counts: `NOT_CLAIMED`.

Three hand-crafted set-pieces carry the teaching load. Two of them are published boot assertions,
which is what makes them unfalsifiable-by-accident: if the seed drifts, the service does not serve.

#### Set-piece A — the echo chamber → `independence` 1

One source wearing many mouths. Several citations that look like independent corroboration all
funnel through a single shared intermediate origin. Because every `Source` is split into
`(:SourceIn)-[:FLOW {cap:1.0}]->(:SourceOut)`, the shared intermediate has exactly **one unit of
vertex capacity**, so the chains compete for it and `algo.maxFlow` returns **1**, not the number of
citations.

- Expected `independence`: **1** `[VERIFIED]` — AF-6 / VF-W2, proven live on the discriminating
  case against `gh-falkor`.
- Published as `boot_checks.node_split_echo` by `GET /health` (AF-16).
- This is the money shot and the first-contact axis.
- **Without the node-split this returns the number of citations** (`[VERIFIED]` AF-6: unit-capacity
  *edges* count edge-disjoint paths, which is the wrong quantity). That is why DS-1 calls the split
  non-negotiable, and why its absence would make the headline claim false rather than merely weak.

#### Set-piece B — genuine independence → `independence` 2

Two origin chains that share no vertex. Same engine, same query, same unit capacities, same
`relationshipTypes` (exactly one — `[VERIFIED]` AF-4). Only the source shape differs.

- Expected `independence`: **2** `[VERIFIED]` — AF-6 / VF-W2, proven live in the same probe run.
- Published as `boot_checks.node_split_independent` by `GET /health` (AF-16).

#### A and B are one lesson, not two

Presented apart, A is an assertion and B is a different assertion. Presented together they are a
**controlled comparison**, and the comparison is the idea: *the engine is not counting citations,
it is counting origins, and it can tell the difference.* A newcomer who sees 1 beside 2 has
received the product. This is why G2 is a hard gate in §2 and why the independent case may never be
demoted to a secondary surface.

#### Set-piece C — the deliberate tie → `UNDECIDED`

Two candidates whose scores fall inside the ε band, so `|margin| <= epsilon` and the write lands in
the review queue with a `review_id` and a `(:Review)` node (`CONTRACT.md` §2.1 decision rule).

- Expected verdict: `UNDECIDED`. `[UNVERIFIED]` — depends on ε calibration, which happens in B2.
- This set-piece is what makes "nothing is silently lost" demonstrable rather than claimed, and it
  is the only route by which a newcomer meets the third verdict at all.
- **ε is `[ASSUMED]` at 0.05 and λ is `[ASSUMED]` at 0.01/hour** — proposed, *unmeasured* defaults
  (PULSE VF-F4, DS-14). They are calibrated in B2 so that this tie actually lands inside the band,
  and the operative values are whatever `/health` reports. Note that `CONTRACT.md`'s example
  responses show `lambda: 0.0077`, which is illustrative only — a third number, and a reason the
  rule is *read it from `/health`*, never copy it from a document. Neither value is measured; both
  are `NOT_CLAIMED` as outcomes.

#### The third boot assertion — `sp_path_weight` = 0.21072

Not a set-piece a newcomer interacts with, but part of the same entry point because it is published
on the same surface. `algo.SPpaths` with `weightProp: 'nl'` over edges weighted `nl = -ln(trust)`
reproduces `pathWeight` **0.21072** on the control fixture (`[VERIFIED]` AF-3 / DS-2).

Its teaching value is specific and worth surfacing: `0.21072` is **not an integer**, and the three
wrong weight-key names (`weightProperty`, `relationshipWeightProperty`, `costProperty`) are
accepted silently and return **hop count** — an integer — with no error (`[VERIFIED]` AF-3). So the
assertion cannot be passed by a broken implementation. A reader who understands why a non-integer
expected value is load-bearing understands the project's attitude to its own numbers.

---

## 5. WHAT MUST BE COMPREHENSIBLE WITHOUT THE OPERATOR

Hard requirement — if a newcomer cannot get these unaided, the artifact has failed, because under
AF-10 there is no second chance:

| # | Must land unaided | Why it cannot be deferred |
|---|-------------------|---------------------------|
| M1 | MENGER **refuses writes**; it is a gate, not a store or a search | Mis-categorised in second two, and every later screen is read wrong |
| M2 | The verdict enum is exactly `ALLOW` / `BLOCK` / `UNDECIDED` | `UNDECIDED` is the credibility of the design; a two-verdict reading makes us an oracle |
| M3 | `independence: 1` on the echo case, `2` on the independent case | The first-contact axis and the mechanism |
| M4 | The three components are **separate**, never blended | Blending is the standing dissent (R-4 / DS-8); a blended reading is a finding |
| M5 | `score` is **ordinal, not cardinal** — rank only, never a probability | Contract §4 forbids the other rendering; a judge reading a percentage reads an overclaim |
| M6 | A refused write is **recorded**, not dropped (`recorded: true` always) | "Nothing is silently lost" is a claim a reader must be able to check |
| M7 | The verdict is **replayable** — exact Cypher, one request | This is the difference between a receipt and a log line |
| M8 | The decision is computed **inside the graph engine** | The substitution test, and 16.7% of the grade is Best Use of FalkorDB |

May be progressive disclosure — valuable, but a reader who never reaches them has still received
the product:

| # | May be disclosed later | Where it naturally lands |
|---|------------------------|--------------------------|
| P1 | Menger's theorem by name, and vertex- vs edge-disjointness | Second beat, beside the 1-vs-2 comparison |
| P2 | `score = independence × reliability × recency` | Receipt |
| P3 | The ε-band decision rule and the `margin` arithmetic | Receipt / review item, where a real `margin` is on screen |
| P4 | `exp(-pathWeight)`, `nl = -ln(trust)`, and why minimising a sum maximises a product | Receipt's `reliability_path`, per-edge `nl` |
| P5 | λ and recency decay, and `RECENCY_DECAY` as benign replay divergence | Replay result |
| P6 | The node-split schema and the `si:`/`so:` pair convention | Provenance graph view |
| P7 | `GRAPH.RO_QUERY` as a server-side containment boundary | Receipt `engine.read_path`; proof route |
| P8 | The engine pin `falkordb/falkordb:v4.22.1` and why `:latest` is not enough | Proof route |
| P9 | The P3 counterfactual, if it survives its 16:25 gate | Its own route, detachable |

**The ordering rule:** nothing in the P-list may be a precondition for anything in the M-list. The
M-list is reachable through concrete instances only — a refusal, two numbers, a receipt. Every
P-item is an *explanation of something already on screen*. That ordering is the whole onboarding
design, and it inverts the obvious one (theorem → mechanism → example), which would require a
stranger to finish a paragraph about graph theory before seeing anything happen.

---

## 6. Vocabulary — binding on every user-facing string

Three wordings are graded, and a single instance is a defect (PULSE DS-3 / DS-4, R-2 / R-5,
`CONTRACT.md` §4):

| Never | Why | Always |
|---|---|---|
| "stored procedure" | FalkorDB has none. The panel wrote the engine; this would be falsified on first read | **"a single parameterised Cypher query"** |
| "detects conflicts" | That is `agentmesh`'s vocabulary, not ours (R-5) | **"refuses"**, **"admission control"**, "a contested slot" |
| "truth", "verifies truth" | Overreach we cannot support, and the CRITICAL credibility risk (R-2) | **"admission control"**, "source independence", "admissibility" |

MENGER decides **admissibility**, never veracity. It gates a *write*. A refusal is recorded and
appealable; `UNDECIDED` is first-class. Every sentence a newcomer reads must stay inside that
boundary — including the ones that are only trying to be punchy.

---

## 7. Judge's attack, beside each onboarding claim

| Claim this file makes | The attack | The answer |
|---|---|---|
| "A stranger understands it in ten seconds" | Unmeasured; you are asserting your own legibility | Correct — `[UNVERIFIED]`. §1 states the test as a procedure and the pass/fail shape so it can be run against the built surface. Result: `NOT_CLAIMED` |
| "The echo case proves independence is real" | A hand-crafted fixture proves nothing about general behaviour | It is a *control*, not evidence of generality. The generalised form — one actor citing itself through five relabelled intermediates, which must still return 1 — is in `PLAN.md` §6 as an adversarial case. `[UNVERIFIED]` |
| "Nothing is silently lost" | Any system can claim that | It is checkable: `recorded: true` on every `/remember` response, a `review_id` on every `UNDECIDED`, and `GET /review` enumerating them. See `FEATURE-OBSERVABLES.md` F-6 |
| "The seeded corpus is a fair entry point" | Seeded data is chosen by you; of course it shows what you want | Two of the three set-pieces are **boot assertions** with 503 `BOOT_ASSERTION_FAILED` behind them (AF-16). We cannot quietly re-tune them to flatter a demo — the service stops serving instead |
| "The demo path is the real path" | Everyone says that, right before the simulate button | Structural, not promised: the console's only data source is the eight frozen endpoints, and no endpoint outside `CONTRACT.md` §2 may be assumed to exist (§4). There is nowhere for a demo-only path to live |
| "Review queue builds trust" | It is read-only — you built a list, not a workflow | Stated plainly in Class 3 rather than hidden. v1.0's value here is visibility, and the contract explicitly forbids implying a resolution endpoint. A fabricated affordance on the honesty surface would be worse than the gap |

---

## 8. Hand-off

- **To `design-forge` (R5, in full, its own chat):** classes in §3, gates in §2, the ten-second
  axis in §1, the M/P split in §5, the vocabulary in §6. Every *how* is yours. If a requirement
  here reads as a design constraint, it is over-reaching — treat §5 as the obligation and ignore
  any implied solution.
- **To `hackathon-build`:** the set-pieces in §4 are G1/G2 and two of them are boot assertions. A
  red assertion means **fix the seed, never the expected value** (`PLAN.md` §9). Actual `corpus`
  counts must be served by `/health`, not written into a doc.
- **To `hackathon-demo`:** the video follows G0→G4, which is the order a judge reads in. The
  10-second axis in §1 is the opening beat.
- **To `hackathon-package`:** M1–M8 are the README's obligations. ε and λ come from the live
  `/health`, never from this file or `PLAN.md` (DS-8 / DS-14).
