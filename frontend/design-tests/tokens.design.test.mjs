/**
 * DESIGN_SYSTEM.md made executable: the token system is the only source of colour, radius,
 * shadow and type in this console, and these tests fail if a component re-derives any of them.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import {
  GLOBALS_CSS,
  LAYOUT_TSX,
  WORKDIR,
  contrast,
  hits,
  hueSat,
  read,
  readJson,
  sourceFiles,
} from "./_helpers.mjs";

const css = read(GLOBALS_CSS);
const brand = readJson(join(WORKDIR, "brand.json"));
const files = sourceFiles();

test("no hex literal appears outside globals.css", () => {
  // One sanctioned exception: the browser chrome colour in `viewport.themeColor`. Next's
  // metadata is serialised at build time and cannot read a CSS custom property, so the
  // value must be a literal. It is not exempted from agreement — the next test pins it.
  const SANCTIONED = /themeColor:/;
  const offenders = files.flatMap((f) =>
    hits(f.rel, f.text, /#[0-9a-fA-F]{3,8}\b/).filter((h) => !SANCTIONED.test(h)),
  );
  assert.deepEqual(offenders, [], `inline hex:\n${offenders.join("\n")}`);
});

test("the one literal hex in the source — viewport.themeColor — equals the ink-0 token", () => {
  const layout = read(LAYOUT_TSX);
  const declared = layout.match(/themeColor:\s*"(#[0-9a-fA-F]{6})"/)?.[1];
  assert.ok(declared, "layout.tsx must declare a themeColor so the browser chrome matches");
  const ink0 = css.match(/--color-ink-0:\s*(#[0-9a-fA-F]{6})/)[1];
  assert.equal(
    declared.toLowerCase(),
    ink0.toLowerCase(),
    "themeColor drifted from --color-ink-0; the browser chrome would not match the page",
  );
});

test("no ad-hoc border radius — three tokens are the whole scale, and no fourth is reserved", () => {
  const offenders = files.flatMap((f) => hits(f.rel, f.text, /rounded-\[/));
  assert.deepEqual(offenders, [], `ad-hoc radius:\n${offenders.join("\n")}`);
  for (const k of ["sm", "md", "lg"]) {
    assert.match(css, new RegExp(`--radius-${k}:`), `--radius-${k} missing from @theme`);
  }
  // The absence is asserted, not merely allowed. `--radius-xl` was declared and never used
  // by a single class; a rung nothing stands on makes the scale claim a range it does not
  // have, so re-adding it must fail here rather than pass as a harmless extra.
  assert.doesNotMatch(css, /--radius-xl:/, "--radius-xl was removed; do not reserve a rung");
});

test("the shadow philosophy is pure-glow: no drop shadows anywhere", () => {
  assert.equal(brand.shadowPhilosophy, "pure-glow");
  const offenders = files.flatMap((f) =>
    hits(f.rel, f.text, /\b(shadow-(sm|md|lg|xl|2xl|inner)|drop-shadow)\b/),
  );
  assert.deepEqual(offenders, [], `drop shadow:\n${offenders.join("\n")}`);
  // Every declared shadow must be a glow: zero offset in both axes.
  const shadows = [...css.matchAll(/--shadow-[a-z-]+:\s*([^;]+);/g)].map((m) => m[1].trim());
  for (const s of shadows) {
    if (s === "none") continue;
    assert.ok(/^0 0 /.test(s), `shadow token has an offset, which pure-glow forbids: ${s}`);
  }
});

test("brand.json matches the tokens the code actually uses", () => {
  assert.equal(brand.colorMode, "dark-only");
  assert.match(css, /color-scheme:\s*dark/);
  assert.equal(brand.brandColor, brand.accent, "there is one accent hue, declared once");

  const tokenOf = (name) => css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  assert.equal(brand.accent, tokenOf("accent"));

  // Semantic slots are named for MENGER's own verdict tokens, never for generic dashboard
  // severities. There is no "success" in a product whose proudest state is a refusal.
  assert.deepEqual(
    Object.keys(brand.semantic).sort(),
    ["allow", "block", "seeded", "undecided"],
    "brand.json semantic slots must be MENGER's state tokens, not success/warning/danger",
  );
  for (const [slot, hex] of Object.entries(brand.semantic)) {
    assert.equal(hex, tokenOf(slot), `semantic.${slot} drifted from --color-${slot}`);
  }
  for (const [slot, hex] of Object.entries(brand.washes)) {
    assert.equal(hex, tokenOf(slot), `washes.${slot} drifted from --color-${slot}`);
  }
  for (const [slot, hex] of Object.entries(brand.text)) {
    assert.equal(hex, tokenOf(slot), `text.${slot} drifted from --color-${slot}`);
  }
  brand.ink.forEach((hex, i) => assert.equal(hex, tokenOf(`ink-${i}`), `ink-${i} drifted`));

  // `note` is prose, not a rung — every numeric entry must resolve to a declared token.
  for (const [k, v] of Object.entries(brand.radii)) {
    if (typeof v !== "number") continue;
    assert.match(css, new RegExp(`--radius-${k}:\\s*${v}px`), `--radius-${k} drifted`);
  }
  for (const [k, v] of Object.entries(brand.type)) {
    assert.ok(css.includes(`--text-${k}: ${v}`), `type.${k} drifted from --text-${k}`);
  }
  assert.ok(css.includes(`--ease-menger: ${brand.motion.easing}`), "motion.easing drifted");
  for (const [k, v] of Object.entries(brand.motion.durations)) {
    assert.ok(css.includes(`--duration-${k}: ${v}`), `motion.durations.${k} drifted`);
  }
});

test("one accent hue only — allow, block and seeded are states, not a second brand colour", () => {
  for (const s of [brand.semantic.allow, brand.semantic.block, brand.semantic.seeded]) {
    assert.notEqual(s, brand.accent, "a verdict colour must not double as the brand hue");
  }
  // UNDECIDED stays in the accent family — abstention is the product's signature state, so
  // it wears the brand hue — but at lower chroma, so a verdict chip is never the same pixel
  // as a primary control. Same family, different voice: same hue angle, less saturation.
  const undecided = css.match(/--color-undecided:\s*(#[0-9a-fA-F]{6})/)[1];
  assert.notEqual(undecided, brand.accent, "UNDECIDED must not render identically to a button");
  const [uh, us] = hueSat(undecided);
  const [ah, as] = hueSat(brand.accent);
  assert.ok(Math.abs(uh - ah) < 0.04, "UNDECIDED left the accent family; it must stay amber");
  assert.ok(us < as - 0.15, "UNDECIDED must be visibly lower chroma than the accent");
});

test("every text and state colour clears WCAG AA on the lightest surface it sits on", () => {
  // The floor is ink-4, not ink-0: a value that passes only on the darkest surface fails
  // in every raised panel, which is where most of this console's text actually lives.
  const floor = brand.ink[brand.ink.length - 1];
  assert.equal(brand.contrast.standard, "WCAG AA 4.5:1");
  const subjects = { ...brand.text, accent: brand.accent, ...brand.semantic };
  for (const [name, hex] of Object.entries(subjects)) {
    const ratio = contrast(hex, floor);
    assert.ok(ratio >= 4.5, `${name} (${hex}) is ${ratio.toFixed(2)}:1 on ${floor} — below 4.5`);
    const published = brand.contrast.measured[name];
    assert.ok(published !== undefined, `${name} has no published contrast ratio in brand.json`);
    assert.ok(
      Math.abs(published - ratio) < 0.06,
      `brand.json publishes ${name} at ${published}:1 but it measures ${ratio.toFixed(2)}:1`,
    );
  }
});

test("every font declared in brand.json is actually loaded in layout.tsx", () => {
  const layout = read(LAYOUT_TSX);
  for (const family of Object.values(brand.fonts)) {
    const ident = family.replace(/\s+/g, "_");
    assert.match(layout, new RegExp(ident), `${family} is declared but never loaded`);
  }
  for (const slot of ["display", "body", "mono"]) {
    assert.match(css, new RegExp(`--font-${slot}:`), `--font-${slot} missing from @theme`);
  }
});

test("the status legend in brand.json matches the TONE map in status.tsx", () => {
  const status = read(join(WORKDIR, "frontend", "src", "components", "status.tsx"));
  const inCode = new Set([...status.matchAll(/^\s{2}([A-Z_]+):\s*\{/gm)].map((m) => m[1]));
  const inBrand = new Set(brand.statusLegend.map((r) => r.token));
  for (const token of inCode) {
    assert.ok(inBrand.has(token), `${token} is rendered but absent from brand.json statusLegend`);
  }
  for (const row of brand.statusLegend) {
    assert.ok(row.meaning.length > 10, `${row.token} has no meaning worth printing`);
    assert.match(row.color, /^#[0-9a-f]{6}$/);
  }
});

test("the invariant phrase is reused verbatim across the identity surfaces", () => {
  const phrase = brand.invariantPhrase;
  assert.ok(phrase.length > 12);
  const design = read(join(WORKDIR, "DESIGN_SYSTEM.md"));
  assert.ok(design.includes(phrase), "DESIGN_SYSTEM.md must quote the invariant phrase verbatim");
  assert.ok(read(LAYOUT_TSX).includes(phrase), "layout.tsx metadata must carry it verbatim");
  const landing = read(join(WORKDIR, "frontend", "src", "app", "page.tsx"));
  assert.ok(landing.includes(phrase), "the landing h1 must be the phrase verbatim");
});

test("the signature object is authored, not a generic treatment", () => {
  const { name, thesis, perSurface } = brand.signatureObject;
  assert.ok(name && name.length > 3);
  assert.ok(thesis.length >= 12, "the signature needs a stated reason for existing");
  assert.ok(/glass|gradient|clean|modern|minimal/i.test(name) === false, `${name} is a genre, not a signature`);
  assert.notEqual(perSurface.landing, perSurface.console, "console must not be the landing form");
});

test("the focus-visible recipe is declared once and never overridden", () => {
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-accent\)/);
  const overrides = files.flatMap((f) => hits(f.rel, f.text, /focus-visible:(ring|outline)-/));
  assert.deepEqual(overrides, [], `component-level focus ring:\n${overrides.join("\n")}`);
});

test("reduced motion is a global kill-switch, not a per-component opt-out", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /animation-duration:\s*0\.01ms\s*!important/);
});

test("no type hole survives in the console source", () => {
  const offenders = files.flatMap((f) =>
    hits(f.rel, f.text, /:\s*any\b|@ts-ignore|@ts-nocheck|console\.log/),
  );
  assert.deepEqual(offenders, [], `type hole or stray log:\n${offenders.join("\n")}`);
});
