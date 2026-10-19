# DESIGN_SYSTEM.md - MENGER console

Extracted from the built console at `frontend/src/`. Every value below is a value the code
actually uses. The canonical machine form is `brand.json`, and `frontend/design-tests/` is the
arbiter between the two: if this document and the CSS disagree, the suite fails.

Authority note: this document governs appearance. `CONTRACT.md` (FROZEN v1.0) governs what may
be displayed at all, and it wins on every conflict. Where a rule below says "never", it is
because the contract says never.

Status note: a section that specifies behaviour not yet shipped says so in its first line and is
marked **SPEC**. Everything not so marked describes what is built. The distinction matters - a
design system that cannot tell you which of its rules are already load-bearing is a mood board.

---

## Identity

**World statement.** A court docket, not a dashboard. Spare, typeset, evidentiary. The console
does not persuade - it files. Every screen reads like a page from a record that someone could
be asked to defend, which is why the type is set in a serif, the figures are monospaced and
tabular, and the surfaces are separated by hairlines rather than by shadow.

**Invariant phrase (EX-10).** Reused verbatim, never paraphrased:

> **Two citations are not two sources.**

It is the `<h1>` of the landing route, the opening clause of the `<meta name="description">` in
`layout.tsx`, and the line every other doc quotes when it has to say in one sentence what MENGER
is for.

**Accent hue - docket amber `#e8a33d`.** One hue, no second. It was chosen because it is the
colour of a flag on a file rather than the colour of a brand: it marks the thing currently
carrying the argument (the emphasised `independence` cell, the witness set, the ε band) and
nothing else. The abstention colour sits in the *same family* - `UNDECIDED` is `#c9a46f`, docket
amber held at lower chroma - because the state MENGER is proudest of is the one where it declines
to decide, and that state should wear the brand hue rather than a borrowed warning yellow. It is
no longer the identical pixel, and that is deliberate: a verdict chip and a primary button must
never render the same, or the reader learns that colour here means "press me" instead of "this is
the finding". Same family, different voice. Green and red are reserved: they are verdicts, never
decoration.

### Constraint → rule

The world statement is not a mood. It is a constraint, and the constraint generates the rules
below mechanically. None of them was chosen for taste; each is what the premise forces.

| Premise of a court docket | Rule it generates | Where it lives |
| --- | --- | --- |
| A filed page is flat - ink on paper has no depth | No drop shadows. Elevation is surface lightness plus a 1px hairline, `ink-0` → `ink-4` | § Craft → Elevation ladder |
| Figures in a record are read in columns and set against one another | Tabular monospaced figures (`.figure`) for every number a reader will compare | § Tokens → Do's #3 |
| A page does not react to being pointed at | Nothing scales, translates or lifts on hover; only colour and border change, at 140ms | § Craft → Hover recipe |
| A docket is read, cited, and re-read by someone who was not there | Every figure carries its unit and its provenance adjacent to it, never in a footer | § Primitives → Honesty primitives |
| A record is filed under an identifier, and the identifier is the handle | Identifiers are mono, complete, and copyable; nothing is silently clipped | § Craft → Identifiers |
| Colour on a legal page means the reader is being told something | Colour only for state, and only states in the Status Legend | § Status Legend |
| A record outlives the screen it was read on | The receipt prints, and the print carries the verdict | § Craft → Print |

Read the table the other way and it also holds: if a proposed treatment cannot be derived from
the left column, it does not belong in the console.

### The Split Rule - three scales, not substitutable

Every source renders as a split pair: an IN half and an OUT half, separated by a visible gap,
joined by a single drawn hairline. That hairline is the unit-capacity `FLOW` edge, and it is the
entire mechanism of the product drawn at glyph scale - it is why an echo of one document
collapses to `independence: 1`.

**Protected invariant.** At every scale the mark must retain its *unit-capacity-edge* meaning:
two halves, one gap, one joining line of capacity one. A rendering that closes the gap, doubles
the joining line, or draws the pair as a single body is not a smaller version of the mark - it
is a different claim, and a false one.

The three scales are named compositions, not sizes. `SplitMark` in `components/SplitMark.tsx`
takes `scale: "argument" | "label"`; the third scale is deliberately not that component.

| Scale | Where | Composition | Animates |
| --- | --- | --- | --- |
| **argument** | Landing hero, landing CTA | `<SplitMark scale="argument"/>` at hero size. The stem carries `.f-cut`, so the cut opens once on entry. The refused-vs-admitted pair beneath it is itself a split: two columns across a central gap | Once, `--duration-slow` |
| **label** | Masthead on every route, beside independence figures, on split-pair links, on the `si:`/`so:` chip pair | `<SplitMark scale="label"/>` at 12–16px. The mark identifies; it does not argue | Never |
| **subject** | `/slots/[key]/graph` only | **Not the component.** The split is drawn full size from the live payload: two node glyphs on 130-unit centres with a 76-unit gap between their edges, a 2.5px connector, a tick at its midpoint, and the `cap` label printed from `edge.cap` | Never |

**Forbidden substitutions**, each for a stated reason:

| Substitution | Why it is forbidden |
| --- | --- |
| `scale="argument"` in the console | A mark that animates in a list teaches the reader that the list is persuading them. The console labels |
| `scale="label"` as the landing hero | At label size the gap is a few pixels; the cut stops being readable as a cut, and the signature is only a signature while the gap is legible |
| `SplitMark` on `/graph` in place of the drawing | Substituting the glyph for the payload would be drawing a picture of evidence instead of the evidence. The `cap` on that page is read from the data; the glyph's is drawn by hand |
| The `/graph` drawing shrunk down for inline use | It is bound to live node ids and a 640-unit layout; inline it is illegible, and an illegible diagram is decoration |
| Any fourth scale | Three authored compositions are the complete set. A fourth is a change to this document, not a prop |

`SplitMark.tsx` carries this same statement as its doc comment. The two must agree; the comment
is the copy a developer reads first.

### The split grid

The signature generalises into one layout pattern, and the console uses it everywhere a pairing
is the argument. **Evidence IN vs OUT**, **claim vs witness**, and **refused vs admitted** are
the same grid at three contents.

```
grid gap-4 lg:grid-cols-2          ← the two columns
└─ central gap is the cut; it is never closed, never filled, never bridged by a card
```

Rules:

1. **Two columns, visible central separation.** The gap (`gap-4`, 16px) *is* the cut. Where the
   columns sit inside one framed region the gap carries a `rule-l` hairline on the right column;
   where they are separate panels the gap is empty and the panel borders do the work.
2. **Both halves get the same treatment.** The refused column is a full `Panel tone="block"`, not
   a dimmed afterthought. A pairing whose halves are not drawn with equal weight is an argument
   with its conclusion pre-drawn.
3. **Each half is labelled with its semantic role**, not its position. `cited two documents ·
   counted as one origin` / `cited two documents · counted as two origins` - the labels are the
   comparison; the columns only carry it.
4. **One documented single-column transformation.** Below `lg` the grid collapses to one column
   in source order (refused first, admitted second) and the labelled pairing survives the
   collapse - see § Craft → Responsive. Stacking without the pairing labels is the failure mode:
   two cards in a row read as a list, and a list makes no comparison.

### Design decisions, re-validated

This document was extracted from already-built code, which carries a specific risk: a choice that
was made quickly looks inevitable once it is written down in a table. These three are the
unsettled ones. Each is recorded with the alternative that was rejected and the criterion that
would reverse it - a decision with no reversal criterion is not a decision, it is a habit.

**D-1 · Dark-only.**
*Decided:* one palette, no `prefers-color-scheme` branch, `color-scheme: dark` on `html`.
*Rejected:* a paired light theme.
*Rationale:* a light branch needs a second set of semantic washes and a second measured contrast
audit, and the product has one screen context - a console read beside a terminal.
*What it costs:* users on high-ambient-light displays, users whose OS-level preference is a
stated accessibility need, and the printed page, which is paper and therefore white. The print
cost is paid explicitly in § Craft → Print rather than left as an unowned gap.
*Reverses if:* the console acquires a second context (embedded in a light host surface, or a
documentation site), or an accessibility review names forced-light as a blocker. The change is an
edit to this document and a second contrast table, never an override in a component.

**D-2 · Accent and abstention share the amber family.**
*Decided:* `--color-accent: #e8a33d`, `--color-undecided: #c9a46f` - one hue family, two chromas.
*Rejected:* (a) a fourth hue for `UNDECIDED`, which would break the one-accent rule; (b) keeping
them pixel-identical, which is what the codebase did until the chroma split.
*Rationale:* abstention is the product's thesis, so it should wear the brand hue; but a verdict
chip rendering identically to a primary button trains the reader that amber means affordance.
*Reverses if:* a reader study shows the two chromas read as the same colour on a mid-grey surface
- in which case the correct move is to widen the chroma gap, not to add a hue.

**D-3 · Information architecture: nine flat routes, no shell navigation.**
*Decided:* `/`, `/remember`, `/slots`, `/slots/[key]`, `/slots/[key]/graph`, `/receipts/[id]`,
`/receipts/[id]/replay`, `/review`, `/proof`. Each is a filing with its own id, reachable by URL,
and the only persistent chrome is the masthead.
*Rejected:* a dashboard shell with a sidebar and panelised sub-views.
*Rationale:* a docket is a set of addressable documents. A sidebar implies a workspace you are
inside; a URL implies a record you can cite. The replay route is a child of the receipt because
a replay is a thing done *to* a receipt, not a sibling of it.
*Reverses if:* the route count passes roughly a dozen, or routes start needing shared mutable
state across navigations - at which point the flat set stops being navigable by memory and the
cost of a shell is finally justified.

---

## Tokens

Dark-only. There is no light mode and no `prefers-color-scheme` branch - the console inherits a
single palette, which is why the `@theme` block below is the whole system. Paste it into a
Tailwind v4 `globals.css` directly after `@import "tailwindcss";` and the system is adopted.

### Ready-to-paste `@theme` block

```css
@import "tailwindcss";

@theme {
  /* surfaces - elevation ladder, lighter per z-level.
     ink-4 is the top rung and also the contrast reference floor: the suite measures every
     text and state colour against it rather than against ink-0, so the 4.5:1 floor holds
     on the lightest surface the ladder permits, not merely on the darkest one in use. */
  --color-ink-0: #08090c;
  --color-ink-1: #0e1014;
  --color-ink-2: #14171d;
  --color-ink-3: #1b1f27;
  --color-ink-4: #242a35;

  /* hairlines */
  --color-rule: #232833;
  --color-rule-strong: #343b49;

  /* text - every value clears 4.5:1 against ink-4, the lightest surface it sits on,
     so the floor holds on every surface rather than only on the darkest one.
     Measured ratios are published in DESIGN_SYSTEM.md § Craft → Contrast. */
  --color-paper: #e8eaf0;
  --color-paper-dim: #a3abba;
  --color-paper-faint: #8a919f;

  /* the one accent hue - docket amber */
  --color-accent: #e8a33d;
  --color-accent-dim: #8a6124;
  --color-accent-wash: #2a2014;

  /* semantic status - mapped to state tokens in DESIGN_SYSTEM.md § Status Legend */
  --color-allow: #49d49a;
  --color-allow-wash: #10231c;
  --color-block: #f35e63;
  --color-block-wash: #2a1417;
  /* UNDECIDED stays in the accent family - abstention is the state this product is
     proudest of, so it wears the brand hue - but at lower chroma, so a verdict chip is
     never the same pixel as a primary control. Same family, different voice. */
  --color-undecided: #c9a46f;
  --color-undecided-wash: #2a2014;
  --color-seeded: #8791a2;
  --color-seeded-wash: #191d25;

  /* type */
  --font-display: var(--font-instrument-serif), Georgia, serif;
  --font-body: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-jetbrains-mono), ui-monospace, "SF Mono", monospace;

  /* fluid scale */
  /* 0.6875rem (11px) is the floor, not the ceiling - a legend a reader cannot resolve
     is not restraint, it is a missing label. */
  --text-micro: clamp(0.6875rem, 0.66rem + 0.1vw, 0.75rem);
  --text-fine: clamp(0.75rem, 0.72rem + 0.15vw, 0.8125rem);
  --text-base: clamp(0.875rem, 0.84rem + 0.18vw, 0.9375rem);
  --text-lead: clamp(1rem, 0.95rem + 0.3vw, 1.125rem);
  --text-title: clamp(1.375rem, 1.1rem + 1.2vw, 2rem);
  --text-headline: clamp(1.875rem, 1.3rem + 2.6vw, 3.25rem);
  --text-figure: clamp(2.75rem, 1.8rem + 4.4vw, 5rem);

  /* spacing base unit 4px */
  --spacing: 0.25rem;

  /* radii - tight, docket-like. There is deliberately no xl rung: a 12px radius was
     declared and never assigned, and a token nothing uses is a scale that lies about
     its own range. Three rungs is the whole scale. */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;

  /* shadow philosophy: PURE-GLOW. No drop shadows anywhere.
     Elevation is surface lightness + a 1px hairline. The only "shadow" is an
     accent glow on the element currently carrying the argument. */
  --shadow-glow: 0 0 0 1px var(--color-accent-dim), 0 0 24px -8px var(--color-accent);
  --shadow-glow-allow: 0 0 0 1px color-mix(in srgb, var(--color-allow) 40%, transparent),
    0 0 24px -8px var(--color-allow);
  --shadow-glow-block: 0 0 0 1px color-mix(in srgb, var(--color-block) 40%, transparent),
    0 0 24px -8px var(--color-block);
  --shadow-none: none;

  /* motion */
  --ease-menger: cubic-bezier(0.2, 0, 0, 1);
  --duration-quick: 140ms;
  --duration-base: 220ms;
  --duration-slow: 520ms;
}
```

Light mode is intentionally absent - decision **D-1** above, with its cost and its reversal
criterion. Adding a light palette is a change to this document, not an override in a component.

### Scales at a glance

| Scale | Values |
| --- | --- |
| Surface (elevation) | `ink-0` page → `ink-1` panel → `ink-2` raised panel → `ink-3` hover → `ink-4` top |
| Text | `paper` primary, `paper-dim` secondary, `paper-faint` labels and units |
| Type sizes | `micro`, `fine`, `base`, `lead`, `title`, `headline`, `figure` |
| Spacing | 4px base; use Tailwind multiples only (`p-2`, `gap-2.5`, `py-3`, …) |
| Radii | `sm` 2px (chips, tags), `md` 4px (inputs, buttons, inner blocks), `lg` 8px (panels). Three rungs, no `xl` - a declared-but-unassigned 12px radius was removed rather than left reserved, because a token nothing uses is a scale that lies about its own range |
| Shadow | `shadow-glow`, `shadow-glow-allow`, `shadow-glow-block`, `shadow-none` - that is the complete set |

### Visualization tokens

The `/graph` drawing is hand-laid SVG with no charting library, so its ink has to be governed
here or it drifts. Every stroke and fill below is a token-backed Tailwind utility
(`stroke-rule`, `fill-accent`, …); an SVG attribute carrying a hex literal is the same defect as
a hex in a `className`.

| Element | Token | Geometry |
| --- | --- | --- |
| Axis / column divider rule | `stroke-rule` | 1px, full width of the frame, inset 12 units each side |
| Column header label | `fill-paper-faint` | 10px mono, centred over its column |
| Column header, emphasised (the `in ·\|· out` caption) | `fill-accent` | 10px mono, second line |
| Node outline, at rest | `stroke-rule-strong` on `fill-ink-2` | 1.5px |
| Node outline, in the highlighted witness set | `stroke-accent` on `fill-ink-2` | 1.5px |
| Node label | `fill-paper-dim`, or `fill-accent` when hot | 11px mono, centred |
| Node sub-label (the id beneath a claim box) | `fill-paper-faint` | 9px mono |
| **The split edge - the vertex capacity** | `stroke-rule-strong`, `stroke-accent` when hot | **2.5px** - the one weight that is thicker than everything else, because it is the one edge the page exists to show |
| `FLOW` edge | `stroke-rule-strong` | 1.25px |
| Derivation edge | `stroke-rule`, `stroke-accent` when hot | 1.25px, `stroke-dasharray="4 3"` |
| Arrowhead | `fill-rule-strong`, `fill-accent` when hot | 6×6 marker, `orient="auto-start-reverse"` |
| Tick at the midpoint of the split edge | `stroke-paper-faint`, `stroke-accent` when hot | 1px, 8 units tall |
| `cap` label on the split edge | `fill-paper-faint`, `fill-accent` when hot | 9px mono, 7 units above the edge |
| Saturation marker | `fill-accent` | r 3.5, 8 units right of the out-half |

Two rules on top of the table. **Weight carries rank, not colour**: a reader scanning the drawing
with no colour at all must still see that one edge is the thick one. And **9px and 10px SVG text
is an exception the fluid scale does not cover** - SVG `font-size` is in user units scaled by the
viewBox, so it is not comparable to `--text-micro`; at the rendered width these land above the
11px floor. Outside SVG, the floor holds.

### Layering

The console has one sticky element and one escape hatch. That is the whole z-order.

| Tier | Value | Who | Why |
| --- | --- | --- | --- |
| Content | auto (no `z-*`) | every panel, table, drawing | Document order is the stacking order. A panel that needs a `z-` is a panel that is overlapping something it should not be |
| Masthead | `z-40` | `Masthead.tsx`, `sticky top-0` | The only sticky element in the product. It is the one piece of chrome that must stay reachable while a long docket scrolls |
| Skip link | `z-50` | `layout.tsx`, on `:focus` only | It must out-rank the masthead or a keyboard user focuses it underneath the glass |

There is no tier for modals, toasts, drawers or popovers, because there are none - see the
Refusal matrix. A new tier is a change to this table, and the burden is on the new tier.

### Do's

1. **One accent hue.** `accent` / `accent-dim` / `accent-wash` are the same hue at three
   intensities. A "secondary colour" means mixing the accent into a surface, never a new hue.
2. **Elevation by lightness.** A surface that sits above another is a step up the `ink-*` ladder
   plus a 1px `rule` hairline. That is the whole elevation mechanism.
3. **Tabular figures for anything compared.** Any number a reader will set against another number
   gets `.figure` (mono + `tabular-nums`). Independence, reliability, recency, path weight,
   margin, ε, λ, durations, corpus counts.
4. **Semantic colour only for state.** If a colour is carrying meaning it must be in the Status
   Legend below. If it is not in that legend it is decoration, and decoration does not get colour.

### Don'ts

1. **No ad-hoc radii.** `rounded-[13px]` and friends are forbidden; the four tokens are the scale.
2. **No inline hex.** A hex literal in a `className`, a `style`, or an SVG `fill`/`stroke` is a
   defect. Use the token-backed utility or `currentColor`.
3. **No drop shadows.** `shadow-sm|md|lg|xl`, `drop-shadow-*` and any `box-shadow` with a vertical
   offset violate the declared philosophy. Elevation is lightness + hairline; glow is reserved for
   the element currently carrying the argument.
4. **No hardcoded engine constants.** `epsilon`, `lambda`, the boot-control expectations and the
   corpus counts are server values - epsilon, for instance, is read from `GET /health` and echoed
   on each decision. Any of those numbers written as a literal in the frontend source is a
   contract violation, not a style one - see `design-tests/contract-honesty.design.test.mjs`,
   which greps the source for them.

### Refusal matrix

The Don'ts above are the style-level list. This is the enforced list: things the system refuses
to do, each with the reason and the owner that makes the refusal stick. "Convention" means no
test guards it yet and a reviewer is the enforcement - those rows are the fragile ones and are
marked so honestly.

| Refused | Rationale | Enforced by |
| --- | --- | --- |
| Light mode / any `prefers-color-scheme` branch | One screen context; a second palette means a second washes set and a second measured contrast audit (D-1) | `tokens.design.test.mjs` - the `@theme` block is the whole palette |
| Drop shadows (`shadow-sm\|md\|lg\|xl`, `drop-shadow-*`, any `box-shadow` with a y-offset) | Ink on paper has no depth. Elevation is lightness plus a hairline | `tokens.design.test.mjs` |
| Hover lift, scale or translate | A docket page does not move when you point at it | Convention - review the hover recipe table in § Craft |
| A second easing curve | `--ease-menger` is the product's one gesture; two curves read as two products | `tokens.design.test.mjs` (motion block) |
| Per-component focus rings | A focus ring that differs per control is a focus ring a keyboard user has to re-learn on every screen | `@layer base` owns `:focus-visible`; a component override is a review blocker |
| Per-component reduced-motion opt-outs | An opt-out that each component must remember is an opt-out that one component will forget | The global `@media (prefers-reduced-motion: reduce)` kill-switch in `globals.css` |
| Infinite-loop animation of any kind | A loop is the only liveness signal a reduced-motion reader never receives | `brand.json` `motion.noInfiniteLoops: true`; `.f-pulse-rule` was deleted rather than deprecated |
| A hex literal in a `className`, `style`, or SVG `fill`/`stroke` | A colour outside the token set is a colour outside the Status Legend, and therefore a colour with no meaning | `tokens.design.test.mjs` |
| Engine constants written into the frontend | A number the console invented is a number the receipt cannot defend | `contract-honesty.design.test.mjs` |
| A blended single figure from the three components | Blending is the exact loss of information the product exists to prevent | `contract-honesty.design.test.mjs`; `ComponentTriple` is the only renderer |
| A margin band drawn without a server epsilon | A band with an assumed width is a drawing of a decision that was not made | `MarginBand` returns the refusal branch; `contract-honesty.design.test.mjs` |
| Cached verdicts, placeholder figures, skeleton numbers | A figure that is not from this response is a figure attributed to an engine that did not say it | `EngineUnavailable` / `HealthGate`; convention elsewhere |
| Toasts, modals, drawers, popovers | A finding that can be dismissed is a finding the reader can avoid. Failures are content - see `BootAssertionFailure` | Convention; the Layering table has no tier for them |
| Ad-hoc radii outside `sm`/`md`/`lg`/`xl` | Four is enough to express the hierarchy; a fifth is an accident | `tokens.design.test.mjs` |
| A fourth Split Rule scale | Three authored compositions are the complete set (§ Identity) | Convention; `SplitMark`'s `scale` prop is typed to two, the third is the `/graph` drawing |

---

## Status Legend

Colour carries meaning, never decoration. The source of record in code is the `TONE` map in
`frontend/src/components/status.tsx`; this table and that map must agree.

| Colour | Token | State token / code | Meaning to a reader |
| --- | --- | --- | --- |
| `#49d49a` allow | `ALLOW` | verdict from `/remember` | the write was admitted; `margin > +ε` |
| `#49d49a` allow | `ADMITTED` | `ClaimStatus` | this claim currently holds the slot |
| `#49d49a` allow | `PASS` | `boot_checks[*].pass === true` | the boot control reproduced |
| `#f35e63` block | `BLOCK` | verdict from `/remember` | the write was refused; `margin < −ε` |
| `#f35e63` block | `REFUSED` | `ClaimStatus` | refused, and recorded - the claim is kept, not dropped |
| `#f35e63` block | `FAIL` | `boot_checks[*].pass === false` | the control did not reproduce; the engine returns `503 BOOT_ASSERTION_FAILED` |
| `#c9a46f` undecided | `UNDECIDED` | verdict from `/remember` | inside the ε band; queued, not decided |
| `#c9a46f` undecided | `QUEUED` | `ClaimStatus` | waiting in the review queue |
| `#c9a46f` undecided | `OPEN` | `ReviewItem.status` | the review is still open (`/review` is read-only in v1.0) |
| `#8791a2` seeded | `SEEDED` | `ClaimStatus` | from the synthetic corpus; never adjudicated |
| `#8791a2` seeded | `RESOLVED` | `ReviewItem.status` | the review is closed |
| `#8791a2` seeded | `RECENCY_DECAY` | `Divergence.reason` | expected and benign - a replay must move recency; neutral tone, never red |
| `#f35e63` block | `GRAPH_MUTATED` / `ENGINE_DIFF` | `Divergence.reason` | a real divergence: the graph changed under the receipt, or a different engine answered |

Each `StatusTag` carries its gloss in `title`, so the mapping is legible without this document.

---

## Craft

**Radius scale (CF-1).** `sm` 2px · `md` 4px · `lg` 8px · `xl` 12px. Chips, status tags and
witness pills use `sm`; inputs, buttons and inner blocks use `md`; panels use `lg`. No value
outside the scale appears in the codebase.

**Elevation ladder (CF-2).** Dark mode, so surfaces get *lighter* as they rise:

```
ink-0  page background
ink-1  Panel tone="base"      + border-rule
ink-2  Panel tone="raised"    + border-rule-strong
ink-3  hover state of a raised surface
ink-4  top rung, and the contrast reference floor
```

`ink-4` carries a role even on routes that never paint it: it is the surface every contrast
ratio is measured against. Measuring against the *lightest* surface the ladder permits rather
than the darkest one currently in use means the 4.5:1 floor cannot be broken later by raising
a panel one rung. It is a reference, not a reservation.

Nested panels step *down* to `ink-0` for inset content (code blocks, component cells, witness
strips), so an inset reads as cut into the panel rather than floating on it.

**Shadow philosophy - PURE-GLOW.** Exactly one, and it is not elevation. There are no drop
shadows in the console. A glow is applied only to the element currently carrying the argument:

```css
--shadow-glow:       0 0 0 1px var(--color-accent-dim), 0 0 24px -8px var(--color-accent);
--shadow-glow-allow: 0 0 0 1px color-mix(in srgb, var(--color-allow) 40%, transparent),
                     0 0 24px -8px var(--color-allow);
--shadow-glow-block: 0 0 0 1px color-mix(in srgb, var(--color-block) 40%, transparent),
                     0 0 24px -8px var(--color-block);
```

Consumed through `Panel tone="accent" | "allow" | "block"`. A glow on a neutral panel is a defect:
the glow means "this is the thing being argued about".

**Glass recipe.** Used once, on the masthead only:

```
sticky top-0 z-40  bg-ink-0/85  backdrop-blur-md  rule-b
```

`backdrop-blur-md` (12px) with an 85% ink-0 fill and a 1px bottom hairline as the inset
highlight. Glass is a navigation affordance, not a decorative treatment - no other surface uses
it. A blurred panel over content would be a dashboard gesture, and this is a docket.

**Hover recipe.** What changes on hover, in order of preference:

| Element | Change |
| --- | --- |
| Raised surface / ghost button | `bg-ink-2 → bg-ink-3`, `border-rule-strong → border-accent-dim` |
| Primary button | `bg-accent → bg-accent/88` |
| Quiet button | `transparent → bg-ink-2`, `text-paper-dim → text-paper` |
| Input | `border-rule-strong → border-accent-dim` |
| Inline link | `text-accent → text-paper`, underline already present at rest |

All at `duration-(--duration-quick)` (140ms). Nothing scales, nothing translates, nothing lifts -
a docket page does not move when you point at it.

**Focus-visible recipe.** Identical everywhere, declared once in `@layer base` and never
overridden:

```css
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

A component that sets its own focus ring is a defect.

### Keyboard and focus order

The order the Tab key walks a page is the order the page argues in. Where they differ, the DOM
order is wrong, not the reading order.

| Page region | Order |
| --- | --- |
| Every route | Skip link (`z-50`, visible on focus only) → masthead links → `<main id>` content in source order |
| `/slots/[key]/graph` | Back link → witness-set selector buttons → the SVG → the `<details>` text rendering |
| `/receipts/[id]` | Receipt id and its copy button → engine pin → candidates → statements → replay link |

**The `/graph` SVG specifically.** The drawing is one `role="img"` node with an `aria-label` and
a `<title>`, so it is a single stop in the tab order and is announced as one object, not as a
hundred unlabelled shapes. It is not individually navigable, and that is the correct call: a
keyboard reader stepping through node glyphs one at a time learns nothing a list would not tell
them better. The payload is therefore rendered a second time, in full, as the `<details>`
section beneath it - same nodes, same edges, same witness sets, same `cap` values, in text.

Two consequences this doc holds the drawing to:

1. **Nothing may exist only in the drawing.** If a value is visible in the SVG it is in the text
   rendering too. The drawing is an aid; the list is the record.
2. **Selection state is announced.** The witness-set buttons carry `aria-pressed`, and the
   sentence that reports how many origins are highlighted sits in an `aria-live="polite"` region,
   so the count changes reach a reader who cannot see the accent outlines change.

### Contrast, measured

The standard is **WCAG AA, 4.5:1**, and the surface every ratio is measured against is **`ink-4`
`#242a35`** - the lightest surface any text sits on. That is the honest floor. A value measured
against `ink-0` would pass comfortably and then fail in every raised panel, which is the common
way a dark palette ships an inaccessible contrast claim.

| Foreground | Token | Ratio vs `ink-4` | AA 4.5:1 |
| --- | --- | --- | --- |
| `#e8eaf0` | `paper` | 11.98 | pass |
| `#a3abba` | `paper-dim` | 6.24 | pass |
| `#8a919f` | `paper-faint` | 4.55 | pass |
| `#e8a33d` | `accent` | 6.68 | pass |
| `#49d49a` | `allow` | 7.66 | pass |
| `#f35e63` | `block` | 4.52 | pass |
| `#c9a46f` | `undecided` | 6.19 | pass |
| `#8791a2` | `seeded` | 4.53 | pass |

These ratios are **computed by the test suite from the token values**, not asserted by hand and
not copied from a contrast checker once. `paper-faint`, `block` and `seeded` clear the bar by
small margins - they were moved to the values above precisely because their predecessors did
not - so any future change to those three must be re-measured, not eyeballed. A hand-maintained
contrast table is a table that is wrong within a month.

Two rules the table implies. **Colour is never the only carrier of a verdict**: every
`StatusTag` prints its token as text and carries its gloss in `title`, so a reader who cannot
separate the green from the red still reads `ALLOW` and `BLOCK`. And **washes are backgrounds,
never text** - `*-wash` values are near-black and exist to tint a surface behind a foreground
that was measured above.

### Data tables

The console is mostly tables: boot controls, reliability paths, replay statements, slot lists,
candidate rankings. They are the docket's natural form, so they get a specification rather than
a default.

| Property | Rule |
| --- | --- |
| Row rhythm | `py-2` per cell (8px top and bottom) against `text-fine` - a ~36px row. Dense enough to compare down a column, open enough that the hairlines read as separators rather than as a grid |
| Separators | `rule-b` on every cell, header and body alike. No vertical rules, no zebra striping, no row borders at full `rule-strong` - a table is hairlines or it is a cage |
| Header cells | `text-micro uppercase tracking-[0.1em] text-paper-faint font-medium`, `scope="col"` always |
| Row headers | `scope="row"` where the first cell names the row (a control name, a statement label) |
| Numeric columns | `text-right` and `.figure`. Right-aligned tabular figures are the only way a column of numbers can be compared by eye |
| Label columns | `text-left`, body font. Never right-aligned to "match" the numbers |
| Mixed cells | The identifier in mono at `text-micro text-paper-dim`, its human gloss after it in `text-paper-faint` - see the boot-control table in `states.tsx` |
| Missing value | An em dash `-`, never a zero and never blank. A zero is a measurement; a dash is an absence |
| Sticky header | **None.** The masthead is the only sticky element in the product (§ Tokens → Layering). A table long enough that its header scrolls away is a table that should be split or paginated; freezing a header is a dashboard fix for a docket problem |
| Overflow | `min-w-[34rem]` on the table inside an `overflow-x-auto` wrapper inside a `Panel`. The frame scrolls; the page never does. A column is never squeezed to fit, because a squeezed figure column breaks tabular alignment and the comparison with it |
| Overflow disclosure | Where a table scrolls, a `text-micro text-paper-faint` line above it says so - the same treatment the `/graph` drawing uses ("wider than a phone screen: it scrolls sideways inside its own frame, the page does not") |

**Table states**, all three of them, all of them content and none of them a toast:

| State | Treatment |
| --- | --- |
| Loading | `<Skeleton rows label="…"/>` - `role="status" aria-live="polite" aria-busy="true"`, with a label that names what is being fetched. Never a spinner, never a table of grey bars pretending to be rows with numbers in them |
| Empty | `<Note title="…">` naming *why* it is empty in the title, in the product's own terms - "No claim in this slot has an independence witness yet", not "No data". An empty state that does not distinguish *nothing yet* from *nothing ever* is a shrug |
| Error | `<ErrorView err/>` - the single dispatcher. A failed table is replaced by the failure, in place, at the same width. The table header is not left standing above an error |
| Partially absent | Render the table and dash the missing cells. A payload that carried four of five fields is still a record |

### Identifiers

Claim ids, source ids, slot keys, receipt hashes and engine image pins are long, mono, and the
thing a reader will actually cite. They get the most explicit rule in this document: **nothing
is ever silently clipped.** A truncated identifier that cannot be recovered from the page is a
citation the reader cannot make, which defeats the point of filing it.

Two treatments, chosen by whether the identifier is the subject or a reference:

| Context | Treatment |
| --- | --- |
| The identifier **is** the subject - a receipt `<h1>`, the engine pin, a `KeyValue` row | Full value, `font-mono`, `break-all`, wrapping across as many lines as it needs. Paired with a copy button where the value is the handle to the record (`CopyButton` on `/receipts/[id]`) |
| The identifier is a **reference** - a table cell, a chip, an inline link, an SVG caption | Middle truncation, `head…tail`, keeping enough of both ends that two ids differing only at the tail stay distinguishable **(SPEC - the console currently wraps rather than truncates in these contexts)** |

**Middle truncation contract (SPEC).** Where truncation is used:

1. Truncate in the **middle**, never the end. Hashes and content-addressed ids carry their
   distinguishing bits at the tail; an end-truncated hash is a prefix shared by everything.
2. The element carries `title={fullValue}` **and** a visually-hidden span with the full value, so
   it reaches a pointer user, a screen reader, and find-in-page. `title` alone reaches none of
   the last two.
3. The ellipsis is a real `…` character inside the text node, so a copy of the visible text is
   visibly incomplete rather than quietly wrong.
4. A copy affordance sits beside it where the value is actionable, labelled
   `aria-label="Copy {what} to the clipboard"` and rendered only when `navigator.clipboard`
   exists - an inert copy button is worse than none.

**The one documented exception.** On `/graph`, claim captions inside the SVG are cut at 16
characters because the box is 126 units wide. This is permitted only because the full caption,
the full id and the full payload appear in the text rendering directly beneath the drawing, in
the same section. Truncation without that second full rendering on the same page is a defect.

### Responsive

The breakpoints are Tailwind's defaults; the console uses `sm`, `lg` and nothing exotic. What is
specified here is what must survive each collapse.

| Pattern | ≥ breakpoint | Below it |
| --- | --- | --- |
| The split grid (refused vs admitted, claim vs witness, evidence IN/OUT) | `lg:grid-cols-2`, gap as the cut | **One column, labelled pairing intact.** Refused first, admitted second, each keeping its full role caption. The two columns do not become two cards - they become two labelled halves stacked, with the second introduced as the counterpart of the first |
| Landing stat strip | `sm:grid-cols-5` | `grid-cols-2`, with `rule-t` carrying the rhythm |
| Landing three-up | `sm:grid-cols-3` | One column |
| Engine metadata block | `sm:grid-cols-3` | One column; each `dt`/`dd` pair stays together |
| `/graph` legend | `sm:grid-cols-2` | One column |
| Tables | Full width | Horizontal scroll inside the framed region, with the disclosure line |
| Panel padding | `p-5 sm:p-6` / `p-4 sm:p-5` | The smaller step; padding is the only thing that shrinks |

**The refused-vs-admitted collapse, specifically.** It is the landing page's whole argument and
the one collapse that can silently destroy meaning. Two cards stacked with no connective text
read as a list of two claims; the comparison - *same citation count, different provenance,
different number* - is carried by the pair, not by either card. So below `lg`:

- Each column keeps its full role caption (`cited two documents · counted as one origin`).
- The pairing is stated in text between or above the two, not implied by adjacency.
- Neither half is collapsed into a `<details>`. A comparison with one side folded away is not a
  comparison.

**The Split Rule's responsive variants.** The *argument* scale shrinks with the hero type and
keeps its proportions - it is one SVG with a `viewBox`, so the gap scales with it and the
invariant holds by construction. The *label* scale does not change at all: 12–16px is already
its floor, and a label that shrinks on a phone is a label that disappears there. The *subject*
drawing does not reflow; it holds its 640-unit layout and scrolls (`min-w-[34rem]`), because a
graph that rewraps its columns on a narrow screen is a different graph.

### Print / export: the receipt of record

**SPEC - the print stylesheet is specified here and not yet implemented.**

MENGER's artifact is a DOCKET, and a docket that exists only inside a React route is not an
artifact. `/receipts/[id]` must print. Nothing else needs to: the other routes are views onto
the graph, and a printed view of a live graph is stale the moment it leaves the printer. The
receipt is the opposite - it is already a frozen record, so paper loses it nothing.

**Page layout.**

| Property | Value |
| --- | --- |
| Page | A4 and US Letter, portrait, `@page { margin: 18mm 16mm; }` |
| Masthead, skip link, nav, buttons, the replay CTA | `display: none` - chrome is not evidence |
| Panels | Border collapses to a 0.5pt hairline, `box-shadow: none`, background white. Glow is a screen device; on paper it is a grey smudge |
| Page breaks | `break-inside: avoid` on every `Panel` and every table row; `break-after: avoid` on every heading. A verdict separated from its components by a page break is a verdict without its reasons |
| Links | Internal links lose their underline; the receipt's own canonical URL is printed once in the colophon rather than after every link |
| Running foot | The receipt id, repeated on every page, so a loose sheet is still attributable |

**Typography fallback.** Instrument Serif, Inter and JetBrains Mono are web fonts and may not
reach the print pipeline. The fallback stack is already declared in `@theme`
(`Georgia, serif` / `system-ui, sans-serif` / `"SF Mono", monospace`) and print must survive it,
which means **no layout may depend on a specific font's metrics**. Figures stay in a monospaced
stack with `font-variant-numeric: tabular-nums`, because column alignment is the one thing a
fallback can break and the one thing a numeric comparison cannot do without. Body type sets at
10pt, figures at 10pt, labels at 8pt.

**What must survive the export.** The list is not negotiable - an export missing any of these is
not a receipt:

| Must print | Why |
| --- | --- |
| The verdict token (`ALLOW` / `BLOCK` / `UNDECIDED`) as text | It is the finding |
| The three components - independence, reliability, recency - **unblended, in three cells** | Blended, the page asserts something the engine never computed |
| `path_weight` and `age_hours` beneath them | The components are not interpretable without them |
| The margin and the epsilon it was judged against, with epsilon labelled as published by the engine at `GET /health` | A margin without its band is a number without a threshold |
| The ordinal note against the score | A printed decimal with no note will be read as a probability |
| Evidence identifiers - every source id and claim id, in full | They are the citations |
| The receipt id, in full, in the heading and the running foot | It is the file number |
| The engine image pin, as a colophon at the foot of the record | It names the exact build that answered, so the reader can re-run it |
| The decision timestamp, ISO 8601 with its `Z` | A record with no date is not filed |
| The read-path statement | It is why the receipt could not have mutated the graph it cites |

**Colour on paper.** Dark-only is a *screen* decision (D-1); paper is white, and the semantic
washes are near-black and would print as four indistinguishable dark blocks. So on paper the
verdict is carried by **weight, rule and label - never a dark fill**:

- The verdict token prints in bold at display size, in black.
- A 2pt rule sits beneath it, the full width of the verdict block. The rule is the carrier.
- The token's own word (`ALLOW`, `BLOCK`, `UNDECIDED`) plus its gloss prints beneath the rule, so
  the state is in language and not only in treatment.
- Status chips lose their wash and ring and print as `UPPERCASE MONO` with a hairline box.
- `ALLOW` / `BLOCK` / `UNDECIDED` are distinguished by the rule weight and the word, never by a
  grey percentage - a reader cannot measure 40% grey against 55% grey, and a photocopy destroys
  the difference entirely.
- The margin band prints as a hairline scale with a tick, labelled at both ends, not as a filled
  bar. A filled bar is ink the reader has to interpret; a labelled scale is a reading.

**Where the signature stays visible.** `SplitMark` is in the masthead on every route, in the
landing hero CTA, and beside every "see where the split happens" link. On
`/slots/[key]/graph` the split is the page. A route where the split is never visible has lost the
product's argument.

---

## Primitives

All in `frontend/src/components/`. Nothing in a route may re-declare these class sets inline.

| Primitive | File | Class set / contract |
| --- | --- | --- |
| `Panel` | `primitives.tsx` | `rounded-lg border` + tone (`base` `ink-1/rule`, `raised` `ink-2/rule-strong`, `accent` `ink-2/accent-dim/shadow-glow`, `allow`, `block`) |
| `Button` / `ButtonLink` | `primitives.tsx` | `inline-flex gap-2 rounded-md px-3.5 py-2 text-fine font-medium` + tone `primary` / `ghost` / `quiet`, `disabled:opacity-45` |
| `Field` | `primitives.tsx` | label + control + (`hint` xor `error`); `error` renders `role="alert"` |
| `INPUT_CLASS` | `primitives.tsx` | `rounded-md border-rule-strong bg-ink-0 px-3 py-2 font-mono text-fine` + hover/focus recipe |
| `Eyebrow` | `primitives.tsx` | `text-micro uppercase tracking-[0.14em] text-paper-faint` |
| `SectionTitle` | `primitives.tsx` | `font-display text-title` + optional `sub` at `text-fine text-paper-dim` |
| `KeyValue` | `primitives.tsx` | baseline-aligned dt/dd row, dd in `.figure` |
| `Code` | `primitives.tsx` | `overflow-x-auto rounded-md border-rule bg-ink-0 p-3 font-mono text-micro` - scrolls inside itself, never widens the page |
| `StatusTag` | `status.tsx` | `rounded-sm font-mono uppercase ring-1 ring-inset` + the Status Legend tone |
| `VerdictHeadline` | `status.tsx` | the verdict at `text-headline`, used once per page where the verdict *is* the content |
| `ComponentTriple` | `scores.tsx` | the three components as three cells, never blended; `path_weight` and `age_hours` beneath |
| `OrdinalScore` | `scores.tsx` | `score.toFixed(4)` with the ordinality note adjacent, not in a footer |
| `MarginBand` | `scores.tsx` | the ε band, the zero rule, the margin marker; **renders a refusal to draw when `epsilon` is null** |
| `ClaimCard` | `ClaimCard.tsx` | object + ids + `StatusTag` + `ComponentTriple` + `OrdinalScore` + source chips + optional `WitnessStrip` |
| `WitnessStrip` | `WitnessStrip.tsx` | the witness set as accent chips, cross-checked against `independence` |
| `Skeleton` / `Note` | `states.tsx` | `role="status" aria-live="polite" aria-busy` / named empty state |
| `BootAssertionFailure` | `states.tsx` | the failing control as a table of control/expected/actual/PASS-FAIL - content, never a toast |
| `EngineUnavailable` | `states.tsx` | names `API_BASE` and the engine pin; no cached verdict, no placeholder figure |
| `ErrorView` | `states.tsx` | the single dispatcher every route routes failures through |
| `HealthGate` | `HealthGate.tsx` | wraps a page body; enforces the global 503 rule once rather than per screen |

### Honesty primitives - a contract, not a style

`MarginBand`, `OrdinalScore` and `ComponentTriple` are the three primitives in
`components/scores.tsx` that are **not presentational**. They are where CONTRACT.md is enforced
in the render tree. Every other entry in the table above is a convenience; these three are the
reason the console is allowed to show a number at all.

**The rule.** Any route that displays a margin, a score, or a component figure renders it
*through* these components. Not with them as a reference, not with a one-off copy for a special
layout - through them. A figure that reaches the DOM by any other path has bypassed the
contract, and **that is a contract violation, not a style deviation**: the fix is to delete the
bypass, not to restyle it.

| Primitive | Non-bypassable requirement | What bypassing it would assert |
| --- | --- | --- |
| `MarginBand` | **Refuses to draw** when the server did not send epsilon. It carries no default, no placeholder and no fallback width; `epsilon === null \|\| undefined` renders the margin as a figure plus a sentence saying the band is not shown because this response did not carry the server's ε. When epsilon *is* present the band is drawn and labelled as published by the engine at `GET /health` and echoed on this decision | That a threshold existed when none was reported. A band drawn to an assumed width is a picture of a decision the engine did not make |
| `OrdinalScore` | Prints `score.toFixed(4)` with **`rank figure · ordinal, not a probability`** adjacent to the number - in the same element group, never in a page footer, never once per route | That a four-decimal figure between 0 and 1 is a confidence. It is a ranking position; the note is the difference between a ranking and a claim about likelihood |
| `ComponentTriple` | Renders independence, reliability and recency as **three separate cells** in one bordered grid, each with its own unit label (`vertex-disjoint chains`, `exp(−path weight)`, `decayed by age`), plus `path_weight` and `age_hours` beneath and the line *Three separate readings. They are never combined into one displayed figure.* | That the three are commensurable and can be averaged. They are three different measurements of three different things; a single blended figure is information destroyed in the renderer |

**Enforcement.** `frontend/design-tests/contract-honesty.design.test.mjs`. It greps the frontend
source for engine constants written as literals, for a blended component figure, and for a
margin drawn without a server epsilon. The test is the owner of this section - if a rule here is
not in that file, it is a wish.

**Corollaries that follow from the three.**

1. **No skeleton numbers.** A loading state shows `Skeleton`, which has no digits in it. A grey
   bar shaped like a figure is a figure.
2. **No cached verdict.** `EngineUnavailable` names `API_BASE` and the engine pin and shows
   nothing in place of the answer - explicitly, in words: there is no cached verdict and no
   placeholder figure in this console.
3. **A failed boot control empties the console.** `HealthGate` enforces the 503 rule once, at
   the page body, rather than per screen; `BootAssertionFailure` renders the failing control as
   a table of control / expected / actual / result. It is content, never a toast, because a
   dismissible notice that the engine's own controls did not reproduce is a notice the reader
   will dismiss.
4. **Absence is rendered as absence.** `nl` is `null` on a `FLOW` edge because that edge carries
   capacity rather than weight, and the drawing says so in those words. `trust` is `null` on the
   super-source because it is a flow construct, not a document. Neither prints as a dash with no
   explanation, and neither prints as zero.

---

## Motion

**Vocabulary** (`@keyframes`, consumed via the `.f-*` utilities):

| Class | Keyframe | Use |
| --- | --- | --- |
| `.f-rise` | `opacity 0→1`, `translateY(6px)→0` | page and section entry; `--duration-base` |
| `.f-cut` | `opacity 0→1`, `clip-path: inset(50% 0 50% 0) → inset(0 0 0 0)` | **the signature** - a hairline opening between the two halves of a split pair; `--duration-slow` |

That is the complete vocabulary. Two keyframes, and `brand.json` publishes them as two.

**Why `f-cut` is a clip reveal and not a transform.** It used to be `scaleY(0) → 1`. Scaling a
1px rule renders it at a fractional height, and the browser resolves a fractional device pixel
by blurring it - so the mark arrived soft and sharpened at the end. That is exactly backwards.
The crispness of the cut *is* the claim: the gap between the two halves is a clean separation or
it is nothing. A `clip-path: inset()` reveal moves the visible edge of a rule that is drawn at
full height the whole way, so it is 1px and crisp at every frame of the animation.

**Default transition.** `transition-all duration-(--duration-quick)` for interactive state;
`--duration-base` (220ms) for entry; `--duration-slow` (520ms) only for `f-cut`, because the cut
is the one moment the interface is explaining something rather than responding.

**Easing.** `--ease-menger: cubic-bezier(0.2, 0, 0, 1)` - fast out, long settle. One curve.

**Stagger.** Page-load stagger is 80ms per item, applied with an inline `animationDelay` on the
nth child (see `Skeleton`). Never more than ~5 steps; a sixth item enters with the fifth.

**Reduced motion.** A global kill-switch, not a per-component opt-out:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Nothing in this console conveys information by motion alone, so the kill-switch loses no meaning.
That property is not luck - it is maintained by the section below.

### Liveness without motion

There is deliberately **no infinite-loop utility**. `.f-pulse-rule` existed, pulsed a hairline
at 2.4s infinite to signal a live value, and was deleted rather than deprecated. The reason is
structural: the reduced-motion kill-switch sets `animation-iteration-count: 1`, so a looping
animation runs once and stops. A loop is therefore the one liveness signal a reduced-motion
reader is *guaranteed* never to receive - and a signal that reaches only some readers is not a
signal, it is a decoration that some readers happen to see.

**The replacement.** Liveness is always carried by something that is still there when motion is
off. One of three, never a pulse:

| Carrier | Form | Where it applies |
| --- | --- | --- |
| A **label** | Words that state the condition - `aria-live="polite"` where the words change, so the change is announced rather than merely visible | The witness-set count on `/graph`; the band sentence under `MarginBand`; `Skeleton`'s own `role="status"` label naming what is being fetched |
| A **timestamp** | The time the value was read, as a tabular figure, ISO with its `Z`. A reader can judge staleness from a date; they cannot judge it from a blink | Receipt `decided_at`; any value fetched once and held |
| A **filled state** | A static difference in the rendered mark - an accent outline, a filled saturation dot, an `aria-pressed` button - present at rest, not only during a transition | The highlighted witness set on `/graph`; selected claim buttons |

The single remaining looping animation in the codebase is `animate-pulse` on `Skeleton`'s grey
bars, and it is load-bearing for nothing: the skeleton carries `role="status"`,
`aria-live="polite"`, `aria-busy="true"` and a text label naming what is loading. Under reduced
motion the bars stop and the label still says it. That is the test every liveness treatment has
to pass - **turn motion off and read the screen; if you cannot tell what is live, the signal was
never there.**
