import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const FRONTEND = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const WORKDIR = resolve(FRONTEND, "..");
export const SRC = join(FRONTEND, "src");

export const GLOBALS_CSS = join(SRC, "app", "globals.css");
export const LAYOUT_TSX = join(SRC, "app", "layout.tsx");

/** Every .ts/.tsx file under src/, as { path, rel, text }. */
export function sourceFiles() {
  const out = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(entry)) out.push({ path: p, rel: relative(FRONTEND, p), text: read(p) });
    }
  })(SRC);
  return out;
}

export function read(p) {
  return readFileSync(p, "utf8");
}

export function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

/** Lines of `text` matching `re`, as "rel:lineno  line" strings. */
export function hits(rel, text, re) {
  const found = [];
  text.split("\n").forEach((line, i) => {
    const m = line.match(re);
    if (m) found.push(`${rel}:${i + 1}  ${line.trim()}`);
  });
  return found;
}

function rgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

/** WCAG 2.1 relative luminance. */
function luminance(hex) {
  const [r, g, b] = rgb(hex).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio between two opaque colours. Measured, never asserted. */
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** [hue, saturation] in HSL terms, for proving two colours share a family. */
export function hueSat(hex) {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : max === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
  return [h, s];
}

/** Strip // line comments and /* block comments so prose cannot trip a code rule. */
export function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}
