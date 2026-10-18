"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { api, encodeSlotKey, splitSlotKey } from "@/lib/api";
import { splitSourceId } from "@/lib/graph";
import type { CypherStatement, Receipt, ReceiptCandidate } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { HealthGate } from "@/components/HealthGate";
import { ErrorView, Note, Skeleton } from "@/components/states";
import { Button, ButtonLink, Code, Eyebrow, Panel } from "@/components/primitives";
import { ComponentTriple, MarginBand, OrdinalScore } from "@/components/scores";
import { StatusTag } from "@/components/status";

/** Deterministic, locale-free stamp — the same string on the server and in the browser. */
function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().replace("T", " ").slice(0, 16)}Z`;
}

/* ── Node chips ───────────────────────────────────────────────────────────── */

/**
 * The raw id stays in the title attribute. Display strips the si:/so: half-prefix
 * because the prefix is layout, not identity — but the identity is one hover away.
 */
function NodeChip({ id, tone = "base" }: { id: string; tone?: "base" | "accent" }) {
  const label = splitSourceId(id) ?? id;
  const skin =
    tone === "accent"
      ? "bg-accent-wash text-accent ring-accent-dim"
      : "bg-ink-0 text-paper-dim ring-rule";
  return (
    <span
      title={id}
      className={`inline-block rounded-sm px-2 py-0.5 font-mono text-micro ring-1 ring-inset ${skin}`}
    >
      {label}
    </span>
  );
}

function NodeChain({ path }: { path: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {path.map((id, i) => (
        <span key={`${id}-${i}`} className="flex items-center gap-1.5">
          {i > 0 ? (
            <span aria-hidden="true" className="text-paper-faint">
              →
            </span>
          ) : null}
          <NodeChip id={id} />
        </span>
      ))}
    </div>
  );
}

/* ── Copy to clipboard ────────────────────────────────────────────────────── */

function CopyButton({ text, what }: { text: string; what: string }) {
  const [canCopy, setCanCopy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanCopy(typeof navigator !== "undefined" && Boolean(navigator.clipboard));
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(t);
  }, [copied]);

  const onCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(
      () => setCopied(true),
      () => undefined,
    );
  }, [text]);

  if (!canCopy) return null;

  return (
    <Button
      tone="quiet"
      onClick={onCopy}
      aria-label={`Copy ${what} to the clipboard`}
      className="shrink-0 px-2 py-1 text-micro"
    >
      <span aria-live="polite">{copied ? "copied" : "copy"}</span>
    </Button>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const receiptId = decodeURIComponent(id);

  return (
    <div className="py-8 sm:py-12">
      <HealthGate loadingLabel="Asking the engine whether it is willing to serve this receipt…">
        <ReceiptBody receiptId={receiptId} />
      </HealthGate>
    </div>
  );
}

function ReceiptBody({ receiptId }: { receiptId: string }) {
  const { phase, data, error, reload } = useAsync(() => api.receipt(receiptId), [receiptId]);

  if (phase === "loading") {
    return (
      <>
        <Eyebrow>receipt</Eyebrow>
        <h1 className="mb-6 font-mono text-title leading-tight break-all">{receiptId}</h1>
        <Skeleton rows={4} label="Pulling the statements that produced this decision…" />
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

  return <Docket r={data} />;
}

/* ── Docket ───────────────────────────────────────────────────────────────── */

function Docket({ r }: { r: Receipt }) {
  const { subject, predicate } = splitSlotKey(r.slot_key);
  const slotHref = `/slots/${encodeSlotKey(r.slot_key)}`;
  const replayHref = `/receipts/${encodeURIComponent(r.receipt_id)}/replay`;

  return (
    <article className="space-y-10">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header>
        <Link
          href={slotHref}
          className="text-micro text-paper-faint underline-offset-4 transition-colors duration-(--duration-quick) hover:text-accent hover:underline"
        >
          ← {subject} · {predicate}
        </Link>

        <div className="mt-3">
          <Eyebrow>receipt</Eyebrow>
        </div>
        <h1 className="mt-1 font-mono text-title leading-tight break-all">{r.receipt_id}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <StatusTag token={r.verdict} size="lg" />
          <span className="figure text-fine text-paper-dim">{stamp(r.decided_at)}</span>
          <Link
            href={slotHref}
            className="font-mono text-micro text-accent underline underline-offset-4 transition-colors duration-(--duration-quick) hover:text-paper"
          >
            {r.slot_key} →
          </Link>
        </div>

        <p className="mt-4 max-w-2xl text-fine text-paper-dim">
          This decision is reproducible because the literal text that produced it is on this page.
          Everything below — the counts, the path, the verdict — came out of the statements in the
          last section, and those statements are printed exactly as they were executed.
        </p>

        <Panel tone="base" className="mt-5 p-4 sm:p-5">
          <MarginBand margin={r.margin} epsilon={r.epsilon} size="lg" />
          <p className="mt-3 text-micro text-paper-faint">
            Engine constants carried on this receipt: ε ={" "}
            <span className="figure text-paper-dim">{r.epsilon}</span> · λ ={" "}
            <span className="figure text-paper-dim">{r.lambda}</span>. Both are published by the
            engine and echoed here; neither is written into this console.
          </p>
        </Panel>
      </header>

      {/* ── Engine ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="engine-h">
        <h2 id="engine-h" className="mb-1 font-display text-lead leading-snug">
          The engine that answered
        </h2>
        <p className="mb-3 max-w-2xl text-fine text-paper-dim">
          The read path is <span className="font-mono text-paper">{r.engine.read_path}</span>, a
          server-side read-only command — so a receipt cannot have mutated the graph it is citing.
        </p>
        <Panel tone="base" className="p-4">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="text-micro uppercase tracking-[0.1em] text-paper-faint">
                image · the pin
              </dt>
              <dd className="mt-0.5 font-mono text-fine break-all text-paper">{r.engine.image}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-micro uppercase tracking-[0.1em] text-paper-faint">graph</dt>
              <dd className="mt-0.5 font-mono text-fine break-all text-paper">{r.engine.graph}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-micro uppercase tracking-[0.1em] text-paper-faint">read path</dt>
              <dd className="mt-0.5 font-mono text-fine break-all text-paper">
                {r.engine.read_path}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-micro text-paper-faint">
            <span className="font-mono text-paper-dim">engine.image</span> is the pin: the exact
            image that ran these statements, named so a reader can run them against the same build.
          </p>
        </Panel>
      </section>

      {/* ── Candidates ───────────────────────────────────────────────────── */}
      <section aria-labelledby="cands-h">
        <h2 id="cands-h" className="mb-1 font-display text-lead leading-snug">
          Candidates on this slot
        </h2>
        <p className="mb-3 max-w-2xl text-fine text-paper-dim">
          One entry per claim that contended. Independence, reliability and recency are reported
          separately on each; they are never folded into a single figure.
        </p>

        {r.candidates.length === 0 ? (
          <Note title="This receipt carries no candidates.">
            The response returned an empty <span className="font-mono">candidates</span> array. No
            claim is listed as having contended, so there is nothing here to compare — that is what
            the payload says, and nothing is filled in on its behalf.
          </Note>
        ) : (
          <ul className="space-y-5">
            {r.candidates.map((c) => (
              <li key={c.claim_id}>
                <CandidateBlock candidate={c} isWinner={c.claim_id === r.winner_claim_id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Cypher ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="cypher-h">
        <h2 id="cypher-h" className="mb-1 font-display text-lead leading-snug">
          The statements that ran
        </h2>
        <p className="mb-3 max-w-2xl text-fine text-paper-dim">
          Each one is a single parameterised Cypher query, shown exactly as it ran, down to the
          parameter names — the exact key is load-bearing, because a near-miss key is accepted
          silently and returns a different quantity with no error.
        </p>

        {r.cypher.length === 0 ? (
          <Note title="This receipt records no statements.">
            The <span className="font-mono">cypher</span> array came back empty. There is therefore
            no recorded text to read and nothing for the replay to re-execute. The absence is shown
            rather than papered over.
          </Note>
        ) : (
          <ol className="space-y-4">
            {r.cypher.map((s, i) => (
              <li key={`${s.label}-${i}`}>
                <StatementBlock s={s} />
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* ── Replay ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="replay-h">
        <h2 id="replay-h" className="mb-3 font-display text-lead leading-snug">
          Run it again
        </h2>
        <Panel tone="accent" className="p-4 sm:p-5">
          <p className="max-w-2xl text-fine text-paper-dim">
            The statements above are not a transcript for reading only. The engine will re-execute
            them against the live graph and report, statement by statement, whether the same
            numbers come back.
          </p>
          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-micro uppercase tracking-[0.1em] text-paper-faint">endpoint</dt>
              <dd className="mt-0.5 font-mono text-fine break-all text-paper">
                {r.replay.endpoint}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-micro uppercase tracking-[0.1em] text-paper-faint">
                deterministic
              </dt>
              <dd className="mt-0.5 font-mono text-fine text-paper">
                {String(r.replay.deterministic)}
              </dd>
            </div>
          </dl>
          <ButtonLink href={replayHref} tone="primary" className="mt-5">
            Run it again against the live graph →
          </ButtonLink>
        </Panel>
      </section>
    </article>
  );
}

/* ── Candidate ────────────────────────────────────────────────────────────── */

function CandidateBlock({
  candidate: c,
  isWinner,
}: {
  candidate: ReceiptCandidate;
  isWinner: boolean;
}) {
  const w = c.independence_witness;
  const rp = c.reliability_path;
  const nlSum = rp.edges.reduce((acc, e) => acc + e.nl, 0);

  return (
    <Panel tone={isWinner ? "accent" : "base"} className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lead leading-tight break-words">{c.object}</p>
          <p className="mt-0.5 font-mono text-micro text-paper-faint">{c.claim_id}</p>
        </div>
        {isWinner ? (
          <span className="rounded-sm bg-accent-wash px-2 py-0.5 font-mono text-micro uppercase tracking-[0.1em] text-accent ring-1 ring-inset ring-accent-dim">
            winner
          </span>
        ) : null}
      </div>

      <div className="mt-3">
        <ComponentTriple components={c.components} emphasis="independence" dense />
      </div>

      <div className="mt-3">
        <OrdinalScore score={c.score} />
      </div>

      {/* independence witness */}
      <div className="mt-5 rounded-md border border-rule bg-ink-0 p-3">
        <h3 className="text-micro uppercase tracking-[0.1em] text-paper-faint">
          independence witness
        </h3>
        <p className="mt-1.5 text-fine text-paper-dim">
          max_flow is{" "}
          <span className="figure text-paper">{w.max_flow}</span> and independence is{" "}
          <span className="figure text-paper">{c.components.independence}</span>. These are not two
          measurements that happen to agree — max_flow <em>is</em> the independence integer, the
          same number written twice.
        </p>

        <div className="mt-3">
          <p className="text-micro uppercase tracking-[0.1em] text-paper-faint">witness nodes</p>
          {w.witness_nodes.length === 0 ? (
            <p className="mt-1 text-micro text-paper-dim">
              No saturated split node is recorded for this claim.
            </p>
          ) : (
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {w.witness_nodes.map((id) => (
                <li key={id}>
                  <NodeChip id={id} tone="accent" />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-3">
          <p className="text-micro uppercase tracking-[0.1em] text-paper-faint">
            vertex-disjoint chains
          </p>
          {w.paths.length === 0 ? (
            <p className="mt-1 text-micro text-paper-dim">
              No chain is recorded for this claim.
            </p>
          ) : (
            <ol className="mt-1.5 space-y-2">
              {w.paths.map((p, i) => (
                <li key={i} className="overflow-x-auto">
                  <NodeChain path={p} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* reliability path */}
      <div className="mt-4 rounded-md border border-rule bg-ink-0 p-3">
        <h3 className="text-micro uppercase tracking-[0.1em] text-paper-faint">
          reliability path
        </h3>

        {rp.edges.length === 0 ? (
          <p className="mt-1.5 text-micro text-paper-dim">
            No edge is recorded on this path.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-fine">
              <caption className="sr-only">
                Each edge on the shortest path, with its trust and its negative-log weight.
              </caption>
              <thead>
                <tr className="text-micro uppercase tracking-[0.1em] text-paper-faint">
                  <th scope="col" className="rule-b py-2 pr-3 text-left font-medium">
                    from
                  </th>
                  <th scope="col" className="rule-b py-2 pr-3 text-left font-medium">
                    to
                  </th>
                  <th scope="col" className="rule-b py-2 pr-3 text-left font-medium">
                    type
                  </th>
                  <th scope="col" className="rule-b py-2 pr-3 text-right font-medium">
                    trust
                  </th>
                  <th scope="col" className="rule-b py-2 text-right font-medium">
                    nl
                  </th>
                </tr>
              </thead>
              <tbody>
                {rp.edges.map((e, i) => (
                  <tr key={`${e.from}-${e.to}-${i}`}>
                    <td className="rule-b py-2 pr-3 font-mono text-micro text-paper-dim" title={e.from}>
                      {splitSourceId(e.from) ?? e.from}
                    </td>
                    <td className="rule-b py-2 pr-3 font-mono text-micro text-paper-dim" title={e.to}>
                      {splitSourceId(e.to) ?? e.to}
                    </td>
                    <td className="rule-b py-2 pr-3 font-mono text-micro text-paper-faint">
                      {e.type}
                    </td>
                    <td className="figure rule-b py-2 pr-3 text-right">{e.trust}</td>
                    <td className="figure rule-b py-2 text-right">{e.nl.toFixed(5)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={4} className="py-2 pr-3 text-right text-micro uppercase tracking-[0.1em] text-paper-faint">
                    sum of nl
                  </th>
                  <td className="figure py-2 text-right text-paper">{nlSum.toFixed(5)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <p className="mt-2 text-micro text-paper-faint">
          path_weight is <span className="figure text-paper-dim">{rp.path_weight.toFixed(5)}</span>{" "}
          — the raw sum of <span className="font-mono">nl</span> over the edges above, carried
          unrounded rather than only in its exponentiated form. Reliability is exp(−path_weight):
          the two are the same fact written two ways, and the raw sum is shown so the hop-count
          trap is visible rather than hidden behind the exponential.
        </p>
      </div>
    </Panel>
  );
}

/* ── One statement ────────────────────────────────────────────────────────── */

function StatementBlock({ s }: { s: CypherStatement }) {
  const paramsJson = JSON.stringify(s.params, null, 2);

  return (
    <Panel tone="base" className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="font-mono text-fine break-all text-paper">{s.label}</p>
          <p className="mt-0.5 text-micro text-paper-faint">
            <span className="font-mono text-paper-dim">{s.read_command}</span> ·{" "}
            <span className="figure">{s.duration_ms}</span> ms
          </p>
        </div>
        <CopyButton text={s.query} what={`the ${s.label} query`} />
      </div>

      <Code className="mt-3 whitespace-pre">{s.query}</Code>

      <div className="mt-3">
        <p className="mb-1 text-micro uppercase tracking-[0.1em] text-paper-faint">params</p>
        <Code className="whitespace-pre">{paramsJson}</Code>
      </div>
    </Panel>
  );
}
