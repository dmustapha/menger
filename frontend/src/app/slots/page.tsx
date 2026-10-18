"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { api, encodeSlotKey, splitSlotKey } from "@/lib/api";
import type { SlotRow } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { HealthGate } from "@/components/HealthGate";
import { ErrorView, Note, Skeleton } from "@/components/states";
import { Button, Eyebrow, Panel, SectionTitle } from "@/components/primitives";
import { OrdinalScore } from "@/components/scores";
import { StatusTag } from "@/components/status";

const PAGE_SIZE = 25;

/** Deterministic, locale-free stamp — the same string on the server and in the browser. */
function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().replace("T", " ").slice(0, 16)}Z`;
}

export default function SlotsPage() {
  return (
    <div className="py-8 sm:py-12">
      <header className="mb-6">
        <Eyebrow>the docket</Eyebrow>
        <SectionTitle sub="Every subject-predicate slot the graph holds, with the claim that currently occupies it and the last verdict entered against it.">
          Slots
        </SectionTitle>
      </header>
      <HealthGate loadingLabel="Asking the engine whether it is willing to serve the docket…">
        <SlotIndex />
      </HealthGate>
    </div>
  );
}

function SlotIndex() {
  const [contested, setContested] = useState(false);
  const [hasReview, setHasReview] = useState(false);
  const [offset, setOffset] = useState(0);

  const { phase, data, error, reload } = useAsync(
    () =>
      api.slots({
        ...(contested ? { contested: true } : {}),
        ...(hasReview ? { has_review: true } : {}),
        limit: PAGE_SIZE,
        offset,
      }),
    [contested, hasReview, offset],
  );

  const toggleContested = useCallback(() => {
    setOffset(0);
    setContested((v) => !v);
  }, []);
  const toggleHasReview = useCallback(() => {
    setOffset(0);
    setHasReview((v) => !v);
  }, []);
  const clearFilters = useCallback(() => {
    setOffset(0);
    setContested(false);
    setHasReview(false);
  }, []);

  const filtered = contested || hasReview;

  return (
    <div className="space-y-6">
      <section aria-label="Filters" className="flex flex-wrap items-center gap-2">
        <Button
          tone={contested ? "primary" : "ghost"}
          aria-pressed={contested}
          onClick={toggleContested}
        >
          Contested only
        </Button>
        <Button
          tone={hasReview ? "primary" : "ghost"}
          aria-pressed={hasReview}
          onClick={toggleHasReview}
        >
          Has an open review
        </Button>
        {filtered ? (
          <Button tone="quiet" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
      </section>

      {phase === "loading" ? (
        <Skeleton rows={5} label="Reading the docket from the graph…" />
      ) : null}

      {phase === "error" ? (
        <ErrorView
          err={error}
          onRetry={reload}
          backHref="/slots"
          backLabel="Back to every slot"
        />
      ) : null}

      {phase === "ready" ? (
        <SlotTable
          slots={data.slots}
          total={data.total}
          limit={data.limit}
          offset={data.offset}
          epsilon={data.epsilon}
          contested={contested}
          hasReview={hasReview}
          onClearFilters={clearFilters}
          onOffset={setOffset}
        />
      ) : null}
    </div>
  );
}

function SlotTable({
  slots,
  total,
  limit,
  offset,
  epsilon,
  contested,
  hasReview,
  onClearFilters,
  onOffset,
}: {
  slots: SlotRow[];
  total: number;
  limit: number;
  offset: number;
  epsilon: number;
  contested: boolean;
  hasReview: boolean;
  onClearFilters: () => void;
  onOffset: (next: number) => void;
}) {
  const filtered = contested || hasReview;

  if (total === 0 && !filtered) {
    return (
      <Note title="The corpus is not seeded.">
        The graph holds no slots at all, so there is nothing to adjudicate and nothing to show.
        This is not a filter outcome: seed the corpus, then reload this docket.
      </Note>
    );
  }

  if (slots.length === 0) {
    const narrowing = contested && hasReview
      ? "Contested only and Has an open review are both narrowing this docket"
      : contested
        ? "Contested only is narrowing this docket"
        : "Has an open review is narrowing this docket";
    return (
      <Note title="No slot in the docket meets that filter.">
        <p>
          {narrowing}. The graph holds slots; none of them match. Widen the docket to read the
          full set.
        </p>
        <Button tone="ghost" className="mt-3" onClick={onClearFilters}>
          Clear filters
        </Button>
      </Note>
    );
  }

  const first = offset + 1;
  const last = Math.min(offset + slots.length, total);
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

  return (
    <div className="space-y-5">
      <p className="text-fine text-paper-dim" aria-live="polite">
        Slots <span className="figure text-paper">{first}</span>–
        <span className="figure text-paper">{last}</span> of{" "}
        <span className="figure text-paper">{total}</span>
        {filtered ? ", filtered" : ""}.
      </p>

      <ul className="space-y-3">
        {slots.map((slot) => (
          <SlotRowItem key={slot.slot_key} slot={slot} epsilon={epsilon} />
        ))}
      </ul>

      <p className="text-micro text-paper-faint">
        ε = <span className="figure text-paper-dim">{epsilon}</span>, read from this response. A
        winner whose lead over the runner-up falls inside that band is not entered as a decision —
        it is filed for review.
      </p>

      <nav aria-label="Docket pages" className="flex items-center justify-between gap-3">
        <Button
          tone="ghost"
          disabled={!hasPrev}
          onClick={() => onOffset(Math.max(0, offset - limit))}
        >
          ← Previous {limit}
        </Button>
        <span className="figure text-micro text-paper-faint">
          offset {offset}
        </span>
        <Button tone="ghost" disabled={!hasNext} onClick={() => onOffset(offset + limit)}>
          Next {limit} →
        </Button>
      </nav>
    </div>
  );
}

function SlotRowItem({ slot, epsilon }: { slot: SlotRow; epsilon: number }) {
  const { subject, predicate } = splitSlotKey(slot.slot_key);
  const href = `/slots/${encodeSlotKey(slot.slot_key)}`;

  return (
    <Panel as="li" tone={slot.contested ? "raised" : "base"} className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="min-w-0">
            <Link
              href={href}
              className="font-display text-lead leading-tight break-words text-paper underline-offset-4 transition-colors duration-(--duration-quick) hover:text-accent hover:underline"
            >
              <span className="font-mono text-base text-paper-dim">{subject}</span>{" "}
              <span className="text-paper-faint">·</span> {predicate || slot.predicate}
            </Link>
          </h2>
          <p className="mt-0.5 text-micro text-paper-faint">
            <span className="figure text-paper-dim">{slot.claim_count}</span>{" "}
            {slot.claim_count === 1 ? "claim contends" : "claims contend"} ·{" "}
            {slot.contested ? (
              <span className="text-accent">contested</span>
            ) : (
              <span>uncontested</span>
            )}
            {slot.open_review_count > 0 ? (
              <>
                {" · "}
                <span className="text-undecided">
                  <span className="figure">{slot.open_review_count}</span> open review
                  {slot.open_review_count === 1 ? "" : "s"}
                </span>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {slot.last_verdict ? (
            <StatusTag token={slot.last_verdict} />
          ) : (
            <span className="text-micro text-paper-faint">never adjudicated</span>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-rule bg-ink-0 p-3">
          <p className="text-micro uppercase tracking-[0.1em] text-paper-faint">occupant</p>
          {slot.winner ? (
            <>
              <p className="mt-1 break-words text-base text-paper">{slot.winner.object}</p>
              <p className="mt-0.5 font-mono text-micro text-paper-faint">
                {slot.winner.claim_id}
              </p>
              <div className="mt-2">
                <OrdinalScore score={slot.winner.score} />
              </div>
            </>
          ) : (
            <p className="mt-1 text-fine text-paper-dim">
              No claim has been admitted to this slot. It stands open.
            </p>
          )}
        </div>

        <div className="rounded-md border border-rule bg-ink-0 p-3">
          <p className="text-micro uppercase tracking-[0.1em] text-paper-faint">last entry</p>
          <p className="mt-1 text-fine text-paper-dim">
            {slot.last_decided_at ? (
              <span className="figure text-paper">{stamp(slot.last_decided_at)}</span>
            ) : (
              "No verdict has ever been entered against this slot."
            )}
          </p>
          {slot.last_receipt_id ? (
            <Link
              href={`/receipts/${encodeURIComponent(slot.last_receipt_id)}`}
              className="mt-2 inline-block font-mono text-micro text-accent underline underline-offset-4 transition-colors duration-(--duration-quick) hover:text-paper"
            >
              {slot.last_receipt_id} →
            </Link>
          ) : null}
          <p className="mt-2 text-micro text-paper-faint">
            judged against ε <span className="figure text-paper-dim">{epsilon}</span>
          </p>
        </div>
      </div>
    </Panel>
  );
}
