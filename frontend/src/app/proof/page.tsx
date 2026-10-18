"use client";

import Link from "next/link";
import { api, API_BASE } from "@/lib/api";
import type { BootCheck, Health } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { ErrorView, Skeleton } from "@/components/states";
import { Eyebrow, KeyValue, Mono, Panel } from "@/components/primitives";
import { StatusTag } from "@/components/status";

/**
 * /proof — the judge route.
 *
 * Deliberately NOT wrapped in <HealthGate>. A page whose argument goes blank when the
 * engine is down argues nothing (ROUTE-ARCHITECTURE.md §3). The live half fetches
 * /health on its own and degrades inside its own section; the standing argument below
 * renders either way, and the page says at the top which is which.
 *
 * No score, verdict or component appears anywhere on this page, so the global
 * BOOT_ASSERTION_FAILED rule ("render no numbers of that kind") is satisfied by
 * construction rather than by a conditional.
 */

const CONTROLS: { key: keyof Omit<Health["boot_checks"], "passed">; name: string; catches: string }[] = [
  {
    key: "node_split_echo",
    name: "node-split · echo control",
    catches:
      "Two citations that funnel through one shared origin. If this control stops reproducing, the split is not in effect, the max-flow is counting edge-disjoint paths, and every independence figure in the graph is the wrong quantity — echoes would be scored as corroboration.",
  },
  {
    key: "node_split_independent",
    name: "node-split · independent control",
    catches:
      "The opposite failure. Two genuinely separate origins must still count separately; a split wired too tightly, or a capacity set below one unit, would collapse honest independent provenance down with the echoes and make the gate refuse good writes.",
  },
  {
    key: "sp_path_weight",
    name: "shortest-path weight control",
    catches:
      "The weighted sum along the provenance path, pinned to a control value. A near-miss weight key is accepted silently and returns hop count instead — an integer that looks entirely plausible. This control is the only thing standing between a weighted reliability figure and a path length wearing its clothes.",
  },
];

export default function ProofPage() {
  return (
    <div className="py-8 sm:py-12">
      <article className="space-y-12">
        {/* ── Header: say which half is live ────────────────────────────── */}
        <header>
          <Eyebrow>what was verified</Eyebrow>
          <h1 className="mt-1 font-display text-title leading-tight">
            Two halves, and only one of them is live
          </h1>
          <p className="mt-3 max-w-2xl text-fine text-paper-dim">
            The first half below is read from{" "}
            <Mono>GET /health</Mono> at <Mono>{API_BASE}</Mono> when this page loads. Every
            figure in it comes out of that response; none of it is written into the console
            source, and none of it is a build-time snapshot. If the engine is unreachable, that
            section says so and shows nothing in its place.
          </p>
          <p className="mt-2 max-w-2xl text-fine text-paper-dim">
            The second half is a standing argument — prose about why the reads are shaped the
            way they are. It carries no measurements and stands whether or not the engine
            answers.
          </p>
        </header>

        <LiveHalf />
        <StandingArgument />

        {/* ── Links out ──────────────────────────────────────────────────── */}
        <section aria-labelledby="next-h">
          <h2 id="next-h" className="mb-3 font-display text-lead leading-snug">
            Check it yourself
          </h2>
          <ul className="space-y-2 text-fine">
            <li>
              <Link
                href="/slots?contested=true"
                className="text-accent underline underline-offset-4 transition-colors duration-(--duration-quick) hover:text-paper"
              >
                Every contested slot →
              </Link>{" "}
              <span className="text-paper-dim">
                — the slots with more than one claim, where the ranking actually has to decide
                something.
              </span>
            </li>
            <li>
              <Link
                href="/slots"
                className="text-accent underline underline-offset-4 transition-colors duration-(--duration-quick) hover:text-paper"
              >
                Every slot, and from any of them its receipts →
              </Link>{" "}
              <span className="text-paper-dim">
                — a receipt id is issued by the engine, so this page will not invent one. Open a
                slot and follow its own last receipt.
              </span>
            </li>
          </ul>
        </section>
      </article>
    </div>
  );
}

/* ── Live half ────────────────────────────────────────────────────────────── */

function LiveHalf() {
  const { phase, data, error, reload } = useAsync(() => api.health(), []);

  return (
    <section aria-labelledby="live-h">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="live-h" className="font-display text-lead leading-snug">
          Live — read from the engine just now
        </h2>
        <span className="text-micro uppercase tracking-[0.1em] text-accent">this half is live</span>
      </div>

      {phase === "loading" ? (
        <Skeleton rows={3} label="Asking the engine to publish its boot controls…" />
      ) : phase === "error" ? (
        <>
          <p className="mb-3 max-w-2xl text-fine text-paper-dim">
            The live half could not be read. Nothing is shown in its place — no cached control
            value, no remembered figure. The standing argument below is unaffected and continues.
          </p>
          <ErrorView err={error} onRetry={reload} />
        </>
      ) : (
        <HealthReport health={data} />
      )}
    </section>
  );
}

function HealthReport({ health }: { health: Health }) {
  const checks = health.boot_checks;

  return (
    <div className="space-y-6">
      {/* boot controls */}
      <Panel tone={checks.passed ? "base" : "block"} className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h3 className="font-display text-lead leading-snug">Boot controls</h3>
          <StatusTag token={checks.passed ? "PASS" : "FAIL"} size="lg" />
        </div>
        <p className="mt-2 max-w-2xl text-fine text-paper-dim">
          Three assertions run before the service agrees to answer anything. If any one of them
          does not reproduce, the engine returns <Mono>503</Mono> and serves nothing — it would
          rather refuse than publish a headline figure it cannot stand behind. Each expected
          value below arrives in the payload; the console does not carry a copy of any of them.
        </p>

        <ul className="mt-4 space-y-3">
          {CONTROLS.map((c) => (
            <ControlRow key={c.key} name={c.name} id={c.key} check={checks[c.key]} catches={c.catches} />
          ))}
        </ul>
      </Panel>

      {/* engine pin + constants */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel tone="base" className="p-4 sm:p-5">
          <h3 className="mb-2 font-display text-lead leading-snug">The engine it is talking to</h3>
          <dl className="divide-y divide-rule">
            <KeyValue k="image">{health.engine.image}</KeyValue>
            <KeyValue k="graph">{health.engine.graph}</KeyValue>
            <KeyValue k="read path">{health.engine.read_path}</KeyValue>
            <KeyValue k="ok">{String(health.ok)}</KeyValue>
          </dl>
          <p className="mt-3 text-micro text-paper-faint">
            The pin is named so a reader can reproduce the same engine rather than take the
            behaviour on report. The read path is the containment boundary described below.
          </p>
        </Panel>

        <Panel tone="base" className="p-4 sm:p-5">
          <h3 className="mb-2 font-display text-lead leading-snug">
            Server constants and the corpus
          </h3>
          <dl className="divide-y divide-rule">
            <KeyValue k="epsilon">{health.epsilon}</KeyValue>
            <KeyValue k="lambda">{health.lambda}</KeyValue>
            <KeyValue k="seeded at">{health.seeded_at}</KeyValue>
            <KeyValue k="agents">{health.corpus.agents}</KeyValue>
            <KeyValue k="sources">{health.corpus.sources}</KeyValue>
            <KeyValue k="claims">{health.corpus.claims}</KeyValue>
            <KeyValue k="slots">{health.corpus.slots}</KeyValue>
          </dl>
          <p className="mt-3 text-micro text-paper-faint">
            ε and λ are server constants and are published here rather than chosen by the
            console. They are unmeasured defaults, standing until they are calibrated against the
            corpus. Every surface that shows a margin shows the ε it was compared against,
            read from the same response that carried the margin.
          </p>
          {health.corpus.claims === 0 || health.corpus.slots === 0 ? (
            <p className="mt-3 text-fine text-block">
              The corpus counts are zero: the graph is reachable but not seeded. An empty slot
              list downstream is that, not a result.
            </p>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}

function ControlRow({
  name,
  id,
  check,
  catches,
}: {
  name: string;
  id: string;
  check: BootCheck | undefined;
  catches: string;
}) {
  if (!check) {
    return (
      <li className="rounded-md border border-rule bg-ink-0 p-3">
        <p className="font-mono text-fine text-paper">{id}</p>
        <p className="mt-1 text-fine text-paper-dim">
          The response carried no entry for this control, so nothing can be reported for it here.
        </p>
      </li>
    );
  }

  return (
    <li className="rounded-md border border-rule bg-ink-0 p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="font-mono text-micro text-paper-dim">{id}</p>
          <p className="text-fine text-paper">{name}</p>
        </div>
        <StatusTag token={check.pass ? "PASS" : "FAIL"} />
      </div>

      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
        <div className="flex items-baseline gap-2">
          <dt className="text-micro uppercase tracking-[0.1em] text-paper-faint">expected</dt>
          <dd className="figure text-fine text-paper">{check.expected}</dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="text-micro uppercase tracking-[0.1em] text-paper-faint">actual</dt>
          <dd className={`figure text-fine ${check.pass ? "text-paper" : "text-block"}`}>
            {check.actual}
          </dd>
        </div>
      </dl>

      <p className="mt-2 max-w-2xl text-fine text-paper-dim">{catches}</p>
    </li>
  );
}

/* ── Standing argument ────────────────────────────────────────────────────── */

function StandingArgument() {
  return (
    <section aria-labelledby="static-h">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="static-h" className="font-display text-lead leading-snug">
          Standing — why the reads are shaped this way
        </h2>
        <span className="text-micro uppercase tracking-[0.1em] text-paper-faint">
          this half is prose, not a measurement
        </span>
      </div>

      <div className="space-y-4">
        <Argument title="Max-flow counts edge-disjoint paths. The question was about vertices.">
          <p>
            <Mono>algo.maxFlow</Mono> over unit-capacity edges returns the number of{" "}
            <em>edge</em>-disjoint paths from the super-source to a claim. That is not the
            quantity this gate needs. Two citations that both pass through one shared upstream
            source are two distinct edge-disjoint routes, and counting them as two is exactly
            how an echo chamber is mistaken for corroboration.
          </p>
          <p className="mt-2">
            So every source is split into an in-node and an out-node joined by a single
            unit-capacity edge. That one edge is the vertex capacity: all flow through the
            source must pass through it, and it can carry one unit. Competing chains sharing an
            origin now have to share its single unit, and the max-flow over the split graph is a
            count of <em>vertex</em>-disjoint chains. Remove the split edge, or raise its
            capacity, and the figure silently reverts to the edge-disjoint count — the same
            number for honest provenance, a larger one for an echo. The echo control exists to
            notice precisely that reversion, and the drawing on any slot graph page shows the
            hairline being relied upon.
          </p>
        </Argument>

        <Argument title="One weight key works. The near-misses fail quietly.">
          <p>
            <Mono>algo.SPpaths</Mono> takes the weight key <Mono>weightProp</Mono>. The obvious
            alternatives — <Mono>weightProperty</Mono>, <Mono>relationshipWeightProperty</Mono>,{" "}
            <Mono>costProperty</Mono> — are accepted with no error and no warning, and the call
            returns hop count instead of the weighted sum.
          </p>
          <p className="mt-2">
            That is the dangerous shape of failure: hop count is a small, plausible, monotone
            integer, and a reliability figure derived from it looks completely ordinary. It
            would be wrong on every path where weights differ and right by coincidence where
            they do not. So a control value is pinned and asserted at boot against a path whose
            weighted sum is not an integer. A weighted sum cannot be mistaken for a hop count
            when it is not a whole number, which is what makes the assertion discriminating
            rather than decorative. When it reproduces, the right key was used.
          </p>
        </Argument>

        <Argument title="The score is ordinal, and the three components are never blended.">
          <p>
            Independence is an integer count of vertex-disjoint chains. Reliability is a decay
            over the summed negative-log trust along the provenance path. Recency is a decay
            over age. They are different kinds of quantity, measured on different scales, and
            there is no defensible exchange rate between them.
          </p>
          <p className="mt-2">
            The score exists only to order candidates within one slot. It is not a percentage,
            not a confidence, not a probability, and nothing in this console renders it as one.
            Wherever a score appears it carries its ordinal flag, and the three components are
            printed beside it separately so a reader can see which one is doing the work. A
            single blended figure would hide the only interesting case — a claim that is widely
            echoed but barely independent.
          </p>
        </Argument>

        <Argument title="The read path is read-only, and that is enforced by the server.">
          <p>
            Every read is issued on the read-only graph command. A write attempted on that path
            is rejected by the engine itself, not by a filter in the application. The difference
            is the whole point: a client-side blocklist is a promise that a sufficiently odd
            generated statement can walk around, while a server-side rejection is a property of
            the command being used.
          </p>
          <p className="mt-2">
            The replay guarantee rests on it. A receipt can only be said to re-execute against
            an unmutated graph if the reads could not have mutated it, so the read path is
            recorded on every receipt alongside the exact parameterised Cypher that ran. This
            also fixes the stack: the read-only command is exposed by the Python client and not
            by the TypeScript one, which is why the engine is Python and not a preference.
          </p>
        </Argument>

        <Argument title="What this page does not say.">
          <p>
            No latency figure, no verdict and no component value appears here. This route
            reports what the engine asserted about itself at boot and the reasoning behind the
            shape of the reads; anything measured belongs beside the measurement, on the slot,
            the receipt and the replay. An honesty note moved away from the figure it qualifies
            becomes a disclaimer, and a disclaimer reads as a confession.
          </p>
        </Argument>
      </div>
    </section>
  );
}

function Argument({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel tone="base" className="p-4 sm:p-5">
      <h3 className="font-display text-lead leading-snug">{title}</h3>
      <div className="mt-2 max-w-3xl text-fine text-paper-dim">{children}</div>
    </Panel>
  );
}
