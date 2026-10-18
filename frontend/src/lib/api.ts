// The only data source in this console is the eight endpoints of CONTRACT.md v1.0.
// There is no secondary store, no snapshot, no fixture, no stub, no simulate path.
// epsilon and lambda are SERVER constants: they arrive in payloads and are never written here.

import type {
  ApiErrorBody,
  ErrorCode,
  Health,
  Receipt,
  RememberRequest,
  RememberResponse,
  ReplayResult,
  ReviewQueue,
  SlotDetail,
  SlotGraph,
  SlotList,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_MENGER_API?.replace(/\/$/, "") ?? "http://localhost:8000";

/** The engine pin, named in every unreachable state so the reader knows what is down. */
export const ENGINE_PIN = "falkordb/falkordb:v4.22.1";

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly field: string | null;
  readonly detail: Record<string, unknown>;

  constructor(status: number, body: ApiErrorBody["error"]) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.field = body.field ?? null;
    this.detail = body.detail ?? {};
  }

  /** detail.boot_checks, present only on BOOT_ASSERTION_FAILED. */
  get bootChecks(): Record<string, unknown> | null {
    const d = this.detail as { boot_checks?: Record<string, unknown> };
    return d.boot_checks ?? null;
  }
}

function networkError(cause: unknown): ApiError {
  return new ApiError(0, {
    code: "NETWORK_UNREACHABLE",
    message:
      cause instanceof Error
        ? `the console could not reach ${API_BASE} (${cause.message})`
        : `the console could not reach ${API_BASE}`,
    field: null,
    detail: {},
  });
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      cache: "no-store",
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch (cause) {
    throw networkError(cause);
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // The contract says no endpoint returns a bare string. If one does, that is
      // itself the fault worth reporting — verbatim, not as "something went wrong".
      throw new ApiError(res.status, {
        code: "VALIDATION_ERROR",
        message: `the engine returned a non-JSON body (HTTP ${res.status}): ${text.slice(0, 200)}`,
        field: null,
        detail: {},
      });
    }
  }

  if (!res.ok) {
    const body = (parsed as ApiErrorBody | null)?.error;
    if (body) throw new ApiError(res.status, body);
    throw new ApiError(res.status, {
      code: "ENGINE_UNAVAILABLE",
      message: `HTTP ${res.status} from ${path} with no contract error body`,
      field: null,
      detail: {},
    });
  }

  return parsed as T;
}

/** Both ':' and '|' must be percent-encoded. A raw slot_key is never a href. */
export function encodeSlotKey(slotKey: string): string {
  return encodeURIComponent(slotKey);
}

export function decodeSlotKey(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

/** slot_key = subject + "|" + predicate. Split on the FIRST '|' only. */
export function splitSlotKey(slotKey: string): { subject: string; predicate: string } {
  const i = slotKey.indexOf("|");
  if (i < 0) return { subject: slotKey, predicate: "" };
  return { subject: slotKey.slice(0, i), predicate: slotKey.slice(i + 1) };
}

export const api = {
  health: () => request<Health>("/health"),

  slots: (q: {
    contested?: boolean;
    has_review?: boolean;
    limit?: number;
    offset?: number;
  } = {}) => {
    const p = new URLSearchParams();
    if (q.contested !== undefined) p.set("contested", String(q.contested));
    if (q.has_review !== undefined) p.set("has_review", String(q.has_review));
    if (q.limit !== undefined) p.set("limit", String(q.limit));
    if (q.offset !== undefined) p.set("offset", String(q.offset));
    const qs = p.toString();
    return request<SlotList>(`/slots${qs ? `?${qs}` : ""}`);
  },

  slot: (slotKey: string) => request<SlotDetail>(`/slots/${encodeSlotKey(slotKey)}`),

  slotGraph: (slotKey: string) => request<SlotGraph>(`/slots/${encodeSlotKey(slotKey)}/graph`),

  remember: (body: RememberRequest) =>
    request<RememberResponse>("/remember", { method: "POST", body: JSON.stringify(body) }),

  receipt: (receiptId: string) =>
    request<Receipt>(`/receipts/${encodeURIComponent(receiptId)}`),

  replay: (receiptId: string) =>
    request<ReplayResult>(`/receipts/${encodeURIComponent(receiptId)}/replay`, {
      method: "POST",
      body: "{}",
    }),

  review: (q: { status?: "OPEN" | "RESOLVED" | "ALL"; limit?: number; offset?: number } = {}) => {
    const p = new URLSearchParams();
    if (q.status) p.set("status", q.status);
    if (q.limit !== undefined) p.set("limit", String(q.limit));
    if (q.offset !== undefined) p.set("offset", String(q.offset));
    const qs = p.toString();
    return request<ReviewQueue>(`/review${qs ? `?${qs}` : ""}`);
  },
};
