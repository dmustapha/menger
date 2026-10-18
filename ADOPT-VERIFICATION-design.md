# Adopt Verification — design (claude)

| Point | Landed | Evidence |
|---|---|---|
| read-2 | ✓ | DESIGN_SYSTEM.md:43-59 adds a '### Constraint → rule' table mapping docket premises to no-shadow/hairline elevation, tabular figures, static |
| read-3 | ✓ | brand.json now uses semantic keys allow/block/undecided/seeded (15-20), adds washes (21-27), type (33-41), spacing (42), motion (45-51), con |
| read-4 | ✓ | DESIGN_SYSTEM.md:68-71 states a 'Protected invariant' — two halves, one gap, one unit-capacity joining line — and the scale table (76-80) bi |
| read-5 | ✓ | DESIGN_SYSTEM.md:122-160 '### Design decisions, re-validated' records D-1 dark-only (rejected light theme, costs incl. the printed page, rev |
| strong-1 | ✓ | DESIGN_SYSTEM.md:73-90 declares the three scales 'named compositions, not sizes', types SplitMark to argument|label only with /graph drawn f |
| strong-2 | ✓ | DESIGN_SYSTEM.md:701-723 '### Honesty primitives — a contract, not a style' names MarginBand, OrdinalScore, ComponentTriple as non-presentat |
| strong-3 | ✗ LIP-SERVICE | change_artifact contract-honesty.design.test.mjs is not present in the staged tree (only DESIGN_SYSTEM.md, brand.json, frontend/src/app/glob |
| strong-4 | ✓ | DESIGN_SYSTEM.md:338-361 '### Refusal matrix' lists light mode, drop shadows, hover lift, a second easing, per-component focus rings, per-co |
| strong-5 | ✗ LIP-SERVICE | frontend/src/components/status.tsx still declares `const TONE` at line 7 with no `export` (only statusGloss/Chip/StatusTag/VerdictHeadline a |
| diff-1 | ✗ LIP-SERVICE | DESIGN_SYSTEM.md still assigns accent amber to the exact surfaces the change promised to clear: :focus-visible outline `2px solid var(--colo |
| diff-2 | ✓ | globals.css:38-42 defines `--color-undecided: #c9a46f` with an explicit comment that it is the accent family held at lower chroma so a verdi |
| diff-3 | ✓ | globals.css:24-26 sets `--color-paper-faint: #8a919f` with the comment that every text value clears 4.5:1 against ink-4 (a stricter floor th |
| diff-4 | ✗ LIP-SERVICE | brand.json semantic names and coverage are corrected and $comment (2) claims test-validation against the CSS, but the second half of the pro |
| diff-5 | ✗ LIP-SERVICE | The animation half landed — globals.css:95-102 replaces scaleY with `clip-path: inset(50% 0 50% 0) → inset(0 0 0 0)`, documented in DESIGN_S |
| risk-1 | ✓ | DESIGN_SYSTEM.md:608-670 '### Print / export: the receipt of record' (marked SPEC) specifies @page margins, chrome removal, hairline panels, |
| risk-2 | ✓ | DESIGN_SYSTEM.md:515-542 '### Data tables' specifies ~36px row rhythm, hairline-only separators, header/row scope, right-aligned tabular num |
| risk-3 | ✓ | DESIGN_SYSTEM.md:544-574 '### Identifiers' states 'nothing is ever silently clipped', splits subject vs reference treatments, and the middle |
| risk-4 | ✓ | Resolved by removal rather than pairing, but the substantive requirement is reflected: .f-pulse-rule is gone (globals.css:140-142 documents  |
| risk-5 | ✓ | All five omissions are now specified: responsive Split Rule variants (601-606), the refused-vs-admitted mobile collapse with pairing labels  |
| bold-2 | ✓ | DESIGN_SYSTEM.md:612-615 states MENGER's artifact is a DOCKET and 'a docket that exists only inside a React route is not an artifact', desig |
| bold-4 | ✗ LIP-SERVICE | change_artifact contract-honesty.design.test.mjs does not exist in the staged tree. DESIGN_SYSTEM.md:720-723 names it as the owner and even  |
| bold-5 | ✓ | DESIGN_SYSTEM.md:639-650 specifies the per-verdict filing contents — verdict token as text, unblended three components with path_weight/age_ |
