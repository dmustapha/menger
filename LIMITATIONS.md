# LIMITATIONS — MENGER · what it does not do, cannot do, and has not proven

> **Why this file exists and why it is blunt.** Judging on this hackathon is **artifact-only**
> `[VERIFIED]` (AF-10): no live demo, no call, nobody in the room. A judge reads this document
> directly, with nobody present to soften it. So it is written to be read cold, by a sceptic, and
> it is deliberately unflattering. Every limitation a reader could find on their own is better
> stated here first — a project that names its own boundaries is making a claim about its
> judgement, which is the only thing left to assess once the mechanism is understood.
>
> **Nothing here is hedging.** Each entry says what the boundary is, why it exists, what it costs,
> and — where there is one — what the honest workaround is.
>
> **Tag law.** `[VERIFIED]` means a live probe in `.law12-feasibility.json` or a `PULSE.md`
> `AF-n` row backs it. `[UNVERIFIED]` and `[ASSUMED]` mean exactly what they say.
> **`NOT_CLAIMED`** means we do not have the fact and are not going to produce one.
>
> Last updated: 2026-10-18 · owner: forge (agent D) · companions: `INVARIANTS.md` (the laws),
> `DECISIONS.md` (the ADRs), `SUBMISSION_STATUS.md` (built vs not).

---

## 0. The short version

If you read one section, read this one.

1. MENGER decides **admissibility**, never **veracity**. It cannot tell you which claim is true.
2. The score is **ordinal**. Magnitudes mean nothing; only the within-slot margin against ε does.
3. Trust weights are an **input** MENGER consumes and does not derive. Garbage in, confident
   garbage out.
4. A **sophisticated laundered echo** — one that enters through genuinely distinct vertices —
   scores as independent. By construction.
5. The corpus is **synthetic and seeded**. No real-world data has ever passed through this system.
6. **No MENGER endpoint had been built or probed** when these documents were written, so **every
   MENGER-originated number is `NOT_CLAIMED`**. The only measured values in existence are three
   upstream engine measurements.
7. The **`GRAPH.COPY` counterfactual (P3)** is stretch-only, un-probed, and its latency is
   `NOT_CLAIMED`.
8. This project's own process failed once in a specific, documented way, and the record of that is
   in §10.

---

## 1. Scope: admissibility, never veracity

**MENGER cannot tell you whether a claim is true.** It has no access to the world. It reads a
provenance graph and answers a narrower question: *given how this claim arrived, is it admissible
to this memory slot relative to what is already there?*

The verdict is composed from three graph quantities `[VERIFIED]` as the mechanism (AF-3, AF-4,
AF-6):

- **`independence`** — how many **vertex-disjoint** origin→claim chains support it. Menger's
  theorem over a node-split DAG.
- **`reliability`** — the best-trust provenance path, as `exp(-pathWeight)` over `-ln(trust)`
  edges.
- **`recency`** — `exp(-lambda * age_hours)`.

None of those is a truth signal. A claim with five independent, high-trust, recent sources can be
false; one with a single stale source can be correct. MENGER will **ADMIT** the first and
**REFUSE** the second, and it will be right about admissibility and silent about correctness. That
is the designed boundary, not a gap we intend to close
(`DECISIONS.md` ADR-005, `INVARIANTS.md` INV-12).

**What this costs you.** MENGER is not a fact-checker and not a hallucination detector. A
coordinated set of agents all citing the same false-but-well-sourced claim will get it admitted.
MENGER's contribution is that the admission is **explained and replayable** (`DECISIONS.md`
ADR-018) — you can see exactly which chains carried it, and withdraw the source if you later learn
better. It makes a bad write **auditable**, not impossible.

**The attack and the answer.** *"So it's a confidence score with extra steps?"* No — it is an
admission decision with a published band, and the thing it measures (source independence) is a
structural property of the provenance graph, computed by the engine, not an estimate. But it is
also not truth, and this document is where we say so rather than let the README imply otherwise.

---

## 2. The score is ordinal — cross-slot comparisons are meaningless

`score = independence * reliability * recency` is a product of an integer path count and two
exponential decay terms. It **orders** claims within one slot. It does not measure anything.

Every scored object carries **`score_is_ordinal: true`** `[VERIFIED]` as frozen contract text
(`CONTRACT.md` §0 ground rule 2), and the console is contractually forbidden from rendering it as
a percentage, a confidence, or a probability `[VERIFIED]` (`CONTRACT.md` §4).

**Concretely, what is meaningless:**

- A score of `1.5002` in slot A is **not** "better supported" than `0.5220` in slot B. Different
  slots have different source populations, different chain depths and different ages. The numbers
  are not on a shared scale `[UNVERIFIED]` — the example values are illustrative contract
  examples, not measurements.
- A score is not a probability. There is **no calibration** behind it: no labelled outcomes, no
  held-out set, no reliability diagram. Calibrating it would require ground truth about which
  claims were actually correct — i.e. veracity, which §1 says we do not have.
- "Score went up 20%" is not a statement about anything.

**What *is* meaningful:** the **margin** between an incoming claim and the best incumbent **in the
same slot**, compared against ε:

```
margin  >  +epsilon   ->  ALLOW      status ADMITTED
margin  <  -epsilon   ->  BLOCK      status REFUSED
|margin| <= epsilon   ->  UNDECIDED  status QUEUED  (a (:Review) node is written)
```

`[VERIFIED]` as the frozen normative rule (`CONTRACT.md` decision-rule block).

**The honest discomfort here.** An ordinal score multiplied from three terms has no principled
reason to be a *product* rather than a weighted sum, a lexicographic ordering, or a Pareto
front. The product was chosen because it is monotone in all three components and because any
component going to zero should dominate — a claim with zero independent chains should not be
rescued by being recent. That is a defensible choice, **not a derived one** `[ASSUMED]`. A
different blend would produce a different ordering, and we have not measured which ordering is
better, because measuring that needs the ground truth we do not have.

---

## 3. Trust weights are an input, not an output

`reliability` runs over edges weighted `nl = -ln(trust)`. The `trust` values come **from outside
MENGER**. In this submission they are **assigned by the seed script** `[ASSUMED]` — chosen by us,
to make the set-pieces legible.

**MENGER does not derive, learn, calibrate, or update trust.** There is no feedback loop from
outcomes back into source trust. A source that has been wrong ten times keeps whatever weight it
was given.

**Why this is the most under-examined part of the design.** `reliability` is one of three
components in every verdict, and it is a direct function of numbers a human picked. The
independence component is structural and hard to game (see §4 for the exception); the recency
component is mechanical. **Reliability is the soft one.** Change the trust assignments and
verdicts change, and nothing in the system objects.

**What it would take to fix.** Outcome labels per source over time — which claims from this source
were later withdrawn or corrected — plus a credit-assignment rule. That is a research problem, not
a hackathon slice, and it would move MENGER toward veracity, which §1 says is out of scope.

**The honest workaround today.** Trust is a *declared policy input*, and the DOCKET receipt carries
the per-node trust values that produced the verdict `[VERIFIED]` as frozen contract text
(`CONTRACT.md` §2.4 / §2.5). So the verdict is **auditable against the policy**: you can see that
the gate applied the trust it was given. You cannot see that the trust was correct.

---

## 4. It cannot detect a sophisticated laundered echo

This is the most important limitation in the document, because it is a limitation of the headline
mechanism.

MENGER catches the **naive echo**: two citation chains that both pass through **one shared
source**. The node-split makes that structurally visible — the shared source is a single
`SourceIn`→`SourceOut` pair with capacity 1, so max-flow through it is **1**, not 2
`[VERIFIED]` (AF-6, the echo control). That is real, it is asserted at every boot, and it is the
quantity the headline claims (`DECISIONS.md` ADR-013).

**What it does not catch.** An adversary who launders a claim through **genuinely distinct
vertices** — two independent-looking sources that each independently restate the same original
assertion, with no shared vertex in the provenance DAG — produces a graph that is *actually*
vertex-disjoint. Max-flow returns 2. MENGER scores it as independent, because by the only
definition MENGER has, **it is**.

Menger's theorem is a theorem about the **graph it is given**. If the graph says two chains are
vertex-disjoint, they are vertex-disjoint. Whether the two origins are *epistemically* independent
— whether they are two newspapers that both read the same press release — is not a graph property
of the provenance DAG as recorded. It is a property of the world.

**Severity.** High, and intrinsic. There is no version of this design that fixes it, because
fixing it means knowing that two unrelated-looking sources share an unrecorded upstream — which is
either (a) a missing edge in the provenance graph, in which case the fix is better provenance
capture upstream of MENGER, or (b) a veracity judgement (§1).

**What we do instead of pretending otherwise:**

- MENGER's claim is precisely *"source independence as recorded in the provenance graph"*, never
  *"source independence in the world"*.
- The DOCKET receipt publishes the **max-flow witness set** — the actual vertices the flow ran
  through `[VERIFIED]` as frozen contract text. A human looking at a suspicious ALLOW can read the
  witness set and notice that both "independent" origins are, say, two mirrors of the same feed.
  MENGER cannot notice that. It can show you where to look.
- Better provenance capture upstream — recording the press release as a vertex — fixes the
  specific instance. That is a data-collection improvement, not a MENGER feature.

---

## 5. The corpus is synthetic, seeded, and built to be legible

The demo corpus is roughly **40 agents / 150 sources / 60 claims / 20 slots** `[ASSUMED]` — the
shape specified in `PLAN.md`, not a measured count of a built artifact; the seed had not been
written when this document was authored. It contains **three set-pieces**: the echo case, the
independent case, and a near-tie that lands inside the ε band.

**No real data has ever passed through this system.** Not a sample, not an anonymised extract.
Synthetic and seeded only, committed in-repo, no private data `[VERIFIED]` as a project constraint
(`LEDGER.md` §5 constraints 6 and 7).

**What that means for every behavioural claim.** The corpus was designed by the same people who
designed the mechanism, to exhibit the mechanism. That is exactly the condition under which a
system looks good and proves little. Specifically:

- The three set-pieces demonstrate that the mechanism **can** distinguish echo from independent
  `[VERIFIED]` at the engine level (AF-6). They do not establish any **rate** — no precision, no
  recall, no false-positive rate. Those are `NOT_CLAIMED`.
- Graph **shape** in the wild is unknown to us. Real provenance DAGs may be far deeper, far wider,
  cyclic (see §7), or dominated by a handful of mega-sources. MENGER's behaviour on those shapes
  is `NOT_CLAIMED`.
- The near-tie set-piece lands inside ε **because ε was chosen to contain it, or it was built to
  land there** `[ASSUMED]`. Either way it is a demonstration of the UNDECIDED path, not evidence
  that ε = 0.05 is a good threshold.

**The honest framing.** The corpus proves the *plumbing* end to end — a write arrives, a graph
query runs, a verdict is decided, a receipt is recorded and replays. It is not evidence about
performance on real memory graphs, and nothing in the submission should be read as if it were.

---

## 6. ε and λ are unmeasured defaults, and there is a live discrepancy

**ε = 0.05** and **λ = 0.01/hour** are **proposed, unmeasured defaults** `[ASSUMED]`. They were
not derived, fitted, or tuned. They are starting values, calibrated in build slice B2 and
published by `GET /health` `[VERIFIED]` as the frozen contract rule (AF-17 / DS-8 / R-4).

They matter a great deal. ε is the entire width of the UNDECIDED band — it decides how many writes
get a verdict and how many get queued. λ sets how fast a claim's support decays; at
λ = 0.01/hour, `recency` falls to ~0.5 at about 69 hours `[ASSUMED]` (arithmetic on an assumed
constant, not a measurement). A λ an order of magnitude out would make recency either
irrelevant or dominant. **Neither value has been validated against anything.**

**Live discrepancy (recorded as L-1 in `INVARIANTS.md` §4):** `CONTRACT.md`'s illustrative examples
show **`lambda: 0.0077`**, while `PLAN.md` and the forge dispatch brief propose **`0.01/hour`**.
Both are unmeasured, no artifact is load-bearing on either, and `CONTRACT.md` is FROZEN at v1.0
and being consumed live by two chats — so it was **not** amended to settle a discrepancy between
two guesses (`DECISIONS.md` ADR-014). The resolution rule is operational: **`build` picks one, and
`GET /health` is the only authoritative source.** `package` must copy the value **from `/health`**,
never from a document, including this one.

**What a reader should take from this.** If a number for ε or λ appears in any MENGER document,
treat it as a placeholder. The running service's `/health` output is the fact; the documents are
proposals.

---

## 7. Deliberate functional omissions

These are things a reasonable reader will look for and not find. Each was a decision, not an
oversight.

| Not built | Why | Record |
|---|---|---|
| **Circular-citation detection** | `algo.SCC` **does not exist** in FalkorDB v4.22.1 `[VERIFIED]` (AF-1). `WCC` is undirected and answers a different question; substituting it would ship a wrong answer with a confident name. Hand-rolling Tarjan was unjustifiable on this schedule. **A provenance graph containing citation cycles will not be flagged.** | `DECISIONS.md` ADR-012 |
| **Resolving a review item** | `GET /review` is **read-only in v1.0** `[VERIFIED]` as frozen contract text (`CONTRACT.md` §2.7). Resolution is a human write on the basis of veracity (§1), and it needs identity, authorisation and an override audit trail that do not exist. **UNDECIDED items queue visibly and stay queued.** | `DECISIONS.md` ADR-019 |
| **Auth, multi-tenancy, rate limiting** | Out of scope. `429 RATE_LIMITED` is **reserved in the error table and unimplemented** `[VERIFIED]` as frozen contract text. Any deployed instance is open. | `PLAN.md` §10 |
| **A test framework** | No pytest, no suite, no coverage number. Tests are executable assertions in the boot path plus two scripted drills — chosen because an assertion in the boot path cannot be skipped and is judge-visible via `/health`. **There is no regression suite; refactoring this code is riskier than normal.** | `DECISIONS.md` ADR-021 |
| **Caching, batching, any performance work** | Budgeted at zero. The engine measures 41ms cold / 11ms warm at a scale **larger** than our corpus `[VERIFIED]` (AF-7), so the engine is not the constraint. If something is slow it is per-pair orchestration. **No performance claim is made.** | `PLAN.md` §10 |
| **`algo.betweenness`, `algo.pageRank`, `algo.AStar`, `algo.WCC`** and the rest of the v4.22.1 set | Only `maxFlow` and `SPpaths` are used. `betweenness` was dropped as the wrong selector (`WINNER-BRIEF.md` correction #3). Breadth of algorithm use is not a goal; fitness is. | `PLAN.md` §10 |
| **P4, P6, P7** | Killed / declined at `pool_checkpoint`. Not revisited, not referenced anywhere. | `LEDGER.md` R4 |

**Signing, credentials, custody — explicitly none.** MENGER **holds no keys and signs nothing.**
It is not a custody product and not a host-signing product. There is no wallet, no private key, no
signature, no secret in the request path. Consequently the "keys-off-host" demo path that applies
to custody projects **does not apply here** `[VERIFIED]` as a project-scope statement
(`PLAN.md` §7 security table; `INVARIANTS.md` INV-22). Where the word "key" appears in MENGER's
artifacts it means a `:Slot` key, a Cypher configuration key such as `weightProp`, or a JSON field
name — never a cryptographic key. This is stated because the word collides, and a judge skimming
for a security surface should find a clear negative rather than an ambiguity.

---

## 8. What has not been built, probed, or measured

**The honest headline: no MENGER endpoint had been built or probed when these documents were
written.** `SUBMISSION_STATUS.md` carries the full built-vs-not register; this is the
consequence for every number in the submission.

### The only measured numbers that exist

| Value | What it measures | Tag |
|---|---|---|
| `0.21072` | `algo.SPpaths` `pathWeight` on the control fixture, with the key `weightProp` | `[VERIFIED]` (AF-3) |
| `echo → 1`, `independent → 2` | `algo.maxFlow` over the node-split DAG, the two boot controls | `[VERIFIED]` (AF-6) |
| `41ms` cold / `11ms` warm | Engine query latency at 1402 nodes / 2400 edges | `[VERIFIED]` (AF-7) |

All three are **upstream engine measurements**, taken against the pinned container
`falkordb/falkordb:v4.22.1` `[VERIFIED]` (AF-9). None of them is a MENGER endpoint measurement.

### Everything else: `NOT_CLAIMED`

- **MENGER request latency** — `POST /remember`, `GET /slots/{key}/graph`, receipt fetch, replay.
  No endpoint existed to time. `NOT_CLAIMED`.
- **Throughput, concurrency, sustained-load behaviour.** `stress_test` was skipped `[VERIFIED]`
  as a recorded decision (`LEDGER.md` §3, `DECISIONS.md` ADR-009), and there was no deployed
  endpoint to load. `NOT_CLAIMED`.
- **Cold-start time on the deployed tier.** `NOT_CLAIMED`.
- **`GRAPH.COPY` latency** — see §9.
- **Precision, recall, or any accuracy rate** on echo detection. Three set-pieces are a
  demonstration, not a measurement (§5). `NOT_CLAIMED`.
- **Scaling behaviour** beyond 1402 nodes / 2400 edges. `NOT_CLAIMED`.
- **Model attribution for the probes** — see §10.

**Why these are `NOT_CLAIMED` and not estimated.** A plausible invented number is a
project-ending defect on an artifact-only judging surface, because the documents *are* the
product and there is nobody present to qualify a figure. Deriving a latency estimate from AF-7
would be fabrication: AF-7 measures a query on a live graph, which is not the quantity.
`NOT_CLAIMED` is the correct output (`INVARIANTS.md` INV-24).

---

## 9. The `GRAPH.COPY` counterfactual (P3) is stretch-only and un-probed

The most interesting demo beat — fork the graph, delete one source in the fork, re-run the verdict,
show what the decision **would have been** without that source — is **not committed scope**.

- **It has never been probed.** `.law12-feasibility.json` records DS-10 with
  **`load_bearing: false`** and an **empty `ts`** `[VERIFIED]` as a record of its own absence. The
  file says out loud that we did not run it.
- **Its latency is `NOT_CLAIMED`.** Cloning a graph, on a starter tier, at demo scale — we have no
  measurement and will not estimate one.
- **It is architected to be deleted.** One file (`counterfactual.py`), one route registration.
  Nothing on the spine imports it; if anything ever does, the isolation is broken and the stretch
  is dead on the spot `[UNVERIFIED]` as a design commitment (`PLAN.md` C8). Go/no-go at the
  **16:25** `verify_milestone` gate.
- **Stretch-gate time discrepancy (L-2):** `warroom/WINNER-BRIEF.md` says 14:45 and is **stale**;
  `PULSE.md` DS-11 and `LEDGER.md` §3 say **16:25**, and the later record wins. Recorded in
  `INVARIANTS.md` §4 rather than silently corrected in the brief.

**If you are reading the submission and P3 is described as working, it was watched working after
16:25.** No artifact claims it works before that point (`INVARIANTS.md` INV-23,
`DECISIONS.md` ADR-017).

---

## 10. Process limitations — how this project's own method failed

Included because the verify-before-claiming law (`INVARIANTS.md` INV-23) would be decoration
without the record that produced it, and because a reader who finds this in the git history anyway
should find it here first.

### 10.1 A completion claim was made before it was proven

**The first "forge complete" report was made *before* forge's enforcement gates had been run. They
were run only after Dami asked whether they had been. The completion claim was unproven at the
moment it was made** — carried verbatim in substance from `SUBMISSION_STATUS.md`'s Honesty note
`[VERIFIED]` as a record.

Two further corrections followed, both recorded as numbered `[CORRECTION]` entries in `PULSE.md`
`[VERIFIED]` as a record:

1. **The first gate run was self-selected.** It ran **12 hand-picked scripts** out of a registry of
   **272 gap functions across 156 scripts**, and missed `forge-routing-enforce.sh`, which held a
   hard **`REFUSE-COMPLETE`**. Self-selected scope is not scope.
2. **An invented status string silently vacuated five gates.** The value
   `complete-with-open-gates` falls **outside** the permitted enum `complete | complete_with_blockers | done`.
   Five gates that matched on status **passed vacuously** — they did not fire, and a non-firing gate
   reports as a clean one. Correcting the string took the RED count from **10 → 14**.

**What a reader should conclude.** Not that the artifacts are untrustworthy — the correction
mechanism worked, and the corrections are published rather than buried. But the first claim of
completion in this project was wrong, which is why `INVARIANTS.md` makes "nothing is reported
working that has not been watched working" a numbered law rather than a sentiment, and why
`SUBMISSION_STATUS.md` flips a row to `[x]` only when someone has watched it work.

### 10.2 Reviewer independence is not established (LAW #12)

All seven load-bearing probes are recorded with evidence and timestamps `[VERIFIED]`. But
**`producer_model` and `reviewer_model` in `.law12-feasibility.json` are deliberately empty**
`[VERIFIED]` as a record, with an explicit `model_attribution_note`: no model attribution exists
anywhere upstream, so writing a value would be fabrication. The gap is **named** and routed to
`critique` as the independent reviewer.

**The limitation stands as stated:** the probes have not been independently reviewed by an
attributable second model at the time of writing. An empty field that says why it is empty is the
honest form of this, but it is still a gap.

### 10.3 Open items a human must resolve

From `SUBMISSION_STATUS.md` and `INVARIANTS.md` §4, carried here because they are limitations of
the submission as it stands:

| Item | State |
|---|---|
| **Doc-depth floor** | forge's narrowed 30-minute dispatch collided with a scope-mode-**invariant** 1000-line doc floor. Not padded shut. **Awaiting Dami's ruling.** |
| **`ROUTE-ARCHITECTURE.md` + `USER-ONBOARDING.md`** | Nominally forge's; writing them in forge would pre-empt `design_forge`'s in-full dispatch. **Recommended → `design_forge`** (`DECISIONS.md` ADR-008). |
| **`.forge-critical-review.json`, the MD-7 semantic escalation, `.gate-verdict.json`** | Model-judgement gates a shell script cannot answer. Routed to `critique`. |
| **`HANDOFF.md`** | Needs a commit SHA. There is no commit: the push is **HELD** and `fix/p0-2b` is not authorized to merge (`DECISIONS.md` ADR-004). Routed to `package`. |
| **`durability-tier.json` → `spendApproved: false`** | `deploy` **BLOCKS** until Dami approves $8/mo. **The block is intended, not a defect** (`DECISIONS.md` ADR-016). |
| **Upstream, L-3** | `config.json` asserts `roster_audit.discovered = true` but `research/roster-audit/strategy-density.md` **does not exist**. `intel` claimed complete with that gate red. **Needs an owner.** |

---

## 11. What MENGER is good at

Stated last, briefly, and without inflation — because a limitations document that gives no sense
of the remaining value is not honest either, it is just pessimistic.

MENGER does one thing that is hard to do any other way: it turns **"is this write admissible?"**
into a **graph computation the engine performs**, and then hands back a **receipt that can be
re-executed**. Source independence is Menger's theorem over a node-split DAG — a structural
property, not an estimate (`DECISIONS.md` ADR-013). Source reliability is a weighted shortest path
over `-ln(trust)` edges. Both are computed by `algo.maxFlow` and `algo.SPpaths` inside FalkorDB
`[VERIFIED]` (AF-3, AF-4, AF-6), which is why removing the graph database does not make MENGER
slower — it removes the output entirely.

And the two ways the mechanism can silently produce a plausible wrong number — a bypassed
node-split, a wrong `SPpaths` weight key — are asserted at every boot and **published on
`GET /health`**, where the service returns **503 `BOOT_ASSERTION_FAILED`** and refuses to serve
rather than serve a wrong headline number `[VERIFIED]` (AF-16). A stranger can check the headline
mechanism in one HTTP request, which on an artifact-only judging surface is the point.

Everything above this section is what that does **not** buy you.
