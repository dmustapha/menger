# CONTRACT - MENGER HTTP API · **FROZEN v1.0**

> **Status: FROZEN at 2026-10-18 ~14:05 WAT by `forge`.**
> This is the single joint artifact between the **engine build chat** and the concurrent
> **`design_forge` chat**. Neither chat may change it unilaterally. A change goes back
> through the master chat and is announced to the other chat
> (`docs/ORCHESTRATION-PROTOCOL.md` §3, the concurrency contract).
>
> Build this against the shapes below with **zero further questions**. Every field name
> and type here is final.

---

## 0. Ground rules the contract encodes

| # | Rule | Where it shows up in the API |
|---|---|---|
| 1 | **Three component scores are ALWAYS surfaced separately.** Never one opaque blended number. *(PULSE DS-8, R-4, User Advocate's standing dissent)* | every `components` object carries `independence`, `reliability`, `recency` as distinct fields, plus `margin` + `epsilon` at the decision level |
| 2 | **The score is ORDINAL, not cardinal.** | every `score` field is accompanied by `"score_is_ordinal": true` on its parent object; the console must never render it as a percentage, a confidence, or a probability |
| 3 | **Verdict enum is exactly three values.** | `"ALLOW" \| "BLOCK" \| "UNDECIDED"` |
| 4 | **Nothing is silently lost.** A BLOCKed write is *recorded*; an UNDECIDED write lands in the review queue. | `recorded: true` on every `/remember` response; `review_id` non-null on UNDECIDED |
| 5 | **All reads go through `GRAPH.RO_QUERY`** (Python client only - the TS client lacks it, FalkorDB issue #408). This is the containment boundary for generated Cypher. | `receipt.engine.read_path == "GRAPH.RO_QUERY"`; every recorded Cypher statement carries its `read_command` |
| 6 | **`independence` is an integer count of VERTEX-disjoint chains**, from `algo.maxFlow` over the **node-split** provenance DAG. *(DS-1 / AF-6)* | `components.independence` is an **integer**, not a float |
| 7 | **`reliability` comes from `algo.SPpaths` with `weightProp` - the only key that works.** *(DS-2 / AF-3)* | `components.path_weight` is surfaced raw alongside `reliability` so the hop-count trap is visible in the receipt |
| 8 | **Never the word "procedure."** | all prose fields say *"a single parameterised Cypher query"* |
| 9 | **ε and λ are server constants, never hardcoded in the console.** | `GET /health` returns `epsilon` and `lambda`; `epsilon` also echoes on every decision |

**Server:** Python (FastAPI + `falkordb` Python client). **Base URL:** `http://localhost:8000`
**Content type:** `application/json` both directions. **Auth:** none (synthetic data, local/demo).
**CORS:** `Access-Control-Allow-Origin: *` - the console runs on `:3000` and calls the API directly.

---

## 1. Shared types

### `Verdict`
```
"ALLOW" | "BLOCK" | "UNDECIDED"
```

### `ClaimStatus`
```
"ADMITTED" | "REFUSED" | "QUEUED" | "SEEDED"
```
`SEEDED` = present from the synthetic corpus, never adjudicated through `/remember`.

### `Components`
```jsonc
{
  "independence": 2,          // integer. algo.maxFlow over the node-split DAG = # VERTEX-disjoint origin chains
  "reliability":  0.8100,     // float 0..1. exp(-path_weight)
  "recency":      0.9261,     // float 0..1. exp(-lambda * age_hours)
  "path_weight":  0.21072,    // float >= 0. raw SPpaths sum of nl = -ln(trust). Surfaced so the hop-count trap is auditable
  "age_hours":    9.6         // float >= 0
}
```

### `ScoredClaim`
```jsonc
{
  "claim_id":        "clm_0007",
  "object":          "eu-west-1",
  "agent_id":        "agt_planner_7",
  "agent_name":      "planner-7",
  "asserted_at":     "2026-10-18T04:26:00Z",   // ISO-8601 UTC, always Z
  "status":          "ADMITTED",                // ClaimStatus
  "components":      { /* Components */ },
  "score":           1.5002,                    // float. independence * reliability * recency
  "score_is_ordinal": true,                     // ALWAYS true. Rank-only. Not a probability
  "sources": [
    { "source_id": "src_crm_export", "kind": "system_export", "trust": 0.90, "is_origin": true }
  ]
}
```

### `Error`
```jsonc
{
  "error": {
    "code":    "UNKNOWN_SOURCE",
    "message": "source 'src_nope' is not in the graph",
    "field":   "sources[1]",          // null when not field-scoped
    "detail":  { "unknown": ["src_nope"] }   // {} when empty
  }
}
```

---

## 2. Endpoints

| Method | Path | Purpose | Consumer |
|---|---|---|---|
| `POST` | `/remember` | **The write gate.** An agent submits a fact; the graph returns ALLOW / BLOCK / UNDECIDED + a receipt id. | console "submit a memory" panel; the demo's hero beat |
| `GET` | `/slots` | Slot list - every contested subject+predicate with its current winner. | console landing / slot table |
| `GET` | `/slots/{key}` | Slot detail - all contending claims, ranked, each with its three components. | console slot drill-down |
| `GET` | `/slots/{key}/graph` | The slot's provenance subgraph as nodes+edges, for visualisation. | console graph view |
| `GET` | `/receipts/{receipt_id}` | **The DOCKET receipt** - exact Cypher, three components, winning provenance path, max-flow witness set. | console receipt view |
| `POST` | `/receipts/{receipt_id}/replay` | Re-execute the receipt's recorded Cypher verbatim and report whether it reproduces. | console "replay this verdict" button |
| `GET` | `/review` | The review queue - every UNDECIDED write. | console review queue |
| `GET` | `/health` | Engine liveness **+ the boot assertions** (node-split controls, `weightProp` control) + ε and λ. | console status strip |

---

### 2.1 `POST /remember` - the write gate

**Request**
```jsonc
{
  "agent_id":    "agt_planner_7",            // required. string. must exist as (:Agent {id})
  "subject":     "customer:acme",            // required. string, non-empty
  "predicate":   "primary_region",           // required. string, non-empty
  "object":      "eu-west-1",                // required. string, non-empty
  "sources":     ["src_crm_export", "src_slack_991"],  // required. string[], min 1. each must exist as (:Source {id})
  "asserted_at": "2026-10-18T14:02:11Z"      // optional. ISO-8601 UTC. defaults to server now
}
```
The slot is derived, never supplied: `slot_key = subject + "|" + predicate`.

**Response `200`**
```jsonc
{
  "verdict":     "BLOCK",                    // Verdict
  "slot_key":    "customer:acme|primary_region",
  "claim_id":    "clm_0061",                 // the id assigned to the incoming claim (always created)
  "status":      "REFUSED",                  // ClaimStatus of the incoming claim after the decision
  "recorded":    true,                       // ALWAYS true. A refused write is recorded, never dropped
  "decided_at":  "2026-10-18T14:02:11Z",

  "margin":      -0.3104,                    // float. score(incoming) - score(best_incumbent)
  "epsilon":     0.05,                       // float. the server's ε, echoed so the console never hardcodes it
  "score_is_ordinal": true,

  "incoming":    { /* ScoredClaim */ },
  "incumbent":   { /* ScoredClaim */ },      // null when the slot was uncontested
  "receipt_id":  "rcpt_0061",                // always present. GET /receipts/{id}
  "review_id":   null                        // string when verdict == "UNDECIDED", else null
}
```

**Decision rule (normative - the console may display it, must not re-derive it):**
```
margin = score(incoming) - score(best_incumbent)      // best_incumbent score = 0.0 if the slot is empty
margin  >  +epsilon   ->  ALLOW      status ADMITTED   review_id null
margin  <  -epsilon   ->  BLOCK      status REFUSED    review_id null
|margin| <= epsilon   ->  UNDECIDED  status QUEUED     review_id set, a (:Review) node is written
```
`status` ↔ `verdict` mapping is total and fixed: `ALLOW→ADMITTED`, `BLOCK→REFUSED`, `UNDECIDED→QUEUED`.

**Errors:** `400 VALIDATION_ERROR` · `400 NO_SOURCES` · `422 UNKNOWN_AGENT` · `422 UNKNOWN_SOURCE` · `503 ENGINE_UNAVAILABLE` · `503 BOOT_ASSERTION_FAILED`

**Worked example**
```bash
curl -sS -X POST http://localhost:8000/remember -H 'content-type: application/json' -d '{
  "agent_id":"agt_scraper_2","subject":"customer:acme","predicate":"primary_region",
  "object":"us-east-1","sources":["src_blog_echo_a","src_blog_echo_b"]}'
```
```jsonc
// 200 - [EXAMPLE: shapes are frozen; the numeric values are illustrative, not measured]
{
  "verdict": "BLOCK", "slot_key": "customer:acme|primary_region",
  "claim_id": "clm_0061", "status": "REFUSED", "recorded": true,
  "decided_at": "2026-10-18T14:02:11Z",
  "margin": -0.3104, "epsilon": 0.05, "score_is_ordinal": true,
  "incoming": {
    "claim_id":"clm_0061","object":"us-east-1","agent_id":"agt_scraper_2","agent_name":"scraper-2",
    "asserted_at":"2026-10-18T14:02:11Z","status":"REFUSED",
    "components":{"independence":1,"reliability":0.5220,"recency":1.0,"path_weight":0.65021,"age_hours":0.0},
    "score":0.5220,"score_is_ordinal":true,
    "sources":[{"source_id":"src_blog_echo_a","kind":"blog","trust":0.40,"is_origin":false},
               {"source_id":"src_blog_echo_b","kind":"blog","trust":0.40,"is_origin":false}]
  },
  "incumbent": {
    "claim_id":"clm_0007","object":"eu-west-1","agent_id":"agt_planner_7","agent_name":"planner-7",
    "asserted_at":"2026-10-18T04:26:00Z","status":"ADMITTED",
    "components":{"independence":2,"reliability":0.8100,"recency":0.9261,"path_weight":0.21072,"age_hours":9.6},
    "score":1.5002,"score_is_ordinal":true,
    "sources":[{"source_id":"src_crm_export","kind":"system_export","trust":0.90,"is_origin":true},
               {"source_id":"src_contract_pdf","kind":"contract","trust":0.90,"is_origin":true}]
  },
  "receipt_id":"rcpt_0061","review_id":null
}
```
This is the hero beat: **two citations that look like corroboration score `independence: 1`** because they funnel through one shared origin and the node-split collapses them - the echo chamber is refused.

---

### 2.2 `GET /slots` - slot list

**Query params**
| Name | Type | Default | Meaning |
|---|---|---|---|
| `contested` | `bool` | *(unset = all)* | `true` → only slots with ≥2 claims |
| `has_review` | `bool` | *(unset = all)* | `true` → only slots with an open review item |
| `limit` | `int` | `50` | 1..200 |
| `offset` | `int` | `0` | |

**Response `200`**
```jsonc
{
  "total": 20, "limit": 50, "offset": 0,
  "epsilon": 0.05,
  "slots": [
    {
      "slot_key":    "customer:acme|primary_region",
      "subject":     "customer:acme",
      "predicate":   "primary_region",
      "claim_count": 3,
      "contested":   true,
      "winner": {                             // null when no claim has been admitted
        "claim_id": "clm_0007", "object": "eu-west-1",
        "score": 1.5002, "score_is_ordinal": true,
        "components": { /* Components */ }
      },
      "last_verdict":       "BLOCK",          // Verdict | null
      "last_decided_at":    "2026-10-18T14:02:11Z",   // null if never adjudicated
      "last_receipt_id":    "rcpt_0061",      // null if never adjudicated
      "open_review_count":  0
    }
  ]
}
```

**Worked example:** `curl -sS 'http://localhost:8000/slots?contested=true&limit=5'` → the object above with `total: 20`.

---

### 2.3 `GET /slots/{key}` - slot detail

`{key}` is the **URL-encoded** `slot_key`. `customer:acme|primary_region` → `customer%3Aacme%7Cprimary_region`.

**Response `200`**
```jsonc
{
  "slot_key": "customer:acme|primary_region",
  "subject": "customer:acme", "predicate": "primary_region",
  "contested": true, "epsilon": 0.05, "lambda": 0.0077,
  "score_is_ordinal": true,
  "claims":  [ /* ScoredClaim[] - ALL contending claims, each with its own components */ ],
  "ranking": ["clm_0007", "clm_0061", "clm_0034"],   // claim_ids, best first. Ordinal only
  "top_margin": 0.9782,                              // score(ranking[0]) - score(ranking[1]); null if < 2 claims
  "last_receipt_id": "rcpt_0061",
  "receipts": [
    { "receipt_id": "rcpt_0061", "verdict": "BLOCK", "decided_at": "2026-10-18T14:02:11Z" }
  ],
  "open_reviews": [
    { "review_id": "rev_0042", "claim_id": "clm_0034", "margin": 0.0121 }
  ]
}
```

**Errors:** `404 SLOT_NOT_FOUND`

---

### 2.4 `GET /slots/{key}/graph` - provenance subgraph for visualisation

Returns the node-split provenance DAG that the max-flow runs over, so the console can
render it. **The split is visible on purpose** - `SourceIn`/`SourceOut` pairs are the
mechanism, not an implementation detail to hide.

**Response `200`**
```jsonc
{
  "slot_key": "customer:acme|primary_region",
  "nodes": [
    { "id": "ss",                  "label": "SuperSource", "caption": "super-source",  "trust": null },
    { "id": "si:src_crm_export",   "label": "SourceIn",    "caption": "crm-export in",  "trust": 0.90, "source_id": "src_crm_export" },
    { "id": "so:src_crm_export",   "label": "SourceOut",   "caption": "crm-export out", "trust": 0.90, "source_id": "src_crm_export" },
    { "id": "clm_0007",            "label": "Claim",       "caption": "eu-west-1",      "trust": null, "claim_id": "clm_0007" }
  ],
  "edges": [
    { "from": "ss",                "to": "si:src_crm_export", "type": "FLOW",         "cap": 1.0, "nl": null },
    { "from": "si:src_crm_export", "to": "so:src_crm_export", "type": "FLOW",         "cap": 1.0, "nl": null },
    { "from": "so:src_crm_export", "to": "clm_0007",          "type": "FLOW",         "cap": 1.0, "nl": null },
    { "from": "so:src_blog_echo_a","to": "si:src_blog_hub",   "type": "DERIVED_FROM", "cap": 1.0, "nl": 0.2231 }
  ],
  "witness_sets": {
    "clm_0007": ["so:src_crm_export", "so:src_contract_pdf"],   // the saturated split edges = the independent origins
    "clm_0061": ["so:src_blog_hub"]
  }
}
```
`node.id` conventions are frozen: `ss` for the super-source, `si:<source_id>` / `so:<source_id>`
for a split pair, the bare `claim_id` for a claim. **Errors:** `404 SLOT_NOT_FOUND`

---

### 2.5 `GET /receipts/{receipt_id}` - the DOCKET receipt

The credibility artifact. Everything a skeptic needs to re-derive the verdict by hand.

**Response `200`**
```jsonc
{
  "receipt_id": "rcpt_0061",
  "slot_key":   "customer:acme|primary_region",
  "verdict":    "BLOCK",
  "decided_at": "2026-10-18T14:02:11Z",
  "margin":     -0.3104,
  "epsilon":    0.05,
  "lambda":     0.0077,
  "score_is_ordinal": true,
  "winner_claim_id":  "clm_0007",

  "engine": {
    "image":     "falkordb/falkordb:v4.22.1",
    "graph":     "menger",
    "read_path": "GRAPH.RO_QUERY"
  },

  "candidates": [
    {
      "claim_id": "clm_0007", "object": "eu-west-1",
      "components": { "independence": 2, "reliability": 0.8100, "recency": 0.9261,
                      "path_weight": 0.21072, "age_hours": 9.6 },
      "score": 1.5002,
      "independence_witness": {
        "max_flow": 2,
        "witness_nodes": ["so:src_crm_export", "so:src_contract_pdf"],
        "paths": [
          ["ss", "si:src_crm_export",   "so:src_crm_export",   "clm_0007"],
          ["ss", "si:src_contract_pdf", "so:src_contract_pdf", "clm_0007"]
        ]
      },
      "reliability_path": {
        "nodes": ["si:src_crm_export", "so:src_crm_export", "clm_0007"],
        "edges": [ { "from": "si:src_crm_export", "to": "so:src_crm_export",
                     "type": "FLOW", "trust": 0.90, "nl": 0.10536 } ],
        "path_weight": 0.21072
      }
    }
    // ... one entry per candidate claim in the slot
  ],

  "cypher": [
    {
      "label":        "independence.maxFlow",
      "read_command": "GRAPH.RO_QUERY",
      "query":        "CALL algo.maxFlow({relationshipTypes:['FLOW'], sourceNodes:[$ss], targetNodes:[$claim], capacityProperty:'cap'}) YIELD maxFlow, nodes RETURN maxFlow, nodes",
      "params":       { "ss": "ss", "claim": "clm_0007" },
      "duration_ms":  11
    },
    {
      "label":        "reliability.SPpaths",
      "read_command": "GRAPH.RO_QUERY",
      "query":        "CALL algo.SPpaths({sourceNode:$src, targetNode:$claim, relTypes:['FLOW','DERIVED_FROM'], weightProp:'nl'}) YIELD path, pathWeight RETURN path, pathWeight",
      "params":       { "src": "si:src_crm_export", "claim": "clm_0007" },
      "duration_ms":  4
    }
  ],

  "replay": { "endpoint": "POST /receipts/rcpt_0061/replay", "deterministic": true }
}
```
`cypher[]` is the **verbatim parameterised text that was executed** - it is what `/replay`
re-runs and what the separately-listed Cypher artifact (DS-5) is generated from. One entry
per statement, in execution order. Note `weightProp` - the only weight key that works
(AF-3); `weightProperty`/`relationshipWeightProperty`/`costProperty` silently return hop
count with no error.

**Errors:** `404 RECEIPT_NOT_FOUND`

---

### 2.6 `POST /receipts/{receipt_id}/replay` - replay by id

Re-executes `receipt.cypher[]` verbatim via `GRAPH.RO_QUERY` against the live graph and
reports whether the components reproduce. Request body: **none** (empty or `{}`).

**Response `200`**
```jsonc
{
  "receipt_id": "rcpt_0061",
  "replayed_at": "2026-10-18T15:40:02Z",
  "matches_original": true,
  "statements": [
    { "label": "independence.maxFlow", "duration_ms": 11,
      "original": { "max_flow": 2 }, "replayed": { "max_flow": 2 }, "match": true }
  ],
  "components_then": { "clm_0007": { "independence": 2, "reliability": 0.8100, "recency": 0.9261 } },
  "components_now":  { "clm_0007": { "independence": 2, "reliability": 0.8100, "recency": 0.8974 } },
  "divergence": [
    { "claim_id": "clm_0007", "field": "recency", "then": 0.9261, "now": 0.8974,
      "reason": "RECENCY_DECAY" }                 // RECENCY_DECAY | GRAPH_MUTATED | ENGINE_DIFF
  ]
}
```
`matches_original` ignores `recency` drift (time moves; `reason: "RECENCY_DECAY"` is
expected and benign) and is `false` only on `GRAPH_MUTATED` or `ENGINE_DIFF`.

**Errors:** `404 RECEIPT_NOT_FOUND` · `409 REPLAY_MISMATCH` *(only when a statement itself
fails to execute)* · `503 ENGINE_UNAVAILABLE`

---

### 2.7 `GET /review` - the review queue

Every UNDECIDED write. This is the "nothing is silently lost" surface.

**Query params:** `status` = `"OPEN" | "RESOLVED" | "ALL"` (default `"OPEN"`) · `limit` (default `50`, 1..200) · `offset` (default `0`)

**Response `200`**
```jsonc
{
  "total": 3, "limit": 50, "offset": 0, "epsilon": 0.05,
  "items": [
    {
      "review_id":   "rev_0042",
      "status":      "OPEN",                 // "OPEN" | "RESOLVED"
      "created_at":  "2026-10-18T13:58:40Z",
      "slot_key":    "vendor:northwind|sla_tier",
      "margin":      0.0121,                 // |margin| <= epsilon, which is why it is here
      "reason":      "WITHIN_EPSILON",       // the only value in v1.0
      "receipt_id":  "rcpt_0042",
      "incoming":  { "claim_id": "clm_0034", "object": "gold",   "agent_id": "agt_crawler_1",
                     "score": 0.7431, "components": { /* Components */ } },
      "incumbent": { "claim_id": "clm_0019", "object": "silver", "agent_id": "agt_planner_7",
                     "score": 0.7310, "components": { /* Components */ } }   // null if the slot was empty
    }
  ]
}
```
**v1.0 is read-only.** Resolving a review item is **NOT in this contract** - the console
must not assume a mutation endpoint exists. If resolution is added it comes back through
the master chat as a contract amendment.

---

### 2.8 `GET /health` - liveness + the boot assertions

The console's status strip. Also the credibility proof: the boot assertions are the live
evidence that the node-split is real and that the `weightProp` trap was not fallen into.

**Response `200`** (all assertions passed)
```jsonc
{
  "ok": true,
  "engine": { "image": "falkordb/falkordb:v4.22.1", "graph": "menger", "read_path": "GRAPH.RO_QUERY" },
  "epsilon": 0.05,
  "lambda": 0.0077,
  "seeded_at": "2026-10-18T14:30:00Z",
  "corpus": { "agents": 40, "sources": 150, "claims": 60, "slots": 20 },
  "boot_checks": {
    "passed": true,
    "node_split_echo":        { "expected": 1,       "actual": 1,       "pass": true },
    "node_split_independent": { "expected": 2,       "actual": 2,       "pass": true },
    "sp_path_weight":         { "expected": 0.21072, "actual": 0.21072, "pass": true }
  }
}
```
**Response `503`** when any assertion fails - the service refuses to serve rather than
serve a wrong headline number (R-1, R-3):
```jsonc
{ "error": { "code": "BOOT_ASSERTION_FAILED",
             "message": "node_split_echo expected 1, got 2 - the node-split is not in effect",
             "field": null,
             "detail": { "boot_checks": { "passed": false,
               "node_split_echo": { "expected": 1, "actual": 2, "pass": false } } } } }
```
`corpus` counts are the seed's targets from WINNER-BRIEF B1; the exact numbers are
build-determined and the console must read them, never hardcode them.

---

## 3. Error codes - complete table

| HTTP | `error.code` | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | malformed JSON, missing required field, wrong type, empty string |
| `400` | `NO_SOURCES` | `sources` is absent or an empty array - a claim with no provenance cannot be scored |
| `404` | `SLOT_NOT_FOUND` | `{key}` matches no `(:Slot)` |
| `404` | `RECEIPT_NOT_FOUND` | `{receipt_id}` matches no receipt |
| `404` | `REVIEW_NOT_FOUND` | reserved; `{review_id}` matches no `(:Review)` |
| `409` | `REPLAY_MISMATCH` | a recorded statement failed to execute on replay |
| `422` | `UNKNOWN_AGENT` | `agent_id` is not an existing `(:Agent {id})` |
| `422` | `UNKNOWN_SOURCE` | one or more `sources` are not existing `(:Source {id})`; offenders in `detail.unknown` |
| `429` | `RATE_LIMITED` | reserved for the deployed instance; `detail.retry_after_s` |
| `503` | `ENGINE_UNAVAILABLE` | FalkorDB unreachable / command failed |
| `503` | `BOOT_ASSERTION_FAILED` | a boot control did not reproduce - the service refuses to serve |

Every error response is exactly the `Error` shape in §1. No endpoint returns a bare string.

---

## 4. What the console may and may not do

**May:** read every field above; render the three components separately; render ε and the
margin; render the provenance subgraph including the split pairs; call `/replay`; display
the boot checks.

**Must not:**
- blend the three components into one displayed number, or render `score` as a percentage,
  a confidence, or a probability - it is **ordinal** (R-4 / DS-8);
- hardcode `epsilon`, `lambda`, or the corpus counts - read them from `/health`;
- use the words **"procedure"**, **"detects conflicts"**, or **"truth"** in any copy
  (DS-3, DS-4, R-2, R-5). The words are **refused** and **admission control**;
- assume any endpoint not listed in §2 exists.

---

## 5. Freeze record

| Field | Value |
|---|---|
| Version | `1.0` |
| Frozen at | 2026-10-18 ~14:05 WAT |
| Frozen by | `forge` (fresh dispatch) |
| Consumers | engine build chat (producer) · `design_forge` chat (consumer) |
| Amendment path | master chat only; announce to both chats; bump to `1.1` |
| Claim state | **NOT_CLAIMED** - no endpoint has been built or probed yet. Every numeric value in an example response is labelled illustrative. The only VERIFIED numbers carried in here are upstream: `independence` echo→1 / independent→2 (AF-6/VF-W2), `path_weight 0.21072` (AF-3/DS-2), `duration_ms` 41 cold / 11 warm (AF-7/VF-W3). |
