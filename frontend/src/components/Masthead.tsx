"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SplitMark } from "./SplitMark";

const NAV = [
  { href: "/slots", label: "Slots" },
  { href: "/remember", label: "Write" },
  { href: "/review", label: "Review" },
  { href: "/proof", label: "Proof" },
];

export function Masthead() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 rule-b bg-ink-0/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-md transition-opacity duration-(--duration-quick) hover:opacity-80"
          aria-label="MENGER — home"
        >
          <SplitMark className="h-6 w-6" />
          <span className="font-display text-lead leading-none tracking-tight">MENGER</span>
        </Link>

        <nav aria-label="Primary" className="ml-auto flex items-center gap-0.5 overflow-x-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "rounded-md px-2.5 py-1.5 text-fine whitespace-nowrap transition-colors duration-(--duration-quick)",
                  active
                    ? "bg-ink-2 text-paper"
                    : "text-paper-dim hover:bg-ink-1 hover:text-paper",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
