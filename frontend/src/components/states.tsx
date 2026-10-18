"use client";

import Link from "next/link";
import { ApiError, ENGINE_PIN, API_BASE } from "@/lib/api";
import { Button, Panel } from "./primitives";
import { Chip } from "./status";

/* ── Loading ─────────────────────────────────────────────────────────────── */

export function Skeleton({ rows = 3, label }: { rows?: number; label: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-3">
      <p className="text-fine text-paper-dim">{label}</p>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-lg border border-rule bg-ink-1"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

/* ── Empty / degenerate ──────────────────────────────────────────────────── */

export function Note({
  title,
  children,
  tone = "base",
}: {
  title: string;
  children?: React.ReactNode;
  tone?: "base" | "raised" | "accent";
}) {
  return (
    <Panel tone={tone} className="p-5">
      <h3 className="font-display text-lead leading-snug">{title}</h3>
      {children ? <div className="mt-1.5 text-fine text-paper-dim">{children}</div> : null}
    </Panel>
  );
}

/* ── Boot assertion failure — content, never a toast ─────────────────────── */

interface RawBootCheck {
  expected?: number;
  actual?: number;
  pass?: boolean;
}

const BOOT_LABELS: Record<string, string> = {
  node_split_echo: "node-split, echo control",
  node_split_independent: "node-split, independent control",
  sp_path_weight: "shortest-path weight control",
};

export function BootAssertionFailure({ err }: { err: ApiError }) {
  const raw = (err.bootChecks ?? {}) as Record<string, RawBootCheck | boolean>;
  const rows = Object.entries(raw).filter(
    ([k, v]) => k !== "passed" && typeof v === "object" && v !== null,
  ) as [string, RawBootCheck][];

  return (
    <Panel tone="block" className="p-5 sm:p-6">
      <p className="text-micro font-medium uppercase tracking-[0.14em] text-block">
        503 · boot_assertion_failed
      </p>
      <h2 className="mt-2 font-display text-title leading-tight">
        The engine refused to serve.
      </h2>
      <p className="mt-2 max-w-2xl text-fine text-paper-dim">
        A boot control did not reproduce, so the engine will not answer with numbers it cannot
        stand behind. No score, verdict or component is shown anywhere in this console while this
        holds — if the node-split is not in effect, every independence value in the graph is the
        wrong quantity, and showing it anyway is the exact defect the control exists to catch.
      </p>

      <p className="mt-4 text-fine text-paper">{err.message}</p>

      {rows.length > 0 ? (
        <table className="mt-4 w-full border-collapse text-fine">
          <thead>
            <tr className="text-micro uppercase tracking-[0.1em] text-paper-faint">
              <th className="rule-b py-2 text-left font-medium">control</th>
              <th className="rule-b py-2 text-right font-medium">expected</th>
              <th className="rule-b py-2 text-right font-medium">actual</th>
              <th className="rule-b py-2 text-right font-medium">result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, v]) => (
              <tr key={key}>
                <td className="rule-b py-2 pr-2">
                  <span className="font-mono text-micro text-paper-dim">{key}</span>
                  <span className="ml-2 text-paper-faint">{BOOT_LABELS[key] ?? ""}</span>
                </td>
                <td className="figure rule-b py-2 text-right">{v.expected ?? "—"}</td>
                <td className="figure rule-b py-2 text-right">{v.actual ?? "—"}</td>
                <td className="rule-b py-2 text-right">
                  <span className={v.pass ? "text-allow" : "text-block"}>
                    {v.pass ? "PASS" : "FAIL"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-4 text-micro text-paper-faint">
          The error body carried no <span className="font-mono">detail.boot_checks</span>, so the
          failing control cannot be named here.
        </p>
      )}
    </Panel>
  );
}

/* ── Engine unreachable ──────────────────────────────────────────────────── */

export function EngineUnavailable({
  err,
  onRetry,
}: {
  err: ApiError;
  onRetry?: () => void;
}) {
  return (
    <Panel tone="raised" className="p-5 sm:p-6">
      <p className="text-micro font-medium uppercase tracking-[0.14em] text-paper-faint">
        {err.status ? `${err.status} · ` : ""}
        {err.code.toLowerCase()}
      </p>
      <h2 className="mt-2 font-display text-title leading-tight">The engine is unreachable.</h2>
      <p className="mt-2 max-w-2xl text-fine text-paper-dim">
        The console is calling <span className="font-mono text-paper">{API_BASE}</span>, which
        fronts the pinned graph engine <span className="font-mono text-paper">{ENGINE_PIN}</span>.
        Nothing is shown in its place: there is no cached verdict and no placeholder figure in this
        console.
      </p>
      <p className="mt-3 text-fine text-paper">{err.message}</p>
      {onRetry ? (
        <Button tone="ghost" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </Panel>
  );
}

/* ── Not found ───────────────────────────────────────────────────────────── */

export function NotFound({
  err,
  backHref,
  backLabel,
}: {
  err: ApiError;
  backHref: string;
  backLabel: string;
}) {
  return (
    <Panel tone="raised" className="p-5 sm:p-6">
      <p className="text-micro font-medium uppercase tracking-[0.14em] text-paper-faint">
        404 · {err.code.toLowerCase()}
      </p>
      <h2 className="mt-2 font-display text-title leading-tight">Nothing is filed under that id.</h2>
      <p className="mt-2 text-fine text-paper-dim">{err.message}</p>
      <Link
        href={backHref}
        className="mt-4 inline-block text-fine text-accent underline underline-offset-4 hover:text-paper"
      >
        {backLabel} →
      </Link>
    </Panel>
  );
}

/* ── One renderer for every contract error ───────────────────────────────── */

export function ErrorView({
  err,
  onRetry,
  backHref,
  backLabel,
}: {
  err: unknown;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  if (!(err instanceof ApiError)) {
    return (
      <Panel tone="raised" className="p-5">
        <h2 className="font-display text-lead">The console failed before the engine answered.</h2>
        <p className="mt-2 text-fine text-paper-dim">
          {err instanceof Error ? err.message : String(err)}
        </p>
        {onRetry ? (
          <Button tone="ghost" className="mt-4" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </Panel>
    );
  }

  if (err.code === "BOOT_ASSERTION_FAILED") return <BootAssertionFailure err={err} />;
  if (err.code === "ENGINE_UNAVAILABLE" || err.code === "NETWORK_UNREACHABLE")
    return <EngineUnavailable err={err} onRetry={onRetry} />;
  if (
    (err.code === "SLOT_NOT_FOUND" || err.code === "RECEIPT_NOT_FOUND" || err.code === "REVIEW_NOT_FOUND") &&
    backHref &&
    backLabel
  )
    return <NotFound err={err} backHref={backHref} backLabel={backLabel} />;

  return <ContractError err={err} onRetry={onRetry} />;
}

export function ContractError({ err, onRetry }: { err: ApiError; onRetry?: () => void }) {
  const unknown = (err.detail as { unknown?: string[] }).unknown;
  const retryAfter = (err.detail as { retry_after_s?: number }).retry_after_s;

  return (
    <Panel tone="raised" className="p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="block">{err.code}</Chip>
        {err.status ? (
          <span className="font-mono text-micro text-paper-faint">HTTP {err.status}</span>
        ) : null}
        {err.field ? (
          <span className="font-mono text-micro text-paper-faint">field: {err.field}</span>
        ) : null}
      </div>
      <p className="mt-2 text-fine text-paper">{err.message}</p>
      {unknown?.length ? (
        <p className="mt-2 text-fine text-paper-dim">
          Not in the graph:{" "}
          {unknown.map((u, i) => (
            <span key={u}>
              {i > 0 ? ", " : ""}
              <span className="font-mono text-paper">{u}</span>
            </span>
          ))}
        </p>
      ) : null}
      {retryAfter !== undefined ? (
        <p className="mt-2 text-fine text-paper-dim">
          Rate limited. Retry after <span className="figure">{retryAfter}</span> s.
        </p>
      ) : null}
      {onRetry ? (
        <Button tone="ghost" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </Panel>
  );
}
