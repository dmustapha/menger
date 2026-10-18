// Node-id discrimination, carried verbatim from CONTRACT.md §2.4 / ROUTE-ARCHITECTURE.md §5.
//
//   ss              -> the single :SuperSource
//   si:<source_id>  -> :SourceIn  half of a split pair
//   so:<source_id>  -> :SourceOut half of a split pair  (saturated so: nodes ARE the witness set)
//   <claim_id>      -> :Claim, bare, no prefix
//
// Parsing rule: split on the FIRST ':' only. Source ids may themselves contain ':'.

import type { GraphEdge, GraphNode, SlotGraph } from "./types";

export type NodeKind = "supersource" | "source_in" | "source_out" | "claim";

export function nodeKind(id: string): NodeKind {
  if (id === "ss") return "supersource";
  if (id.startsWith("si:")) return "source_in";
  if (id.startsWith("so:")) return "source_out";
  return "claim";
}

/** The source_id behind a split half, or null for ss / claim nodes. */
export function splitSourceId(id: string): string | null {
  const kind = nodeKind(id);
  if (kind !== "source_in" && kind !== "source_out") return null;
  return id.slice(3);
}

/** The other half of a split pair. si:x <-> so:x. Null when the id is not a split half. */
export function splitPartner(id: string): string | null {
  const sid = splitSourceId(id);
  if (sid === null) return null;
  return id.startsWith("si:") ? `so:${sid}` : `si:${sid}`;
}

export interface SplitPair {
  source_id: string;
  inId: string;
  outId: string;
  caption: string;
  trust: number | null;
  /** true when this pair's internal si->so edge is saturated for the focused claim. */
  isWitness: boolean;
}

/**
 * Group the SourceIn/SourceOut halves back into pairs FOR LAYOUT ONLY.
 * The two halves stay individually rendered — the split is visible on purpose
 * (CONTRACT.md §2.4). This never collapses them into one node.
 */
export function splitPairs(nodes: GraphNode[], witnessSet: string[] = []): SplitPair[] {
  const witness = new Set(witnessSet);
  const bySource = new Map<string, { in?: GraphNode; out?: GraphNode }>();

  for (const n of nodes) {
    const sid = splitSourceId(n.id);
    if (sid === null) continue;
    const slot = bySource.get(sid) ?? {};
    if (n.id.startsWith("si:")) slot.in = n;
    else slot.out = n;
    bySource.set(sid, slot);
  }

  const pairs: SplitPair[] = [];
  for (const [source_id, halves] of bySource) {
    const ref = halves.in ?? halves.out;
    if (!ref) continue;
    pairs.push({
      source_id,
      inId: `si:${source_id}`,
      outId: `so:${source_id}`,
      caption: stripHalfSuffix(ref.caption),
      trust: ref.trust,
      isWitness: witness.has(`so:${source_id}`),
    });
  }
  return pairs.sort((a, b) => Number(b.isWitness) - Number(a.isWitness) || a.source_id.localeCompare(b.source_id));
}

function stripHalfSuffix(caption: string): string {
  return caption.replace(/\s+(in|out)$/i, "");
}

export function claimNodes(nodes: GraphNode[]): GraphNode[] {
  return nodes.filter((n) => nodeKind(n.id) === "claim");
}

/** The internal si->so edge of a pair: the vertex capacity. */
export function isSplitEdge(e: GraphEdge): boolean {
  const from = splitSourceId(e.from);
  const to = splitSourceId(e.to);
  return from !== null && to !== null && from === to && e.from.startsWith("si:") && e.to.startsWith("so:");
}

export function edgesInto(graph: SlotGraph, nodeId: string): GraphEdge[] {
  return graph.edges.filter((e) => e.to === nodeId);
}

export function edgesOutOf(graph: SlotGraph, nodeId: string): GraphEdge[] {
  return graph.edges.filter((e) => e.from === nodeId);
}

/**
 * The one place an edge's meaning is decided. CONTRACT.md v1.0 distinguishes derivation by
 * relationship `type`; CL-F-009 RULING 2 may collapse it into `:FLOW {kind:'DERIVED'}`, in
 * which case `type` alone can no longer tell a split edge from a derivation. Both forms are
 * read here so neither shape renders a graph that quietly drops its derivation chains.
 */
export function isDerivation(e: GraphEdge): boolean {
  return e.type === "DERIVED_FROM" || e.kind === "DERIVED";
}

/**
 * Chains of derivation edges tell you which sources funnel into a shared upstream.
 * Returns, per split pair, the upstream split-in nodes it derives from.
 */
export function derivationMap(graph: SlotGraph): Map<string, GraphEdge[]> {
  const m = new Map<string, GraphEdge[]>();
  for (const e of graph.edges) {
    if (!isDerivation(e)) continue;
    const list = m.get(e.from) ?? [];
    list.push(e);
    m.set(e.from, list);
  }
  return m;
}
