# FEATURE-OBSERVABLES — MENGER

> **What this file is.** For every feature MENGER ships, the **observable** that proves it
> works, the **exact command** a judge or a verify agent runs to check it with nobody
> present, what **PASS** looks like, and what **FAIL** looks like.
>
> **The rule this file is written under:** *an observable with no stated failure appearance
> is not yet an observable.* A check that only describes success cannot distinguish a working
> feature from a stubbed one, and under artifact-only judging (AF-10) that distinction is the
> whole product. Every row below therefore carries a FAIL appearance, and several carry a
> **false-PASS** appearance as well — the shape a broken build takes when it still returns
> HTTP 200.
>
> **Claim state of this file.** No endpoint has been built or probed. Every HTTP-level
> behaviour below is the **specified expected observable**, tagged `[UNVERIFIED]`, and its
> actual result is `NOT_CLAIMED` until the engine build records it. The only `[VERIFIED]`
> facts carried here are the upstream live probes in `.law12-feasibility.json`
> (AF-3, AF-4, AF-6, AF-7, AF-8, AF-9) — and where a row leans on one, it says which.
>
> **Scope boundary.** This file specifies *what must be observable*. It does not specify how
> any of it is rendered. Console presentation is `design_forge`'s, in full (R5). If a sentence
> here reads as a layout or styling instruction, treat it as a defect in this file.

---

## 0. How to use this file

Three audiences, three entry points.

| Reader | Entry point | What they do |
|---|---|---|
| **A judge, alone, no operator** | §2 `F-1`, `F-3`, `F-7`, `F-8` | Four commands, in that order. They establish: the engine is honest about itself, the headline number is the right quantity, the verdict is receipted, and the receipt re-executes. |
| **A verify agent** | §2 in full, then §3 | Runs every row, records PASS/FAIL per row, and fails the phase on any FAIL — including the false-PASS discriminators in §3. |
| **The engine build chat** | §2's FAIL columns | Each FAIL appearance is a test case. A feature is not done when its PASS appears; it is done when its FAIL *also* appears on the corresponding broken input. |

**Preconditions for every command in this file**

```bash
# the engine, from CONTRACT.md §0
export MENGER=http://localhost:8000
# FalkorDB, from .input-manifest.json row FALKORDB_URL  [VERIFIED: AF-9]
#   container gh-falkor, image falkordb/falkordb:v4.22.1, redis://localhost:6379
# jq is required for every check below.
```

If `$MENGER` is a deployed instance instead of localhost, substitute `PUBLIC_BASE_URL`
(`.input-manifest.json`, `deferred-until-deploy`, currently `NOT_CLAIMED`). Nothing else
in this file changes — every check is pure HTTP against the 8 frozen endpoints.

**The one-command gate.** If a judge will run exactly one thing, it is `F-1`. A MENGER that
cannot pass its own boot assertions returns 503 and serves nothing, so `F-1` passing is a
precondition for every other row in this file. That ordering is deliberate: it makes the
honesty check unskippable rather than optional.

---

## 1. Observable ledger — index

Twelve features, twelve observables. `F-12` is the only stretch row and the only row whose
absence is a planned outcome rather than a defect.

| Row | Feature | The observable in one line | Endpoint | Leans on |
|---|---|---|---|---|
| F-1 | Boot assertions, fail-closed | `/health` publishes all three controls; any mismatch is 503, not a wrong number | `GET /health` | AF-3, AF-6, AF-16 |
| F-2 | Admission verdict on write | `POST /remember` returns one of exactly three verdicts, with margin and ε | `POST /remember` | CONTRACT §2.1 |
| F-3 | `independence` is vertex-disjoint | an echo through one shared origin scores `1`, not `2` | `POST /remember`, `GET /slots/{key}` | AF-6, DS-1 |
| F-4 | `reliability` from `weightProp` | `path_weight` is a non-integer sum of `−ln(trust)`, surfaced raw | `GET /receipts/{id}` | AF-3, DS-2 |
| F-5 | Recency decay and ordinality | `recency = exp(−λ·age_hours)`; every scored object says `score_is_ordinal: true` | all scored endpoints | CONTRACT §0 r.2 |
| F-6 | Nothing silently lost | `recorded: true` always; UNDECIDED gets a `review_id` that appears in `/review` | `POST /remember`, `GET /review` | CONTRACT §0 r.4 |
| F-7 | DOCKET receipt | the receipt carries the verbatim parameterised Cypher that was executed | `GET /receipts/{id}` | CONTRACT §2.5 |
| F-8 | Replay reproduces | re-executing the receipt's Cypher returns the same components, modulo recency | `POST /receipts/{id}/replay` | CONTRACT §2.6 |
| F-9 | Provenance subgraph | the node-split is visible as `si:`/`so:` pairs, with a witness set per claim | `GET /slots/{key}/graph` | CONTRACT §2.4 |
| F-10 | ε and λ are server constants | the console reads them from the wire; they are never literals in the bundle | `GET /health` + every decision | AF-17, DS-8, R-4 |
| F-11 | Read containment | every recorded read names `GRAPH.RO_QUERY`; a CREATE through that path is rejected | `GET /receipts/{id}` + engine probe | AF-8 |
| F-12 | Counterfactual *(stretch)* | a what-if runs on a copied graph and the live graph is unchanged | stretch route | DS-10 `NOT_CLAIMED` |

**Row count: 12.** `.forge-state.json .feature_observables` is currently `null`, so the
doc-floor reconcile gate reads this as 0 rows and is N/A. Master must populate it with these
twelve ids for the reconcile to be meaningful.

---

## 2. The observables

### F-1 — Boot assertions are published, and the service fails closed

**Feature.** MENGER verifies three measured controls at startup and publishes the result on a
public endpoint. If any control does not reproduce, it refuses to serve rather than serve a
wrong headline number (AF-16, R-1, R-3).

**Why this is the headline observable.** The project's central claim is a *number*:
`independence` is a count of vertex-disjoint origin chains. A number is only as credible as
the thing that would catch it being wrong. `F-1` is that thing, and it is reachable by a
stranger in one command.

**The observable.** `GET /health` returns `boot_checks` with three named controls, each
carrying `expected`, `actual` and `pass`, and `boot_checks.passed` is the AND of them. The
expected values are the measured upstream probes, not chosen constants:
`node_split_echo = 1` and `node_split_independent = 2` `[VERIFIED: AF-6]`,
`sp_path_weight = 0.21072` `[VERIFIED: AF-3]`.

**Check (unaided):**
```bash
curl -sS -i "$MENGER/health" | head -1
curl -sS "$MENGER/health" | jq '{ok, boot_checks}'
```

**PASS appearance** — HTTP `200`, and:
```jsonc
{
  "ok": true,
  "boot_checks": {
    "passed": true,
    "node_split_echo":        { "expected": 1,       "actual": 1,       "pass": true },
    "node_split_independent": { "expected": 2,       "actual": 2,       "pass": true },
    "sp_path_weight":         { "expected": 0.21072, "actual": 0.21072, "pass": true }
  }
}
```
Three controls present, all three `pass: true`, and `expected` equal to the three measured
numbers above. **Read the `expected` values, not just the `pass` flags** — see the false-PASS
note below.

**FAIL appearance** — HTTP `503`, and a body in the uniform `Error` shape with
`code: "BOOT_ASSERTION_FAILED"`, whose `message` names the control and both numbers and whose
`detail.boot_checks` carries the failing control (CONTRACT §2.8). For example, with the
node-split regressed out of the loader:
```jsonc
{ "error": { "code": "BOOT_ASSERTION_FAILED",
             "message": "node_split_echo expected 1, got 2 — the node-split is not in effect",
             "field": null,
             "detail": { "boot_checks": { "passed": false,
               "node_split_echo": { "expected": 1, "actual": 2, "pass": false } } } } }
```
This 503 is the **correct** behaviour of a broken MENGER, and it is itself a feature. A judge
seeing it has learned the system is honest; a judge seeing a 200 with `actual: 2` has learned
the opposite.

**False-PASS appearance (the shape to hunt).** `200`, `passed: true`, and `expected` values
that have been edited to match a broken `actual` — e.g. `sp_path_weight.expected: 1.0`, which
is the hop-count that a wrong weight key silently returns (AF-3). A boot assertion whose
expected value is derived from the running system asserts nothing. Discriminator in §3.1.

**Claim state.** Specified, not built. `[UNVERIFIED]`; actual response `NOT_CLAIMED`.

---

### F-2 — A write gets an admission verdict, with its arithmetic exposed

**Feature.** `POST /remember` is the gate. It returns ALLOW, BLOCK or UNDECIDED, and it
returns the inputs to that decision rather than only its conclusion.

**The observable.** A `200` whose `verdict` is in `{ALLOW, BLOCK, UNDECIDED}`, whose `status`
is the contract's total mapping of that verdict (`ALLOW→ADMITTED`, `BLOCK→REFUSED`,
`UNDECIDED→QUEUED`), and which carries `margin`, `epsilon`, `recorded`, `receipt_id`, and
both `incoming` and `incumbent` as full `ScoredClaim`s (`incumbent` null only on an
uncontested slot). The decision rule is reproducible by hand from `margin` and `epsilon`
alone (CONTRACT §2.1).

**Check (unaided):**
```bash
curl -sS -X POST "$MENGER/remember" -H 'content-type: application/json' -d '{
  "agent_id":"agt_scraper_2","subject":"customer:acme","predicate":"primary_region",
  "object":"us-east-1","sources":["src_blog_echo_a","src_blog_echo_b"]}' \
| jq '{verdict, status, margin, epsilon, recorded, receipt_id, review_id,
       in_s: .incoming.score, inc_s: .incumbent.score}'
```

**PASS appearance.** `verdict` one of the three; and the rule checks out arithmetically:

| Observed | Must hold | Must also hold |
|---|---|---|
| `verdict: "ALLOW"` | `margin > epsilon` | `status == "ADMITTED"`, `review_id == null` |
| `verdict: "BLOCK"` | `margin < -epsilon` | `status == "REFUSED"`, `review_id == null` |
| `verdict: "UNDECIDED"` | `abs(margin) <= epsilon` | `status == "QUEUED"`, `review_id` non-null |

and in all three cases `recorded == true`, `receipt_id` non-null, and
`margin == incoming.score - incumbent.score` (with `incumbent.score` treated as `0.0` when
`incumbent` is null). One line to assert the arithmetic:
```bash
curl -sS -X POST "$MENGER/remember" -H 'content-type: application/json' -d @- <<'EOF' \
| jq 'if .verdict=="ALLOW" then .margin > .epsilon
      elif .verdict=="BLOCK" then .margin < (-.epsilon)
      else (.margin|fabs) <= .epsilon end'
{"agent_id":"agt_scraper_2","subject":"customer:acme","predicate":"primary_region",
 "object":"us-east-1","sources":["src_blog_echo_a","src_blog_echo_b"]}
EOF
# expect: true
```

**FAIL appearances**, each distinct and each diagnostic:

| What you see | What it means |
|---|---|
| the `jq` assertion prints `false` | the verdict does not follow from the margin and ε — the decision rule is not the contract's rule |
| `verdict` outside the three values | enum violation; the console's state machine has an unhandled branch |
| `status` not the mapped partner of `verdict` | the two were computed independently instead of one from the other |
| `recorded: false`, or the field absent | a write was dropped — this breaks the `F-6` guarantee, not just this row |
| `receipt_id: null` | the verdict is unreceipted, so `F-7` and `F-8` are unreachable for it |
| `margin` absent, or present without `epsilon` | the decision is asserted rather than shown; the judge cannot re-derive it |
| `400 NO_SOURCES` on a request that *has* sources | validation is misreading the body |
| `422 UNKNOWN_SOURCE` with `detail.unknown` | correct behaviour, wrong fixture — the seed corpus does not contain those source ids |

**Claim state.** `[UNVERIFIED]`; `NOT_CLAIMED`. Note the request above is the contract's own
worked example (CONTRACT §2.1), so the request shape is frozen; the response values are
illustrative there and measured nowhere yet.

---

### F-3 — `independence` counts vertex-disjoint chains, so an echo scores 1

**Feature.** The mechanism. `algo.maxFlow` runs over a **node-split** provenance DAG
(each Source becomes `(:SourceIn)-[:FLOW {cap:1.0}]->(:SourceOut)`), which makes
edge-disjoint equal vertex-disjoint. By Menger's theorem the max-flow is then the number of
vertex-disjoint origin→claim chains — which is what "independent sources" means.

**Why the split is non-negotiable (DS-1).** Without it, `maxFlow` over unit-capacity edges
counts *edge*-disjoint paths. That is a different quantity, and it is wrong in exactly the
direction that matters: two citations that both funnel through one shared origin have two
edge-disjoint paths and one vertex-disjoint chain, so an echo chamber would score as
corroboration. `[VERIFIED: AF-6]` — measured live, both before and after the split:
echo graph → 1, independent graph → 2.

**The observable.** Two claims from the seeded corpus, read through the API:

| Set-piece | Provenance | `components.independence` | Verdict direction |
|---|---|---|---|
| **A — the echo** | two citations, both derived from one shared origin source | **`1`** | loses the slot; BLOCK on submit |
| **B — the independent pair** | two citations with disjoint origins | **`2`** | wins the slot |

A and B are one lesson, not two: the same submission mechanics, the same endpoint, the same
three components — and a different integer, because the provenance differs. B is what makes A
legible. Shown alone, `independence: 1` looks like a low score; shown next to `2`, it is
visibly a *count*.

**Check (unaided).** Read the seeded slot and compare the two claims' `independence` directly:
```bash
SLOT='customer%3Aacme%7Cprimary_region'     # customer:acme|primary_region, URL-encoded
curl -sS "$MENGER/slots/$SLOT" \
| jq '[.claims[] | {claim_id, object,
                    independence: .components.independence,
                    sources: [.sources[].source_id]}]'
```
and confirm the two integers against the published controls:
```bash
curl -sS "$MENGER/health" \
| jq '.boot_checks | {echo: .node_split_echo.actual, indep: .node_split_independent.actual}'
# expect: {"echo": 1, "indep": 2}
```

**PASS appearance.** The echo claim reports `independence: 1` **while listing two or more
sources** — that juxtaposition is the whole point, and it is why `sources` is in the `jq`
projection. The independent claim reports `independence: 2` with two sources. `/health`
reports the same two integers as its controls.

**FAIL appearances:**

| What you see | What it means |
|---|---|
| the echo claim reports `independence: 2` with two sources | **the node-split is not in effect.** `maxFlow` is counting edge-disjoint paths. This is the single most load-bearing defect in the project, and `F-1` should already have caught it with a 503 |
| `independence` is a float (`2.0`, `1.9997`) | the integer contract (CONTRACT §0 r.6) is broken; a float here means the count is being derived from a capacity sum rather than read as a flow value |
| `independence` equals the length of `sources` on every claim | the field is being computed from the citation count, not from the graph. Cheap to write, and it makes the echo case indistinguishable from the independent one — the exact failure MENGER exists to prevent |
| `independence: 0` on a claim with sources | the super-source `ss` is not connected to the split-in nodes, so no flow reaches the claim |
| `404 SLOT_NOT_FOUND` | the slot key was not URL-encoded — `:` must be `%3A` and `|` must be `%7C` (CONTRACT §2.3) |

**Cross-check against `F-9`.** `witness_sets[claim_id]` from `GET /slots/{key}/graph` should
have **length equal to that claim's `independence`** — the saturated split edges *are* the
independent origins. Two fields, two code paths, one number. If they disagree, one of them is
fabricated. This is the strongest single check in this file and it costs one extra request.

**Claim state.** The graph-level behaviour is `[VERIFIED: AF-6]`. The *API surfacing* of it
is `[UNVERIFIED]`; `NOT_CLAIMED`.

---

### F-4 — `reliability` comes from the weighted path, with `path_weight` raw alongside

**Feature.** `reliability = exp(−path_weight)`, where `path_weight` is the `algo.SPpaths`
weighted total over edges carrying `nl = −ln(trust)`. The raw `path_weight` is surfaced next
to the derived `reliability` on every `Components` object (CONTRACT §0 r.7).

**Why raw alongside derived.** `algo.SPpaths` accepts **only** the key `weightProp`.
`weightProperty`, `relationshipWeightProperty` and `costProperty` are accepted **silently**
and return **hop count** — a wrong key yields a plausible wrong number with no error
`[VERIFIED: AF-3]`. Hop count is a small integer. A weighted sum of `−ln(trust)` over
trusts in (0,1) is almost never an integer. Surfacing `path_weight` raw therefore makes the
trap *visible in the receipt*: the judge does not need to know the key name to see that the
number has the wrong shape.

**The observable.** On every scored claim, `path_weight >= 0` and
`reliability == exp(-path_weight)` to float tolerance; and in the receipt, the
`reliability.SPpaths` statement's `query` text contains the literal `weightProp:`.

**Check (unaided):**
```bash
RCPT=rcpt_0061   # any receipt_id from an F-2 response or GET /slots/{key}
curl -sS "$MENGER/receipts/$RCPT" | jq '
  { weight_key_present:
      ([.cypher[] | select(.label=="reliability.SPpaths") | .query]
       | map(test("weightProp[[:space:]]*:")) | all),
    forbidden_keys:
      ([.cypher[].query] | map(test("weightProperty|relationshipWeightProperty|costProperty")) | any),
    candidates:
      [.candidates[] | { claim_id,
                         path_weight: .components.path_weight,
                         reliability: .components.reliability,
                         exp_check:   ((.components.reliability
                                        - (-(.components.path_weight) | exp)) | fabs < 0.0005),
                         integral:    (.components.path_weight == (.components.path_weight | floor)) }] }'
```

**PASS appearance.** `weight_key_present: true`, `forbidden_keys: false`, every candidate
`exp_check: true`, and `integral: false` on every claim whose sources have non-unit trust.
Additionally `path_weight` for the seeded independent claim should be the measured
`0.21072` `[VERIFIED: AF-3]`, which is the same number `/health` publishes as `sp_path_weight`.

**FAIL appearances:**

| What you see | What it means |
|---|---|
| `forbidden_keys: true` | a wrong weight key is in the executed Cypher. Every `reliability` in this receipt is hop count wearing a reliability label |
| `integral: true` across the board, `path_weight` ∈ {1, 2, 3} | hop count, by its shape. The strongest signal available without reading the Cypher |
| `exp_check: false` | `reliability` was not derived from the `path_weight` shown — one of the two is decorative |
| `path_weight` absent from `components` | the trap has been made invisible; the receipt can no longer be audited for it (CONTRACT §0 r.7 violation) |
| `reliability > 1` or `< 0` | not `exp(−x)` for any `x >= 0`; the formula is not the contract's |
| `/health` `sp_path_weight.actual != 0.21072` | caught upstream — this is an `F-1` 503, and it exists precisely so this row cannot fail quietly |

**Claim state.** The key-name constraint and `0.21072` are `[VERIFIED: AF-3]`. The API
surfacing is `[UNVERIFIED]`; `NOT_CLAIMED`.

---

### F-5 — Recency decays, and the score is ordinal everywhere it appears

**Feature.** `recency = exp(−λ · age_hours)`, and the composite
`score = independence × reliability × recency` is **ordinal, not cardinal** — a rank, never a
probability or a percentage. Every object carrying a `score` carries `score_is_ordinal: true`.

**Why ordinality is an observable and not a disclaimer.** `score` is a product of an integer
count and two exponentials. It has no units and no calibration, so `1.5002` means only
"ranks above `0.5220`". The contract makes the flag mandatory on every scored object rather
than stating it once, because a number that travels without its flag gets rendered as a
confidence by whoever receives it next. Checking the flag's presence *everywhere* is checking
that the constraint is structural rather than editorial.

**The observable.** Three things, each independently checkable:
1. `score_is_ordinal: true` appears on every object that has a `score` — in `/remember`
   (top level and both `ScoredClaim`s), `/slots`, `/slots/{key}`, and `/receipts/{id}`.
2. `recency == exp(-lambda * age_hours)` with the `lambda` that `/health` publishes.
3. `score == independence * reliability * recency` to float tolerance.

**Check (unaided):**
```bash
LAM=$(curl -sS "$MENGER/health" | jq '.lambda')
SLOT='customer%3Aacme%7Cprimary_region'
curl -sS "$MENGER/slots/$SLOT" | jq --argjson lam "$LAM" '
  { ordinal_flag_on_slot: .score_is_ordinal,
    every_claim_flagged: ([.claims[].score_is_ordinal] | all),
    rows: [.claims[] | {
      claim_id,
      recency_ok: (((.components.recency) - ((-($lam) * .components.age_hours) | exp)) | fabs < 0.0005),
      score_ok:   ((.score - (.components.independence * .components.reliability * .components.recency)) | fabs < 0.0005)
    }] }'
# and the flag must survive every other surface:
for P in "/slots" "/slots/$SLOT" "/receipts/rcpt_0061" "/review"; do
  printf '%s -> ' "$P"; curl -sS "$MENGER$P" | grep -c 'score_is_ordinal' ;
done
```

**PASS appearance.** `ordinal_flag_on_slot: true`, `every_claim_flagged: true`, every row
`recency_ok: true` and `score_ok: true`, and the loop prints a **non-zero count on every
surface that returns a score**. `/review` items carry `score` on `incoming`/`incumbent`, so a
`0` there is a real gap, not an exemption.

**FAIL appearances:**

| What you see | What it means |
|---|---|
| any `score_is_ordinal` missing or `false` | the ordinality guarantee is per-endpoint rather than structural; the next consumer will render that score as a confidence |
| the loop prints `0` for a surface carrying scores | the flag was added where it was reviewed and omitted where it was not |
| `recency_ok: false` | `recency` is not `exp(−λ·age_hours)` for the published λ — either the formula differs or λ is not the λ being used (then see `F-10`) |
| `score_ok: false` | the composite is not the product of the three published components, so the three "separately surfaced" components are not the ones that decided the verdict |
| `recency` identical across claims with different `age_hours` | decay is not applied; λ is effectively 0 |
| `recency > 1` | `age_hours` is negative — an `asserted_at` in the future is being accepted |

**A note on λ, flagged as a source contradiction.** Three values appear across the sources:
`PLAN.md` §5 and the redo brief give **λ = 0.01/hour** `[ASSUMED]`, while `CONTRACT.md`'s
illustrative examples show **`lambda: 0.0077`**, and `.input-manifest.json` row
`RECENCY_LAMBDA` is **`unresolved`, owner `build`**. The operative rule is not a number: read
λ from `GET /health` and never copy it from a document, this one included. Same for ε. See
`F-10`, and §4.

**Claim state.** `[ASSUMED]` for λ's value; `[UNVERIFIED]` for the surfacing; `NOT_CLAIMED`.

---

### F-6 — Nothing is silently lost

**Feature.** A refused write is *recorded*, not dropped. An UNDECIDED write lands in a review
queue a human can enumerate.

**Why this is a feature and not a nicety.** An admission-control gate that discards what it
refuses is unauditable: the operator cannot tell "nothing was submitted" from "something was
submitted and thrown away". `recorded: true` on every response plus a non-null `review_id`
on UNDECIDED is what makes a BLOCK reversible by a human instead of final.

**The observable.** `recorded == true` on **every** `/remember` response regardless of
verdict; and for an UNDECIDED verdict, `review_id` is non-null and that exact id appears in
`GET /review?status=OPEN`, with the same `margin` and the same `receipt_id`.

**Check (unaided).** The UNDECIDED path needs a near-tie, which is what the corpus's
deliberate-tie set-piece exists for (a slot seeded so `|margin| <= ε`). Submit against it,
then follow the id:
```bash
R=$(curl -sS -X POST "$MENGER/remember" -H 'content-type: application/json' -d '{
  "agent_id":"agt_crawler_1","subject":"vendor:northwind","predicate":"sla_tier",
  "object":"gold","sources":["src_vendor_portal"]}')
echo "$R" | jq '{verdict, recorded, review_id, margin, epsilon, receipt_id}'
RID=$(echo "$R" | jq -r '.review_id')
curl -sS "$MENGER/review?status=OPEN" \
| jq --arg rid "$RID" '{total, found: [.items[] | select(.review_id==$rid)
                                       | {review_id, status, margin, reason, receipt_id, slot_key}]}'
```

**PASS appearance.** `recorded: true`; `verdict: "UNDECIDED"` with `status: "QUEUED"` and a
non-null `review_id`; and `found` is a one-element array whose `status` is `"OPEN"`, whose
`reason` is `"WITHIN_EPSILON"` (the only v1.0 value), and whose `margin` and `receipt_id`
equal the ones in the `/remember` response. For a BLOCK, `recorded: true` with
`review_id: null` and a non-null `receipt_id` — recorded *and* receipted, just not queued.

**FAIL appearances:**

| What you see | What it means |
|---|---|
| `recorded` absent or `false` | the guarantee is not implemented. The strongest form of this defect is a BLOCK that writes no claim node at all |
| `verdict: "UNDECIDED"` with `review_id: null` | the queue is not being written; the item is lost at the moment it was declared too close to call |
| `found: []` | the `review_id` was minted in the response but no `(:Review)` node exists — the id is cosmetic |
| `found` present but `margin` differs from the response's | the queue is storing a re-computed margin, so the queue and the receipt disagree about the same decision |
| `/review` returns items with `abs(margin) > epsilon` | items are being queued by a rule other than the ε-band |
| a 4xx/5xx on `POST /review/...` *in the console* | v1.0 is **read-only**; no resolution endpoint exists (CONTRACT §2.7). A console that offers a Resolve action has assumed an endpoint outside §2 |

**Claim state.** `[UNVERIFIED]`; `NOT_CLAIMED`. The tie set-piece is part of the seed corpus,
which is `.input-manifest.json` row `seed_dataset`, `unresolved`, owner `build`.

---

### F-7 — The DOCKET receipt carries the exact query that was executed

**Feature.** Every verdict has a receipt containing the **verbatim parameterised Cypher** that
produced it, in execution order, each statement naming its read command, plus the
independence witness set and the reliability path per candidate.

**The wording that matters.** FalkorDB has **no stored procedures**. What the receipt carries
is *a single parameterised Cypher query* per statement — text plus a params map, recorded as
executed. Any artifact calling it a stored procedure is a defect (brief §2).

**The observable.** `GET /receipts/{id}` returns `cypher[]` with at least the two load-bearing
statements (`independence.maxFlow`, `reliability.SPpaths`); each has `query`, `params`,
`duration_ms` and `read_command == "GRAPH.RO_QUERY"`; and the `query` text is
**parameterised** — identifiers appear as `$name` keys resolved by `params`, not interpolated
literals. `engine` names the pinned image `falkordb/falkordb:v4.22.1` `[VERIFIED: AF-9]`.

**Check (unaided):**
```bash
curl -sS "$MENGER/receipts/rcpt_0061" | jq '
  { engine,
    labels:        [.cypher[].label],
    all_ro:        ([.cypher[].read_command] | map(. == "GRAPH.RO_QUERY") | all),
    parameterised: ([.cypher[] | (.query | test("\\$[a-zA-Z_]")) and ((.params|length) > 0)] | all),
    one_rel_type:  ([.cypher[] | select(.label=="independence.maxFlow")
                     | .query | test("relationshipTypes[[:space:]]*:[[:space:]]*\\[[^,\\]]*\\]")] | all),
    no_ghost_algos:([.cypher[].query] | map(test("algo\\.dijkstra|algo\\.SCC")) | any),
    witness:       [.candidates[] | {claim_id,
                                     max_flow: .independence_witness.max_flow,
                                     witness_n: (.independence_witness.witness_nodes|length),
                                     paths_n: (.independence_witness.paths|length)}] }'
```

**PASS appearance.** `labels` contains both load-bearing statements; `all_ro: true`;
`parameterised: true`; `one_rel_type: true` (`algo.maxFlow` takes **exactly one**
relationship type `[VERIFIED: AF-4]`); `no_ghost_algos: false`; and per candidate
`max_flow == witness_n == paths_n == components.independence` — four expressions of one
number, all agreeing. `engine.image == "falkordb/falkordb:v4.22.1"`.

**FAIL appearances:**

| What you see | What it means |
|---|---|
| `cypher: []`, or only one statement | the receipt is a summary, not a record. Nothing for `F-8` to replay |
| `parameterised: false` | the recorded text has values interpolated into it. It may still replay, but it is no longer the parameterised query that ran, and it is an injection surface for any generated-Cypher path |
| `all_ro: false` | a read ran outside the containment boundary — see `F-11` |
| `no_ghost_algos: true` | `algo.dijkstra` or `algo.SCC` appears. **Neither exists in v4.22.1** `[VERIFIED: AF-1]`; the text cannot have executed, so `cypher[]` is transcribed from a design document rather than recorded from a run. This is the clearest possible evidence of a fabricated receipt |
| `one_rel_type: false` (two or more types in `maxFlow`) | violates AF-4's measured signature |
| `max_flow != components.independence` | the witness and the score were computed in different places; one is stale |
| `witness_n != max_flow` | the witness set is not the saturated-edge set; the "here are your independent origins" claim is decorative |
| `duration_ms` absent, or identical on every statement | timings are synthesized, which casts doubt on whether the statements ran at all |

**Claim state.** `[UNVERIFIED]`; `NOT_CLAIMED`. Receipt *shape* is frozen (CONTRACT §2.5);
the measured `duration_ms` reference points are 41ms cold / 11ms warm on 1402 nodes /
2400 edges `[VERIFIED: AF-7]` — note that is the `maxFlow` probe, not an HTTP latency, and no
HTTP latency is claimed anywhere.

---

### F-8 — The receipt replays, and divergence is explained rather than hidden

**Feature.** `POST /receipts/{id}/replay` re-executes the receipt's recorded Cypher verbatim
through `GRAPH.RO_QUERY` and reports whether the components reproduce.

**Why replay is the credibility artifact.** Under artifact-only judging the judge cannot watch
the decision happen. Replay is the substitute: it lets them re-run a past verdict's exact
queries now and compare. The containment boundary is what makes that safe — the replay cannot
mutate the graph it is auditing `[VERIFIED: AF-8]`.

**The observable.** A `200` with `matches_original: true`, a `statements[]` array pairing
`original` against `replayed` per statement with a `match` flag, `components_then` vs
`components_now`, and a `divergence[]` that **names a reason** for every difference. Crucially:
`matches_original` ignores `recency` drift — time moves, `reason: "RECENCY_DECAY"` is expected
and benign — and is `false` only on `GRAPH_MUTATED` or `ENGINE_DIFF`.

**Check (unaided):**
```bash
curl -sS -X POST "$MENGER/receipts/rcpt_0061/replay" -H 'content-type: application/json' -d '{}' \
| jq '{matches_original,
       stmt_matches: [.statements[] | {label, match, original, replayed}],
       divergence,
       bad_divergence: [.divergence[] | select(.reason != "RECENCY_DECAY")],
       indep_stable: ([.statements[] | select(.label=="independence.maxFlow")
                       | .original.max_flow == .replayed.max_flow] | all)}'
```

**PASS appearance.** `matches_original: true`; `indep_stable: true`; `bad_divergence: []`; and
`divergence` either empty or containing only `recency` entries with
`reason: "RECENCY_DECAY"`. A `divergence` showing recency drifting downward between
`components_then` and `components_now` is the **healthy** reading — it demonstrates the clock
is real and the replay is not serving a cached response.

**FAIL appearances:**

| What you see | What it means |
|---|---|
| `matches_original: false` with `reason: "GRAPH_MUTATED"` | the graph changed under the receipt. Honest, and correctly reported — but the receipt no longer reproduces, and the judge needs to know why the graph moved |
| `matches_original: false` with `reason: "ENGINE_DIFF"` | same queries, different engine answers — a version or configuration drift |
| `matches_original: true` while `bad_divergence` is non-empty | the flag is hardcoded. The single most damaging false-PASS on this row: a judge reads `true` and stops |
| `divergence: []` and `components_now == components_then` **exactly**, including recency | nothing re-executed. Either a cached result or a stub. Recency *must* drift for any receipt older than a moment |
| `matches_original: false` with `reason: "RECENCY_DECAY"` | contract inversion — recency drift is explicitly excluded from the flag (CONTRACT §2.6) |
| `409 REPLAY_MISMATCH` | a recorded statement failed to **execute**. Distinct from reproducing a different value: the text itself is not runnable, which usually means `F-7`'s `cypher[]` was not recorded from a real run |
| `404 RECEIPT_NOT_FOUND` | receipts are not persisted across the engine's lifetime; replay is unusable to a judge arriving later |
| `503 ENGINE_UNAVAILABLE` | FalkorDB is unreachable. Correct behaviour, wrong environment |

**Claim state.** `[UNVERIFIED]`; `NOT_CLAIMED`. RO_QUERY containment itself is
`[VERIFIED: AF-8]`.

---

### F-9 — The provenance subgraph is renderable, and the split is visible on purpose

**Feature.** `GET /slots/{key}/graph` returns the node-split DAG that the max-flow runs over,
as nodes and edges, plus a witness set per claim.

**Why the endpoint exists.** It was placed in the frozen contract specifically so the
provenance visualisation can be built without renegotiating the contract mid-build. Its
node-id conventions are frozen, verbatim from CONTRACT §2.4:

> `node.id` conventions are frozen: `ss` for the super-source, `si:<source_id>` /
> `so:<source_id>` for a split pair, the bare `claim_id` for a claim.

And the split is exposed deliberately: `SourceIn`/`SourceOut` pairs **are** the mechanism, not
an implementation detail to hide.

**The observable.** `nodes[]` with ids obeying those conventions and labels in
`{SuperSource, SourceIn, SourceOut, Claim}`; `edges[]` typed `FLOW` or `DERIVED_FROM`, with
`cap` on flow edges and `nl` on weighted ones; every split pair present as both `si:` and
`so:`; and `witness_sets[claim_id]` listing the saturated split edges as the independent
origins.

**Check (unaided):**
```bash
SLOT='customer%3Aacme%7Cprimary_region'
curl -sS "$MENGER/slots/$SLOT/graph" | jq '
  { has_ss:    ([.nodes[].id] | index("ss") != null),
    labels:    ([.nodes[].label] | unique),
    id_conventions_ok:
      ([.nodes[] | (.id == "ss")
                   or (.id | test("^si:")) or (.id | test("^so:"))
                   or (.label == "Claim")] | all),
    split_pairs_complete:
      (([.nodes[] | select(.label=="SourceIn")  | .id | sub("^si:";"")] | sort)
       == ([.nodes[] | select(.label=="SourceOut") | .id | sub("^so:";"")] | sort)),
    edge_types: ([.edges[].type] | unique),
    witness_sets,
    witness_all_so: ([.witness_sets | to_entries[] | .value[] | test("^so:")] | all) }'
```
then the cross-check that makes this row load-bearing:
```bash
# witness-set length must equal that claim's independence
curl -sS "$MENGER/slots/$SLOT"       | jq '[.claims[] | {claim_id, independence: .components.independence}]'
curl -sS "$MENGER/slots/$SLOT/graph" | jq '[.witness_sets | to_entries[] | {claim_id: .key, witness_n: (.value|length)}]'
```

**PASS appearance.** `has_ss: true`; `id_conventions_ok: true`;
`split_pairs_complete: true`; `labels` a subset of the four; `edge_types` a subset of
`["FLOW","DERIVED_FROM"]`; `witness_all_so: true`; and **per claim, `witness_n` equals
`independence`**. For the echo claim that means a one-element witness set naming the shared
origin — the mechanism, legible in one line of JSON.

**FAIL appearances:**

| What you see | What it means |
|---|---|
| no `si:`/`so:` pairs, Sources appear as single nodes | **the node-split is not in the graph.** Same root defect as `F-3`'s worst case, seen from the data side |
| `split_pairs_complete: false` | a Source has an in-node without an out-node (or vice versa), so its vertex capacity is unenforced and flow can route around the split |
| `witness_all_so: false` | witness sets name `si:` nodes or bare source ids; they are not the saturated split edges |
| `witness_n != independence` for any claim | the two endpoints disagree about the headline integer. **Treat as a project-level defect, not a rendering bug** |
| `witness_sets: {}` while claims exist | independence is reported without evidence; the receipt's "here is why" is empty |
| node ids like `src_crm_export:in` or `in_src_crm_export` | the frozen convention is broken; a parser splitting on the first `:` will mis-key. **Parse on the first `:` only** — source ids themselves may contain `:` |
| `404 SLOT_NOT_FOUND` | unencoded slot key, as in `F-3` |

**Claim state.** `[UNVERIFIED]`; `NOT_CLAIMED`. The split's effect on max-flow is
`[VERIFIED: AF-6]`; the endpoint's response has never been produced.

---

### F-10 — ε and λ are server constants, published, echoed, and never hardcoded

**Feature.** The epsilon band and the recency decay constant live on the server. `/health`
publishes both; `epsilon` additionally echoes on every decision and on every list endpoint
that ranks (AF-17, DS-8, R-4).

**Why this is an observable rather than a convention.** The verdict is a function of ε. If the
console carries its own copy, then the band the user sees and the band that decided are two
values that can drift, and the first time they drift the console is lying about a refusal.
Echoing ε on every decision makes the displayed band *provably* the deciding band.

**The observable, in two halves.**

*Wire half:* `/health` returns numeric `epsilon` and `lambda`; `POST /remember` echoes
`epsilon`; `GET /slots`, `GET /slots/{key}` and `GET /review` each carry `epsilon`;
`GET /slots/{key}` and `GET /receipts/{id}` additionally carry `lambda`; and all of them
agree with `/health`.

*Console half:* neither value appears as a literal in the console source or its built bundle,
and the console issues a `/health` request before rendering any ε-dependent or
recency-dependent figure.

**Check (unaided):**
```bash
H=$(curl -sS "$MENGER/health"); EPS=$(echo "$H" | jq '.epsilon'); LAM=$(echo "$H" | jq '.lambda')
echo "server: epsilon=$EPS lambda=$LAM"
SLOT='customer%3Aacme%7Cprimary_region'
for P in "/slots" "/slots/$SLOT" "/review" "/receipts/rcpt_0061"; do
  printf '%s -> ' "$P"
  curl -sS "$MENGER$P" | jq --argjson e "$EPS" --argjson l "$LAM" \
    '{epsilon, lambda, eps_agrees: (.epsilon == $e or .epsilon == null),
                        lam_agrees: (.lambda  == $l or .lambda  == null)}'
done
```
```bash
# console half — run from the console source root, and again against the built bundle
grep -rn --include='*.ts' --include='*.tsx' --include='*.js' -E '0\.05|0\.0077|0\.01' . \
  | grep -vE '\.test\.|__tests__|\.spec\.|/node_modules/'
# expect: no match that is used as epsilon or lambda. Any hit must be a non-constant coincidence.
```

**PASS appearance.** `epsilon` and `lambda` present and numeric on `/health`;
`eps_agrees`/`lam_agrees` true on every surface that carries them; and the `grep` returning no
ε/λ literal in console code. A ranked view whose ε-band annotation changes when the server's ε
changes — without a console rebuild — is the positive demonstration.

**FAIL appearances:**

| What you see | What it means |
|---|---|
| `/health` missing `epsilon` or `lambda` | the console has no legitimate source for them, so it will hardcode them |
| a surface's `epsilon` disagreeing with `/health`'s | two bands exist in one system; at least one displayed verdict is explained by the wrong number |
| `0.05` or `0.0077` as a literal in console code | hardcoded. The display survives a server change and silently becomes wrong — the exact defect R-4 names |
| the console rendering an ε-band before any `/health` request completes | a default is being used as a placeholder, which is hardcoding with extra steps |
| `lambda` present but `recency` not matching it | see `F-5`'s `recency_ok` — the published λ is not the λ in use |
| `epsilon: 0` | every decision becomes ALLOW or BLOCK; UNDECIDED becomes unreachable and `F-6`'s queue stays empty for a non-obvious reason |

**Claim state.** The *rule* is `[VERIFIED: AF-17]` as a ruled decision. The **values** are
`[ASSUMED]`: ε = 0.05 and λ = 0.01/hour are proposed, unmeasured defaults, calibrated during
the build phase and then reported by `/health`. Both are `unresolved`, owner `build`, in
`.input-manifest.json`. Actual published values: `NOT_CLAIMED`.

---

### F-11 — Reads are contained server-side

**Feature.** Every read goes through `GRAPH.RO_QUERY`, the containment boundary for generated
Cypher. It is enforced **by the engine**, not by client-side string inspection: CREATE is
rejected, MATCH is allowed `[VERIFIED: AF-8]`.

**Why the distinction matters.** A client-side blocklist is a promise; a server-side rejection
is a property. The replay guarantee in `F-8` ("re-executes against an unmutated graph") rests
on the latter. The consequence pinned in the contract: all reads use the **Python** client,
because the TS client does not expose RO_QUERY (FalkorDB issue #408) — which is why the stack
is Python, not a preference.

**The observable, in two halves.**

*API half:* `receipt.engine.read_path == "GRAPH.RO_QUERY"` and every entry in `cypher[]`
carries `read_command: "GRAPH.RO_QUERY"`. Same assertion as `F-7`'s `all_ro`, surfaced here
because the *property* being proven is different.

*Engine half:* a CREATE issued through `GRAPH.RO_QUERY` against the live container is rejected
by the server. This is a **read-only probe of the rejection path** and is safe — the whole
point is that it does not write.

**Check (unaided):**
```bash
curl -sS "$MENGER/receipts/rcpt_0061" \
| jq '{read_path: .engine.read_path,
       all_ro: ([.cypher[].read_command] | map(. == "GRAPH.RO_QUERY") | all)}'
```
```bash
# engine half — read-only. Do NOT stop, restart or `docker rm` the container.
docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "MATCH (n) RETURN count(n)"
docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "CREATE (:Probe {t:1})"
```

**PASS appearance.** `read_path: "GRAPH.RO_QUERY"`, `all_ro: true`; the MATCH returns a count;
and the **CREATE returns an error from the server** — rejection is the pass condition on that
second command, and a judge should expect to see an error there.

**FAIL appearances:**

| What you see | What it means |
|---|---|
| the CREATE **succeeds** | containment is not in effect. Every replay claim collapses: a receipt can no longer be said to re-execute against an unmutated graph |
| `read_path` absent, or any value other than `GRAPH.RO_QUERY` | reads are on the mutable command path. Still works, proves nothing |
| `all_ro: false` on one statement | partial containment; the uncontained statement is the whole hole |
| the CREATE is rejected by a *client* error message rather than a server reply | the blocklist is in the application. A generated query that evades the pattern reaches a mutable path |
| the engine half cannot be run because no container named `gh-falkor` exists | environment mismatch, not a product defect — but then the containment claim is `NOT_CLAIMED` for *that* environment, including any deployed one |

**Claim state.** The engine half is `[VERIFIED: AF-8]` against `gh-falkor` /
`falkordb:v4.22.1`. The API half is `[UNVERIFIED]`; `NOT_CLAIMED`. Containment on a deployed
instance is `NOT_CLAIMED` — it inherits only if the same image and client are used.

---

### F-12 — Counterfactual *(stretch; may legitimately not exist)*

**Feature.** A what-if: copy the graph, alter one trust value or remove one source, re-run the
decision on the copy, and show how the verdict would have differed — with the live graph
provably unchanged.

**Status, stated plainly.** `GRAPH.COPY` latency **has never been probed**. In
`.law12-feasibility.json` the `DS-10` row is recorded as `result: SOFT-FAIL`,
`evidence: NOT_CLAIMED — never probed`, and deliberately marked **not load-bearing**: it is
stretch-only (R4), gated at **16:25** (DS-11), and built to be deletable as **one route plus
one file**. No other artifact depends on it, and it is excluded from
`.forge-state.json deepIntegration` for that reason.

**The observable, if it ships.** The counterfactual verdict differs from the live verdict for
a stated single-variable change; and the live graph is byte-identically unaffected — node and
edge counts before and after are equal, and the live slot's winner and `last_receipt_id` are
unchanged.

**Check (unaided), if it ships:**
```bash
SLOT='customer%3Aacme%7Cprimary_region'
BEFORE=$(docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "MATCH (n) RETURN count(n)")
# ... run the counterfactual through whatever route ships ...
AFTER=$(docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "MATCH (n) RETURN count(n)")
[ "$BEFORE" = "$AFTER" ] && echo "live graph unchanged" || echo "LIVE GRAPH MUTATED"
curl -sS "$MENGER/slots/$SLOT" | jq '{winner: .ranking[0], last_receipt_id}'
```

**PASS appearance.** The counterfactual reports a different verdict for the altered input; the
node count is unchanged; the live slot's `ranking[0]` and `last_receipt_id` are unchanged; and
the surface states which single variable was altered.

**FAIL appearances:**

| What you see | What it means |
|---|---|
| `LIVE GRAPH MUTATED` | the counterfactual ran on the live graph. **Worse than not shipping it** — it corrupts the corpus every other observable in this file is checked against |
| the live slot's winner or `last_receipt_id` changed | same defect, visible at the API level |
| the counterfactual verdict equals the live verdict for every input | the alteration is not reaching the computation; the surface is decorative |
| the route is absent at judging time | **not a failure.** The 16:25 gate ruled no-go. Correct handling is that the route and its file are gone and nothing else references them |
| the route is present but errors, or renders a placeholder | **this is the real failure mode of this row.** A half-detached stretch feature is worse than an absent one, because a judge finds it |

**Claim state.** `NOT_CLAIMED` in full — feasibility unprobed, feature unbuilt, inclusion
undecided until the 16:25 gate.

---

## 3. False-PASS discriminators

Each row above has a FAIL appearance. Four of them additionally have a shape where the check
returns a success-looking result while the feature is broken. These are the checks a verify
agent must run *in addition*, because the primary check cannot see them.

### 3.1 A boot assertion whose expected value was fitted to the system

**The shape.** `/health` returns `200` with `passed: true` because `expected` was edited to
match whatever `actual` came back.

**Discriminator.** Compare `/health`'s `expected` values against the **external** record —
`.law12-feasibility.json` (AF-3, AF-6) and `PULSE.md` — not against its own `actual`:
```bash
curl -sS "$MENGER/health" | jq '.boot_checks
  | { echo_expected_is_1:    (.node_split_echo.expected == 1),
      indep_expected_is_2:   (.node_split_independent.expected == 2),
      weight_expected_is_ref:(.sp_path_weight.expected == 0.21072) }'
# all three must be true. These three numbers are measured upstream and are NOT tunable.
```
A boot assertion is only an assertion if its expected value is fixed from outside the system
it is checking. **The three expected values are not configuration.**

### 3.2 `independence` derived from the citation count

**The shape.** `independence == (sources | length)` on every claim. Looks like a real integer,
rises with more citations, and makes the echo case score exactly like the independent case —
which is the one thing MENGER exists to prevent.

**Discriminator.** Find any claim where the two differ. In a correct system, the echo claim
has ≥2 sources and `independence: 1`:
```bash
SLOT='customer%3Aacme%7Cprimary_region'
curl -sS "$MENGER/slots/$SLOT" | jq '
  { differs_somewhere: ([.claims[] | .components.independence != (.sources|length)] | any),
    rows: [.claims[] | {claim_id, n_sources: (.sources|length),
                        independence: .components.independence}] }'
# differs_somewhere must be true, and the echo claim must be the row where it differs.
```
If `differs_somewhere: false` across a corpus that contains a seeded echo case, the field is
almost certainly a count of citations.

### 3.3 `reliability` that is actually hop count

**The shape.** `path_weight` is a small integer, `reliability` is `exp(−n)` for integer `n`,
every type check passes, and nothing errors — because a wrong weight key is accepted
**silently** `[VERIFIED: AF-3]`.

**Discriminator.** Two independent tells, neither requiring knowledge of the key name:
```bash
curl -sS "$MENGER/receipts/rcpt_0061" | jq '
  { non_integral_weights:
      ([.candidates[] | .components.path_weight
        | . != (.|floor)] | any),
    weight_key:
      [.cypher[] | select(.label=="reliability.SPpaths") | .query
       | capture("(?<k>weightProp|weightProperty|relationshipWeightProperty|costProperty)").k] }'
# non_integral_weights must be true; weight_key must be exactly ["weightProp"].
```
`−ln(trust)` summed over trusts in (0,1) lands on an integer only by coincidence. Integral
weights across the board is the signature of hop count.

### 3.4 `matches_original: true` on a replay that did not run

**The shape.** A hardcoded `true`, or a cached response. Both read as success.

**Discriminator.** Recency **must** drift for any receipt older than a moment, and the drift
must be reported:
```bash
curl -sS -X POST "$MENGER/receipts/rcpt_0061/replay" -H 'content-type: application/json' -d '{}' \
| jq '{ then_now_identical: (.components_then == .components_now),
        divergence_reasons: [.divergence[].reason],
        replayed_at }'
# then_now_identical must be FALSE for an aged receipt, with reason RECENCY_DECAY present,
# and replayed_at must advance between two successive calls.
```
Call it twice thirty seconds apart. If `replayed_at` does not advance, or
`components_now.recency` does not move, nothing re-executed.

---

## 4. What a judge or verify agent cannot check from this file

Stated so the gap is named rather than discovered.

| Gap | Why it is open | Who closes it |
|---|---|---|
| Every HTTP-level response in §2 | no endpoint has been built or probed; this file specifies expected observables only | engine build |
| ε and λ's actual values | `[ASSUMED]` 0.05 and 0.01/hour; `CONTRACT.md`'s examples show `lambda: 0.0077`; manifest rows `unresolved` | build, then published by `/health` |
| The seed corpus's exact ids | every command above uses contract example ids (`rcpt_0061`, `customer:acme|primary_region`, `agt_scraper_2`, `src_blog_echo_a/b`, `src_vendor_portal`, `vendor:northwind|sla_tier`); the real ids come from `seed_dataset`, `unresolved`, owner `build` | build; then these commands need their ids substituted once |
| Corpus counts | `/health.corpus` targets (~40 agents / 150 sources / 60 claims / 20 slots) are the seed's *targets*, build-determined. The console must read them, never hardcode | build |
| Any HTTP latency | the only measured timing is `maxFlow` at 41ms cold / 11ms warm on 1402 nodes / 2400 edges `[VERIFIED: AF-7]`. **No request-level latency is claimed** | build, if measured |
| `GRAPH.COPY` feasibility | never probed; `F-12` | 16:25 gate |
| Containment on a deployed instance | `[VERIFIED]` only against `gh-falkor` / `falkordb:v4.22.1` | deploy, by re-running `F-11`'s engine half there |
| Review resolution | v1.0 is read-only; no mutation endpoint exists | a contract amendment through the master chat, or not at all |

---

## 5. The judge's attack, per observable

| Attack | Row that answers it | The answer |
|---|---|---|
| "The independence number could be anything." | `F-1`, `F-3`, `F-9` | Three published controls with externally-fixed expected values, plus two independent endpoints that must report the same integer (`independence` and `witness_sets` length) |
| "You wrote the expected values yourself." | §3.1 | They are measured upstream in `.law12-feasibility.json` and are not configuration. Check `expected`, not just `pass` |
| "Two citations and you call it one source — convenient." | `F-3`, `F-9` | The witness set names the single shared origin, and the subgraph shows the split pair the flow is constrained by |
| "Your score is a made-up number." | `F-5` | It is explicitly **ordinal**, flagged on every object that carries it, and it is the product of three separately-published components you can recompute |
| "Reliability is just hop count, isn't it?" | `F-4`, §3.3 | `path_weight` is surfaced raw and is non-integral; the receipt's Cypher names `weightProp`, the only key that works |
| "You could have generated that receipt." | `F-7`, `F-8` | It contains parameterised text that **re-executes**, and it cannot contain `algo.dijkstra`/`algo.SCC` because those do not exist in v4.22.1 |
| "Replay just returns true." | §3.4 | Recency drifts and `replayed_at` advances between calls; a static response is detectable in two commands |
| "What happens to what you refuse?" | `F-6` | `recorded: true` always; UNDECIDED is queued with a `review_id` you can enumerate at `/review` |
| "The console is showing numbers it made up." | `F-10` | ε and λ are read from `/health` and echoed per decision; no ε/λ literal exists in the console source |
| "Could a replay have changed the graph it audited?" | `F-11` | A CREATE through `GRAPH.RO_QUERY` is rejected **server-side**, measured live |
| "Half your features are stretch goals." | `F-12` | Exactly one is, it is named, and it detaches as one route plus one file at a stated gate |

---

## 6. Hand-off

| Consumer | What they take from here |
|---|---|
| **engine build** | §2's FAIL columns are the test matrix. A row is done when both its PASS and its FAIL appear on the appropriate inputs |
| **`design_forge`** | which observables must be *reachable* from the console (`F-1`, `F-3`, `F-7`, `F-8`, `F-9`, `F-10`) — and `F-10`'s prohibition on ε/λ literals. Rendering is entirely theirs |
| **`hackathon-critique`** | §3 and §4 — the false-PASS shapes and the named gaps are the adversarial surface |
| **`hackathon-demo`** | `F-3`'s A-versus-B pairing is the hero beat; `F-1` is the honesty beat |
| **master** | populate `.forge-state.json .feature_observables` with `F-1`…`F-12` so the reconcile gate is live |
