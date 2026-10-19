# INVARIANTS - MENGER

> **This document is LAW for the build agent.** It is not advisory, not a summary, and not a
> second opinion. Where this file and anyone's convenience disagree, this file wins.
>
> **Owner:** forge (redo dispatch) · **Written:** 2026-10-18 · **Status:** ACTIVE
> **Reads as law by:** the engine build chat, the `design_forge` console chat, `verify_milestone`,
> `package`, `demo`.
> **Checked against by:** `verify` - every row below is a thing verify may ask the build to show.
>
> **Precedence, highest first:** `PULSE.md` Active Facts `AF-1..AF-17` → `CONTRACT.md` v1.0
> (FROZEN) → this file → `PLAN.md` → anything else. Published FalkorDB documentation is **below**
> `PULSE.md`: `AF-1`, `AF-2` and `AF-3` have already falsified it in writing.

---

## 0. How to read a row

Every invariant below carries five fields, and all five are load-bearing:

| Field | What it is |
|---|---|
| **Invariant** | The rule. Imperative. No hedging. |
| **Basis** | Where the rule comes from, tagged `[VERIFIED]` / `[UNVERIFIED]` / `[ASSUMED]`. `[VERIFIED]` means a live probe in `.law12-feasibility.json` or a `PULSE.md` `AF-n` row backs it - nothing else qualifies. |
| **Judge's attack** | The specific question a sceptical judge asks that this invariant exists to survive. Judging is **artifact-only** (`AF-10` `[VERIFIED]`) - nobody will be in the room to answer it on our behalf, so the answer has to already be in the artifacts. |
| **Honest answer** | What we actually say. If the honest answer is "we did not measure that", it says so. |
| **Break test** | How a reviewer proves the invariant holds - or catches it broken. |

A row **without** its judge's attack is an incomplete row. The pairing is the substance of this
document: an invariant is only worth enforcing if we can name the attack it survives.

**Count discipline:** 27 invariants, 27 judge's attacks, one-to-one. If a future edit adds an
invariant without an attack, the edit is incomplete and the row must be rejected.

---

## NON-NEGOTIABLES

**The 22 rows, numbered, with the attack each one exists to survive.** Full row - basis, honest
answer, break test, what-to-do-if-it-fails - follows below under the matching `### INV-n` heading.
Read a row in full before you touch the code it governs; this index is for navigation and for
checking at a glance that no invariant has lost its paired attack.

1. **INV-1 - Node-split the provenance DAG, at seed time, always.** Judge-attack: unit-capacity max-flow counts *edge*-disjoint paths, so an echo chamber of five citations tracing to one blog scores as five independent sources - the headline claim is a bug.
2. **INV-2 - `weightProp` is the only weight key, and a wrong key fails SILENTLY.** Judge-attack: reliability is `exp(-pathWeight)` - prove `pathWeight` is the summed `-ln(trust)` and not an unweighted hop count returned by a key the engine accepted and ignored.
3. **INV-3 - `algo.dijkstra` and `algo.SCC` do not exist; never reference them.** Judge-attack: you wrote a procedure name this engine does not have - we wrote this engine, so you did not run what you documented.
4. **INV-4 - `algo.maxFlow` takes exactly ONE relationship type.** Judge-attack: you pass one type, but the schema spans `FLOW`, `CITES` and `DERIVED_FROM` - which edges actually carried the flow, and what silently did not count?
5. **INV-5 - `algo.pageRank` is two POSITIONAL args, and MENGER uses neither pageRank nor betweenness.** Judge-attack: every graph project calls them so the README can list algorithms - name the decision either one feeds, or admit it is decoration.
6. **INV-6 - All reads go through `GRAPH.RO_QUERY`; Python client only.** Judge-attack: you generate Cypher and re-execute it on replay - what stops a crafted claim from turning a read into a write?
7. **INV-7 - The engine is pinned `falkordb/falkordb:v4.22.1`; the pin is load-bearing.** Judge-attack: your probe results are version-specific - procedure lists and weight-key behaviour move between releases, so an unpinned engine invalidates every `[VERIFIED]` tag.
8. **INV-8 - Boot assertions are a PUBLIC surface and they fail CLOSED.** Judge-attack: your two scariest failure modes both produce a plausible wrong number with no error - how would anyone, including you, notice?
9. **INV-9 - ε and λ are SERVER constants; the console must not hardcode them.** Judge-attack: where does ε = 0.05 come from - and if it was picked to land the demo on UNDECIDED, the demo is the parameter, not the result.
10. **INV-10 - The score is ORDINAL, not cardinal; `score_is_ordinal: true` on every scored object.** Judge-attack: you multiply an integer count by two exponentials and call the product a score - those units do not compose, so what does the magnitude mean?
11. **INV-11 - The three components are NEVER pre-blended.** Judge-attack: show the number you actually computed - if only the product is visible, no claim about the mechanism can be checked.
12. **INV-12 - MENGER decides ADMISSIBILITY; it never decides veracity.** Judge-attack: so you built a truth oracle - a graph decides which facts are allowed into memory. What happens when it is wrong?
13. **INV-13 - Nothing is silently lost.** Judge-attack: an admission gate that drops what it rejects is a censor with no audit trail - where does a BLOCKED claim go?
14. **INV-14 - The verdict enum is exactly three values.** Judge-attack: binary allow/deny would be simpler - is `UNDECIDED` a real verdict or a hedge added so the demo never looks wrong?
15. **INV-15 - Banned vocabulary: "a single parameterised Cypher query", never "stored procedure".** Judge-attack: FalkorDB has no stored procedures - saying it proves you did not use the product you are being judged on.
16. **INV-16 - Every value in Cypher is a bound parameter.** Judge-attack: claim text is attacker-controlled and reaches a Cypher query - show why that is not an injection.
17. **INV-17 - The DOCKET receipt carries the VERBATIM executed Cypher and is replayable by id.** Judge-attack: "replayable" is easy to say - does replay re-run the real query, or re-render a number you stored?
18. **INV-18 - Synthetic, seeded, in-repo corpus only; no private data, ever.** Judge-attack: you built the echo chamber yourself, so of course it scores the way you wanted - what did you not get to choose?
19. **INV-19 - Fresh code only.** Judge-attack: how much of this existed before the hackathon started?
20. **INV-20 - `CONTRACT.md` is FROZEN at v1.0; no unilateral amendment.** Judge-attack: two chats built against each other in parallel with no integration until late - how did the UI and the engine not diverge?
21. **INV-21 - The P3 counterfactual is stretch-only, isolated, and deletable.** Judge-attack: the README mentions a counterfactual feature - does it work, and if it is not in the demo, why is it mentioned at all?
22. **INV-22 - MENGER holds no keys and signs nothing; the keys-off-host path does not apply.** Judge-attack: where do the signing keys live, and what stops the host from using them?

### INV-1 - Node-split the provenance DAG. Always. At seed time.

**Invariant.** Every `(:Source)` is represented as a **split pair** `(:SourceIn {sid})` →
`(:SourceOut {sid})` joined by one `[:FLOW {cap: 1.0}]` edge. `independence` is
`algo.maxFlow` from the single `(:SuperSource)` to the `(:Claim)` over that split graph.
The split is built **at seed time** and never retrofitted, never optimised away, never made
conditional on a flag.

**Basis.** `[VERIFIED]` - `AF-6` / `VF-W2` / `.law12-feasibility.json#AF-6`. Live probe against
`gh-falkor` (`falkordb/falkordb:v4.22.1`): unit-capacity `maxFlow` counts **edge**-disjoint paths,
not vertex-disjoint. After node-split: echo graph → **1**, independent-sources graph → **2**.
Both directions proven, not one.

**Judge's attack.**
> "Max-flow over unit-capacity edges counts *edge*-disjoint paths. Vertex-disjointness is a
> different quantity. So an echo chamber - five citations that all trace back to one blog - will
> score as five independent sources. Your headline claim is a bug. Explain."

**Honest answer.** That is correct, and it is exactly the bug we hit on the live probe before any
code was written. Unit-capacity edges gave the wrong quantity. The fix is Menger's theorem applied
properly: split every vertex into in/out halves joined by a single unit-capacity edge, so the
vertex's capacity becomes an edge's capacity and edge-disjoint becomes **equal to**
vertex-disjoint. Two chains funnelling through a shared intermediate now compete for that
intermediate's one unit of capacity, and the pair counts as **one** origin. `[VERIFIED]` both
directions on the live engine: echo → 1, independent → 2. We publish both numbers on
`GET /health` so you can check the split is actually in effect without taking our word for it.

**Break test.** `GET /health` → `boot_checks.node_split_echo.actual == 1` **and**
`boot_checks.node_split_independent.actual == 2`. If either differs, the service returns
**503 `BOOT_ASSERTION_FAILED`** (INV-8) and refuses to serve. In the graph itself:
`GET /slots/{key}/graph` must show `si:<source_id>` / `so:<source_id>` pairs - if a response
contains a bare `src_*` node in a flow path, the split is not in the data.

**If it fails:** fix the seed. **Never** fix the expected value. Changing `1` or `2` to match a
broken graph is the single worst edit available in this repo.

---

### INV-2 - `weightProp` is the ONLY weight key, and a wrong key fails SILENTLY.

**Invariant.** `algo.SPpaths` is called with the key spelled exactly **`weightProp`**. The names
`weightProperty`, `relationshipWeightProperty`, and `costProperty` are **forbidden everywhere** -
in code, in receipts, in documentation examples, in console copy.

**Basis.** `[VERIFIED]` - `AF-3` / `.law12-feasibility.json#AF-3`. Live probe: the three wrong key
names are accepted **silently** and the procedure returns **hop count** instead of the weighted
sum. **No error is raised.** A wrong key therefore produces a plausible, wrong, confident number.

**Judge's attack.**
> "Your reliability score is `exp(-pathWeight)`. How do I know `pathWeight` is the sum of
> `-ln(trust)` and not just the number of hops? That mistake would pass every test you could
> write, because both are floats and both look reasonable."

**Honest answer.** You are describing the sharpest edge we found in the engine, and we found it
the hard way on a live probe. A wrong weight-key name is accepted without error and silently
returns hop count. We cannot defend against it with types, so we defend against it with a value:
the boot path asserts `pathWeight == 0.21072` on a fixed control fixture, and `0.21072` is
**not an integer** - a hop count physically cannot reproduce it. That assertion is published on
`GET /health` as `boot_checks.sp_path_weight`, and the service returns 503 rather than serve if it
does not reproduce. Separately, `components.path_weight` is surfaced **raw** in every receipt
alongside `reliability`, so the trap is auditable from the outside: a `path_weight` that is a whole
number is a red flag you can spot yourself.

**Break test.** `GET /health` → `boot_checks.sp_path_weight.actual == 0.21072`. Negative control
(`PLAN.md` §6, the hop-count forgery case): substitute `weightProperty`, confirm `pathWeight`
degenerates to an integer and `T-3` **fails**. An assertion that cannot be made to fail is
decoration, not a test.

---

### INV-3 - `algo.dijkstra` and `algo.SCC` DO NOT EXIST. Never reference them.

**Invariant.** The procedures `algo.dijkstra` and `algo.SCC` must not appear in code, Cypher,
receipts, README prose, video narration, or submission-form text. The verified procedure set in
FalkorDB v4.22.1 is exactly: `AStar, BFS, HarmonicCentrality, MSF, SPpaths, SSpaths, WCC,
betweenness, labelPropagation, maxFlow, pageRank`.

**Basis.** `[VERIFIED]` - `AF-1` / `VF-W5` / `.law12-feasibility.json#AF-1`. Live
`CALL dbms.procedures()` against `gh-falkor`. This **overturned** the intel phase's capability map,
which was written from documentation and was wrong.

**Judge's attack.**
> "You wrote `algo.dijkstra`. That procedure does not exist in this engine. We wrote this engine.
> Did you run any of this?"

**Honest answer.** We did run it, which is how we know. Our first design called `algo.dijkstra`
and `algo.SCC`; a live `dbms.procedures()` probe showed neither exists in v4.22.1, and the design
was re-cut onto `algo.SPpaths` and `algo.maxFlow` **before a line of product code was written**
(ADR-012). The documentation-derived capability map that produced the error is recorded as
overturned in `PULSE.md` rather than quietly deleted.

**Break test.** `grep -rniE 'algo\.(dijkstra|SCC)' /Users/MAC/graph-hacks` → **zero** hits across
code, docs, README, and narration script. Run it again immediately before submission.

---

### INV-4 - `algo.maxFlow` takes EXACTLY ONE relationship type.

**Invariant.** The call form is frozen:

```cypher
CALL algo.maxFlow({
  relationshipTypes: ['FLOW'],        -- EXACTLY ONE type. Not two. Not a list of several.
  sourceNodes:       [$ss],
  targetNodes:       [$claim],
  capacityProperty:  'cap'
}) YIELD maxFlow, nodes
RETURN maxFlow, nodes
```

Because only one type is permitted, **every edge that must carry flow is typed `FLOW`** - this is
a schema obligation, not a query detail. `DERIVED_FROM` carries the `nl` weight for `SPpaths`
(INV-2) and is **not** in the max-flow relationship set.

**Basis.** `[VERIFIED]` - `AF-4` / `.law12-feasibility.json#AF-4`. Signature and the
one-type constraint discovered live, not read.

**Judge's attack.**
> "You pass one relationship type to `maxFlow`, but your schema has `FLOW`, `CITES` and
> `DERIVED_FROM`. Either flow is leaking through edges you did not include, or your independence
> count is computed over an incomplete graph. Which is it?"

**Honest answer.** Neither - the one-type constraint is why the schema is shaped the way it is.
The engine accepts exactly one `relationshipTypes` entry, so the flow network is built entirely
out of `FLOW` edges: super-source → `SourceIn`, the split edge `SourceIn` → `SourceOut`, and
`SourceOut` → `Claim`. `DERIVED_FROM` exists for the weighted reliability path and deliberately
does not participate in max-flow. The constraint drove the schema; the schema was not bent to
survive the constraint.

**Break test.** Read `receipt.cypher[]` for the `independence.maxFlow` entry: it must contain
exactly one entry in `relationshipTypes`. Any `maxFlow` call with two or more types is a
contract break regardless of whether it happens to return a number.

---

### INV-5 - `algo.pageRank` is two POSITIONAL args - and MENGER uses neither pageRank nor betweenness.

**Invariant.** If `algo.pageRank` is ever called it is `algo.pageRank(label, relType)` - two
positional arguments, **not** a configuration map. And for MENGER specifically: **`pageRank` and
`betweenness` are not used at all.** Neither appears in the scoring path.

**Basis.** `[VERIFIED]` for the call form - `AF-5`. `[VERIFIED]` for the exclusion -
`WINNER-BRIEF.md` correction #3: `algo.betweenness` ranks *intermediaries*, not leaf sources,
and was dropped as the wrong selector. `PLAN.md` §10 lists it as out-of-scope.

**Judge's attack.**
> "Everyone's graph project calls `pageRank` and `betweenness` so the README can list graph
> algorithms. Where are yours, and if they are absent, is the graph really doing the work?"

**Honest answer.** We deliberately use neither, and that is the stronger position. `betweenness`
was evaluated and **dropped** - it ranks intermediaries, and our question is about *origins*, so it
answers the wrong question well. `pageRank` would be decoration: it would not change a single
verdict. The two algorithms we do use are the two the verdict cannot exist without
(`maxFlow` for independence, `SPpaths` for reliability). The algorithm count is low on purpose;
the algorithm **load** is total.

**Break test.** `grep -rn 'pageRank\|betweenness' /Users/MAC/graph-hacks` → hits only in
invariant/decision/limitation prose explaining the exclusion, never in `*.py`.

---

### INV-6 - All reads go through `GRAPH.RO_QUERY`. Python client only.

**Invariant.** Every read executed against the graph uses the **`GRAPH.RO_QUERY`** command.
No read path uses `GRAPH.QUERY`. The server is **Python** (FastAPI + the `falkordb` Python
client), because the TypeScript client does not expose `RO_QUERY` (FalkorDB issue #408). Every
recorded Cypher statement in a receipt carries `read_command: "GRAPH.RO_QUERY"`, and
`receipt.engine.read_path == "GRAPH.RO_QUERY"`.

**Basis.** `[VERIFIED]` - `AF-8` / `VF-W4` / `.law12-feasibility.json#AF-8`. Live probe:
`CREATE` is **rejected server-side**, `MATCH` is allowed. Containment is enforced by the engine,
not by client-side string inspection. `[VERIFIED]` for the client gap - FalkorDB issue #408.

**Judge's attack.**
> "You generate Cypher and then re-execute it on replay. What stops a crafted claim from turning
> a read into a write and mutating the provenance corpus - making your own receipts unreplayable,
> or worse, self-confirming?"

**Honest answer.** Two things, and only one of them is ours. First, every value is a **bound
parameter** - no f-string ever interpolates a claim's text into Cypher (INV-16), so there is no
string to break out of. Second, and this is the one that actually matters: every read goes through
`GRAPH.RO_QUERY`, which **the engine** enforces. We probed it: `CREATE` through `RO_QUERY` is
rejected by the server. That is a real boundary, not a regex we wrote and hope is complete. The
cost is that the stack is Python-only - the TS client does not expose the command (issue #408) -
and we took that cost rather than give up the boundary (ADR-011).

**Break test.** `grep -rn 'GRAPH.QUERY' <engine source>` → write path only (seed/claim/receipt
creation), never a scoring read. Live: `GRAPH.RO_QUERY menger "CREATE (:X{a:1})"` → error (`T-4`).

---

### INV-7 - The engine is pinned `falkordb/falkordb:v4.22.1`. The pin is load-bearing.

**Invariant.** Every compose file, Dockerfile, README instruction, and receipt records the
**explicit tag** `falkordb/falkordb:v4.22.1`. `:latest` is never used, even though it currently
resolves to the same image.

**Basis.** `[VERIFIED]` - `AF-9` / `VF-I1` / `.law12-feasibility.json#AF-9`. Live `MODULE LIST`.
`:latest` resolves to 4.22.1 despite 6.0 release notes, and GraphRAG-SDK is broken on 6.0.x - so
the pin protects against a resolution change, not against a version we are currently on.

**Judge's attack.**
> "Your probe results are version-specific - procedure lists and weight-key behaviour change
> between majors. Which version did you measure, and will the thing I run reproduce it?"

**Honest answer.** Every probe in `.law12-feasibility.json` ran against
`falkordb/falkordb:v4.22.1`, and that exact tag is pinned in compose and in the README. We did not
use `:latest`: it happens to resolve to 4.22.1 today, but 6.0 exists and GraphRAG-SDK is broken on
6.0.x, so an unpinned tag would silently move the ground under the measured facts. The pin is also
published inside every receipt (`receipt.engine.image`), so a receipt tells you which engine
produced it rather than leaving you to assume.

**Break test.** `grep -rn 'falkordb/falkordb' /Users/MAC/graph-hacks` → every occurrence carries
`:v4.22.1`. Zero occurrences of `falkordb:latest`.

---

### INV-8 - Boot assertions are a PUBLIC surface and they fail CLOSED.

**Invariant.** `GET /health` publishes all three boot checks with `expected`, `actual`, and
`pass`:

| Check | Expected | Guards |
|---|---|---|
| `node_split_echo` | `1` | INV-1 / `R-1` |
| `node_split_independent` | `2` | INV-1 / `R-1` |
| `sp_path_weight` | `0.21072` | INV-2 / `R-3` |

On **any** mismatch the service returns **503 `BOOT_ASSERTION_FAILED`**. It does not serve a
degraded answer, does not warn-and-continue, and does not log-and-proceed. `bootcheck.py` runs at
the startup of **both** `seed.py` and `api.py`; a red assertion stops the seed from running at all.

**Basis.** `[VERIFIED]` for the three expected values (`AF-6` → 1 and 2; `AF-3` → 0.21072).
`[UNVERIFIED]` for the endpoint behaviour - `/health` **has not been built or probed**; the 503
semantics are specified in `CONTRACT.md` §2.8 and are an obligation on `build`, not an observation.

**Judge's attack.**
> "Your two scariest failure modes - a missing node-split and a silent hop-count score - both
> produce a *plausible wrong number* with no error. So how would you ever know, and how would
> **I** ever know?"

**Honest answer.** That is precisely why the checks are not internal. Both failure modes are
silent, so a private assertion would protect us and tell you nothing. We publish all three on
`GET /health` with expected-vs-actual side by side, and the service **refuses to serve** rather
than serve a wrong headline number - 503, not a warning banner. You can check the mechanism is
live in one request, with no access to our code and nobody explaining it to you. Honest caveat:
the endpoint is specified and not yet built, so this row is `[UNVERIFIED]` until `build` lands it
and someone has watched a deliberately-broken seed produce the 503.

**Break test.** Break the seed on purpose (remove the split edge for one source), restart,
`GET /health` → **503** with `error.code == "BOOT_ASSERTION_FAILED"` and the failing check named in
`detail.boot_checks`. A fail-open result here is a P0 defect.

---

### INV-9 - ε and λ are SERVER constants. The console must not hardcode them.

**Invariant.** `epsilon` and `lambda` live on the server, are published by `GET /health`, and
`epsilon` is echoed on **every** decision response. The console reads them. The console does not
define them, does not default them, does not cache them across a restart, and does not display a
literal it compiled in. The same rule covers the `corpus` counts (`agents`, `sources`, `claims`,
`slots`).

**Basis.** `[VERIFIED]` that this is the ruled design - `AF-17`, `DS-8`, `R-4`, `CONTRACT.md`
§0 rule 9 and §4. `[ASSUMED]` for the **values**: ε = 0.05 and λ = 0.01/hour are **proposed,
unmeasured defaults**. They are calibrated in B2 against the seeded deliberate-tie set-piece, and
the operative value is whatever `/health` reports. `[UNVERIFIED]` contradiction to chase:
`CONTRACT.md` example responses show `lambda: 0.0077`, while `PLAN.md` §5 and the redo brief say
the proposed default is `0.01/hour` - see §4 Source-lock, row L-1.

**Judge's attack.**
> "Where does ε = 0.05 come from? If you picked it to make your demo land on UNDECIDED, the
> UNDECIDED band is theatre."

**Honest answer.** ε is a **tuned, unmeasured** parameter and we are not going to pretend
otherwise. It is calibrated during B2 so that the deliberately-tied set-piece lands inside the
band - which is exactly the thing you are suspicious of, so here is the mitigation: ε is never
hidden. It is published on `/health`, echoed on every single decision next to the `margin` it was
compared against, and recorded in every receipt. You can read the margin, read ε, and redo the
comparison yourself. λ is the same story. What we do **not** claim is that either value is derived
from data - there is no data. They are policy knobs, surfaced as policy knobs.

**Break test.** `grep -rniE '0\.05|0\.0077|\b0\.01\b' <console source>` → no numeric literal used
as ε, λ, or a corpus count. Behavioural: change ε on the server, restart, and the console's
displayed band must change with no console rebuild.

---

### INV-10 - The score is ORDINAL, not cardinal. `score_is_ordinal: true` on every scored object.

**Invariant.** `score = independence × reliability × recency` is a **rank**. Every object
carrying a `score` also carries `"score_is_ordinal": true`. No surface - API, console, README,
video, submission prose - may render `score` as a percentage, a confidence, a probability, a
"% likely", or a progress bar. Cross-slot magnitude comparison is meaningless and must not be
offered: a `score` of 1.50 in one slot is not "better" than 0.90 in another.

**Basis.** `[VERIFIED]` that this is ruled - `DS-8`, `R-4`, `CONTRACT.md` §0 rule 2 and §4, and
the User Advocate's standing dissent recorded in `WINNER-BRIEF.md`. The flag is structural in the
frozen contract.

**Judge's attack.**
> "You multiply an integer count by two exponentials and call the product a score. Those are
> three incompatible units with no stated weights. What does 1.5002 *mean*?"

**Honest answer.** On its own, nothing - and we say so in the API itself rather than in a
footnote. The product is an **ordinal** quantity: its only job is to rank the claims contending
for one slot. It is not a probability, not a confidence, and not comparable across slots. That is
why every scored object ships `score_is_ordinal: true`, why all three components are surfaced
separately so you can see what drove the rank, and why the verdict comes from a **margin against
ε** rather than from a threshold on the score itself. The dissent you are raising was raised
internally, is recorded as `R-4`, and is answered structurally: there is no code path that emits a
blended number without the ordinal flag beside it.

**Break test.** Every `score` in every response has `score_is_ordinal` in the same object (schema
check, not spot check). Console: `grep -niE '%|confidence|probability|likelihood' <console>` → no
hit attached to `score`.

---

### INV-11 - The three components are NEVER pre-blended.

**Invariant.** `independence` (**integer**), `reliability` (float 0..1), `recency` (float 0..1)
are always present as distinct fields, together with `path_weight` **raw** and `age_hours`. No
intermediate layer collapses them. The multiplication happens at the response layer only, beside
the three inputs - never upstream of them, and never instead of them.

**Basis.** `[VERIFIED]` that this is ruled and structural - `CONTRACT.md` §0 rule 1 and §1
`Components`; recorded in the forge PULSE section as "closed **structurally**: no code path
produces a blend before the response layer."

**Judge's attack.**
> "Show me the number you actually computed. If the only thing I can see is the product, I cannot
> tell whether a high score came from genuine independence or from a claim simply being recent."

**Honest answer.** You can see all three, in every response, always - and `path_weight` raw
alongside, which is the input to `reliability` rather than its output. That last field exists
specifically so you can audit the `weightProp` trap (INV-2) from outside. The reason you can rely
on this is that the separation is **structural, not stylistic**: the contract defines
`Components` as four distinct fields plus `age_hours`, and no code path produces a blend before
the response layer. There is no setting that turns the breakdown off.

**Break test.** Any response containing `score` must also contain the full `components` object.
A `score` without its components is a contract break.

---

### INV-12 - MENGER decides ADMISSIBILITY. It never decides veracity.

**Invariant.** The product gates a **write**. The vocabulary is **admission control** and
**refused**. The words **"truth"**, **"verifies truth"**, **"true"-as-a-verdict**, and
**"detects conflicts"** are forbidden in every artifact: README, video narration, submission form
prose, console copy, API strings, error messages, and these docs. `UNDECIDED` is a first-class
verdict, not a failure state. A `BLOCK` is **recorded and appealable** - never a ruling that the
claim is false.

**Basis.** `[VERIFIED]` that this is ruled - `R-2` (CRITICAL), `R-5`, `DS-4`, `CONTRACT.md` §4,
`LEDGER.md` hard constraints 4 and 5. `[ASSUMED]` that the panel reads "admission control" as
bounded rather than as overreach - recorded upstream as assumption `A-W2`, **WILL-BREAK if wrong**,
mitigated only by framing discipline. "detects conflicts" is `agentmesh`'s vocabulary; using it
would position us as a copy of a named competitor.

**Judge's attack.**
> "So you have built a truth oracle. A graph decides which facts are allowed into memory. What
> happens when it is wrong - and who appeals?"

**Honest answer.** No, and the distinction is the whole product. MENGER answers *should this write
be admitted to shared memory right now* - it never answers *is this claim true*. It cannot: it has
no access to the world, only to provenance structure. A `BLOCK` means "this claim's sources are
not independent enough to displace the incumbent", not "this claim is false". That is why a
refused write is **persisted** with its receipt (`recorded: true`, `status: REFUSED`) and is
appealable, and why near-ties go to `UNDECIDED` and a review queue rather than being decided by
coin-flip. On being wrong: we will be, and the design assumes it. The receipt exists so a wrong
refusal is reconstructible and arguable rather than invisible.

**Break test.** `grep -rniE '\btruth\b|detects? conflict|verif(y|ies) truth' <all judged
artifacts>` → zero hits outside prose that is explicitly disclaiming the word. Run it on the README,
the narration script, and the form text immediately before submission (`DS-3`, `DS-4`).

---

### INV-13 - Nothing is silently lost.

**Invariant.** Every `/remember` response carries `recorded: true` - **always**. A `BLOCK`
persists the incoming claim with `status: REFUSED` and keeps its receipt. An `UNDECIDED` persists
a `(:Review)` node and returns a non-null `review_id`, surfaced by `GET /review`. There is no code
path that discards a submitted claim.

**Basis.** `[VERIFIED]` that this is ruled - `CONTRACT.md` §0 rule 4; `WINNER-BRIEF.md` B3
("BLOCKED writes are **recorded, never silently dropped** - this closes the User Advocate's
dissent"). `[UNVERIFIED]` as behaviour - no endpoint has been built or probed.

**Judge's attack.**
> "An admission gate that drops what it rejects is a censor with no audit trail. What happens to
> the claim you refuse?"

**Honest answer.** It is written down. A refused claim is created in the graph like any other,
marked `REFUSED`, and keeps a full DOCKET receipt - so the refusal is inspectable and arguable
later. Near-ties are not refused at all: when `|margin| ≤ ε` the verdict is `UNDECIDED`, a
`(:Review)` node is persisted, and the item appears on `GET /review`. We would rather hold a
decision open than make a confident wrong one. Honest caveat: `GET /review` is **read-only** in
v1.0 - there is no resolve endpoint (ADR-019), so the queue is a visible backlog, not a worked
workflow.

**Break test.** `drill.sh` steps 2, 4, 5: a BLOCK returns `recorded: true` and a retrievable
receipt; an UNDECIDED returns a `review_id` that then appears in `GET /review`.

---

### INV-14 - The verdict enum is exactly three values.

**Invariant.** `"ALLOW" | "BLOCK" | "UNDECIDED"`. No fourth value, no `null`, no `"ERROR"` verdict,
no `"PENDING"`. The `verdict` → `status` mapping is total and fixed: `ALLOW→ADMITTED`,
`BLOCK→REFUSED`, `UNDECIDED→QUEUED`. The decision rule is **normative** and the console may
display it but must never re-derive it:

```
margin  = score(incoming) - score(best_incumbent)   // best_incumbent = 0.0 when the slot is empty
margin  >  +epsilon   →  ALLOW      status ADMITTED   review_id null
margin  <  -epsilon   →  BLOCK      status REFUSED    review_id null
|margin| <= epsilon   →  UNDECIDED  status QUEUED     review_id set, a (:Review) node is written
```

**Basis.** `[VERIFIED]` that this is ruled - Decision #4 (Dami's ruling at `pool_checkpoint`),
`CONTRACT.md` §0 rule 3 and §2.1. `[ASSUMED]` that ε = 0.05 places the seeded tie inside the band
(upstream assumption `A-F3`) - calibrated in B2.

**Judge's attack.**
> "Binary allow/deny would be simpler. Is `UNDECIDED` a real verdict or a hedge you added so the
> system never has to be wrong?"

**Honest answer.** It is a real verdict with a real consequence, and it exists because of a
specific structural fact: the score is **ordinal** (INV-10), so a 0.001 difference between two
claims is noise, not a ranking. A binary gate would convert that noise into a confident decision -
which is the failure mode we are trying to eliminate, not create. `UNDECIDED` fires when
`|margin| ≤ ε`, writes a `(:Review)` node, and the write is held rather than resolved. We also do
not get to hide behind it: ε is published (INV-9), so you can see exactly how wide the hedge is
and judge whether it is honest.

**Break test.** Enum check on every `/remember` response. Behavioural: `drill.sh` steps 2–4 must
reach **all three** verdicts on the seeded set-pieces - a build where `UNDECIDED` is unreachable
has not satisfied `DC-2`.

---

### INV-15 - Banned vocabulary. "A single parameterised Cypher query", never "stored procedure".

**Invariant.** Three bans, enforced on every artifact a judge reads:

| Never write | Why | Write instead |
|---|---|---|
| "stored procedure" | **FalkorDB has none.** The panel wrote the engine; the phrase marks us as not having used the product. | **"a single parameterised Cypher query"** |
| "detects conflicts" | `agentmesh`'s claim and vocabulary, not ours. | **"refuses"** / **"admission control"** |
| "truth" / "verifies truth" | Overreach we cannot support. | **"admission control"**, "source independence" |

**Basis.** `[VERIFIED]` that FalkorDB has no stored procedures - `WINNER-BRIEF.md` correction #2,
derived from the live procedure-list probe (`AF-1`). `[VERIFIED]` that the bans are ruled -
`DS-3`, `DS-4`, `R-2`, `R-5`, `CONTRACT.md` §4.

**Judge's attack.**
> "You say a stored procedure names the winner. FalkorDB does not have stored procedures. Did you
> actually build on this engine, or write about it?"

**Honest answer.** We built on it, and the wording is one we corrected before shipping rather than
after being caught. An early framing said "a single Cypher procedure names a winner"; it is
unbuildable, because FalkorDB has no stored-procedure facility. The accurate description is **a
single parameterised Cypher query**, and that is the phrase in every artifact. The correction is
recorded as `WINNER-BRIEF.md` correction #2 rather than silently patched.

**Break test.** `grep -rniE 'stored procedure|detects? conflict|\btruth\b' <README, video script,
form prose, console copy>` → zero hits. `DS-3` acceptance: `grep README for "procedure"` returns
only the correct sense (e.g. `dbms.procedures()`, `algo.*` procedure names).

---

### INV-16 - Every value in Cypher is a bound parameter.

**Invariant.** No f-string, `%`-format, `.format()`, or concatenation ever interpolates a claim's
subject, predicate, object, agent id, source id, or slot key into Cypher text. The query text and
the `params` map are stored **separately** in every receipt - which is both the injection control
and the reason the receipt is auditable.

**Basis.** `[VERIFIED]` that this is ruled - `PLAN.md` §7; `CONTRACT.md` §2.5 (`cypher[].query`
and `cypher[].params` are separate fields). `[UNVERIFIED]` as implemented behaviour - no engine
code exists yet.

**Judge's attack.**
> "Claim text is attacker-controlled and ends up in a Cypher query. Show me why that is not an
> injection."

**Honest answer.** Two layers. The query text is static and parameterised - a claim's object is
bound as `$object`, never spliced into the string - so there is no string for an attacker to
escape from. And even if the first layer failed, the second is not ours to get wrong: every read
goes through `GRAPH.RO_QUERY` and the **engine** rejects writes (INV-6, `[VERIFIED]` by live
probe). The receipt stores the query text and the parameter map as separate fields, so you can see
the separation rather than trust it.

**Break test.** `grep -rnE 'f"[^"]*(MATCH|CREATE|CALL)|\.format\(|%s.*MATCH' <engine source>` →
zero. Every `receipt.cypher[]` entry has a non-empty `params` object when it references an id.

---

### INV-17 - The DOCKET receipt carries the VERBATIM executed Cypher and is replayable by id.

**Invariant.** Every verdict persists a receipt containing: the exact parameterised Cypher that
was executed with its params and `read_command`, in execution order; all three components plus
`path_weight`; the winning provenance path; the **max-flow witness set** (the saturated split
edges); the engine image, graph name and read path; ε and λ as applied. `POST
/receipts/{id}/replay` re-executes the recorded statements verbatim. `matches_original` ignores
`recency` drift (`reason: "RECENCY_DECAY"` is expected and benign) and is `false` only on
`GRAPH_MUTATED` or `ENGINE_DIFF`.

**Basis.** `[VERIFIED]` that receipts are **mandatory** - Decision #4, Dami's ruling (P5 DOCKET
receipts MANDATORY). `[VERIFIED]` that replay-against-an-unmutated-graph is defensible - `AF-8`
(`RO_QUERY` rejects writes server-side). `[UNVERIFIED]` as behaviour - the endpoint is specified,
not built.

**Judge's attack.**
> "'Replayable' is easy to say. Does replay re-run the real query, or re-render a number you
> cached at decision time?"

**Honest answer.** It re-runs the real text. The receipt stores the parameterised Cypher that was
actually executed - not a description of it, not a regenerated equivalent - and `/replay` sends
those statements back through `GRAPH.RO_QUERY` and diffs the results against what was recorded.
One honest wrinkle we chose to surface rather than paper over: `recency` **will** drift, because
time passes. So `matches_original` ignores recency drift and tags it `RECENCY_DECAY`, and is false
only when the graph genuinely mutated or the engine differs. Caveat: specified, not yet built -
`[UNVERIFIED]` until someone has watched step 7 of `drill.sh` return `matches_original: true`.

**Break test.** `drill.sh` steps 6–7. Then the harder one: mutate the graph between decision and
replay and confirm the divergence is reported as `GRAPH_MUTATED` with `matches_original: false` -
a replay that always says `true` is proving nothing.

---

### INV-18 - Synthetic, seeded, in-repo corpus only. No private data, ever.

**Invariant.** The graph contains only data produced by `seed.py` from a seeded generator,
committed in the repository. No private, personal, login-gated, paywalled, or scraped real-world
data enters the graph at any point, including during demo recording. Approximate shape:
~40 agents, ~150 sources, ~60 claims, ~20 contested slots, with three hand-crafted set-pieces
(echo chamber, genuinely corroborated, deliberate tie). The authoritative counts are whatever
`GET /health` reports (INV-9), not these targets.

**Basis.** `[VERIFIED]` that this is a hard constraint and a stated disqualifier - `LEDGER.md`
constraint 7, `config.json`, `WINNER-BRIEF.md` §Compliance. `[ASSUMED]` for the corpus target
numbers - they are B1 targets, build-determined.

**Judge's attack.**
> "Your corpus is synthetic and you built the echo chamber yourself. Of course the echo chamber
> scores 1. What have you actually demonstrated?"

**Honest answer.** That is a fair hit and we will not dodge it: the set-pieces are constructed, so
they demonstrate that **the mechanism discriminates**, not that it generalises. What is doing the
work is the pairing - the echo graph returns **1** and the independent graph returns **2** from the
same unchanged code path, and both are published as boot assertions. A system that returned 1 for
everything would also "catch" the echo chamber; the independent control is what rules that out.
What we have not shown is behaviour on a real corpus, and that is listed in `LIMITATIONS.md`
rather than implied away. Synthetic data is also a compliance requirement here, not only a
convenience.

**Break test.** `git ls-files` → the seed and corpus are in-repo. No network fetch in the seed
path. No credential needed to reproduce it.

---

### INV-19 - Fresh code only.

**Invariant.** Nothing is ported from LEASH, 0g-fleet, or any prior project. The repository was
initialised for this hackathon. No prior-work file, module, or doc is copied in.

**Basis.** `[VERIFIED]` that this is a hard constraint - `LEDGER.md` constraint 6,
`WINNER-BRIEF.md` §Compliance, redo-brief §1.

**Judge's attack.**
> "How much of this existed before the hackathon started?"

**Honest answer.** The product code: none. The repo was initialised today and every engine file is
written inside the window. What is **not** fresh, and we would rather say it than have it found:
the orchestration tooling we ran this project with (the `utils/` + `shared-pipeline/` gate scripts,
sourced from a pre-existing worktree, ADR-004) is prior personal infrastructure. It graded our
process; it is not part of MENGER and ships in no artifact.

**Break test.** `git log` first commit is dated today. `grep -rni 'leash\|0g-fleet' <engine
source>` → zero.

---

### INV-20 - `CONTRACT.md` is FROZEN at v1.0. No unilateral amendment.

**Invariant.** `CONTRACT.md` is the single joint artifact between the engine build chat and the
concurrent `design_forge` chat. Neither side changes it alone. A change routes through the master
chat, is announced to both chats, and bumps the version to v1.1. Field names and types in it are
final; both chats build to it with zero further questions.

**Basis.** `[VERIFIED]` that the freeze is in force - `AF-15`, `CONTRACT.md` §5 freeze record.
`[ASSUMED]` that the console can be built from it with no further questions - upstream assumption
`A-F2`, classified **WILL-BREAK if wrong**, mitigated structurally (worked example per endpoint,
`/slots/{key}/graph` exists for the visualisation, node-id conventions frozen, ε/λ/corpus from
`/health`).

**Judge's attack.**
> "Two teams built against each other in parallel with no integration until late. How did the UI
> and the API end up agreeing?"

**Honest answer.** By freezing the interface before either side started, as its own file. The
contract was written first - eight endpoints, exact field names and types, a worked request and
response for each, the DOCKET shape, the complete error table, and an explicit "what the console
may and must not do" section. Both chats consume it; neither amends it; a change is a versioned
amendment through the master chat, not a Slack message. We also pre-empted the one gap that
normally forces mid-build negotiation: `GET /slots/{key}/graph` exists specifically so the
provenance visualisation does not need a new endpoint invented at integration time.

**Break test.** `DS-13` acceptance: the console renders against the real API with **zero**
contract amendments. Any amendment is logged as v1.1 with a reason - a silent edit to a frozen
file is a process break even if the code still works.

---

### INV-21 - The P3 counterfactual is stretch-only, isolated, and deletable.

**Invariant.** `counterfactual.py` imports the resolver and is **imported by nothing**. It is
removable as **one file plus one route** with no change to the spine. `GRAPH.COPY` latency is
**`NOT_CLAIMED`** and must be measured (`DS-10`) before the feature is even considered. Go/no-go is
at `verify_milestone` 16:25 (`DS-11`), not earlier and not by the build chat's own judgement.

**Basis.** `[VERIFIED]` that it is stretch-only - Decision #4 (`R4`), `DS-11`.
**`NOT_CLAIMED`** for `GRAPH.COPY` latency - `VF-W6`, `.law12-feasibility.json#DS-10`
(`load_bearing: false`, never probed, `ts` deliberately empty).

**Judge's attack.**
> "Your README mentions a counterfactual feature. Does it work, and if it is not in the demo, why
> is it in the README?"

**Honest answer.** If it is not in the demo it is not in the README either - that is the rule, not
a reaction to being asked. The counterfactual ("which single source, if removed, flips the most
verdicts") depends on `GRAPH.COPY`, whose latency we have **never measured** and therefore do not
claim. So it is built, if at all, as one file and one route that nothing else imports, behind a
hard 16:25 go/no-go, and it is deleted rather than shipped half-working. Nothing in the spine
touches it, so killing it costs nothing - that isolation was the price of allowing it to exist at
all.

**Break test.** `grep -rn 'counterfactual' <engine source>` → referenced only by its own route.
Delete the file and the route; `drill.sh` steps 1–8 still pass unchanged.

---

### INV-22 - MENGER holds no keys and signs nothing. The keys-off-host path does not apply.

**Invariant.** MENGER is **not** a custody product and **not** a host-signing product. There is no
private key, no wallet, no JWT issuance, no request signing, no credential custody, and no secret
that could be committed. No slice may introduce one. The "keys off the host" demo path - the
standard pattern for a product that signs on a user's behalf - is **structurally not applicable**
here and must not appear in any artifact as a feature, a mitigation, or a roadmap item.

**Terminology trap, stated explicitly:** every occurrence of "key" in this project is either a
**`:Slot` key** (`subject|predicate`), a **Cypher config key** (`weightProp`, `capacityProperty`),
or a **JSON field name**. None of them is cryptographic. A reader skimming `slot_key`,
`weight-key` or `{key}` may mis-read them as such; they are not.

**Basis.** `[VERIFIED]` by construction and by scope - `PLAN.md` §7 "Signing / credential / secret
surface - explicitly NONE in the engine"; `CONTRACT.md` §0 (`Auth: none`, synthetic local/demo
data). The engine requires no `.env` and reaches `gh-falkor` on the loopback with no auth.

**Judge's attack.**
> "Where do the signing keys live, and what stops the host from using them? And relatedly - what
> is your authentication story?"

**Honest answer.** There are no keys, so the question has no attack surface to answer: MENGER
signs nothing and holds no credential of any kind. The honest corollary is the part we are not
proud of - there is also **no authentication**. The API is open, the data is disposable synthetic
corpus, and a deployed instance could be written to by anyone. That is a recorded limitation of a
hackathon artifact (`LIMITATIONS.md`), owned by `deploy`, and it is bounded by the fact that reads
are hard-contained by `GRAPH.RO_QUERY` - a request can create `:Claim`/`:Review`/`:Receipt` nodes
but cannot delete or rewrite the provenance corpus.

**Break test.** No `.env` is required to run the engine. `git ls-files` contains no key material.
`grep -rniE 'private_key|signer|sign\(|jwt|mnemonic|wallet' <engine source>` → zero. If a slice
introduces any of these, `PLAN.md` §7 is wrong and the slice **re-gates**.

---

## LAWS

These are not product invariants. They bind the **agents** building MENGER, and they are the two
rules whose violation has already cost this project once.

### INV-23 - LAW: VERIFY BEFORE CLAIMING. Nothing is reported working until it has been watched working.

**Law.** A status, a row in `SUBMISSION_STATUS.md`, a `[VERIFIED]` tag, or a completion report may
be written **only after** someone has observed the thing do the thing. Specifically:

1. A row flips to `[x]` in `SUBMISSION_STATUS.md` only when someone has watched it work.
2. A slice is not complete until its exit condition in `PLAN.md` §11 has been **run** and its
   output read. No exit, no next slice.
3. "The tests pass" is not a completion claim for a user-visible surface. Engine-side proof is
   `drill.sh` output; the integrated product is proved in **real Chrome**, and the browser is a
   **singleton** driven from the master chat, never delegated to a subagent.
4. A phase status may not be claimed before that phase's enforcement gates have been **run**. Not
   a hand-picked subset of them - the registry.
5. Status strings must come from the declared enum. An out-of-enum value can make gates pass
   **vacuously**, which is worse than failing them.

**Basis.** `[VERIFIED]` - this is not theory. `PULSE.md` forge section, `[CORRECTION]`,
`[CORRECTION-2]`, `[CORRECTION-3]`: the first "forge complete" report was made **before** the
enforcement gates had been run; the first gate run was itself cherry-picked (12 hand-picked scripts
out of a registry of 272 gap functions across 156 scripts plus 25 CLI legs) and missed
`forge-routing-enforce.sh` entirely, which contained a hard `REFUSE-COMPLETE`; and writing the
invented status string `complete-with-open-gates` - outside the enum
`complete|complete_with_blockers|done` - silently made **five** gates return "clean" without
evaluating anything. Correcting it took RED from 10 → 14. `[VERIFIED]` as process law -
`ORCHESTRATION-PROTOCOL.md` §6, "no completion claim without proof".

**Judge's attack.**
> "Your own status file says your first completion claim was unproven when you made it. Why should
> I believe the second one?"

**Honest answer.** Because the second one names the failure instead of replacing it. The first
claim was made before the gates ran, and the record says so - in `PULSE.md` as three numbered
corrections and in `SUBMISSION_STATUS.md` as a standing honesty note. The claim that replaced it
carries the full matrix: 272 gap functions run mechanically, 258 clean, 14 RED, with the open reds
listed and routed by name rather than closed by assertion. We would rather hand you a red count
than a clean sentence. The reason to trust the artifacts is not that we say they are good - it is
that the places they are weak are enumerated in `LIMITATIONS.md` and in the open-blockers list.

**Break test.** For any `[x]` row or `[VERIFIED]` tag, ask: *what command was run, and who read
the output?* If there is no answer, the tag is wrong. Every `[VERIFIED]` claim in `PULSE.md`
carries a `Recompute:` command for exactly this reason - re-run it.

---

### INV-24 - LAW: ESCALATE, DON'T FABRICATE. A missing fact is `NOT_CLAIMED` and it is surfaced.

**Law.** When a fact is not in hand: mark it **`NOT_CLAIMED`**, say what would establish it, and
**surface it** as an open item. Never invent a number, a latency, an address, an API signature, a
model name, or a probe result. `NOT_CLAIMED` is an acceptable and expected answer.

Consequences that are already in force:

- **No endpoint has been built or probed, so every MENGER-originated number is `NOT_CLAIMED`.**
  The only measured values in existence are **upstream engine measurements**: `0.21072` (`AF-3`),
  echo→1 / independent→2 (`AF-6`), 41ms cold / 11ms warm on 1402 nodes / 2400 edges (`AF-7`).
- Every numeric value in a `CONTRACT.md` example response is **illustrative**, labelled as such,
  and must not be quoted anywhere as a result.
- ε = 0.05 and λ = 0.01/hour are `[ASSUMED]` proposed defaults, **unmeasured**.
- `GRAPH.COPY` latency is `NOT_CLAIMED` (`VF-W6`, `DS-10`).
- `.law12-feasibility.json` `reviewer_model` and `producer_model` are **deliberately empty**. LAW#12
  requires a distinct-model reviewer; no model attribution exists anywhere upstream, so writing a
  value would be fabrication. The field is left empty so the gate names the real gap, which is
  routed to `critique` - a fresh-context independent review that can attest its own identity.

**Basis.** `[VERIFIED]` - redo-brief §1; `ORCHESTRATION-PROTOCOL.md` §6;
`.law12-feasibility.json` `model_attribution_note`; `PULSE.md` `VF-F3`, `VF-F4`, `VF-F5`.

**Judge's attack.**
> "These documents are full of specific numbers. Judging here is artifact-only - I cannot run
> anything. How do I know which of them you measured and which you made up?"

**Honest answer.** Because they are tagged, individually, and the tag vocabulary is defined before
it is used. `[VERIFIED]` means a live probe recorded in `.law12-feasibility.json` with evidence and
a timestamp - there are exactly seven, and three numbers come out of them. Everything numeric that
is not one of those three is `[ASSUMED]`, `[UNVERIFIED]`, or explicitly `NOT_CLAIMED`, including
every number in a contract example. We left one field in the feasibility record **empty** rather
than fill it plausibly, and the gate that reads it now reports a gap against us; that is the
cost of the rule, and we paid it rather than make the gate green. If you find a number in these
artifacts without a tag, treat it as a defect and treat the document as less trustworthy for it.

**Break test.** Pick any number in any artifact. It must be traceable to a row in §4
Source-lock, or carry `[ASSUMED]`/`[UNVERIFIED]`, or be labelled illustrative. An untagged
technical claim is a contract violation under the redo brief.

---

### INV-25 - Do not kill `gh-falkor`. Do not commit, push, merge, or stage.

**Invariant.** The container **`gh-falkor`** (`falkordb/falkordb:v4.22.1`) is the live build DB.
Do not stop, kill, restart, or `docker rm` it. Read-only probes against it are fine. It is stopped
at **session end only**.
Separately: `fix/p0-2b` is **not merged**, the push is **HELD**, and nothing is committed or
staged. Merge and push are Dami's call alone.

**Basis.** `[VERIFIED]` - `LEDGER.md` constraints 10 and 11, `R3`; redo-brief §1.

**Judge's attack.**
> *(Operational rather than judicial - the failure this prevents is losing the seeded graph, and
> with it every receipt, mid-build, with no time to re-seed before a hard deadline.)*

**Honest answer.** The build DB is a singleton and a shared resource across concurrent chats.
Restarting it to "get a clean state" destroys the seeded corpus and every receipt generated
against it - which is the same class of loss the durable-tier decision (ADR-016) exists to prevent
in production. Process hygiene cuts the other way too: any process a chat starts, that chat owns
until it kills it. `gh-falkor` is the documented exception, and it is long-running **by design**.

**Break test.** `docker ps` shows `gh-falkor` up with image `falkordb/falkordb:v4.22.1`.
`git status` shows nothing staged; `git log origin/main..HEAD` is not pushed.

---

### INV-26 - Submission compliance: Track 02 sole, AI-assistance disclosed, Cypher artifact separately listed.

**Invariant.** Four submission obligations, each a hard requirement and each separately losable:

| # | Obligation | Source |
|---|---|---|
| 1 | **Track 02 - Agent Memory and Coordination**, declared as the sole track, in the README and on the form | `DS-7` |
| 2 | An **AI-assistance disclosure** section in the README | `DS-6`, `LEDGER.md` constraint 8 |
| 3 | The Cypher queries + algorithms as a **separately listed artifact** - a distinct file, linked from both the README and the form, not inline only | `DS-5` |
| 4 | The README states **ε explicitly** and that the score is **ordinal, not cardinal** | `DS-8` |

**Basis.** `[VERIFIED]` that these are required - `PULSE.md` `DS-5`..`DS-8`, `LEDGER.md`
constraints 8 and 9, `config.json`. `[ASSUMED]` for the six-criteria equal-weight rubric
(`A-I1`) - only derived, never published (`VF-I3`).

**Judge's attack.**
> "Which track is this, what did an AI write, and where are the actual queries? If I have to dig
> through source to find the Cypher, the graph work is a claim rather than an artifact."

**Honest answer.** All four are explicit. Track 02, sole, declared in the README's first screen
and on the form. AI assistance has its own README section - this project was built with heavy
agent assistance and saying otherwise would be a lie you could detect from the commit pattern. The
Cypher lives in its own file, linked from the README and the form, generated from the same
`receipt.cypher[]` text the engine actually executed - so the listed artifact and the running
system cannot drift. And ε plus the ordinal caveat are stated in the README body, not a footnote,
because a judge who misreads the score as a probability has been misled by our omission.

**Break test.** `DS-5`: the distinct file exists and both links resolve. `DS-6`/`DS-7`: present
in README. `DS-8`: `grep -i 'ordinal' README.md` returns the statement. `package` owns all four;
`verify_preflight` confirms them on the form.

---

### INV-27 - Judging is ARTIFACT-ONLY. Every artifact must stand alone.

**Invariant.** There is **no live demo and no judging call**. The README, the ≤180s video, the
separately-listed Cypher artifact, and the form prose **are** the product. Every document is
written for a competent stranger reading it alone, with nobody present to explain it, clarify it,
or soften it. No artifact may depend on a verbal bridge, a follow-up question, or a reader's
goodwill.

**Basis.** `[VERIFIED]` - `AF-10` (intel, overturning an earlier assumption of a live demo).
`[ASSUMED]` that the video cap is 180s (`A-I2`) - treated as a hard cap because shorter is safe
either way.

**Judge's attack.**
> *(The attack is the absence of one - nobody will ask. Every question a judge forms while reading
> is either already answered on the page or silently counted against us.)*

**Honest answer.** This is why the artifacts are shaped the way they are: a judge's attack is
written **beside** every invariant in this file rather than prepared for a Q&A that will never
happen; `LIMITATIONS.md` is deliberately unflattering, because a weakness we name costs less than
one a reader finds; and the boot assertions are published on `GET /health` so the headline claim
is checkable in one request without us in the room. Two phases - `interrogate` and
`demo_rehearsal` - were skipped for exactly this reason: **structurally** inapplicable, not cut for
time. There is nothing for them to prepare.

**Break test.** Hand any artifact to someone with zero project context. If they have to ask a
question to understand what MENGER refuses and why, the artifact has failed and the fix is in the
artifact, not in the answer.

---

## 2. Conflict resolution - what to do when this file and reality disagree

| Situation | Action |
|---|---|
| An invariant blocks a slice from working | **Stop.** The invariant wins. Re-plan the slice. Do not route around the invariant and do not "temporarily" disable it. |
| A boot assertion is red | Fix the **seed** or the **query**. **Never** change the expected value. Changing `1`, `2`, or `0.21072` to match a broken graph is the single worst edit available in this repo. |
| A source contradicts this file | Precedence: `PULSE.md` Active Facts → `CONTRACT.md` v1.0 → this file → `PLAN.md` → everything else. Published FalkorDB docs sit **below** `PULSE.md`; `AF-1`/`AF-2`/`AF-3` already falsified them. |
| Two sources contradict each other and neither is `PULSE.md` | Record both, mark the fact `[UNVERIFIED]`, surface it (see §4 Source-lock, rows L-1 and L-2). Do not pick the convenient one silently. |
| The frozen contract looks wrong | Write the objection as a flagged risk in your own doc. Amendments route through the **master chat only** and bump to v1.1. Never a unilateral edit. |
| A fact is missing | `NOT_CLAIMED` + surface it (INV-24). Never a plausible invention. |
| A gate is red and time is short | Report it red. A red gate routed by name costs less than a green gate that was gamed - see INV-23's basis for what that already cost us. |

---

## 3. Resolved-decisions ledger

Closed. Do not re-litigate. Full ADRs with rejected alternatives in `DECISIONS.md`.

| # | Decision | Ruled by | ADR |
|---|---|---|---|
| 1 | Track 02 primary and sole; contradictions arbitrated by corroboration-depth × recency × source-trust, **computed in Cypher** | Dami (pre-warroom) | ADR-001, ADR-002 |
| 2 | **Not** running under `hackathon-conductor`; Dami drives each chat manually | Dami (pre-warroom) | ADR-003 |
| 3 | Skills from installed main; `utils/` + `shared-pipeline/` from the `fix/p0-2b` worktree. **Merge NOT authorized, push HELD** | Dami (pre-warroom) | ADR-004 |
| 4 | Winner = **P2 reframed as memory admission control** (ALLOW/BLOCK/UNDECIDED; UNDECIDED → review queue). **P5 DOCKET receipts MANDATORY.** P3 = stretch only. P4 + P6 killed. P7 declined | Dami (pool_checkpoint) | ADR-005, ADR-018 |
| 5 | `cross_exam` + `challenge` + `demo_scripts` collapsed into the WINNER-BRIEF risk register | master-chat | ADR-006 |
| 6 | The console is funded by **parallelism**, not a scope cut. Nothing committed is cut | Dami | ADR-007 |
| 7 | **`design_forge` runs IN FULL**, in its own chat, concurrent with the engine build | Dami | ADR-008 |
| 8 | SKIP `url_preverify`, `stress_test`, `polish`, `interrogate`, `demo_rehearsal`. FOLD `debug`+`wire` → build, `livetest` → deploy | master-chat | ADR-009 |
| 9 | Cross-chat orientation is **mandatory**: `LEDGER.md` first, every chat, + `ORCHESTRATION-PROTOCOL.md` + `PULSE.md` read-on-entry / append-on-exit | Dami | ADR-010 |

Decisions the record shows but the log never wrote up - all now ADRs: Python over TypeScript
(ADR-011) · the `SPpaths`/`maxFlow` re-cut (ADR-012) · node-split (ADR-013) · freezing the
contract before the plan prose (ADR-014) · boot assertions as a public surface (ADR-015) ·
the stateful durable tier with `spendApproved: false` (ADR-016) · `GRAPH.COPY` deliberately not
load-bearing (ADR-017) · `/review` read-only in v1.0 (ADR-019) · three components + ordinal flag
instead of one confidence (ADR-020) · no test framework, assertions in the boot path (ADR-021) ·
the node-split made visible in `/slots/{key}/graph` (ADR-022).

---

## 4. Source-lock manifest - which facts are pinned, and to what

**`[VERIFIED]` - live probes. These, and only these, are measured.**

| Fact | Value | Pinned to | Probed |
|---|---|---|---|
| `algo.dijkstra` / `algo.SCC` absent; real procedure set | 11 procedures, named in INV-3 | `AF-1` · `VF-W5` · `.law12-feasibility.json#AF-1` · `CALL dbms.procedures()` | 2026-10-18 ~12:40 |
| Weighted shortest path procedure | `algo.SPpaths({sourceNode,targetNode,relTypes,weightProp})` | `AF-2` | 2026-10-18 ~12:45 |
| **Only** `weightProp` works; wrong keys silently return hop count | - | `AF-3` · `.law12-feasibility.json#AF-3` | 2026-10-18 ~12:45 |
| Control fixture path weight | **`0.21072`** | `AF-3` · `DS-2` · boot check `sp_path_weight` | 2026-10-18 ~12:45 |
| `algo.maxFlow` signature; **exactly one** relationship type | see INV-4 | `AF-4` · `.law12-feasibility.json#AF-4` | 2026-10-18 ~12:50 |
| `algo.pageRank` is two positional args | `algo.pageRank(label, relType)` | `AF-5` | 2026-10-18 ~12:50 |
| Unit-cap maxFlow counts **edge**-disjoint, not vertex-disjoint | - | `AF-6` · `VF-W1` · `.law12-feasibility.json#AF-6` | 2026-10-18 ~12:55 |
| Node-split fixes it in **both** directions | echo → **1**, independent → **2** | `AF-6` · `VF-W2` · boot checks `node_split_echo` / `node_split_independent` | 2026-10-18 ~12:55 |
| maxFlow latency at scale | **41ms cold / 11ms warm** on 1402 nodes / 2400 edges | `AF-7` · `VF-W3` · `.law12-feasibility.json#AF-7` | 2026-10-18 ~13:00 |
| `GRAPH.RO_QUERY` containment | `CREATE` rejected server-side, `MATCH` allowed | `AF-8` · `VF-W4` · `.law12-feasibility.json#AF-8` | 2026-10-18 ~13:05 |
| Engine version | `falkordb/falkordb:v4.22.1` | `AF-9` · `VF-I1` · `MODULE LIST` | 2026-10-18 ~11:00 |
| TS client lacks `RO_QUERY` | - | FalkorDB issue **#408** | upstream report |
| Judging is artifact-only | no live demo, no call | `AF-10` (intel) | - |
| Name collision probe | `menger+falkordb` → 0, `menger+agent+memory` → 0, `admission+control+falkordb` → 0 | `AF-11` · L12 GitHub repo search | 2026-10-18 |

**`[ASSUMED]` - proposed, unmeasured. Do not present as results.**

| Fact | Value | Why assumed | Resolves |
|---|---|---|---|
| ε (epsilon band) | `0.05` | proposed default; never measured | calibrated in B2; `/health` is the operative value (`DS-14`) |
| λ (recency decay) | `0.01`/hour | proposed default; never measured | calibrated in B2; `/health` is the operative value |
| ε puts the seeded tie inside the band | - | `A-F3`, NICE-TO-HAVE | B2 calibration against the tie set-piece |
| Corpus counts | ~40 agents / ~150 sources / ~60 claims / ~20 slots | B1 targets, build-determined | `GET /health` → `corpus` |
| Panel reads "admission control" as bounded | - | `A-W2`, **WILL-BREAK if wrong** | framing discipline only (`DS-4`, `R-2`) |
| Six judging criteria, equally weighted at 16.7% | - | `A-I1`; rubric is **derived, not published** (`VF-I3`) | unresolvable - no rubric exists |
| Video cap | ≤180s | `A-I2` | treated as hard; shorter is safe either way |
| Console buildable from the contract alone | - | `A-F2`, **WILL-BREAK if wrong** | `DS-13` - zero amendments at integration |

**`NOT_CLAIMED` - absent, deliberately.**

| Fact | Why | Owner |
|---|---|---|
| **Every MENGER endpoint behaviour, latency, and verdict output** | no endpoint has been built or probed | `build` (`VF-F3`) |
| Every numeric value in a `CONTRACT.md` example response | labelled illustrative; shapes are frozen, numbers are not results | `CONTRACT.md` §5 (`VF-F5`) |
| `GRAPH.COPY` latency | never probed; stretch-only, deliberately not load-bearing | `DS-10` · `VF-W6` |
| `producer_model` / `reviewer_model` in `.law12-feasibility.json` | no model attribution exists upstream; a value would be fabrication | routed to `critique` |
| End-to-end request latency for `POST /remember` | not built. `AF-7` measures **`maxFlow` only**, not the endpoint | `build` |
| Behaviour on a non-synthetic corpus | no real corpus exists or will | out of scope |

**Contradictions found between sources - unresolved, for a human.**

| ID | Contradiction | Status |
|---|---|---|
| **L-1** | λ default: `CONTRACT.md` §2.3/§2.5/§2.8 examples show `lambda: 0.0077`; `PLAN.md` §5 + §12 and the redo brief say the proposed default is `0.01`/hour. | `[UNVERIFIED]` both ways - both values are unmeasured and the operative value is whatever `/health` reports (INV-9), so **no artifact is load-bearing on either**. Flagged rather than silently reconciled; the contract is FROZEN and this is not worth a v1.1. **`build` must pick one and publish it; `package` must copy it from `/health`, never from a doc.** |
| **L-2** | Stretch-gate time: `WINNER-BRIEF.md` says the P3 counterfactual is gated at **14:45**; `PULSE.md` `DS-11` and `LEDGER.md` §3 say **16:25**. | Later record wins: **16:25**, per `DS-11` and the `LEDGER.md` schedule (`PLAN.md` §11 is rebased on the 14:30 start). The brief's 14:45 is stale. |
| **L-3** | Upstream defect, not ours and not inherited silently: `config.json` asserts `roster_audit.discovered = true` but `research/roster-audit/strategy-density.md` does not exist. | `intel` claimed complete with this gate red. Surfaced in `PULSE.md` forge section; **needs an owner.** |

---

## 5. Claim state of this document

This file makes **no new `[VERIFIED]` claims.** Every measured number in it is inherited and
attributed to a row in §4. No code in it has been written or run by its author. The invariants are
obligations on `build`, `design_forge`, `verify_milestone`, `package`, and `demo` - each one
either enforced in the artifacts or listed in `LIMITATIONS.md` as not enforced.

**27 invariants · 27 judge's attacks · one-to-one.**
