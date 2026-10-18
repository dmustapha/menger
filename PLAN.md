# PLAN — MENGER engine build plan

> **Artifact owner:** `forge` (redo dispatch, 2026-10-18). **Replaces** the 435-line SPRINT
> draft in place; that draft is the floor, not the ceiling — everything load-bearing in it is
> carried forward and deepened, nothing is dropped silently.
>
> **Companion artifact: `CONTRACT.md` v1.0 — FROZEN.** That file, not this one, is the joint
> artifact with the concurrent `design_forge` chat. This file is the **engine chat's build
> order** and is single-chat. If the two disagree about a field name or a status code, the
> contract wins and this plan is the defect.
>
> **Authority chain, highest first:**
> 1. `PULSE.md` **Active Facts `AF-1..AF-17`** — these have already falsified published
>    FalkorDB documentation (AF-1, AF-2, AF-3). They override this plan, the winner brief, and
>    any prior belief.
> 2. `LEDGER.md` §2 Dami's rulings **R1–R6** and §5 the eleven hard constraints.
> 3. `CONTRACT.md` v1.0 for anything HTTP-visible.
> 4. `warroom/WINNER-BRIEF.md` — the ruled mechanism. **This plan does not redesign it.**
> 5. This plan, for build order and internal shape only.
>
> **This plan does not re-litigate the mechanism** (R1, R4). Where it finds a flaw it is
> recorded as a risk in §9 with a decision tree, never silently fixed.

### Claim-tag legend — read this before any number in this document

Every technical statement in this file carries exactly one tag. A missing tag is a defect.

| Tag | Means | Admissible evidence |
|---|---|---|
| `[VERIFIED]` | A live probe against the running `gh-falkor` container recorded it | a row in `.law12-feasibility.json`, a `PULSE.md` `AF-n`, or a `warroom/deliberation-transcript.md` `FC-n` block |
| `[UNVERIFIED]` | A design intent, a contract shape, or a plan decision. True by construction once built, not yet observed | this plan, `CONTRACT.md`, `WINNER-BRIEF.md` |
| `[ASSUMED]` | A default, an inference, or arithmetic derived from a verified number. **Could be wrong.** | stated inline, with what would falsify it |
| `NOT_CLAIMED` | We do not know and will not guess | — |

**The only measured numbers that exist anywhere in this project** `[VERIFIED]`:
`pathWeight = 0.21072` on the control fixture (AF-3 / FC-5) · `maxFlow` echo→`1`,
independent→`2` after node-split (AF-6 / VF-W2 / FC-4) · `41ms` cold / `11ms` warm `maxFlow`
on 1402 nodes / 2400 edges (AF-7 / VF-W3 / FC-7) · `GRAPH.RO_QUERY` rejects `CREATE`
server-side and allows `MATCH` (AF-8 / VF-W4 / FC-6) · the v4.22.1 `algo.*` set (AF-1 / FC-1)
· the `algo.maxFlow` and `algo.SPpaths` call signatures (AF-4 / FC-2).

**No MENGER endpoint has been built or probed.** Every latency, verdict, count, and score
attributed to MENGER in this document is `[UNVERIFIED]` or `NOT_CLAIMED`. Nothing in §6 is
reported as passing — §6 specifies tests and their expected outputs only.

---

## 1. goal

Build the MENGER engine: an **admission-control gate on agent memory**. An agent submits a
fact to `POST /remember`; the graph itself answers **ALLOW / BLOCK / UNDECIDED**; every
verdict persists a replayable **DOCKET receipt**. `[UNVERIFIED]` — this is the ruled product
shape (`WINNER-BRIEF.md` §Thesis), not an observed behaviour.

The decision is a **graph computation**, which is the whole competitive claim `[UNVERIFIED]`:

- `independence` — `algo.maxFlow` from one `:SuperSource` to the claim over a **node-split**
  provenance DAG. By Menger's theorem this counts **vertex-disjoint** origin→claim chains,
  i.e. how many genuinely separate origins back the claim. `[VERIFIED]` that the node-split
  makes `maxFlow` report the vertex-disjoint count (echo→1, independent→2, AF-6).
- `reliability` — `exp(-pathWeight)` where `pathWeight` is `algo.SPpaths` over edges weighted
  `nl = -ln(trust)`. Minimising a sum of `-ln` maximises the **product** of per-hop trust
  along the best chain. `[VERIFIED]` that `algo.SPpaths` with `weightProp:'nl'` returns the
  weighted total `0.21072` on the control fixture (AF-3).
- `recency` — `exp(-lambda * age_hours)`. `[UNVERIFIED]` shape; `lambda` value `[ASSUMED]`.
- `score = independence * reliability * recency`, **ORDINAL, not cardinal**. Every scored
  object carries `score_is_ordinal: true`. The verdict comes from an **epsilon-band** rule on
  `margin = score(incoming) - score(best_incumbent)`.

**Substitution test** (the disqualifier in `config.json` that kills most entries, `[UNVERIFIED]`
as a positioning claim): remove FalkorDB and there is no max-flow over the provenance DAG and
no minimum-`-ln(trust)` path, so there is no `independence` and no `reliability`, so there is
**no verdict at all**. The product does not degrade without the graph; it stops having an
output. Note precisely what is *not* claimed here: MENGER decides **admissibility**, never
veracity. There is no sentence in this plan, in the API's own strings, or in any field name
that claims otherwise.

### Committed scope

Exactly R4: **P2 admission control + P5 DOCKET receipts.** `[UNVERIFIED]` (a ruling, not a
measurement). P3 counterfactual is a **stretch**, isolated, gated at `verify_milestone` 16:25
(DS-11). **P4, P6, P7 are dead** and are not referenced again in this plan.

### What this chat owns, and what it must not touch

The engine chat owns: graph schema, synthetic seed, read-path wrapper, resolver, boot
assertions, the eight HTTP routes, receipts, review queue. It does **not** own the console
(`design-forge`), the live URL (`deploy-to-github`), the README and the separately-listed
Cypher artifact (`hackathon-package`), or the video (`hackathon-demo`). Full routing in
**§Skill-Ownership Map**. `[UNVERIFIED]` — routing is ruled, not observed.

---

## 2. done-criterion

The engine is DONE when all six criteria below are true. Each is **offline-resolvable** by a
grader with the repo and a running container: every row names the exact command and the exact
field to read. **None of these is claimed to pass.** They are the acceptance surface for
`build`, and `build` reports actual results.

| ID | Criterion | How a grader resolves it, offline | Traces to |
|----|-----------|-----------------------------------|-----------|
| `C-1` | **Boot refuses to serve on a broken assumption.** | `curl -sS localhost:8000/health \| jq '.boot_checks'` → `node_split_echo.actual == 1`, `node_split_independent.actual == 2`, `sp_path_weight.actual == 0.21072`, `passed == true`. Any mismatch → HTTP `503` with `error.code == "BOOT_ASSERTION_FAILED"`. Shape frozen in `CONTRACT.md` §2.8. | AF-16, DS-1, DS-2, R-1, R-3 |
| `C-2` | **All three verdicts are reachable on seeded data.** | Three `POST /remember` calls against the three set-pieces in `§5 Corpus` return `verdict` `BLOCK`, `ALLOW`, `UNDECIDED` respectively. Scripted as `tests/drill.sh` steps 2–4 (`§6`). | `CONTRACT.md` §2.1, DS-14 |
| `C-3` | **Nothing is silently lost.** | Every `/remember` response has `recorded: true`. `UNDECIDED` carries non-null `review_id`, and that id appears in `GET /review?status=OPEN`. `BLOCK` leaves a `(:Claim {status:'REFUSED'})` findable by `GRAPH.RO_QUERY menger "MATCH (c:Claim {id:$id}) RETURN c.status"`. | `CONTRACT.md` §0 rule 4, R-2 |
| `C-4` | **Every verdict is replayable.** | `GET /receipts/{id}` returns `cypher[]` with the verbatim parameterised query text, `candidates[].components` with all four numeric fields separately, `independence_witness.witness_nodes`, and `reliability_path.path_weight`. `POST /receipts/{id}/replay` returns `matches_original: true` with any divergence limited to `reason: "RECENCY_DECAY"`. | `CONTRACT.md` §2.5, §2.6 |
| `C-5` | **Contract conformance.** | Every one of the eight endpoints in `CONTRACT.md` §2 responds with the documented shape and the documented error codes. The console built in the `design_forge` chat renders against the real API with **zero** contract amendments. | DS-13, AF-15 |
| `C-6` | **The containment boundary is real and demonstrable.** | `docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "CREATE (:X{a:1})"` → an error, not an OK. Every entry in `receipt.cypher[]` carries `read_command: "GRAPH.RO_QUERY"`. | AF-8, VF-W4, `CONTRACT.md` §0 rule 5 |

### Which of these the engine chat can self-certify

`C-1`, `C-2`, `C-3`, `C-4`, `C-6` are self-certifiable from `tests/drill.sh` output
`[UNVERIFIED]`. **`C-5` is not** — it resolves only at `verify_milestone` (16:25) when the
console joins, and it is already tracked as `PULSE.md` DS-13. The engine chat must not report
`C-5` green on its own evidence; doing so is the exact failure class recorded in `PULSE.md`
forge `[CORRECTION]` (a completion claim made before its proof existed).

### The explicit non-criterion

A passing `tests/drill.sh` is **not** completion. `docs/ORCHESTRATION-PROTOCOL.md` §6 is
binding: *"No completion claim without proof. Evidence law: seen in real Chrome, not
headless-only."* Engine-side curl output is necessary and insufficient. The terminal evidence
is the integrated product observed in real Chrome at 16:45, driven from the master chat —
**the browser is a singleton and is never delegated to a subagent.** `[UNVERIFIED]`

---

## 3. components

Eight components, seven on the spine and one deletable. File names are the build chat's
contract with itself; nothing here is HTTP-visible, so nothing here is frozen. `[UNVERIFIED]`
throughout — no file exists yet.

| # | Component | File | Owns | Depends on | Built in |
|---|-----------|------|------|-----------|----------|
| C1 | Graph schema + synthetic seed | `seed.py` | Node-split corpus, the three set-pieces, both boot control fixtures | C2, C4 | B1 |
| C2 | Engine client wrapper | `graph.py` | `falkordb` connection, the `GRAPH.RO_QUERY` read path, the Cypher constants, `503` mapping | — | B1 |
| C3 | Resolver | `arbiter.py` | `maxFlow`→independence, `SPpaths`→reliability, decay→recency, fold→verdict, margin | C2 | B2 |
| C4 | Boot assertions | `bootcheck.py` | The four assertions of `C-1`/`C-6`; imported by **both** `seed.py` and `api.py` | C2 | B1 |
| C5 | HTTP API | `api.py` | The eight routes of `CONTRACT.md` §2, the error table, CORS | C2, C3, C4, C6 | B3 |
| C6 | DOCKET receipts | `docket.py` | Receipt persistence, the Cypher log, replay + divergence classification | C2, C3 | B4 |
| C7 | Review queue | folded into C5 + C6 | `(:Review)` nodes, `GET /review` | C5, C6 | B3 |
| C8 | *(stretch)* Counterfactual | `counterfactual.py` | `GRAPH.COPY` fork → delete one source → re-arbitrate → diff verdicts | C3 only | B5, gated |

### Per-component notes that change how it is built

**C2 `graph.py` — two functions and a wall between them.** `ro()` is the only read path and
calls `GRAPH.RO_QUERY` exclusively. `rw()` exists solely to insert `:Claim`, `:Review`, and
`:Receipt` nodes and must never execute a `MATCH`-only statement — if it does, the author
reached for the wrong function and bypassed the containment boundary (`C-6`). Make this
mechanical: `rw()` raises unless the statement's first keyword is `CREATE` or `MERGE`.
`[UNVERIFIED]` design; the boundary itself is `[VERIFIED]` (AF-8).

**C4 `bootcheck.py` is imported twice, on purpose.** `seed.py` runs it after seeding and
**refuses to exit 0** if `T-1`/`T-2` fail (DS-1 acceptance, verbatim). `api.py` runs it at
startup and, on any failure, serves `503 BOOT_ASSERTION_FAILED` from **every** route rather
than serving a wrong headline number (AF-16). One module, two callers, no duplicated expected
values — a single `EXPECTED` dict so a drift can never desynchronise the two call sites.

**C3 `arbiter.py` never produces a blend before the response layer.** `independence`,
`reliability`, `recency`, `path_weight`, `age_hours` are separate typed fields on
`ScoredClaim` all the way through. `score` exists as exactly one expression in exactly one
place. This is the structural form of DS-8 / R-4: you cannot accidentally surface a blended
number if the blend is never a variable anywhere else. `[UNVERIFIED]`

**C8 touching nothing on the spine is a hard structural requirement, not a preference.** It
imports `arbiter`, and **nothing imports it** except one route registration in `api.py`. At
16:25 the stretch must be deletable as *one file plus one route*, with no spine edit. If
anything on the spine ever imports `counterfactual`, the isolation is broken and the stretch
is dead on the spot — that is cheaper than an entangled rollback at 16:25. `[UNVERIFIED]`

### Stack, and why it is not a free choice

Python + FastAPI + the `falkordb` Python client. `[ASSUMED]` for FastAPI (A-F1 in `PULSE.md`;
any ASGI framework would do). **Not** assumed for Python: `GRAPH.RO_QUERY` is exposed by the
Python client and **not** by the TS client (FalkorDB issue #408) `[VERIFIED]` via AF-8/FC-6,
so the containment boundary that `C-6` rests on is only reachable from Python without hand-
rolling raw Redis commands. The language choice is downstream of a verified engine constraint.

---

## 4. interfaces

MENGER has three interface layers, and only the first is frozen. **(a)** The eight HTTP endpoints
of `CONTRACT.md` v1.0 — the joint surface with the `design_forge` chat, amendable only through the
master chat (§4.1). **(b)** The engine's internal Python seams — `graph.ro()`, the resolver, the
docket writer — which the engine chat owns outright and may change at will, because nothing
outside the process can see them (§4.2). **(c)** The four Cypher constants, whose *procedure
signatures* are not ours to choose at all: they are fixed by FalkorDB v4.22.1 and were read off
live probes, so a "cleaner" rewrite of one is a wrong answer no matter how it reads (§4.3).

The security-relevant consequence belongs here rather than in §7, because it is an interface
property: **every read crosses `graph.ro()` and nothing else.** `GRAPH.RO_QUERY` is the single
containment boundary for generated Cypher (AF-8, `[VERIFIED]` — the engine rejects `CREATE`
server-side), which means the privileged surface of this build is exactly one function, and
auditing it is reading one file. §4.4 lists the procedures that **do not exist** — referencing one
is a build-stopping error, not a typo, because FalkorDB accepts a wrong `weightProp` key silently
and returns a plausible wrong number (DS-2 / AF-3).

### 4.1 The HTTP surface is frozen and is not restated here

Eight endpoints, `CONTRACT.md` v1.0: `POST /remember`, `GET /slots`, `GET /slots/{key}`,
`GET /slots/{key}/graph`, `GET /receipts/{receipt_id}`,
`POST /receipts/{receipt_id}/replay`, `GET /review`, `GET /health`. `[UNVERIFIED]` — frozen in
the contract, none built.

The contract is the **only** joint artifact with the `design_forge` chat
(`docs/ORCHESTRATION-PROTOCOL.md` §3). An amendment routes through the master chat, bumps to
v1.1, and is announced to both chats. **The engine chat never amends it unilaterally**, even
when the amendment would be obviously correct — the console is being built against v1.0 right
now, and a silent field rename is the single cheapest way to lose the 16:25 join.

### 4.2 Internal interfaces — the engine chat's own, not frozen, not console-visible

```python
# graph.py — the containment boundary
graph.ro(query: str, params: dict) -> list[list]   # GRAPH.RO_QUERY ONLY. all reads.
graph.rw(query: str, params: dict) -> list[list]   # GRAPH.QUERY. CREATE/MERGE only; raises otherwise.
graph.timed_ro(query, params) -> tuple[list[list], int]   # (rows, duration_ms) for receipt.cypher[].duration_ms

# bootcheck.py — the fail-closed gate
bootcheck.EXPECTED: dict[str, float|int]           # the one authoritative definition of T-1..T-3
bootcheck.run() -> BootChecks                      # .passed: bool, .checks: dict[str, Check]
                                                   # Check = {expected, actual, pass}
bootcheck.assert_or_die()                          # seed.py: raise SystemExit(1) on failure

# arbiter.py — scoring and the verdict
arbiter.independence(claim_id) -> tuple[int, Witness]      # maxFlow + saturated split edges
arbiter.reliability(claim_id)  -> tuple[float, PathProof]  # exp(-pathWeight) + the winning path
arbiter.recency(asserted_at)   -> tuple[float, float]      # (recency, age_hours)
arbiter.score(slot_key)        -> list[ScoredClaim]        # every contending claim, ranked
arbiter.decide(incoming: ScoredClaim,
               incumbents: list[ScoredClaim]) -> Decision  # verdict, margin, epsilon, witnesses

# docket.py — the audit record
docket.persist(decision: Decision, cypher_log: list[CypherEntry]) -> str   # receipt_id
docket.replay(receipt_id: str) -> ReplayResult             # matches_original + divergence[]
```

### 4.3 The four Cypher constants — exact text, pinned signatures

These four statements are the entire engine-side read surface. Every one of them is a
**single parameterised Cypher query**; MENGER defines no server-side routine of its own, and
the orchestration (iterating candidates, folding components) is client-side in `arbiter.py` —
this is `WINNER-BRIEF.md` correction #4 and it is why the spine was repriced at 3h+.

**(a) independence — `algo.maxFlow`.** Signature `[VERIFIED]` (AF-4 / FC-2):

```cypher
CALL algo.maxFlow({
  relationshipTypes: ['FLOW'],        -- EXACTLY ONE type. AF-4. A list of two is an error.
  sourceNodes:       [$ss],
  targetNodes:       [$claim],
  capacityProperty:  'cap'
}) YIELD maxFlow, nodes
RETURN maxFlow, nodes
```

`relationshipTypes` taking **exactly one** type is the constraint discovered live (AF-4), and
it is load-bearing on the schema: the flow network must be expressible over the single
relationship type `FLOW`, which is why `DERIVED_FROM` edges exist separately for the
reliability path and why §7 flags any new edge type near the flow network as a correctness
hazard. The `nodes` yield is the witness set — the saturated split edges, which is what
`receipt.candidates[].independence_witness.witness_nodes` publishes.

Keys that error with `MaxFlow configuration contains unknown key` `[VERIFIED]` (FC-2):
`sourceNode`, `targetNode`, `source`, `target`, `src`, `dest`, `sinkNodes`, `weightProp`,
`weightProperty`, `capacityProp`. Note the asymmetry and do not let it bite you: `weightProp`
is the **only correct** key on `SPpaths` and an **error** on `maxFlow`.

**(b) reliability — `algo.SPpaths`.** Signature `[VERIFIED]` (AF-2 / AF-3 / FC-2):

```cypher
CALL algo.SPpaths({
  sourceNode: $src,
  targetNode: $claim,
  relTypes:   ['FLOW', 'DERIVED_FROM'],
  weightProp: 'nl'                    -- THE ONLY KEY THAT WORKS. AF-3.
}) YIELD path, pathWeight
RETURN path, pathWeight
```

**`weightProperty`, `relationshipWeightProperty`, and `costProperty` are accepted silently
and return the unweighted hop count with no error** `[VERIFIED]` (AF-3 / FC-3). A build that
guessed the key would ship a reliability score that was secretly hop count, and every
hand-written test would still pass. This is why `T-3` exists and why its expected value is a
non-integer.

**(c) the boot controls.** Three read-only statements, in `bootcheck.py`, against fixtures
created by `seed.py`. Expected values `1`, `2`, `0.21072` — all `[VERIFIED]` upstream.

**(d) the containment probe.** `GRAPH.RO_QUERY menger "CREATE (:BootProbe {x:1})"` must
**error**. `[VERIFIED]` server-side (AF-8 / FC-6): `graph.RO_QUERY is to be executed only on
read-only queries`.

### 4.4 Procedures that do not exist — never reference them

`algo.dijkstra` and `algo.SCC` **DO NOT EXIST** in FalkorDB v4.22.1 `[VERIFIED]` (AF-1 /
VF-W5 / FC-1, via `CALL dbms.procedures()` on the live engine). Intel's capability map listed
both and the first design specified the entire reliability term on `algo.dijkstra`. The real
set `[VERIFIED]`: `algo.AStar`, `algo.BFS`, `algo.HarmonicCentrality`, `algo.MSF`,
`algo.SPpaths`, `algo.SSpaths`, `algo.WCC`, `algo.betweenness`, `algo.labelPropagation`,
`algo.maxFlow`, `algo.pageRank`. Also present: `db.idx.cch.query`,
`db.idx.vector.queryNodes`, `db.idx.fulltext.*`.

`algo.pageRank` takes **two positional arguments** `algo.pageRank(label, relType)`, not a
config map `[VERIFIED]` (AF-5 / FC-2). MENGER does not use it; recorded so nobody reaches for
it mid-build and loses ten minutes to a signature error. `algo.betweenness` is **dropped
entirely** by `WINNER-BRIEF.md` correction #3 — it ranks intermediaries, not leaf sources,
which is the wrong quantity for provenance. It is not used anywhere.

---

## 5. data/policy model

The data model is the node-split provenance DAG carried **verbatim** from
`warroom/WINNER-BRIEF.md` §Schema, extended by exactly two audit labels that P5 receipts
require. The policy model is the three-component ordinal fold plus the epsilon-band rule.
Both are reproduced in full so the build chat never re-derives either, and neither may be
re-litigated (R1, R4).

### 5.1 Schema — verbatim from `WINNER-BRIEF.md`, not re-derived

```
(:Agent    {id, name, trust})
(:Claim    {id, subject, predicate, object, asserted_at, status})
(:Source   {id, kind, trust})
(:SourceIn {sid})  (:SourceOut {sid})      -- the node-split pair for every Source
(:Slot     {key})                          -- subject+predicate; claims contend for a Slot

(:Agent)-[:ASSERTED {at}]->(:Claim)
(:Claim)-[:FILLS]->(:Slot)
(:Claim)-[:CITES {cap:1.0}]->(:SourceIn)
(:SourceIn)-[:FLOW {cap:1.0}]->(:SourceOut)      -- the split edge = the vertex capacity
(:SourceOut)-[:DERIVED_FROM {cap:1.0, nl}]->(:SourceIn)
(:SuperSource)-[:FLOW {cap:1.0}]->(:SourceIn)    -- one per ORIGIN source
(:SourceOut)-[:FLOW {cap:1.0}]->(:Claim)
```

Added by this plan, for P5 only — receipts are Dami-mandated and need somewhere to live
`[UNVERIFIED]`:

```
(:Review  {id, slot_key, claim_id, margin, epsilon, created_at, state})
(:Receipt {id, claim_id, slot_key, verdict, margin, epsilon,
           independence, reliability, recency, path_weight,
           cypher_json, witness_json, path_json, created_at})
(:Claim)-[:HAS_RECEIPT]->(:Receipt)
(:Review)-[:ABOUT]->(:Claim)
```

**Receipts are a node with JSON-encoded string properties, not a sub-graph.** A receipt is an
append-only audit record, not provenance structure to be traversed. Modelling it as edges
would put non-provenance relationships inside the same graph the flow algorithm runs over,
and `algo.maxFlow` accepts **exactly one** relationship type (AF-4) — so an extra edge type
adjacent to the flow network is a live correctness hazard sitting directly beside the headline
number. Keep the audit log flat. `[UNVERIFIED]` design, resting on `[VERIFIED]` AF-4.

### 5.2 Why the node-split is non-negotiable — the worked failure

`algo.maxFlow` over unit-capacity **edges** counts **edge**-disjoint paths. Independence
requires **vertex**-disjoint paths. These differ exactly when two chains share an
intermediate — which is precisely the echo chamber, i.e. the case the product exists to
refuse. Proven live `[VERIFIED]` (FC-4), with the discriminating fixture recorded verbatim:

```cypher
CREATE (s:N{k:'s'}),(a:N{k:'a'}),(b:N{k:'b'}),(v:N{k:'v'}),(c:N{k:'c'}),(d:N{k:'d'}),(t:N{k:'t'})
CREATE (s)-[:E{cap:1.0}]->(a),(a)-[:E{cap:1.0}]->(v),(v)-[:E{cap:1.0}]->(c),(c)-[:E{cap:1.0}]->(t)
CREATE (s)-[:E{cap:1.0}]->(b),(b)-[:E{cap:1.0}]->(v),(v)-[:E{cap:1.0}]->(d),(d)-[:E{cap:1.0}]->(t)
```

→ `maxFlow = 2` `[VERIFIED]`. **The echo chamber passes.** Two chains funnel through the one
shared intermediate `v`, and because they use *different edges* into and out of `v`, the
flow counts two.

Node-splitting every vertex (`X` → `X_in -[FLOW {cap:1.0}]-> X_out`) makes edge-disjoint
**equal** vertex-disjoint: the shared intermediate now has exactly one unit of internal
capacity, so only one chain can pass through it. Proven in **both** directions `[VERIFIED]`
(FC-4): echo chamber → `maxFlow = 1` (correctly collapsed) · genuinely independent control →
`maxFlow = 2` (not over-collapsed). The second half matters as much as the first; a fix that
collapsed everything to 1 would also "pass" the echo test while destroying the product.

Consequences the builder must honour, or `C-1` fails:
1. **Every** `:Source` gets both a `:SourceIn` and a `:SourceOut`, joined by exactly one
   `(:SourceIn)-[:FLOW {cap:1.0}]->(:SourceOut)`.
2. **Nothing bypasses the pair.** No `(:Claim)-[:CITES]->(:SourceOut)`, no
   `(:SuperSource)-[:FLOW]->(:SourceOut)`. Every path into a source's out-node goes through
   its in-node. A single bypass edge silently restores the edge-disjoint count.
3. The split is built **at seed time**, never retrofitted. A retrofit pass that has to find
   and rewrite existing edges is how a bypass gets left behind.

### 5.3 Policy — the fold and the band

```
independence(claim) = algo.maxFlow(:SuperSource -> claim) over FLOW, cap:1.0, node-split
                      = count of VERTEX-disjoint origin->claim chains        (integer >= 0)
reliability(claim)  = exp(-pathWeight), pathWeight = algo.SPpaths over nl = -ln(trust)
recency(claim)      = exp(-lambda * age_hours)
score               = independence * reliability * recency     -- ORDINAL, not cardinal
margin              = score(incoming) - score(best_incumbent)  -- 0.0 if the slot is empty

margin  >  +epsilon   ->  ALLOW      status ADMITTED   review_id null
margin  <  -epsilon   ->  BLOCK      status REFUSED    review_id null
|margin| <= epsilon   ->  UNDECIDED  status QUEUED     review_id set, a (:Review) is written
```

`status` ↔ `verdict` mapping is total and fixed: `ALLOW→ADMITTED`, `BLOCK→REFUSED`,
`UNDECIDED→QUEUED` `[UNVERIFIED]` (`CONTRACT.md` §2.1, normative).

**`epsilon` and `lambda` are SERVER constants** published by `GET /health` and echoed on
every decision (AF-17, DS-8, R-4). The console must not hardcode them (`CONTRACT.md` §4).
Starting values **`epsilon = 0.05`** and **`lambda = 0.01/hour`** are `[ASSUMED]` — proposed,
**unmeasured** defaults. They are **calibrated in B2** against the seeded deliberate-tie
set-piece, and whatever lands is what `/health` reports and what `hackathon-package` publishes
(DS-8, DS-14). Do not copy `0.05` out of this plan into the README; read the live value.

### 5.4 Worked arithmetic — how the three set-pieces are supposed to land

**All three worked examples below are `[ASSUMED]` arithmetic**, computed from the formulas in
§5.3 on hand-chosen trust values. They are not measurements and no endpoint has produced them.
Their purpose is to tell the builder what shape of fixture produces each verdict, so B1 seeds
a corpus that B2 can actually land in all three bands.

**Derivation of the control fixture — worth stating because it is reproducible.**
`-ln(0.9) = 0.1053605`, and `2 * 0.1053605 = 0.2107210 ≈ 0.21072` `[ASSUMED]` inference. So
the measured `pathWeight 0.21072` `[VERIFIED]` is consistent with a **two-hop chain at
trust 0.9 per hop**, and `reliability = exp(-0.21072) = 0.8100 = 0.9²` — the product of
per-hop trust, exactly as the `-ln` construction intends. **Action for the builder:** build
the `T-3` control fixture as two `nl = 0.10536` hops and `pathWeight` reproduces. **Action
for a human:** the fixture's exact shape is *not* recorded in `FC-5`, which states only the
resulting `0.21072`. This inference is the best available reconstruction; if B1's two-hop
fixture returns something other than `0.21072`, trust the probe and re-derive the fixture —
never adjust the expected value (§9 R-3).

**Set-piece 1 — echo chamber → BLOCK.** `[ASSUMED]` arithmetic.
Incoming claim cites two blog sources that both derive from one shared hub.

| | independence | reliability | recency | score |
|---|---|---|---|---|
| incoming (echo) | `1` (two citations, one origin after the split) | `0.5220` (`path_weight 0.65021`) | `1.0` (`age_hours 0.0`) | `0.5220` |
| incumbent | `2` (two disjoint origins) | `0.8100` (`path_weight 0.21072`) | `0.9261` | `1.5003` |

`margin = 0.5220 - 1.5003 = -0.9783`, and `-0.9783 < -0.05` → **BLOCK**, `status REFUSED`,
`recorded: true`, `review_id null`. **This is the hero beat:** two citations that *look* like
corroboration score `independence: 1`, because they funnel through one shared origin and the
node-split collapses them.

**Set-piece 2 — genuinely corroborated → ALLOW.** `[ASSUMED]` arithmetic. Incoming cites two
sources with fully disjoint origin chains; the incumbent is a single-origin low-trust claim.

| | independence | reliability | recency | score |
|---|---|---|---|---|
| incoming | `2` | `0.8100` | `1.0` | `1.6200` |
| incumbent | `1` | `0.5220` | `0.9418` | `0.4916` |

`margin = +1.1284 > +0.05` → **ALLOW**, `status ADMITTED`.

**Set-piece 3 — deliberate tie → UNDECIDED.** `[ASSUMED]` arithmetic, and this one carries a
**design constraint the builder must not miss**: because `independence` is an **integer**
multiplier, any two claims with *different* independence are separated by a gap of order
`0.5`–`1.0` — far outside an `epsilon` of `0.05`. **A tie is therefore only reachable when
the two claims have equal independence and differ only in `reliability` and `recency`.** Seed
it that way or `C-2`'s UNDECIDED row is unreachable and B2 will waste its calibration budget
chasing an impossible band.

| | independence | reliability | recency | score |
|---|---|---|---|---|
| incoming | `1` | `0.8500` (`path_weight 0.16252`) | `0.9418` (`age_hours 6.0`, `lambda 0.01`) | `0.8005` |
| incumbent | `1` | `0.9000` (`path_weight 0.10536`) | `0.8869` (`age_hours 12.0`) | `0.7982` |

`margin = +0.0023`, `|0.0023| <= 0.05` → **UNDECIDED**, `status QUEUED`, a `(:Review)` node
written, `review_id` returned and visible in `GET /review`.

**Noted contradiction between sources, resolved without an amendment.** `CONTRACT.md` §2.8
shows `"lambda": 0.0077` while `WINNER-BRIEF.md` and this plan carry `lambda = 0.01/hour`;
and `CONTRACT.md` §2.1's example `margin: -0.3104` is not the difference of its own two
example scores (`0.5220 - 1.5002 = -0.9782`). Both are inside `CONTRACT.md` **example
blocks**, which §5 of that file labels explicitly: *"Claim state: NOT_CLAIMED — every numeric
value in an example response is labelled illustrative."* So **the field names are frozen and
the numbers in the examples are not**, and no v1.1 amendment is required. Recorded here
anyway, because `hackathon-package` is instructed to publish `epsilon` and must read it from
`/health` rather than copy either document (DS-8). **For a human to chase:** if `package`
quotes any number out of a `CONTRACT.md` example, that is a defect in `package`, not in the
contract.

### 5.5 Corpus — synthetic, seeded, committed in-repo

Targets from `WINNER-BRIEF.md` B1 `[UNVERIFIED]`: **~40 agents, ~150 sources, ~60 claims
across ~20 contested slots**. Exact counts are build-determined and are published by
`/health` → `corpus`; **the console must read them, never hardcode them** (`CONTRACT.md`
§2.8). Scale is not a risk: `maxFlow` was measured at `41ms` cold / `11ms` warm on **1402
nodes / 2400 edges** `[VERIFIED]` (AF-7 / FC-7), which is larger than this corpus.

Shape requirements on the generator `[UNVERIFIED]`:
- Node-split emitted **inline** as each `:Source` is created, in the same statement — not a
  second pass (§5.2 consequence 3).
- Trust values in `(0, 1]`. **`trust = 0` is forbidden**: `nl = -ln(0) = +inf` and the
  shortest-path weight becomes meaningless. Clamp the generator's floor to `0.01` and assert
  it at seed time.
- `trust = 1.0` is legal and gives `nl = 0.0` — a free hop. Keep at most a couple, and never
  on a whole chain, or `reliability` saturates at `1.0` and stops discriminating.
- One `(:SuperSource)` only, with one `FLOW` edge to each **origin** source's `:SourceIn`.
  A non-origin source (one that `DERIVED_FROM` another) must **not** get a super-source edge
  — that is the second way to fake independence, and it is `T-2`'s failure mode.
- Three hand-crafted set-pieces per §5.4, each the evidence for one row of `C-2`.
- Both boot control fixtures (`T-1` echo, `T-2` independent) are **part of the seed**, not
  test scaffolding, because `/health` publishes their values as a public surface (AF-16).
- Deterministic: a fixed RNG seed, so a grader re-running `seed.py` gets the same corpus and
  the receipts in the repo stay meaningful.

**No private, login-gated, paywalled, or personal data enters the graph, ever** — hard
constraint 7 (`LEDGER.md` §5) and a stated disqualifier in `config.json`. `[UNVERIFIED]`

---

## 6. test plan

**Status of every result in this section: `NOT_CLAIMED`.** Nothing has been built, nothing has
been run. What follows specifies the tests, their exact commands, and their expected outputs.
`build` reports actuals.

No test framework. Under a 19:29 hard deadline the tests are **executable assertions wired
into the boot path** plus two scripted drills — strictly stronger than a suite for the failure
modes that actually lose this hackathon (R-1, R-3), because a boot assertion **cannot be
skipped, deselected, or marked xfail**, and it is visible to a judge through `/health`.

### 6.1 Boot drill — `bootcheck.py`, run by BOTH `seed.py` and `api.py`

| ID | Assertion | Expect | Why non-integer / why this value | Guards |
|----|-----------|--------|---|--------|
| `T-1` | `algo.maxFlow` on the echo-chamber control fixture | `1` | `[VERIFIED]` AF-6/FC-4. A `2` here means the split is bypassed. | R-1, DS-1 |
| `T-2` | `algo.maxFlow` on the independent control fixture | `2` | `[VERIFIED]` AF-6/FC-4. A `1` here means the fix over-collapsed — equally fatal. | R-1, DS-1 |
| `T-3` | `algo.SPpaths` `pathWeight` on the control fixture, `weightProp:'nl'` | `0.21072` | `[VERIFIED]` AF-3/FC-5. **Non-integer on purpose:** a silent `weightProp` regression returns an integer hop count, so this assertion cannot be satisfied by the wrong code path. | R-3, DS-2 |
| `T-4` | `GRAPH.RO_QUERY menger "CREATE (:BootProbe {x:1})"` | **error** | `[VERIFIED]` AF-8/FC-6. Proves the containment boundary is live in *this* deployment, not just in the probe transcript. | `C-6` |

`T-1`/`T-2` red → **`seed.py` refuses to run** (DS-1 acceptance, verbatim).
`T-3` red → the resolver refuses to start.
Any red at API startup → **every route serves `503 BOOT_ASSERTION_FAILED`** (AF-16), with the
mismatch in `error.detail.boot_checks`. The service refuses to serve rather than serve a wrong
headline number. `T-4` is asserted at startup and is not published in `boot_checks` (the
contract freezes exactly three fields there); it is logged and blocks startup.

**The drill, as an actual script** `[UNVERIFIED]` — `tests/boot_drill.sh`:

```bash
#!/usr/bin/env bash
# tests/boot_drill.sh — C-1 + C-6 evidence. Expected exit 0. Results: NOT_CLAIMED.
set -euo pipefail
G=menger
RO() { docker exec gh-falkor redis-cli GRAPH.RO_QUERY "$G" "$1"; }

echo "T-1 echo-chamber maxFlow (expect 1)"
RO "CALL algo.maxFlow({relationshipTypes:['FLOW'],sourceNodes:[\$ss],targetNodes:[\$c],capacityProperty:'cap'}) YIELD maxFlow RETURN maxFlow"

echo "T-3 SPpaths pathWeight on the control fixture (expect 0.21072)"
RO "CALL algo.SPpaths({sourceNode:\$s,targetNode:\$t,relTypes:['FLOW','DERIVED_FROM'],weightProp:'nl'}) YIELD pathWeight RETURN pathWeight"

echo "T-4 containment — a CREATE through RO_QUERY MUST error"
if RO "CREATE (:BootProbe {x:1})" 2>/dev/null; then
  echo "FAIL T-4: RO_QUERY accepted a write — the containment boundary is not in effect"; exit 1
fi
echo "T-4 OK (write rejected)"

echo "T-* via the public surface"
curl -sS localhost:8000/health | jq -e '.boot_checks.passed == true' >/dev/null \
  && echo "boot_checks.passed == true" \
  || { echo "FAIL: /health reports a boot assertion failure"; curl -sS localhost:8000/health | jq .; exit 1; }
```

Expected output, line by line `[UNVERIFIED]`: `maxFlow 1` · `pathWeight 0.21072` ·
`T-4 OK (write rejected)` · `boot_checks.passed == true` · exit `0`. Note the parameter binding
is illustrative in the shell form above — `redis-cli` has no param map, so the real `T-1`/`T-3`
legs run through `bootcheck.py` with bound params and this script is the grader-facing
smoke version using inlined fixture ids.

### 6.2 Happy path — `tests/drill.sh`, the `C-2`/`C-3`/`C-4` evidence

Re-runnable against a freshly seeded graph. Each step names its expected status and the exact
field a grader reads. `[UNVERIFIED]` expectations; results `NOT_CLAIMED`.

| # | Call | Expect | Field a grader reads |
|---|------|--------|----------------------|
| 1 | `GET /health` | `200` | `.boot_checks.passed == true`, `.epsilon`, `.lambda`, `.corpus` |
| 2 | `POST /remember` — echo-chamber claim | `200` `BLOCK` | `.verdict`, `.status == "REFUSED"`, `.recorded == true`, `.receipt_id`, `.review_id == null` |
| 3 | `POST /remember` — corroborated claim | `200` `ALLOW` | `.verdict`, `.status == "ADMITTED"`, `.incoming.components.independence == 2` |
| 4 | `POST /remember` — tie claim | `200` `UNDECIDED` | `.verdict`, `.status == "QUEUED"`, `.review_id != null`, `abs(.margin) <= .epsilon` |
| 5 | `GET /review?status=OPEN` | `200` | `.items[].review_id` contains step 4's `review_id`; `.items[0].reason == "WITHIN_EPSILON"` |
| 6 | `GET /receipts/{id from 3}` | `200` | `.cypher[0].read_command == "GRAPH.RO_QUERY"`, `.cypher[].query` verbatim, `.candidates[].components` four fields separate, `.candidates[].independence_witness.witness_nodes` |
| 7 | `POST /receipts/{id from 3}/replay` | `200` | `.matches_original == true`; any `.divergence[].reason` is `"RECENCY_DECAY"` only |
| 8 | `GET /slots/{contested key}/graph` | `200` | `.nodes[].id` follows the frozen `ss` / `si:<id>` / `so:<id>` convention; `.witness_sets` non-empty |
| 9 | `GET /slots?contested=true` | `200` | `.total >= 1`, `.slots[].last_verdict`, `.epsilon` echoed |
| 10 | `GET /slots/{key}` | `200` | `.ranking` ordered best-first, `.claims[].score_is_ordinal == true` |

```bash
#!/usr/bin/env bash
# tests/drill.sh — C-2/C-3/C-4 evidence. Results: NOT_CLAIMED until build runs it.
set -euo pipefail
B=http://localhost:8000
post() { curl -sS -X POST "$B/remember" -H 'content-type: application/json' -d "$1"; }

curl -sS "$B/health" | jq -e '.boot_checks.passed == true' >/dev/null

echo "--- 2. echo chamber -> expect BLOCK"
post '{"agent_id":"agt_scraper_2","subject":"customer:acme","predicate":"primary_region",
       "object":"us-east-1","sources":["src_blog_echo_a","src_blog_echo_b"]}' | tee /tmp/m2.json \
  | jq -e '.verdict=="BLOCK" and .recorded==true and .review_id==null' >/dev/null

echo "--- 3. corroborated -> expect ALLOW"
post '{"agent_id":"agt_planner_7","subject":"vendor:northwind","predicate":"region",
       "object":"eu-central-1","sources":["src_crm_export","src_contract_pdf"]}' | tee /tmp/m3.json \
  | jq -e '.verdict=="ALLOW" and .incoming.components.independence==2' >/dev/null

echo "--- 4. deliberate tie -> expect UNDECIDED"
post '{"agent_id":"agt_crawler_1","subject":"vendor:northwind","predicate":"sla_tier",
       "object":"gold","sources":["src_tie_a"]}' | tee /tmp/m4.json \
  | jq -e '.verdict=="UNDECIDED" and .review_id!=null and (.margin|fabs) <= .epsilon' >/dev/null

RID=$(jq -r .review_id /tmp/m4.json)
curl -sS "$B/review?status=OPEN" | jq -e --arg r "$RID" '[.items[].review_id]|index($r)!=null' >/dev/null

RCPT=$(jq -r .receipt_id /tmp/m3.json)
curl -sS "$B/receipts/$RCPT" | jq -e '.cypher[0].read_command=="GRAPH.RO_QUERY"
  and (.candidates[0].components|has("independence") and has("reliability")
       and has("recency") and has("path_weight"))' >/dev/null
curl -sS -X POST "$B/receipts/$RCPT/replay" | jq -e '.matches_original==true
  and ([.divergence[]?.reason]|all(.=="RECENCY_DECAY"))' >/dev/null

KEY=$(printf 'customer:acme|primary_region' | jq -sRr @uri)
curl -sS "$B/slots/$KEY/graph" | jq -e '(.nodes|length)>0 and (.witness_sets|length)>0' >/dev/null
echo "DRILL OK"
```

Expected terminal output `[UNVERIFIED]`: `DRILL OK`, exit `0`. Any `jq -e` failure exits
non-zero at the failing step, which is the point — the drill names the broken step rather than
printing a wall of JSON.

### 6.3 Edge cases

| Case | Expect | Why it matters |
|------|--------|----------------|
| `POST /remember` with `sources: []` | `400 NO_SOURCES` | Never a verdict on no evidence. A claim with no provenance has no `independence` to compute. |
| `POST /remember` with `sources` absent | `400 NO_SOURCES` (not `VALIDATION_ERROR`) | The contract gives this its own code; a generic 400 is a conformance miss. |
| Unknown `agent_id` | `422 UNKNOWN_AGENT` | |
| One unknown entry in `sources` | `422 UNKNOWN_SOURCE`, offenders in `error.detail.unknown` | Partial-validity must not half-succeed. |
| `subject` or `object` empty string | `400 VALIDATION_ERROR` | `slot_key` would be malformed. |
| Slot key not URL-encoded (raw `:` and `\|`) | resolves, or `404 SLOT_NOT_FOUND` — **never a 500** | `\|` in a path segment is the single likeliest console/engine mismatch at the 16:25 join. |
| `GET /slots/{key}` for an existing but **uncontested** slot | `200` with one claim, `top_margin: null` | `null` not `0.0`; a `0.0` would read as a tie. |
| First claim into an **empty** slot | `best_incumbent score = 0.0` → `margin = score(incoming)` → `ALLOW` unless the score is itself `<= epsilon` | A pathological first claim (independence `0`) scores `0.0`, giving `margin 0.0` → **UNDECIDED**, not ALLOW. Correct, and worth asserting. |
| `independence == 0` (a claim whose sources have no origin path) | `score 0.0`; verdict follows the band | Not an error. Record it; do not special-case. |
| `limit` out of range on `/slots` or `/review` | `400 VALIDATION_ERROR` | Contract says 1..200. |
| Receipt id that does not exist | `404 RECEIPT_NOT_FOUND` | |
| `POST /replay` with a body of `{}` and with no body | both `200` | Contract §2.6 permits either. |

### 6.4 Failure cases

| Case | Expect | How it is produced |
|------|--------|--------------------|
| FalkorDB unreachable | `503 ENGINE_UNAVAILABLE` in the `Error` shape — **never a stack trace** | Point the client at a dead port in a scratch process. **Do not stop `gh-falkor`** — it is the live build DB and stopping it is prohibited. |
| A boot assertion red at startup | every route `503 BOOT_ASSERTION_FAILED`, mismatch in `error.detail` | Flip one expected value in a throwaway copy of `bootcheck.EXPECTED`, confirm the 503, revert. |
| `rw()` handed a `MATCH`-only statement | raises before reaching the engine | Unit-level: the guard in §3 C2. |
| A receipt whose recorded statement no longer executes | `409 REPLAY_MISMATCH` | Only when the statement itself fails, not when a value drifts. |
| Graph mutated between decision and replay | `matches_original: false`, `divergence[].reason == "GRAPH_MUTATED"` | Admit a new claim into the slot, then replay the older receipt. |
| Time passes between decision and replay | `matches_original: true`, `divergence[].reason == "RECENCY_DECAY"` | The expected, benign case. Must not be reported as a mismatch. |

### 6.5 Adversarial cases — the judge's attack, run against ourselves

| Attack | What a skeptic is really asking | Expect |
|---|---|---|
| **The echo attack.** One actor cites itself through five relabelled intermediates, all deriving from one origin. | *"Your independence score is just a citation count with extra steps."* | `independence == 1`, **not 5**. This is `T-1` generalised to depth, and it is the single claim the panel is most likely to attack. Seed it explicitly as a slot in the corpus so it is inspectable without our help. |
| **The hop-count forgery.** Swap `weightProp` for `weightProperty` in a scratch copy and re-run `T-3`. | *"How do you know `reliability` isn't secretly hop count?"* | `pathWeight` degenerates to an **integer** and `T-3` **FAILS**, which proves the assertion has teeth rather than being decorative. `[VERIFIED]` that the wrong key returns hop count silently (AF-3/FC-3); `[UNVERIFIED]` that our `T-3` catches it. Revert immediately. |
| **The bypass edge.** Add one `(:Claim)-[:CITES]->(:SourceOut)` edge to a scratch graph and re-run `T-1`. | *"Is the node-split actually load-bearing, or decorative?"* | `T-1` returns `2` and boot **refuses**. Demonstrates the split is the mechanism, not a label. |
| **The over-collapse.** Does the fix turn everything into `1`? | *"You could pass the echo test by always returning 1."* | `T-2` returns `2`. Both directions are asserted, which is why `T-2` exists at all. |
| **The blend leak.** Grep every response for a field that is a blended number other than `score`. | *"You multiplied three incompatible units and hid it."* | Four component fields are surfaced separately plus `path_weight` raw; `score_is_ordinal: true` on every parent; `epsilon` echoed on every decision. `grep -c 'confidence\|percent\|probability' api.py` → `0`. |
| **The overreach read.** Grep the whole engine for the banned vocabulary. | *"You claim to compute what is true."* | `grep -rniE 'truth\|detects conflict\|stored procedure' *.py` → `0` hits. The words are **refused** and **admission control**. |
| **The containment bluff.** Try a write through the read path. | *"You say generated Cypher is contained — prove it."* | `T-4` errors, server-side. `[VERIFIED]` upstream (AF-8). |

### 6.6 Evidence law

Engine-side proof is `tests/boot_drill.sh` + `tests/drill.sh` output.
**Completion is not claimed from curl alone** — `docs/ORCHESTRATION-PROTOCOL.md` §6 requires
the integrated product seen in **real Chrome**, which happens at 16:45 after the console
joins. The browser is a **singleton**, driven from the master chat, **never delegated to a
subagent**. `[UNVERIFIED]`

---

## 7. security / threat notes

| Threat | Control | Tag |
|--------|---------|-----|
| Generated or parameterised Cypher reaching a write | **All reads go through `GRAPH.RO_QUERY`** — `CREATE` rejected, `MATCH` allowed, enforced **server-side**, not by client-side string inspection. This is the only real containment boundary. Python client only; the TS client does not expose the command (FalkorDB issue #408). | control `[VERIFIED]` AF-8/FC-6; our use of it `[UNVERIFIED]` |
| Injection via claim text | Every user value is a **bound parameter**. No f-string ever interpolates a user value into Cypher. The receipt stores the parameterised query text and the params **separately**, which is also what makes the receipt auditable rather than just quoted. | `[UNVERIFIED]` |
| A wrong BLOCK silently censoring an agent | BLOCK is **persisted and appealable**: `status: REFUSED`, receipt retained, `recorded: true` on every response. MENGER gates a write; it does not adjudicate anything beyond admissibility. This is R-2's product-level answer. | `[UNVERIFIED]` |
| Overreach framing | Vocabulary discipline: **refused / admission control**. The banned words are enforced in the API's own strings and field names, not only in the README; `CONTRACT.md` §4 forbids them in the console too. Asserted by grep in §6.5. | `[UNVERIFIED]` |
| Private data in the graph | Synthetic seeded corpus only, committed in-repo, deterministic RNG. A stated disqualifier in `config.json`. | `[UNVERIFIED]` |
| Non-provenance edges adjacent to the flow network | `algo.maxFlow` takes **exactly one** relationship type, so an extra edge type near `FLOW` is a correctness hazard beside the headline number. Receipts are therefore flat JSON on a node, never a sub-graph (§5.1). | constraint `[VERIFIED]` AF-4; mitigation `[UNVERIFIED]` |
| Engine state loss | `gh-falkor` is the live build DB and **stays up**. The image declares no volume; `dir=/var/lib/falkordb/data`, `appendonly=no`, `save='3600 1 300 100 60 10000'` — it survives a restart but **not** a `docker rm`. Do **not** stop, kill, restart, or remove it. | `[VERIFIED]` `config.json` `pinned_runtime` |

**Per-surface enumeration — signing, admin, credentials, exposure.** The table above is the
threat list; this one is the **surface** list, and the two are not the same thing. A surface is a
place where someone outside the process can reach authority inside it. MENGER has fewer of these
than a reader expects, and the point of writing the empty ones down is that "we have no signing
surface" is a *claim a judge can falsify* — so it is stated here with its enforcement rather than
left to be inferred from the absence of a section.

| Surface | Threat | Mitigation |
|---------|--------|------------|
| **Signing** | None exists. MENGER signs nothing: no private keys, no wallet, no JWT issuance, no request signing, no custody of any credential. A reader skimming this plan may mis-read `slot_key`, the weight *key*, or `{key}` as cryptographic — **every occurrence of "key" in this document is a `:Slot` key (`subject\|predicate`) or a Cypher config key.** | Mitigated by construction: no signing code path is planned, so there is nothing to leak. Enforced as an invariant — if any slice introduces a signing or credential surface, this section is wrong and that slice re-gates. `[UNVERIFIED]` |
| **Secrets / credentials** | A committed secret, or an engine reachable by something other than the API. | No secrets exist to commit. `gh-falkor` is reached on the loopback with no auth and holds only the synthetic corpus. The engine requires no `.env`. Nothing in this repo is a credential. `[UNVERIFIED]` |
| **Admin / privileged configuration** | The one genuinely privileged surface in the engine: **whoever can set ε, λ, and the seed can change every verdict without touching a claim.** ε widens or collapses the UNDECIDED band; λ re-weights the whole corpus by age; re-seeding rewrites the provenance graph the independence count is computed over. A judge is right to ask who holds this, because a tunable band is how a demo gets made to look decisive. | The privileged configuration path is bounded by three controls rather than by access control: tampering with ε, λ or the seed is not *blocked*, it is made visible and auditable, which is the honest guarantee a single-process hackathon artifact can actually enforce. **(1) The constants are server-side and published** — `GET /health` reports ε and λ, and every decision echoes the pair it was judged under (AF-17 / DS-8 / R-4), so a verdict cannot be read without reading the band it came from. **(2) Boot assertions fail closed** — `echo→1`, `independent→2`, `sp_path_weight 0.21072`, else `503 BOOT_ASSERTION_FAILED`; a tampered seed does not yield a flattering graph, it yields a service that refuses to serve (AF-16, constants `[VERIFIED]` AF-3/AF-6). **(3) The receipt is the audit trail** — the DOCKET carries the executed query, the params, and the three components unblended, so a changed constant is visible in the artifact rather than hidden in a score. What is **not** mitigated: there is no authentication on the config path because there is no config path — the values are process constants, so changing them means a redeploy. That is a deliberate v1.0 limitation, recorded in `LIMITATIONS.md`, not an oversight. | controls `[VERIFIED]` AF-3/AF-6/AF-16; our wiring of them `[UNVERIFIED]` |
| **Public exposure** | The deployed instance is internet-reachable with no auth, so anyone can write claims and mutate the demo graph during the judging window. | **Owned by `deploy-to-github`, not here (DS-12).** Recorded now so it is not discovered at 17:15: the deployed graph is disposable synthetic data, re-seedable from `seed.py`, and the write path can only create `:Claim` / `:Review` / `:Receipt` nodes — reads are hard-bounded by `GRAPH.RO_QUERY`, so **no request can delete or rewrite the provenance corpus.** The durable-tier decision is already recorded (`durability-tier.json`: stateful, 168h window, no spin-to-zero, `spendApproved: false`). `[UNVERIFIED]` |

No auth, no rate limiting beyond the documented `429 RATE_LIMITED` shape (reserved, not
implemented in v1.0). That is a deliberate, recorded limitation of a hackathon artifact, and
`hackathon-package` states it in the README. `[UNVERIFIED]`

---

## 8. doc-traceability

| This plan | Traces to | Tag |
|-----------|-----------|-----|
| Mechanism, formulas, schema | `warroom/WINNER-BRIEF.md` §Mechanism, §Schema — **verbatim**, not re-derived | `[UNVERIFIED]` |
| Build order B1→B2→GATE→B3→B4 | `WINNER-BRIEF.md` §Build plan, rebased per `LEDGER.md` §3 schedule | `[UNVERIFIED]` |
| Node-split + both control assertions | DS-1, AF-6, VF-W2, FC-4, R-1 | `[VERIFIED]` |
| `weightProp` only + `0.21072` | DS-2, AF-3, FC-3, FC-5, R-3 | `[VERIFIED]` |
| Two-hop trust-0.9 reconstruction of the `T-3` fixture | arithmetic on AF-3's value; **not** in the transcript | `[ASSUMED]` |
| `algo.maxFlow` signature, exactly one relType | AF-4, FC-2 | `[VERIFIED]` |
| `algo.SPpaths` signature | AF-2, FC-2 | `[VERIFIED]` |
| No `algo.dijkstra` / `algo.SCC`; the real `algo.*` set | AF-1, VF-W5, FC-1 | `[VERIFIED]` |
| `algo.pageRank` is two positional args | AF-5, FC-2 | `[VERIFIED]` |
| `algo.betweenness` dropped | `WINNER-BRIEF.md` correction #3 | `[UNVERIFIED]` |
| `GRAPH.RO_QUERY` containment | AF-8, VF-W4, FC-6 | `[VERIFIED]` |
| Engine pin `v4.22.1`, `:latest` resolves to it, GraphRAG-SDK broken on 6.0.x | AF-9, VF-I1, `config.json` `pinned_runtime`, R-8 | `[VERIFIED]` |
| Latency is not the bottleneck: 41ms cold / 11ms warm @ 1402n/2400e | AF-7, VF-W3, FC-7 | `[VERIFIED]` |
| Spine repriced on orchestration, not engine latency | `WINNER-BRIEF.md` correction #4, FC-7 | `[UNVERIFIED]` |
| Boot assertions are a public `/health` surface, 503 on mismatch | AF-16, `CONTRACT.md` §2.8 | `[UNVERIFIED]` |
| `epsilon` / `lambda` are server constants, echoed, never console-hardcoded | AF-17, DS-8, DS-14, R-4, `CONTRACT.md` §0 rule 9 / §4 | `[UNVERIFIED]` |
| `epsilon = 0.05`, `lambda = 0.01/hour` starting values | proposed defaults; VF-F4 records them as `NOT_CLAIMED` | `[ASSUMED]` |
| Three components separate + ordinal | DS-8, R-4, `CONTRACT.md` §0 rules 1–2, §1 | `[UNVERIFIED]` |
| Vocabulary discipline (refused / admission control) | DS-3, DS-4, R-2, R-5, `LEDGER.md` §5.4–5.5 | `[UNVERIFIED]` |
| Contract conformance is not self-certifiable | DS-13, `C-5` | `[UNVERIFIED]` |
| Stretch gated at 16:25; `GRAPH.COPY` latency unmeasured | DS-10, DS-11, VF-W6 | `NOT_CLAIMED` |
| Live URL + durable tier | DS-12, DS-15 → `deploy-to-github` | `[UNVERIFIED]` |
| HTTP surface | `CONTRACT.md` v1.0 (frozen), AF-15 | `[UNVERIFIED]` |
| Artifact-only judging shapes every doc | AF-10, `config.json` `judging_process` | `[VERIFIED]` |
| Synthetic-only corpus, fresh code, no port from LEASH / 0g-fleet | `LEDGER.md` §5.6–5.7; the repo was `git init`'d today | `[UNVERIFIED]` |

---

## 9. risks

Severity is a **class**, not prose. The register below is the `WINNER-BRIEF.md` §Risk register
carried forward with no re-litigation; what is new is a **decision tree per row** — what the
engine chat actually does when one fires mid-build, including the "it failed" branch.

| ID | severity | Risk | Binds at | Owner |
|----|----------|------|----------|-------|
| R-1 | severity: critical | Node-split omitted or wrong → the headline claim is false | B1 (`T-1`/`T-2`) | engine |
| R-2 | severity: critical | Credibility overreach — the product read as adjudicating veracity | B3 + `hackathon-package` | engine + package |
| R-3 | severity: high | `algo.SPpaths` weight-key trap → a silent hop-count score | B2 (`T-3`) | engine |
| R-4 | severity: high | Three incompatible units, no stated weights or epsilon | B2 + the response layer | engine |
| R-5 | severity: medium | `agentmesh` owns the contradiction-detection vocabulary | `hackathon-package` | package |
| R-6 | severity: medium | `Quorum-falkordb` out-polishes us (59+ commits, 660+ tests, CI) | `design-forge` + `hackathon-demo` | design + demo |
| R-7 | severity: medium | Clock — the 16:25 gate is hard | `hackathon-verify` | master |
| R-8 | severity: low | Engine pin drift (`:latest` → 6.0) | `deploy-to-github` | deploy |
| R-9 | severity: medium | Contract drift between the two concurrent chats before the 16:25 join | B3/B4 + `hackathon-verify` | engine + master |

### R-1 (severity: critical) — node-split wrong → the headline claim is false

```
T-1 or T-2 fails at seed time
├─ echo returns > 1  → the split edge is missing, mis-capped, or bypassed.
│   Check, in this order:
│     1. every :Source has BOTH :SourceIn and :SourceOut
│          MATCH (s:Source) WHERE NOT EXISTS {
│            MATCH (:SourceIn {sid:s.id})-[:FLOW]->(:SourceOut {sid:s.id}) }
│          RETURN count(s)                           -- expect 0
│     2. exactly ONE split edge per pair (a duplicate = capacity 2 = the bug restored)
│          MATCH (:SourceIn)-[f:FLOW]->(:SourceOut) RETURN count(f), count(DISTINCT f)
│     3. NOTHING bypasses the pair
│          MATCH (:Claim)-[:CITES]->(:SourceOut) RETURN count(*)        -- expect 0
│          MATCH (:SuperSource)-[:FLOW]->(:SourceOut) RETURN count(*)   -- expect 0
│     4. every flow edge carries cap:1.0
│          MATCH ()-[f:FLOW]->() WHERE f.cap <> 1.0 RETURN count(f)     -- expect 0
├─ independent returns 1 → either a shared intermediate leaked into the "independent"
│   fixture, or only ONE :SuperSource->:SourceIn origin edge exists.
│     MATCH (:SuperSource)-[:FLOW]->(si:SourceIn) RETURN count(si)      -- expect >= 2
│   Over-collapse is as fatal as under-collapse: a fix that makes everything 1 would
│   pass T-1 and destroy the product.
├─ both fail → suspect the relationship type. algo.maxFlow takes EXACTLY ONE type (AF-4);
│   if DERIVED_FROM was folded into relationshipTypes the call errors, and if the split
│   edges were created as DERIVED_FROM instead of FLOW the flow network is disconnected
│   and maxFlow returns 0.
└─ EVERY branch ends the same way: FIX THE SEED.
   Never adjust the expected value. Never soften the assertion to a range or a >=.
   Never proceed with the assertion disabled "to unblock B2."
   No build progress happens past a red T-1/T-2 — that is DS-1's acceptance, verbatim.
```

**If R-1 is still red at the end of B1's envelope:** it is not a scheduling problem, it is the
product. Stop, escalate to the master chat, and spend B2's budget on B1. A MENGER that ships
with `independence` counting edge-disjoint paths has a false headline claim in front of the
people who wrote the engine, and `config.json` lists "inability to explain the graph model"
as a disqualifier.

### R-3 (severity: high) — the `weightProp` trap → a silent hop-count score

```
T-3 pathWeight != 0.21072
├─ the value is an INTEGER (1.0, 2.0, 3.0) → the weight key was ignored → hop count.
│   The key is EXACTLY `weightProp`. Not weightProperty, not costProperty, not
│   relationshipWeightProperty. Those three are accepted SILENTLY and return hop count
│   with NO error (AF-3/FC-3). grep the repo:
│     grep -rn "weightProperty\|costProperty\|relationshipWeightProperty" *.py   -- expect 0
├─ the value is non-integer but wrong → the `nl` property is wrong on some edge.
│   nl = -ln(trust), trust in (0,1]. Check:
│     MATCH ()-[e:DERIVED_FROM]->() WHERE e.nl IS NULL RETURN count(e)       -- expect 0
│     MATCH ()-[e]->() WHERE e.nl < 0 OR e.nl = 1/0.0 RETURN count(e)        -- expect 0
│     MATCH (s:Source) WHERE s.trust <= 0 OR s.trust > 1 RETURN count(s)     -- expect 0
│   trust = 0 gives nl = +inf and poisons every path through that source.
├─ the call ERRORS instead of returning → wrong signature. The correct one is
│   {sourceNode, targetNode, relTypes, weightProp}. `weightProp` is an ERROR key on
│   algo.maxFlow and the ONLY correct key on algo.SPpaths — do not cross them.
├─ the fixture itself is wrong → 0.21072 is consistent with two hops at trust 0.9
│   ([ASSUMED], §5.4). Rebuild the fixture as two nl=0.10536 hops and re-run.
└─ Never "accept close enough" and never widen a tolerance. 0.21072 was measured live
   against this exact image; it is the only passing value. Compare with an absolute
   tolerance of 1e-5 on the rounded value, not with ==, and fail outside it.
```

### R-4 (severity: high) — three incompatible units, no stated weights (the User Advocate's standing dissent)

```
Answered STRUCTURALLY, not by argument:
├─ the four component fields are separate typed fields on every scored object
│  (independence:int, reliability:float, recency:float, path_weight:float) — CONTRACT §1
├─ score_is_ordinal: true is stamped on every parent object that carries a score
├─ epsilon is echoed on EVERY decision and published by /health; the console is
│  forbidden from hardcoding it (CONTRACT §4)
├─ path_weight is surfaced RAW alongside reliability, so a judge can audit the
│  hop-count trap straight off the receipt, without our help
├─ independence is an INTEGER in the JSON — a float would invite a probability reading
└─ CONTRACT §4 forbids the console from rendering score as a percentage, a confidence,
   or a probability.
If a reviewer STILL reads the fold as cardinal:
├─ it is a PACKAGE wording fix (DS-8), not an engine change
└─ do NOT reopen the mechanism (R1/R4). Route the finding to hackathon-package.
```

### R-2 (severity: critical) — credibility overreach

```
Not an engine failure mode; an engine DISCIPLINE one.
├─ API strings, error messages, and field names use admission-control vocabulary only.
├─ A BLOCK is "refused", is persisted, and is appealable; UNDECIDED is first-class and
│  lands in a queue rather than being resolved by a guess.
├─ Self-check before B3 exits:
│    grep -rniE "truth|detects conflict|stored procedure" *.py   -- expect 0 hits
├─ The verdict space is a decision about a WRITE. Nothing in the engine claims a
│  property of the world.
└─ Owner of the final public wording: hackathon-package (DS-4). The engine's only job is
   to not contradict it in a field name.
```

### R-7 (severity: medium) — the clock

```
16:25 is the verify_milestone AND the stretch gate (DS-11).
├─ spine standing (C-1..C-4 green) → stretch go/no-go is decided THERE, explicitly, and
│  only after DS-10's GRAPH.COPY latency probe has a number
├─ spine NOT standing → the stretch is DEAD, recorded as a decision, and all remaining
│  time goes to the spine
├─ a slice overruns its envelope → cut in this fixed order (§11.7), never ad hoc
└─ "we ran out of time" is NOT a recorded decision (ORCHESTRATION-PROTOCOL §5).
   Write the decision down with its reason, or it did not happen.
```

### R-9 (severity: medium) — contract drift between the two concurrent chats

```
The engine discovers that CONTRACT.md v1.0 is wrong or incomplete mid-build.
├─ is the gap COSMETIC (a field the console can ignore)? → ship the contract shape as
│  frozen, add nothing, note it for v1.1 after submission
├─ is the gap BLOCKING (the engine physically cannot produce a frozen field)?
│   ├─ do NOT rename, do NOT drop, do NOT change a type unilaterally
│   ├─ escalate to the MASTER chat, which announces to the design_forge chat and bumps
│   │  to v1.1 — this is a ~5-minute path, not a blocker (A-F2)
│   └─ until the amendment lands, emit the frozen field with its documented type and a
│      null/empty value, so the console keeps rendering
└─ NEVER discover this at 16:25. If B3 or B4 touches a shape it cannot satisfy, raise it
   the moment it is seen. A silent field rename is the cheapest way to lose the join.
```

### R-5, R-6, R-8 — routed, not engine-resolved

`R-5` (vocabulary ownership) and `R-6` (polish gap) are `hackathon-package`,
`design-forge`, and `hackathon-demo` risks; the engine's contribution is to not contradict
them and to ship the one demo `Quorum-falkordb` structurally cannot stage — a write refused
with **no human in the loop**, then the receipt. `R-8` (pin drift) is
`deploy-to-github`'s: the image tag is `falkordb/falkordb:v4.22.1` **explicitly**, never
`:latest`, in compose and in the README. `:latest` currently resolves to v4.22.1 `[VERIFIED]`
(AF-9, `MODULE LIST` → `graph ver 42201`), but GraphRAG-SDK is broken on 6.0.x, so the pin is
load-bearing rather than cosmetic.

---

## 10. out-of-scope

Not built by this plan, and not by the engine chat.

- **P4, P6, P7** — dead (R4). Not revisited, not referenced.
- **Resolving a review item.** `GET /review` is read-only in v1.0; there is no
  `POST /review/{id}/resolve`, and the console must not assume one exists
  (`CONTRACT.md` §2.7). A resolve action needs a human-in-the-loop story, and needing a human
  to supply the correction is precisely `Quorum-falkordb`'s weakness MENGER is positioned
  against (R-6). Adding it would blunt the differentiator.
- **Auth, multi-tenancy, rate limiting** beyond the documented `429 RATE_LIMITED` shape,
  which is reserved and unimplemented.
- **A test framework.** Deliberate (§6): boot assertions plus two scripted drills, because an
  assertion in the boot path cannot be skipped and is judge-visible through `/health`.
- **`algo.betweenness`, `algo.pageRank`, `algo.AStar`, `algo.WCC`** and every other member of
  the v4.22.1 set except `maxFlow` and `SPpaths`. `betweenness` was dropped by
  `WINNER-BRIEF.md` correction #3 as the wrong selector.
- **Caching, batching, or any performance work.** `maxFlow` is `41ms` cold / `11ms` warm at
  a scale larger than our corpus `[VERIFIED]` (AF-7). Budget zero time here. If something is
  slow it is orchestration (per source–claim pair), which is already priced into the slice
  sizes (`WINNER-BRIEF.md` correction #4).
- **The console** — `design-forge`, its own chat, **in full**, concurrent (R5).
- **The live deployment URL and the durable tier** — `deploy-to-github` (DS-12, DS-15).
- **README, the separately-listed Cypher artifact, the AI-assistance disclosure, the track
  declaration, the explicit epsilon + ordinal statement** — `hackathon-package` (DS-3..DS-8).
- **The ≤180s video** — `hackathon-demo`.
- **The submission form** — `hackathon-verify`, real Chrome, master chat, singleton browser.
  Form fields are still **UNEXTRACTED** (login-gated SPA) `[VERIFIED]` as a gap in
  `config.json`.
- **The DEV.to "FalkorDB sharp edges" post** (DS-9) — post-submission.
- **Merging `fix/p0-2b`, pushing, staging, or committing.** Not authorized (R3, `LEDGER.md`
  §5.11). **This chat wrote files only.**
- **`CONTRACT.md`** — FROZEN v1.0, read-only to this chat. Two other chats consume it live.

---

## 11. execution envelope — the slice order, command by command

`WINNER-BRIEF.md` §Build plan rebased onto `LEDGER.md` §3's schedule. **T0 = the engine
chat's actual start** (scheduled 14:30 WAT; the ledger already records ~15m of slip). All
envelopes are elapsed minutes from T0, with the ledger's absolute times beside them, because
a later start must compress rather than shift the 16:25 gate — that gate is hard (R-7).

| Slice | Envelope | Absolute (sched.) | Content | Exit condition — **no exit, no next slice** |
|-------|----------|-------------------|---------|---------------------------------------------|
| **B1** schema + seed | T0 → T0+50 | 14:30 → 15:20 | `seed.py`, `graph.py`, `bootcheck.py`. Node-split **at seed time**. Three set-pieces. Both control fixtures. | `T-1`=`1`, `T-2`=`2`, `T-4` errors. Seed refuses to exit 0 otherwise. |
| **B2** resolver | T0+50 → T0+95 | 15:20 → 16:05 | `arbiter.py`. `maxFlow` per candidate, `SPpaths` per candidate, decay, fold, margin, verdict. All reads `GRAPH.RO_QUERY`. Calibrate `epsilon` and `lambda`. | `T-3`=`0.21072`. All three verdicts reachable on the set-pieces (`C-2`). `epsilon`/`lambda` fixed and recorded. |
| **GATE** | T0+95 | 16:05 | Spine standing? | Yes → B3. No → the stretch is **already dead**; all remaining time to the spine. |
| **B3** write gate + review queue | T0+95 → T0+140 | 16:05 → 16:50 | `api.py`: `/remember`, `/slots`, `/slots/{key}`, `/slots/{key}/graph`, `/review`, `/health`. BLOCKED writes **recorded, never dropped**. | `C-3`. `drill.sh` steps 1–5, 8–10 pass. |
| **B4** DOCKET receipts | T0+140 → T0+175 | 16:50 → 17:25 | `docket.py`: `/receipts/{id}`, `/receipts/{id}/replay`. Verbatim Cypher + four components + winning path + witness set. | `C-4`. `drill.sh` steps 6–7 pass. |
| **B5** *(stretch)* | gated | after 16:25 go/no-go | `counterfactual.py` — `GRAPH.COPY` fork, delete one source, re-arbitrate, diff verdicts. **Measure `GRAPH.COPY` FIRST (DS-10) — currently `NOT_CLAIMED`.** | Deletable as one file + one route. |

**The envelope and the gate are in tension on purpose.** B3+B4 as scheduled run past 16:25.
That is why the stretch go/no-go at 16:25 is a *gate on the stretch*, not a deadline for the
spine, and why §11.7's cut order exists. If B1 and B2 both land inside their envelopes, the
16:25 decision is made with the spine mid-B3 and the honest answer is almost always **no
stretch**.

### 11.1 Preflight — before B1, five minutes, no code

```bash
# 1. the engine is up and is the pinned image. DO NOT start/stop/rm this container.
docker ps --filter name=gh-falkor --format '{{.Names}} {{.Image}} {{.Status}}'
#   expect: gh-falkor falkordb/falkordb:v4.22.1 Up ...

# 2. the graph module version confirms the pin
docker exec gh-falkor redis-cli MODULE LIST
#   expect: a row with name "graph" and ver 42201   [VERIFIED] AF-9 / VF-I1

# 3. the algo set is the one AF-1 recorded — re-derive, do not trust the plan
docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "CALL dbms.procedures() YIELD name RETURN name" \
  | grep -E 'algo\.' | sort
#   expect: AStar BFS HarmonicCentrality MSF SPpaths SSpaths WCC betweenness
#           labelPropagation maxFlow pageRank
#   expect ABSENT: algo.dijkstra, algo.SCC

# 4. the containment boundary, before anything depends on it
docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "CREATE (:PreflightProbe {x:1})"
#   expect: (error) ... RO_QUERY is to be executed only on read-only queries
```

**Decision tree if preflight fails:**

```
docker ps shows no gh-falkor
├─ DO NOT `docker rm` anything and DO NOT assume it is safe to recreate — the container
│  is the live build DB for this and other chats. Escalate to the master chat first.
└─ If and only if the master chat confirms it is gone:
     docker run -d --name gh-falkor -p 6379:6379 -p 3000:3000 \
       -v falkordb_data:/var/lib/falkordb/data falkordb/falkordb:v4.22.1
   (the image declares NO volume; without -v the data survives restart but not rm)

MODULE LIST shows a version other than 42201
└─ STOP. Every [VERIFIED] fact in this plan was measured against 42201. On a different
   engine they are all [UNVERIFIED] again. Escalate; do not re-probe silently and do not
   proceed on the assumption that the signatures carried over.

the algo list differs from AF-1
└─ The Active Facts are authoritative over this plan, but a LIVE re-derivation is
   authoritative over the Active Facts. Record the delta in PULSE and escalate before
   writing any Cypher against a procedure you have not just seen.

step 4 did NOT error
└─ The containment boundary is not in effect. C-6 is unsatisfiable and §7's primary
   control is fictional. STOP and escalate — this invalidates a claim the README makes.
```

### 11.2 B1 — schema + seed (T0 → T0+50)

**Build in this order**, because each file's imports must already exist: `graph.py` →
`bootcheck.py` → `seed.py`.

**Exact verification commands and their expected output** `[UNVERIFIED]`:

```bash
python seed.py --reset
#   expect, in order:
#     seeded: agents=<n> sources=<n> claims=<n> slots=<n>
#     T-1 node_split_echo        expected=1       actual=1       PASS
#     T-2 node_split_independent expected=2       actual=2       PASS
#     T-3 sp_path_weight         expected=0.21072 actual=0.21072 PASS
#     T-4 containment            CREATE via RO_QUERY rejected    PASS
#     seed OK
#   expect exit code 0.  A FAIL on T-1/T-2 MUST exit non-zero (DS-1).

python -m bootcheck --json | jq .
#   expect: {"passed":true,"checks":{"node_split_echo":{"expected":1,"actual":1,"pass":true},...}}

# structural integrity — the four R-1 queries from §9, all expected 0
docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger \
  "MATCH (:Claim)-[:CITES]->(:SourceOut) RETURN count(*)"            # expect 0
docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger \
  "MATCH (:SuperSource)-[:FLOW]->(:SourceOut) RETURN count(*)"       # expect 0
docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger \
  "MATCH ()-[f:FLOW]->() WHERE f.cap <> 1.0 RETURN count(f)"         # expect 0
docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger \
  "MATCH (s:Source) WHERE s.trust <= 0 OR s.trust > 1 RETURN count(s)" # expect 0
```

**B1 decision tree:**

```
seed.py exits non-zero
├─ T-1 or T-2 red  → §9 R-1 tree. FIX THE SEED. No B2 until green.
├─ T-3 red         → §9 R-3 tree. Usually the fixture, not the resolver, at B1.
├─ T-4 red         → §11.1 step 4 tree. Escalate.
└─ a Cypher ERROR rather than a wrong value
    ├─ "MaxFlow configuration contains unknown key" → you used sourceNode/target/
    │   src/dest/sinkNodes/weightProp/capacityProp. The keys are exactly
    │   relationshipTypes, sourceNodes, targetNodes, capacityProperty (AF-4).
    ├─ "unknown procedure algo.dijkstra" → AF-1. It does not exist. Use algo.SPpaths.
    └─ relationshipTypes with two types → AF-4 allows EXACTLY ONE. Split the concern:
        FLOW carries the flow network, DERIVED_FROM is for the reliability path only.

seed.py exits 0 but the corpus looks wrong (e.g. every claim scores independence 1)
└─ do NOT move to B2. Run the four structural queries above. An all-1 corpus means
   either no :SuperSource origin edges or a bypass — T-2 should have caught it, so also
   verify the T-2 fixture is actually IN the seeded graph and not a leftover scratch graph.

B1 is past T0+50 and not green
└─ this is R-1 territory, not a scheduling problem. Escalate to the master chat and take
   B2's budget. The stretch is dead as of this moment — record that decision now rather
   than at 16:25.
```

**Prepared commit message (do not run — push is HELD, nothing is staged):**
`feat(engine): node-split provenance schema + synthetic seed + fail-closed boot assertions (DS-1, DS-2)`

### 11.3 B2 — resolver (T0+50 → T0+95)

`arbiter.py`. One candidate at a time: `maxFlow` for `independence`, `SPpaths` for
`path_weight` → `reliability`, decay for `recency`, then the fold and the margin. Every read
through `graph.ro`. Record each executed statement with its `duration_ms` as it runs — B4's
receipt needs the **verbatim** text and B4 is not the place to reconstruct it.

```bash
python -m arbiter --slot 'customer:acme|primary_region' --explain
#   expect: one row per candidate claim with independence / reliability / recency /
#           path_weight / age_hours / score, best first, and the verdict + margin + epsilon.
#   expect: independence printed as an INTEGER. A float here is an R-4 regression.

python -m arbiter --selftest
#   expect: T-3 PASS, and all three set-pieces landing BLOCK / ALLOW / UNDECIDED (C-2).
```

**Calibration of `epsilon` and `lambda` — a seed-calibration step, not a tuning knob.**
`epsilon = 0.05`, `lambda = 0.01/hour` are `[ASSUMED]` starting values. The deliberate-tie
set-piece must land in the UNDECIDED band. Per §5.4, a tie is only reachable when the two
claims have **equal integer independence**:

```
the tie set-piece does NOT land UNDECIDED
├─ |margin| is ~0.5 or larger → the two claims have DIFFERENT independence. Fix the
│   SEED so they match; do not inflate epsilon to swallow an integer gap. An epsilon
│   wide enough to cover an independence difference would make the band meaningless and
│   is exactly the "no stated weights" objection in R-4.
├─ |margin| is slightly above epsilon (say 0.06–0.12) → either nudge the fixture's trust
│   or widen epsilon ONCE, deliberately, and record the final value. Whatever lands is
│   what /health reports and what package publishes (DS-8, DS-14).
├─ |margin| is ~0 for EVERY pair → suspect reliability saturating at 1.0 (trust=1.0 on a
│   whole chain → nl=0 → pathWeight 0). Check §5.5's trust-value rules.
└─ do NOT special-case the set-piece in code. The band must be a property of the policy,
   not an if-statement that recognises three claim ids.
```

**Exit gate:** `T-3` green **and** all three verdicts reachable **and** the final
`epsilon`/`lambda` written as module constants that `/health` will read. Also assert the R-4
grep here, while the response layer is still being shaped:
`grep -rniE 'confidence|probability|percent' arbiter.py` → expect `0`.

**Prepared commit message:**
`feat(engine): arbiter — maxFlow independence + weightProp reliability + decay, ordinal fold, epsilon band (DS-8, R-4)`

### 11.4 GATE (T0+95 / ~16:05) — one question, recorded either way

```
Is the spine standing? (T-1..T-4 green AND C-2 demonstrated by arbiter --selftest)
├─ YES → proceed to B3. The counterfactual stretch stays nominally alive but is NOT
│        started; it is re-asked at 16:25 by hackathon-verify (DS-11), and only after
│        DS-10's GRAPH.COPY latency probe has produced a number.
└─ NO  → the stretch is DEAD. Record the decision, with the reason, in PULSE. All
         remaining time goes to the spine, in §11.7's order.
Either way: write the decision down. "We ran out of time" is not a recorded decision
(ORCHESTRATION-PROTOCOL §5).
```

### 11.5 B3 — write gate + review queue (T0+95 → T0+140)

Six routes: `/remember`, `/slots`, `/slots/{key}`, `/slots/{key}/graph`, `/review`,
`/health`. Build `/health` **first** — it is the cheapest route, it proves the boot wiring
end-to-end, and the console's status strip depends on it for `epsilon`, `lambda`, and the
corpus counts.

```bash
uvicorn api:app --port 8000   # dev server; it is long-running BY DESIGN while B3/B4 run.
                              # Track its PID and kill it the moment the drills are done.

curl -sS localhost:8000/health | jq '{ok, epsilon, lambda, corpus, boot_checks}'
#   expect: ok true; epsilon/lambda the B2-calibrated values; boot_checks.passed true

bash tests/drill.sh            # expect: DRILL OK, exit 0 (steps 1-5, 8-10 at this slice)
```

**B3 decision tree:**

```
/health returns 503 BOOT_ASSERTION_FAILED
└─ CORRECT BEHAVIOUR if an assertion is genuinely red. Read error.detail.boot_checks,
   then go to the R-1 or R-3 tree. Do NOT bypass the startup check to "get the API up" —
   AF-16 exists so the service refuses to serve a wrong headline number.

/remember returns a verdict but recorded is false, or review_id is null on UNDECIDED
└─ C-3 violation and a direct hit on R-2's product-level answer. Fix before any read
   route. "Nothing is silently lost" is the claim the User Advocate dissent rests on.

a slot key with a raw `|` 404s or 500s
├─ 500 → unacceptable, fix now. §6.3 says never a 500 on this path.
├─ 404 → acceptable per §6.3, but confirm the ENCODED form resolves, because that is
│   what the console sends. This is the most likely 16:25 join failure (R-9).
└─ test both: raw and jq -sRr @uri encoded.

the engine is unreachable mid-slice
└─ expect 503 ENGINE_UNAVAILABLE in the Error shape of CONTRACT §1, never a stack trace.
   Then check gh-falkor is still Up — and remember you must not stop or remove it.

a frozen contract field cannot be produced
└─ §9 R-9 tree. Emit the field with its documented type and a null/empty value, and
   escalate to the master chat. Never rename, never drop.
```

**Prepared commit message:**
`feat(api): POST /remember write gate + review queue + fail-closed /health publishing boot assertions (AF-16, C-3)`

### 11.6 B4 — DOCKET receipts (T0+140 → T0+175)

`docket.py` plus two routes. The receipt is **the credibility artifact** — under artifact-only
judging (AF-10) it is the only way a skeptic re-derives a verdict with nobody in the room to
explain it. It must carry: the verbatim parameterised Cypher with its params separate, all
four components, the winning provenance path, and the max-flow witness set.

```bash
RCPT=$(curl -sS -X POST localhost:8000/remember -H 'content-type: application/json' \
  -d @tests/fixtures/corroborated.json | jq -r .receipt_id)

curl -sS "localhost:8000/receipts/$RCPT" | jq '{receipt_id, verdict, margin, epsilon,
  engine, cypher: [.cypher[] | {label, read_command, query}],
  components: .candidates[0].components, witness: .candidates[0].independence_witness}'
#   expect: engine.read_path == "GRAPH.RO_QUERY"
#   expect: every cypher[].query contains weightProp (never weightProperty) where it is
#           the SPpaths statement, and relationshipTypes with exactly one type where it
#           is the maxFlow statement
#   expect: components carries independence (int), reliability, recency, path_weight,
#           age_hours as five separate fields

curl -sS -X POST "localhost:8000/receipts/$RCPT/replay" | jq '{matches_original, divergence}'
#   expect: matches_original true; divergence either [] or only reason "RECENCY_DECAY"
```

**B4 decision tree:**

```
replay reports matches_original: false
├─ divergence reason RECENCY_DECAY only → this is a BUG in the comparator, not in the
│   replay. Time moving is expected and benign; CONTRACT §2.6 says recency drift is
│   ignored by matches_original. Fix the comparator.
├─ reason GRAPH_MUTATED → a claim was admitted into the slot between decision and
│   replay. Correct behaviour. Verify it by replaying an untouched slot's receipt.
└─ reason ENGINE_DIFF → the same statement on the same graph gave a different answer.
   Treat as serious: re-check that the recorded query is the verbatim text and that the
   params were stored separately rather than interpolated.

a recorded statement fails to execute on replay
└─ 409 REPLAY_MISMATCH (not 500, not a false "matches"). This is the only case that code
   covers.

the receipt is missing the witness set
└─ algo.maxFlow's `nodes` yield IS the witness. If it was discarded at B2, it has to be
   re-run at B4 — which is why §11.3 says record each statement as it executes.

B4 is running out of envelope
└─ see §11.7. GET /receipts/{id} outranks POST /replay: a receipt a judge can READ is the
   artifact; replay is the proof that it is live. Ship the reader first.
```

**Prepared commit message:**
`feat(engine): DOCKET receipts — verbatim parameterised Cypher, witness set, replay-by-id (C-4)`

### 11.7 If a slice overruns — the fixed cut order

Cuts happen in **this order**, never ad hoc, and every cut is written into PULSE with its
reason (`ORCHESTRATION-PROTOCOL.md` §5, §6):

1. **B5 counterfactual** — already a stretch, already isolated. Delete one file and one
   route. Zero spine impact.
2. **`POST /receipts/{id}/replay`** — keep `GET /receipts/{id}`. A readable receipt is the
   credibility artifact; replay is the bonus that proves it is live.
3. **`GET /slots/{key}/graph`** — painful, because it is the console's provenance
   visualisation and UX is 16.7% of the grade. **Coordinate with the `design_forge` chat
   through the master chat before cutting it**, never unilaterally.
4. **Corpus size** — shrink toward the three set-pieces plus the two control fixtures. The
   set-pieces and controls are **never** cut: they are `C-1` and `C-2`'s entire evidence.

**Never cut, at any time, for any reason:** the node-split (R-1), the boot assertions and the
fail-closed `/health` (AF-16), `recorded: true` on every response (R-2, `C-3`), the
`GRAPH.RO_QUERY` read path (AF-8, `C-6`), the three components surfaced separately with
`score_is_ordinal: true` (R-4, DS-8). Each of those is a published claim; cutting one makes
an artifact dishonest, and the artifacts **are** the product (AF-10).

### 11.8 Process hygiene

The `uvicorn` dev server is **long-running by design** while B3/B4 run. Track its PID, and
kill it the moment the drills are consumed — not at end of turn. Any scratch graph created for
an adversarial probe (§6.5) is deleted in the same step that reads its result. **`gh-falkor`
is not yours to stop:** it is the live build DB for this chat and the `design_forge` chat, it
is pinned `falkordb/falkordb:v4.22.1`, and it is stopped at session end only, by the master
chat. A `docker rm` destroys the data outright — the image declares no volume.

---

## Skill-Ownership Map

Routing pass (SO-1 / SO-2) over everything this plan demands. Owners are **registry skill
names**, not phase labels — `owner:` is the machine-read token
(`utils/forge-routing-enforce.sh`); the phase column is for humans. The three **judged
surfaces** (`live_deploy`, `demo_video`, `submission_bundle`) are load-bearing and
**NON-WAIVABLE**: forge routes them, forge does not build them, and `build` must not
improvise them.

| Deliverable | Routing token | Phase | Chat |
|-------------|---------------|-------|------|
| Engine (C1–C7) | `owner: hackathon-build` | build | engine/master build chat |
| Console / UX | `owner: design-forge` **IN FULL** (R5) | design_forge | its own chat, concurrent, consumes `CONTRACT.md` |
| Adversarial read of this plan + the contract | `owner: hackathon-critique` | critique | fresh subagent, ~15m, findings → PULSE Downstream Items |
| Join + real-Chrome proof + stretch go/no-go | `owner: hackathon-verify` | verify_milestone | 16:25 |
| **Reachable live URL / live_deploy (DS-12)** | `owner: deploy-to-github` **IN FULL** (+ livetest folded) | deploy | its own chat |
| **Repo/portfolio README surface (portfolio_readme)** | `owner: deploy-to-github` | deploy | its own chat |
| **Submission bundle (submission_bundle) — the judge-facing package: Cypher artifact, AI-assistance disclosure, track declaration, epsilon/ordinal wording (DS-3..DS-8)** | `owner: hackathon-package` **IN FULL** | package | its own chat |
| **≤180s video / demo_video** | `owner: hackathon-demo` **IN FULL** | demo | its own chat |
| Final form entry in the login-gated SPA (real Chrome, singleton browser) | `owner: hackathon-verify` | verify_preflight | master chat |

The last row is deliberately **not** the submission bundle — the bundle (README + Cypher
artifact + video + disclosure) is routed to `hackathon-package` on its own row above. This row
is only the act of **entering an already-built bundle into the form**. Conflating the two was
the original defect that `forge-routing-enforce.sh loadbearing` caught, and it is recorded in
`PULSE.md` forge `[FIX]`.

---

## 12. claim state and tag census

Per `docs/ORCHESTRATION-PROTOCOL.md` §6 — **no fabrication.**

**This plan makes no new `[VERIFIED]` claims.** No code in it has been written or run. Every
measured number it carries is **inherited and attributed**:

| Number | Source | State |
|---|---|---|
| `pathWeight 0.21072` on the control fixture | AF-3 / DS-2 / FC-5 | `[VERIFIED]` |
| `maxFlow` echo→`1`, independent→`2` after node-split | AF-6 / VF-W2 / FC-4 | `[VERIFIED]` |
| `maxFlow = 2` on the un-split discriminating fixture (the bug) | FC-4 | `[VERIFIED]` |
| `41ms` cold / `11ms` warm, 1402 nodes / 2400 edges | AF-7 / VF-W3 / FC-7 | `[VERIFIED]` |
| `GRAPH.RO_QUERY` rejects `CREATE`, allows `MATCH` | AF-8 / VF-W4 / FC-6 | `[VERIFIED]` |
| The v4.22.1 `algo.*` set; `algo.dijkstra` / `algo.SCC` absent | AF-1 / VF-W5 / FC-1 | `[VERIFIED]` |
| `algo.maxFlow` / `algo.SPpaths` / `algo.pageRank` signatures | AF-4 / AF-5 / FC-2 | `[VERIFIED]` |
| Engine pin `v4.22.1`, `graph ver 42201` | AF-9 / VF-I1 | `[VERIFIED]` |
| `epsilon = 0.05` | proposed default, unmeasured (VF-F4, DS-14) | `[ASSUMED]` → calibrated in B2, published by `/health` |
| `lambda = 0.01/hour` | proposed default, unmeasured (VF-F4, DS-14) | `[ASSUMED]` → calibrated in B2, published by `/health` |
| The two-hop trust-0.9 reconstruction of the `T-3` fixture | arithmetic on AF-3; fixture shape not recorded in FC-5 | `[ASSUMED]` |
| All of §5.4's worked set-piece arithmetic | computed from §5.3 on hand-chosen trust values | `[ASSUMED]` |
| Corpus counts (~40 / ~150 / ~60 / ~20) | B1 targets from `WINNER-BRIEF.md`; build-determined, published by `/health` | `[UNVERIFIED]` |
| `GRAPH.COPY` latency | never probed (VF-W6, DS-10) | **`NOT_CLAIMED`** |
| Any MENGER endpoint behaviour, verdict, latency, or score | nothing built, nothing probed (VF-F3) | **`NOT_CLAIMED`** |
| Every §6 test **result** | the tests are specified, not run | **`NOT_CLAIMED`** |
| Whether any enforcement gate passes on this document | this chat is not the grader | **`NOT_CLAIMED`** |

### For a human to chase

1. **`lambda`'s published value.** `CONTRACT.md` §2.8 shows `0.0077`; this plan and
   `WINNER-BRIEF.md` carry `0.01/hour`. Both sit inside contract **example** blocks, which
   `CONTRACT.md` §5 labels illustrative, so **no v1.1 amendment is needed** — but
   `hackathon-package` must read the live `/health` value and must not quote either document
   (DS-8).
2. **`CONTRACT.md` §2.1's `margin: -0.3104`** is not the difference of its own two example
   scores (`0.5220 - 1.5002 = -0.9782`, which is the value §2.3 uses as `top_margin`). Again
   an illustrative-number inconsistency, not a shape defect. Flagged so nobody copies it.
3. **The `T-3` control fixture's exact shape is not recorded.** `FC-5` states only the
   resulting `0.21072`. §5.4's two-hop trust-0.9 reconstruction is `[ASSUMED]`. If B1's
   fixture does not reproduce `0.21072`, trust the probe and re-derive the fixture — never
   adjust the expected value.
4. **`GRAPH.COPY` latency is still `NOT_CLAIMED`** (DS-10). It must have a number before the
   16:25 stretch decision, not after.
5. **Submission-form fields are still UNEXTRACTED** (login-gated SPA). Real Chrome, master
   chat, singleton browser. Carried unchanged from `intel`.
6. **`.law12-feasibility.json` `reviewer_model` is deliberately empty.** No model attribution
   exists upstream; filling it would be fabrication. Routed to `hackathon-critique`, which can
   attest its own model identity.
7. **Upstream red carried, not inherited silently:** `config.json` asserts
   `roster_audit.discovered = true` but `research/roster-audit/strategy-density.md` does not
   exist. `intel`'s defect, recorded here so it is not laundered.

### Standing prohibitions this chat honoured

Nothing committed, staged, merged, or pushed — `fix/p0-2b` is unmerged and the push is HELD
(R3). `CONTRACT.md` untouched (FROZEN v1.0, consumed live by two other chats). `gh-falkor`
untouched — not stopped, not restarted, not removed. Nothing ported from LEASH or 0g-fleet;
the repo was `git init`'d today. Files only.
