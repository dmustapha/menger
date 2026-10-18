"use client";

/**
 * The landing route.
 *
 * The argument is made by an event, not by a sentence: a real write that cited two
 * documents, was scored `independence: 1`, and was refused — rendered beside the write
 * that cited two genuinely separate origins and was admitted at `independence: 2`.
 *
 * Nothing here is a build-time snapshot. The page derives its whole case at request time
 * from the live engine: /health for the boot controls and the corpus, /slots?contested=true
 * to find a real contested slot, /slots/{key} for the two claims, /slots/{key}/graph for the
 * witness sets. If the engine is down the page says so and shows no figures at all.
 */

import Link from "next/link";
import { api } from "@/lib/api";
import type { ScoredClaim, SlotDetail, SlotGraph, SlotRow } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { useHealth, HealthGate } from "@/components/HealthGate";
import { ClaimCard } from "@/components/ClaimCard";
import { ButtonLink, Eyebrow, Panel, SectionTitle } from "@/components/primitives";
import { MarginBand } from "@/components/scores";
import { ErrorView, Note, Skeleton } from "@/components/states";
import { StatusTag } from "@/components/status";
import { SplitMark } from "@/components/SplitMark";

export default function LandingPage() {
  return (
    <div className="space-y-14 pt-10 sm:pt-14">
      <Hero />
      <HealthGate loadingLabel="Reading the engine's boot controls…">
        <LiveStrip />
        <div className="mt-14">
          <MoneyShot />
        </div>
      </HealthGate>
      <Closing />
    </div>
  );
}

/* ── Hero ────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <header className="f-rise max-w-3xl">
      <Eyebrow>admission control for agent memory</Eyebrow>
      <h1 className="mt-3 font-display text-headline leading-[0.95] tracking-tight">
        Two citations are not two sources.
      </h1>
      <p className="mt-5 max-w-2xl text-lead leading-relaxed text-paper-dim">
        An agent asks the shared graph to remember something. MENGER answers{" "}
        <span className="text-allow">ALLOW</span>, <span className="text-block">BLOCK</span> or{" "}
        <span className="text-undecided">UNDECIDED</span> — and hands back a docket you can run
        again. Corroboration is counted as vertex-disjoint chains of provenance, so an echo of one
        document stays worth exactly one document.
      </p>
      <div className="mt-7 flex flex-wrap gap-2.5">
        <ButtonLink href="/remember" tone="primary">
          Ask it to remember something
        </ButtonLink>
        <ButtonLink href="/slots?contested=true">See a contested slot</ButtonLink>
        <ButtonLink href="/proof" tone="quiet">
          What was verified →
        </ButtonLink>
      </div>
    </header>
  );
}

/* ── Liveness, on arrival, without interaction ───────────────────────────── */

function LiveStrip() {
  const health = useHealth();
  if (!health) return null;

  const checks = [
    ["node_split_echo", health.boot_checks.node_split_echo],
    ["node_split_independent", health.boot_checks.node_split_independent],
    ["sp_path_weight", health.boot_checks.sp_path_weight],
  ] as const;

  return (
    <Panel tone="raised" className="f-rise overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 rule-b sm:px-5">
        <p className="text-micro uppercase tracking-[0.14em] text-paper-faint">
          answered just now by {health.engine.image}
        </p>
        <p className="text-micro text-paper-faint">
          read path <span className="font-mono text-paper-dim">{health.engine.read_path}</span> ·
          graph <span className="font-mono text-paper-dim">{health.engine.graph}</span>
        </p>
      </div>

      <div className="grid sm:grid-cols-3">
        {checks.map(([key, c], i) => (
          <div
            key={key}
            className={`px-4 py-3 sm:px-5 ${
              i > 0 ? "border-t border-rule sm:border-t-0 sm:border-l" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-micro text-paper-dim">{key}</span>
              <StatusTag token={c.pass ? "PASS" : "FAIL"} />
            </div>
            <p className="mt-1.5 text-micro text-paper-faint">
              expected <span className="figure text-paper-dim">{c.expected}</span> · got{" "}
              <span className="figure text-paper-dim">{c.actual}</span>
            </p>
          </div>
        ))}
      </div>

      <dl className="grid grid-cols-2 rule-t sm:grid-cols-5">
        <Figure k="agents" v={health.corpus.agents} />
        <Figure k="sources" v={health.corpus.sources} />
        <Figure k="claims" v={health.corpus.claims} />
        <Figure k="slots" v={health.corpus.slots} />
        <div className="col-span-2 border-t border-rule px-4 py-3 sm:col-span-1 sm:border-t-0 sm:border-l sm:px-5">
          <dt className="text-micro uppercase tracking-[0.1em] text-paper-faint">ε / λ</dt>
          <dd className="figure mt-0.5 text-fine text-paper">
            {health.epsilon} / {health.lambda}
          </dd>
          <p className="mt-0.5 text-micro text-paper-faint">engine constants, not ours</p>
        </div>
      </dl>
    </Panel>
  );
}

function Figure({ k, v }: { k: string; v: number }) {
  return (
    <div className="border-rule px-4 py-3 sm:border-l sm:px-5 sm:first:border-l-0">
      <dt className="text-micro uppercase tracking-[0.1em] text-paper-faint">{k}</dt>
      <dd className="figure mt-0.5 text-lead text-paper">{v}</dd>
    </div>
  );
}

/* ── The money shot ──────────────────────────────────────────────────────── */

interface Case {
  row: SlotRow;
  detail: SlotDetail;
  graph: SlotGraph | null;
  /** whether the engine actually had a refusal on file, or we fell back to a contest */
  basis: "refusal" | "contest";
}

async function loadCase(): Promise<Case | null> {
  const list = await api.slots({ contested: true, limit: 25 });
  const refused = list.slots.find((s) => s.last_verdict === "BLOCK");
  const row =
    refused ?? [...list.slots].sort((a, b) => b.claim_count - a.claim_count)[0] ?? null;
  if (!row) return null;

  const detail = await api.slot(row.slot_key);
  let graph: SlotGraph | null = null;
  try {
    graph = await api.slotGraph(row.slot_key);
  } catch {
    // The subgraph is an enrichment here, not the argument. Its absence costs the
    // witness strip and nothing else — it must not take the refusal off the page.
    graph = null;
  }
  return { row, detail, graph, basis: refused ? "refusal" : "contest" };
}

function MoneyShot() {
  const { phase, data, error, reload } = useAsync(loadCase, []);

  if (phase === "loading")
    return <Skeleton rows={2} label="Finding a slot where two agents disagreed…" />;
  if (phase === "error") return <ErrorView err={error} onRetry={reload} />;

  if (!data) {
    return (
      <Note title="No slot in this corpus is contested.">
        Every slot holds at most one claim, so there is nothing for the gate to weigh yet. Write a
        second claim into an occupied slot from{" "}
        <Link href="/remember" className="text-accent underline underline-offset-4">
          /remember
        </Link>{" "}
        and the refusal will appear here.
      </Note>
    );
  }

  const { detail, row, graph, basis } = data;
  const byRank = rankedClaims(detail);
  const loser = byRank.find((c) => c.status === "REFUSED") ?? byRank[1] ?? null;
  const winner = byRank.find((c) => c.status === "ADMITTED") ?? byRank[0] ?? null;
  const witness = (id: string) => graph?.witness_sets?.[id];

  return (
    <section aria-labelledby="money-shot">
      <div className="mb-4">
        <Eyebrow>
          {basis === "refusal"
            ? "a refusal already on file in this graph"
            : "the closest contest on file — this slot has not been decided yet"}
        </Eyebrow>
        <h2 id="money-shot" className="mt-2 font-display text-title leading-tight tracking-tight">
          {loser && winner
            ? "Same slot. Two claims. One of them is an echo."
            : "A contested slot, as the engine holds it."}
        </h2>
        <p className="mt-1.5 max-w-2xl text-fine text-paper-dim">
          <span className="font-mono text-paper">{detail.subject}</span>{" "}
          <span className="font-mono text-paper-faint">{detail.predicate}</span> — read live from{" "}
          <span className="font-mono">/slots/{row.slot_key}</span>.{" "}
          {row.last_verdict ? (
            <>
              Last decided <StatusTag token={row.last_verdict} /> at{" "}
              {row.last_decided_at ?? "an unrecorded time"}.
            </>
          ) : (
            "No verdict has been issued on this slot yet."
          )}
        </p>
      </div>

      {loser && winner ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <CaseColumn
            caption="cited two documents · counted as one origin"
            detail="Both citations trace back through the same source node. The split edge that node sits on carries one unit, so the flow through it is one — and that is the independence figure, not a penalty applied afterwards."
            claim={loser}
            tone="block"
            witness={witness(loser.claim_id)}
            slotKey={detail.slot_key}
          />
          <CaseColumn
            caption="cited two documents · counted as two origins"
            detail="These two chains share no vertex anywhere between the super-source and the claim, so two units of flow get through. Same citation count, different provenance, different number."
            claim={winner}
            tone="allow"
            witness={witness(winner.claim_id)}
            slotKey={detail.slot_key}
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {byRank.slice(0, 2).map((c, i) => (
            <ClaimCard
              key={c.claim_id}
              claim={c}
              rank={i + 1}
              tone={i === 0 ? "accent" : "base"}
              emphasis="independence"
              witness={witness(c.claim_id)}
              slotKey={detail.slot_key}
            />
          ))}
        </div>
      )}

      <Panel className="mt-4 p-4 sm:p-5">
        {detail.top_margin === null ? (
          <p className="text-fine text-paper-dim">
            Only one claim contends in this slot, so there is no margin to draw — a margin is the
            distance between two claims, and there is no second one here.
          </p>
        ) : (
          <MarginBand margin={detail.top_margin} epsilon={detail.epsilon} size="lg" />
        )}
        <div className="mt-4 flex flex-wrap gap-2.5">
          <ButtonLink href={`/slots/${encodeURIComponent(detail.slot_key)}/graph`} tone="primary">
            <SplitMark className="h-4 w-4" />
            See where the split happens
          </ButtonLink>
          <ButtonLink href={`/slots/${encodeURIComponent(detail.slot_key)}`}>
            Open the slot
          </ButtonLink>
          {row.last_receipt_id ? (
            <ButtonLink href={`/receipts/${encodeURIComponent(row.last_receipt_id)}`} tone="quiet">
              Read the docket →
            </ButtonLink>
          ) : null}
        </div>
      </Panel>
    </section>
  );
}

function rankedClaims(detail: SlotDetail): ScoredClaim[] {
  const byId = new Map(detail.claims.map((c) => [c.claim_id, c]));
  const ordered = detail.ranking.map((id) => byId.get(id)).filter((c): c is ScoredClaim => !!c);
  const seen = new Set(ordered.map((c) => c.claim_id));
  // A claim the engine did not rank is still a claim. It is appended, and it is not
  // given a rank number we would have had to invent.
  return [...ordered, ...detail.claims.filter((c) => !seen.has(c.claim_id))];
}

function CaseColumn({
  caption,
  detail,
  claim,
  tone,
  witness,
  slotKey,
}: {
  caption: string;
  detail: string;
  claim: ScoredClaim;
  tone: "allow" | "block";
  witness?: string[];
  slotKey: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <p
          className={`text-micro font-medium uppercase tracking-[0.12em] ${
            tone === "block" ? "text-block" : "text-allow"
          }`}
        >
          {caption}
        </p>
        <p className="mt-1 text-fine leading-relaxed text-paper-dim">{detail}</p>
      </div>
      <ClaimCard
        claim={claim}
        tone={tone}
        emphasis="independence"
        witness={witness}
        slotKey={slotKey}
      />
    </div>
  );
}

/* ── Closing ─────────────────────────────────────────────────────────────── */

function Closing() {
  return (
    <section className="rule-t pt-10">
      <SectionTitle sub="Every verdict leaves a docket: the statements that ran, verbatim, with the witness set and the weighted path that produced each figure. Run it again and the console shows you what moved and why.">
        A decision you can re-execute.
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-3">
        <Panel className="p-4">
          <h3 className="font-display text-lead">Three readings, never one</h3>
          <p className="mt-1.5 text-fine text-paper-dim">
            Independence is an integer, reliability and recency are decays. They are ranked
            together and displayed apart — the rank figure is ordinal, not a probability.
          </p>
        </Panel>
        <Panel className="p-4">
          <h3 className="font-display text-lead">Nothing is thrown away</h3>
          <p className="mt-1.5 text-fine text-paper-dim">
            A write inside the ε band is neither admitted nor refused. It is queued, with both
            contenders and the margin, in{" "}
            <Link href="/review" className="text-accent underline underline-offset-4">
              the review queue
            </Link>
            .
          </p>
        </Panel>
        <Panel className="p-4">
          <h3 className="font-display text-lead">The controls run at boot</h3>
          <p className="mt-1.5 text-fine text-paper-dim">
            If the node-split is not in effect, every independence figure in the graph is the wrong
            quantity. The engine asserts it on startup and refuses to serve when it does not
            reproduce.{" "}
            <Link href="/proof" className="text-accent underline underline-offset-4">
              See the controls
            </Link>
            .
          </p>
        </Panel>
      </div>
    </section>
  );
}
