/**
 * The Split Rule — the signature element.
 *
 * Every source in MENGER is split into an IN half and an OUT half joined by a single
 * unit-capacity edge. That one edge is the vertex capacity, and it is the whole reason an
 * echo chamber collapses to independence 1. The mark is that split: two bars, one hairline
 * cut, one stem. It is the mechanism drawn at logo scale.
 *
 * `scale` is not a size prop — it names which of the three authored compositions this is,
 * and the three are not substitutable (DESIGN_SYSTEM.md § Identity → The Split Rule):
 *
 *   "argument" — the landing. The mark makes the claim; the cut animates open once.
 *   "label"    — the console. The mark identifies an independence figure. It never argues,
 *                so it never animates: a docket page does not move when you point at it.
 *   "subject"  — the /graph route, where the split is drawn full-size from live payload
 *                data and is NOT this component at all. Declared here so the substitution
 *                is visibly forbidden rather than merely absent.
 */
export function SplitMark({
  className = "",
  scale = "label",
}: {
  className?: string;
  scale?: "argument" | "label";
}) {
  const cut = scale === "argument" ? "f-cut" : "";
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="4" width="8" height="6" rx="1.5" fill="currentColor" opacity="0.55" />
      <rect x="14" y="4" width="8" height="6" rx="1.5" fill="currentColor" opacity="0.55" />
      <rect x="2" y="14" width="20" height="6" rx="1.5" fill="currentColor" opacity="0.2" />
      <path
        d="M12 3.2v17.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        className={cut}
      />
      <path d="M6 10v4M18 10v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
