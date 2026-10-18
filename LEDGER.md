# LEDGER — MENGER · Graph Hacks (WeMakeDevs × FalkorDB)

> **READ THIS FIRST. Every fresh chat starts here, and only here.**
> ~900 words. Everything else is linked, not inlined. Do not read the other docs
> until this one tells you which one you need.
>
> Last updated: 2026-10-18 18:05 WAT · by critique
> **Deadline: 2026-10-18 19:29 WAT (= 23:59 IST). Hard. No extension.**

---

## 1. What MENGER is (two sentences)

MENGER is an **admission-control gate on agent memory**: when an agent tries to write a
fact into a shared FalkorDB graph, the graph itself answers **ALLOW / BLOCK / UNDECIDED**,
and every verdict ships with a replayable receipt. The verdict is a graph computation —
source independence is **Menger's theorem** evaluated as `algo.maxFlow` over a *node-split*
provenance DAG, and source reliability is `algo.SPpaths` over `-ln(trust)` edges — so
removing FalkorDB does not degrade the product, it removes the output entirely.

Track declared: **02 — Agent Memory and Coordination** (sole).

---

## 2. Dami's standing rulings (binding, do not re-litigate)

| # | Ruling |
|---|--------|
| R1 | **Direction is RULED** — Track 02, shared multi-agent memory, contradictions arbitrated by corroboration-depth × recency × source-trust **computed in Cypher**. No chat re-opens this. |
| R2 | **No conductor.** `hackathon-conductor` is NOT running. Dami drives each chat manually. `autonomous_mode: false`, `run_profile: SPRINT`. |
| R3 | **Skill sourcing:** SKILL.md from installed main (`~/.claude/skills/<skill>/`); `utils/` + `shared-pipeline/` from the worktree `/Users/MAC/pipeline-2b-worktree` (branch `fix/p0-2b`). **Merging is NOT authorized. Push is HELD.** Merge/push is Dami's call only. **SHA AMENDED 17:52 — the pin drifted and the drift is ACCEPTED.** R3 originally pinned `a31ac43`; another session advanced HEAD to `ab1c04c` at 16:42 while three chats were live. Diff verified: ONE commit, TWO files (`tests/deploy-route-probe.sh`, `utils/deploy-route-probe.sh`) — deploy-gate scope only, zero overlap with forge/critique/build/design_forge. Nothing already executed was affected; `deploy` has not run and will inherit a *stricter* gate (25% declaration cap deleted, un-declared evidence floor added). **Not reset** — resetting a shared worktree under another live session is worse than the drift. Actual sourcing SHA for this run is `ab1c04c`. |
| R4 | **Scope:** P2 admission control + P5 DOCKET receipts = committed. P3 counterfactual = **stretch**, gated at verify_milestone. P4, P6, P7 dead. |
| R5 | **`design_forge` runs IN FULL, in its own chat**, concurrent with the engine build. Not condensed, not folded. |
| R6 | Nothing committed gets cut — the console is funded by **parallelism**, not by a scope cut. |

---

## 3. Where we are

```
DONE    intel        → config.json, research/research-brief.md, intel-state.json (amended)
DONE    warroom      → warroom/WINNER-BRIEF.md, warroom/deliberation-transcript.md,
                       .warroom-state.json  (winner = MENGER, P2+P5)
OPEN    forge        status=complete_with_blockers · scope_mode=full · run=REDO (2nd pass, 16:10)
                       The PROCESS was re-run, not re-audited. 12 artifacts, 14,169 lines.
                       → PRD.md 841 · ARCHITECTURE.md 6849 · PLAN.md 1353 · INVARIANTS.md 1001
                       → DECISIONS.md 1275 (22 ADRs) · LIMITATIONS.md 408
                       → USER-ONBOARDING.md 367 · ROUTE-ARCHITECTURE.md 515
                       → FEATURE-OBSERVABLES.md 913 · .env.example 158
                       → FORGE-RESULTS.md · .closure-ledger.json (12 rows, nothing waived)
                       → CONTRACT.md (v1.0 FROZEN, 8 endpoints) untouched
                       ← design_forge is UNBLOCKED
                       DOC FLOORS CLEAN ON MERIT — no waiver requested. The earlier
                         "3 RED await Dami (doc-floor 423<1000 · ROUTE-ARCHITECTURE ·
                         USER-ONBOARDING)" is CLOSED: the docs were written, not waived.
                       Gate verdict: pass_with_blockers · ONE tier failure (cross_review).
                       12 open items, all owned, in .closure-ledger.json:
                         5 →critique  CL-F-001..005 (per-doc review · anti-gaming verdict ·
                                      MD-7 semantic · LAW#12 independence · thesis-2 cross-review)
                         1 →Dami      CL-F-006 design_upstream_gap — RULED 16:36: accept Tier-B
                                      knowingly. No `design` phase. design_forge runs off the
                                      frozen contract with no design-progress.md. (RESOLVED)
                         1 →package   CL-F-007 HANDOFF.md needs a commit SHA (push HELD)
                         1 →intel     CL-F-008 roster-audit claimed but absent (UPSTREAM)
                         1 →forge P0  CL-F-009 cross-doc consistency audit NOT RUN
                         1 →pipeline  CL-F-010 HARNESS: dispatch-gate.sh pipefail+SIGPIPE
                                      makes gate verdicts non-deterministic (13/20 vs 7/20
                                      on byte-identical inputs). NOT patched — shared worktree.
                         1 →forge     CL-F-011 franchiseSkeleton + entryGateChecklist absent
                         1 →critique  CL-F-012 SOURCE LOCK / ESCALATE heading-vs-grep shape
                       Two phases honestly NOT RUN: phase_1_5, phase_2_5 (no interactive review).
                       matrix: .forge-state.json → gates · plain-English: SUBMISSION_STATUS.md
                       human projection of the ledger: FORGE-RESULTS.md → Honest Gaps (12↔12)
DONE    critique     status=complete_with_blockers · run=SPRINT · 18:05
                       → CRITIQUE-REPORT.md (11 sections) · .gate-verdict.json ·
                         .law12-feasibility.json · .critique-state.json · PULSE §critique
                       Verdict: **PROCEED-WITH-CONDITIONS** — 6 conditions, 5 blocking.
                         anti-gaming gate CLEAN · crossreview-exit gate OK · LAW#12 PASS.
                       CL-F-009 (P0) **RUN** — three rulings:
                         (1) λ = **0.0080**/hour, not the declared 0.0077 (CONTRACT.md's own
                             published recency 0.9261 @ 9.6h fixes it). Re-seed trusts; never
                             re-tune λ. Flips PLAN set-piece 3's margin sign.
                         (2) Collapse `FLOW` + `DERIVED_FROM` into one `:FLOW` with a `kind`
                             property — AF-4 allows exactly one relationshipType, and
                             two-calls-and-combine is unsound (max-flow does not decompose
                             over an edge-type partition).
                         (3) "four places" **refuted as an undercount**: 10 internal + 1
                             identity collision + 4 cross-document. ARCHITECTURE §6.3 adopted
                             as the canonical fixture via a v1.1 amendment.
                       Closure rows: CL-F-001 CLOSED (50 findings, 13 BLOCKER) ·
                         CL-F-002 CLOSED · CL-F-004 CLOSED · CL-F-012 accommodation GRANTED ·
                         CL-F-003 verdict issued, **mechanically un-recordable** (semantic HMAC
                           needs `K_dispatch`; conductor-owned, absent under R2) ·
                         CL-F-005 **OPEN, fail-closed by choice** · CL-F-011 OPEN by choice.
                       **NEW BLOCKER — DS-C11:** the eight-step drill (ARCHITECTURE §7.14)
                         asserts **no BLOCK on any step**. "THE HERO BEAT" asserts
                         `recorded == true` / `independence == 1` — an ADMITTED write — and
                         step 7 lands UNDECIDED. The product's headline verdict has **no
                         executable witness**, and PRD.md:553's demo beat "the graph refused
                         it" has nothing behind it. Surfaced by the CL-F-005 distinct-model
                         cross-review and re-verified by hand. Owner `build`, before B4.
                       Routed, NOT applied (§3.1 — the gate re-proves, it never implements):
                         DS-C1..C6 + DS-C11 → `build` · DS-C7..C10 → `master-chat` v1.1 ·
                         COND-4 → `verify_milestone` · COND-5 + E2 + E5 → `package`.
                       E2/E5 auto-approved (quick/none). E1/E3/E4 DEFERRED to Dami.
                       CL-F-010 reproduced and **NOT patched** — shared worktree untouched.
DONE    build        status=complete · 19:00 · ENGINE ONLY (C1..C7). Console is design_forge's.
                       → app/{config,graph,cypher,bootcheck,seed,arbiter,api,docket}.py
                       → tests/drill.sh (9/9) · tests/boot_drill.sh (12/12) ·
                         tests/unit/arbiter_math.test.sh (14/14)
                       → scripts/{verify,verify-claims,clean-room}.sh · CLAIMS.md (15 VERIFIED)
                       → SECURITY.md (12 enforced + 10 named exclusions) · evidence/claims.txt
                       → BUILD-REPORT.md · .build-state.json · PULSE §build
                       Phases: preflight · B1 · B2 · **GATE=PROCEED (basis recorded)** · B3 · B4.
                         B5 counterfactual **NOT STARTED** — gated at verify_milestone (DS-11).
                       **All 7 critique conditions discharged:**
                         DS-C1  λ = 0.0080/hour · /health publishes 0.008 · trusts re-seeded,
                                λ never re-tuned. Set-piece 3 stays UNDECIDED (margin 0.021).
                         DS-C2  already satisfied — every :FLOW carries nl AND cap (CLM-15/7)
                         DS-C3  already satisfied — MATCH-bound maxFlow, `edges` yield consumed
                         DS-C4  drills rewritten — ERE pipe, non-binding params, inverted T-4
                                polarity and the missing T-2 are all gone
                         DS-C5  sequenced off LEDGER §3, not PLAN §11
                         DS-C6  both vocabulary greps → 0 on app/*.py
                         **DS-C11 CLOSED** — drill step 9 produces a REAL BLOCK: verdict BLOCK +
                                status REFUSED + recorded true + receipt_id non-null, then
                                re-reads and proves the incumbent unchanged (clm_0007 =
                                'eu-west-1' asserted_at byte-identical across the write).
                                Asserting the BLOCK alone would not have been enough.
                       Honest NON-green, do not report otherwise:
                         clean-room → **exit 2 INCONCLUSIVE** (zero commits, push HELD) → deploy 9g
                         CI → **UNVERIFIED**, has never executed (no remote, no commit)
                       8 deviations DEV-001..008. Load-bearing: DEV-002 no commit/merge/push
                         (user binding, so CL-F-007 stays blocked) · DEV-004 localhost→::1
                         shadowed by a FOREIGN :8000 listener · DEV-006 macOS bash 3.2
                         brace-expands a Cypher config map · DEV-007 SECURITY.md authored from
                         the code because forge never wrote the spec section.
                       NEW ACTIVE FACTS: AF-18 λ=0.0080 (PINNED, not calibrated) · AF-19 one
                         :FLOW with kind, DERIVED_FROM gone · AF-20 Claim/SuperSource match on
                         `nid`, Agent/Source on `id`; no `=~` on v4.22.1.
                       gh-falkor untouched. uvicorn killed. Foreign PID 44792 left alone.
NEXT    verify_milestone  → also the counterfactual stretch go/no-go
                       OWED TO IT BY build: (a) **C-5 / DS-13 contract conformance** — the one
                         done-criterion build cannot self-certify. CONTRACT.md §2.5's DOCKET
                         Cypher does not execute as written (CL-F-009 P0), so B4 ships the
                         verbatim EXECUTED statements per INV-17 and they differ from §2.5's
                         illustration. Conformance or breach is verify's call.
                       (b) **DS-11 B5 go/no-go** — DS-10 produced the input (~20–83 ms); the
                         decision was never build's.
                       (c) **COND-4** + the three gates critique flagged as VACUOUS as written:
                         PLAN.md:674 ERE pipe · INV-3's 77-hit grep ·
                         FEATURE-OBSERVABLES.md:654-655 `or .epsilon == null`. Build fixed the
                         DRILL; it did not fix those three documents.
                       Re-derive, don't read: `bash tests/drill.sh` (9/9) and
                         `bash scripts/verify-claims.sh all` (21/21). That is the whole point.
        deploy (IN FULL, livetest folded) → package (IN FULL) → demo (IN FULL) → verify_preflight
SKIP    url_preverify, stress_test, polish, interrogate, demo_rehearsal
FOLD    debug + wire → build;  livetest → deploy
```

`interrogate` and `demo_rehearsal` are skipped **structurally**, not for time: judging on
this hackathon is **artifact-only** — no live demo, no judging call. There is nothing for
them to prepare.

### Schedule — RE-CUT at 16:27 after the forge redo (181 minutes to deadline)

The redo cost ~2h15 against the original plan. The original table below it is kept as the
record of what was planned. **No phase is dropped** — the compression comes out of serial
ordering: `build` and `design_forge` now start immediately and *in parallel* off the frozen
contract (Dami's ratified sequencing), and `critique` runs concurrently rather than as a
gate in front of them.

| Time | What | Note |
|------|------|------|
| 16:30 | **engine build chat** ‖ **design_forge chat (IN FULL)** ‖ `critique` | all three start now, off frozen CONTRACT.md v1.0 |
| 17:30 | integrate + real-Chrome proof | browser is a singleton — master chat only |
| 17:50 | verify_milestone + stretch go/no-go | |
| 18:15 | deploy IN FULL (+ livetest folded) | |
| 18:40 | package IN FULL (README + Cypher artifact) | HANDOFF.md SHA closes CL-F-007 here |
| 19:00 | demo IN FULL (≤180s video) | |
| 19:20 | verify_preflight → submit | |
| **19:29** | **DEADLINE** | hard |

Original plan, for the record: forge 13:45 · critique 14:15 · build‖design 14:30 ·
verify_milestone 16:25 · integrate 16:45 · deploy 17:15 · package 17:45 · demo 18:15 ·
preflight 19:15.

---

## 4. The documents, and when to read which

| Doc | Read it when |
|-----|--------------|
| `LEDGER.md` *(this)* | Always, first, every chat. |
| `docs/ORCHESTRATION-PROTOCOL.md` | Before you dispatch or **are** a skill chat. How a chat runs, which version it sources, the entry/exit obligations. |
| `PULSE.md` | **Mandatory read-on-entry, append-on-exit for every skill chat.** Active Facts override everything else. Downstream Items are routed to you by owner-phase. |
| `CONTRACT.md` | **FROZEN v1.0.** Any chat touching the HTTP surface — engine build, design_forge, deploy, demo. Amendments route through the master chat only. |
| `PLAN.md` | The engine build order + done-criteria + boot drill + risk decision trees. |
| `warroom/WINNER-BRIEF.md` | Building, designing, or writing copy. Thesis block, mechanism, schema, risk register. |
| `warroom/deliberation-transcript.md` §FC-1..FC-7 | You need the raw live-probe evidence (exact Cypher, exact timings). |
| `intel-state.json`, `research/research-brief.md` | Competitor positioning, judging criteria, submission requirements. |
| `KICKOFF.md` | The original rules + compliance constraints. |

---

## 5. Hard constraints (violating any one of these loses)

1. **NODE-SPLIT is non-negotiable.** `algo.maxFlow` over unit-capacity *edges* counts
   edge-disjoint paths; the headline claim needs *vertex*-disjoint. Seed asserts both
   controls at boot (echo→1, independent→2) or refuses to run. *(PULSE DS-1)*
2. **Only `weightProp` works on `algo.SPpaths`.** `weightProperty`/`relationshipWeightProperty`/
   `costProperty` silently return hop count with no error. Resolver asserts
   `pathWeight 0.21072` on the control fixture at boot. *(DS-2, AF-3)*
3. **`algo.dijkstra` and `algo.SCC` DO NOT EXIST** in FalkorDB. *(AF-1)*
4. **Never write "stored procedure."** FalkorDB has none. Say "a single parameterised
   Cypher query." The panel wrote the engine. *(DS-3)*
5. **Never write "detects conflicts"** (agentmesh owns that) **or "truth"** (reads as
   overreach). The word is **refused / admission control**. *(DS-4)*
6. **Fresh code only.** Nothing ported from LEASH / 0g-fleet. Repo `git init`'d today.
7. **No private data.** Synthetic, seeded, committed in-repo.
8. **AI-assistance disclosure** is a required README section.
9. **Judging is artifact-only** — README + ≤180s video + the separately-listed Cypher
   artifact ARE the product.
10. **Engine pinned `falkordb/falkordb:v4.22.1`.** Container `gh-falkor`; kill it at
    session end.
11. **`fix/p0-2b` not merged, push HELD.**

---

## 6. If you are a fresh chat, do exactly this

1. Read this file. 2. Read `docs/ORCHESTRATION-PROTOCOL.md`. 3. Read `PULSE.md`
(Active Facts → Decisions → your Downstream Items → the previous skill's section).
4. Do your phase. 5. **Append your section to `PULSE.md` before you exit**, and update
§3 of this ledger.
