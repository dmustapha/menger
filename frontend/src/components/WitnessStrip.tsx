import { splitSourceId } from "@/lib/graph";

/**
 * The witness set and the independence integer are the same object, not two assertions:
 * the saturated `so:` nodes ARE the independent origins, and the length of the set equals
 * `independence`. When they disagree, say so rather than picking one — that disagreement
 * is exactly the thing a judge is checking for.
 */
export function WitnessStrip({
  witness,
  independence,
}: {
  witness: string[];
  independence: number;
}) {
  const agrees = witness.length === independence;

  return (
    <div className="mt-3 rounded-md border border-rule bg-ink-0 p-2.5">
      <p className="text-micro uppercase tracking-[0.1em] text-paper-faint">
        max-flow witness set
      </p>
      {witness.length === 0 ? (
        <p className="mt-1 text-micro text-paper-dim">
          No saturated split node — this claim has no independence witness in the subgraph yet.
        </p>
      ) : (
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {witness.map((id) => (
            <li
              key={id}
              className="rounded-sm bg-accent-wash px-2 py-0.5 font-mono text-micro text-accent ring-1 ring-inset ring-accent-dim"
            >
              {splitSourceId(id) ?? id}
            </li>
          ))}
        </ul>
      )}
      <p className={`mt-1.5 text-micro ${agrees ? "text-paper-faint" : "text-block"}`}>
        {agrees
          ? `${witness.length} saturated origin${witness.length === 1 ? "" : "s"} = independence ${independence}.`
          : `${witness.length} saturated origin(s) against independence ${independence} — these must match, and here they do not.`}
      </p>
    </div>
  );
}
