/**
 * CONTRACT.md v1.0 §4 made executable.
 *
 * These are not style tests. Every assertion here corresponds to a "must not" the frozen
 * contract places on the console, and a failure is a contract violation rather than a
 * preference. They run against the source tree, so they hold whether or not the engine is up.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { SRC, hits, read, sourceFiles, stripComments } from "./_helpers.mjs";
import { join } from "node:path";

const files = sourceFiles();
const routeAndComponentFiles = files.filter(
  (f) => !f.rel.endsWith("src/lib/types.ts") && !f.rel.includes("design-tests"),
);

test("epsilon, lambda and the boot control values are never written in the source", () => {
  // DS-8 / R-4: these are SERVER constants published by GET /health. A literal here means
  // the console would keep displaying a number after the engine changed it.
  //
  // Every candidate value of lambda is banned, not just the current one. CL-F-009 RULING 1
  // re-pinned lambda from 0.0077 to 0.0080 mid-run; a console that had hardcoded the old
  // value would have gone silently stale. Banning the whole candidate set is what makes
  // that re-pin a non-event here. (0.01 is deliberately absent: it is also a plausible
  // opacity or duration, so banning it would be a false positive rather than a guard.)
  const forbidden = /(?<![\d.])(0\.05|0\.0077|0\.008|0\.00800|0\.0080|0\.21072)(?![\d])/;
  const offenders = routeAndComponentFiles.flatMap((f) =>
    hits(f.rel, stripComments(f.text), forbidden),
  );
  assert.deepEqual(offenders, [], `hardcoded engine constant:\n${offenders.join("\n")}`);
});

test("the three components are never blended into one displayed figure", () => {
  // The only arithmetic that could blend them would multiply or average the three fields.
  const blend =
    /independence\s*[*+]\s*(reliability|recency)|reliability\s*[*+]\s*recency|\(\s*independence\s*\+\s*reliability/;
  const offenders = routeAndComponentFiles.flatMap((f) => hits(f.rel, stripComments(f.text), blend));
  assert.deepEqual(offenders, [], `components blended:\n${offenders.join("\n")}`);
});

test("score is never rendered as a percentage, a confidence or a probability", () => {
  const asPercent = /score[^\n]{0,40}(\*\s*100|toFixed\([^)]*\)\s*\+\s*["'`]%|%\s*<\/)/i;
  const asLabel = /(confidence|probability|certainty|likelihood)/i;
  const offenders = routeAndComponentFiles.flatMap((f) => {
    const stripped = stripComments(f.text);
    return [
      ...hits(f.rel, stripped, asPercent),
      // "not a probability" is the sanctioned honesty note — allow the negated form only.
      ...hits(f.rel, stripped, asLabel).filter((h) => !/not a (probability|confidence)/i.test(h)),
    ];
  });
  assert.deepEqual(offenders, [], `score rendered as a likelihood:\n${offenders.join("\n")}`);
});

test("the banned vocabulary never appears in copy", () => {
  // CONTRACT.md §4: "procedure", "detects conflicts" and "truth" are forbidden words.
  // "truth" is checked as a whole word so "truthy" in a library name would not false-positive.
  const banned = /\bprocedures?\b|detects? conflicts?|\btruths?\b/i;
  const offenders = files.flatMap((f) => hits(f.rel, f.text, banned));
  assert.deepEqual(offenders, [], `banned vocabulary:\n${offenders.join("\n")}`);
});

test("no endpoint outside the eight in CONTRACT.md §2 is called", () => {
  const api = read(join(SRC, "lib", "api.ts"));
  // Call sites only: a path must open with a quote or backtick. The generic declaration
  // `request<T>(path: string, ...)` has no literal and is correctly not a call site.
  const paths = [...api.matchAll(/request<[^>]+>\(\s*[`"']([^`"'$)]*)/g)].map((m) => m[1]);
  assert.ok(paths.length >= 8, `expected the eight contract endpoints, found ${paths.length}`);
  const allowed = [
    "/health",
    "/slots",
    "/slots/",
    "/remember",
    "/receipts/",
    "/review",
  ];
  for (const p of paths) {
    assert.ok(
      allowed.some((a) => p.startsWith(a)),
      `api.ts calls an endpoint outside the contract: ${p}`,
    );
  }
  // And nothing else in the tree may fetch directly.
  const directFetch = files
    .filter((f) => f.rel !== "src/lib/api.ts")
    .flatMap((f) => hits(f.rel, stripComments(f.text), /\bfetch\s*\(/));
  assert.deepEqual(directFetch, [], `fetch outside api.ts:\n${directFetch.join("\n")}`);
});

test("MarginBand refuses to draw a band when the server did not send epsilon", () => {
  const scores = read(join(SRC, "components", "scores.tsx"));
  assert.match(
    scores,
    /epsilon\s*===\s*null\s*\|\|\s*epsilon\s*===\s*undefined/,
    "MarginBand must branch on a missing epsilon rather than defaulting it",
  );
  assert.doesNotMatch(
    scores,
    /epsilon\s*(=|\?\?)\s*0?\.\d/,
    "MarginBand must not carry a default epsilon",
  );
});

test("score_is_ordinal is typed as the literal true, so a payload that drops it fails to compile", () => {
  const types = read(join(SRC, "lib", "types.ts"));
  assert.match(types, /score_is_ordinal:\s*true;/, "score_is_ordinal must be the literal type");
});

test("RECENCY_DECAY never resolves to block red — a benign divergence must not read as a failure", () => {
  // The replay page tone-splits on Divergence.reason. If RECENCY_DECAY ever picked up the
  // block tone, every honest replay would look like a broken one: recency is a function of
  // age, so it MUST move, and a console that cries foul over it teaches the wrong lesson.
  const status = read(join(SRC, "components", "status.tsx"));
  const entry = status.match(/^ {2}RECENCY_DECAY:\s*\{([^}]*)\}/ms);
  assert.ok(entry, "RECENCY_DECAY must have an explicit entry in the TONE map");
  assert.doesNotMatch(entry[1], /block/, "RECENCY_DECAY is tone-split as neutral, never as block");
  for (const real of ["GRAPH_MUTATED", "ENGINE_DIFF"]) {
    const row = status.match(new RegExp(`^ {2}${real}:\\s*\\{([^}]*)\\}`, "ms"));
    assert.ok(row, `${real} must have an explicit entry in the TONE map`);
    assert.match(row[1], /block/, `${real} is a real divergence and must carry the block tone`);
  }
});

test("the TONE map is the single source of the status-chip recipe", () => {
  // This polices CHIPS, not prose. Colouring a sentence with a semantic token is reading
  // the legend correctly; re-authoring the wash + ring + uppercase-mono recipe is forking
  // the legend, which is how a state ends up the wrong colour on exactly one route.
  const chipRecipe = /bg-(allow|block|undecided|seeded)-wash[^"`]*ring-(allow|block|undecided|seeded)/;
  const offenders = files
    .filter((f) => !f.rel.endsWith("src/components/status.tsx"))
    .flatMap((f) => hits(f.rel, stripComments(f.text), chipRecipe));
  assert.deepEqual(offenders, [], `status chip re-derived outside the TONE map:\n${offenders.join("\n")}`);
});

test("every token in brand.json's status legend exists in the TONE map, and vice versa", () => {
  // tokens.design.test.mjs checks code -> brand. This checks brand -> code, which is the
  // direction that catches a documented state nobody ever built a chip for.
  const status = read(join(SRC, "components", "status.tsx"));
  const inCode = new Set([...status.matchAll(/^ {2}([A-Z_]+):\s*\{/gm)].map((m) => m[1]));
  const brand = JSON.parse(read(join(SRC, "..", "..", "brand.json")));
  for (const row of brand.statusLegend) {
    assert.ok(inCode.has(row.token), `${row.token} is in the legend but has no TONE entry`);
  }
  assert.equal(inCode.size, new Set(brand.statusLegend.map((r) => r.token)).size);
});

test("no component owns its own focus ring, radius or shadow — those belong to the token layer", () => {
  const offenders = files.flatMap((f) => [
    ...hits(f.rel, stripComments(f.text), /focus-visible:(ring|outline|border)-/),
    ...hits(f.rel, stripComments(f.text), /rounded-\[|shadow-\[/),
    ...hits(f.rel, stripComments(f.text), /\bdrop-shadow\b/),
  ]);
  assert.deepEqual(offenders, [], `component-owned craft token:\n${offenders.join("\n")}`);
});

test("no cached verdict can be rendered under a live header", () => {
  // useAsync has exactly three states; a failed reload clears data rather than keeping it.
  const useAsync = read(join(SRC, "lib", "useAsync.ts"));
  assert.match(
    useAsync,
    /phase:\s*"error";\s*data:\s*null/,
    "the error state must carry data: null",
  );
});
