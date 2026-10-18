import Link from "next/link";
import type { ReactNode } from "react";

/* ── Card ────────────────────────────────────────────────────────────────── */

export function Panel({
  children,
  tone = "base",
  className = "",
  as: As = "div",
}: {
  children: ReactNode;
  tone?: "base" | "raised" | "accent" | "allow" | "block";
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  const tones: Record<string, string> = {
    base: "bg-ink-1 border-rule",
    raised: "bg-ink-2 border-rule-strong",
    accent: "bg-ink-2 border-accent-dim shadow-glow",
    allow: "bg-ink-2 border-allow/40 shadow-glow-allow",
    block: "bg-ink-2 border-block/40 shadow-glow-block",
  };
  return (
    <As className={`rounded-lg border ${tones[tone]} ${className}`}>{children}</As>
  );
}

/* ── Section heading ─────────────────────────────────────────────────────── */

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-micro font-medium uppercase tracking-[0.14em] text-paper-faint">
      {children}
    </p>
  );
}

export function SectionTitle({
  children,
  sub,
}: {
  children: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="mb-4">
      <h2 className="font-display text-title leading-tight tracking-tight">{children}</h2>
      {sub ? <p className="mt-1 max-w-2xl text-fine text-paper-dim">{sub}</p> : null}
    </div>
  );
}

/* ── Button ──────────────────────────────────────────────────────────────── */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-fine font-medium transition-all duration-(--duration-quick) disabled:cursor-not-allowed disabled:opacity-45";

const BUTTON_TONES: Record<string, string> = {
  primary: "bg-accent text-ink-0 hover:bg-accent/88",
  ghost: "border border-rule-strong bg-ink-2 text-paper hover:border-accent-dim hover:bg-ink-3",
  quiet: "text-paper-dim hover:bg-ink-2 hover:text-paper",
};

export function Button({
  children,
  tone = "primary",
  className = "",
  ...rest
}: { tone?: "primary" | "ghost" | "quiet" } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${BUTTON_BASE} ${BUTTON_TONES[tone]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  href,
  tone = "ghost",
  className = "",
}: {
  children: ReactNode;
  href: string;
  tone?: "primary" | "ghost" | "quiet";
  className?: string;
}) {
  return (
    <Link href={href} className={`${BUTTON_BASE} ${BUTTON_TONES[tone]} ${className}`}>
      {children}
    </Link>
  );
}

/* ── Field ───────────────────────────────────────────────────────────────── */

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-fine font-medium text-paper">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-micro text-paper-faint">{hint}</p> : null}
      {error ? (
        <p className="text-micro text-block" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const INPUT_CLASS =
  "w-full rounded-md border border-rule-strong bg-ink-0 px-3 py-2 font-mono text-fine text-paper placeholder:text-paper-faint transition-colors duration-(--duration-quick) hover:border-accent-dim focus:border-accent focus:outline-none";

/* ── Key/value row ───────────────────────────────────────────────────────── */

export function KeyValue({
  k,
  children,
  mono = true,
}: {
  k: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-micro uppercase tracking-[0.1em] text-paper-faint">{k}</dt>
      <dd className={`min-w-0 break-all text-right text-fine ${mono ? "figure" : ""}`}>
        {children}
      </dd>
    </div>
  );
}

/* ── Code block ──────────────────────────────────────────────────────────── */

export function Code({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <pre
      className={`overflow-x-auto rounded-md border border-rule bg-ink-0 p-3 font-mono text-micro leading-relaxed text-paper-dim ${className}`}
    >
      <code>{children}</code>
    </pre>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-sm bg-ink-2 px-1 py-0.5 font-mono text-[0.95em] text-paper">
      {children}
    </span>
  );
}
