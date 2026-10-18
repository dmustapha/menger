# DECISIONS — MENGER · architectural decision records

> **What this file is.** One ADR per architectural decision that shapes MENGER. Every record
> carries **Context**, **Decision**, **Consequences**, and an explicit **`Rejected`** section
> naming the alternatives that lost and why they lost.
>
> **An ADR with no rejected alternative is not an ADR.** A decision with only one option on the
> table was never a decision — it was a discovery, and discoveries belong in `INVARIANTS.md` as
> facts, not here as choices. Where a record looks forced (the engine told us; the owner ruled
> it), the `Rejected` section still names what we would otherwise have done and what it would
> have cost, because that is the part a judge cannot reconstruct from the code.
>
> **Tag law.** Every technical claim carries `[VERIFIED]`, `[UNVERIFIED]`, or `[ASSUMED]`.
> `[VERIFIED]` means a live probe recorded in `.law12-feasibility.json` or a PULSE `AF-n` row
> backs it — nothing weaker. Facts we do not have are written **`NOT_CLAIMED`**, which is an
> acceptable and expected answer here.
>
> Last updated: 2026-10-18 · owner: forge (agent D) · companion files: `INVARIANTS.md`
> (the build-agent law), `LIMITATIONS.md` (the honest boundaries).

---

## Index

| ADR | Decision | Status | Reversible? |
|---|---|---|---|
| [ADR-001](#adr-001--track-02-as-the-sole-declared-track) | Track 02 as the sole declared track | Accepted | No — submission field |
| [ADR-002](#adr-002--arbitrate-contradictions-in-cypher-not-in-application-code) | Arbitrate contradictions in Cypher, not application code | Accepted | No — it is the thesis |
| [ADR-003](#adr-003--run-without-the-conductor-manual-chat-driving) | Run without the conductor; manual chat driving | Accepted | Yes |
| [ADR-004](#adr-004--source-skills-from-installed-main-utils-from-the-fixp0-2b-worktree-push-held) | Skill sourcing split; push HELD | Accepted | Yes |
| [ADR-005](#adr-005--reframe-the-winner-as-memory-admission-control-allow--block--undecided) | Reframe the winner as memory admission control | Accepted | No |
| [ADR-006](#adr-006--collapse-cross_exam--challenge--demo_scripts-into-the-risk-register) | Collapse `cross_exam` + `challenge` + `demo_scripts` | Accepted | Yes |
| [ADR-007](#adr-007--fund-the-console-with-parallelism-not-with-a-scope-cut) | Fund the console with parallelism, not a scope cut | Accepted | Yes |
| [ADR-008](#adr-008--run-design_forge-in-full-in-its-own-chat) | `design_forge` runs IN FULL in its own chat | Accepted | Yes |
| [ADR-009](#adr-009--skip-five-phases-fold-four-structurally-not-for-time) | Skip five phases, fold four | Accepted | Yes |
| [ADR-010](#adr-010--mandatory-cross-chat-orientation-ledger-first-every-chat) | Mandatory cross-chat orientation, LEDGER first | Accepted | Yes |
| [ADR-011](#adr-011--python-not-typescript-because-graphro_query-is-the-containment-boundary) | Python, not TypeScript | Accepted | No — boundary depends on it |
| [ADR-012](#adr-012--re-cut-the-mechanism-onto-sppaths--maxflow-after-the-probe-killed-algodijkstra-and-algoscc) | Re-cut onto `SPpaths` + `maxFlow` | Accepted | No — the alternatives do not exist |
| [ADR-013](#adr-013--node-split-every-source-so-max-flow-counts-vertex-disjoint-paths) | Node-split every source | Accepted | No — P0 invariant |
| [ADR-014](#adr-014--freeze-contractmd-at-v10-before-the-plan-prose-was-finished) | Freeze `CONTRACT.md` before the plan prose | Accepted | Amend-only, via master chat |
| [ADR-015](#adr-015--promote-the-boot-assertions-from-an-internal-check-to-a-public-api-surface) | Boot assertions as a public API surface | Accepted | No — fail-closed depends on it |
| [ADR-016](#adr-016--stateful-durable-tier-with-spendapproved-false) | Stateful durable tier, `spendApproved: false` | Accepted, **gated** | Yes |
| [ADR-017](#adr-017--keep-the-graphcopy-counterfactual-stretch-only-and-deliberately-not-load-bearing) | `GRAPH.COPY` counterfactual stretch-only | Accepted | Yes — deletable |
| [ADR-018](#adr-018--make-the-docket-receipt-mandatory-on-every-verdict-not-an-optional-audit-mode) | DOCKET receipt mandatory on every verdict | Accepted | No |
| [ADR-019](#adr-019--review-is-read-only-in-v10-no-resolve-endpoint) | `/review` is read-only in v1.0 | Accepted | Yes — v1.1 |
| [ADR-020](#adr-020--surface-three-components--an-ordinal-flag-instead-of-one-confidence-number) | Three components + ordinal flag, never one confidence | Accepted | No |
| [ADR-021](#adr-021--no-test-framework-executable-assertions-wired-into-the-boot-path) | No test framework; assertions in the boot path | Accepted | Yes |
| [ADR-022](#adr-022--render-the-node-split-in-slotskeygraph-instead-of-hiding-it) | Render the node-split instead of hiding it | Accepted | Yes |

**Decision provenance.** ADR-001 … ADR-010 carry the closed Decisions Log entries #1–#9 from
`PULSE.md` (#1 splits into ADR-001 + ADR-002, because the track declaration and the
compute-it-in-Cypher commitment have independent consequences and independent rejected sets).
ADR-011 … ADR-022 write up decisions the record *shows* — in probe results, in the frozen
contract, in `durability-tier.json` — but had never been written up as decisions.

---

## ADR-001 — Track 02 as the sole declared track

- **Status:** Accepted · **Date:** 2026-10-18 (pre-warroom) · **Decided by:** Dami (standing ruling R1)
- **Basis:** `PULSE.md` Decisions Log #1; `LEDGER.md` §1 and §2 `[VERIFIED]` as a record of the ruling.
- **Rejected:** Declare Track 01 + Track 02 · Track 01 alone · Leave the track undeclared / pick at submission — each with its reason for losing in `### Rejected` below.

### Context

Graph Hacks (WeMakeDevs × FalkorDB) lets a submission declare a track. The competitive-density
figure in the intel record is **17 sole-commit repositories in Track 02 against 71 in Track 01**
`[UNVERIFIED]` — it is an intel count from `config.json` / `research/research-brief.md`, not
something a probe can confirm, and it may have moved since it was taken. Track 02 is *Agent
Memory and Coordination*, which is also the sponsor's own product narrative: a graph database
pitched at agent memory.

Declaring more than one track is permitted by most hackathons and is superficially attractive —
more categories, more chances. It also halves the apparent fit of the artifact to any one of
them, and judging here is **artifact-only (AF-10)** `[VERIFIED]`: a judge reads the README and
watches a ≤180s video with nobody in the room to explain which track the project is really for.

### Decision

Declare **Track 02 — Agent Memory and Coordination** as the **sole** track. Say so in the README,
in the submission form, and nowhere ambiguously. Every artifact's first paragraph is written to
Track 02's vocabulary: memory, admission, coordination between agents writing to one store.

### Consequences

- The README's first line is locked and track-aligned (`warroom/WINNER-BRIEF.md`) — a judge
  learns what this is inside one sentence.
- We forfeit any Track 01 prize surface. That is accepted, not overlooked.
- Vocabulary becomes a graded surface: "admission control", "refuses", "source independence" are
  in; "detects conflicts" (another entrant's framing) and "truth" are banned outright
  (`INVARIANTS.md` INV-15).
- Mis-declaring the track at submission time is an unrecoverable, zero-cost-to-avoid loss, so it
  is an invariant (`INVARIANTS.md` INV-26) rather than a preference.

### Rejected

| Alternative | Why it lost |
|---|---|
| **Declare Track 01 + Track 02** | Doubles the surface, halves the fit. Artifact-only judging means a judge cannot be told "read it as Track 02" — the prose has to do it alone, and prose written for two tracks reads as written for neither. |
| **Track 01 alone** | 71 sole-commit repos `[UNVERIFIED]` — the crowded field, and *not* the sponsor's own narrative. Winning there means out-executing four times as many entrants on ground FalkorDB cares about less. |
| **Leave the track undeclared / pick at submission** | The track choice drives the README's first line, the demo script and the form prose. Deferring it means writing those three twice, at 19:00, against a hard 19:29 deadline. |

---

## ADR-002 — Arbitrate contradictions in Cypher, not in application code

- **Status:** Accepted · **Date:** 2026-10-18 (pre-warroom) · **Decided by:** Dami (R1)
- **Basis:** `PULSE.md` Decisions Log #1 ("**computed in Cypher**"); `LEDGER.md` §1 `[VERIFIED]` as a record of the ruling.
- **Rejected:** Score in Python over a fetched subgraph · Hybrid — engine for traversal, Python for the final blend · An LLM adjudicator ("ask a model which claim is right") · A graph algorithm we would have to write ourselves (custom max-flow in Cypher) — each with its reason for losing in `### Rejected` below.

### Context

When two agents write contradictory facts into one shared memory slot, something has to choose.
The ruling fixes *what* the choice is made of — **corroboration-depth × recency × source-trust** —
and, separately and emphatically, fixes **where** it is computed: in Cypher, in the graph engine.

The default engineering instinct is the opposite. Pull the subgraph into the application, loop
over it in Python, apply the policy in code you can unit-test and step through in a debugger. That
is easier to build, easier to test, and easier to change. It is also the version where the graph
database is a data store with extra steps, and where the honest answer to "what did FalkorDB do
here?" is "it persisted some nodes".

### Decision

Compute the verdict **inside the engine**. The three components map onto engine algorithms, not
onto application loops:

- `independence` ← `algo.maxFlow` over the node-split provenance DAG `[VERIFIED]` (AF-4, AF-6)
- `reliability` ← `algo.SPpaths` with `weightProp` over `nl = -ln(trust)` edges `[VERIFIED]` (AF-3)
- `recency` ← `exp(-lambda * age_hours)`, an arithmetic term over a stored timestamp `[ASSUMED]` — λ is an unmeasured default, see ADR-016's sibling note and `LIMITATIONS.md`

The application composes, parameterises and records; it does not decide. The **substitution test**
in `warroom/WINNER-BRIEF.md` is the acceptance criterion: swap FalkorDB for Postgres and the
product does not get slower, it **stops producing an output at all**.

### Consequences

- FalkorDB is load-bearing in a way a judge can check by reading one query — which is the whole
  point of a graph-database hackathon. The separately-listed Cypher artifact is the submission's
  strongest single asset.
- We inherit the engine's sharp edges as **product** risks, not implementation details: the
  `weightProp`-only key trap (AF-3) `[VERIFIED]` and the one-relationship-type limit on
  `algo.maxFlow` (AF-4) `[VERIFIED]` both sit on the critical path. This is why boot assertions
  exist (ADR-015) and why the key trap is an invariant (`INVARIANTS.md` INV-2).
- Debuggability moves from a stack trace to a receipt. Mitigated by DOCKET (ADR-018): every
  verdict ships the verbatim Cypher it ran, replayable.
- Algorithm absences become design events rather than inconveniences — see ADR-012.

### Rejected

| Alternative | Why it lost |
|---|---|
| **Score in Python over a fetched subgraph** | The substitution test fails: Postgres plus the same Python gives the same answer. The graph becomes a store, and the strongest claim in the submission evaporates. |
| **Hybrid — engine for traversal, Python for the final blend** | Looks like a reasonable split and is where this quietly ends up if nobody rules. But the blend *is* the arbitration; moving it to Python moves the decision to Python. Rejected for the same reason as above, with the added cost of two places to look when a number is wrong. |
| **An LLM adjudicator ("ask a model which claim is right")** | Unreplayable, uncheckable, and it would be deciding **veracity** — which MENGER explicitly never does (`INVARIANTS.md` INV-12, `LIMITATIONS.md` §1). A receipt you cannot re-execute is not a receipt. |
| **A graph algorithm we would have to write ourselves (custom max-flow in Cypher)** | FalkorDB ships `algo.maxFlow` `[VERIFIED]` (AF-4). Hand-rolling it in a 6-hour box, against a theorem we are staking the headline on, is risk with no upside. |

---

## ADR-003 — Run without the conductor; manual chat driving

- **Status:** Accepted · **Date:** 2026-10-18 (pre-warroom) · **Decided by:** Dami (R2)
- **Basis:** `PULSE.md` Decisions Log #2; `LEDGER.md` R2 (`autonomous_mode: false`, `run_profile: SPRINT`) `[VERIFIED]` as a record.
- **Rejected:** Run `hackathon-conductor` in full · Conductor for the back half only (deploy → package → demo) · Full autonomy, `autonomous_mode: true` — each with its reason for losing in `### Rejected` below.

### Context

The pipeline has an orchestrator (`hackathon-conductor`) that dispatches phases, enforces phase
order, enforces PULSE compliance as a Tier-1 check, and blocks on gate failures. Running it is the
documented default for a multi-phase hackathon build.

It was not run. Dami drives each chat manually.

### Decision

No conductor. `autonomous_mode: false`, `run_profile: SPRINT`. Each phase runs in its own chat,
dispatched by the owner, with the owner reading the output before the next dispatch.

### Consequences

- **Nothing upstream enforces phase order, PULSE compliance, or the in-full dispatch rules.**
  This is the direct cause of ADR-010: three documents (`LEDGER.md`,
  `docs/ORCHESTRATION-PROTOCOL.md`, `PULSE.md`) become the enforcement the conductor would
  otherwise have been.
- Phase handoff is a human read. Slower per hop, but every claim passes an owner's eye — which is
  precisely how forge's premature completion claim was caught (`SUBMISSION_STATUS.md` Honesty
  note, carried into `INVARIANTS.md` INV-23 and `LIMITATIONS.md`).
- Gate enforcement becomes opt-in, and therefore skippable — and it *was* skipped once. The
  counter-measure is the verify-before-claiming law (INV-23), not a re-instated conductor.
- Parallelism has to be scheduled by hand (ADR-007, ADR-008).

### Rejected

| Alternative | Why it lost |
|---|---|
| **Run `hackathon-conductor` in full** | It enforces a lot, including phase order, which collides head-on with the deliberately parallel engine-build ‖ design_forge schedule (ADR-007). It also wants autonomy the owner declined to grant on a same-day deadline. |
| **Conductor for the back half only (deploy → package → demo)** | A half-driven pipeline has two sources of truth for "what phase are we in". With four chats consuming `PULSE.md` live, an orchestrator writing state underneath them is worse than no orchestrator. |
| **Full autonomy, `autonomous_mode: true`** | The owner's standing position is that unproven completion claims are the failure mode to guard against; autonomy removes the reader who catches them. The record vindicates the caution. |

---

## ADR-004 — Source skills from installed main, `utils/` from the `fix/p0-2b` worktree; push HELD

- **Status:** Accepted · **Date:** 2026-10-18 (pre-warroom) · **Decided by:** Dami (R3)
- **Basis:** `PULSE.md` Decisions Log #3; `LEDGER.md` R3 and hard constraint #11 `[VERIFIED]` as a record.
- **Rejected:** Merge `fix/p0-2b` into main first, then run cleanly off main · Run entirely off main (no worktree) · Run entirely off the worktree (including `SKILL.md`) · Push as we go, so `HANDOFF.md` gets its SHA — each with its reason for losing in `### Rejected` below.

### Context

The pipeline tooling exists in two places at once: the installed main copy at
`~/.claude/skills/<skill>/`, and a worktree at `/Users/MAC/pipeline-2b-worktree` on branch
`fix/p0-2b` at `a31ac43` that carries in-flight fixes to `utils/` and `shared-pipeline/`. Running a
hackathon off a branch that is mid-fix is a way to debug someone else's bug on a deadline. Running
off main means running without the fixes.

### Decision

Split the sourcing. **`SKILL.md` from installed main**; **`utils/` + `shared-pipeline/` from the
worktree**. And: **merging `fix/p0-2b` is NOT authorized, and the push is HELD.** Merge and push
are the owner's call alone.

### Consequences

- The skill *contracts* (what each phase must produce) come from the stable copy; the *helpers*
  come from the fixed copy. Mixed sourcing, deliberately.
- Every chat must state which version it sourced — an entry obligation now written into
  `docs/ORCHESTRATION-PROTOCOL.md` (ADR-010).
- `HANDOFF.md` cannot be completed: it needs a commit SHA and there is no commit
  (`SUBMISSION_STATUS.md` open blocker list). That RED is routed to `package` and is a
  **consequence of this ADR**, not an oversight.
- No agent in this pipeline commits, pushes, stages, or merges. Written as an invariant
  (`INVARIANTS.md` INV-25) because it is the kind of thing a well-meaning agent does on its way
  to being helpful.
- MENGER's own repository is `git init`'d fresh and separate; this ADR concerns the *tooling*
  repo, not the submission repo.

### Rejected

| Alternative | Why it lost |
|---|---|
| **Merge `fix/p0-2b` into main first, then run cleanly off main** | Merging an in-flight branch is a judgement the owner reserves, and doing it at hour zero of a same-day deadline puts a tooling merge on the critical path of a submission. |
| **Run entirely off main (no worktree)** | Loses the `utils/` fixes the worktree exists for, including gate-runner behaviour the forge phase depends on. |
| **Run entirely off the worktree (including `SKILL.md`)** | The skill definitions there are mid-edit. A phase contract that changes under a running chat is the worst of both. |
| **Push as we go, so `HANDOFF.md` gets its SHA** | Directly contradicts the owner's hold. The missing SHA is the cheaper problem: it is one blocker in one doc, surfaced honestly, versus an unauthorized push. |

---

## ADR-005 — Reframe the winner as memory admission control (ALLOW / BLOCK / UNDECIDED)

- **Status:** Accepted · **Date:** 2026-10-18 (warroom `pool_checkpoint`) · **Decided by:** Dami
- **Basis:** `PULSE.md` Decisions Log #4; `warroom/WINNER-BRIEF.md` `## Thesis` `[VERIFIED]` as a record of the ruling.
- **Rejected:** Ship P2 as a truth oracle / "verifies which fact is true" · "Detects conflicts" framing · Binary ALLOW/BLOCK, no third verdict · A continuous confidence score instead of a verdict · Keep P4 / P6, or accept P7 — each with its reason for losing in `### Rejected` below.

### Context

The warroom pool carried seven candidates. P2 — contradiction arbitration over a shared agent
memory graph — won on mechanism, but its natural pitch was a **truth oracle**: "the graph tells you
which claim is true." That pitch has two fatal properties on an artifact-only judging surface.
First, it is unsupportable: nothing in max-flow or shortest-path has access to the world. Second,
it is the single easiest thing for a sceptical judge to dismantle in one question, with nobody in
the room to recover.

Separately, a binary ALLOW/BLOCK gate has a quieter problem: near-ties. Two claims whose scores
differ by 0.004 are, for all practical purposes, tied; a binary gate must still pick one, and
every such pick is a coin-flip presented as a verdict.

### Decision

Reframe P2 as **admission control on agent memory**. `POST /remember` returns one of **three**
verdicts, decided by an **epsilon-band** rule over the margin between the incoming claim and the
best incumbent:

```
margin = score(incoming) - score(best_incumbent)

margin  >  +epsilon   ->  ALLOW      status ADMITTED   review_id null
margin  <  -epsilon   ->  BLOCK      status REFUSED    review_id null
|margin| <= epsilon   ->  UNDECIDED  status QUEUED     review_id set, a (:Review) node is written
```

`[VERIFIED]` as the frozen normative rule — `CONTRACT.md` §1 and the decision-rule block (it is
contract text, not a measurement; the *values* of ε and λ are `[ASSUMED]` defaults, ADR-020 and
`LIMITATIONS.md`).

MENGER decides **admissibility**, never veracity. The scope is written as an invariant
(`INVARIANTS.md` INV-12) and as the first and bluntest entry in `LIMITATIONS.md`.

### Consequences

- The strongest attack on the project is answered by its own scope statement rather than by a
  defence. "How do you know it's true?" → "We don't, and we never claim to. We decide what is
  admissible, on source independence."
- **UNDECIDED is a first-class outcome, not an error.** It needs a queue, a `(:Review)` node, a
  `review_id`, and a console surface — which is why `GET /review` is one of the eight frozen
  endpoints and why the console has a review view.
- ε becomes a published server constant, not a hidden threshold (`INVARIANTS.md` INV-9), and must
  be echoed on every decision. The console must not hardcode it (R-4 / DS-8).
- **Nothing is silently lost**: a BLOCKed write is still recorded (`recorded: true` on every
  `/remember` response), and an UNDECIDED write lands in the queue `[VERIFIED]` as frozen contract
  text (`CONTRACT.md` §0 ground rule 4). A gate that drops writes is a data-loss bug wearing a
  policy hat.
- P4, P6 stay killed; P7 declined; P3 is stretch-only (ADR-017). Scope is closed, not open.

### Rejected

| Alternative | Why it lost |
|---|---|
| **Ship P2 as a truth oracle / "verifies which fact is true"** | Unsupportable overreach, and the fastest possible loss on an artifact-only surface. "truth" / "verifies truth" is now a **banned wording** (`INVARIANTS.md` INV-15). |
| **"Detects conflicts" framing** | That is agentmesh's claim and vocabulary `[UNVERIFIED]` — intel's competitor read. Borrowing a competitor's sentence invites the comparison we lose, and it describes a weaker product: detection without a decision. Also banned. |
| **Binary ALLOW/BLOCK, no third verdict** | Forces a verdict on near-ties, where the margin is inside the noise of three unmeasured components. A confident coin-flip is worse than an honest queue, and the queue is a *feature* a judge can see working. |
| **A continuous confidence score instead of a verdict** | Pushes the decision onto the caller and re-introduces the cardinal-number reading the ordinal rule exists to prevent (ADR-020). An admission-control gate that does not admit or refuse is a scoring library. |
| **Keep P4 / P6, or accept P7** | Scope. Four chats running concurrently against a 19:29 hard deadline; the committed surface (P2 + P5) is already the honest limit. Nothing committed gets cut (R6) is only credible if nothing uncommitted gets added. |

---

## ADR-006 — Collapse `cross_exam` + `challenge` + `demo_scripts` into the risk register

- **Status:** Accepted · **Date:** 2026-10-18 (warroom closeout) · **Decided by:** master-chat
- **Basis:** `PULSE.md` Decisions Log #5 `[VERIFIED]` as a record.
- **Rejected:** Run `cross_exam` + `challenge` in full · Drop the adversarial content entirely · Defer all of it to `critique` — each with its reason for losing in `### Rejected` below.

### Context

The warroom phase normally runs an adversarial pass (`cross_exam`, `challenge`) over the top
candidates and drafts `demo_scripts`. By closeout the winner was already **ruled** by the owner at
`pool_checkpoint` (ADR-005). An adversarial pass over a closed decision re-litigates it; the
estimate was ~40 minutes to reach a conclusion that was not available to change.

The adversarial *content*, however, is not optional. The attacks are exactly what an
artifact-only judge brings.

### Decision

Collapse all three into one artifact: the **risk register in `warroom/WINNER-BRIEF.md`**
(R-1 … R-8). Keep the adversarial content; drop the ceremony of producing it as three phases.
The judge-attack pairing in `INVARIANTS.md` is the downstream continuation of this decision —
every invariant carries the specific attack it exists to survive.

### Consequences

- ~40 minutes returned to the build. On this schedule that is the difference between the console
  shipping and not.
- The risk register becomes load-bearing: it is the *only* place the adversarial read lives until
  `critique` runs. If it is thin, nothing catches it.
- Demo content is not lost but is **deferred** to the `hackathon-demo` dispatch, which runs IN
  FULL and owns the ≤180s video.
- `critique` remains in the pipeline as a real adversarial phase (`LEDGER.md` §3, NEXT). This ADR
  collapses the *warroom's* adversarial pass, not the pipeline's.

### Rejected

| Alternative | Why it lost |
|---|---|
| **Run `cross_exam` + `challenge` in full** | ~40 minutes spent re-opening a ruling the owner had closed, with no mandate to change it. "No chat re-opens this" (R1). |
| **Drop the adversarial content entirely** | The attacks are the judge's script. Dropping them means meeting them for the first time in front of a reader we cannot answer. |
| **Defer all of it to `critique`** | `critique` runs *after* forge, so forge's artifacts would have been written with no adversarial input at all — and forge's artifacts are the ones a judge reads. The register had to exist upstream of the writing. |

---

## ADR-007 — Fund the console with parallelism, not with a scope cut

- **Status:** Accepted · **Date:** 2026-10-18 · **Decided by:** Dami (R6)
- **Basis:** `PULSE.md` Decisions Log #6; `LEDGER.md` R6 `[VERIFIED]` as a record.
- **Rejected:** Cut the console; ship the API alone · Build the engine first, console after, serially · Cut the P3 counterfactual to buy console time · Have one chat build both — each with its reason for losing in `### Rejected` below.

### Context

An earlier plan treated the console as the thing to cut if time got tight, and priced the P3
stretch at ~60 minutes. Both were wrong on the record: the stretch is ~25 minutes `[ASSUMED]`
(an estimate, not a measurement) because it reuses the resolver, and the console does not have to
run serially after the engine — it runs off a **frozen contract** (ADR-014), so it needs the
contract, not the code.

UX is **16.7% of the grade** `[UNVERIFIED]` — a judging-weight figure from `config.json` /
`intel-state.json`, carried as-recorded. Cutting the console to buy engine time trades a sixth of
the score for hours we can get another way.

### Decision

Fund the console with **concurrency**. The engine build and `design_forge` run in two chats at the
same time, both consuming `CONTRACT.md` v1.0. **Nothing committed gets cut.**

### Consequences

- `CONTRACT.md` had to be frozen *before* the plan prose was finished, because two chats consume
  it live (ADR-014). The freeze is the enabling condition for the parallelism, not a side effect.
- Two chats write to `PULSE.md`, which makes append-on-exit discipline (ADR-010) load-bearing
  rather than tidy.
- Integration is a real, scheduled step (16:45, real-Chrome proof) instead of an assumption that
  two independently built halves meet.
- If the contract turns out wrong mid-build, the cost is doubled — both chats are already built
  against it. Mitigated by routing amendments through the master chat only and bumping to v1.1.

### Rejected

| Alternative | Why it lost |
|---|---|
| **Cut the console; ship the API alone** | Forfeits ~16.7% of the grade `[UNVERIFIED]`, and an admission-control verdict with no visible graph is a curl transcript. On artifact-only judging, the visual *is* a large part of the artifact. |
| **Build the engine first, console after, serially** | Needs ~2× the wall clock we have. Only possible with a console so thin it reads as an afterthought. |
| **Cut the P3 counterfactual to buy console time** | Mispriced the problem: the stretch is ~25m `[ASSUMED]` and is already non-load-bearing and deletable (ADR-017). Cutting it buys little and costs the most interesting demo beat. |
| **Have one chat build both** | Context exhaustion, and a single chat serialises what the frozen contract makes parallelisable. |

---

## ADR-008 — Run `design_forge` IN FULL, in its own chat

- **Status:** Accepted · **Date:** 2026-10-18 · **Decided by:** Dami (R5)
- **Basis:** `PULSE.md` Decisions Log #7; `LEDGER.md` R5 `[VERIFIED]` as a record.
- **Rejected:** Fold design into the build chat · Condensed `design_forge` (a short, prompt-level pass) · Design after the engine, serially · Ship an API-only submission with a curl transcript — each with its reason for losing in `### Rejected` below.

### Context

Under deadline pressure the standing temptation is to condense a design phase into a few prompts
inside the build chat — "make it look good while you're in there". The branch rule is explicit
that `design_forge`, `deploy`, `demo` and `package` must dispatch their owning skill **in full**,
and UX carries ~16.7% of the grade `[UNVERIFIED]`.

### Decision

`design_forge` runs **IN FULL**, in **its own chat**, concurrent with the engine build, consuming
the frozen `CONTRACT.md`. Not condensed, not folded into build.

### Consequences

- The console gets a real design pass — its own research, its own iterations — instead of
  CSS applied to whatever shape the API happened to take.
- `design_forge` also inherits the two documents forge did not write: `ROUTE-ARCHITECTURE.md` and
  `USER-ONBOARDING.md`. They are nominally forge's, but writing them in forge would pre-empt an
  in-full design dispatch, so they are **recommended → `design_forge`**
  (`SUBMISSION_STATUS.md` open blocker 2). That is a live RED awaiting the owner's ruling, and it
  is a consequence of this ADR.
- The contract is the integration surface and the only one. Whatever the console needs that the
  contract does not expose is an amendment request to the master chat, not a side channel.
- Two concurrent chats, one `PULSE.md`. See ADR-010.

### Rejected

| Alternative | Why it lost |
|---|---|
| **Fold design into the build chat** | Violates the in-full branch rule, and in practice means styling rather than designing. ~16.7% of the grade `[UNVERIFIED]` handled as a build subtask. |
| **Condensed `design_forge` (a short, prompt-level pass)** | "Fewer cycles, never fewer gates" — narrowing a dispatch shrinks the slice count, never the floor. A condensed design phase skips the floor. |
| **Design after the engine, serially** | No wall clock for it (ADR-007). Also puts design downstream of implementation accidents, so the API's shape would dictate the UI's. |
| **Ship an API-only submission with a curl transcript** | Rejected in ADR-007 and again here. |

---

## ADR-009 — Skip five phases, fold four — structurally, not for time

- **Status:** Accepted · **Date:** 2026-10-18 · **Decided by:** master-chat
- **Basis:** `PULSE.md` Decisions Log #8; `LEDGER.md` §3 `[VERIFIED]` as a record. AF-10 (artifact-only judging) `[VERIFIED]`.
- **Rejected:** Run `stress_test` · Run `interrogate` / `demo_rehearsal` anyway · Run `livetest` as its own phase · Skip these but not say so — each with its reason for losing in `### Rejected` below.

### Context

The full pipeline has more phases than this submission has surfaces. Two distinct reasons exist
for not running a phase, and conflating them is how a submission ends up with unexplained gaps:
a phase can be **inapplicable** (there is nothing for it to do) or **unaffordable** (there is
something for it to do and we chose not to). The second needs disclosure; the first needs an
explanation.

### Decision

- **SKIP** `url_preverify`, `stress_test`, `polish`, `interrogate`, `demo_rehearsal`.
- **FOLD** `debug` + `wire` → `build`; `livetest` → `deploy`.

And record *which reason* applies. `interrogate` and `demo_rehearsal` are skipped
**structurally**: judging is artifact-only (AF-10) `[VERIFIED]` — there is no live demo and no
judging call, so there is literally nothing for them to prepare. The other three have no surface
in scope.

### Consequences

- The schedule fits inside the deadline without cutting a committed surface (R6 holds).
- **No load claim is made anywhere.** `stress_test` did not run, so throughput, concurrency and
  sustained-load numbers are `NOT_CLAIMED` — see `LIMITATIONS.md`. The only latency figures in
  existence are the upstream engine measurements 41ms cold / 11ms warm on 1402 nodes / 2400 edges
  `[VERIFIED]` (AF-7), which are *engine* numbers at demo scale, not MENGER endpoint numbers.
- `debug` and `wire` folding into `build` means the build chat owns its own failure diagnosis.
  Acceptable because the boot assertions (ADR-015) localise the two failure modes that matter.
- `livetest` folding into `deploy` means the live URL is proven by the same chat that creates it.
  Weaker than an independent check; disclosed rather than papered over.

### Rejected

| Alternative | Why it lost |
|---|---|
| **Run `stress_test`** | Would produce a number, and a number is attractive. But there is no deployed endpoint to load until `deploy`, which lands at 17:15 against a 19:29 deadline, and a load test on a $8/mo starter tier measures the tier, not the design. `NOT_CLAIMED` is the honest output. |
| **Run `interrogate` / `demo_rehearsal` anyway** | Structurally inapplicable: no live demo, no judging call (AF-10) `[VERIFIED]`. Rehearsing an event that does not occur. |
| **Run `livetest` as its own phase** | ~20 minutes for an independence property on a check `deploy` performs anyway. The honest disclosure is cheaper than the phase. |
| **Skip these but not say so** | Unexplained gaps read as incompetence; explained gaps read as judgement. `SUBMISSION_STATUS.md` and `LIMITATIONS.md` exist for exactly this. |

---

## ADR-010 — Mandatory cross-chat orientation, `LEDGER.md` first, every chat

- **Status:** Accepted · **Date:** 2026-10-18 · **Decided by:** Dami (Decisions Log #9)
- **Basis:** `PULSE.md` Decisions Log #9; `LEDGER.md` §4 and §6 `[VERIFIED]` as a record.
- **Rejected:** Re-enable the conductor to get enforcement back · Give every chat the full document set · Trust each chat to orient itself from the repo · Inline the facts into each dispatch brief instead of a shared PULSE — each with its reason for losing in `### Rejected` below.

### Context

ADR-003 turned the conductor off. The conductor is what normally enforces phase order, PULSE
compliance and the in-full dispatch rules. With it off, **nothing upstream enforces any of them**,
and the pipeline runs as four-plus independent chats, each one starting with no memory of the
others, each one able to contradict a closed decision without noticing.

Giving every fresh chat the whole corpus is not a fix: it is ~75k words of context spent before
any work starts, and a chat that reads everything reads nothing carefully.

### Decision

Three documents become the enforcement:

1. **`LEDGER.md` — read first, every chat, always.** ~900 words. Everything else is linked, not
   inlined. It tells a chat which document it actually needs.
2. **`docs/ORCHESTRATION-PROTOCOL.md`** — how a chat runs, which version it sources (ADR-004),
   its entry and exit obligations.
3. **`PULSE.md`** — **read-on-entry, append-on-exit**, mandatory for every skill chat. Active
   Facts `AF-1..AF-17` override everything, including the dispatch brief and the published
   FalkorDB documentation.

### Consequences

- Orientation cost drops from the full corpus to ~900 words, and a chat arrives knowing what is
  closed.
- `PULSE.md` becomes the single most important file in the repository: it is where a probe result
  goes to become binding on every future chat. Its Active Facts sit **above** published vendor
  documentation in the precedence chain, because the probes were run against the pinned engine and
  the docs were not.
- Append-on-exit is a hard obligation. A chat that exits without appending has silently removed
  its findings from everyone downstream — the exact failure the conductor's Tier-1 check existed
  to prevent.
- Corrections get a home. Three numbered forge `[CORRECTION]` entries live in `PULSE.md` and are
  the evidentiary basis for the verify-before-claiming law (`INVARIANTS.md` INV-23).
- Precedence conflicts become resolvable rather than argued: `INVARIANTS.md` §2 carries the
  conflict-resolution table.

### Rejected

| Alternative | Why it lost |
|---|---|
| **Re-enable the conductor to get enforcement back** | Reverses ADR-003 and reintroduces phase-order enforcement that conflicts with the deliberate engine ‖ design parallelism (ADR-007). |
| **Give every chat the full document set** | ~75k words of orientation per chat. On a same-day deadline that is most of the budget, and the signal-to-noise ratio guarantees skimming. |
| **Trust each chat to orient itself from the repo** | Already demonstrably fails: forge's first gate run was self-selected to 12 hand-picked scripts out of a 272-function registry and missed `forge-routing-enforce.sh`, which held a hard `REFUSE-COMPLETE` `[VERIFIED]` as a record (`PULSE.md` forge `[CORRECTION]`). Self-selected scope is not scope. |
| **Inline the facts into each dispatch brief instead of a shared PULSE** | Briefs are written once and go stale the moment a probe lands. A fact discovered in chat 3 would never reach chat 2's brief. PULSE is append-only for exactly this reason — and it is why PULSE outranks the brief. |

---

## ADR-011 — Python, not TypeScript, because `GRAPH.RO_QUERY` is the containment boundary

- **Status:** Accepted · **Date:** 2026-10-18 (forge, post-probe) · **Decided by:** forced by the probe
- **Basis:** AF-8 `[VERIFIED]` — live probe recorded in `.law12-feasibility.json`: `GRAPH.RO_QUERY` rejects `CREATE` and allows `MATCH`, enforced **server-side**. The TypeScript client does not expose `GRAPH.RO_QUERY` (FalkorDB issue #408) `[UNVERIFIED]` — an upstream issue reference, not something we probed.
- **Rejected:** TypeScript end-to-end (one language, shared types with the console) · TypeScript + application-side Cypher validation (denylist / parser) · TypeScript + a thin Python read sidecar · Patch the TS client to add `RO_QUERY` · Drop `GRAPH.RO_QUERY` and rely on code review of the generated Cypher — each with its reason for losing in `### Rejected` below.

### Context

MENGER composes Cypher and runs it against a shared graph. The composed read path is the dangerous
surface: if a read query can write, then the scoring path can mutate the memory it is scoring, and
the whole admission-control claim collapses — a gate that can edit the graph is not a gate.

Two ways to stop that. Validate the generated Cypher in the application before sending it — a
denylist, a parser, a prefix check. Or use a **transport that cannot write**: `GRAPH.RO_QUERY`,
where the engine itself rejects writes.

The probe confirmed the engine enforces it server-side `[VERIFIED]` (AF-8). It also surfaced the
constraint that decides this ADR: the TypeScript client does not expose the command
`[UNVERIFIED]` (issue #408). So the containment boundary is available in Python and not in
TypeScript.

### Decision

**Python.** FastAPI + the `falkordb` Python client. **All reads go through `GRAPH.RO_QUERY`**,
without exception (`INVARIANTS.md` INV-6). The containment boundary is the engine's, not ours.

### Consequences

- The read path is contained by something we did not write and cannot get subtly wrong. This is
  the strongest security claim in the submission and it costs us a language preference.
- The console cannot talk to the graph directly in TypeScript. It talks to the eight frozen HTTP
  endpoints — which is a cleaner boundary anyway, and is what let the console be built
  concurrently (ADR-007).
- One language for the API, one for the console, and the seam between them is `CONTRACT.md`.
- We inherit the Python client's ergonomics and whatever the pinned engine does, which is why the
  engine pin is load-bearing (ADR-012's sibling constraint, AF-9 `[VERIFIED]`).
- GraphRAG-SDK is not used; it is reported broken on 6.0.x `[UNVERIFIED]` (an upstream report),
  which is part of why the pin is explicit rather than `:latest`.

### Rejected

| Alternative | Why it lost |
|---|---|
| **TypeScript end-to-end (one language, shared types with the console)** | The TS client does not expose `GRAPH.RO_QUERY` `[UNVERIFIED]` (issue #408). Taking it means giving up the server-side read-only boundary — the one thing that makes generated Cypher safe. Not a trade we were willing to make for ergonomics. |
| **TypeScript + application-side Cypher validation (denylist / parser)** | Puts the security boundary in code we wrote under deadline. A denylist is a guess about an engine's grammar; the engine's own read-only mode is not. The failure mode is silent and total. |
| **TypeScript + a thin Python read sidecar** | Keeps TS *and* the boundary, at the cost of two deployables, two dependency sets and an extra network hop inside the scoring path — on a 19:29 deadline, with a $8/mo tier (ADR-016). The hop also lands in the latency we cannot measure. |
| **Patch the TS client to add `RO_QUERY`** | Upstream work, unreviewed, on the critical path of a submission, in a client we would then be the only users of. |
| **Drop `GRAPH.RO_QUERY` and rely on code review of the generated Cypher** | The composed-read path is the thing being contained. Reviewing it by eye is how it gets through. |

---

## ADR-012 — Re-cut the mechanism onto `SPpaths` + `maxFlow` after the probe killed `algo.dijkstra` and `algo.SCC`

- **Status:** Accepted · **Date:** 2026-10-18 (forge, post-probe) · **Decided by:** forced by the probe
- **Basis:** AF-1 `[VERIFIED]` — `algo.dijkstra` and `algo.SCC` **do not exist** in FalkorDB v4.22.1. The available set is AStar, BFS, HarmonicCentrality, MSF, SPpaths, SSpaths, WCC, betweenness, labelPropagation, maxFlow, pageRank `[VERIFIED]`. AF-3 `[VERIFIED]`: `algo.SPpaths` with `weightProp` returns `pathWeight 0.21072` on the control fixture. AF-4 `[VERIFIED]`: `algo.maxFlow` takes **exactly one** relationship type. AF-9 `[VERIFIED]`: engine pinned `falkordb/falkordb:v4.22.1`.
- **Rejected:** Keep `algo.dijkstra` / `algo.SCC` in the design and shim them in application code · Switch engines to one that has Dijkstra and SCC · Upgrade past v4.22.1 hoping for a larger procedure set · Substitute `WCC` for `SCC` to keep a cycle-detection feature · Hand-roll Tarjan's algorithm in Cypher · Trust the published documentation and skip the probe — each with its reason for losing in `### Rejected` below.

### Context

The design as first drafted used `algo.dijkstra` for weighted shortest paths (source reliability)
and `algo.SCC` for strongly-connected components (circular-citation detection). Both were taken
from the documentation-derived capability map, which is the ordinary way a design gets written.

The live probe against the pinned container returned: **neither procedure exists.** `[VERIFIED]`
(AF-1)

This is the single most valuable thing that happened in the whole project, and it happened
**before any code was written** — which is also why it happened cheaply.

### Decision

Re-cut the mechanism onto what the engine actually ships:

- **Weighted shortest path** → `algo.SPpaths`, with the weight key **`weightProp`** over edges
  carrying `nl = -ln(trust)`. `reliability = exp(-pathWeight)`. Multiplying trust along a chain
  becomes adding negative logs along a path, which is exactly what a shortest-path algorithm
  minimises. Control fixture asserts `pathWeight 0.21072` `[VERIFIED]` (AF-3).
- **Source independence** → `algo.maxFlow` over the node-split DAG (ADR-013), with **exactly one**
  relationship type `[VERIFIED]` (AF-4):

```cypher
CALL algo.maxFlow({
  relationshipTypes: ['FLOW'],        -- EXACTLY ONE type. Not two. Not a list of several.
  sourceNodes:       [$ss],
  targetNodes:       [$claim],
  capacityProperty:  'cap'
}) YIELD maxFlow, nodes
RETURN maxFlow, nodes
```

- **Circular-citation detection via `algo.SCC`** → **dropped**, not substituted. `WCC` is
  undirected and answers a different question; a hand-rolled Tarjan in Cypher on this schedule is
  unjustifiable. Out of scope, disclosed in `LIMITATIONS.md`.
- **Never reference `algo.dijkstra` or `algo.SCC` in any artifact** (`INVARIANTS.md` INV-3). A
  judge who greps for a procedure that does not exist has learned we did not run the product.
- **Pin the engine** at `falkordb/falkordb:v4.22.1` `[VERIFIED]` (AF-9). `:latest` currently
  resolves to it, but "currently" is not a pin, and the probes are only binding for the version
  they ran against.

### Consequences

- Two of the three scoring components are now backed by a procedure we have watched execute,
  rather than by a doc page.
- A **new, worse trap** came with `SPpaths`: only the key `weightProp` works. `weightProperty`,
  `relationshipWeightProperty` and `costProperty` are accepted **silently** and return **hop
  count** `[VERIFIED]` (AF-3 / DS-2). There is no error. A wrong key yields a plausible wrong
  number — reliability computed over hop count instead of trust, with every endpoint returning
  200. This is the project's most dangerous single line, and it is why ADR-015 exists.
- `algo.maxFlow`'s one-relationship-type limit `[VERIFIED]` (AF-4) constrains the **schema**: the
  flow network must be expressible over a single edge type, `[:FLOW]`. The schema was designed
  around the procedure's signature, not the other way round.
- Circular citations are not detected. Disclosed.
- The documentation-derived capability map that produced the original error is recorded as
  untrustworthy relative to a probe — the basis for the precedence rule that PULSE Active Facts
  outrank published vendor docs (ADR-010).
- The probes are version-scoped. If the pin moves, they must be re-run. Written as an invariant
  (`INVARIANTS.md` INV-7).

### Rejected

| Alternative | Why it lost |
|---|---|
| **Keep `algo.dijkstra` / `algo.SCC` in the design and shim them in application code** | They do not exist `[VERIFIED]` (AF-1), so the shim would be a Python implementation — which fails the substitution test (ADR-002) for the reliability component and puts the arbitration back in the application. |
| **Switch engines to one that has Dijkstra and SCC** | It is a FalkorDB hackathon. Also: the probe is evidence the *engine* is fine and our *map of it* was wrong. |
| **Upgrade past v4.22.1 hoping for a larger procedure set** | GraphRAG-SDK is reported broken on 6.0.x `[UNVERIFIED]`, and an upgrade invalidates all seven probes — our entire `[VERIFIED]` basis — hours before a deadline. The pin is the conservative, evidence-preserving choice. |
| **Substitute `WCC` for `SCC` to keep a cycle-detection feature** | `WCC` ignores direction; citation cycles are a directed property. Shipping `WCC` labelled as cycle detection is a wrong answer with a confident name — the exact failure mode of the `weightProp` trap, chosen on purpose. |
| **Hand-roll Tarjan's algorithm in Cypher** | Hours, on a stretch feature, with no test framework (ADR-021), on a same-day deadline. |
| **Trust the published documentation and skip the probe** | This is the counterfactual where MENGER ships a design built on two procedures that do not exist and discovers it at 18:00. Everything good in this ADR came from running the probe first. |

---

## ADR-013 — Node-split every source so max-flow counts *vertex*-disjoint paths

- **Status:** Accepted · **Date:** 2026-10-18 (forge, post-probe) · **Decided by:** forced by the probe
- **Basis:** AF-6 `[VERIFIED]` — live probe: the node-split graph yields **echo → 1**, **independent → 2**. DS-1 `[VERIFIED]`: node-split is non-negotiable. AF-4 `[VERIFIED]`: `algo.maxFlow` signature.
- **Rejected:** Unit capacity on edges, no split (the original) · Node capacity as a property on `(:Source)` · Post-process in Python: fetch the paths, de-duplicate shared vertices · Claim edge-disjointness instead and call it "independent citation chains" · Keep the split but assert it only in a test — each with its reason for losing in `### Rejected` below.

### Context

MENGER's headline claim is **Menger's theorem**: the maximum flow between two vertices in a
unit-capacity network equals the number of **vertex-disjoint** paths between them, and the number
of vertex-disjoint origin→claim chains *is* source independence.

The first implementation put unit capacity on the **edges** and ran `algo.maxFlow`. The probe
showed that this counts **edge**-disjoint paths `[VERIFIED]` (AF-6, DS-1) — a different and, for
this purpose, wrong quantity. Two citation chains that pass through **one shared source** are
edge-disjoint but not vertex-disjoint. Under edge capacity, an **echo** — the same original source
laundered through two intermediaries — scores as **independent**.

That is not a cosmetic inaccuracy. It is the product being exactly wrong on the one input it
exists to catch.

### Decision

**Split every source node.** Each `(:Source)` becomes a pair:

```
(:SourceIn {source_id, trust})  -[:FLOW {cap: 1.0}]->  (:SourceOut {source_id, trust})
```

All inbound edges arrive at `SourceIn`; all outbound edges leave from `SourceOut`; the only way
through the source is the single unit-capacity `[:FLOW]` edge between them. Capacity on that edge
caps **traffic through the vertex**, so **edge-disjoint over the split graph == vertex-disjoint
over the original**. Menger's theorem now applies to the quantity we are claiming.

Two boot controls assert it, every boot:

- an **echo** fixture (two chains sharing one source) must return **1** `[VERIFIED]` (AF-6)
- an **independent** fixture (two genuinely distinct sources) must return **2** `[VERIFIED]` (AF-6)

A mismatch on either is a **503 `BOOT_ASSERTION_FAILED`** (ADR-015). The service refuses to serve
rather than serve a wrong headline number.

### Consequences

- The headline claim is now true of the computation, and the two fixtures that prove it are
  published on `GET /health` where a judge can read them.
- Node count roughly doubles on the source population. Measured engine performance at demo scale
  is 41ms cold / 11ms warm on 1402 nodes / 2400 edges `[VERIFIED]` (AF-7) — which is *post*-split
  scale, so the split's cost is already inside the only latency evidence we have. MENGER's own
  endpoint latency remains `NOT_CLAIMED`.
- Every write path must maintain the invariant: no edge may ever attach directly to a bare
  `(:Source)`, bypassing the split. One such edge silently restores the edge-disjoint bug on that
  path only — the worst kind of partial failure. This is `INVARIANTS.md` INV-1, the first
  invariant in the file.
- The split is **visible** in the console rather than hidden (ADR-022).
- The schema is now shaped by the procedure's one-relationship-type limit (AF-4): the flow network
  is a single `[:FLOW]` edge type, uniformly.

### Rejected

| Alternative | Why it lost |
|---|---|
| **Unit capacity on edges, no split (the original)** | Counts edge-disjoint paths `[VERIFIED]` (AF-6). An echo through a shared source scores as independent — the product's core failure, shipped as its headline. |
| **Node capacity as a property on `(:Source)`** | `algo.maxFlow` takes `capacityProperty` over **relationships** `[VERIFIED]` (AF-4). There is no vertex-capacity parameter. The split *is* how you express vertex capacity in a max-flow API that only knows about edges. |
| **Post-process in Python: fetch the paths, de-duplicate shared vertices** | Fails the substitution test (ADR-002), and re-implements a solved theorem in application code. Also unbounded: path enumeration is not max-flow. |
| **Claim edge-disjointness instead and call it "independent citation chains"** | A judge who knows graph theory reads this as the bug it is, and nobody is in the room to explain. We would be relabelling a wrong answer rather than fixing it. |
| **Keep the split but assert it only in a test** | There is no test framework (ADR-021), and a test run once at build time does not protect a seed regenerated at deploy time. The assertions had to move into the boot path and then onto a public surface (ADR-015). |

---

## ADR-014 — Freeze `CONTRACT.md` at v1.0 before the plan prose was finished

- **Status:** Accepted · **Date:** 2026-10-18 (forge) · **Decided by:** forge, under ADR-007
- **Basis:** `CONTRACT.md` §5 freeze record, 8 endpoints, claim state **NOT_CLAIMED** on every example number `[VERIFIED]` as frozen contract text.
- **Rejected:** Finish `PLAN.md` first, derive the contract after · Leave the contract informal / in-flight, let the two chats negotiate · Freeze only the endpoint list, leave the payload shapes open · Let any chat amend the contract directly · Amend v1.0 in place to settle the λ discrepancy (L-1) — each with its reason for losing in `### Rejected` below.

### Context

ADR-007 funds the console with concurrency: the engine build and `design_forge` run at the same
time. Two concurrent chats can only build toward each other if the seam between them does not move
while they build. The seam is the HTTP surface.

Ordinary document order would finish `PLAN.md` first and derive the API from it. That order puts
the contract last, which means the console chat either waits (killing the parallelism that funds
it) or guesses (guaranteeing an integration failure at 16:45).

### Decision

Freeze `CONTRACT.md` at **v1.0** *before* the plan prose was complete. 8 endpoints, shared types,
the decision rule, the DOCKET shape, the complete error table, and an explicit section on what the
console may and may not do. Freeze terms:

- **Read-only to every chat.** No agent amends it, including the chat that wrote it.
- **Amendments route through the master chat only**, and bump to **v1.1**.
- An agent that believes the contract is wrong writes the objection into **its own** document as a
  flagged risk and keeps building to v1.0.
- Every example number in it is **illustrative**, and the claim state is **NOT_CLAIMED**
  `[VERIFIED]` as frozen text — no endpoint had been built or probed when it was written, so no
  figure in it is a measurement.

### Consequences

- Two chats build against one fixed seam, concurrently, which is what makes ADR-007 and ADR-008
  possible at all.
- The eight endpoints are closed: `POST /remember`, `GET /slots`, `GET /slots/{key}`,
  `GET /slots/{key}/graph`, `GET /receipts/{receipt_id}`, `POST /receipts/{receipt_id}/replay`,
  `GET /review`, `GET /health`.
- A contract error is now expensive — both halves are already built on it. Accepted cost, bounded
  by the v1.1 amendment path.
- Objections do not vanish; they accumulate as flagged risks in the objecting document. The
  contradictions ledger in `INVARIANTS.md` §4 carries one such live item: **L-1**, where
  `CONTRACT.md` examples show `lambda: 0.0077` while `PLAN.md` and the dispatch brief propose
  `0.01/hour`. Both are unmeasured `[ASSUMED]` values and no artifact is load-bearing on either;
  `build` picks one and `/health` publishes it, and `package` must copy the value **from
  `/health`**, never from a document. Not worth a v1.1 amendment to a frozen file.
- The frozen `NOT_CLAIMED` claim state is what stops the contract's illustrative examples from
  being quoted downstream as measurements.

### Rejected

| Alternative | Why it lost |
|---|---|
| **Finish `PLAN.md` first, derive the contract after** | Serialises the console behind the plan and kills the parallelism that funds it (ADR-007). |
| **Leave the contract informal / in-flight, let the two chats negotiate** | Negotiation across two chats with no shared turn order is how both sides end up implementing their own half of a disagreement, discovered at 16:45. |
| **Freeze only the endpoint list, leave the payload shapes open** | The payload shapes are what the console renders. An open shape means the console builds against a guess, which is the same failure one layer down. |
| **Let any chat amend the contract directly** | Two writers, no lock, four hours. The master-chat-only path exists so an amendment is seen by both consumers before either builds on it. |
| **Amend v1.0 in place to settle the λ discrepancy (L-1)** | The frozen file is being consumed live by two chats; a silent in-place edit is the exact event the freeze prevents. Both values are unmeasured, and `/health` is the operative source — so the discrepancy is recorded in `INVARIANTS.md` §4 as L-1 instead. |

---

## ADR-015 — Promote the boot assertions from an internal check to a public API surface

- **Status:** Accepted · **Date:** 2026-10-18 (forge) · **Decided by:** forge
- **Basis:** AF-16 `[VERIFIED]` — `GET /health` publishes `node_split_echo`=1, `node_split_independent`=2, `sp_path_weight`=0.21072, and returns **503 `BOOT_ASSERTION_FAILED`** on any mismatch. Underlying measurements: AF-6 `[VERIFIED]` (echo→1, independent→2), AF-3 `[VERIFIED]` (`pathWeight 0.21072`).
- **Rejected:** Assert internally, log to stderr, serve anyway · Assert at build time only (a test, not a boot check) · Fail open: serve with a `degraded: true` flag · Keep the assertions but do not publish the values · Widen the `sp_path_weight` assertion to a tolerance band · Publish ε and λ in the console's config instead of on `/health` — each with its reason for losing in `### Rejected` below.

### Context

Two defects in MENGER are **silent**. Both produce a well-formed 200 response with a plausible,
wrong number:

1. **A missing or bypassed node-split** (ADR-013). `maxFlow` returns edge-disjoint counts. An echo
   scores as independent. No error.
2. **A wrong `SPpaths` weight key** (ADR-012). `weightProperty` / `relationshipWeightProperty` /
   `costProperty` are accepted silently and return **hop count** `[VERIFIED]` (AF-3 / DS-2).
   Reliability is computed over hop count instead of trust. No error.

Nothing in the response distinguishes a correct verdict from either of these. And judging is
artifact-only (AF-10) `[VERIFIED]` — a judge reads the artifacts and, if the service is up, maybe
pokes the endpoints. They cannot audit the resolver.

An internal assertion that logs to stderr satisfies the engineer and is invisible to the judge.

### Decision

Make the assertions a **public, load-bearing API surface**.

- `GET /health` publishes all three asserted values: `node_split_echo` = 1,
  `node_split_independent` = 2, `sp_path_weight` = 0.21072 `[VERIFIED]` (AF-16, AF-6, AF-3).
- On **any** mismatch the service returns **503 `BOOT_ASSERTION_FAILED`** and **refuses to serve**
  `[VERIFIED]` (AF-16). **Fail closed.** The service does not serve a wrong headline number — not
  degraded, not with a warning banner. It stops.
- `GET /health` also publishes **ε and λ**, which are **server** constants echoed on every
  decision; the console must never hardcode them `[VERIFIED]` as the frozen contract rule
  (AF-17 / DS-8 / R-4).
- The assertion code lives in one module (`bootcheck.py`) imported by **both** the seed and the
  API, so the seed cannot produce a graph the API would reject.
- Never widen a failing assertion to a range and never proceed with assertions disabled — that
  converts a loud correct failure into the silent wrong answer the assertion existed to catch.
  Written as `INVARIANTS.md` INV-8.

### Consequences

- The two silent failure modes become the loudest possible failure: total refusal to serve, with a
  named error code.
- A judge can verify the mechanism in one request. `0.21072` is not a number we assert in prose —
  it is a number the running service publishes, and the chain from
  `.law12-feasibility.json` → AF-3 → `/health` is checkable end to end.
- A broken deploy presents as a down service rather than a working-looking one. On a 168h judging
  window with no live demo (ADR-016), that is strictly better: a 503 with a named code is
  diagnosable; a wrong `independence` value in a receipt is not.
- `0.21072` is now a **contract**, not an incidental observation. If the control fixture's trust
  values change, the constant changes with it and the change is deliberate.
- ε and λ are published, so every verdict is auditable against the band that produced it. The
  console's status strip reads them from `/health`.

### Rejected

| Alternative | Why it lost |
|---|---|
| **Assert internally, log to stderr, serve anyway** | Invisible to an artifact-only judge, and it serves wrong numbers while looking healthy. The two defects this guards against are precisely the ones with no external symptom. |
| **Assert at build time only (a test, not a boot check)** | There is no test framework (ADR-021), and the seed is regenerated at deploy. A build-time check does not cover the graph that actually gets served. |
| **Fail open: serve with a `degraded: true` flag** | Ships wrong `independence` values inside signed-looking DOCKET receipts. A receipt for a wrong verdict is worse than no service — it is a replayable artifact of the bug. |
| **Keep the assertions but do not publish the values** | Loses the single cheapest credibility win in the submission. Publishing them lets a stranger check the headline mechanism without reading any code. |
| **Widen the `sp_path_weight` assertion to a tolerance band** | The value is exact on a fixed fixture `[VERIFIED]` (AF-3); a band exists only to let a failure through. The failure mode it would admit is exactly the hop-count degeneracy — `0.21072` becoming a small integer. |
| **Publish ε and λ in the console's config instead of on `/health`** | Two sources of truth for the decision band, and the console's copy would be the one a judge sees. Explicitly forbidden by the contract (R-4 / DS-8). |

---

## ADR-016 — Stateful durable tier, with `spendApproved: false`

- **Status:** Accepted, **gated on owner approval** · **Date:** 2026-10-18 (forge) · **Decided by:** forge, deferring spend to Dami
- **Basis:** `durability-tier.json` `[VERIFIED]` as a record of the decision: `persistenceClass: stateful`, 168h window, render starter + persistent disk, `ephemeralFs: false`, `sleepsOnIdle: false`, `costMonthlyUsd: 8`, **`spendApproved: false`**.
- **Rejected:** Free tier, ephemeral filesystem · Free tier with spin-to-zero · Stateless: recompute receipts on demand from a seed re-run · Self-approve the $8 · Local-only, no deployment at all · A bigger tier for headroom — each with its reason for losing in `### Rejected` below.

### Context

Judging is artifact-only over a **168-hour window** `[ASSUMED]` — the window length is the
recorded planning assumption, not a measured or quoted figure. A judge may open the live URL at
any point in it, with nobody present.

MENGER's headline capability is the **replayable DOCKET receipt** (ADR-018). A receipt that cannot
be fetched three days after the verdict is not a receipt. That rules out two attractive free
options:

- An **ephemeral filesystem** loses the graph on every restart. Every receipt URL a judge has
  (from the README, from the video) 404s.
- **Spin-to-zero on idle** means the first request after a quiet period pays a cold start *and*,
  on an ephemeral tier, finds an empty graph. A judge's single visit is exactly the cold path.

Against that: real money, on an account that is not the agent's to spend.

### Decision

Declare the tier **stateful**: a persistent disk, `ephemeralFs: false`, `sleepsOnIdle: false`, at
**$8/month**. And set **`spendApproved: false`** — deliberately **not** self-approved.
`deploy` **BLOCKS** until the owner approves the spend. **That block is intended, not a defect.**

### Consequences

- Receipts survive the judging window. The headline capability is actually demonstrable at the
  moment a judge chooses to look.
- No cold-start-plus-empty-graph on a judge's first and possibly only request.
- **`deploy` is hard-blocked** on an owner decision that nothing in the pipeline can make for it.
  This is on the critical path and is listed as an open blocker in `SUBMISSION_STATUS.md`. It is a
  human item, surfaced rather than quietly resolved.
- The $8/mo is the owner's money and the owner's call. Writing `spendApproved: true` would be an
  agent approving a spend on someone else's account — a different and worse failure than a missed
  deadline.
- Latency on a starter tier is `NOT_CLAIMED`. `stress_test` was skipped (ADR-009) and no endpoint
  has been probed; the only measured figures are the engine's 41ms cold / 11ms warm at demo scale
  `[VERIFIED]` (AF-7), which are not endpoint numbers.

### Rejected

| Alternative | Why it lost |
|---|---|
| **Free tier, ephemeral filesystem** | Loses the graph on restart. Every receipt link in the README and the video dies. The product's headline capability becomes a 404 at the exact moment it is being graded. |
| **Free tier with spin-to-zero** | A judge's visit is the cold path by construction. Cold start plus (on free tiers) an ephemeral disk is the worst case landing on the only case that matters. |
| **Stateless: recompute receipts on demand from a seed re-run** | The seed is deterministic, so this is nearly tempting — but a *recomputed* receipt is not the recorded one. Replay (ADR-018) means re-executing the Cypher **the verdict actually ran**; regenerating it proves the generator, not the verdict. |
| **Self-approve the $8** | Not the agent's money. The owner's approval gate exists precisely so this is not an agent's call, and routing around a spend gate is a trust failure that outlasts the hackathon. |
| **Local-only, no deployment at all** | Artifact-only judging does not *require* a live URL, so this is survivable. But a live URL plus a published `/health` carrying the boot assertions (ADR-015) is the cheapest credibility a stranger can verify unaided. |
| **A bigger tier for headroom** | More of the owner's money for headroom no measurement asks for. The demo-scale evidence (AF-7, 1402 nodes / 2400 edges) `[VERIFIED]` does not suggest the starter tier is the constraint. |

---

## ADR-017 — Keep the `GRAPH.COPY` counterfactual stretch-only and deliberately NOT load-bearing

- **Status:** Accepted · **Date:** 2026-10-18 · **Decided by:** Dami (R4) + forge
- **Basis:** `LEDGER.md` R4 `[VERIFIED]` as a record (P3 = stretch, gated at `verify_milestone`). DS-10 is recorded in `.law12-feasibility.json` with **`load_bearing: false`** and an **empty `ts`** — i.e. **not probed** `[VERIFIED]` as a record of its own absence. `GRAPH.COPY` latency: **`NOT_CLAIMED`**.
- **Rejected:** Commit P3 as core scope · Cut P3 entirely to simplify · Build P3 into the resolver for elegance (one code path, counterfactual as a flag) · Probe `GRAPH.COPY` now to de-risk it · Estimate the clone latency from the 41ms / 11ms figures (AF-7) — each with its reason for losing in `### Rejected` below.

### Context

P3 is the most interesting beat in the demo: fork the graph with `GRAPH.COPY`, delete one source
in the fork, re-run the verdict, and show **what the decision would have been without that
source**. A counterfactual, computed on a graph clone, in a graph database. It is the kind of thing
that wins a category.

It is also un-probed. Unlike the seven load-bearing facts, `GRAPH.COPY` has **no timestamp** in
`.law12-feasibility.json` `[VERIFIED]` as a record — the entry exists with `load_bearing: false`
and an empty `ts`, which is the file saying out loud that we did not run it. Its latency at demo
scale is `NOT_CLAIMED`. On a clone of a graph, under a $8/mo tier (ADR-016), against a 19:29
deadline.

### Decision

Keep P3 as a **stretch**, and architect it to be **deletable**:

- **One file plus one route.** No committed surface imports it, and no committed surface's
  correctness depends on it.
- It **reuses the existing resolver** rather than forking the scoring path — which is why it is
  ~25 minutes `[ASSUMED]` rather than an hour (ADR-007).
- **Go/no-go at 16:25**, at `verify_milestone` `[VERIFIED]` as the scheduled gate (`LEDGER.md` §3;
  note the stretch-gate time is the one carried in `PULSE.md` DS-11 and `LEDGER.md` §3 —
  `warroom/WINNER-BRIEF.md` says 14:45 and is **stale**, recorded as contradiction **L-2** in
  `INVARIANTS.md` §4).
- **No artifact claims it works until it has been watched working.** No `GRAPH.COPY` latency
  figure appears anywhere; `NOT_CLAIMED` stands until a probe replaces it.

### Consequences

- The committed scope (P2 + P5) cannot be destabilised by the stretch. If 16:25 says no, the cut
  is one file and one route, and the README loses one paragraph.
- The demo's best beat is contingent. Accepted: a contingent beat that works is better than a
  committed beat we cannot finish.
- `GRAPH.COPY`'s behaviour on this engine is an open unknown. Honestly disclosed in
  `LIMITATIONS.md` rather than estimated.
- It must be isolated **as it is built**, not retro-fitted. Isolation after the fact is how a
  stretch becomes load-bearing by accident. `INVARIANTS.md` INV-21.

### Rejected

| Alternative | Why it lost |
|---|---|
| **Commit P3 as core scope** | Un-probed `GRAPH.COPY`, unknown clone latency, $8/mo tier, 19:29 deadline. Committing it means the headline surface shares a fate with an unmeasured engine command. |
| **Cut P3 entirely to simplify** | ~25 minutes `[ASSUMED]`, reuses the resolver, and it is the single most distinctive demo beat available. Cheap option value; the gate costs nothing to hold. |
| **Build P3 into the resolver for elegance (one code path, counterfactual as a flag)** | This is the version where deleting it at 16:25 is a refactor instead of a file deletion. The whole value of the decision is that the no-go is free. |
| **Probe `GRAPH.COPY` now to de-risk it** | Reasonable, and genuinely the better engineering call — but every probe minute at forge time competes with the seven load-bearing facts, and this one is explicitly not load-bearing. Deferred to the 16:25 gate, where the probe *is* the gate. |
| **Estimate the clone latency from the 41ms / 11ms figures (AF-7)** | Fabrication. AF-7 measures query latency on a live graph, not a clone operation. A derived-looking number with no measurement under it is the project-ending defect class. `NOT_CLAIMED`. |

---

## ADR-018 — Make the DOCKET receipt mandatory on every verdict, not an optional audit mode

- **Status:** Accepted · **Date:** 2026-10-18 (warroom `pool_checkpoint`) · **Decided by:** Dami (P5 MANDATORY)
- **Basis:** `PULSE.md` Decisions Log #4 ("**P5 DOCKET receipts MANDATORY**") `[VERIFIED]` as a record. `CONTRACT.md` §2.5 / §2.6 define the receipt and the replay endpoint `[VERIFIED]` as frozen contract text.
- **Rejected:** Receipts as an optional `?explain=true` mode · A human-readable explanation string instead of the Cypher · Log the Cypher server-side, no public receipt endpoint · Receipts for BLOCK only** (the contested case) · Regenerate the Cypher from current code at replay time — each with its reason for losing in `### Rejected` below.

### Context

An admission-control gate that refuses a write owes an explanation. Without one, MENGER is a
black box that says BLOCK, and the only available response is to trust it — which is exactly the
posture the project criticises in LLM adjudication (ADR-002's rejected set).

Receipts are usually built as an optional audit mode: a flag, a debug endpoint, a verbose
response. Optional audit modes are off in the demo, off in the README's curl example, and
subtly divergent from the real path by the second week.

### Decision

**Every verdict ships a DOCKET receipt. Mandatory, not a mode.** Two frozen endpoints:

- `GET /receipts/{receipt_id}` — the receipt: the **exact Cypher** that ran, the **three
  components** separately, the **winning provenance path**, and the **max-flow witness set**.
- `POST /receipts/{receipt_id}/replay` — **re-execute the receipt's recorded Cypher verbatim** and
  report whether it reproduces.

The receipt records the Cypher **as executed**, not a reconstruction. Replay re-runs that text. A
receipt whose Cypher is regenerated from current code proves the generator reproduces itself; a
receipt whose Cypher is replayed proves **that verdict**.

### Consequences

- MENGER's strongest differentiator is a thing a judge can click. On artifact-only judging, a
  replayable receipt is worth more than a paragraph claiming auditability.
- Receipts must **persist** across the judging window — which is what forces the stateful tier
  (ADR-016) and the owner's spend gate.
- Storage grows with every verdict. At demo scale, irrelevant; stated because the trade is real.
- The recorded Cypher is a **public surface**, so it must contain no secrets and must be
  parameterised — all values bound, never interpolated (`INVARIANTS.md` INV-16, INV-17). A receipt
  that published an interpolated query would publish its inputs.
- Replay creates an obligation the rest of the system must honour: the verbatim Cypher has to
  remain executable. That is another reason all reads go through `GRAPH.RO_QUERY` (ADR-011) —
  replaying a recorded query cannot mutate the graph it is replaying against.

### Rejected

| Alternative | Why it lost |
|---|---|
| **Receipts as an optional `?explain=true` mode** | Off by default means off in the demo and off in the README. The audited path drifts from the served path, and the differentiator becomes a footnote. |
| **A human-readable explanation string instead of the Cypher** | Prose cannot be replayed. "Blocked because source independence was lower" is a sentence; the query is evidence. |
| **Log the Cypher server-side, no public receipt endpoint** | Invisible to a judge with no shell access, which is every judge (AF-10) `[VERIFIED]`. |
| **Receipts for BLOCK only** (the contested case) | ALLOW is equally a decision, and the UNDECIDED band (ADR-005) is where the margin matters most. Selective receipts also invite the question of what the unreceipted path does differently. |
| **Regenerate the Cypher from current code at replay time** | Proves the generator is stable, not that the verdict was sound. If the resolver changed between verdict and replay — which is the interesting case — this silently reports the new behaviour as the old verdict. |

---

## ADR-019 — `/review` is read-only in v1.0; no resolve endpoint

- **Status:** Accepted · **Date:** 2026-10-18 (forge) · **Decided by:** forge, inside the frozen contract
- **Basis:** `CONTRACT.md` §2.7 — "**v1.0 is read-only.** Resolving a review item is **NOT in this contract**"; `404 REVIEW_NOT_FOUND` is **reserved** `[VERIFIED]` as frozen contract text.
- **Rejected:** `POST /review/{id}/resolve` with a human-chosen winner · Auto-resolve ties by a tiebreak (most recent wins, highest trust wins) · Hide UNDECIDED items entirely (no `/review` endpoint) · Expose resolve but make it a no-op stub — each with its reason for losing in `### Rejected` below.

### Context

ADR-005 made UNDECIDED a first-class verdict, which creates a queue: a `(:Review)` node and a
`review_id` per near-tie. A queue invites a resolve action — a human adjudicating the tie, writing
the winner, closing the item.

Resolution is a **write** to the memory graph, performed by a human, on the basis of something
MENGER does not have: knowledge of which claim is actually correct. That is **veracity**, and
MENGER's scope boundary is admissibility (ADR-005, `INVARIANTS.md` INV-12). A resolve endpoint
would be the one place the product quietly decides truth — and it would be the natural place for
the scope to start leaking.

It also needs identity, authorisation, an audit trail of who resolved what and why, and a receipt
for the manual override. None of that exists in v1.0.

### Decision

`GET /review` is **read-only in v1.0**. It lists the queue: `review_id`, `claim_id`, `margin`. A
slot's summary carries `open_review_count`, and `GET /slots` supports a `has_review` filter so the
console can show exactly where the ties are. **No resolve endpoint.** `404 REVIEW_NOT_FOUND` is
reserved in the error table so the code exists before the route does `[VERIFIED]` as frozen
contract text.

### Consequences

- The queue is a **visible backlog**, not a worked one. That is the honest shape: MENGER surfaced
  a tie it is not entitled to break.
- No identity, auth, or override-audit surface in v1.0 — a large amount of work and attack surface
  that does not ship, and does not need to.
- The console's review view is a display, filterable, with a margin per item. Deliberately
  narrower than it looks like it should be, which is a UX cost accepted on scope grounds.
- A judge may ask "so what happens to UNDECIDED items?" The answer is in `LIMITATIONS.md`: they
  queue, visibly, and v1.0 does not resolve them, because resolving is a veracity judgement MENGER
  does not make.
- Resolution is a clean v1.1 addition — it needs the identity and override-receipt surfaces first,
  and those are honest prerequisites rather than missing features.

### Rejected

| Alternative | Why it lost |
|---|---|
| **`POST /review/{id}/resolve` with a human-chosen winner** | A human write on the basis of veracity, inside a product scoped to admissibility. It is where the scope boundary leaks, and it needs identity + authorisation + an override audit trail that v1.0 does not have. |
| **Auto-resolve ties by a tiebreak (most recent wins, highest trust wins)** | Destroys the point of the epsilon band. A tie inside the noise of three unmeasured components is being *reported* as a tie on purpose; auto-breaking it is the confident coin-flip ADR-005 rejected, with an extra rule to defend. |
| **Hide UNDECIDED items entirely (no `/review` endpoint)** | Violates "nothing is silently lost" `[VERIFIED]` (`CONTRACT.md` §0 ground rule 4). An invisible queue is a dropped write. |
| **Expose resolve but make it a no-op stub** | A route that looks actionable and does nothing is worse than an absent route — a judge clicking it learns the product is a mock-up. The reserved `404 REVIEW_NOT_FOUND` says the same thing honestly. |

---

## ADR-020 — Surface three components + an ordinal flag instead of one confidence number

- **Status:** Accepted · **Date:** 2026-10-18 · **Decided by:** Dami (R-4 / DS-8) + forge
- **Basis:** `CONTRACT.md` §0 ground rule 2 and the `score_is_ordinal: true` field on every scored object `[VERIFIED]` as frozen contract text. ε = 0.05 and λ = 0.01/hour are **proposed, unmeasured defaults** `[ASSUMED]`.
- **Rejected:** One 0–1 confidence number · Pre-blend into a single score and expose components only in the receipt · Expose the score with no `score_is_ordinal` flag and explain it in the docs · Calibrate the score into a real probability · Let the console pick ε** (a sensitivity slider) · Hardcode ε and λ in the console for speed — each with its reason for losing in `### Rejected` below.

### Context

`score = independence * reliability * recency`. It is a product of three terms: an integer
path count, an `exp(-pathWeight)` term, and an `exp(-lambda * age_hours)` term. Multiplying them
gives a number that **orders** claims. It does **not** give a number that *means* anything.

Every instinct downstream pushes the other way. A single 0–1 number renders as a percentage, a
progress bar, a confidence badge. It is better UI. It is also a lie: there is no calibration
behind it, no probability model, and the λ that shapes the recency term is an unmeasured default
`[ASSUMED]`. A judge who reads "0.87 confidence" will reasonably ask what it is confidence *of*,
and the honest answer is "nothing — it is a rank".

### Decision

- **Surface all three components separately, always.** Never pre-blend
  (`INVARIANTS.md` INV-11). `independence`, `reliability` and `recency` each appear on every
  scored object, and the DOCKET receipt carries all three.
- **`score_is_ordinal: true` on every scored object** `[VERIFIED]` as frozen contract text. Always
  true. Rank-only. Not a probability.
- **The console must never render the score as a percentage, a confidence, or a probability**
  `[VERIFIED]` as a frozen contract rule (`CONTRACT.md` §4).
- **ε and λ are server constants**, published by `/health`, echoed on every decision; the console
  must not hardcode them `[VERIFIED]` as the frozen contract rule (AF-17 / DS-8 / R-4). Their
  **values** — ε = 0.05, λ = 0.01/hour — are `[ASSUMED]`: proposed defaults, calibrated in build
  slice B2, reported by `/health`. (See contradiction **L-1** in `INVARIANTS.md` §4 on λ.)

### Consequences

- The score cannot be misread as a probability, because the object carrying it says so in a field.
- Cross-slot magnitude comparisons are **meaningless** and `LIMITATIONS.md` says so outright:
  0.9 in one slot is not "better" than 0.6 in another. Only the within-slot margin against ε has
  meaning.
- The UI is harder: three numbers plus a margin plus a band, instead of one bar. Accepted — and
  it is also more informative, since a judge can see *which* component drove a BLOCK.
- The three components become independently inspectable, which is what makes a DOCKET receipt
  (ADR-018) worth reading.
- ε and λ live in one place, so a verdict can always be checked against the band that produced it.

### Rejected

| Alternative | Why it lost |
|---|---|
| **One 0–1 confidence number** | Uncalibrated, so it would be a fabricated semantic. Reads as a probability, invites "confidence of what?", and the answer is "nothing". Nicer UI; false claim. |
| **Pre-blend into a single score and expose components only in the receipt** | The blend is where the information is destroyed; hiding the inputs behind the headline makes the common case the uninformative one. Explicitly forbidden (INV-11). |
| **Expose the score with no `score_is_ordinal` flag and explain it in the docs** | Documentation does not travel with the JSON. The next consumer renders a percentage, correctly reading the data and not the prose. The flag is in-band on purpose. |
| **Calibrate the score into a real probability** | Requires labelled ground truth about which claims were actually correct — i.e. **veracity**, which MENGER does not have and does not claim (INV-12). Also hours of work that does not exist. |
| **Let the console pick ε** (a sensitivity slider) | Moves the decision boundary to the client, so two clients disagree about the same verdict and no receipt is checkable against a band. Forbidden by R-4 / DS-8. |
| **Hardcode ε and λ in the console for speed** | Same failure, one step quieter: the published band and the rendered band drift, and the console becomes authoritative about a server constant. |

---

## ADR-021 — No test framework; executable assertions wired into the boot path

- **Status:** Accepted · **Date:** 2026-10-18 (forge) · **Decided by:** forge
- **Basis:** `PLAN.md` §6 — "No test framework. Under a 19:29 deadline the tests are **executable assertions wired into** [the boot path]"; the boot drill `T-1`..`T-4` and `drill.sh` steps 1–8 `[VERIFIED]` as a record of the plan. `bootcheck.py` is imported by both the seed and the API (`PLAN.md` C4) `[VERIFIED]` as a record.
- **Rejected:** pytest suite with fixtures · pytest *and* boot assertions · Boot assertions but internal-only (no `/health` publication) · Manual smoke test before submitting · Skip the negative drills (assume the assertions work) — each with its reason for losing in `### Rejected` below.

### Context

Standard practice is pytest: a suite, fixtures, a CI step, a coverage number. Against a 19:29
hard deadline, a test suite costs setup time, and — more importantly — it protects the **build**
machine. The graph a judge's request runs against is produced by a seed, at deploy time, on a
different machine. A green suite on a laptop says nothing about that graph.

And the two defects that matter (ADR-015) are **properties of the served graph**, not of the code:
a node-split that got bypassed on one write path, a weight key that is wrong in the deployed
resolver. Both can be true while every unit test passes, because a unit test can supply its own
fixture — and a fixture that pre-supplies the value a check is supposed to derive leaves the
producer entirely unproven.

### Decision

**No test framework.** The tests are **executable assertions in the boot path**:

- `bootcheck.py` holds the three `DC-1` assertions and is imported by **both the seed and the
  API**, so the seed cannot produce a graph the API would reject.
- The boot drill is `T-1` … `T-4`; `drill.sh` runs steps 1–8 end to end.
- The assertions run **on every boot of the deployed service**, against the graph it will actually
  serve, and publish their values on `GET /health` (ADR-015).
- Adversarial cases are **drills, not unit tests**: the **echo attack** (two chains, one shared
  source, must score 1) and the **hop-count forgery** — deliberately set `weightProperty` instead
  of `weightProp` and confirm `pathWeight` degenerates to an integer and `T-3` **FAILS**. That
  last one is the important one: it proves the assertion has **teeth** rather than being
  decorative. An assertion nobody has watched fail is an assumption.
- **Never widen a failing assertion to a range; never proceed with assertions disabled**
  (`PLAN.md` §risk tree, `INVARIANTS.md` INV-8).

### Consequences

- The thing that gets verified is the **deployed** graph, on every boot, in production, with the
  result published where a stranger can read it.
- No regression suite. Refactoring is riskier, and we accept that for a submission with a
  same-day lifespan and no maintenance phase.
- No coverage number to show. Replaced by something better on an artifact-only surface: three
  asserted values a judge can fetch.
- Assertion correctness is itself proven by the negative drill. The hop-count forgery is the only
  evidence that `T-3` is not decorative.
- Longer-lived descendants of this code would want a real suite. Stated plainly in
  `LIMITATIONS.md`.

### Rejected

| Alternative | Why it lost |
|---|---|
| **pytest suite with fixtures** | Setup cost against a hard deadline, and it proves the build machine rather than the served graph. A fixture that pre-supplies a derived input leaves the producer unproven while the suite stays green. |
| **pytest *and* boot assertions** | Strictly better engineering, and if there were hours it is what we would do. There are not, and if only one survives, the one that runs in production against the real graph is the one that catches the real defects. |
| **Boot assertions but internal-only (no `/health` publication)** | Rejected in ADR-015: invisible to an artifact-only judge, and it loses the cheapest verifiable claim in the submission. |
| **Manual smoke test before submitting** | Runs once, on one machine, by someone who knows what to expect. Does not cover a deploy-time reseed, and does not cover the 168h window. |
| **Skip the negative drills (assume the assertions work)** | An assertion nobody has watched fail is an assumption with a function signature. The hop-count forgery exists because the failure it guards against is silent. |

---

## ADR-022 — Render the node-split in `/slots/{key}/graph` instead of hiding it

- **Status:** Accepted · **Date:** 2026-10-18 (forge) · **Decided by:** forge
- **Basis:** `CONTRACT.md` §2.4 — the endpoint returns the node-split DAG with `SourceIn`/`SourceOut` nodes and `SuperSource`, and "**the split is visible on purpose**" `[VERIFIED]` as frozen contract text. AF-6 `[VERIFIED]`: the split is what produces echo→1 / independent→2.
- **Rejected:** Collapse `SourceIn`/`SourceOut` into one node for display · Two views: a "simple" collapsed one and an "advanced" split one · Return the original (pre-split) graph from the endpoint · Explain the split in a README diagram and keep the live view clean — each with its reason for losing in `### Rejected` below.

### Context

The node-split doubles the source nodes (ADR-013). To a visualisation designer it looks like
plumbing: `si:src_crm_export` and `so:src_crm_export` are two circles where a reader expects one
source. The obvious kindness is to collapse the pair back into a single node for display and let
the user see a clean provenance graph.

But the split **is** the mechanism. It is the reason max-flow counts the vertex-disjoint quantity
the headline claims, and it is the thing the two boot controls assert `[VERIFIED]` (AF-6).
Collapsing it in the UI hides the one structure that makes the theorem apply — and the judging
surface is artifact-only (AF-10) `[VERIFIED]`, so the graph view may be the main place a judge
*sees* how MENGER works.

### Decision

**Render the split.** `GET /slots/{key}/graph` returns the node-split DAG as it is computed over:
`SuperSource`, `SourceIn`, `SourceOut`, `Claim`, with `[:FLOW]` edges and per-node `trust` and
`source_id`. The `SourceIn`/`SourceOut` pairs are **visible on purpose** `[VERIFIED]` as frozen
contract text — "the mechanism, not an implementation detail to hide". The console renders the
pair and the unit-capacity edge between them, because that edge is where independence is decided.

### Consequences

- A judge can *see* Menger's theorem being applied: the capacity-1 edge through each source, and
  the max-flow witness set threading through it. The mechanism becomes legible rather than
  asserted.
- The echo case becomes visually obvious — two chains converging on **one** `SourceIn`→`SourceOut`
  pair, which is why the answer is 1 and not 2. That single picture is the project's best
  explanation of itself, and it needs no narrator.
- The graph view carries more nodes and more explanatory burden. `design_forge` inherits a harder
  problem than "draw a provenance tree" (ADR-008), and the captions (`"crm-export in"`,
  `"crm-export out"`) are part of the contract rather than UI copy.
- The visual and the computation cannot drift, because the endpoint serves the same DAG the
  max-flow runs over.

### Rejected

| Alternative | Why it lost |
|---|---|
| **Collapse `SourceIn`/`SourceOut` into one node for display** | Hides the mechanism. A judge sees an ordinary provenance graph and has no visual reason to believe the independence count is anything but a hop count. The split's whole purpose is that it is the difference. |
| **Two views: a "simple" collapsed one and an "advanced" split one** | The simple one becomes the default, so the default hides the mechanism — and the advanced view is a toggle a judge with ~180 seconds never finds. Also two renderers to build and keep honest. |
| **Return the original (pre-split) graph from the endpoint** | The visual would then differ from the graph the verdict was computed on. Two sources of truth about the same provenance, and the one a judge sees would be the one the engine did not use. |
| **Explain the split in a README diagram and keep the live view clean** | A static diagram is unverifiable; a live graph is the product. The one place the mechanism can be *shown* rather than *claimed* is the running view. |

---

## Claim state

**22 ADRs. 22 `Rejected` sections — one per record, no exceptions.**

Nothing in this file is a measurement unless it is tagged `[VERIFIED]` and traceable to
`.law12-feasibility.json` or a `PULSE.md` `AF-n` row. The only measured numbers that exist
anywhere in this project are:

- `0.21072` — `algo.SPpaths` `pathWeight` on the control fixture `[VERIFIED]` (AF-3)
- `echo → 1`, `independent → 2` — node-split max-flow controls `[VERIFIED]` (AF-6)
- `41ms cold / 11ms warm` on 1402 nodes / 2400 edges `[VERIFIED]` (AF-7)

**Every other number in this project is `NOT_CLAIMED`.** No MENGER endpoint had been built or
probed when this file was written. ε = 0.05 and λ = 0.01/hour are `[ASSUMED]` proposed defaults,
calibrated in build slice B2 and reported by `GET /health`; `GRAPH.COPY` latency is `NOT_CLAIMED`;
MENGER's own request latency, throughput and load behaviour are `NOT_CLAIMED`.

Cross-source contradictions found while writing this file are recorded in `INVARIANTS.md` §4 as
**L-1** (λ default: `CONTRACT.md` 0.0077 vs `PLAN.md`/brief 0.01), **L-2** (stretch-gate time:
`WINNER-BRIEF.md` 14:45 — stale — vs `PULSE.md` DS-11 / `LEDGER.md` §3 16:25), and **L-3** (an
upstream `intel` gate: `config.json` asserts `roster_audit.discovered = true` but
`research/roster-audit/strategy-density.md` does not exist). They are recorded, not silently
resolved.

The boundaries of what MENGER can and cannot do are in **`LIMITATIONS.md`**. The laws every build
agent is bound by are in **`INVARIANTS.md`**.
