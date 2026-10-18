# ESCALATION — design (TASTE phase, advisory)

Raised by `peer_verify_adopts` (Phase 1.5 Stage 3) at 2026-10-18, working dir
`/Users/MAC/graph-hacks`. Classification: **LIP-SERVICE ADOPT**, 1 escalation, rc 0.
Advisory per amplifier §1 — this does **not** block the enforcement gate. It records a
durable **P1 `## Downstream Items` row, Owner `verify_preflight`**.

`amp_summary` reported writing this file and a PULSE row; neither existed on disk
afterwards, so both are authored here by hand. The escalation itself is recorded, not
dropped.

## Verdict of the verifier

23 adopted points re-checked against the tree. **18 landed**, **5 marked `landed: false`**.
Each of the five is triaged below with the action actually taken. None is left silent.

| Point | Verifier claim | Triage | Action |
| --- | --- | --- | --- |
| `strong-3` | `contract-honesty.design.test.mjs` "is not present in the staged tree" | **REFUTED** | The file is on disk: `frontend/design-tests/contract-honesty.design.test.mjs`, 8390 B, 12 tests, all passing. The verifier inspected a staged *subset* of changed files (`DESIGN_SYSTEM.md`, `brand.json`, `globals.css`, `status.tsx`) and read absence-from-the-diff as absence-from-the-tree. No change. Recompute: `ls -l frontend/design-tests/ && npm --prefix frontend run test:design` |
| `bold-4` | same file "does not exist", so its compiled checks are unconfirmable | **REFUTED**, same cause as `strong-3` | No change. The checks it names (geometry, focus ownership, legend/TONE parity, generated brand data, measured contrast) are the 12 tests in that file. |
| `strong-5` | `TONE` is not exported, so it is not exposed as the legend's validated source | **ACCEPTED** | `export const TONE` in `frontend/src/components/status.tsx:7`. The map was already the single source in practice; it is now one by declaration. |
| `diff-1` | accent amber still sits on focus ring, primary button, inline link, glow and witness chips, colliding with UNDECIDED | **ACCEPTED-AS-RESOLVED, differently** | Stage 2 resolved the collision by a chroma split (D-2): UNDECIDED moved to `#c9a46f`, same hue family, chroma −0.333, so a verdict chip is never the same pixel as a primary control. Removing accent from controls instead would cost the product its one hue. The thesis — abstention wears the brand hue because it is the state MENGER is proudest of — is deliberate and documented. **Dami's call** under the TASTE rule; the row stands so he can overrule it. |
| `diff-4` | `brand.json` still reads `"logoPath": null` | **CORRECT, AND ON SCHEDULE** | `logoPath` is owned by Phase 3 `logo_forge`, which has not run. It is null because no logo exists yet, not because a promise was skipped. It must be non-null before exit; if it is still null at exit, that is a real gap. |
| `diff-5` | `--radius-xl: 12px` still declared-but-unassigned; `ink-4` still documented as "reserved top layer" though it now carries a contrast-floor role | **ACCEPTED, both halves** | `--radius-xl` **deleted** from `globals.css`, `DESIGN_SYSTEM.md` (@theme + radius table) and `brand.json`; the tokens suite now asserts its *absence* (`assert.doesNotMatch(css, /--radius-xl:/)`) so re-adding a reserved rung fails rather than passes. `ink-4` re-documented in all three places as "top rung, **and** the contrast reference floor", with the reason: measuring against the lightest surface the ladder permits means raising a panel one rung later cannot break the 4.5:1 floor. |

## Also fixed in this step (not from the verifier)

The `docs-writer` subagent's one genuinely shipped defect:
`frontend/src/app/slots/[key]/graph/page.tsx:254` clipped a witness caption with
`max-w-40 truncate` and no recoverable full value — a silent clip, against
DESIGN_SYSTEM.md § Craft → Identifiers ("nothing is ever silently clipped"). Now carries
`title` for a pointer and an `sr-only` copy for a screen reader, with the visible span
`aria-hidden` so the caption is not announced twice.

## Post-fix state

`npx tsc --noEmit` → exit 0. `npm run test:design` → **26 tests, 26 pass, 0 fail**.

## The row

> **P1 · Owner `verify_preflight` · TASTE escalation, design_forge Phase 1.5**
> `peer_verify_adopts` flagged 1 LIP-SERVICE ADOPT across 23 points. Two of the five
> not-landed findings (`strong-3`, `bold-4`) are verifier false negatives from a
> staged-subset view and are refuted with evidence. Three were real and are fixed
> (`strong-5`, `diff-5` both halves). One (`diff-1`, accent-on-controls vs UNDECIDED) is a
> defended design decision resolved by chroma separation rather than by removing the
> accent — **aesthetics are Dami's call; he may overrule D-2.** One (`diff-4`, `logoPath:
> null`) is owned by Phase 3 `logo_forge` and must be non-null at exit.
