# INTEGRATION VERIFICATION — console × live MENGER engine

Run at **2026-10-18 17:32–17:40 WAT**, working dir `/Users/MAC/graph-hacks`.
Raised by Dami's change-order: *"dont worry about beauty. make sure the product works
(the ui works perfectly with the product integrated)"* — which supersedes the remaining
aesthetic phases of `design_forge` (refine-4 persona critique, Phase 3 `logo_forge`).

**Verdict: VERIFIED.** The console renders real engine payloads on all nine routes, the
write gate works from the browser, and one real integration defect was found and fixed.

---

## 1. The engine is up and its boot assertions pass

The earlier `404` from this chat was the **root path**, not `/health` — `GET /` is simply
not an endpoint in the frozen contract. The engine was live the whole time.

Recompute:
```
curl -s http://localhost:8000/health | python3 -m json.tool
```

| Assertion | Expected | Actual | |
| --- | --- | --- | --- |
| `node_split_echo` | 1 | 1 | PASS |
| `node_split_independent` | 2 | 2 | PASS |
| `sp_path_weight` | 0.21072 | 0.21072 | PASS |
| `sp_weight_is_not_hop_count` | `pathWeight != pathCost` | `0.21072 vs 5` | PASS |
| `ro_query_refuses_write` | CREATE refused by `GRAPH.RO_QUERY` | refused | PASS |
| `cap_on_non_flow` | 0 | 0 | PASS |

Engine `falkordb/falkordb:v4.22.1`, graph `menger`, read path `GRAPH.RO_QUERY`.
Server constants: **ε = 0.05**, **λ = 0.008** — matching CL-F-009 RULING 1. The console
reads both from this response; neither is written into the source (DS-8 / R-4 hold).

Container `gh-falkor` was treated as read-only throughout (F-11) — never stopped,
restarted or removed. It also publishes **port 3000**, which is why the console was
served on **3100** rather than contending for it.

## 2. DS-C7 does not bite

The predicted CORS blocker — CONTRACT.md:30 naming only `Access-Control-Allow-Origin: *`,
with no allow-headers, so an `application/json` POST would fail preflight — **does not
occur**. The engine answers the preflight fully:

```
curl -s -i -X OPTIONS http://localhost:8000/remember \
  -H "Origin: http://localhost:3100" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```
```
access-control-allow-origin: *
access-control-allow-methods: GET, POST
access-control-allow-headers: content-type
access-control-max-age: 600
```

The contract under-documents what the engine implements. That is the safe direction of
drift, and it is confirmed by behaviour, not by reading the engine source: both POSTs
(`/remember`, `/receipts/{id}/replay`) succeeded **from the browser**, not merely from
curl. **DS-C7 is closed as a non-issue.** No contract amendment is requested — the
contract is frozen and the implementation is a superset of it.

## 3. CL-F-009 RULING 2 — answered by observation

The open question to the engine chat was whether `/slots/{key}/graph` carries `kind` on
each edge after the `FLOW` + `DERIVED_FROM` collapse. **It does not** — and the reason is
that the collapse and the wire shape live at two different layers:

- **Storage — collapsed, as RULING 2 required.** Seeding writes a single relationship type
  with the distinction in a property: `app/cypher.py:252` →
  `CREATE (so)-[:FLOW {cap:1.0, nl:0.0, kind:'CITED'}]->(c)`. Hence build's log entry
  `count(:DERIVED_FROM)=0`. This is what lets `algo.maxFlow` run, since it accepts exactly
  one entry in `relationshipTypes`.
- **Wire — re-expanded, to preserve the frozen contract.**
  `app/api.py::_wire_edge_type` maps `kind='DERIVED'` → the string `"DERIVED_FROM"` and
  everything else → `"FLOW"`, because CONTRACT.md's `edges[].type` shape is frozen.

So build's log and the payload below **agree**; they describe different layers.

```
edge keys: ['cap', 'from', 'nl', 'to', 'type']
types:     {'FLOW': 14, 'DERIVED_FROM': 2}
kind:      absent on all 16 edges
```

The console's `kind`-then-`type` fallback is therefore the live path — it falls through to
`type`, which is the correct field to read — and it renders the distinction correctly: the
graph draws exactly **2 dashed** edges against 24 solid, which is the 2 `DERIVED_FROM`
edges. The feared "collapses to all-solid" failure does not occur.
**No question remains outstanding for the engine chat on this point.**

## 4. All nine routes, against live data

Production build (`rm -rf .next && npm run build`), served by `next start -p 3100`, driven
in a real browser. Every figure below came out of the engine during the run.

| Route | Evidence it is live |
| --- | --- |
| `/` | boot checks PASS; corpus `claims 65` (**66** after the second write) — it moved because *this run* wrote to the graph; ε/λ `0.05 / 0.008` |
| `/proof` | "THIS HALF IS LIVE" section read from `GET /health` at load; 4 PASS, **0 FAIL** |
| `/slots` | 21 slots; `customer:acme · primary_region` shows `BLOCK` and links `rcpt_0005` — the receipt this run created |
| `/slots/{key}` | 4 contenders ranked, including `clm_0065` REFUSED from this run; three components reported separately on every card |
| `/slots/{key}/graph` | 46 SVG primitives; node-split drawn; 2 dashed `DERIVED_FROM` edges |
| `/receipts/{id}` | `rcpt_0005`, BLOCK, margin −0.7269, verbatim Cypher with read command |
| `/receipts/{id}/replay` | **REPRODUCED** — 9 statements re-run against the live graph, all PASS. A browser-origin POST |
| `/review` | `rev_0001` OPEN, `WITHIN_EPSILON`, margin +0.0234 inside ε |
| `/remember` | see below |

Console errors across the whole walk: **one**, the deliberate 404. No React errors, no
hydration warnings.

### The headline beat works through the UI

Filled the form in the browser — agent `agt_planner_1`, slot `customer:acme|primary_region`,
object `ap-south-1`, sources `src_blog_echo_a` + `src_blog_echo_b` (two citations of one
document) — and submitted:

> **BLOCK** · the write was refused · recorded: true · `clm_0066` · REFUSED · receipt `rcpt_0006`
> margin −0.8157 · **INDEPENDENCE 1** · reliability 0.8100 · recency 1.0000

**Two citations are not two sources.** The invariant phrase on the landing page is
demonstrated by the product, live, through the interface a judge will use.

### Error paths are real, not decorative

| Trigger | Rendered |
| --- | --- |
| `/slots/nope%7Cmissing` | `404 · SLOT_NOT_FOUND` — "no slot matches 'nope\|missing'", the engine's own message |
| source `src_does_not_exist` | `422 · UNKNOWN_SOURCE`, `field: sources`, "Not in the graph: src_does_not_exist" |

The second answers another open contract question: the engine returns the **bare field
name** (`sources`), not the positional form (`sources[1]`) shown in the CONTRACT.md
example. The console renders either. No change needed.

---

## 5. The defect found and fixed

**`MarginBand` rendered a ranking gap in the engine's decision language.**

Two different quantities reach that component:

- a **decision margin** — the signed value the engine entered against an incoming claim
  (`/remember`, `/receipts/{id}`, `/review`). Its sign *is* the verdict.
- **`top_margin`** — the distance between a slot's rank #1 and rank #2 (`/slots/{key}`
  and the landing page's contested-slot panel). It is a gap, always positive, and nothing
  is adjudicated by it.

Because `top_margin` is always positive, the decision branch always won, so every
contested slot drew a **green ALLOW marker** and captioned itself *"margin > +ε, so the
incoming claim displaces the incumbent."* On `customer:acme|primary_region` that was
flatly false: there is no incoming claim on that screen, and the slot's last recorded
verdict was **BLOCK**. This is exactly the class of error CONTRACT.md §0 exists to
prevent — a surface asserting more than the evidence supports.

Fix — `src/components/scores.tsx`, plus the two ranking call sites:

```tsx
export function MarginBand({ margin, epsilon, size = "sm", context = "decision" }: {
  margin: number; epsilon: number | null | undefined;
  size?: "sm" | "lg"; context?: "decision" | "ranking";
})
```

In `ranking` context the label reads **"lead over #2"**, the marker never wears a verdict
colour, and the caption says *"This is the standing gap between the top two claims, not a
verdict."* Inside ε it still flags that the slot is too close to separate. The decision
branch is untouched, so `/remember`, `/receipts` and `/review` read exactly as before.

Verified in the browser after rebuild: the slot page now reads `LEAD OVER #2  +0.7265`
with the ranking caption, and `displaces the incumbent` is **absent** from the page.

### Pinned by two tests, proven to bite

Added to `frontend/design-tests/contract-honesty.design.test.mjs`:

- *"a ranking gap is never rendered in the engine's decision language"* — any
  `<MarginBand>` receiving `top_margin` must pass `context="ranking"`.
- *"MarginBand's decision prose is reachable only from the decision context"* — the
  displacement claim must stay behind the ranking/decision split.

The first was **proven to fail** by temporarily reverting one call site:

```
✖ a ranking gap is never rendered in the engine's decision language
  AssertionError: src/app/slots/[key]/page.tsx passes top_margin to <MarginBand>
  without context="ranking", so a ranking gap would be captioned as an adjudicated verdict
```

then restored to green. It is not a vacuous assertion.

---

## 6. Post-fix state

```
npx tsc --noEmit                  → exit 0
npm run test:design               → 28 tests, 28 pass, 0 fail   (was 26; +2 above)
npm run build                     → 10 routes, 102 kB shared First Load JS
.craft-law.json                   → exit_code 0, verdict pass, CF-1..CF-7 all ran, 0 violations
```

No commit, no push. CONTRACT.md untouched.

## 7. Claim status

The claim *"the console renders correctly against a live MENGER engine"* was **NOT_CLAIMED**
at the start of this run. It is now **VERIFIED**, with the defect above found, fixed and
pinned in the process.

Recompute, end to end:
```
curl -s http://localhost:8000/health | python3 -m json.tool
cd frontend && npx tsc --noEmit && npm run test:design && npm run build
npx next start -p 3100     # then walk the nine routes
```

## 8. Still open (deprioritised by the change-order, not completed)

These are the aesthetic phases Dami's instruction set aside. They are **not** done, and
nothing above should be read as closing them:

- Phase 2 `refine-4` persona critique (3 parallel agents + the zero-context CTA agent)
- `.design-render-375.json` mobile render-quality record
- Phase 3 `logo_forge` — `brand.json.logoPath` is still `null`
- `ESCALATION-design.md` `diff-1` (accent-on-controls vs UNDECIDED) remains Dami's call
