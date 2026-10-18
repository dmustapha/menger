import type { Components } from "@/lib/types";

/**
 * The three components are ALWAYS surfaced separately (CONTRACT.md §0 rule 1).
 * There is no component in this codebase that renders a single blended figure,
 * and `score` is only ever rendered through <OrdinalScore/>, which carries its
 * own ordinality note adjacent to the number.
 */

export function ComponentTriple({
  components,
  emphasis = "none",
  dense = false,
}: {
  components: Components;
  /** which of the three carries the argument on this screen */
  emphasis?: "none" | "independence";
  dense?: boolean;
}) {
  const { independence, reliability, recency, path_weight, age_hours } = components;
  const pad = dense ? "p-2.5" : "p-3";

  return (
    <div>
      <div className="grid grid-cols-3 overflow-hidden rounded-md border border-rule bg-ink-0">
        <Cell
          className={pad}
          label="independence"
          unit="vertex-disjoint chains"
          emphasised={emphasis === "independence"}
        >
          <span className="figure text-lead font-medium tabular-nums">{independence}</span>
        </Cell>
        <Cell className={`${pad} rule-l`} label="reliability" unit="exp(−path weight)">
          <span className="figure text-lead tabular-nums">{reliability.toFixed(4)}</span>
        </Cell>
        <Cell className={`${pad} rule-l`} label="recency" unit="decayed by age">
          <span className="figure text-lead tabular-nums">{recency.toFixed(4)}</span>
        </Cell>
      </div>
      <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-micro text-paper-faint">
        <div className="flex gap-1.5">
          <dt>path weight</dt>
          <dd className="figure text-paper-dim">{path_weight.toFixed(5)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>age</dt>
          <dd className="figure text-paper-dim">{age_hours.toFixed(1)} h</dd>
        </div>
        <p className="basis-full">
          Three separate readings. They are never combined into one displayed figure.
        </p>
      </dl>
    </div>
  );
}

function Cell({
  label,
  unit,
  children,
  className,
  emphasised = false,
}: {
  label: string;
  unit: string;
  children: React.ReactNode;
  className: string;
  emphasised?: boolean;
}) {
  return (
    <div className={`${className} ${emphasised ? "bg-accent-wash" : ""}`}>
      <p
        className={`text-micro uppercase tracking-[0.1em] ${
          emphasised ? "text-accent" : "text-paper-faint"
        }`}
      >
        {label}
      </p>
      <div className={emphasised ? "text-accent" : "text-paper"}>{children}</div>
      <p className="mt-0.5 text-micro leading-tight text-paper-faint">{unit}</p>
    </div>
  );
}

/**
 * `score` is ordinal. The honesty note sits against the number, on every route —
 * never once in a footer (ROUTE-ARCHITECTURE.md §4, honesty-placement).
 */
export function OrdinalScore({
  score,
  rank,
  size = "sm",
}: {
  score: number;
  rank?: number;
  size?: "sm" | "lg";
}) {
  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <div className="flex items-baseline gap-2">
        {rank !== undefined ? (
          <span className="figure text-micro text-paper-faint">#{rank}</span>
        ) : null}
        <span className={`figure tabular-nums ${size === "lg" ? "text-title" : "text-base"}`}>
          {score.toFixed(4)}
        </span>
      </div>
      <span className="text-micro text-paper-faint">rank figure · ordinal, not a probability</span>
    </div>
  );
}

/**
 * The margin is only legible against epsilon, and epsilon only ever arrives from
 * the server payload. There is no default, no placeholder and no literal — a missing
 * epsilon renders as a missing epsilon.
 *
 * Two different quantities reach this band and they do not mean the same thing:
 *
 *   `decision` — the signed margin the engine entered against an incoming claim
 *                (`/remember`, `/receipts/{id}`, `/review`). Its sign IS the verdict:
 *                above +ε admits, below −ε refuses, inside the band queues for review.
 *   `ranking`  — `top_margin`, the distance between the slot's rank #1 and rank #2
 *                (`/slots/{key}`, and the landing page's contested-slot panel). It is
 *                a gap, never signed, and nothing is being adjudicated by it.
 *
 * Reading a ranking gap in decision language is how this band claimed "the incoming
 * claim displaces the incumbent" on a slot whose last verdict was BLOCK: `top_margin`
 * is always positive, so decision prose made every contested slot read as an ALLOW.
 */
export function MarginBand({
  margin,
  epsilon,
  size = "sm",
  context = "decision",
}: {
  margin: number;
  epsilon: number | null | undefined;
  size?: "sm" | "lg";
  context?: "decision" | "ranking";
}) {
  if (epsilon === null || epsilon === undefined) {
    return (
      <p className="text-fine text-paper-dim">
        margin <span className="figure text-paper">{margin.toFixed(4)}</span> — the band is not
        shown because this response did not carry the server&rsquo;s ε.
      </p>
    );
  }

  const ranking = context === "ranking";
  const inBand = Math.abs(margin) <= epsilon;
  const scale = Math.max(Math.abs(margin), epsilon * 3);
  const pct = (v: number) => 50 + (v / (scale * 2)) * 100;
  const bandLeft = pct(-epsilon);
  const bandRight = pct(epsilon);
  const marker = Math.min(99, Math.max(1, pct(margin)));

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-micro uppercase tracking-[0.1em] text-paper-faint">
          {ranking ? "lead over #2" : "margin"}
        </span>
        <span className={`figure tabular-nums ${size === "lg" ? "text-lead" : "text-fine"}`}>
          {margin > 0 ? "+" : ""}
          {margin.toFixed(4)}
        </span>
      </div>

      <div className="relative mt-2 h-7 rounded-md border border-rule bg-ink-0">
        <div
          className="absolute inset-y-0 bg-undecided-wash"
          style={{ left: `${bandLeft}%`, right: `${100 - bandRight}%` }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-y-0 w-px bg-rule-strong"
          style={{ left: "50%" }}
          aria-hidden="true"
        />
        <div
          className={`absolute inset-y-1 w-0.5 rounded-full ${
            // A ranking gap never wears a verdict colour — there is no verdict in it.
            // Inside ε it is still worth flagging: the slot is too close to separate.
            inBand ? "bg-undecided" : ranking ? "bg-paper-dim" : margin > 0 ? "bg-allow" : "bg-block"
          }`}
          style={{ left: `${marker}%` }}
          aria-hidden="true"
        />
      </div>

      <p className="mt-1.5 text-micro text-paper-faint">
        ε = <span className="figure text-paper-dim">{epsilon}</span>, published by the engine at{" "}
        <span className="font-mono">GET /health</span>
        {ranking ? "." : " and echoed on this decision."}{" "}
        {ranking
          ? inBand
            ? "The top two claims are separated by less than ε, so nothing here is settled — a write against this slot would be queued for review rather than decided."
            : "This is the standing gap between the top two claims, not a verdict. No claim is being adjudicated on this screen; the gap only says how far the leader sits ahead of its nearest rival."
          : inBand
            ? "|margin| ≤ ε, so the write is queued for review rather than decided."
            : margin > 0
              ? "margin > +ε, so the incoming claim displaces the incumbent."
              : "margin < −ε, so the incoming claim is refused."}
      </p>
    </div>
  );
}
