import type { ClaimStatus, DivergenceReason, Verdict } from "@/lib/types";

/**
 * Colour carries meaning, never decoration. Every token below is in
 * DESIGN_SYSTEM.md § Status Legend with the same mapping.
 */
export const TONE: Record<string, { fg: string; bg: string; ring: string; gloss: string }> = {
  ALLOW: { fg: "text-allow", bg: "bg-allow-wash", ring: "ring-allow/35", gloss: "the write was admitted" },
  ADMITTED: { fg: "text-allow", bg: "bg-allow-wash", ring: "ring-allow/35", gloss: "this claim holds the slot" },
  BLOCK: { fg: "text-block", bg: "bg-block-wash", ring: "ring-block/35", gloss: "the write was refused" },
  REFUSED: { fg: "text-block", bg: "bg-block-wash", ring: "ring-block/35", gloss: "refused, and recorded" },
  UNDECIDED: { fg: "text-undecided", bg: "bg-undecided-wash", ring: "ring-undecided/35", gloss: "inside the epsilon band — queued, not dropped" },
  QUEUED: { fg: "text-undecided", bg: "bg-undecided-wash", ring: "ring-undecided/35", gloss: "waiting in the review queue" },
  SEEDED: { fg: "text-seeded", bg: "bg-seeded-wash", ring: "ring-seeded/30", gloss: "from the synthetic corpus, never adjudicated" },
  OPEN: { fg: "text-undecided", bg: "bg-undecided-wash", ring: "ring-undecided/35", gloss: "still open" },
  RESOLVED: { fg: "text-seeded", bg: "bg-seeded-wash", ring: "ring-seeded/30", gloss: "closed" },
  PASS: { fg: "text-allow", bg: "bg-allow-wash", ring: "ring-allow/35", gloss: "assertion reproduced" },
  FAIL: { fg: "text-block", bg: "bg-block-wash", ring: "ring-block/35", gloss: "assertion did not reproduce" },
  // Replay divergence reasons. RECENCY_DECAY is deliberately NOT block red: recency is a
  // function of age, so it must move between the original read and the replay. A console
  // that flagged that as a failure would teach a reader to distrust a working engine.
  RECENCY_DECAY: { fg: "text-seeded", bg: "bg-seeded-wash", ring: "ring-seeded/30", gloss: "expected and benign — recency is a function of age" },
  GRAPH_MUTATED: { fg: "text-block", bg: "bg-block-wash", ring: "ring-block/35", gloss: "the graph changed under the receipt" },
  ENGINE_DIFF: { fg: "text-block", bg: "bg-block-wash", ring: "ring-block/35", gloss: "a different engine answered the replay" },
};

export function statusGloss(token: string): string {
  return TONE[token]?.gloss ?? "";
}

const CHIP = "inline-flex items-center rounded-sm font-mono font-medium uppercase ring-1 ring-inset";
const CHIP_DIMS = {
  sm: "px-2 py-0.5 text-micro tracking-[0.1em]",
  lg: "px-3 py-1 text-fine tracking-[0.12em]",
} as const;

/**
 * The chip recipe, exported so there is exactly one of it. Error codes are a different
 * vocabulary from status tokens — they do not belong in the TONE map — but they must not
 * be a second, slightly-different chip either, or the console would look like two products.
 */
export function Chip({
  tone,
  size = "sm",
  title,
  children,
}: {
  tone: "block" | "seeded" | "allow" | "undecided";
  size?: "sm" | "lg";
  title?: string;
  children: React.ReactNode;
}) {
  // Written out literally, never interpolated: Tailwind extracts classes by scanning the
  // source text, so a `text-${tone}` would compile to nothing at all.
  const t = {
    allow: "text-allow bg-allow-wash ring-allow/35",
    block: "text-block bg-block-wash ring-block/35",
    undecided: "text-undecided bg-undecided-wash ring-undecided/35",
    seeded: "text-seeded bg-seeded-wash ring-seeded/30",
  }[tone];
  return (
    <span className={`${CHIP} ${t} ${CHIP_DIMS[size]}`} title={title}>
      {children}
    </span>
  );
}

export function StatusTag({
  token,
  size = "sm",
}: {
  token: Verdict | ClaimStatus | DivergenceReason | "OPEN" | "RESOLVED" | "PASS" | "FAIL";
  size?: "sm" | "lg";
}) {
  const t = TONE[token] ?? TONE.SEEDED;
  return (
    <span
      className={`${CHIP} ${t.fg} ${t.bg} ${t.ring} ${CHIP_DIMS[size]}`}
      title={t.gloss}
    >
      {token}
    </span>
  );
}

/** The verdict at argument scale: used once per page, where the verdict IS the content. */
export function VerdictHeadline({ verdict }: { verdict: Verdict }) {
  const t = TONE[verdict];
  return (
    <div className="flex flex-col gap-1">
      <span className={`font-display text-headline leading-none tracking-tight ${t.fg}`}>
        {verdict}
      </span>
      <span className="text-fine text-paper-dim">{t.gloss}</span>
    </div>
  );
}
