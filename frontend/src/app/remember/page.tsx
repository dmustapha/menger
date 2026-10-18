"use client";

/**
 * /remember — the write gate. The only mutating surface in this console.
 *
 * slot_key is NEVER supplied: the engine derives it as subject + "|" + predicate
 * (CONTRACT.md §2.1). The preview below is a mirror of that derivation, shown so the
 * writer can see which slot they are about to contest. It is not sent.
 *
 * ε arrives on the response and on GET /health. It is never written in this file.
 */

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ApiError, api, encodeSlotKey } from "@/lib/api";
import type { RememberRequest, RememberResponse, SlotDetail } from "@/lib/types";
import { ClaimCard } from "@/components/ClaimCard";
import { HealthGate, useHealth } from "@/components/HealthGate";
import {
  Button,
  Eyebrow,
  Field,
  INPUT_CLASS,
  KeyValue,
  Mono,
  Panel,
  SectionTitle,
} from "@/components/primitives";
import { ContractError, ErrorView, Note } from "@/components/states";
import { MarginBand } from "@/components/scores";
import { VerdictHeadline } from "@/components/status";
import { useAsync } from "@/lib/useAsync";

/* ── Vocabulary harvest ───────────────────────────────────────────────────
   There is no endpoint that lists agents or sources. Free text is a guaranteed
   422, so the ids below are harvested from the read endpoints that do exist:
   GET /slots, then GET /slots/{key} for a handful of them. It is a sample of
   the seeded corpus, not an index of it — free text stays allowed.
   ───────────────────────────────────────────────────────────────────────── */

const HARVEST_SLOTS = 12;
const HARVEST_DETAILS = 6;

interface AgentOption {
  id: string;
  name: string;
}
interface SourceOption {
  id: string;
  kind: string;
  trust: number;
}
interface Vocabulary {
  agents: AgentOption[];
  sources: SourceOption[];
  slotsRead: number;
}

async function harvestVocabulary(): Promise<Vocabulary> {
  const list = await api.slots({ limit: HARVEST_SLOTS });
  const keys = list.slots.slice(0, HARVEST_DETAILS).map((s) => s.slot_key);
  const settled = await Promise.allSettled(keys.map((k) => api.slot(k)));

  const details = settled
    .filter((r): r is PromiseFulfilledResult<SlotDetail> => r.status === "fulfilled")
    .map((r) => r.value);

  const agents = new Map<string, AgentOption>();
  const sources = new Map<string, SourceOption>();

  for (const detail of details) {
    for (const claim of detail.claims) {
      if (!agents.has(claim.agent_id)) {
        agents.set(claim.agent_id, { id: claim.agent_id, name: claim.agent_name });
      }
      for (const s of claim.sources) {
        if (!sources.has(s.source_id)) {
          sources.set(s.source_id, { id: s.source_id, kind: s.kind, trust: s.trust });
        }
      }
    }
  }

  return {
    agents: [...agents.values()].sort((a, b) => a.id.localeCompare(b.id)),
    sources: [...sources.values()].sort((a, b) => a.id.localeCompare(b.id)),
    slotsRead: details.length,
  };
}

/* ── Form state ───────────────────────────────────────────────────────────── */

type SubmitState =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "done"; result: RememberResponse }
  | { phase: "failed"; error: unknown };

const AGENT_LIST_ID = "menger-harvested-agents";
const SOURCE_LIST_ID = "menger-harvested-sources";

export default function RememberPage() {
  return (
    <HealthGate loadingLabel="Asking the engine whether it will accept a write…">
      <RememberConsole />
    </HealthGate>
  );
}

function RememberConsole() {
  const health = useHealth();
  const vocab = useAsync(harvestVocabulary, []);

  const [agentId, setAgentId] = useState("");
  const [subject, setSubject] = useState("");
  const [predicate, setPredicate] = useState("");
  const [object, setObject] = useState("");
  const [sources, setSources] = useState<string[]>([""]);
  const [assertedAt, setAssertedAt] = useState("");
  const [submit, setSubmit] = useState<SubmitState>({ phase: "idle" });

  const derivedSlotKey = `${subject}|${predicate}`;
  const sending = submit.phase === "sending";

  const apiError = submit.phase === "failed" && submit.error instanceof ApiError ? submit.error : null;
  const fieldError = useCallback(
    (name: string): string | null => {
      if (!apiError) return null;
      if (apiError.code === "NO_SOURCES" && name === "sources") return apiError.message;
      if (apiError.code === "UNKNOWN_AGENT" && name === "agent_id") return apiError.message;
      if (apiError.code === "UNKNOWN_SOURCE" && name === "sources") return apiError.message;
      if (apiError.code === "VALIDATION_ERROR" && apiError.field === name) return apiError.message;
      return null;
    },
    [apiError],
  );

  const filledSources = useMemo(() => sources.map((s) => s.trim()).filter(Boolean), [sources]);
  const canSubmit =
    !sending &&
    agentId.trim().length > 0 &&
    subject.trim().length > 0 &&
    predicate.trim().length > 0 &&
    object.trim().length > 0 &&
    filledSources.length > 0;

  function setSourceAt(i: number, value: string) {
    setSources((prev) => prev.map((s, j) => (j === i ? value : s)));
  }
  function addSourceRow(value = "") {
    setSources((prev) => [...prev, value]);
  }
  function removeSourceRow(i: number) {
    setSources((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)));
  }
  function citeSource(id: string) {
    setSources((prev) => {
      if (prev.includes(id)) return prev;
      const firstEmpty = prev.findIndex((s) => s.trim() === "");
      if (firstEmpty >= 0) return prev.map((s, j) => (j === firstEmpty ? id : s));
      return [...prev, id];
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setSubmit({ phase: "sending" });

    const body: RememberRequest = {
      agent_id: agentId.trim(),
      subject: subject.trim(),
      predicate: predicate.trim(),
      object: object.trim(),
      sources: filledSources,
    };
    if (assertedAt.trim()) body.asserted_at = assertedAt.trim();

    try {
      const result = await api.remember(body);
      setSubmit({ phase: "done", result });
    } catch (error) {
      setSubmit({ phase: "failed", error });
    }
  }

  const agents = vocab.phase === "ready" ? vocab.data.agents : [];
  const sourceOptions = vocab.phase === "ready" ? vocab.data.sources : [];

  return (
    <div className="py-8 sm:py-12">
      <header className="mb-8 max-w-3xl">
        <Eyebrow>POST /remember · the write gate</Eyebrow>
        <h1 className="mt-2 font-display text-headline leading-none tracking-tight">
          File a claim against the graph.
        </h1>
        <p className="mt-3 text-fine text-paper-dim">
          Submitting writes to the live graph the rest of this console reads from. There is no
          sandbox, no dry run and no undo: the claim is created, scored against whatever currently
          holds the slot, and the verdict is filed with a receipt. A refusal is written down too.
        </p>
        {health ? (
          <p className="mt-2 text-micro text-paper-faint">
            Writing into <Mono>{health.engine.graph}</Mono> on{" "}
            <Mono>{health.engine.image}</Mono> · corpus currently{" "}
            <span className="figure text-paper-dim">{health.corpus.claims}</span> claims across{" "}
            <span className="figure text-paper-dim">{health.corpus.slots}</span> slots.
          </p>
        ) : null}
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start">
        {/* ── the form ───────────────────────────────────────────────────── */}
        <section aria-labelledby="write-form-heading">
          <div id="write-form-heading">
            <SectionTitle sub="Five required fields. The slot is derived from subject and predicate by the engine and is never sent.">
              The filing
            </SectionTitle>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <Panel tone="base" className="space-y-5 p-4 sm:p-5">
              <Field
                label="agent_id"
                htmlFor="f-agent"
                hint="Who is asserting this. Must already exist as an agent in the graph."
                error={fieldError("agent_id")}
              >
                <input
                  id="f-agent"
                  name="agent_id"
                  className={INPUT_CLASS}
                  value={agentId}
                  list={agents.length ? AGENT_LIST_ID : undefined}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="agt_…"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={fieldError("agent_id") ? true : undefined}
                  disabled={sending}
                />
              </Field>

              <VocabularyPicker
                phase={vocab.phase}
                error={vocab.error}
                slotsRead={vocab.phase === "ready" ? vocab.data.slotsRead : 0}
                agents={agents}
                selectedAgent={agentId}
                onPickAgent={setAgentId}
                disabled={sending}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="subject"
                  htmlFor="f-subject"
                  hint="The entity the claim is about."
                  error={fieldError("subject")}
                >
                  <input
                    id="f-subject"
                    name="subject"
                    className={INPUT_CLASS}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="customer:acme"
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={fieldError("subject") ? true : undefined}
                    disabled={sending}
                  />
                </Field>

                <Field
                  label="predicate"
                  htmlFor="f-predicate"
                  hint="The property being asserted."
                  error={fieldError("predicate")}
                >
                  <input
                    id="f-predicate"
                    name="predicate"
                    className={INPUT_CLASS}
                    value={predicate}
                    onChange={(e) => setPredicate(e.target.value)}
                    placeholder="primary_region"
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={fieldError("predicate") ? true : undefined}
                    disabled={sending}
                  />
                </Field>
              </div>

              <DerivedSlotKey value={derivedSlotKey} complete={Boolean(subject && predicate)} />

              <Field
                label="object"
                htmlFor="f-object"
                hint="The value asserted for that slot. This is what is contested."
                error={fieldError("object")}
              >
                <input
                  id="f-object"
                  name="object"
                  className={INPUT_CLASS}
                  value={object}
                  onChange={(e) => setObject(e.target.value)}
                  placeholder="eu-west-1"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={fieldError("object") ? true : undefined}
                  disabled={sending}
                />
              </Field>
            </Panel>

            {/* sources */}
            <Panel tone="base" className="space-y-4 p-4 sm:p-5">
              <div>
                <h3 className="font-display text-lead leading-snug">Provenance</h3>
                <p className="mt-1 text-micro text-paper-faint">
                  At least one source. Citations are scored on how independent they are once the
                  provenance graph is node-split, so two citations sharing one origin count as one
                  chain, not two.
                </p>
              </div>

              <div className="space-y-3">
                {sources.map((value, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <Field
                        label={`source ${i + 1}`}
                        htmlFor={`f-source-${i}`}
                        error={i === 0 ? fieldError("sources") : null}
                      >
                        <input
                          id={`f-source-${i}`}
                          name={`sources[${i}]`}
                          className={INPUT_CLASS}
                          value={value}
                          list={sourceOptions.length ? SOURCE_LIST_ID : undefined}
                          onChange={(e) => setSourceAt(i, e.target.value)}
                          placeholder="src_…"
                          autoComplete="off"
                          spellCheck={false}
                          aria-invalid={i === 0 && fieldError("sources") ? true : undefined}
                          disabled={sending}
                        />
                      </Field>
                    </div>
                    <Button
                      type="button"
                      tone="ghost"
                      className="mb-0.5 shrink-0"
                      onClick={() => removeSourceRow(i)}
                      disabled={sending || sources.length <= 1}
                      aria-label={`Remove source ${i + 1}`}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              <Button type="button" tone="ghost" onClick={() => addSourceRow()} disabled={sending}>
                Add a source
              </Button>

              {sourceOptions.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-micro uppercase tracking-[0.1em] text-paper-faint">
                    source ids observed in the seeded corpus
                  </p>
                  <ul className="flex flex-wrap gap-1.5">
                    {sourceOptions.map((s) => {
                      const cited = sources.includes(s.id);
                      return (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => citeSource(s.id)}
                            disabled={sending || cited}
                            title={`${s.kind} · trust ${s.trust}`}
                            className={`rounded-sm border px-2 py-1 font-mono text-micro transition-colors duration-(--duration-quick) disabled:cursor-not-allowed disabled:opacity-45 ${
                              cited
                                ? "border-accent-dim bg-accent-wash text-accent"
                                : "border-rule bg-ink-0 text-paper-dim hover:border-accent-dim hover:text-paper"
                            }`}
                          >
                            {s.id}
                            <span className="ml-1.5 text-paper-faint">{s.trust}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </Panel>

            <Panel tone="base" className="space-y-4 p-4 sm:p-5">
              <Field
                label="asserted_at — optional"
                htmlFor="f-asserted"
                hint="ISO-8601 UTC. Left blank, the engine stamps it at server now. Age feeds the recency reading only."
                error={fieldError("asserted_at")}
              >
                <input
                  id="f-asserted"
                  name="asserted_at"
                  className={INPUT_CLASS}
                  value={assertedAt}
                  onChange={(e) => setAssertedAt(e.target.value)}
                  placeholder="2026-10-18T14:02:11Z"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={fieldError("asserted_at") ? true : undefined}
                  disabled={sending}
                />
              </Field>
            </Panel>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" tone="primary" disabled={!canSubmit} aria-busy={sending}>
                {sending ? "Filing…" : "File this claim"}
              </Button>
              <p className="text-micro text-paper-faint">
                {sending
                  ? "The write is in flight. The gate will answer once."
                  : "This writes to the live graph."}
              </p>
            </div>
          </form>

          {agents.length > 0 ? (
            <datalist id={AGENT_LIST_ID}>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </datalist>
          ) : null}
          {sourceOptions.length > 0 ? (
            <datalist id={SOURCE_LIST_ID}>
              {sourceOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.kind} · trust {s.trust}
                </option>
              ))}
            </datalist>
          ) : null}
        </section>

        {/* ── the result ─────────────────────────────────────────────────── */}
        <section aria-labelledby="write-result-heading" aria-live="polite">
          <div id="write-result-heading">
            <SectionTitle sub="What the gate returns. Nothing is shown here until the engine has answered.">
              The ruling
            </SectionTitle>
          </div>

          {submit.phase === "idle" ? <UnsubmittedNotice /> : null}
          {submit.phase === "sending" ? (
            <Note title="The filing is with the gate.">
              The claim is being created and scored against the current holder of the slot. The
              answer is a single verdict with a receipt id; it will replace this panel.
            </Note>
          ) : null}
          {submit.phase === "failed" ? (
            <SubmitFailure error={submit.error} onRetry={() => setSubmit({ phase: "idle" })} />
          ) : null}
          {submit.phase === "done" ? <Ruling result={submit.result} /> : null}
        </section>
      </div>
    </div>
  );
}

/* ── Derived slot key preview ─────────────────────────────────────────────── */

function DerivedSlotKey({ value, complete }: { value: string; complete: boolean }) {
  return (
    <div className="rounded-md border border-rule bg-ink-0 p-3">
      <p className="text-micro uppercase tracking-[0.1em] text-paper-faint">
        derived slot_key — read only, never sent
      </p>
      <output
        htmlFor="f-subject f-predicate"
        className={`mt-1 block break-all font-mono text-fine ${
          complete ? "text-accent" : "text-paper-faint"
        }`}
      >
        {complete ? value : "subject|predicate"}
      </output>
      <p className="mt-1.5 text-micro text-paper-faint">
        The engine derives the slot as subject + &quot;|&quot; + predicate. The console mirrors that
        derivation so you can see which slot you are contesting; the field itself is not part of the
        request body.
      </p>
    </div>
  );
}

/* ── Vocabulary picker ────────────────────────────────────────────────────── */

function VocabularyPicker({
  phase,
  error,
  slotsRead,
  agents,
  selectedAgent,
  onPickAgent,
  disabled,
}: {
  phase: "loading" | "ready" | "error";
  error: unknown;
  slotsRead: number;
  agents: AgentOption[];
  selectedAgent: string;
  onPickAgent: (id: string) => void;
  disabled: boolean;
}) {
  if (phase === "loading") {
    return (
      <p className="text-micro text-paper-faint" role="status">
        Reading slots to collect the agent and source ids that already exist in the graph…
      </p>
    );
  }

  if (phase === "error") {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <p className="text-micro text-paper-faint">
        The id harvest did not complete ({message}). The fields stay open as free text — an id that
        is not in the graph comes back as a 422 naming the offender.
      </p>
    );
  }

  if (agents.length === 0) {
    return (
      <p className="text-micro text-paper-faint">
        No agent ids were observed in the slots that were read. The field stays free text.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-1.5 text-micro uppercase tracking-[0.1em] text-paper-faint">
        agent ids observed in the seeded corpus
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {agents.map((a) => {
          const picked = a.id === selectedAgent;
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onPickAgent(a.id)}
                disabled={disabled}
                title={a.name}
                aria-pressed={picked}
                className={`rounded-sm border px-2 py-1 font-mono text-micro transition-colors duration-(--duration-quick) disabled:cursor-not-allowed disabled:opacity-45 ${
                  picked
                    ? "border-accent-dim bg-accent-wash text-accent"
                    : "border-rule bg-ink-0 text-paper-dim hover:border-accent-dim hover:text-paper"
                }`}
              >
                {a.id}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 text-micro text-paper-faint">
        Harvested from {slotsRead} slot {slotsRead === 1 ? "record" : "records"}. This is a sample of
        the corpus, not an index of it — there is no endpoint that lists agents or sources, so any
        other id may still be valid and free text is accepted.
      </p>
    </div>
  );
}

/* ── Unsubmitted ──────────────────────────────────────────────────────────── */

function UnsubmittedNotice() {
  return (
    <Panel tone="raised" className="p-5">
      <p className="text-micro font-medium uppercase tracking-[0.14em] text-paper-faint">
        nothing filed yet
      </p>
      <h3 className="mt-2 font-display text-title leading-tight">This is a live write.</h3>
      <div className="mt-3 space-y-2 text-fine text-paper-dim">
        <p>
          There is one graph behind this console and the form above writes into it. On submit the
          claim is created, the slot it lands in is re-scored, and one of three answers is filed:
          ALLOW, BLOCK or UNDECIDED.
        </p>
        <p>
          Every one of those three is recorded. A refusal still produces a claim, a receipt and a
          row in the slot&rsquo;s history — nothing about a rejected write is discarded.
        </p>
        <p>
          The verdict is not reversible from this console. There is no delete endpoint in v1.0.
        </p>
      </div>
    </Panel>
  );
}

/* ── Failure ──────────────────────────────────────────────────────────────── */

const ERROR_COPY: Record<string, { title: string; body: string }> = {
  VALIDATION_ERROR: {
    title: "The filing was rejected before it was scored.",
    body: "A required field is missing, empty or the wrong type. The offending field is named below and marked on the form; nothing was written.",
  },
  NO_SOURCES: {
    title: "A claim with no provenance cannot be scored.",
    body: "Independence, reliability and recency are all read off the provenance graph. With no cited source there is no graph to read, so the gate returns no verdict at all rather than an unevidenced one. Nothing was written.",
  },
  UNKNOWN_AGENT: {
    title: "That agent is not in the graph.",
    body: "agent_id must already exist as an agent node. The engine will not create one as a side effect of a write. Pick an id from the harvested list, or check the spelling.",
  },
  UNKNOWN_SOURCE: {
    title: "A cited source is not in the graph.",
    body: "Each id in sources must already exist as a source node, because its trust and its origin edges are what the score is computed from. The ids the engine could not find are named below.",
  },
};

function SubmitFailure({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (!(error instanceof ApiError)) {
    return <ErrorView err={error} onRetry={onRetry} />;
  }

  if (error.code === "ENGINE_UNAVAILABLE" || error.code === "BOOT_ASSERTION_FAILED" || error.code === "NETWORK_UNREACHABLE") {
    return (
      <div className="space-y-3">
        <ErrorView err={error} onRetry={onRetry} />
        <p className="text-micro text-paper-faint">
          The write did not reach the gate, so no claim was created and no verdict was filed.
        </p>
      </div>
    );
  }

  const copy = ERROR_COPY[error.code];

  return (
    <div className="space-y-3">
      {copy ? (
        <Panel tone="block" className="p-5">
          <p className="text-micro font-medium uppercase tracking-[0.14em] text-block">
            {error.status} · {error.code.toLowerCase()}
          </p>
          <h3 className="mt-2 font-display text-title leading-tight">{copy.title}</h3>
          <p className="mt-2 text-fine text-paper-dim">{copy.body}</p>
        </Panel>
      ) : null}
      <ContractError err={error} onRetry={onRetry} />
    </div>
  );
}

/* ── Ruling ───────────────────────────────────────────────────────────────── */

function Ruling({ result }: { result: RememberResponse }) {
  return (
    <div className="space-y-5">
      <Panel
        tone={result.verdict === "ALLOW" ? "allow" : result.verdict === "BLOCK" ? "block" : "accent"}
        className="space-y-4 p-5"
      >
        <VerdictHeadline verdict={result.verdict} />

        <RecordedLine verdict={result.verdict} recorded={result.recorded} />

        <MarginBand margin={result.margin} epsilon={result.epsilon} size="lg" />

        <dl className="rule-t pt-2">
          <KeyValue k="slot_key">
            <Link
              href={`/slots/${encodeSlotKey(result.slot_key)}`}
              className="text-accent underline underline-offset-4 hover:text-paper"
            >
              {result.slot_key}
            </Link>
          </KeyValue>
          <KeyValue k="claim_id">{result.claim_id}</KeyValue>
          <KeyValue k="status">{result.status}</KeyValue>
          <KeyValue k="decided_at">
            {new Date(result.decided_at).toISOString().replace("T", " ").slice(0, 19)}Z
          </KeyValue>
        </dl>
      </Panel>

      <Panel tone="raised" className="p-5">
        <p className="text-micro font-medium uppercase tracking-[0.14em] text-paper-faint">
          the evidence for this ruling
        </p>
        <h3 className="mt-2 font-display text-lead leading-snug">
          Receipt <span className="font-mono text-accent">{result.receipt_id}</span>
        </h3>
        <p className="mt-2 text-fine text-paper-dim">
          Every verdict ships with one, on all three outcomes. It carries the components for each
          candidate, the independence witness, the reliability path, and each Cypher statement
          verbatim with its read command — so the ruling can be re-run rather than taken on
          assurance.
        </p>
        <Link
          href={`/receipts/${encodeURIComponent(result.receipt_id)}`}
          className="mt-3 inline-block text-fine text-accent underline underline-offset-4 hover:text-paper"
        >
          Open the receipt →
        </Link>
      </Panel>

      {result.verdict === "UNDECIDED" && result.review_id ? (
        <Panel tone="accent" className="p-5">
          <p className="text-micro font-medium uppercase tracking-[0.14em] text-undecided">
            queued, not dropped
          </p>
          <h3 className="mt-2 font-display text-lead leading-snug">
            Review item <span className="font-mono">{result.review_id}</span>
          </h3>
          <p className="mt-2 text-fine text-paper-dim">
            The margin fell inside the band, so the gate declined to separate the two claims on this
            evidence and filed the contest instead of deciding it.
          </p>
          <Link
            href="/review"
            className="mt-3 inline-block text-fine text-accent underline underline-offset-4 hover:text-paper"
          >
            Open the review queue →
          </Link>
        </Panel>
      ) : null}

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-micro uppercase tracking-[0.1em] text-paper-faint">
            the incoming claim
          </p>
          <ClaimCard
            claim={result.incoming}
            tone={result.verdict === "ALLOW" ? "allow" : result.verdict === "BLOCK" ? "block" : "base"}
            emphasis="independence"
            slotKey={result.slot_key}
          />
        </div>

        <div>
          <p className="mb-2 text-micro uppercase tracking-[0.1em] text-paper-faint">
            the incumbent
          </p>
          {result.incumbent === null ? (
            <Note title="The slot was uncontested.">
              Nothing held this slot, so the margin was computed against an incumbent score of{" "}
              <span className="figure text-paper">0.0</span>. There is no second card to show: the
              incoming claim had no opponent, and the band was applied to its own score alone.
            </Note>
          ) : (
            <ClaimCard claim={result.incumbent} emphasis="independence" slotKey={result.slot_key} />
          )}
        </div>
      </div>
    </div>
  );
}

function RecordedLine({ verdict, recorded }: { verdict: RememberResponse["verdict"]; recorded: boolean }) {
  if (!recorded) {
    return (
      <p className="text-fine text-block">
        The response reported <span className="font-mono">recorded: false</span>. The contract says
        this field is always true, so this is the engine disagreeing with its own contract.
      </p>
    );
  }

  if (verdict === "BLOCK") {
    return (
      <div className="rounded-md border border-rule bg-ink-0 p-3">
        <p className="font-display text-lead leading-snug text-paper">
          Refused, and recorded — a refused write is not dropped.
        </p>
        <p className="mt-1 text-fine text-paper-dim">
          <span className="font-mono text-paper">recorded: true</span>. The claim exists, it carries
          the status REFUSED, and it sits in the slot&rsquo;s history with its own receipt. The gate
          declined to let it take the slot; it did not pretend the assertion was never made.
        </p>
      </div>
    );
  }

  return (
    <p className="text-fine text-paper-dim">
      <span className="font-mono text-paper">recorded: true</span> — the claim is written to the
      graph and filed with its receipt.
    </p>
  );
}
