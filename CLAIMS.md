# CLAIMS - MENGER

Every headline number this project states, with the command that re-derives it. If a number
is not in this table, MENGER does not claim it.

Four states are used, and they mean exactly this:
- **VERIFIED** - re-derived by the `Recompute` command against the live engine. Carries a command.
- **UNVERIFIABLE** - believed, but no command re-derives it here.
- **NOT_CLAIMED** - we do not assert this. Not a gap to be filled with a guess.
- **FAILED** - checked, and it did not hold.

Machine counterpart: `docs/pipeline/claims.json`. Regenerated evidence lands in `evidence/`.

---

## Verified

| ID | Claim | State | Recompute |
|----|-------|-------|-----------|
| CLM-1 | An **echo chamber** - several citations funnelling through one shared origin - scores source independence **`1`**, not the citation count. | **VERIFIED** | `docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "MATCH (s:SuperSource {nid:'ss'}), (c:Claim {nid:'clm_0001'}) CALL algo.maxFlow({relationshipTypes:['FLOW'], sourceNodes:[s], targetNodes:[c], capacityProperty:'cap'}) YIELD maxFlow RETURN maxFlow"` → `1` |
| CLM-2 | Two **vertex-disjoint** origins score source independence **`2`**. This and CLM-1 are the pair that make the number mean something. | **VERIFIED** | same statement with `nid:'clm_0002'` → `2` |
| CLM-3 | Source reliability is a **weighted** shortest path over `nl = -ln(trust)`, not a hop count: `pathWeight` **`0.21072`** on the seeded control. | **VERIFIED** | `docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "MATCH (s:SuperSource {nid:'ss'}), (c:Claim {nid:'clm_0001'}) CALL algo.SPpaths({sourceNode:s, targetNode:c, relTypes:['FLOW'], weightProp:'nl'}) YIELD pathWeight, pathCost RETURN pathWeight, pathCost"` → `0.210722`, `5` |
| CLM-4 | `algo.SPpaths` **silently** returns the hop count when the weight key is misspelled - **no error is raised**. This is why CLM-3's expected value is deliberately non-integer. | **VERIFIED** | the CLM-3 statement with `weightProperty:'nl'` instead of `weightProp:'nl'` → `pathWeight 5`, identical to `pathCost`, no error |
| CLM-5 | The read path is a **server-side** read-only refusal, not a client-side convention. | **VERIFIED** | `docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "CREATE (:BootProbe {x:1})"` → `graph.RO_QUERY is to be executed only on read-only queries` |
| CLM-6 | The provenance graph is **node-split**: every source is a `SourceIn`/`SourceOut` pair, with no edge bypassing the split. | **VERIFIED** | `count(:SourceIn)` = `count(:SourceOut)` = `150` = the source count; and `MATCH (:SuperSource)-[:FLOW]->(:SourceOut) RETURN count(*)` → `0`; and `MATCH (:Claim)-[:CITES]->(:SourceOut) RETURN count(*)` → `0` |
| CLM-7 | Every `:FLOW` edge carries **unit capacity**, which is what makes `maxFlow` a path count. | **VERIFIED** | `MATCH ()-[f:FLOW]->() WHERE f.cap <> 1.0 RETURN count(f)` → `0` |
| CLM-8 | The engine is the **pinned** image, and the graph module version confirms it. | **VERIFIED** | `docker exec gh-falkor redis-cli MODULE LIST` → `graph`, `ver 42201`; `docker ps` → `falkordb/falkordb:v4.22.1` |
| CLM-9 | `algo.dijkstra` and `algo.SCC` **do not exist** on this engine. The mechanism uses what is actually there. | **VERIFIED** | `GRAPH.RO_QUERY menger "CALL dbms.procedures() YIELD name RETURN name"` filtered on `algo.` → `AStar, BFS, HarmonicCentrality, MSF, SPpaths, SSpaths, WCC, betweenness, labelPropagation, maxFlow, pageRank` - eleven, neither of those two |
| CLM-10 | `GRAPH.COPY` of this corpus completes in **tens of milliseconds** - measured between **~20 ms and ~83 ms**, varying with host load. | **VERIFIED** *(bounded: n=3 per run, one graph size, `docker exec` overhead subtracted rather than isolated, and load-sensitive - see note below)* | `scripts/verify-claims.sh ds10` |
| CLM-11 | The scoring surface contains no cardinal-probability vocabulary. | **VERIFIED** | `grep -rniE 'confidence\|probability\|percent' app/*.py \| wc -l` → `0` |
| CLM-12 | The banned overreach vocabulary appears nowhere in the engine. | **VERIFIED** | `grep -rniE 'stored procedure\|detects conflict\|truth' app/*.py \| wc -l` → `0` |
| CLM-14 | Provenance is **one** relationship type. `DERIVED_FROM` does not exist; every provenance edge is `:FLOW` carrying a `kind`. This is what makes the single `relationshipTypes` entry `algo.maxFlow` accepts sufficient. | **VERIFIED** | `docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "MATCH ()-[r:DERIVED_FROM]->() RETURN count(r)"` → `0`; and `MATCH ()-[f:FLOW]->() RETURN DISTINCT f.kind` → `ORIGIN, SPLIT, CITED, DERIVED` |
| CLM-15 | **Every** `:FLOW` edge carries `nl`. A property-less edge is the second form of the `SPpaths` silent trap - the *correct* weight key over edges with no weight also returns a hop count, with no error. | **VERIFIED** | `docker exec gh-falkor redis-cli GRAPH.RO_QUERY menger "MATCH ()-[f:FLOW]->() WHERE f.nl IS NULL RETURN count(f)"` → `0` |
| CLM-16 | A losing write into an **occupied** slot is **refused**, and the incumbent is unchanged afterwards - same `claim_id`, same `object`, same `asserted_at`. The refusal is itself recorded and carries a receipt. | **VERIFIED** | `bash tests/drill.sh` step 9 → `verdict BLOCK`, `status REFUSED`, `recorded true`, `receipt_id` non-null, and `clm_0007 = 'eu-west-1'` byte-identical across the write |

---

### Note on CLM-10 - why it is a range and not a figure

The probe was run twice, and the two runs disagreed, so both are recorded rather than the
flattering one:

| Run | Host condition | `GRAPH.COPY` wall | `PING` baseline | Implied copy cost |
|-----|----------------|-------------------|-----------------|-------------------|
| 1 | host mostly idle | `81.8 / 70.5 / 73.9 ms` | `58.5 / 48.6 / 49.0 ms` | **~20–30 ms** |
| 2 | two build subagents running concurrently | `126.3 / 98.5 / 100.7 ms` | `42.9 / 42.2 / 43.6 ms` | **~55–83 ms** |

The honest reading is "tens of milliseconds on a 574-node graph, load-sensitive, n=3." Quoting
the 20 ms figure alone would be selecting the measurement that flatters. The purpose of this
number is narrow - it exists only so the counterfactual stretch is decided against something
real instead of a guess - and for that purpose the range is sufficient and the point estimate
would be false precision.

---

## Unverifiable here

| ID | Claim | Why no command re-derives it |
|----|-------|------------------------------|
| CLM-13 | Engine read latency **41 ms cold / 11 ms warm**. | Measured during an earlier probe session on a graph ~23× this corpus. Reproducing it needs that graph, which is not in this repo. Carried as a recorded measurement, not re-derived. |

---

## Not claimed

These are stated explicitly so that nobody downstream fills the silence with a number.

- **ε and λ are not claimed as calibrated-against-reality.** They are **server constants**,
  published by `GET /health`, and their values are **unmeasured defaults**. Read them from
  `/health` - never from a document. (A prior audit found λ carrying **three different values**
  across the project's own documents, which is exactly why the only valid source is the
  running server.)

  λ's *value* is now pinned by evidence even though its *calibration* is still not claimed.
  Critique RULING 1 resolved the three-way disagreement (0.0077 / 0.0080 / 0.01 per hour) by
  arithmetic rather than by vote: `CONTRACT.md` declares `lambda: 0.0077` while **publishing**
  `recency: 0.9261` at `age_hours: 9.6`, and `-ln(0.9261)/9.6 = 0.0079972`. A published output
  pins the constant that produced it; a declared input that disagrees with its own output is
  the thing in error. **λ = 0.0080/hour** (86.6 h half-life). The standing rule is *re-seed the
  trusts, never re-tune λ* - tuning a published constant to make a demo read better is the one
  thing this project must never do. Recompute:
  `curl -sS http://127.0.0.1:8000/health | jq -r '."lambda"'` → `0.008`.
- **No throughput, no requests-per-second, no p99.** Never measured.
- **No accuracy, precision, recall, or F1.** MENGER decides admissibility, not correctness;
  there is no ground-truth labelling against which an accuracy number would mean anything.
- **No behaviour at scale.** Every number here is from a 574-node synthetic corpus.
- **No comparison against any other system.** None was run.
- **No claim that the corpus is representative.** It is synthetic and hand-crafted to exercise
  three set-pieces and two boot controls.

---

## The two numbers that carry the argument

CLM-1 and CLM-2 are the load-bearing pair, and the reason is worth stating plainly.
`algo.maxFlow` over unit-capacity **edges** counts **edge**-disjoint paths. The claim MENGER
makes needs **vertex**-disjoint paths - otherwise several citations that merely *share* an
origin still look independent. The node split is what converts one into the other, and the
`1`-versus-`2` pair is the only evidence that the split is actually doing that work. Either
number alone proves nothing.
