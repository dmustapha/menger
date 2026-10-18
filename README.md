# MENGER

**An admission-control gate on agent memory.** When an agent tries to write a fact into a
shared FalkorDB graph, the graph itself answers **ALLOW / BLOCK / UNDECIDED**, and every
verdict ships with a replayable receipt.

**Track 02: Agent Memory and Coordination** (sole track).

---

## The one thing to understand

The verdict is a graph computation, not a heuristic sitting next to a graph.

- **Source independence** is Menger's theorem evaluated as `algo.maxFlow` over a *node-split*
  provenance DAG.
- **Source reliability** is `algo.SPpaths` over `-ln(trust)` edges.

So **removing the graph algorithms does not degrade the product, it removes the output
entirely.** There is no fallback path that produces a verdict without them. The vendor is
portable; the algorithms are not.

The hackathon rules name the failure mode directly: *"if the product still works once
FalkorDB is taken out, the graph is decoration rather than the thing the product runs on."*
MENGER has no such seam. Delete the two `CALL algo.*` statements in
[`app/cypher.py`](app/cypher.py) and `POST /remember` has nothing to return.

---

## Verify in 60s

Two commands. The second one re-derives every headline number this project states, against
the live engine, and prints PASS or FAIL per row.

```bash
docker run -d --name gh-falkor -p 6379:6379 -p 3000:3000 falkordb/falkordb:v4.22.1
python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
python3 -m app.seed
bash scripts/verify.sh
```

Expected tail:

```
verify OK — gate green (offline + integration; live tier excluded by design)
```

`scripts/verify.sh` is the same file CI runs, byte-identical, so there is no gate drift. It
runs the vocabulary greps, the offline unit tier (14/14), and
`scripts/verify-claims.sh all` (21 rows, all PASS), which re-derives each claim in
[`CLAIMS.md`](CLAIMS.md) from the engine and writes the transcript to
[`evidence/claims.txt`](evidence/claims.txt).

The two rows that carry the argument:

```
CLM-1      PASS         expected=1 actual=1      # echo chamber scores 1, not the citation count
CLM-2      PASS         expected=2 actual=2      # two vertex-disjoint origins score 2
```

Either number alone proves nothing. The `1`-versus-`2` pair is the only evidence that the
node split is doing its work.

---

## The graph data model

One graph, `menger`, on `falkordb/falkordb:v4.22.1`. Live inventory of the seeded synthetic
corpus: **586 nodes, 861 relationships**.

### Nodes

| Label | Count | Key | What it is |
|---|---:|---|---|
| `:SuperSource` | 1 | `nid:'ss'` | The single flow source. Every provenance path starts here, which is what lets one `maxFlow` call score a claim against all of its origins at once. |
| `:Source` | 150 | `id` | A citable source. Carries `kind`, `trust` (0..1), `is_origin`, `label`. |
| `:SourceIn` | 150 | `sid` | Inbound half of the node split. |
| `:SourceOut` | 150 | `sid` | Outbound half of the node split. |
| `:Claim` | 65 | `id` / `nid` | A `subject`/`predicate`/`object` assertion with `asserted_at` and `status`. |
| `:Slot` | 21 | `key` | The contested cell. `key = subject + "|" + predicate`. At most one claim holds it. |
| `:Agent` | 40 | `id` | The writer. Carries `name`. |
| `:Receipt` | 5 | `id` | The replayable record of one decision: verdict, margin, epsilon, lambda, the candidate blocks, and the verbatim Cypher executed. |
| `:Review` | 1 | `id` | An UNDECIDED verdict parked for a human. |
| `:Counter` | 3 | `name` | Monotonic id allocation. |

Note that `:Claim` and `:SuperSource` match on `nid` while `:Agent` and `:Source` match on
`id`. The algorithm calls bind their endpoints by `nid`, so the flow-participating labels
carry it and the others do not.

### Relationships

| Type | Count | Pattern | What it is |
|---|---:|---|---|
| `:FLOW` | 425 | see below | **The only type any algorithm traverses.** Carries `cap` (capacity), `nl` (`-ln(trust)`), and `kind`. |
| `:SPLIT_OF` | 300 | `(:SourceIn\|:SourceOut)-->(:Source)` | Joins each half back to the source it splits. |
| `:CITES` | 125 | `(:Claim)-->(:SourceIn)` | The citation as asserted, kept separate from the flow edge. |
| `:ASSERTED` | 65 | `(:Agent)-->(:Claim)` | Who wrote it, with `at`. |
| `:FILLS` | 65 | `(:Claim)-->(:Slot)` | Which cell it contests. |
| `:HAS_RECEIPT` | 5 | `(:Claim)-->(:Receipt)` | Decision provenance. |
| `:ABOUT` | 1 | `(:Review)-->(:Claim)` | What the human is being asked about. |

`:FLOW` is **one** relationship type carrying a `kind` property, not four types. That is
forced, not stylistic: `algo.maxFlow` accepts exactly one entry in `relationshipTypes` and
errors on a second, and max-flow does not decompose over an edge-type partition, so
"two calls and combine" would be unsound. The four kinds:

| `kind` | Count | Edge |
|---|---:|---|
| `ORIGIN` | 90 | `(:SuperSource)-->(:SourceIn)` |
| `SPLIT` | 150 | `(:SourceIn)-->(:SourceOut)`, `cap:1.0` |
| `CITED` | 125 | `(:SourceOut)-->(:Claim)` |
| `DERIVED` | 60 | source-to-source derivation |

### Why the node split exists

This is the load-bearing modelling decision.

`algo.maxFlow` over unit-capacity **edges** counts **edge**-disjoint paths. The claim MENGER
makes needs **vertex**-disjoint paths, because several citations that merely *share* an
origin are not independent corroboration, they are an echo chamber.

Splitting every source into a `SourceIn`/`SourceOut` pair joined by a single `cap:1.0` edge
caps each source at one unit of flow. Max-flow over that graph counts vertex-disjoint paths
in the original. Menger's theorem is the guarantee: the maximum number of vertex-disjoint
s-t paths equals the minimum vertex cut.

The split is enforced, not assumed. No edge bypasses it
(`(:SuperSource)-[:FLOW]->(:SourceOut)` and `(:Claim)-[:CITES]->(:SourceOut)` both return
`0`), and the boot sequence refuses to serve unless the echo control scores `1` and the
independent control scores `2`.

---

## Cypher queries and graph algorithms

**→ [`docs/CYPHER-QUERIES.md`](docs/CYPHER-QUERIES.md)** is the separately-listed artifact
required by the submission rules. It documents every statement MENGER executes, quoted from
source, with the FalkorDB-specific behaviour pinned by live probe at each call site.

It covers:

- **`algo.maxFlow`** for independence over the node-split DAG, including why
  `relationshipTypes` holds exactly one entry, why `sourceNodes`/`targetNodes` must bind
  MATCHed nodes rather than id strings, and why the witness set comes back as a list
  comprehension over the `edges` yield instead of an `UNWIND`.
- **`algo.SPpaths`** for reliability over `nl = -ln(trust)`, including **the silent trap**:
  the weight key is `weightProp` and it is the only key that works. `weightProperty:'nl'`
  and `costProperty:'nl'` silently return the hop count with **no error raised**. Both live
  defences are documented.
- **The engine capability boundary.** `algo.dijkstra` and `algo.SCC` do not exist on this
  engine. Eleven `algo.*` procedures do, and they are listed.
- **Read-path isolation.** Every read goes through `GRAPH.RO_QUERY`, and the engine itself
  refuses a write on that path. The refusal is server-side, not a client-side convention.
- **The write registry.** Seven statements. `WriteChannel` accepts those keys and nothing
  else, so adding an eighth is a visible, reviewable act.
- **The recompute table**, mapping each claim to the command that re-derives it.

Statement text is never built by concatenation and never has parameters interpolated into
it. Every value arrives through `$params`. That is what makes a receipt replayable: the text
recorded in the receipt is the text in the file, unchanged.

A note on vocabulary, because it matters to this engine: FalkorDB has no stored procedures.
Each of these is a single parameterised Cypher query.

---

## The two numbers, and the decision rule

`POST /remember` scores the incoming claim and the incumbent on three components, never
blended into a single opaque number:

| Component | How it is computed |
|---|---|
| `independence` | `algo.maxFlow` over the node-split DAG. An integer path count. |
| `reliability` | `algo.SPpaths` over `nl = -ln(trust)`. Negative-log turns a multiplicative trust chain into an additive shortest path. |
| `recency` | `exp(-lambda * age_hours)`, lambda published by `GET /health`. |

The response surfaces `path_weight` raw beside `reliability` so the hop-count trap is
auditable from the response body alone.

Verdicts compare the two scores against an epsilon band. The running server publishes
`epsilon 0.05` and `lambda 0.0080` per hour on `GET /health`; those are the values the engine
was exercised at, and the server is the source you should read them from rather than this
page.

- **ALLOW** (`status: ADMITTED`): the incoming claim wins by more than epsilon.
- **BLOCK** (`status: REFUSED`): the incumbent wins by more than epsilon. The write is
  refused and the incumbent is left byte-identical.
- **UNDECIDED** (`status: QUEUED`): the margin falls inside the band. A `:Review` is opened
  for a human. MENGER does not break a near-tie by itself.

**A refused write is recorded, never dropped.** `recorded` is always `true` and every
verdict carries a `receipt_id`. Drill step 9 proves the whole loop: a losing write into an
occupied slot returns `verdict BLOCK` with `status REFUSED`, `recorded true` and a non-null
`receipt_id`, then the slot is re-read and the incumbent is proven unchanged, with
`asserted_at` byte-identical across the write. Asserting the BLOCK alone would not have been
enough.

Scores are **ordinal**. `score_is_ordinal` is always `true`. They rank candidates within a
slot and mean nothing across slots. There is no confidence, probability or percentage
anywhere on the scoring surface, and a vocabulary grep in the release gate keeps it that way.

---

## Complete local setup

There is no hosted deployment. The rules accept a live URL **or** complete local setup
instructions, and this is the latter. Everything below runs offline against a synthetic,
in-repo corpus. No keys, no external API, no network calls.

### Requirements

- Docker (or Colima)
- Python 3.11+
- `redis-cli` for the raw-Cypher commands (ships inside the container, so
  `docker exec gh-falkor redis-cli ...` works without a host install)
- Node 20+, only if you want the console

### 1. Engine

Pinned, and the pin matters. `:latest` resolves to v4.22.1 despite the 6.0 release notes,
GraphRAG-SDK is broken on 6.0.x, and `algo.AStar` exists only in 4.x.

```bash
docker run -d --name gh-falkor \
  -p 6379:6379 -p 3000:3000 \
  -v falkordb_data:/var/lib/falkordb/data \
  falkordb/falkordb:v4.22.1
```

Confirm the engine is the pinned one:

```bash
docker exec gh-falkor redis-cli MODULE LIST       # graph, ver 42201
```

### 2. Engine dependencies and seed

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python3 -m app.seed
```

The seed is deterministic (`SEED_RNG = 20261018`, frozen reference instant
`2026-10-18T14:30:00Z`) and asserts both node-split controls before it finishes. If the echo
control does not score `1` and the independent control does not score `2`, it refuses to
leave a graph behind.

Optional overrides: `MENGER_REDIS_URL`, `MENGER_GRAPH`, `MENGER_EPSILON`,
`MENGER_LAMBDA_PER_HOUR`. All defaults are in [`app/config.py`](app/config.py), which is the
only place any tunable lives.

### 3. API

```bash
python3 -m uvicorn app.api:app --port 8000
```

Boot runs assertions T-1 through T-4 and returns **503 BOOT_ASSERTION_FAILED** rather than
serving a wrong number. Check it:

```bash
curl -sS http://127.0.0.1:8000/health | python3 -m json.tool
```

`"ok": true` with every `boot_checks` entry `"pass": true` means the two algorithms are
returning what they are supposed to return on the control fixtures.

Read epsilon and lambda from `/health`, never from a document. A prior audit found lambda
carrying three different values across this project's own docs, which is exactly why the
running server is the only valid source.

### 4. Tests

```bash
bash scripts/verify.sh                   # the release gate: compile, vocabulary, unit 14/14, claims 21/21
bash tests/boot_drill.sh                 # boot assertions T-1..T-4
bash tests/drill.sh                      # the 9-step end-to-end drill (needs the API up)
bash scripts/verify-claims.sh all        # re-derive every headline number
```

`tests/drill.sh` is deliberately **excluded** from the default gate: it needs a listening
API, and a gate that silently started a server would be a gate that passes for reasons the
reader cannot see. Run it explicitly, as above. The reasoning is in
[`tests/README.md`](tests/README.md).

### 5. Console (optional)

```bash
cd frontend
npm install
npm run dev -- -p 3100   # http://localhost:3100
```

Port 3100, not 3000. The `gh-falkor` container publishes its own browser UI on 3000, so the
console collides with it if you take the Next.js default.

The console reads the engine over the eight HTTP routes and holds no copy of epsilon or
lambda. The engine is the whole product; the console is a window onto it.

### HTTP surface

Eight routes, frozen in [`CONTRACT.md`](CONTRACT.md) v1.0, all eight live:

| Route | What it does |
|---|---|
| `POST /remember` | Submit a fact. Returns the verdict, both scored candidates, and a receipt id. |
| `GET /slots` | Every contested cell, with claim counts and open-review counts. |
| `GET /slots/{key}` | One slot: the incumbent and every candidate, fully scored. |
| `GET /slots/{key}/graph` | The provenance subgraph. The split pairs are returned as themselves, on purpose. |
| `GET /receipts/{id}` | One decision record, including the verbatim Cypher executed. |
| `POST /receipts/{id}/replay` | Re-execute a receipt's statements and compare. |
| `GET /review` | The UNDECIDED queue awaiting a human. |
| `GET /health` | Boot assertions, server constants, corpus counts, engine identity. |

---

## What is real, and what is not

Full three-tier breakdown: [`submission/HONESTY-LEDGER.md`](submission/HONESTY-LEDGER.md).
Every number with its recompute command: [`CLAIMS.md`](CLAIMS.md). The short version:

**Real.** The two algorithms, the node split, the verdict loop, refusal recording, DOCKET
receipts, the eight routes, the boot assertions. All re-derived by
`bash scripts/verify.sh`.

**Simplified.** The corpus is synthetic, 586 nodes, hand-built to exercise three set-pieces
and two boot controls. Scores are ordinal. Id allocation is not probe-tested under
concurrency. Epsilon and lambda are **unmeasured server constants**, not values calibrated
against reality.

**Not built.** The counterfactual replay (`/x/counterfactual`) was scope-gated as a stretch
and never started; the route sits behind a dead import guard. CI has never executed. The
clean-room reproduction script exits `2 INCONCLUSIVE`.

Explicitly not claimed: no throughput, no p99, no accuracy or F1 (MENGER decides
admissibility, not correctness, and there is no ground-truth labelling against which an
accuracy number would mean anything), no behaviour at scale, no comparison against any other
system.

---

## Documentation

| Document | What it is for |
|---|---|
| [`docs/CYPHER-QUERIES.md`](docs/CYPHER-QUERIES.md) | **The separately-listed Cypher / graph-algorithms artifact.** |
| [`CLAIMS.md`](CLAIMS.md) | Every headline number, its state, and the command that re-derives it. |
| [`CONTRACT.md`](CONTRACT.md) | The frozen v1.0 HTTP surface. |
| [`HANDOFF.md`](HANDOFF.md) | Cold-clone reproduction: target commit, one-command verify, freeze list. |
| [`SECURITY.md`](SECURITY.md) | 12 enforced properties and 10 named exclusions. |
| [`LIMITATIONS.md`](LIMITATIONS.md) | What this does not do, written before it was asked. |
| [`INVARIANTS.md`](INVARIANTS.md) | The properties the code is not allowed to break. |
| [`BUILD-REPORT.md`](BUILD-REPORT.md) | What was built, and the eight deviations from plan. |
| [`tests/README.md`](tests/README.md) | The three test tiers and why the split exists. |

---

## AI-assistance disclosure

This project was built with substantial AI assistance, and the disclosure is specific
because a vague one is worth nothing.

**Tool.** Anthropic's Claude (Claude Code), used as the primary implementation agent across
a structured multi-phase pipeline: research, planning, adversarial critique, implementation,
and verification.

**What the AI did.** Authored the large majority of the code in `app/`, `tests/`,
`scripts/`, and `frontend/`, and wrote the planning and documentation set. It also ran the
live probe campaign against FalkorDB v4.22.1 that produced the engine findings this design
depends on, and ran an adversarial critique pass against its own output that found 50
issues, 13 of them blockers, including one that forced a redesign of the demo drill.

**What the human did.** Set the direction and the track, ruled on scope, and made every
binding decision, including the ones that cost features. Ran the review gates. Rejected the
first architecture. Required that every headline number carry a command that re-derives it,
which is why `CLAIMS.md` and `scripts/verify-claims.sh` exist at all. Held the push, and
ruled on each deviation individually.

**Understanding, since the rules ask.** The engine-specific findings here are not recalled
from training data, they were discovered by live probe and are falsifiable by anyone with the
container: that `algo.dijkstra` does not exist on v4.22.1; that `algo.SPpaths` silently
returns a hop count for a misspelled weight key while `algo.maxFlow` is loud about unknown
keys; that `algo.maxFlow` accepts exactly one `relationshipType`, which is what forces
`:FLOW` to carry a `kind` property instead of splitting into four types; that unit-capacity
max-flow counts edge-disjoint rather than vertex-disjoint paths, which is what forces the
node split. Each of those is pinned at its call site in
[`app/cypher.py`](app/cypher.py) with the probe that established it, and each is re-derived
by `scripts/verify-claims.sh`.

Nothing here was ported from an earlier project. The repository was initialised during the
hackathon window and all design and coding work began after 2026-10-15.

---

## Submission

| Item | Value |
|---|---|
| Hackathon | Graph Hacks: Context for AI Agents (WeMakeDevs x FalkorDB) |
| Track | **02: Agent Memory and Coordination** (sole) |
| Repository | https://github.com/dmustapha/menger |
| Live deployment | None. Complete local setup instructions above, which the rules permit. |
| Graph database | FalkorDB `v4.22.1`, pinned, load-bearing |
| Data | Synthetic, seeded, committed in-repo. No private, personal or restricted data. |
| License | [MIT](LICENSE) |

---

## Naming

Karl Menger's theorem states that the maximum number of vertex-disjoint paths between two
nodes equals the minimum vertex cut separating them. That theorem is the reason an
independence score computed by max-flow over a node-split graph means what this product says
it means. The Menger sponge, the fractal that removes material until only structure is left,
is the other half of the joke.
