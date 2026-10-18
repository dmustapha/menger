"use client";

import Link from "next/link";
import { use } from "react";
import { api } from "@/lib/api";
import type { Components, Divergence, DivergenceReason, ReplayResult } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { HealthGate } from "@/components/HealthGate";
import { ErrorView, Skeleton } from "@/components/states";
import { Button, Code, Eyebrow, Panel } from "@/components/primitives";
import { StatusTag } from "@/components/status";

/** Deterministic, locale-free stamp — the same string on the server and in the browser. */
function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().replace("T", " ").slice(0, 16)}Z`;
}

type ComponentKey = keyof Components;

const COMPONENT_ORDER: ComponentKey[] = [
  "independence",
  "reliability",
  "recency",
  "path_weight",
  "age_hours",
];

/** Integers stay integers; floats get four places. Nothing is coerced into a default. */
function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(4);
}

function signed(v: number): string {
  const body = fmt(Math.abs(v));
  if (v > 0) return `+${body}`;
  if (v < 0) return `−${body}`;
  return `±${body}`;
}

const REASON_GLOSS: Record<DivergenceReason, string> = {
  RECENCY_DECAY:
    "recency is a function of age. This receipt is older than it was when it was written, so recency had to move. A replay that returned an identical recency would be the suspicious result.",
  GRAPH_MUTATED:
    "the graph has changed under the receipt — the provenance it cites is not the provenance that is in the graph now.",
  ENGINE_DIFF:
    "a different engine answered — the build that produced the receipt is not the build that answered this replay.",
};

function isBenign(d: Divergence): boolean {
  return d.reason === "RECENCY_DECAY";
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function ReplayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const receiptId = decodeURIComponent(id);

  return (
    <div className="py-8 sm:py-12">
      <HealthGate loadingLabel="Asking the engine whether it is willing to serve this replay…">
        <ReplayBody receiptId={receiptId} />
      </HealthGate>
    </div>
  );
}

function ReplayBody({ receiptId }: { receiptId: string }) {
  const { phase, data, error, reload } = useAsync(() => api.replay(receiptId), [receiptId]);
  const receiptHref = `/receipts/${encodeURIComponent(receiptId)}`;

  if (phase === "loading") {
    return (
      <>
        <Eyebrow>replay</Eyebrow>
        <h1 className="mb-6 font-mono text-title leading-tight break-all">{receiptId}</h1>
        <Skeleton rows={3} label="Re-executing the recorded statements against the live graph…" />
      </>
    );
  }

  if (phase === "error") {
    return (
      <ErrorView
        err={error}
        onRetry={reload}
        backHref="/slots"
        backLabel="back to the slots"
      />
    );
  }

  return <ReplayReport r={data} receiptHref={receiptHref} onRerun={reload} />;
}

/* ── Report ───────────────────────────────────────────────────────────────── */

function ReplayReport({
  r,
  receiptHref,
  onRerun,
}: {
  r: ReplayResult;
  receiptHref: string;
  onRerun: () => void;
}) {
  const realDivergence = r.divergence.filter((d) => !isBenign(d));
  const benignDivergence = r.divergence.filter(isBenign);
  const onlyBenign = !r.matches_original && realDivergence.length === 0;

  return (
    <article className="space-y-10">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header>
        <Link
          href={receiptHref}
          className="text-micro text-paper-faint underline-offset-4 transition-colors duration-(--duration-quick) hover:text-accent hover:underline"
        >
          ← the receipt
        </Link>

        <div className="mt-3">
          <Eyebrow>replay</Eyebrow>
        </div>
        <h1 className="mt-1 font-mono text-title leading-tight break-all">{r.receipt_id}</h1>

        <p className="mt-3 max-w-2xl text-fine text-paper-dim">
          Arriving here re-executes the receipt&rsquo;s recorded statements against the live graph.
          Nothing was cached and nothing was replayed from a snapshot — the run below happened when
          this page loaded, at{" "}
          <span className="figure text-paper">{stamp(r.replayed_at)}</span>.
        </p>

        <div className="mt-5">
          <Headline
            matches={r.matches_original}
            onlyBenign={onlyBenign}
            realCount={realDivergence.length}
            benignCount={benignDivergence.length}
          />
        </div>

        <div className="mt-4">
          <Button tone="ghost" onClick={onRerun}>
            Run it again
          </Button>
        </div>
      </header>

      {/* ── Statements ───────────────────────────────────────────────────── */}
      <section aria-labelledby="stmts-h">
        <h2 id="stmts-h" className="mb-1 font-display text-lead leading-snug">
          Statement by statement
        </h2>
        <p className="mb-3 max-w-2xl text-fine text-paper-dim">
          Each recorded statement, re-run in order. Open a row to read what it returned then
          against what it returned now, as the engine handed both back.
        </p>

        {r.statements.length === 0 ? (
          <Panel tone="base" className="p-4">
            <p className="text-fine text-paper-dim">
              The replay carried no statements. There is nothing recorded to re-execute.
            </p>
          </Panel>
        ) : (
          <ul className="space-y-2">
            {r.statements.map((s, i) => (
              <Panel as="li" key={`${s.label}-${i}`} tone="base" className="p-3 sm:p-4">
                <details className="group">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-sm">
                    <span className="min-w-0 font-mono text-fine break-all text-paper">
                      {s.label}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="figure text-micro text-paper-faint">{s.duration_ms} ms</span>
                      <StatusTag token={s.match ? "PASS" : "FAIL"} />
                      <span
                        aria-hidden="true"
                        className="text-micro text-paper-faint group-open:hidden"
                      >
                        then / now ▾
                      </span>
                    </span>
                  </summary>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="min-w-0">
                      <p className="mb-1 text-micro uppercase tracking-[0.1em] text-paper-faint">
                        original
                      </p>
                      <Code className="whitespace-pre">
                        {JSON.stringify(s.original, null, 2)}
                      </Code>
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 text-micro uppercase tracking-[0.1em] text-paper-faint">
                        replayed
                      </p>
                      <Code className="whitespace-pre">
                        {JSON.stringify(s.replayed, null, 2)}
                      </Code>
                    </div>
                  </div>
                </details>
              </Panel>
            ))}
          </ul>
        )}
      </section>

      {/* ── Components then / now ────────────────────────────────────────── */}
      <section aria-labelledby="comps-h">
        <h2 id="comps-h" className="mb-1 font-display text-lead leading-snug">
          Components, then and now
        </h2>
        <p className="mb-3 max-w-2xl text-fine text-paper-dim">
          One block per claim. Only the keys the engine actually carried are listed; a key absent
          from one side is shown as absent, never filled in with a number nobody reported.
        </p>
        <ComponentsDelta then={r.components_then} now={r.components_now} />
      </section>

      {/* ── Divergence ───────────────────────────────────────────────────── */}
      <section aria-labelledby="div-h">
        <h2 id="div-h" className="mb-1 font-display text-lead leading-snug">
          Where the numbers moved
        </h2>
        <p className="mb-3 max-w-2xl text-fine text-paper-dim">
          Not every moving number is a problem. The engine separates the one quantity that is
          supposed to move from the two kinds that are not.
        </p>

        {r.divergence.length === 0 ? (
          <Panel tone="base" className="p-4">
            <p className="text-fine text-paper-dim">
              Nothing moved. Every component the engine compared came back identical, including
              recency.
            </p>
          </Panel>
        ) : (
          <ul className="space-y-3">
            {r.divergence.map((d, i) => (
              <li key={`${d.claim_id}-${d.field}-${i}`}>
                <DivergenceRow d={d} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="rule-t pt-5">
        <p className="text-fine text-paper-dim">
          Replayed at <span className="figure text-paper">{stamp(r.replayed_at)}</span>.
        </p>
        <Link
          href={receiptHref}
          className="mt-2 inline-block text-fine text-accent underline underline-offset-4 transition-colors duration-(--duration-quick) hover:text-paper"
        >
          Back to the receipt {r.receipt_id} →
        </Link>
      </footer>
    </article>
  );
}

/* ── Headline ─────────────────────────────────────────────────────────────── */

function Headline({
  matches,
  onlyBenign,
  realCount,
  benignCount,
}: {
  matches: boolean;
  onlyBenign: boolean;
  realCount: number;
  benignCount: number;
}) {
  if (matches) {
    return (
      <Panel tone="allow" className="p-5 sm:p-6">
        <p className="text-micro font-medium uppercase tracking-[0.14em] text-allow">reproduced</p>
        <h2 className="mt-2 font-display text-title leading-tight text-allow">
          The receipt reproduced.
        </h2>
        <p className="mt-2 max-w-2xl text-fine text-paper-dim">
          The recorded statements ran again against the live graph and returned the same quantities
          the receipt reported.
          {benignCount > 0
            ? " Recency sits outside that comparison by design, and its drift is listed below."
            : ""}
        </p>
      </Panel>
    );
  }

  if (onlyBenign) {
    return (
      <Panel tone="base" className="p-5 sm:p-6">
        <p className="text-micro font-medium uppercase tracking-[0.14em] text-paper-faint">
          stable where stability is the claim
        </p>
        <h2 className="mt-2 font-display text-title leading-tight">
          The receipt reproduced in every respect that is supposed to be stable.
        </h2>
        <p className="mt-2 max-w-2xl text-fine text-paper-dim">
          Recency is the one moving part. It is computed from the claim&rsquo;s age, the receipt is
          older now than when it was written, so recency has to have changed — and it is the only
          thing that did. Independence and reliability came back exactly as recorded.
        </p>
      </Panel>
    );
  }

  return (
    <Panel tone="block" className="p-5 sm:p-6">
      <p className="text-micro font-medium uppercase tracking-[0.14em] text-block">diverged</p>
      <h2 className="mt-2 font-display text-title leading-tight text-block">
        The receipt did not reproduce.
      </h2>
      <p className="mt-2 max-w-2xl text-fine text-paper-dim">
        Readings that came back different for a reason that is not the clock:{" "}
        <span className="figure text-paper">{realCount}</span>. Each one is named below with what
        changed and why that matters.
      </p>
    </Panel>
  );
}

/* ── Components delta ─────────────────────────────────────────────────────── */

function ComponentsDelta({
  then,
  now,
}: {
  then: Record<string, Partial<Components>>;
  now: Record<string, Partial<Components>>;
}) {
  const claimIds = [
    ...Object.keys(then),
    ...Object.keys(now).filter((id) => !(id in then)),
  ];

  if (claimIds.length === 0) {
    return (
      <Panel tone="base" className="p-4">
        <p className="text-fine text-paper-dim">
          The replay carried no components on either side, so there is nothing to compare.
        </p>
      </Panel>
    );
  }

  return (
    <ul className="space-y-4">
      {claimIds.map((claimId) => {
        const t = then[claimId] ?? {};
        const n = now[claimId] ?? {};
        const keys = COMPONENT_ORDER.filter((k) => k in t || k in n);

        return (
          <Panel as="li" key={claimId} tone="base" className="p-4">
            <p className="font-mono text-fine text-paper">{claimId}</p>

            {keys.length === 0 ? (
              <p className="mt-2 text-fine text-paper-dim">
                No component key is present on either side for this claim.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse text-fine">
                  <caption className="sr-only">
                    Component readings for {claimId}, as recorded and as replayed.
                  </caption>
                  <thead>
                    <tr className="text-micro uppercase tracking-[0.1em] text-paper-faint">
                      <th scope="col" className="rule-b py-2 pr-3 text-left font-medium">
                        component
                      </th>
                      <th scope="col" className="rule-b py-2 pr-3 text-right font-medium">
                        then
                      </th>
                      <th scope="col" className="rule-b py-2 pr-3 text-right font-medium">
                        now
                      </th>
                      <th scope="col" className="rule-b py-2 text-right font-medium">
                        delta
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => {
                      const tv = t[k];
                      const nv = n[k];
                      const both = tv !== undefined && nv !== undefined;
                      return (
                        <tr key={k}>
                          <th
                            scope="row"
                            className="rule-b py-2 pr-3 text-left font-mono text-micro font-normal text-paper-dim"
                          >
                            {k}
                          </th>
                          <td className="figure rule-b py-2 pr-3 text-right">
                            {tv === undefined ? <Absent /> : fmt(tv)}
                          </td>
                          <td className="figure rule-b py-2 pr-3 text-right">
                            {nv === undefined ? <Absent /> : fmt(nv)}
                          </td>
                          <td className="figure rule-b py-2 text-right">
                            {both ? (
                              signed(nv - tv)
                            ) : (
                              <span className="text-micro text-paper-faint">
                                not comparable
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        );
      })}
    </ul>
  );
}

function Absent() {
  return (
    <span className="text-micro text-paper-faint" title="this key was not carried on this side">
      absent
    </span>
  );
}

/* ── Divergence row ───────────────────────────────────────────────────────── */

function DivergenceRow({ d }: { d: Divergence }) {
  const benign = isBenign(d);

  return (
    <Panel tone={benign ? "base" : "block"} className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="font-mono text-fine break-all text-paper">
            {d.claim_id} · {d.field}
          </p>
          <p className="mt-0.5 text-micro text-paper-faint">
            then <span className="figure text-paper-dim">{fmt(d.then)}</span> · now{" "}
            <span className="figure text-paper-dim">{fmt(d.now)}</span> ·{" "}
            <span className="figure text-paper-dim">{signed(d.now - d.then)}</span>
          </p>
        </div>
        <span className="shrink-0">
          <StatusTag token={d.reason} />
        </span>
      </div>
      <p className={`mt-2 max-w-2xl text-fine ${benign ? "text-paper-dim" : "text-paper"}`}>
        {benign ? "Expected and benign — " : ""}
        {REASON_GLOSS[d.reason]}
      </p>
    </Panel>
  );
}
