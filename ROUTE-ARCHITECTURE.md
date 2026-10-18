# ROUTE-ARCHITECTURE — MENGER console

**Project:** MENGER — an admission-control gate on agent memory.
**Owner of this file:** `forge` (artifact E). **Status:** specification — nothing here has been
built or probed. Every behavioural statement is `[UNVERIFIED]` unless tagged otherwise.
**Derived from:** `USER-ONBOARDING.md` §3 (four user classes) and `CONTRACT.md` v1.0 (FROZEN).
**Console origin:** `http://localhost:3000`. **API origin:** `http://localhost:8000`, CORS
`Access-Control-Allow-Origin: *` — the console calls the API directly (`CONTRACT.md` §0).

---

## 0. Scope boundary — contract, not craft

This file specifies **which routes exist, what each one is for, what data it depends on, and which
states it must be able to render**. That is the surface *contract*.

It specifies **nothing** about appearance: no layout, grid, component, typography, colour, motion,
hierarchy, or copy. The console/UX is routed to the `design-forge` skill, which runs **in full in
its own chat** (LEDGER R5, PULSE Decision #7) and is already consuming the frozen contract. Route
identity and data dependency are architecture and must be settled before two chats build in
parallel; everything else is `design_forge`'s craft and is not constrained here.

Where a row below says a route "must be able to render X", it is naming a **state that exists in
the contract and therefore cannot be left undefined** — not a prescription for how to show it.

---

## 1. Why multi-route, derived not preferred

`USER-ONBOARDING.md` §3 freezes **four user classes**, and three of the four arrive with a
*different precondition*:

| Class | Arrives with | Entry route | Would a single page serve it? |
|---|---|---|---|
| 1 — cold judge | nothing but a URL | `/` | Only if everything else is hidden from it — which is the cram |
| 2 — writing agent | an `agent_id` + `source_id`s | *no route* (calls `POST /remember`) | N/A — renders nothing |
| 3 — memory operator | a `review_id` or `slot_key` | `/review` | No. Forcing a first-contact beat on a returning worker is a tax |
| 4 — skeptic | a `receipt_id` | `/receipts/[id]` | No. This class needs a **linkable, shareable** address for one receipt |

**The decisive argument is addressability, not screen real estate.** Class 4 arrives *holding an
identifier*. Under artifact-only judging (`[VERIFIED]` AF-10) the video, the README and the
submission prose all need to point a reader at one specific receipt and one specific slot. A
single-page surface has one URL and therefore cannot be pointed at anything. Deep-linkability is a
functional requirement of the delivery mechanism, not a nicety.

**What belongs on its own route, and why — stated as the no-cram rule:**

| Belongs on its own route | Because |
|---|---|
| The landing beat | Class 1's entire experience may be this one screen. It cannot share with a form |
| The slot index | The only surface that answers "what is contested at all" — a list with its own pagination (`limit`/`offset`, `CONTRACT.md` §2.2) |
| One slot's detail | `ScoredClaim[]` for *all* contenders, each with its own three components. Deep-linked from README/video |
| One slot's provenance graph | Different data source (`/slots/{key}/graph`), different failure mode, heavier payload. It must be reachable *and* skippable |
| The write gate | The only surface that mutates state. Mixing a mutating form into a read surface makes every empty state ambiguous |
| One receipt | Class 4's whole product. Shareable address, standalone artifact |
| One receipt's replay result | A distinct *event* with its own payload (`then`/`now`/`divergence`) — and the single most important link the project can hand a skeptic |
| The review queue | Class 3's entry route. Independent pagination and a `status` filter |
| The proof/judge route | Boot assertions, the substitution test, the engine pin, the drill. Class 1 needs it; nobody else does |

**Counter-argument, answered honestly.** Nine routes is a lot for a hackathon day, and route count
is not a virtue. But every route above is a *one-to-one map onto a frozen endpoint or a frozen
identifier*, and none is a container for the others. No route here was created to make the surface
look larger; `/receipts/[id]/replay` is the only one that could arguably fold into its parent, and
it is kept separate purely so a replay result has an address a judge can be sent to.

---

## 2. The data-source rule (binding)

The console's **only** data sources are the eight endpoints in `CONTRACT.md` §2. There is no
secondary store, no build-time snapshot, no fixture file, no stub, and no simulate path. Three
rules follow and are non-negotiable:

1. **No endpoint outside `CONTRACT.md` §2 may be assumed to exist** (§4, explicit). In particular
   there is **no review-resolution endpoint** in v1.0 and the console must not imply one.
2. **ε, λ and the corpus counts are read, never hardcoded** — `GET /health` publishes `epsilon`,
   `lambda` and `corpus`, and `epsilon` is echoed on every decision (`[VERIFIED]` AF-17; DS-8 /
   R-4). A literal `0.05` in console source is a defect, not a shortcut.
3. **The score is never re-derived client-side.** The decision rule in `CONTRACT.md` §2.1 is
   normative — the console may *display* it, must not recompute it. Recomputing would create a
   second implementation that can disagree with the receipt.

### Endpoint → route map

| Endpoint | Consumed by | Nothing else consumes it |
|---|---|---|
| `GET /health` | every route (status strip) + `/proof` | — |
| `POST /remember` | `/remember` | the only mutating call in the console |
| `GET /slots` | `/slots` | — |
| `GET /slots/{key}` | `/slots/[key]` | — |
| `GET /slots/{key}/graph` | `/slots/[key]/graph` | exists **specifically** so the provenance visualisation needs no contract amendment mid-build |
| `GET /receipts/{receipt_id}` | `/receipts/[id]` | — |
| `POST /receipts/{receipt_id}/replay` | `/receipts/[id]/replay` | — |
| `GET /review` | `/review` | — |

All eight are consumed. Nothing in the frozen contract is orphaned, and no route needs data the
contract does not provide. That bidirectional completeness is the actual test of whether the
console can be built from the contract alone (PULSE A-F2, DC-5 / DS-13).

---

## ROUTES — §3

| Route | Purpose | Primary data dependency | Own route because |
|---|---|---|---|
| / | Landing. The refusal money-shot plus the live boot assertions. Class 1's first and possibly only screen | GET /health + one seeded receipt or hero slot | first-contact beat (§4) |
| /slots | Slot index — every contested subject+predicate with its current winner | GET /slots (`contested`, `has_review`, `limit`, `offset`) | the "what is contested" list, own pagination |
| /slots/[key] | Slot detail — all contending claims ranked, each with its three components, `top_margin`, receipts, open reviews | GET /slots/{key} (URL-encoded key) | deep-linked per slot |
| /slots/[key]/graph | The node-split provenance subgraph the max-flow runs over, with witness sets | GET /slots/{key}/graph | separate payload, separate failure mode, skippable |
| /remember | The write gate. Submit a claim, receive ALLOW / BLOCK / UNDECIDED + `margin` + `epsilon` + `receipt_id` | POST /remember | the only mutating surface |
| /receipts/[id] | The DOCKET receipt — verbatim parameterised Cypher, three components, witness set, winning provenance path | GET /receipts/{receipt_id} | Class 4's entry point; shareable address |
| /receipts/[id]/replay | The replay result — statement-by-statement match, `components_then` vs `components_now`, `divergence[]` | POST /receipts/{receipt_id}/replay | a distinct event with its own payload and its own link |
| /review | The review queue — every UNDECIDED write with its `margin` and both contenders. Read-only in v1.0 | GET /review (`status`, `limit`, `offset`) | Class 3's entry route |
| /proof | The judge route — boot assertions in full, the engine pin, the substitution test, `GRAPH.RO_QUERY` containment, the drill, the honest built-vs-not register | GET /health + static prose | Class 1 needs it; it must not dilute the landing beat |
| /counterfactual | **STRETCH, gated 16:25.** "Which single source, if removed, flips the most verdicts" | an endpoint that does **not exist in v1.0** — see §7 | isolated so it detaches as one route + one file |

**Nine committed routes + one stretch route.** `/counterfactual` is not part of the committed
surface and is specified in §7 as an attachment, not a member.

### Per-route detail

#### / — landing

- **Serves:** Class 1 (cold judge). Secondarily, the entry-funnel for every other class.
- **Must be able to render:** the refusal event with its `independence` number; the three
  `boot_checks` with expected and actual values; a path onward to the independent counter-case
  (`USER-ONBOARDING.md` G2, the load-bearing gate).
- **Must not:** require interaction before anything is legible; render `score` as a percentage,
  confidence or probability (`CONTRACT.md` §4); show a blended component figure.
- **Empty state:** none possible. The corpus is seeded at boot and `GET /health` reports non-zero
  `corpus` counts, or the service is not healthy. A landing page with nothing on it means the
  engine is down — which is the 503 state below, not an empty state.
- **Error states:** `503 BOOT_ASSERTION_FAILED` → see the global rule in §6; this is the one route
  where the refusal-to-serve is itself on-brand and must be rendered as content, not as a toast.
  `503 ENGINE_UNAVAILABLE` → the engine is unreachable; say so plainly and name the pin
  (`falkordb/falkordb:v4.22.1`). Network failure to the API → same treatment; never a blank page.

#### /slots — slot index

- **Serves:** Class 1 exploring, Class 3 orienting.
- **Data:** `GET /slots`. `total`, `limit`, `offset`, `epsilon`, and per slot: `claim_count`,
  `contested`, `winner` (**nullable** — null when no claim has been admitted), `last_verdict`
  (nullable), `last_decided_at` (nullable), `last_receipt_id` (nullable), `open_review_count`.
- **Must handle:** `winner: null` as a first-class state, not a missing field. An uncontested or
  never-adjudicated slot is normal.
- **Empty state:** `total: 0` — possible only on an unseeded graph. Say the corpus is not seeded;
  do not say "no results found", which implies a filter problem.
- **Filtered-empty state:** distinct from the above. `contested=true` or `has_review=true` with
  zero matches is a *filter* outcome and must read differently from an empty graph.
- **Error states:** `503 ENGINE_UNAVAILABLE`. No 404 — the collection always exists.

#### /slots/[key] — slot detail

- **Serves:** Class 1 (second beat), Class 3 (from a review item), Class 4 (context for a receipt).
- **Key encoding — a live trap.** `{key}` is the **URL-encoded** `slot_key`:
  `customer:acme|primary_region` → `customer%3Aacme%7Cprimary_region` (`CONTRACT.md` §2.3). Both
  `:` and `|` must be encoded. `PLAN.md` §6 requires that an un-encoded key still resolve or return
  `404 SLOT_NOT_FOUND` — **never a 500**. The console must encode on the way out and decode for
  display, and must never present a raw `slot_key` as a href.
- **Data:** `claims` (`ScoredClaim[]`, **all** contenders, each with its own `components`),
  `ranking` (claim ids, best first, **ordinal only**), `top_margin` (**null when fewer than two
  claims**), `epsilon`, `lambda`, `receipts[]`, `open_reviews[]`.
- **Must:** surface `independence` (integer), `reliability`, `recency` **separately**, with
  `path_weight` raw alongside, on every claim. `score_is_ordinal: true` is on the payload and the
  rendering must honour it (R-4 / DS-8).
- **Empty / degenerate states:** one claim → `top_margin` is null and there is no ranking contest;
  `open_reviews: []` → normal; `receipts: []` → the slot was seeded and never adjudicated, which is
  exactly what `ClaimStatus: "SEEDED"` means.
- **Error states:** `404 SLOT_NOT_FOUND` → offer `/slots`; `503 ENGINE_UNAVAILABLE`.

#### /slots/[key]/graph — provenance subgraph

- **Serves:** Class 1 (progressive disclosure P6), Class 4 (checking a witness set).
- **Why it exists as a contract endpoint:** so the provenance visualisation can be built **without
  renegotiating the frozen contract mid-build** (PULSE forge §Done; UX is 16.7% of the grade and
  `design_forge` is building concurrently). The node-id conventions in §5 are frozen for the same
  reason.
- **Data:** `nodes[]` (`id`, `label`, `caption`, `trust` — **nullable**, `source_id` / `claim_id`
  where applicable), `edges[]` (`from`, `to`, `type` ∈ `FLOW` | `DERIVED_FROM`, `cap`, `nl` —
  **nullable**), `witness_sets` (map `claim_id` → the saturated split nodes = the independent
  origins).
- **Must:** render the split pairs. **The split is visible on purpose** — `SourceIn`/`SourceOut`
  pairs *are* the mechanism, not an implementation detail to hide (`CONTRACT.md` §2.4, verbatim
  intent). Collapsing them back into one node per source would erase the only thing the picture is
  for.
- **Empty states:** `witness_sets: {}` → no claim in this slot has an independence witness yet;
  `nl: null` on a `FLOW` edge is **normal** (only `DERIVED_FROM` edges carry `nl`); `trust: null` on
  `ss` and on `Claim` nodes is **normal**.
- **Error states:** `404 SLOT_NOT_FOUND`; `503 ENGINE_UNAVAILABLE`. A large subgraph is a
  performance consideration for `design_forge`, not an error; `[UNVERIFIED]`, and maxFlow itself is
  `41ms cold / 11ms warm on 1402 nodes / 2400 edges` (`[VERIFIED]` AF-7), i.e. not the bottleneck.

#### /remember — the write gate

- **Serves:** Class 1 at G5 (optional), and demonstrates what Class 2 does programmatically.
- **Data out:** `POST /remember` with `agent_id`, `subject`, `predicate`, `object`, `sources[]`
  (min 1), optional `asserted_at`. **`slot_key` is derived server-side (`subject + "|" +
  predicate`) and must never be supplied.**
- **Data in:** `verdict`, `slot_key`, `claim_id`, `status`, `recorded` (**always true**),
  `decided_at`, `margin`, `epsilon` (echoed), `score_is_ordinal`, `incoming`, `incumbent`
  (**null when the slot was uncontested**), `receipt_id` (**always present**), `review_id`
  (**non-null only when `UNDECIDED`**).
- **Must:** make `recorded: true` legible on a `BLOCK` — a refused write is recorded, never dropped
  (`CONTRACT.md` §0 rule 4). Lead the user to `receipt_id` on every verdict, and to `review_id` on
  `UNDECIDED`. Pick `agent_id` and `sources[]` from the seeded graph rather than free text, because
  anything else is a guaranteed `422`.
- **Empty state:** the unsubmitted form. It must be obvious that submitting is a real write against
  the real graph.
- **Error states, all from the contract's table:** `400 VALIDATION_ERROR` (malformed JSON, missing
  required field, wrong type, empty string) · `400 NO_SOURCES` (`sources` absent or empty — *never
  a verdict on no evidence*) · `422 UNKNOWN_AGENT` · `422 UNKNOWN_SOURCE` (offenders listed in
  `detail.unknown`, so the message must name them) · `503 ENGINE_UNAVAILABLE` ·
  `503 BOOT_ASSERTION_FAILED`. Every error body is exactly the `Error` shape — `code`, `message`,
  `field` (nullable), `detail` (`{}` when empty). **No endpoint returns a bare string**, so there is
  no need for and no excuse for a generic "something went wrong".

#### /receipts/[id] — the DOCKET receipt

- **Serves:** Class 4 (entry route), Class 1 at G3.
- **Data:** `verdict`, `decided_at`, `margin`, `epsilon`, `lambda`, `winner_claim_id`,
  `engine{image,graph,read_path}`, `candidates[]` (per claim: `components`, `score`,
  `independence_witness{max_flow,witness_nodes,paths[]}`, `reliability_path{nodes,edges,path_weight}`),
  `cypher[]` (per statement: `label`, `read_command`, `query`, `params`, `duration_ms`), `replay`.
- **Must:** carry `cypher[].query` **verbatim**, never paraphrased. The literal key `weightProp`
  appearing in the `reliability.SPpaths` statement is itself the evidence that the silent
  hop-count trap was avoided (`[VERIFIED]` AF-3: `weightProperty`,
  `relationshipWeightProperty` and `costProperty` are accepted silently and return hop count with
  no error). Also surface `engine.read_path == "GRAPH.RO_QUERY"` — the containment boundary,
  enforced server-side (`[VERIFIED]` AF-8 / VF-W4).
- **Must not:** describe `cypher[]` as a stored procedure. FalkorDB has none; the correct phrase is
  **a single parameterised Cypher query** (DS-3, and the panel wrote the engine).
- **Empty / degenerate states:** a single-candidate receipt (uncontested slot) → `candidates[]` has
  one entry and `margin` was computed against an incumbent score of `0.0`; `duration_ms` present per
  statement — the only measured latencies that exist anywhere are `41ms cold / 11ms warm` from AF-7,
  and per-statement receipt timings are `NOT_CLAIMED` until built.
- **Error states:** `404 RECEIPT_NOT_FOUND`; `503 ENGINE_UNAVAILABLE`.

#### /receipts/[id]/replay — the replay result

- **Serves:** Class 4, and it is Class 1's single most likely interaction.
- **Data:** `POST` with **no body** (empty or `{}`). Response: `replayed_at`, `matches_original`,
  `statements[]` (`label`, `duration_ms`, `original`, `replayed`, `match`), `components_then`,
  `components_now`, `divergence[]` (`claim_id`, `field`, `then`, `now`, `reason` ∈ `RECENCY_DECAY` |
  `GRAPH_MUTATED` | `ENGINE_DIFF`).
- **The state that must not be rendered as a failure:** `matches_original` **ignores `recency`
  drift**. A `divergence` row with `reason: "RECENCY_DECAY"` is **expected and benign** — time
  moved. `matches_original` is `false` only on `GRAPH_MUTATED` or `ENGINE_DIFF` (`CONTRACT.md`
  §2.6). Presenting a benign decay row as a mismatch would convert the project's strongest
  credibility surface into a self-inflicted wound.
- **Empty state:** none — a replay either executes or errors.
- **Error states:** `404 RECEIPT_NOT_FOUND`; `409 REPLAY_MISMATCH` **only when a recorded statement
  itself fails to execute** (not when values differ); `503 ENGINE_UNAVAILABLE`.

#### /review — the review queue

- **Serves:** Class 3 (entry route), Class 1 at G6.
- **Data:** `total`, `limit`, `offset`, `epsilon`, `items[]` (`review_id`, `status` ∈ `OPEN` |
  `RESOLVED`, `created_at`, `slot_key`, `margin`, `reason` — `WITHIN_EPSILON` is the **only** value
  in v1.0 — `receipt_id`, `incoming`, `incumbent` (**null if the slot was empty**)). Query: `status`
  ∈ `OPEN` | `RESOLVED` | `ALL`, default `OPEN`.
- **Must:** show `margin` against `epsilon`, because the whole reason an item is here is
  `|margin| <= epsilon`. Link to `receipt_id` and `slot_key`.
- **Must not:** present any affordance that resolves an item. **v1.0 is read-only; resolving is NOT
  in the contract** and the console must not assume a mutation endpoint exists (`CONTRACT.md` §2.7,
  explicit). The honest limitation is strictly better than a fabricated control on the project's
  own honesty surface.
- **Empty state:** `total: 0` with `status=OPEN` is a **good** outcome, not a void — every write so
  far landed decisively. It must not read as a broken list. Note this is also the state a judge is
  most likely to hit if ε is mis-calibrated, which is why set-piece C exists.
- **Error states:** `503 ENGINE_UNAVAILABLE`. No 404 — the collection always exists.
  `404 REVIEW_NOT_FOUND` is **reserved** in the error table and has no route in v1.0.

#### /proof — the judge route

- **Serves:** Class 1 exclusively.
- **Data:** `GET /health` live, plus prose that is static but must be *checkable*: the three boot
  assertions with their 503 behaviour, `engine.image` (`falkordb/falkordb:v4.22.1`, `[VERIFIED]`
  AF-9), `engine.read_path` (`GRAPH.RO_QUERY`, `[VERIFIED]` AF-8), the substitution test, the
  separately-listed Cypher artifact (DS-5), the AI-assistance disclosure (DS-6), the Track 02
  declaration (DS-7), and the honest built-vs-not register.
- **Why not on the landing page:** it would bury the first-contact axis under credentials. Honesty
  placement (§4) requires it to be *one click from the landing beat and explicitly signposted*, not
  merged into it.
- **Error states:** must still render its static content when `GET /health` is unreachable, and say
  which half is live and which is prose. A proof route that goes blank when the engine is down
  proves nothing.

---

## FIRST-CONTACT — §4

The opening beat, as an architectural requirement on `/`. All four axes below are requirements on
*what must be true*; `design_forge` owns every decision about how.

### 30-sec legibility

A stranger spending thirty seconds on `/`, with nobody to explain anything (`[VERIFIED]` AF-10),
must come away with `USER-ONBOARDING.md` §5's M1–M3: this is a **gate on writes**; the verdicts are
`ALLOW` / `BLOCK` / `UNDECIDED`; the echo case scored `independence: 1` while the genuinely
independent case scored `2`. Legibility is measured by the ten-second test in
`USER-ONBOARDING.md` §1 — the thirty-second budget is the generous bound, not the target.
`[UNVERIFIED]`; result `NOT_CLAIMED` until a built surface is read by a stranger.

### Money-shot

**The money-shot on landing is the refusal:** two citations that look like corroboration, scored
`independence: 1`, and the write refused — with the number visible, not described. It is the echo
set-piece (`USER-ONBOARDING.md` §4A), it is `boot_checks.node_split_echo`, and its value is
`1` (`[VERIFIED]` AF-6 / VF-W2).

Three properties make this a money-shot rather than a headline: it is a **concrete event** (a
specific write, refused), it carries a **number the service cannot start without** (AF-16), and it
is **immediately falsifiable** — the receipt and the replay are one and two clicks away. A judge
cannot read it as marketing copy, because marketing copy does not ship with a re-run button.

### Liveness / cold-start

The landing route must prove it is talking to a live engine **on arrival, without interaction**:
`GET /health` returns `ok`, the engine `image` and `graph`, the `read_path`, the `corpus` counts,
`epsilon`, `lambda`, and all three `boot_checks` with `expected`, `actual` and `pass`. Nothing on
`/` may be a build-time snapshot.

The cold-start states are enumerated and none of them may be a blank page or a spinner that never
resolves:

| Cold-start condition | Required behaviour |
|---|---|
| Engine healthy | Full landing beat with live `boot_checks` |
| `503 BOOT_ASSERTION_FAILED` | Render the refusal as **content**: which assertion failed, expected vs actual. This is the fail-closed design working, and it is evidence, not an outage (§6) |
| `503 ENGINE_UNAVAILABLE` | Say the engine is unreachable and name the pin. No fabricated numbers |
| API unreachable entirely | Same as above. Never render a cached or placeholder verdict |
| Corpus unseeded (`corpus` counts zero) | Say the corpus is not seeded. Do not render an empty slot list as if it were a result |

### Honesty-placement

Honesty surfaces are placed **adjacent to the claim they qualify**, never in a footer and never
only in a separate document:

| Honesty surface | Placement rule |
|---|---|
| `score_is_ordinal: true` — rank only, not a probability | Beside **every** rendered `score`, on every route. Not once on `/proof` |
| `epsilon` as a published server constant | Beside every `margin`, read from the payload (AF-17) |
| ε and λ are **`[ASSUMED]`**, unmeasured defaults (0.05 / 0.01 per hour), calibrated in B2 | On `/proof`, and the live values always come from `/health` — never from a document. `CONTRACT.md`'s illustrative `lambda: 0.0077` is a third, non-authoritative number and must not be copied |
| v1.0 review queue is **read-only** | On `/review` itself, where the missing affordance would otherwise be noticed |
| `RECENCY_DECAY` divergence is expected and benign | On `/receipts/[id]/replay`, beside the divergence row |
| Nothing has been probed; no latency or verdict is measured | On `/proof`, as the built-vs-not register |

Rule: an honesty surface moved away from its claim becomes a disclaimer, and a disclaimer reads as
a confession. Adjacency is what makes it read as rigour.

### Entry-funnel

One entrance for the unknown arrival, three side doors for arrivals that already hold an
identifier:

```
                 ┌──────────────────────────── /proof        (Class 1, honesty + credentials)
/  (landing) ────┼──── /slots ──── /slots/[key] ──┬── /slots/[key]/graph
                 │                                └── /receipts/[id] ── /receipts/[id]/replay
                 ├──── /remember ──────────────────── /receipts/[id]   (receipt_id from the verdict)
                 └──── /review ───────────────────── /slots/[key] | /receipts/[id]

side doors (deep links, no landing beat required):
  /review          ← Class 3 arrives with a review_id or slot_key
  /receipts/[id]   ← Class 4 arrives with a receipt_id (from the video, README, or a response)
  POST /remember   ← Class 2 arrives programmatically and renders nothing
```

Funnel rules: every route reachable from `/` in **at most three hops**; every deep-linked route
renders standalone with no prior navigation; and every route offers a way back up its own branch,
because a judge following a link from the README starts in the middle.

---

## 5. Frozen node-id conventions — carried verbatim

From `CONTRACT.md` §2.4. These are **frozen** and the console depends on parsing them. Reproduced
exactly:

> `node.id` conventions are frozen: `ss` for the super-source, `si:<source_id>` / `so:<source_id>`
> for a split pair, the bare `claim_id` for a claim.

| Id form | Node | Notes |
|---|---|---|
| `ss` | the single `:SuperSource` | `trust: null`. The max-flow source node |
| `si:<source_id>` | `:SourceIn` half of a split pair | e.g. `si:src_crm_export`; carries `source_id` and `trust` |
| `so:<source_id>` | `:SourceOut` half of a split pair | e.g. `so:src_crm_export`; the **saturated `so:` nodes are the witness set** |
| `<claim_id>` (bare) | `:Claim` | e.g. `clm_0007`; carries `claim_id`, `trust: null` |

Plus `witness_sets`: a map from `claim_id` to the list of saturated split nodes — the independent
origins. Example from the contract: `"clm_0007": ["so:src_crm_export", "so:src_contract_pdf"]`,
`"clm_0061": ["so:src_blog_hub"]`. The **length of a witness set equals `independence`**, which is
what makes the picture and the number the same object rather than two assertions.

The internal split edge `si:<id>` → `so:<id>` carries `cap: 1.0` and **is the vertex capacity**.
That single edge is why the echo chamber collapses to `1`: competing chains through a shared
intermediate must share its one unit. Removing or re-capping it makes `maxFlow` count *edge*-
disjoint paths, which is the wrong quantity and would make the headline claim false (`[VERIFIED]`
AF-6; DS-1 — non-negotiable).

Parsing rule for the console: split on the **first** `:` only. Source ids themselves may contain
characters that must not be re-split, and a claim id has no prefix at all — so `id.startsWith("si:")`
/ `"so:"`, `id === "ss"`, else claim, is the complete discrimination.

---

## 6. Global route states

Two conditions are **global** — they can occur on any route and must be specified once rather than
rediscovered per screen.

### `503 BOOT_ASSERTION_FAILED` — a first-class state, not an error toast

`GET /health` returns `503` when any boot assertion mismatches, and the service **refuses to serve
rather than serve a wrong headline number** (`[VERIFIED]` AF-16; R-1 / R-3). The error body carries
`detail.boot_checks` with the failing assertion's `expected` and `actual`.

Required console behaviour on every route: render **which assertion failed, with expected vs
actual** as content, and render no scores, verdicts or components at all. The reason is exact — if
`node_split_echo` returns `2`, the node-split is not in effect, so every `independence` value in the
graph is the wrong quantity. Degrading gracefully and showing the numbers anyway would be the single
worst failure available to this product: it is precisely the defect the assertion exists to catch.

### `503 ENGINE_UNAVAILABLE` — FalkorDB unreachable or a command failed

Required on every route: say the engine is unreachable, name the pin, render no numbers, offer a
retry. Never a stack trace (`PLAN.md` §6 edge case). Never a cached verdict.

### Error shape, uniform

Every error on every endpoint is exactly the `Error` shape from `CONTRACT.md` §1 —
`error.code`, `error.message`, `error.field` (null when not field-scoped), `error.detail` (`{}` when
empty). One renderer handles all of them. The full code table is `VALIDATION_ERROR`, `NO_SOURCES`,
`SLOT_NOT_FOUND`, `RECEIPT_NOT_FOUND`, `REVIEW_NOT_FOUND` (reserved), `REPLAY_MISMATCH`,
`UNKNOWN_AGENT`, `UNKNOWN_SOURCE`, `RATE_LIMITED` (reserved for the deployed instance, with
`detail.retry_after_s`), `ENGINE_UNAVAILABLE`, `BOOT_ASSERTION_FAILED`.

`RATE_LIMITED` is reserved and only reachable on the deployed instance; the console must handle it
because `PUBLIC_BASE_URL` is a submission requirement (DS-12) and the deployed graph is publicly
writable (`PLAN.md` §7, owned by `deploy`).

---

## 7. Where the P3 counterfactual attaches — and how it detaches

**Status: STRETCH ONLY.** Gated at `verify_milestone` **16:25** (DS-11, LEDGER R4, PULSE
Decision #4). Dead if the spine is not standing.

`/counterfactual` — "which single source, if removed, flips the most verdicts" — via `GRAPH.COPY`
fork, delete one source, re-arbitrate, diff the verdicts. Engine side it is `counterfactual.py`,
which **imports the resolver and is imported by nothing** (`PLAN.md` §3, C8).

**Attachment rules, binding:**

1. **One route plus one file.** `/counterfactual` is a leaf: nothing links *into* it from the nine
   committed routes except one explicitly removable entry point, and nothing on a committed route
   reads its data. If the gate says no, deleting the route file and that one entry point removes it
   completely, with zero edits to any committed route.
2. **No committed route may import from it.** Any shared helper it needs is copied into it, not
   extracted out of a committed route. Extraction is how a stretch entangles a spine.
3. **It needs an endpoint that does not exist in v1.0.** `CONTRACT.md` §2 has eight endpoints and
   none of them is a counterfactual. A ninth endpoint is a **contract amendment to v1.1 through the
   master chat** (§5 freeze record), announced to both consuming chats. That amendment must not be
   requested before the 16:25 gate passes — raising it earlier re-opens a frozen contract for a
   feature that may be cancelled.
4. **Its latency is unmeasured.** `GRAPH.COPY` latency is `NOT_CLAIMED` (VF-W6, DS-10) and must be
   measured *before* the stretch is committed. No timing for it may be stated anywhere until then.

**Decision tree at the 16:25 gate:**

```
16:25 verify_milestone
├─ spine standing (DC-1..DC-5 green) AND GRAPH.COPY latency measured AND acceptable
│   └─ ADD /counterfactual + request the v1.1 amendment for its endpoint. Nine committed
│      routes unchanged.
├─ spine standing but GRAPH.COPY latency unmeasured or too slow
│   └─ NO-GO. Record the measurement (or its absence) honestly. Do not ship a route whose
│      backing call has no number.
└─ spine not standing
    └─ DEAD. Delete the route file + the single entry point. Time goes to the committed
       surface. Nothing to unwind, by construction (rules 1 and 2).
```

Record the go/no-go explicitly at the gate (DS-11 acceptance). An unrecorded gate is a gate that
did not happen.

---

## 8. Judge's attack, beside each architectural claim

| Claim | The attack | The answer |
|---|---|---|
| Nine routes is derived, not padding | You inflated route count to look substantial | Every route maps one-to-one onto a frozen endpoint or a frozen identifier (§2), and all eight endpoints are consumed with none orphaned. Class 4 arrives *holding an id*, which a single-page surface cannot address |
| The console can be built from the contract alone | It never is | Mitigated structurally, not promised: every endpoint carries a worked request and response, `/slots/{key}/graph` exists specifically for the visualisation, node ids are frozen (§5), and ε/λ/corpus come from `/health`. Residual gaps are a v1.1 amendment — `[UNVERIFIED]`, and DC-5 / DS-13 is the only done-criterion the engine chat cannot self-certify |
| No blended score can leak | A console can always blend what it renders | The payload has no blended field to render: three components are distinct on every `Components` object, `path_weight` is raw alongside, and `score_is_ordinal: true` rides on every scored object (`CONTRACT.md` §0 rules 1–2, §4) |
| The stretch does not entangle the spine | Stretches always leak | Enforced by import direction (§7 rules 1–2) and by the stretch needing an endpoint that does not yet exist — so it cannot be half-wired into a committed route without a visible v1.1 amendment |
| 503 is handled, not papered over | Everyone says that and then ships a graceful degrade | The specified behaviour is the opposite of graceful: render the failing assertion and **no numbers at all**. Degrading would display the exact wrong quantity the assertion exists to catch (§6) |
| The routes serve real users | They serve the demo | Each route names its class and that class's genesis precondition (§1, `USER-ONBOARDING.md` §3). The REAL and DEMO paths are identical and the console has no data source other than the eight endpoints |

---

## 9. Hand-off

- **To `design-forge` (R5, in full, its own chat):** the ten rows in §3, the per-route data
  dependencies, the state enumerations, the §4 first-contact obligations, the §5 frozen ids, and the
  §6 global states. **Every visual and interaction decision is yours** — this file deliberately
  makes none.
- **To `hackathon-build`:** §2's bidirectional completeness is the real contract-conformance test
  (DC-5 / DS-13). The `{key}` URL-encoding trap in `/slots/[key]` and the "never a 500" rule are
  `PLAN.md` §6 cases.
- **To `hackathon-demo`:** the funnel in §4 is the shot order; the money-shot is the refusal with
  `independence: 1`.
- **To `hackathon-package`:** deep links the README and the form should carry are one slot, one
  receipt, and `/proof`. ε and λ come from the live `/health` (DS-8).
- **To `verify_milestone` at 16:25:** §7's decision tree, and record the go/no-go (DS-11).
