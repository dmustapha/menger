"use client";

import Link from "next/link";
import { use } from "react";
import { api, decodeSlotKey, encodeSlotKey, splitSlotKey } from "@/lib/api";
import type { ScoredClaim, SlotDetail } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { ClaimCard } from "@/components/ClaimCard";
import { HealthGate } from "@/components/HealthGate";
import { ErrorView, Note, Skeleton } from "@/components/states";
import { Eyebrow, Panel } from "@/components/primitives";
import { MarginBand } from "@/components/scores";
import { StatusTag } from "@/components/status";

/** Deterministic, locale-free stamp — the same string on the server and in the browser. */
function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().replace("T", " ").slice(0, 16)}Z`;
}

/** ranking order first, then any claim the ranking omitted, in payload order. */
function orderClaims(claims: ScoredClaim[], ranking: string[]): ScoredClaim[] {
  const byId = new Map(claims.map((c) => [c.claim_id, c]));
  const ranked: ScoredClaim[] = [];
  for (const id of ranking) {
    const c = byId.get(id);
    if (c) {
      ranked.push(c);
      byId.delete(id);
    }
  }
  return [...ranked, ...claims.filter((c) => byId.has(c.claim_id))];
}

export default function SlotDetailPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const slotKey = decodeSlotKey(key);

  return (
    <div className="py-8 sm:py-12">
      <HealthGate loadingLabel="Asking the engine whether it is willing to serve this slot…">
        <SlotDetailBody slotKey={slotKey} />
      </HealthGate>
    </div>
  );
}

function SlotDetailBody({ slotKey }: { slotKey: string }) {
  const { phase, data, error, reload } = useAsync(() => api.slot(slotKey), [slotKey]);
  const fallback = splitSlotKey(slotKey);

  if (phase === "loading") {
    return (
      <>
        <Eyebrow>slot</Eyebrow>
        <h1 className="mb-6 font-display text-title leading-tight break-words">
          <span className="font-mono text-lead text-paper-dim">{fallback.subject}</span>{" "}
          <span className="text-paper-faint">·</span> {fallback.predicate}
        </h1>
        <Skeleton rows={4} label="Reading every contender on this slot…" />
      </>
    );
  }

  if (phase === "error") {
    return (
      <ErrorView
        err={error}
        onRetry={reload}
        backHref="/slots"
        backLabel="Back to every slot"
      />
    );
  }

  return <SlotDocket data={data} />;
}

function SlotDocket({ data }: { data: SlotDetail }) {
  const encoded = encodeSlotKey(data.slot_key);
  const ordered = orderClaims(data.claims, data.ranking);
  const rankOf = new Map(data.ranking.map((id, i) => [id, i + 1]));

  return (
    <article className="space-y-10">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header>
        <Link
          href="/slots"
          className="text-micro text-paper-faint underline-offset-4 transition-colors duration-(--duration-quick) hover:text-accent hover:underline"
        >
          ← Every slot
        </Link>
        <div className="mt-3">
          <Eyebrow>slot</Eyebrow>
        </div>
        <h1 className="mt-1 font-display text-title leading-tight break-words">
          <span className="font-mono text-lead text-paper-dim">{data.subject}</span>{" "}
          <span className="text-paper-faint">·</span> {data.predicate}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-fine text-paper-dim">
          <span>
            {data.contested ? (
              <span className="text-accent">contested</span>
            ) : (
              <span>uncontested</span>
            )}{" "}
            · <span className="figure text-paper">{data.claims.length}</span>{" "}
            {data.claims.length === 1 ? "claim on file" : "claims on file"}
          </span>
          {data.last_receipt_id ? (
            <Link
              href={`/receipts/${encodeURIComponent(data.last_receipt_id)}`}
              className="font-mono text-micro text-accent underline underline-offset-4 transition-colors duration-(--duration-quick) hover:text-paper"
            >
              last receipt {data.last_receipt_id} →
            </Link>
          ) : (
            <span className="text-micro text-paper-faint">no receipt has been issued here</span>
          )}
        </div>

        <p className="mt-3 text-micro text-paper-faint">
          engine constants, read from this response: ε ={" "}
          <span className="figure text-paper-dim">{data.epsilon}</span>, λ ={" "}
          <span className="figure text-paper-dim">{data.lambda}</span>.
        </p>
      </header>

      {/* ── Margin ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="margin-h">
        <h2 id="margin-h" className="mb-3 font-display text-lead leading-snug">
          The contest at the top
        </h2>
        <Panel tone="base" className="p-4 sm:p-5">
          {data.top_margin === null ? (
            <p className="text-fine text-paper-dim">
              Only one claim contends for this slot, so there is no ranking contest. A margin is
              the distance between the leader and the runner-up; with no runner-up there is no
              distance to report.
            </p>
          ) : (
            <MarginBand margin={data.top_margin} epsilon={data.epsilon} size="lg" />
          )}
        </Panel>
      </section>

      {/* ── Claims ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="claims-h">
        <h2 id="claims-h" className="mb-1 font-display text-lead leading-snug">
          Contenders
        </h2>
        <p className="mb-3 max-w-2xl text-fine text-paper-dim">
          Listed in ranking order. Independence, reliability and recency are reported separately
          on every card; they are never folded into one figure.
        </p>
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {ordered.map((claim) => {
            const rank = rankOf.get(claim.claim_id);
            return (
              <li key={claim.claim_id}>
                <ClaimCard
                  claim={claim}
                  rank={rank}
                  slotKey={data.slot_key}
                  tone={rank === 1 ? "accent" : "base"}
                  emphasis={rank === 1 ? "independence" : "none"}
                />
              </li>
            );
          })}
        </ul>
        <p className="mt-3">
          <Link
            href={`/slots/${encoded}/graph`}
            className="text-fine text-accent underline underline-offset-4 transition-colors duration-(--duration-quick) hover:text-paper"
          >
            See the node-split provenance behind these counts →
          </Link>
        </p>
      </section>

      {/* ── Receipts ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="receipts-h">
        <h2 id="receipts-h" className="mb-3 font-display text-lead leading-snug">
          Receipts
        </h2>
        {data.receipts.length === 0 ? (
          <Note title="This slot was seeded and never adjudicated.">
            That is what the SEEDED status means: the claims arrived with the corpus, no write was
            ever gated against them, and so no receipt exists to replay.
          </Note>
        ) : (
          <ul className="space-y-2">
            {data.receipts.map((r) => (
              <Panel as="li" key={r.receipt_id} tone="base" className="p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusTag token={r.verdict} />
                    <span className="figure text-fine text-paper-dim">
                      {stamp(r.decided_at)}
                    </span>
                  </div>
                  <Link
                    href={`/receipts/${encodeURIComponent(r.receipt_id)}`}
                    className="font-mono text-micro text-accent underline underline-offset-4 transition-colors duration-(--duration-quick) hover:text-paper"
                  >
                    {r.receipt_id} →
                  </Link>
                </div>
              </Panel>
            ))}
          </ul>
        )}
      </section>

      {/* ── Open reviews ─────────────────────────────────────────────────── */}
      <section aria-labelledby="reviews-h">
        <h2 id="reviews-h" className="mb-3 font-display text-lead leading-snug">
          Open reviews
        </h2>
        {data.open_reviews.length === 0 ? (
          <Note title="Nothing on this slot is awaiting review.">
            No write against it has landed inside the ε band, so the queue holds none of its
            claims.
          </Note>
        ) : (
          <ul className="space-y-2">
            {data.open_reviews.map((rv) => (
              <Panel as="li" key={rv.review_id} tone="raised" className="p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="min-w-0">
                    <p className="font-mono text-fine text-paper">{rv.review_id}</p>
                    <p className="mt-0.5 text-micro text-paper-faint">
                      claim <span className="font-mono text-paper-dim">{rv.claim_id}</span> ·
                      margin <span className="figure text-paper-dim">{rv.margin.toFixed(4)}</span>{" "}
                      against ε <span className="figure text-paper-dim">{data.epsilon}</span>
                    </p>
                  </div>
                  <Link
                    href="/review"
                    className="text-micro text-accent underline underline-offset-4 transition-colors duration-(--duration-quick) hover:text-paper"
                  >
                    Open the review queue →
                  </Link>
                </div>
              </Panel>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
