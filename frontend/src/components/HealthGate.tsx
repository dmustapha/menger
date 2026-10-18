"use client";

import { createContext, useContext } from "react";
import { api } from "@/lib/api";
import type { Health } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { ErrorView, Skeleton } from "./states";

const HealthContext = createContext<Health | null>(null);

/** The live engine constants. Null only inside the gate's own loading frame. */
export function useHealth(): Health | null {
  return useContext(HealthContext);
}

/**
 * ROUTE-ARCHITECTURE §6: `503 BOOT_ASSERTION_FAILED` is global. On every route, when a
 * boot control has not reproduced, the console renders which assertion failed with
 * expected vs actual AS CONTENT — and renders no scores, verdicts or components at all.
 * That is why this gate wraps the page body rather than decorating it.
 */
export function HealthGate({
  children,
  loadingLabel = "Asking the engine whether it is willing to serve…",
}: {
  children: React.ReactNode;
  loadingLabel?: string;
}) {
  const { phase, data, error, reload } = useAsync(() => api.health(), []);

  if (phase === "loading") return <Skeleton rows={2} label={loadingLabel} />;
  if (phase === "error") return <ErrorView err={error} onRetry={reload} />;

  return <HealthContext.Provider value={data}>{children}</HealthContext.Provider>;
}
