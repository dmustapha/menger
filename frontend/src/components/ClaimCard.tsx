import Link from "next/link";
import type { ScoredClaim } from "@/lib/types";
import { ComponentTriple, OrdinalScore } from "./scores";
import { Panel } from "./primitives";
import { StatusTag } from "./status";
import { WitnessStrip } from "./WitnessStrip";

export function ClaimCard({
  claim,
  rank,
  witness,
  tone = "base",
  emphasis = "none",
  slotKey,
}: {
  claim: ScoredClaim;
  rank?: number;
  /** so:<source_id> ids from witness_sets[claim_id]; length equals independence. */
  witness?: string[];
  tone?: "base" | "raised" | "accent" | "allow" | "block";
  emphasis?: "none" | "independence";
  slotKey?: string;
}) {
  return (
    <Panel tone={tone} className="flex h-full flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-lead leading-tight break-words">{claim.object}</p>
          <p className="mt-0.5 text-micro text-paper-faint">
            <span className="font-mono">{claim.claim_id}</span> · asserted by{" "}
            <span className="font-mono text-paper-dim">{claim.agent_name}</span> ·{" "}
            {new Date(claim.asserted_at).toISOString().replace("T", " ").slice(0, 16)}Z
          </p>
        </div>
        <StatusTag token={claim.status} />
      </div>

      <ComponentTriple components={claim.components} emphasis={emphasis} dense />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <OrdinalScore score={claim.score} rank={rank} />
        {slotKey ? (
          <Link
            href={`/slots/${encodeURIComponent(slotKey)}/graph`}
            className="text-micro text-accent underline underline-offset-4 hover:text-paper"
          >
            see its provenance →
          </Link>
        ) : null}
      </div>

      <div className="mt-auto">
        <p className="mb-1.5 text-micro uppercase tracking-[0.1em] text-paper-faint">
          cited sources ({claim.sources.length})
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {claim.sources.map((s) => (
            <li
              key={s.source_id}
              className="rounded-sm border border-rule bg-ink-0 px-2 py-1 font-mono text-micro text-paper-dim"
              title={`${s.kind} · trust ${s.trust}${s.is_origin ? " · origin" : ""}`}
            >
              {s.source_id}
              <span className="ml-1.5 text-paper-faint">{s.trust}</span>
            </li>
          ))}
        </ul>
        {witness ? <WitnessStrip witness={witness} independence={claim.components.independence} /> : null}
      </div>
    </Panel>
  );
}
