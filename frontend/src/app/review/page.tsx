"use client";

/**
 * /review — the review queue. Every UNDECIDED write lands here.
 *
 * READ-ONLY in v1.0 (CONTRACT.md §2.7, explicit). No endpoint resolves an item, so this
 * route presents no control that claims to. ε arrives on the payload and is never written
 * in this file.
 */

import Link from "next/link";
import { useState } from "react";
import { api, encodeSlotKey } from "@/lib/api";
import type { ReviewContender, ReviewItem, ReviewQueue } from "@/lib/types";
import { HealthGate } from "@/components/HealthGate";
import { Button, Eyebrow, Panel } from "@/components/primitives";
import { ErrorView, Skeleton } from "@/components/states";
import { ComponentTriple, MarginBand, OrdinalScore } from "@/components/scores";
import { StatusTag } from "@/components/status";
import { useAsync } from "@/lib/useAsync";

type StatusFilter = "OPEN" | "RESOLVED" | "ALL";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "ALL", label: "All" },
];

const PAGE_SIZE = 20;

export default function ReviewPage() {
  return (
    <HealthGate loadingLabel="Asking the engine whether it is willing to serve…">
      <ReviewQueueView />
    </HealthGate>
  );
}

function ReviewQueueView() {
  const [status, setStatus] = useState<StatusFilter>("OPEN");
  const [offset, setOffset] = useState(0);

  const { phase, data, error, reload } = useAsync(
    () => api.review({ status, limit: PAGE_SIZE, offset }),
    [status, offset],
  );

  function pick(next: StatusFilter) {
    setStatus(next);
    setOffset(0);
  }

  return (
    <div className="py-8 sm:py-12">
      <header className="mb-6 max-w-3xl">
        <Eyebrow>GET /review · the queue</Eyebrow>
        <h1 className="mt-2 font-display text-headline leading-none tracking-tight">
          Contests the gate declined to decide.
        </h1>
        <p className="mt-3 text-fine text-paper-dim">
          A write lands here when the margin between the incoming claim and the incumbent falls
          inside the band the engine publishes. The gate will not separate two claims it cannot
          separate on the evidence, so it files the contest instead of forcing a winner. Nothing
          queued here was dropped: each item names its receipt and the slot it came from.
        </p>
      </header>

      <div
        role="group"
        aria-label="Filter the queue by status"
        className="mb-5 inline-flex flex-wrap gap-1 rounded-md border border-rule bg-ink-1 p-1"
      >
        {FILTERS.map((f) => {
          const active = f.value === status;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => pick(f.value)}
              aria-pressed={active}
              className={`rounded-sm px-3 py-1.5 text-fine font-medium transition-colors duration-(--duration-quick) ${
                active
                  ? "bg-accent-wash text-accent"
                  : "text-paper-dim hover:bg-ink-2 hover:text-paper"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <ReadOnlyNotice />

      {phase === "loading" ? (
        <Skeleton rows={3} label="Reading the queue…" />
      ) : phase === "error" ? (
        <ErrorView err={error} onRetry={reload} />
      ) : (
        <QueueBody
          data={data}
          status={status}
          offset={offset}
          onOffset={setOffset}
          onSeeAll={() => pick("ALL")}
        />
      )}
    </div>
  );
}

/* ── The honesty note. Adjacent to the items, never in a footer. ──────────── */

function ReadOnlyNotice() {
  return (
    <Panel tone="raised" className="mb-5 p-4 sm:p-5">
      <p className="text-micro font-medium uppercase tracking-[0.14em] text-paper-faint">
        limitation, stated here rather than discovered later
      </p>
      <h2 className="mt-2 font-display text-lead leading-snug">
        This queue is read-only in v1.0.
      </h2>
      <p className="mt-2 max-w-3xl text-fine text-paper-dim">
        There is no endpoint that resolves a review item, so this console offers no control that
        claims to resolve one. Adding a button that only looked like it worked would be the one kind
        of dishonesty this surface exists to rule out. Resolution would arrive as an amendment to
        the frozen contract, and until it does, an item stays open and stays visible.
      </p>
      <p className="mt-2 text-fine text-paper-dim">
        An item does leave the open set when the slot is written again and the next decision falls
        outside the band.
      </p>
    </Panel>
  );
}

/* ── Body ─────────────────────────────────────────────────────────────────── */

function QueueBody({
  data,
  status,
  offset,
  onOffset,
  onSeeAll,
}: {
  data: ReviewQueue;
  status: StatusFilter;
  offset: number;
  onOffset: (n: number) => void;
  onSeeAll: () => void;
}) {
  if (data.total === 0) {
    return <EmptyQueue status={status} onSeeAll={onSeeAll} />;
  }

  const first = data.offset + 1;
  const last = Math.min(data.offset + data.items.length, data.total);
  const hasPrev = data.offset > 0;
  const hasNext = data.offset + data.items.length < data.total;

  return (
    <div className="space-y-5">
      <p className="text-fine text-paper-dim">
        <span className="figure text-paper">{data.total}</span>{" "}
        {data.total === 1 ? "item" : "items"} under{" "}
        <span className="font-mono text-paper">{status}</span>. Showing{" "}
        <span className="figure">{first}</span>–<span className="figure">{last}</span>.
      </p>

      <ul className="space-y-5">
        {data.items.map((item) => (
          <QueueRow key={item.review_id} item={item} epsilon={data.epsilon} />
        ))}
      </ul>

      {hasPrev || hasNext ? (
        <nav aria-label="Queue pagination" className="flex items-center gap-3">
          <Button
            type="button"
            tone="ghost"
            disabled={!hasPrev}
            onClick={() => onOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            ← Earlier page
          </Button>
          <Button
            type="button"
            tone="ghost"
            disabled={!hasNext}
            onClick={() => onOffset(offset + PAGE_SIZE)}
          >
            Later page →
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

/* ── One item ─────────────────────────────────────────────────────────────── */

function QueueRow({ item, epsilon }: { item: ReviewItem; epsilon: number }) {
  return (
    <Panel as="li" tone="base" className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-fine text-paper">{item.review_id}</p>
          <p className="mt-0.5 text-micro text-paper-faint">
            filed {new Date(item.created_at).toISOString().replace("T", " ").slice(0, 19)}Z · on
            slot{" "}
            <Link
              href={`/slots/${encodeSlotKey(item.slot_key)}`}
              className="font-mono text-accent underline underline-offset-4 hover:text-paper"
            >
              {item.slot_key}
            </Link>
          </p>
        </div>
        <StatusTag token={item.status} />
      </div>

      <MarginBand margin={item.margin} epsilon={epsilon} />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-micro text-paper-faint">
        <span>
          reason <span className="font-mono text-paper-dim">{item.reason}</span> — the only reason an
          item is filed in v1.0
        </span>
        <Link
          href={`/receipts/${encodeURIComponent(item.receipt_id)}`}
          className="text-accent underline underline-offset-4 hover:text-paper"
        >
          receipt {item.receipt_id} →
        </Link>
      </div>

      <div className="grid gap-4 rule-t pt-4 md:grid-cols-2">
        <Contender label="incoming" contender={item.incoming} />
        {item.incumbent ? (
          <Contender label="incumbent" contender={item.incumbent} />
        ) : (
          <div className="rounded-md border border-rule bg-ink-0 p-3">
            <p className="text-micro uppercase tracking-[0.1em] text-paper-faint">incumbent</p>
            <p className="mt-1.5 text-fine text-paper">The slot was empty.</p>
            <p className="mt-1 text-micro text-paper-faint">
              There was nothing to displace, so the margin was taken against an incumbent score of{" "}
              <span className="figure text-paper-dim">0.0</span> and still landed inside the band.
            </p>
          </div>
        )}
      </div>
    </Panel>
  );
}

function Contender({ label, contender }: { label: string; contender: ReviewContender }) {
  return (
    <div className="rounded-md border border-rule bg-ink-0 p-3">
      <p className="text-micro uppercase tracking-[0.1em] text-paper-faint">{label}</p>
      <p className="mt-1 break-words font-display text-lead leading-tight">{contender.object}</p>
      <p className="mt-0.5 text-micro text-paper-faint">
        <span className="font-mono text-paper-dim">{contender.claim_id}</span> · asserted by{" "}
        <span className="font-mono text-paper-dim">{contender.agent_id}</span>
      </p>
      <div className="mt-2.5">
        <OrdinalScore score={contender.score} />
      </div>
      <div className="mt-2.5">
        <ComponentTriple components={contender.components} dense />
      </div>
    </div>
  );
}

/* ── Empty ────────────────────────────────────────────────────────────────── */

function EmptyQueue({ status, onSeeAll }: { status: StatusFilter; onSeeAll: () => void }) {
  if (status === "OPEN") {
    return (
      <Panel tone="allow" className="p-5 sm:p-6">
        <p className="text-micro font-medium uppercase tracking-[0.14em] text-allow">
          nothing open
        </p>
        <h2 className="mt-2 font-display text-title leading-tight">
          Every write so far landed decisively.
        </h2>
        <p className="mt-2 max-w-2xl text-fine text-paper-dim">
          An empty open queue is a result, not a missing list. It says that on each write to date the
          margin fell clear of the band in one direction or the other, so the gate answered ALLOW or
          BLOCK outright and had no contest to file.
        </p>
        <p className="mt-2 max-w-2xl text-fine text-paper-dim">
          The queue fills the moment two claims land close enough to be inseparable on their
          evidence. Filing a near-tie against a contested slot from the write gate will produce one.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" tone="ghost" onClick={onSeeAll}>
            Look under ALL
          </Button>
          <Link
            href="/remember"
            className="inline-flex items-center text-fine text-accent underline underline-offset-4 hover:text-paper"
          >
            Go to the write gate →
          </Link>
        </div>
      </Panel>
    );
  }

  if (status === "RESOLVED") {
    return (
      <Panel tone="raised" className="p-5 sm:p-6">
        <p className="text-micro font-medium uppercase tracking-[0.14em] text-paper-faint">
          nothing resolved
        </p>
        <h2 className="mt-2 font-display text-title leading-tight">No item has been closed.</h2>
        <p className="mt-2 max-w-2xl text-fine text-paper-dim">
          Expected in v1.0: with no resolution endpoint in the contract, an item is not closed from
          this console or from any other client. This filter exists because the status field admits
          the value, not because the console can produce it.
        </p>
        <Button type="button" tone="ghost" className="mt-4" onClick={onSeeAll}>
          Look under ALL
        </Button>
      </Panel>
    );
  }

  return (
    <Panel tone="raised" className="p-5 sm:p-6">
      <p className="text-micro font-medium uppercase tracking-[0.14em] text-paper-faint">
        no items at all
      </p>
      <h2 className="mt-2 font-display text-title leading-tight">
        The queue has never been written to.
      </h2>
      <p className="mt-2 max-w-2xl text-fine text-paper-dim">
        No contest, open or closed, has been filed against this graph. The seeded corpus is loaded
        without adjudication, so the first item here will come from a write through the gate whose
        margin falls inside the band.
      </p>
      <Link
        href="/remember"
        className="mt-4 inline-flex items-center text-fine text-accent underline underline-offset-4 hover:text-paper"
      >
        Go to the write gate →
      </Link>
    </Panel>
  );
}
