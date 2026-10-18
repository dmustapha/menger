# ORCHESTRATION PROTOCOL — MENGER · Graph Hacks

> How every remaining chat runs. Read `../LEDGER.md` first.
> Written 2026-10-18 13:45 WAT. Authority: Dami's rulings R1–R6 in the ledger.

---

## 1. Why this document exists

We are running the hackathon pipeline **without the conductor** (ruling R2). The conductor
is normally what enforces phase order, state transitions, PULSE compliance and the
in-full dispatch rules. With it off, *this document is that enforcement*, and Dami is the
scheduler. Nothing here is optional because nothing upstream will catch an omission.

---

## 2. Skill version sourcing (ruling R3) — NON-OBVIOUS, GET THIS RIGHT

Every chat sources from **two places at once**:

| What | From | Why |
|------|------|-----|
| `SKILL.md` + the skill's own `reference/`, `injection/`, `templates/` | **installed main** — `~/.claude/skills/<skill-name>/` | This is the skill the Skill tool resolves. |
| `utils/*.sh`, `shared-pipeline/*`, `PIPELINE-COMMON.md`, `hackathon-pulse/PULSE-PROTOCOL.md` | **the worktree** — `/Users/MAC/pipeline-2b-worktree/...` (branch `fix/p0-2b` @ `a31ac43`) | These carry the unmerged P0-2B fixes. Installed main's copies are STALE. |

**Merging `fix/p0-2b` is NOT authorized. Push is HELD.** If a skill's instructions tell
you to run a util, resolve the path into the worktree, not into `~/.claude/skills/utils/`.
If you cannot tell which copy a path refers to, prefer the worktree and say so in your
PULSE section.

---

## 3. Chat boundaries

One phase per chat, fresh context. The master chat (where Dami sits) holds the ledger and
dispatches; it does **not** do the work.

```
master chat  ── dispatches ──▶  forge chat          (fresh)
             ── dispatches ──▶  critique chat       (fresh subagent)
             ── holds      ──▶  ENGINE BUILD        ───┐ concurrent,
             ── dispatches ──▶  design_forge chat   ───┘ joined at verify_milestone
             ── dispatches ──▶  deploy / package / demo chats (each fresh, each IN FULL)
```

### The two rules that force fresh dispatch

- **D-05** (`hackathon-conductor/SKILL.md:524`): an in-context `forge` or `warroom` under
  CAMPAIGN/SPRINT is **RED**. They must be fresh dispatches. SPRINT is our profile, so
  this binds forge.
- **In-full rule** (`SKILL.md:67`): `design_forge`, `deploy`, `demo`, `package` **must
  dispatch their owning skill in full**. Never hand-produced, never shortcut, never
  "the gist of what the skill would do." Dami reaffirmed this for `design_forge` (R5).

### The concurrency contract

The engine chat and the `design_forge` chat run at the same time. They touch different
files and are joined only through **one frozen artifact: the API contract** that `forge`
produces. Neither chat may change that contract unilaterally — a change goes back through
the master chat and gets announced to the other. This is the whole reason forge runs
*before* the split, and the reason forge's single most important output is the contract,
not the plan prose.

---

## 4. Entry and exit obligations (every chat, no exceptions)

**On entry — in this order:**
1. `LEDGER.md` — orientation, rulings, constraints, where we are.
2. This file — how you run.
3. `PULSE.md`:
   - **Active Facts** — these **override** the brief, the kickoff, and your own priors.
     AF-1..AF-3 in particular have already falsified published FalkorDB documentation.
   - **Decisions Log** — closed questions. Do not reopen.
   - **Downstream Items** filtered to `Owner phase == you`. These are assignments.
   - The **previous skill's section**, especially *Blockers for Downstream* and
     *For Next Skill*.
4. Your own `SKILL.md` from installed main.
5. Any prereq-gate your skill defines. If the prior phase left a WILL-BREAK assumption
   unresolved, validate it before proceeding — do not assume.

**On exit — before you return anything:**
1. Append your section to `PULSE.md` using the worktree template
   (`/Users/MAC/pipeline-2b-worktree/hackathon-pulse/PULSE-PROTOCOL.md`). Conventions that
   actually matter:
   - The section header **must be the exact `PHASE_ORDER` key** — `design_forge`, not
     "Design Forge". The D-11 reconciler matches on the literal string.
   - Add the machine-checkable line **`[phase:<your-key>] status=<terminal>`** to Active
     Facts.
   - Claims use the 4-state model: **VERIFIED** (must carry a `Recompute:` command) /
     **UNVERIFIABLE** / **NOT_CLAIMED** / **FAILED**. A claim with no Recompute is not
     VERIFIED.
   - A **WILL-BREAK** assumption must be resolved **in place** with a same-line
     `— RESOLVED:` or `— MOOT:`. Never leave it dangling for the next chat to trip on.
2. Write your own state file if your skill defines one.
3. Update `LEDGER.md` §3 (what's DONE / what's NEXT).
4. Report to the master chat: what shipped, what you deviated on and why, what you
   handed downstream.

---

## 5. Per-chat run cards

### `forge` — fresh dispatch, NOW
- **Profile:** SPRINT, `autonomous_mode: false`.
- **Must output:** `PLAN.md` **and the frozen API contract as its own file**. The contract
  is the hard dependency for the concurrent design_forge chat — if forge returns a plan
  with no contract, it has not finished.
- **Must honour:** node-split in the schema (DS-1), the WINNER-BRIEF schema verbatim, the
  `weightProp`-only trap (DS-2).
- **Must not:** redesign the mechanism. The winner is ruled.

### `critique` — fresh subagent on forge's output
- Adversarial read of PLAN.md + the contract. ~15m box. Findings route back as PULSE
  Downstream Items, not as a rewrite.

### Engine build — the master/build chat
- Order: seed (node-split + both boot controls) → resolver (maxFlow + SPpaths + recency,
  boot assertion of `pathWeight 0.21072`) → write gate (`POST /remember`, review queue) →
  DOCKET receipts.
- All reads go through **`GRAPH.RO_QUERY`** (Python client — the TS client lacks it,
  FalkorDB issue #408). This is the only real containment boundary for generated Cypher.
- Measure `GRAPH.COPY` latency (DS-10) before the stretch gate.

### `design_forge` — its own chat, IN FULL, concurrent
- Owns the console. Consumes the frozen contract; does not negotiate it.
- Runs the whole skill. UX is 16.7% of the grade.

### `verify_milestone` — 16:25
- Also the **counterfactual stretch go/no-go** (DS-11). Record the decision explicitly;
  "we ran out of time" is not a recorded decision.

### `deploy` / `package` / `demo` — each a fresh chat, each IN FULL
- `deploy` folds `livetest`; must produce a reachable URL (DS-12).
- `package` owns DS-3..DS-8: no "procedure", locked README line 1, Cypher as a separately
  listed artifact, AI-assistance disclosure, track declaration, explicit ε +
  ordinal-not-cardinal.
- `demo` produces the ≤180s video.

### `verify_preflight` → submit
- Submission form is a **login-gated SPA**: fields must be read in **real Chrome**.
  The browser is a **singleton — never delegate it to a subagent.**

---

## 6. Standing prohibitions

- **No fabrication.** Fabricating results, competitors, or test output is the one
  unforgivable failure (PIPELINE-COMMON §2). "I expect this returns X" is not a result.
- **No completion claim without proof.** Evidence law: seen in real Chrome, not
  headless-only.
- **Process hygiene:** kill every process the moment its output is consumed. `gh-falkor`
  is the live build DB and stays up *for now*; it must be stopped at session end.
- **No silent skip.** A skipped phase or collapsed sub-phase is logged in PULSE's
  Deviations and in the ledger. Two phases are already skipped *structurally*
  (`interrogate`, `demo_rehearsal` — artifact-only judging); everything else that gets
  dropped needs a written reason.
