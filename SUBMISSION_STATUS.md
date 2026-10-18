# MENGER — Submission Status

**Living doc.** forge seeds it; build keeps it current; deploy links and ships it. The rule for
every edit: say what is actually built and running, and say what is **not** built and **why**.
A row flips to `[x]` only when someone has watched it work.

- **Project:** MENGER — an admission-control gate on agent memory. `POST /remember` returns
  ALLOW / BLOCK / UNDECIDED with a replayable DOCKET receipt.
- **Engine:** FalkorDB, pinned `falkordb/falkordb:v4.22.1` (AF-9). Local container `gh-falkor`.
- **As of:** 2026-10-18 ~15:10 WAT · **hard deadline** 19:29 WAT.
- **Judging is ARTIFACT-ONLY** (AF-10): no live demo, no call. The README, the video and the
  form prose *are* the product. That is why this file exists — the artifacts have to be honest
  on their own, with nobody in the room to explain them.

## What is built and working

- [x] Core mechanism **live-probed** against the real engine, not assumed. 7 load-bearing facts
      recorded in `.law12-feasibility.json` with evidence: `algo.maxFlow` signature, node-split
      yielding vertex-disjoint counts (echo→1, independent→2), `algo.SPpaths` weighted paths
      (`weightProp` only), `GRAPH.RO_QUERY` write-rejection, 41ms cold / 11ms warm at demo scale.
- [x] Two probes came back **wrong-as-designed and were fixed before any code was written**:
      `algo.dijkstra`/`algo.SCC` do not exist (re-cut onto `SPpaths`/`maxFlow`), and unit-cap
      maxFlow counts edge-disjoint not vertex-disjoint paths (hence the mandatory node-split).
- [x] `PLAN.md` — the 10-part scope kickoff for the build.
- [x] `CONTRACT.md` v1.0 **FROZEN** — 8 endpoints. Joint artifact with the concurrent
      `design_forge` chat; neither side amends it unilaterally.
- [x] Durable-tier decision recorded (`durability-tier.json`): stateful, 168h judging window,
      non-ephemeral fs, no spin-to-zero. Receipts are the headline capability, so losing them
      mid-window would lose the submission.

## What is NOT built — and why

| Surface | State | Why |
|---|---|---|
| The engine itself (`POST /remember` and the other 7 routes) | **not written** | forge was dispatched to produce `PLAN.md` + `CONTRACT.md` only, in a 30-minute box. `build` owns the code. No endpoint has been built or probed, so **every forge-originated number is `NOT_CLAIMED`**. |
| Console / UX | **not written** | routed to `design_forge`, running in its own chat off the frozen contract. |
| Seed corpus | **not written** | synthetic, in-repo, no private data. `build` emits it; shape is specified in `PLAN.md`. |
| ε band and recency λ | **not chosen** | they are *server* constants published by `GET /health` and echoed on every decision. The console must not hardcode them (DS-8 / R-4). `build` picks the values. |
| Live URL | **not deployed** | routed to `deploy`. Tier is decided but `spendApproved` is **false** — the $8/mo is Dami's call, deliberately not self-approved. |
| ≤180s video | **not recorded** | routed to `demo`. |
| README / Cypher artifact / disclosure / track | **not written** | routed to `package`. |
| `GRAPH.COPY` counterfactual (P3) | **stretch, un-probed** | latency is `NOT_CLAIMED`. Deliberately *not* load-bearing: deletable as one file plus one route, go/no-go at 16:25. |
| Nothing is committed or pushed | **by instruction** | merging `fix/p0-2b` is not authorized and the push is HELD. forge wrote files only. |

## Open blockers carried out of forge

forge ran **twice**. The first pass produced a thin suite and then asked for a waiver on the
doc-depth floor. That was the wrong move, and Dami's instruction was to redo the *process* — so
the documents were written rather than waived. Gate verdict after the redo:
**`pass_with_blockers`, one tier failure.** Doc floors are clean **on merit**; no waiver was
requested. The full machine-readable list is `.closure-ledger.json` (12 rows, nothing waived);
the long-form version is `FORGE-RESULTS.md` → Honest Gaps.

**Closed by the redo** — the three items that previously read "needs Dami's ruling":
`PLAN.md` is now 1353 lines (was 423), `PRD.md` 841 and `ARCHITECTURE.md` 6849 were written, and
`ROUTE-ARCHITECTURE.md` (515) + `USER-ONBOARDING.md` (367) exist. Writing them did **not** pre-empt
`design_forge`: they carry the route contract and the user-class analysis, and craft is explicitly
left to `design_forge`.

Still open, each with a named owner:

1. **`critique` owns five.** The per-doc adversarial review, the `.gate-verdict.json` anti-gaming
   verdict, the MD-7 semantic escalation, LAW#12 reviewer independence, and the `thesis-2`
   cross-model review. All five are model-judgment gates a shell script cannot answer, and all
   five require **fresh context** — forge grading its own 14,169-line suite is the self-approval
   the gates exist to catch. On LAW#12 and `thesis-2` specifically: `reviewer_model` is
   deliberately **empty** because no model attribution exists anywhere upstream, and inventing one
   would be fabrication.
2. ~~**`design_upstream_gap` — Dami's call.**~~ **RULED 16:36 WAT: accept Tier-B knowingly.** No
   upstream `design` phase runs; `design_forge` works off the frozen contract with no
   `ai/design-progress.md`. The gap is real and stays described — the console's visual direction is
   `design_forge`'s own, ungraded by an upstream design pass. UX is 16.7% of the grade; that risk is
   accepted on the record, with 172 minutes left.
3. **Cross-document consistency audit — NOT RUN. P0.** Five agents wrote in parallel off one frozen
   contract and each flagged contradictions independently; nobody merged the findings. Known: λ
   carries three different values; `CONTRACT.md`'s worked arithmetic disagrees with itself in four
   places; §2.5's published DOCKET Cypher does not execute against the engine as written.
   `CONTRACT.md` is FROZEN at v1.0, so the amendment is a master-chat v1.1 ruling. **Interim rule
   for the build: read ε and λ from `GET /health`, never copy either from a document.**
4. **`franchiseSkeleton` + `entryGateChecklist` absent** — judged on merit and genuinely missing
   (no `CLAIMS.md`, no recompute-verifier, no `SECURITY.md`, no honesty ledger). Left open rather
   than backfilled, because recording the fields without the artifacts is a vacuous pass.
5. **`HANDOFF.md` needs a commit SHA** — `package` owns it. Nothing is committed and the push is
   **HELD** by instruction, so there is no SHA to pin and writing one would be fabrication.
6. **Upstream:** `intel` claimed complete with a red gate — `config.json` asserts
   `roster_audit.discovered=true` but `research/roster-audit/strategy-density.md` does not exist.
7. **Harness defect, not a project defect.** `dispatch-gate.sh` sets `set -uo pipefail` and then
   tests large payloads with `printf '%s' "$var" | grep -q`. `grep -q` exits on the first match,
   `printf` takes SIGPIPE, and `pipefail` turns a **real match into a reported no-match** — racily.
   Twenty runs on byte-identical inputs gave 13 `pass_with_blockers` and 7 spurious fails. Eleven
   sites in `dispatch-gate.sh`, ~50 across `utils/`. Deliberately **not** patched: that worktree is
   shared, and editing the gate so your own gate passes is the thing the gate is for.

## Honesty note

Two failures are on the record here, not one.

The first "forge complete" report was made **before** forge's enforcement gates had been run. They
were run only after Dami asked whether they had been; the completion claim was unproven at the
moment it was made.

Then the gates were run — and a 272-function sweep was mistaken for the standard. It is not. Gates
are **measurement**; passing 258 of them says nothing about whether the documents were worth
reading. The suite was thin, and instead of writing the missing documents the response was to ask
for the floor to be **waived**. Both the sweep-as-standard and the waiver request were wrong, and
the redo exists because of them.

One mechanism is worth carrying forward, because it caused the earlier board to look greener than
it was: writing an **out-of-enum state string** (`status: "complete-with-open-gates"`,
`scope_mode: "dispatch-narrowed"`) silently neutered every gate that switched on those fields —
they returned "clean" without evaluating anything. Correcting the strings *raised* RED from 10 to
14 and exposed `design_upstream_gap`, which had been invisible until then. **A green board is worth
exactly as much as the enum behind it.**
