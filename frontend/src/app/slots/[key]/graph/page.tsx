"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { api, decodeSlotKey } from "@/lib/api";
import {
  claimNodes,
  isDerivation,
  isSplitEdge,
  nodeKind,
  splitPairs,
  splitSourceId,
  type SplitPair,
} from "@/lib/graph";
import type { GraphEdge, SlotGraph } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { HealthGate } from "@/components/HealthGate";
import { ErrorView, Note, Skeleton } from "@/components/states";
import { Eyebrow, Panel } from "@/components/primitives";

/* ── Hand layout. No graph library: the columns are the argument, so they are fixed. ──
 *
 *   col 1          col 2 — the split pairs                 col 3
 *   ss  ────────►  si:X ─── the vertex capacity ───► so:X  ────────►  claim
 *
 * The gap between si:X and so:X is drawn, never closed. That single unit-capacity edge
 * is what makes `independence` a count of VERTEX-disjoint chains rather than merely
 * edge-disjoint ones (CONTRACT.md §2.4, ROUTE-ARCHITECTURE.md §5).
 */
const L = {
  width: 640,
  padTop: 82,
  padBottom: 24,
  rowH: 74,
  ssX: 42,
  ssR: 19,
  halfW: 54,
  halfH: 30,
  siX: 196,
  soX: 326,
  claimX: 512,
  claimW: 126,
  claimH: 32,
};

interface Box {
  cx: number;
  cy: number;
  left: number;
  right: number;
}

interface Layout {
  boxes: Map<string, Box>;
  pairRows: { pair: SplitPair; y: number }[];
  claimRows: { id: string; caption: string; y: number }[];
  ssY: number;
  hasSuperSource: boolean;
  height: number;
}

function buildLayout(graph: SlotGraph, pairs: SplitPair[]): Layout {
  const claims = claimNodes(graph.nodes);
  const rows = Math.max(pairs.length, claims.length, 1);
  const span = rows * L.rowH;
  const height = L.padTop + span + L.padBottom;

  const boxes = new Map<string, Box>();

  const pairRows = pairs.map((pair, i) => {
    const y = L.padTop + i * L.rowH;
    boxes.set(pair.inId, {
      cx: L.siX,
      cy: y,
      left: L.siX - L.halfW / 2,
      right: L.siX + L.halfW / 2,
    });
    boxes.set(pair.outId, {
      cx: L.soX,
      cy: y,
      left: L.soX - L.halfW / 2,
      right: L.soX + L.halfW / 2,
    });
    return { pair, y };
  });

  const claimRows = claims.map((n, i) => {
    const y = L.padTop + (span / claims.length) * (i + 0.5) - L.rowH / 2;
    boxes.set(n.id, {
      cx: L.claimX,
      cy: y,
      left: L.claimX - L.claimW / 2,
      right: L.claimX + L.claimW / 2,
    });
    return { id: n.id, caption: n.caption, y };
  });

  const ssY = L.padTop + ((rows - 1) * L.rowH) / 2;
  const hasSuperSource = graph.nodes.some((n) => nodeKind(n.id) === "supersource");
  if (hasSuperSource) {
    boxes.set("ss", { cx: L.ssX, cy: ssY, left: L.ssX - L.ssR, right: L.ssX + L.ssR });
  }

  return { boxes, pairRows, claimRows, ssY, hasSuperSource, height };
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export default function SlotGraphPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params);
  const slotKey = decodeSlotKey(key);

  return (
    <div className="py-8 sm:py-12">
      <HealthGate loadingLabel="Asking the engine whether it is willing to serve this subgraph…">
        <SlotGraphBody slotKey={slotKey} encodedKey={key} />
      </HealthGate>
    </div>
  );
}

function SlotGraphBody({ slotKey, encodedKey }: { slotKey: string; encodedKey: string }) {
  const { phase, data, error, reload } = useAsync(() => api.slotGraph(slotKey), [slotKey]);

  if (phase === "loading") {
    return (
      <>
        <Eyebrow>provenance subgraph</Eyebrow>
        <h1 className="mb-6 font-display text-title leading-tight break-words">
          <span className="font-mono text-lead text-paper-dim">{slotKey}</span>
        </h1>
        <Skeleton rows={3} label="Reading the node-split DAG the max-flow runs over…" />
      </>
    );
  }

  if (phase === "error") {
    return (
      <ErrorView
        err={error}
        onRetry={reload}
        backHref={`/slots/${encodedKey}`}
        backLabel="Back to the slot"
      />
    );
  }

  return <SplitDrawing graph={data} encodedKey={encodedKey} />;
}

/* ── The drawing ──────────────────────────────────────────────────────────── */

function SplitDrawing({ graph, encodedKey }: { graph: SlotGraph; encodedKey: string }) {
  const claims = useMemo(() => claimNodes(graph.nodes), [graph.nodes]);
  const witnessKeys = Object.keys(graph.witness_sets);

  const [selected, setSelected] = useState<string | null>(
    () => witnessKeys[0] ?? claims[0]?.id ?? null,
  );

  const witness = useMemo(
    () => new Set(selected ? (graph.witness_sets[selected] ?? []) : []),
    [graph.witness_sets, selected],
  );

  const pairs = useMemo(
    () => splitPairs(graph.nodes, Array.from(witness)),
    [graph.nodes, witness],
  );

  const layout = useMemo(() => buildLayout(graph, pairs), [graph, pairs]);

  const nodeHot = (id: string): boolean => {
    const kind = nodeKind(id);
    if (kind === "supersource") return witness.size > 0;
    if (kind === "claim") return id === selected && witness.size > 0;
    const sid = splitSourceId(id);
    return sid !== null && witness.has(`so:${sid}`);
  };

  const selectedCaption =
    claims.find((c) => c.id === selected)?.caption ?? selected ?? "—";

  return (
    <article className="space-y-10">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header>
        <Link
          href={`/slots/${encodedKey}`}
          className="text-micro text-paper-faint underline-offset-4 transition-colors duration-(--duration-quick) hover:text-accent hover:underline"
        >
          ← Back to the slot
        </Link>
        <div className="mt-3">
          <Eyebrow>provenance subgraph</Eyebrow>
        </div>
        <h1 className="mt-1 font-display text-title leading-tight break-words">
          The split, drawn
        </h1>
        <p className="mt-1 font-mono text-fine text-paper-dim break-all">{graph.slot_key}</p>
        <p className="mt-3 max-w-2xl text-fine text-paper-dim">
          Every source in this subgraph appears twice: an in-node and an out-node, joined by a
          single unit-capacity edge. That hairline between the two halves is the vertex
          capacity. It is the reason two citations of the same source count once, and it is why{" "}
          <span className="text-paper">independence</span> is a count of vertex-disjoint chains
          rather than edge-disjoint ones. Collapsing the pair back into one glyph would erase
          the only thing this picture is for.
        </p>
      </header>

      {/* ── Claim selector ─────────────────────────────────────────────────── */}
      <section aria-labelledby="witness-h">
        <h2 id="witness-h" className="mb-1 font-display text-lead leading-snug">
          Highlight a witness set
        </h2>
        <p className="mb-3 max-w-2xl text-fine text-paper-dim">
          A witness set is the list of saturated out-nodes for one claim — the origins the flow
          actually came through. The number of origins highlighted below is that claim&apos;s
          independence integer: they are the same number, not two separate assertions. The
          integer itself is rendered on{" "}
          <Link
            href={`/slots/${encodedKey}`}
            className="text-accent underline underline-offset-4 transition-colors duration-(--duration-quick) hover:text-paper"
          >
            the slot
          </Link>
          .
        </p>

        {claims.length === 0 ? (
          <Note title="This subgraph carries no claim node.">
            Nothing contends for the slot, so there is no flow target and no witness set to
            highlight.
          </Note>
        ) : (
          <>
            <ul className="flex flex-wrap gap-2">
              {claims.map((c) => {
                const set = graph.witness_sets[c.id];
                const isOn = selected === c.id;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-pressed={isOn}
                      onClick={() => setSelected(isOn ? null : c.id)}
                      className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-fine transition-colors duration-(--duration-quick) ${
                        isOn
                          ? "border-accent-dim bg-accent-wash text-accent"
                          : "border-rule-strong bg-ink-2 text-paper-dim hover:border-accent-dim hover:text-paper"
                      }`}
                    >
                      <span className="font-mono text-micro">{c.id}</span>
                      {/* The caption is CSS-clipped to keep the selector row scannable, so the
                          full value must survive the clip twice over: a title for a pointer and
                          an sr-only copy for a screen reader. DESIGN_SYSTEM.md § Craft →
                          Identifiers: nothing is ever silently clipped. */}
                      <span className="max-w-40 truncate" title={c.caption} aria-hidden="true">
                        {c.caption}
                      </span>
                      <span className="sr-only">{c.caption}</span>
                      <span className="figure text-micro text-paper-faint">
                        {set === undefined ? "no set" : `${set.length} origin${set.length === 1 ? "" : "s"}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3" aria-live="polite">
              {witnessKeys.length === 0 ? (
                <Note title="No claim in this slot has an independence witness yet.">
                  The engine returned an empty <span className="font-mono">witness_sets</span>{" "}
                  map. That is a legitimate state of the payload, not a failure of this page and
                  not something still loading — the subgraph is drawn in full below, with nothing
                  highlighted.
                </Note>
              ) : selected === null ? (
                <p className="text-fine text-paper-faint">
                  Nothing selected. Pick a claim to highlight the origins its flow saturated.
                </p>
              ) : graph.witness_sets[selected] === undefined ? (
                <p className="text-fine text-paper-dim">
                  <span className="font-mono text-paper">{selected}</span> has no entry in{" "}
                  <span className="font-mono">witness_sets</span>, so no origin is highlighted
                  for it.
                </p>
              ) : (
                <p className="text-fine text-paper-dim">
                  <span className="figure text-accent">{witness.size}</span> saturated origin
                  {witness.size === 1 ? "" : "s"} highlighted for{" "}
                  <span className="font-mono text-paper">{selected}</span> ({selectedCaption}).
                  That count is this claim&apos;s independence integer — the picture and the
                  number are the same object.
                </p>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── The SVG ────────────────────────────────────────────────────────── */}
      <section aria-labelledby="drawing-h">
        <h2 id="drawing-h" className="mb-1 font-display text-lead leading-snug">
          The node-split DAG
        </h2>
        <p className="mb-3 text-micro text-paper-faint">
          Wider than a phone screen: the drawing scrolls sideways inside its own frame, the page
          does not.
        </p>

        <Panel tone="base" className="overflow-hidden p-0">
          <div className="overflow-x-auto p-3 sm:p-4">
            <svg
              role="img"
              aria-label={`Node-split provenance subgraph for slot ${graph.slot_key}: a super-source, ${layout.pairRows.length} split source pairs each drawn as two glyphs joined by a unit-capacity edge, and ${layout.claimRows.length} claim nodes. A full text rendering follows beneath the drawing.`}
              viewBox={`0 0 ${L.width} ${layout.height}`}
              preserveAspectRatio="xMidYMid meet"
              width="100%"
              className="block min-w-[34rem]"
              style={{ height: "auto" }}
            >
              <title>Node-split provenance subgraph for {graph.slot_key}</title>

              <defs>
                <marker
                  id="menger-arrow"
                  viewBox="0 0 8 8"
                  refX={7}
                  refY={4}
                  markerWidth={6}
                  markerHeight={6}
                  orient="auto-start-reverse"
                >
                  <path d="M0 1 L7 4 L0 7 z" className="fill-rule-strong" />
                </marker>
                <marker
                  id="menger-arrow-hot"
                  viewBox="0 0 8 8"
                  refX={7}
                  refY={4}
                  markerWidth={6}
                  markerHeight={6}
                  orient="auto-start-reverse"
                >
                  <path d="M0 1 L7 4 L0 7 z" className="fill-accent" />
                </marker>
              </defs>

              {/* column headers */}
              <g className="fill-paper-faint" fontSize={10} fontFamily="var(--font-mono)">
                <text x={L.ssX} y={26} textAnchor="middle">
                  ss
                </text>
                <text x={(L.siX + L.soX) / 2} y={26} textAnchor="middle">
                  split pairs
                </text>
                <text x={L.claimX} y={26} textAnchor="middle">
                  claims
                </text>
                <text x={(L.siX + L.soX) / 2} y={42} textAnchor="middle" className="fill-accent">
                  in ·|· out
                </text>
              </g>
              <line
                x1={12}
                y1={54}
                x2={L.width - 12}
                y2={54}
                className="stroke-rule"
                strokeWidth={1}
              />

              {/* edges first, so glyphs sit on top */}
              <g fill="none">
                {graph.edges.map((e, i) => (
                  <EdgeLine
                    key={`${e.from}->${e.to}-${e.type}-${i}`}
                    edge={e}
                    boxes={layout.boxes}
                    hot={nodeHot(e.from) && nodeHot(e.to)}
                  />
                ))}
              </g>

              {/* super-source */}
              {layout.hasSuperSource ? (
                <g>
                  <circle
                    cx={L.ssX}
                    cy={layout.ssY}
                    r={L.ssR}
                    className={`fill-ink-2 ${witness.size > 0 ? "stroke-accent" : "stroke-rule-strong"}`}
                    strokeWidth={1.5}
                  />
                  <text
                    x={L.ssX}
                    y={layout.ssY + 4}
                    textAnchor="middle"
                    fontSize={11}
                    fontFamily="var(--font-mono)"
                    className="fill-paper-dim"
                  >
                    ss
                  </text>
                </g>
              ) : null}

              {/* split pairs */}
              {layout.pairRows.map(({ pair, y }) => {
                const hot = witness.has(pair.outId);
                return (
                  <g key={pair.source_id}>
                    {/* caption + trust above the pair */}
                    <text
                      x={L.siX - L.halfW / 2}
                      y={y - L.halfH / 2 - 8}
                      fontSize={10}
                      fontFamily="var(--font-mono)"
                      className={hot ? "fill-accent" : "fill-paper-dim"}
                    >
                      {pair.caption}
                      <tspan className="fill-paper-faint">
                        {pair.trust === null ? "  trust n/a" : `  trust ${pair.trust.toFixed(2)}`}
                      </tspan>
                    </text>

                    <SplitHalf x={L.siX} y={y} label="in" hot={hot} />
                    <SplitHalf x={L.soX} y={y} label="out" hot={hot} />

                    {/* the saturated marker sits on the out half, which IS the witness node */}
                    {hot ? (
                      <circle
                        cx={L.soX + L.halfW / 2 + 8}
                        cy={y}
                        r={3.5}
                        className="fill-accent"
                      />
                    ) : null}
                  </g>
                );
              })}

              {/* claims */}
              {layout.claimRows.map(({ id, caption, y }) => {
                const hot = id === selected && witness.size > 0;
                return (
                  <g key={id}>
                    <rect
                      x={L.claimX - L.claimW / 2}
                      y={y - L.claimH / 2}
                      width={L.claimW}
                      height={L.claimH}
                      rx={4}
                      className={`fill-ink-2 ${hot ? "stroke-accent" : "stroke-rule-strong"}`}
                      strokeWidth={1.5}
                    />
                    <text
                      x={L.claimX}
                      y={y + 1}
                      textAnchor="middle"
                      fontSize={10}
                      fontFamily="var(--font-mono)"
                      className={hot ? "fill-accent" : "fill-paper-dim"}
                    >
                      {caption.length > 17 ? `${caption.slice(0, 16)}…` : caption}
                    </text>
                    <text
                      x={L.claimX}
                      y={y + L.claimH / 2 + 11}
                      textAnchor="middle"
                      fontSize={9}
                      fontFamily="var(--font-mono)"
                      className="fill-paper-faint"
                    >
                      {id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </Panel>

        <Legend />
      </section>

      {/* ── Parallel text rendering ────────────────────────────────────────── */}
      <section aria-labelledby="text-h">
        <h2 id="text-h" className="mb-1 font-display text-lead leading-snug">
          The same subgraph, in text
        </h2>
        <p className="mb-3 max-w-2xl text-fine text-paper-dim">
          A hand-drawn SVG is not readable by a screen reader, so the whole payload is also
          listed here. Nothing in the drawing is absent from this list.
        </p>

        <details className="rounded-lg border border-rule bg-ink-1">
          <summary className="cursor-pointer rounded-lg px-4 py-3 text-fine text-paper transition-colors duration-(--duration-quick) hover:bg-ink-2">
            {pairs.length} split {pairs.length === 1 ? "pair" : "pairs"} · {graph.edges.length}{" "}
            {graph.edges.length === 1 ? "edge" : "edges"} · {claims.length}{" "}
            {claims.length === 1 ? "claim" : "claims"}
          </summary>

          <div className="space-y-6 px-4 pb-4 pt-1">
            <div>
              <h3 className="text-micro uppercase tracking-[0.1em] text-paper-faint">
                split pairs
              </h3>
              {pairs.length === 0 ? (
                <p className="mt-1 text-fine text-paper-dim">
                  No source appears in this subgraph.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {pairs.map((p) => (
                    <li key={p.source_id} className="text-fine text-paper-dim">
                      <span className="font-mono text-paper">{p.inId}</span>
                      <span className="px-1.5 text-paper-faint">│</span>
                      <span className="font-mono text-paper">{p.outId}</span>
                      {" — "}
                      {p.caption}, trust{" "}
                      <span className="figure">
                        {p.trust === null ? "not carried on this node" : p.trust.toFixed(2)}
                      </span>
                      {witness.has(p.outId) ? (
                        <span className="text-accent"> · saturated for {selected}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-micro uppercase tracking-[0.1em] text-paper-faint">edges</h3>
              <ul className="mt-2 space-y-1.5">
                {graph.edges.map((e, i) => (
                  <li
                    key={`${e.from}->${e.to}-${e.type}-${i}`}
                    className="text-fine text-paper-dim"
                  >
                    <span className="font-mono text-paper">{e.from}</span> →{" "}
                    <span className="font-mono text-paper">{e.to}</span>{" "}
                    <span className="font-mono text-micro text-paper-faint">{e.type}</span>
                    {isSplitEdge(e) ? (
                      <span className="text-accent"> · the vertex capacity</span>
                    ) : null}
                    {" · cap "}
                    <span className="figure">{e.cap}</span>
                    {" · "}
                    {e.nl === null ? (
                      <span className="text-paper-faint">
                        {isDerivation(e)
                          ? "nl absent on this edge"
                          : "nl not carried on FLOW edges — they carry capacity, not weight"}
                      </span>
                    ) : (
                      <span className="figure">nl {e.nl.toFixed(5)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-micro uppercase tracking-[0.1em] text-paper-faint">
                witness sets
              </h3>
              {witnessKeys.length === 0 ? (
                <p className="mt-1 text-fine text-paper-dim">
                  Empty. No claim here has an independence witness yet.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {witnessKeys.map((cid) => (
                    <li key={cid} className="text-fine text-paper-dim">
                      <span className="font-mono text-paper">{cid}</span>
                      {" → "}
                      <span className="figure">{graph.witness_sets[cid].length}</span> saturated
                      origin{graph.witness_sets[cid].length === 1 ? "" : "s"}:{" "}
                      <span className="font-mono">
                        {graph.witness_sets[cid].join(", ") || "none"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </details>
      </section>
    </article>
  );
}

/* ── Glyphs ───────────────────────────────────────────────────────────────── */

function SplitHalf({
  x,
  y,
  label,
  hot,
}: {
  x: number;
  y: number;
  label: "in" | "out";
  hot: boolean;
}) {
  return (
    <>
      <rect
        x={x - L.halfW / 2}
        y={y - L.halfH / 2}
        width={L.halfW}
        height={L.halfH}
        rx={3}
        className={`fill-ink-2 ${hot ? "stroke-accent" : "stroke-rule-strong"}`}
        strokeWidth={1.5}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize={11}
        fontFamily="var(--font-mono)"
        className={hot ? "fill-accent" : "fill-paper-dim"}
      >
        {label}
      </text>
    </>
  );
}

function EdgeLine({
  edge,
  boxes,
  hot,
}: {
  edge: GraphEdge;
  boxes: Map<string, Box>;
  hot: boolean;
}) {
  const a = boxes.get(edge.from);
  const b = boxes.get(edge.to);
  if (!a || !b) return null;

  const stroke = hot ? "stroke-accent" : "stroke-rule-strong";
  const marker = hot ? "url(#menger-arrow-hot)" : "url(#menger-arrow)";
  const split = isSplitEdge(edge);

  if (isDerivation(edge)) {
    const d = `M ${a.right} ${a.cy} C ${a.right + 64} ${a.cy}, ${b.left - 64} ${b.cy}, ${b.left} ${b.cy}`;
    return (
      <path
        d={d}
        className={hot ? "stroke-accent" : "stroke-rule"}
        strokeWidth={1.25}
        strokeDasharray="4 3"
        markerEnd={marker}
      />
    );
  }

  return (
    <>
      <line
        x1={a.right}
        y1={a.cy}
        x2={b.left}
        y2={b.cy}
        className={stroke}
        strokeWidth={split ? 2.5 : 1.25}
        markerEnd={marker}
      />
      {split ? (
        <>
          {/* the hairline itself, named on the drawing */}
          <text
            x={(a.right + b.left) / 2}
            y={a.cy - 7}
            textAnchor="middle"
            fontSize={9}
            fontFamily="var(--font-mono)"
            className={hot ? "fill-accent" : "fill-paper-faint"}
          >
            cap {edge.cap}
          </text>
          <line
            x1={(a.right + b.left) / 2}
            y1={a.cy - 4}
            x2={(a.right + b.left) / 2}
            y2={a.cy + 4}
            className={hot ? "stroke-accent" : "stroke-paper-faint"}
            strokeWidth={1}
          />
        </>
      ) : null}
    </>
  );
}

/* ── Legend ───────────────────────────────────────────────────────────────── */

function Legend() {
  return (
    <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-fine sm:grid-cols-2">
      <LegendRow term="ss">
        The super-source. Its <span className="font-mono">trust</span> is{" "}
        <span className="font-mono">null</span>, which is normal — it is a flow construct, not a
        document.
      </LegendRow>
      <LegendRow term="in ·|· out">
        One source, drawn as two glyphs. Never collapsed.
      </LegendRow>
      <LegendRow term="thick solid, cap 1.0">
        The split edge between the halves: the vertex capacity. Competing chains through a
        shared source must share its one unit.
      </LegendRow>
      <LegendRow term="thin solid">
        A <span className="font-mono">FLOW</span> edge. It carries capacity, so its{" "}
        <span className="font-mono">nl</span> is <span className="font-mono">null</span> — that
        is the expected shape, not a missing figure.
      </LegendRow>
      <LegendRow term="dashed">
        A derivation edge — <span className="font-mono">DERIVED_FROM</span>, or a{" "}
        <span className="font-mono">FLOW</span> edge marked{" "}
        <span className="font-mono">kind=&quot;DERIVED&quot;</span> if the engine collapsed the
        two relationship types into one. These carry the negative-log weight the shortest-path
        read sums.
      </LegendRow>
      <LegendRow term="accent outline">
        In the highlighted witness set — a saturated origin for the selected claim.
      </LegendRow>
      <LegendRow term="claim box">
        A contending claim. Its <span className="font-mono">trust</span> is{" "}
        <span className="font-mono">null</span> too; trust lives on sources.
      </LegendRow>
    </dl>
  );
}

function LegendRow({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-32 shrink-0 font-mono text-micro text-paper">{term}</dt>
      <dd className="text-paper-dim">{children}</dd>
    </div>
  );
}
