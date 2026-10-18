// Types transcribed from CONTRACT.md v1.0 (FROZEN). Field names and shapes are final.
// Nothing here may be widened, narrowed, or invented — a change routes through the master chat.

export type Verdict = "ALLOW" | "BLOCK" | "UNDECIDED";
export type ClaimStatus = "ADMITTED" | "REFUSED" | "QUEUED" | "SEEDED";

export interface Components {
  independence: number; // integer — algo.maxFlow over the node-split DAG
  reliability: number; // 0..1 — exp(-path_weight)
  recency: number; // 0..1 — exp(-lambda * age_hours)
  path_weight: number; // >= 0 — raw SPpaths sum of nl
  age_hours: number;
}

export interface SourceRef {
  source_id: string;
  kind: string;
  trust: number;
  is_origin: boolean;
}

export interface ScoredClaim {
  claim_id: string;
  object: string;
  agent_id: string;
  agent_name: string;
  asserted_at: string;
  status: ClaimStatus;
  components: Components;
  score: number;
  score_is_ordinal: true;
  sources: SourceRef[];
}

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    field: string | null;
    detail: Record<string, unknown>;
  };
}

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NO_SOURCES"
  | "SLOT_NOT_FOUND"
  | "RECEIPT_NOT_FOUND"
  | "REVIEW_NOT_FOUND"
  | "REPLAY_MISMATCH"
  | "UNKNOWN_AGENT"
  | "UNKNOWN_SOURCE"
  | "RATE_LIMITED"
  | "ENGINE_UNAVAILABLE"
  | "BOOT_ASSERTION_FAILED"
  | "NETWORK_UNREACHABLE"; // client-side only: fetch itself failed, no HTTP response

// --- GET /health ---------------------------------------------------------

export interface BootCheck {
  expected: number;
  actual: number;
  pass: boolean;
}

export interface BootChecks {
  passed: boolean;
  node_split_echo: BootCheck;
  node_split_independent: BootCheck;
  sp_path_weight: BootCheck;
}

export interface EngineInfo {
  image: string;
  graph: string;
  read_path: string;
}

export interface Health {
  ok: boolean;
  engine: EngineInfo;
  epsilon: number;
  lambda: number;
  seeded_at: string;
  corpus: { agents: number; sources: number; claims: number; slots: number };
  boot_checks: BootChecks;
}

// --- GET /slots ----------------------------------------------------------

export interface SlotWinner {
  claim_id: string;
  object: string;
  score: number;
  score_is_ordinal: true;
  components: Components;
}

export interface SlotRow {
  slot_key: string;
  subject: string;
  predicate: string;
  claim_count: number;
  contested: boolean;
  winner: SlotWinner | null;
  last_verdict: Verdict | null;
  last_decided_at: string | null;
  last_receipt_id: string | null;
  open_review_count: number;
}

export interface SlotList {
  total: number;
  limit: number;
  offset: number;
  epsilon: number;
  slots: SlotRow[];
}

// --- GET /slots/{key} ----------------------------------------------------

export interface SlotReceiptRef {
  receipt_id: string;
  verdict: Verdict;
  decided_at: string;
}

export interface OpenReviewRef {
  review_id: string;
  claim_id: string;
  margin: number;
}

export interface SlotDetail {
  slot_key: string;
  subject: string;
  predicate: string;
  contested: boolean;
  epsilon: number;
  lambda: number;
  score_is_ordinal: true;
  claims: ScoredClaim[];
  ranking: string[];
  top_margin: number | null;
  last_receipt_id: string | null;
  receipts: SlotReceiptRef[];
  open_reviews: OpenReviewRef[];
}

// --- GET /slots/{key}/graph ----------------------------------------------

export type GraphNodeLabel = "SuperSource" | "SourceIn" | "SourceOut" | "Claim";

export interface GraphNode {
  id: string;
  label: GraphNodeLabel;
  caption: string;
  trust: number | null;
  source_id?: string;
  claim_id?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: "FLOW" | "DERIVED_FROM";
  cap: number;
  nl: number | null;
  /**
   * Forward-compatibility only, NOT a contract amendment. CL-F-009 RULING 2 collapses
   * `DERIVED_FROM` into `:FLOW {kind:'DERIVED'}` at seed time, because AF-4 caps
   * `algo.maxFlow` at exactly one entry in `relationshipTypes`. If the engine ships that
   * collapse, every edge arrives with `type: "FLOW"` and the derivation rendering would go
   * silently blank. Reading an optional `kind` costs the engine nothing and adds no
   * obligation to the frozen v1.0 contract — `type` stays required and authoritative.
   */
  kind?: "SPLIT" | "DERIVED";
}

export interface SlotGraph {
  slot_key: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  witness_sets: Record<string, string[]>;
}

// --- POST /remember ------------------------------------------------------

export interface RememberRequest {
  agent_id: string;
  subject: string;
  predicate: string;
  object: string;
  sources: string[];
  asserted_at?: string;
}

export interface RememberResponse {
  verdict: Verdict;
  slot_key: string;
  claim_id: string;
  status: ClaimStatus;
  recorded: boolean;
  decided_at: string;
  margin: number;
  epsilon: number;
  score_is_ordinal: true;
  incoming: ScoredClaim;
  incumbent: ScoredClaim | null;
  receipt_id: string;
  review_id: string | null;
}

// --- GET /receipts/{id} --------------------------------------------------

export interface IndependenceWitness {
  max_flow: number;
  witness_nodes: string[];
  paths: string[][];
}

export interface ReliabilityPathEdge {
  from: string;
  to: string;
  type: string;
  trust: number;
  nl: number;
}

export interface ReliabilityPath {
  nodes: string[];
  edges: ReliabilityPathEdge[];
  path_weight: number;
}

export interface ReceiptCandidate {
  claim_id: string;
  object: string;
  components: Components;
  score: number;
  independence_witness: IndependenceWitness;
  reliability_path: ReliabilityPath;
}

export interface CypherStatement {
  label: string;
  read_command: string;
  query: string;
  params: Record<string, unknown>;
  duration_ms: number;
}

export interface Receipt {
  receipt_id: string;
  slot_key: string;
  verdict: Verdict;
  decided_at: string;
  margin: number;
  epsilon: number;
  lambda: number;
  score_is_ordinal: true;
  winner_claim_id: string;
  engine: EngineInfo;
  candidates: ReceiptCandidate[];
  cypher: CypherStatement[];
  replay: { endpoint: string; deterministic: boolean };
}

// --- POST /receipts/{id}/replay ------------------------------------------

export type DivergenceReason = "RECENCY_DECAY" | "GRAPH_MUTATED" | "ENGINE_DIFF";

export interface ReplayStatement {
  label: string;
  duration_ms: number;
  original: Record<string, unknown>;
  replayed: Record<string, unknown>;
  match: boolean;
}

export interface Divergence {
  claim_id: string;
  field: string;
  then: number;
  now: number;
  reason: DivergenceReason;
}

export interface ReplayResult {
  receipt_id: string;
  replayed_at: string;
  matches_original: boolean;
  statements: ReplayStatement[];
  components_then: Record<string, Partial<Components>>;
  components_now: Record<string, Partial<Components>>;
  divergence: Divergence[];
}

// --- GET /review ---------------------------------------------------------

export interface ReviewContender {
  claim_id: string;
  object: string;
  agent_id: string;
  score: number;
  components: Components;
}

export interface ReviewItem {
  review_id: string;
  status: "OPEN" | "RESOLVED";
  created_at: string;
  slot_key: string;
  margin: number;
  reason: "WITHIN_EPSILON";
  receipt_id: string;
  incoming: ReviewContender;
  incumbent: ReviewContender | null;
}

export interface ReviewQueue {
  total: number;
  limit: number;
  offset: number;
  epsilon: number;
  items: ReviewItem[];
}
