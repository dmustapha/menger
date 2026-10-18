"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AsyncState<T> =
  | { phase: "loading"; data: null; error: null }
  | { phase: "ready"; data: T; error: null }
  | { phase: "error"; data: null; error: unknown };

/**
 * One request, one state machine, three terminal shapes. There is no fourth state in
 * which stale data is shown next to a fresh error — a failed reload clears the figures,
 * because a cached verdict rendered under a live header is the one thing this console
 * must never do.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> & {
  reload: () => void;
} {
  const [state, setState] = useState<AsyncState<T>>({ phase: "loading", data: null, error: null });
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    setState({ phase: "loading", data: null, error: null });
    fnRef
      .current()
      .then((data) => {
        if (alive) setState({ phase: "ready", data, error: null });
      })
      .catch((error: unknown) => {
        if (alive) setState({ phase: "error", data: null, error });
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}
