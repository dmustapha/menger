# CYPHER QUERIES AND GRAPH ALGORITHMS: MENGER

**Date:** 2026-10-18 | **Status:** Current | **Engine:** `falkordb/falkordb:v4.22.1`, graph module `ver 42201`

This is the explicit inventory of every Cypher statement and every graph algorithm MENGER
depends on. Each statement below is quoted verbatim from `app/cypher.py`, which is the single
file that holds them all. The only transcription applied is that Python's adjacent-string
concatenation is joined at its line breaks, so a fragment boundary that is a trailing space in
the source reads as a newline here. Token for token, nothing in this document is a paraphrase
of Cypher.

**Why one file (invariant SCH-1).** `:FLOW` is the only relationship type that ever appears in
a `relationshipTypes` or `relTypes` list. `algo.maxFlow` takes exactly one type and errors with
`MaxFlow configuration, 'relationshipTypes' should contain a single string` on more
([VERIFIED section 3-P24]). With every statement in one module, that invariant is one grep
rather than an audit.

**Statement text is never built by concatenation and never has params interpolated into it.**
Every value arrives through `$params` ([VERIFIED section 3-P39]). The text recorded in a DOCKET
receipt is the text in `app/cypher.py`, unchanged, which is what makes a receipt replayable:
a reader re-runs the recorded statement with the recorded params and gets the recorded number.

**The load-bearing sentence.** MENGER is admission control over declared provenance.
Removing the graph algorithms does not degrade the product, it removes the output entirely:
there is no fallback path that produces an independence count or a reliability weight without
`algo.maxFlow` and `algo.SPpaths`.

A note on vocabulary: FalkorDB has no stored procedures. Each item below is a single
parameterised Cypher query.

---

## 1. The two load-bearing graph algorithms

### 1.1 `algo.maxFlow`: source INDEPENDENCE over a node-split provenance DAG

Registry key `independence.maxFlow`. This is the one occurrence of `relationshipTypes` in
MENGER (invariant SCH-1).

```cypher
MATCH (s:SuperSource {nid:$src}), (c:Claim {nid:$claim})
CALL algo.maxFlow({relationshipTypes:['FLOW'], sourceNodes:[s], targetNodes:[c],
capacityProperty:'cap'}) YIELD maxFlow, edges
RETURN maxFlow AS max_flow_raw,
[e IN edges | [startNode(e).nid, endNode(e).nid, e.kind]] AS flow_edges
```

**What it computes.** The number of independent origin-to-claim provenance chains, plus the
saturated relationship set that witnesses them. Every `:FLOW` edge carries unit capacity
(CLM-7: `MATCH ()-[f:FLOW]->() WHERE f.cap <> 1.0 RETURN count(f)` returns `0`), so the flow
value is a path count rather than a volume.

**Why it is the right algorithm.** maxFlow over unit-capacity **edges** counts
**edge**-disjoint paths. The claim MENGER makes needs **vertex**-disjoint paths, because
otherwise several citations that merely share an origin still look independent. The node split
is what converts one into the other: every source becomes a `SourceIn` / `SourceOut` pair
joined by a capacity-1.0 `:FLOW` edge, so routing through a source consumes that source's one
unit of capacity and no second chain can reuse it. Menger's theorem is the reason this is
exact: the maximum number of vertex-disjoint s-t paths equals the minimum vertex cut, and with
the split in place the minimum edge cut of the transformed graph *is* that vertex cut.

**The evidence pair, and why one number alone proves nothing.**

| Control claim | Shape | `maxFlow` |
|---------------|-------|-----------|
| `clm_0001` | echo chamber: several citations funnelling through one shared origin | `1` (CLM-1) |
| `clm_0002` | two genuinely vertex-disjoint origins | `2` (CLM-2) |

The echo chamber scores `1`, **not** the citation count. A `1` on its own could be a graph
that is simply thin; a `2` on its own could be an algorithm counting citations. It is the
1-versus-2 pair that shows the split is doing the work. Both are asserted live on every
`/health` as boot checks T-1 (`node_split_echo`) and T-2 (`node_split_independent`).

**FalkorDB-specific gotchas, all probe-pinned.**

1. `relationshipTypes:['FLOW']` must hold exactly one type. A second entry errors
   ([VERIFIED section 3-P24]). This is why Decision D-3 puts the semantic kind in a property
   (`r.kind` in `ORIGIN, SPLIT, CITED, DERIVED`, CLM-14) instead of in the relationship type,
   and why `DERIVED_FROM` does not exist in the schema.
2. `sourceNodes` / `targetNodes` bind to **MATCHed nodes, not id strings**. Passing strings
   errors with `'sourceNodes' must be an array of nodes` ([VERIFIED section 3-P25]).
3. The witness set comes back as a **list comprehension** over the `edges` yield, not via
   `UNWIND`. `edges` is exactly the saturated relationship set ([VERIFIED section 3-P22]), and
   the comprehension returns one row even when the flow is `0` and the list is empty
   ([VERIFIED section 3-P41 / P42]). `UNWIND` would return no row at all, which is
   indistinguishable from an engine failure.
4. `maxFlow` is a **float** (`toString` gives `"1.000000"`, [VERIFIED section 3-P41]), while
   `components.independence` is contractually an integer. The cast happens in
   `app/arbiter.py`, deliberately in Python where the contract type is enforced.

### 1.2 `algo.SPpaths`: source RELIABILITY as a weighted shortest path over `nl = -ln(trust)`

Registry key `reliability.SPpaths`.

```cypher
MATCH (s:SuperSource {nid:$src}), (c:Claim {nid:$claim})
CALL algo.SPpaths({sourceNode:s, targetNode:c, relTypes:['FLOW'], weightProp:'nl'})
YIELD path, pathWeight, pathCost
RETURN pathWeight AS path_weight, pathCost AS path_cost,
[n IN nodes(path) | n.nid] AS path_nodes,
[r IN relationships(path) | [startNode(r).nid, endNode(r).nid, r.nl, r.kind]]
AS path_edges
```

**What it computes.** The minimum total `nl` along a chain from the super-source to the claim,
plus the chain itself. `app/arbiter.py` turns it into `reliability = exp(-path_weight)`.

**Why it is the right algorithm.** Trust along a chain is **multiplicative**, and shortest-path
algorithms minimise an **additive** sum. Negative-log converts one into the other:
with `nl = -ln(trust)`, `exp(-sum(nl)) = product(trust)`, so minimising the sum of `nl`
maximises the product of trust. Only `-ln` has that property; a weight like `1 - trust` would
make a shortest path mean nothing in particular. `path_weight` is surfaced raw beside
`reliability` in every scored object, so the derivation is auditable from a response body with
no access to the source.

**THE SILENT TRAP (AF-3 / DS-2).** The weight key is `weightProp`. It is the only key that
works.

| Config passed to `algo.SPpaths` | `pathWeight` returned | Probe |
|---------------------------------|-----------------------|-------|
| `weightProp:'nl'` | `0.21072` (the weighted sum) | [VERIFIED P7] |
| `weightProperty:'nl'` | `2` (the HOP COUNT) | [VERIFIED P8] |
| `costProperty:'nl'` | `2` (the HOP COUNT) | [VERIFIED P9] |
| `weightProp:'nl', anyBogusKey:1` | `0.21072` (bogus key ignored) | [VERIFIED P37] |

**No error is raised for a wrong key.** `algo.SPpaths` silently ignores every unknown config
key ([VERIFIED section 3-P37]), while `algo.maxFlow` is loud about them
([VERIFIED section 3-P34]). That asymmetry is the root cause: a typo here returns a plausible
wrong number forever, and the wrong number is a hop count wearing a weight's name. A second
form of the same trap is a weight-less edge: the *correct* key over edges with no `nl` also
returns a hop count with no error, which is why CLM-15 asserts
`MATCH ()-[f:FLOW]->() WHERE f.nl IS NULL RETURN count(f)` is `0`.

**Two live defences, both in `app/bootcheck.py`.**

1. **T-3 `sp_path_weight`.** `GET /health` asserts `pathWeight == 0.21072` on a seeded control
   claim (`clm_0001`, tolerance `5e-6`) and returns `503 BOOT_ASSERTION_FAILED` on mismatch.
   The expected value is deliberately non-integer so a hop count cannot pass it.
2. **T-3b `sp_weight_is_not_hop_count`.** The same statement also yields `pathCost`, which
   **is** the hop count ([VERIFIED section 3-P35]). T-3b asserts `pathWeight != pathCost`,
   catching the typo **without** depending on one memorised constant. A wrong weight key makes
   `pathWeight` equal the hop count for *any* corpus, so T-3b survives a re-seed that would
   legitimately change T-3's constant. The two checks fail for different reasons, which is the
   only reason to have both.

Both come back in one row from one statement, so T-3 and T-3b cost one read between them.

**Further FalkorDB behaviour relied on.** When there is no chain from the super-source to the
claim, `algo.SPpaths` returns **zero rows**: not an error, not a null
([VERIFIED section 3-P29]). `Components.path_weight` is therefore nullable, so "unmeasurable"
stays representable instead of being papered over with `0.0`, which would read as a perfect
weightless chain and invert the meaning. Such a claim scores exactly `0.0` and lands
`UNDECIDED` rather than `ALLOW`.

### 1.3 How the two combine into a verdict

`app/arbiter.py` is the only place the components are multiplied:

```
score = independence * reliability * recency
       = maxFlow      * exp(-path_weight) * exp(-lambda * age_hours)

margin = incoming.score - incumbent.score      (incumbent.score = 0.0 if none)
margin >  +epsilon  ->  ALLOW
margin <  -epsilon  ->  BLOCK
|margin| <= epsilon ->  UNDECIDED
```

`score` is ordinal, not cardinal: it ranks candidates within one slot and means nothing on its
own, and every scored object MENGER emits carries `score_is_ordinal: true`. A losing write into
an occupied slot is **refused** and the incumbent is unchanged afterwards, with the refusal
itself recorded and carrying a receipt (CLM-16). `epsilon` and `lambda` are server constants
read from config at call time and published by `GET /health`; they are unmeasured defaults and
are not claimed as calibrated.

---

## 2. Engine capability boundary

`algo.dijkstra` and `algo.SCC` **do not exist** on this engine. The mechanism uses what is
actually there. The eleven `algo.*` procedures that exist (CLM-9, from
`CALL dbms.procedures() YIELD name RETURN name` filtered on `algo.`):

| # | Procedure | | # | Procedure |
|---|-----------|---|---|-----------|
| 1 | `algo.AStar` | | 7 | `algo.betweenness` |
| 2 | `algo.BFS` | | 8 | `algo.labelPropagation` |
| 3 | `algo.HarmonicCentrality` | | 9 | `algo.maxFlow` |
| 4 | `algo.MSF` | | 10 | `algo.pageRank` |
| 5 | `algo.SPpaths` | | 11 | `algo.WCC` |
| 6 | `algo.SSpaths` | | | |

Neither `algo.dijkstra` nor `algo.SCC` is among them. Recompute:

```bash
docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger \
  "CALL dbms.procedures() YIELD name RETURN name"
```

The engine is pinned: `docker ps` shows `falkordb/falkordb:v4.22.1`, and
`docker exec gh-falkor redis-cli MODULE LIST` shows `graph`, `ver 42201` (CLM-8). Every probe
result quoted in this document was taken against that build, and a different build invalidates
them rather than merely dating them.

---

## 3. Read-path isolation

Every read goes through `GRAPH.RO_QUERY` (AF-8). The engine itself refuses a write on that
path: a server-side refusal, not a client-side convention (CLM-5).

The boot write-attempt probe, held **outside** both registries on purpose, because it is not a
read MENGER performs for data and it must never be reachable from `WRITES`:

```cypher
CREATE (:BootProbe {ts:$ts})
```

`app/bootcheck.py` pushes that statement through `ReadChannel` and asserts the engine refuses
it. The exact refusal string:

```
graph.RO_QUERY is to be executed only on read-only queries
```

Recompute:

```bash
docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "CREATE (:BootProbe {x:1})"
```

**T-4 `ro_query_refuses_write` is two steps, and the order matters.** `ReadChannel` converts
both an engine refusal and a dead socket into the same error, so "the write attempt raised"
alone cannot distinguish "RO_QUERY contained it" from "the container is down". T-4 therefore
runs a control read (`RETURN 1 AS ok`) first and requires it to **succeed**; only then must the
`CREATE` fail. A dead connection fails the control and is reported as such. If the `CREATE` is
**accepted**, the check reports
that the CREATE was `ACCEPTED` and that `the read path is not read-only; AF-8 containment is
NOT in effect`, which is the
most serious failure in the boot set: every other check is about a number, this one is about
whether generated Cypher is contained.

---

## 4. The write registry (seven entries)

`WRITES` is the write registry (Decision D-4). `WriteChannel.run()` accepts these **keys** and
nothing else, so adding an eighth entry is a visible, reviewable act rather than an inline
string somewhere in a handler. Nothing in the codebase passes write text to the engine, the
seed included.

**`counter.next`**: monotonic id allocation; read and increment are one engine operation.

```cypher
MERGE (ct:Counter {name:$name})
ON CREATE SET ct.value = 1
ON MATCH SET ct.value = ct.value + 1
RETURN ct.value AS value
```

**`claim.create`**: the incoming claim, its slot, its agent edge, its citations and its
`CITED` flow edges in one statement. The claim must exist before it can be scored, because it
is the `maxFlow` target.

```cypher
MATCH (a:Agent {id:$agent_id})
MERGE (sl:Slot {key:$slot_key})
ON CREATE SET sl.subject = $subject, sl.predicate = $predicate
CREATE (c:Claim {nid:$claim_id, id:$claim_id, subject:$subject,
predicate:$predicate, object:$object, slot_key:$slot_key,
asserted_at:$asserted_at, status:$status})
CREATE (c)-[:FILLS]->(sl)
CREATE (a)-[:ASSERTED {at:$asserted_at}]->(c)
WITH c
UNWIND $sources AS sid
MATCH (si:SourceIn {sid:sid}), (so:SourceOut {sid:sid})
CREATE (so)-[:FLOW {cap:1.0, nl:0.0, kind:'CITED'}]->(c)
CREATE (c)-[:CITES]->(si)
RETURN c.id AS claim_id
```

Note the direction discipline that keeps the split intact: the citation edge enters
`SourceIn`, the flow edge leaves `SourceOut`. CLM-6 asserts no edge bypasses the split:
`MATCH (:SuperSource)-[:FLOW]->(:SourceOut) RETURN count(*)` is `0` and
`MATCH (:Claim)-[:CITES]->(:SourceOut) RETURN count(*)` is `0`, with
`count(:SourceIn) = count(:SourceOut) = 150` = the source count.

**`claim.set_status`**: moves one claim's status (for example to `REFUSED`).

```cypher
MATCH (c:Claim {id:$claim_id}) SET c.status = $status RETURN c.id AS claim_id
```

**`review.create`**: opens a review item for an `UNDECIDED` outcome and links it to the claim.

```cypher
MATCH (c:Claim {id:$claim_id})
CREATE (rv:Review {id:$review_id, slot_key:$slot_key, claim_id:$claim_id,
incumbent_claim_id:$incumbent_claim_id, margin:$margin, epsilon:$epsilon,
reason:$reason, receipt_id:$receipt_id, created_at:$created_at, state:'OPEN'})
CREATE (rv)-[:ABOUT]->(c)
RETURN rv.id AS review_id
```

**`receipt.create`**: writes the DOCKET receipt, including `cypher_json` (the statements and
params actually executed) and `engine_json`, and attaches it to the claim.

```cypher
MATCH (c:Claim {id:$claim_id})
CREATE (r:Receipt {id:$receipt_id, claim_id:$claim_id, slot_key:$slot_key,
verdict:$verdict, margin:$margin, epsilon:$epsilon,
lambda_per_hour:$lambda_per_hour, winner_claim_id:$winner_claim_id,
candidates_json:$candidates_json, cypher_json:$cypher_json,
engine_json:$engine_json, created_at:$created_at})
CREATE (c)-[:HAS_RECEIPT]->(r)
RETURN r.id AS receipt_id
```

**`slot.ensure`**: used by the seed only, kept in the registry so that no code path anywhere
hands write text to the engine.

```cypher
MERGE (sl:Slot {key:$slot_key})
ON CREATE SET sl.subject = $subject, sl.predicate = $predicate
RETURN sl.key AS slot_key
```

**`counter.set`**: sets a counter to a known value (seed and reset).

```cypher
MERGE (ct:Counter {name:$name}) SET ct.value = $value RETURN ct.value AS value
```

**Recorded limitation (LIM-4).** `counter.next` is `[ASSUMED]` atomic under concurrency:
FalkorDB executes a query against a graph key as a unit, but no probe tested two concurrent
allocations. At single-submitter concurrency it is not reachable; under real load the risk is a
duplicate id, which `MERGE` on `:Claim` would then collapse.

---

## 5. The read statements

All of the following execute through `GRAPH.RO_QUERY`.

### 5.1 Validation (one round trip each)

**`agent.by_id`**: resolves the asserting agent; a miss is `422 UNKNOWN_AGENT`.

```cypher
MATCH (a:Agent {id:$agent_id}) RETURN a.id AS agent_id, a.name AS agent_name
```

**`sources.found`**: resolves every cited source in one round trip regardless of how many
were submitted. `UNWIND` + `MATCH` drops the misses and `collect()` aggregates the hits into
one row ([VERIFIED section 3-P47c]); the offenders are the set difference, computed in Python,
and become `422 UNKNOWN_SOURCE`.

```cypher
UNWIND $sources AS sid MATCH (s:Source {id:sid}) RETURN collect(s.id) AS found
```

### 5.2 Slots and claims

**`slot.by_key`**: one slot's identity.

```cypher
MATCH (sl:Slot {key:$slot_key})
RETURN sl.key AS slot_key, sl.subject AS subject, sl.predicate AS predicate
```

**`slot.claims`**: every candidate in a slot with its asserting agent, in deterministic order.
This is the row shape the arbiter scores.

```cypher
MATCH (c:Claim {slot_key:$slot_key})
OPTIONAL MATCH (a:Agent)-[:ASSERTED]->(c)
RETURN c.id AS claim_id, c.object AS object, c.asserted_at AS asserted_at,
c.status AS status, a.id AS agent_id, a.name AS agent_name
ORDER BY c.asserted_at, c.id
```

**`claim.sources`**: the sources a claim cites, traversed through the split.

```cypher
MATCH (c:Claim {id:$claim_id})-[:CITES]->(si:SourceIn)-[:SPLIT_OF]->(s:Source)
RETURN s.id AS source_id, s.kind AS kind, s.trust AS trust,
s.is_origin AS is_origin ORDER BY s.id
```

**`slots.all`**: the slot index with claim counts and open-review counts.

```cypher
MATCH (sl:Slot)
OPTIONAL MATCH (c:Claim {slot_key: sl.key})
WITH sl, count(c) AS claim_count
OPTIONAL MATCH (rv:Review {slot_key: sl.key, state:'OPEN'})
RETURN sl.key AS slot_key, sl.subject AS subject, sl.predicate AS predicate,
claim_count AS claim_count, count(rv) AS open_review_count
ORDER BY sl.key
```

### 5.3 The provenance subgraph for `GET /slots/{key}/graph`

Two statements, nodes and relationships, over a variable-length `:FLOW` walk from the
super-source to each claim in the slot. The split pairs are returned **as themselves**: the
split is visible on purpose. Pattern, `DISTINCT`-over-nodes and `DISTINCT`-over-relationships
are all [VERIFIED P44 / P45].

These are the only two statements whose text contains a `%d`, bound once at import from
`config.MAX_PATH_HOPS` (currently `12`). It is a module constant, never a request value: no
request input reaches statement text.

**`graph.slot_nodes`** (source form, with `% config.MAX_PATH_HOPS` applied at import):

```cypher
MATCH (c:Claim {slot_key:$slot_key})
MATCH path = (ss:SuperSource)-[:FLOW*1..%d]->(c)
UNWIND nodes(path) AS n WITH DISTINCT n
OPTIONAL MATCH (n)-[:SPLIT_OF]->(src:Source)
RETURN n.nid AS nid, labels(n)[0] AS label,
coalesce(src.label, n.object, 'super-source') AS caption,
src.trust AS trust, src.id AS source_id,
CASE WHEN labels(n)[0] = 'Claim' THEN n.id ELSE null END AS claim_id
ORDER BY nid
```

**`graph.slot_edges`** (same `%d` binding):

```cypher
MATCH (c:Claim {slot_key:$slot_key})
MATCH path = (ss:SuperSource)-[:FLOW*1..%d]->(c)
UNWIND relationships(path) AS r WITH DISTINCT r
RETURN startNode(r).nid AS src, endNode(r).nid AS dst, r.cap AS cap, r.nl AS nl,
r.kind AS kind ORDER BY src, dst
```

### 5.4 Audit reads

**`receipt.by_id`**: one DOCKET receipt in full, including the executed statements.

```cypher
MATCH (r:Receipt {id:$receipt_id})
RETURN r.id AS receipt_id, r.claim_id AS claim_id, r.slot_key AS slot_key,
r.verdict AS verdict, r.margin AS margin, r.epsilon AS epsilon,
r.lambda_per_hour AS lambda_per_hour, r.winner_claim_id AS winner_claim_id,
r.candidates_json AS candidates_json, r.cypher_json AS cypher_json,
r.engine_json AS engine_json, r.created_at AS created_at
```

**`receipts.all`**: the receipt ledger, oldest first.

```cypher
MATCH (r:Receipt)
RETURN r.slot_key AS slot_key, r.id AS receipt_id, r.verdict AS verdict,
r.created_at AS created_at ORDER BY r.created_at, r.id
```

**`reviews.all`**: the whole review queue in one round trip. Each item must carry the full
`components` block and `score` for both incoming and incumbent, plus each one's `object` and
`agent_id`. Those are not stored on the `:Review` node: they already exist verbatim in the
receipt's `candidates_json`, and storing them twice would create two records that can disagree.
So this joins `Review -> Receipt` for the candidate blocks and `Review -> Claim -> Agent` for
`object` / `agent_id`. Fetching each receipt in a loop would be an N+1 read on the one endpoint
a reviewer is most likely to page through. `OPTIONAL MATCH` throughout, because
`incumbent_claim_id` is the `""` sentinel when the slot was empty and `""` matches no claim.

```cypher
MATCH (rv:Review) WHERE $state = 'ALL' OR rv.state = $state
OPTIONAL MATCH (rc:Receipt {id: rv.receipt_id})
OPTIONAL MATCH (ci:Claim {id: rv.claim_id})
OPTIONAL MATCH (ai:Agent)-[:ASSERTED]->(ci)
OPTIONAL MATCH (cu:Claim {id: rv.incumbent_claim_id})
OPTIONAL MATCH (au:Agent)-[:ASSERTED]->(cu)
RETURN rv.id AS review_id, rv.state AS state, rv.created_at AS created_at,
rv.slot_key AS slot_key, rv.margin AS margin, rv.epsilon AS epsilon,
rv.reason AS reason, rv.receipt_id AS receipt_id, rv.claim_id AS claim_id,
rv.incumbent_claim_id AS incumbent_claim_id,
rc.candidates_json AS candidates_json,
ci.object AS incoming_object, ai.id AS incoming_agent_id,
cu.object AS incumbent_object, au.id AS incumbent_agent_id
ORDER BY rv.created_at DESC, rv.id DESC
```

**`reviews.open_by_slot`**: open review items for one slot.

```cypher
MATCH (rv:Review {slot_key:$slot_key, state:'OPEN'})
RETURN rv.id AS review_id, rv.claim_id AS claim_id, rv.margin AS margin
ORDER BY rv.created_at
```

### 5.5 `/health`

**`corpus.counts`**: one statement for every corpus count ([VERIFIED section 3-P47b]). The
published figures are counted from the graph, never read from config, so a half-failed seed
shows real numbers instead of reassuring ones.

```cypher
MATCH (n) RETURN labels(n)[0] AS label, count(n) AS n
```

**`corpus.seeded_at`**: the instant the corpus was actually written, read off the super-source.
A config constant would keep reporting a seed time after a failed re-seed.

```cypher
MATCH (ss:SuperSource {nid:$src}) RETURN ss.created_at AS seeded_at
```

**`boot.cap_on_non_flow`**: boot check B-5, invariant SCH-2: no non-`:FLOW` relationship
carries `cap`, so nothing outside `:FLOW` can ever enter a flow computation. `type(r)` and
`IS NOT NULL` both [VERIFIED section 3-P47a].

```cypher
MATCH ()-[r]->() WHERE type(r) <> 'FLOW' AND r.cap IS NOT NULL
RETURN count(r) AS offenders
```

The two algorithm statements in section 1 are also executed live on every `/health` (boot
checks T-1, T-2, T-3, T-3b), against the control claims `clm_0001` and `clm_0002`. The checks
are not cached while they are failing, so re-seeding a broken corpus brings the service back
without a restart.

---

## 6. Recompute table

Each claim ID with the exact command that re-derives it, from `CLAIMS.md`. All `docker exec`
commands assume the pinned container named `gh-falkor` and the graph key `menger`.

| ID | What it establishes | Recompute |
|----|--------------------|-----------|
| CLM-1 | Echo chamber scores independence `1`, not the citation count | `docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "MATCH (s:SuperSource {nid:'ss'}), (c:Claim {nid:'clm_0001'}) CALL algo.maxFlow({relationshipTypes:['FLOW'], sourceNodes:[s], targetNodes:[c], capacityProperty:'cap'}) YIELD maxFlow RETURN maxFlow"` → `1` |
| CLM-2 | Two vertex-disjoint origins score `2` | same statement with `nid:'clm_0002'` → `2` |
| CLM-3 | Reliability is a weighted path, not a hop count | `docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "MATCH (s:SuperSource {nid:'ss'}), (c:Claim {nid:'clm_0001'}) CALL algo.SPpaths({sourceNode:s, targetNode:c, relTypes:['FLOW'], weightProp:'nl'}) YIELD pathWeight, pathCost RETURN pathWeight, pathCost"` → `0.210722`, `5` |
| CLM-4 | `algo.SPpaths` silently returns the hop count on a misspelled weight key | the CLM-3 statement with `weightProperty:'nl'` instead of `weightProp:'nl'` → `pathWeight 5`, identical to `pathCost`, no error |
| CLM-5 | The read path is a server-side read-only refusal | `docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "CREATE (:BootProbe {x:1})"` → `graph.RO_QUERY is to be executed only on read-only queries` |
| CLM-6 | The graph is node-split, with no edge bypassing the split | `count(:SourceIn)` = `count(:SourceOut)` = `150` = the source count; `MATCH (:SuperSource)-[:FLOW]->(:SourceOut) RETURN count(*)` → `0`; `MATCH (:Claim)-[:CITES]->(:SourceOut) RETURN count(*)` → `0` |
| CLM-7 | Unit capacity is what makes `maxFlow` a path count | `MATCH ()-[f:FLOW]->() WHERE f.cap <> 1.0 RETURN count(f)` → `0` |
| CLM-8 | The engine is the pinned image | `docker exec gh-falkor redis-cli MODULE LIST` → `graph`, `ver 42201`; `docker ps` → `falkordb/falkordb:v4.22.1` |
| CLM-9 | `algo.dijkstra` and `algo.SCC` do not exist on this engine | `GRAPH.RO_QUERY menger "CALL dbms.procedures() YIELD name RETURN name"` filtered on `algo.` → `AStar, BFS, HarmonicCentrality, MSF, SPpaths, SSpaths, WCC, betweenness, labelPropagation, maxFlow, pageRank` |
| CLM-10 | `GRAPH.COPY` of this corpus completes in tens of milliseconds (~20 ms to ~83 ms, load-sensitive, n=3) | `scripts/verify-claims.sh ds10` |
| CLM-11 | The scoring surface contains no cardinal-probability vocabulary | `grep -rniE 'confidence\|probability\|percent' app/*.py \| wc -l` → `0` |
| CLM-12 | The banned overreach vocabulary appears nowhere in the engine | `grep -rniE 'stored procedure\|detects conflict\|truth' app/*.py \| wc -l` → `0` |
| CLM-13 | Engine read latency 41 ms cold / 11 ms warm | **UNVERIFIABLE here.** Measured on a graph ~23x this corpus, which is not in this repo. Carried as a recorded measurement, not re-derived. |
| CLM-14 | Provenance is one relationship type, which is what makes the single `relationshipTypes` entry sufficient | `docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "MATCH ()-[r:DERIVED_FROM]->() RETURN count(r)"` → `0`; `MATCH ()-[f:FLOW]->() RETURN DISTINCT f.kind` → `ORIGIN, SPLIT, CITED, DERIVED` |
| CLM-15 | Every `:FLOW` edge carries `nl` (the second form of the `SPpaths` trap) | `docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "MATCH ()-[f:FLOW]->() WHERE f.nl IS NULL RETURN count(f)"` → `0` |
| CLM-16 | A losing write into an occupied slot is refused, and the incumbent is unchanged | `bash tests/drill.sh` step 9 → `verdict BLOCK`, `status REFUSED`, `recorded true`, `receipt_id` non-null, `clm_0007 = 'eu-west-1'` byte-identical across the write |

The boot assertions re-derive the two load-bearing algorithm claims on every request to
`/health`:

```bash
python -m app.bootcheck --json     # T-1, T-2, T-3, T-3b, T-4, B-5
python -m app.arbiter --selftest   # the three verdict paths over seeded fixtures
curl -sS http://127.0.0.1:8000/health | jq '.boot_checks'
```

---

## 7. What is not claimed

Stated explicitly so nobody downstream fills the silence with a number. No throughput, no
requests per second, no p99. No accuracy, precision, recall or F1: MENGER decides
admissibility, and there is no ground-truth labelling against which an accuracy number would
mean anything. No behaviour at scale: every figure here is from a 574-node synthetic corpus. No
comparison against any other system, because none was run. `epsilon` and `lambda` are server
constants with unmeasured defaults, to be read from `/health` and never from a document.
