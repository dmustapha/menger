# FORGE REDO — shared brief (read this FIRST, in full, before writing anything)

**Why this exists.** forge was dispatched in a 30-minute box and produced 2 of 12 artifacts.
I then ran 272 enforcement gates against those 2 thin artifacts and reported the audit as if it
were the work, and asked for a WAIVER on the doc-depth floor. Dami rejected that: **"redo
everything. the whole forge process."** A narrowed dispatch shrinks the slice COUNT, never the
floor — forge's own SKILL.md says it: *"fewer cycles, never fewer gates."*

So: produce the real artifact suite, at depth, so the gates pass **on merit**. No waivers will be
requested. No padding either — length comes from substance or not at all.

---

## 1. Hard constraints — violating ANY of these loses the hackathon

- **NO FABRICATION.** Do not invent probe results, timings, latencies, addresses, SDK calls, or
  API behaviour. If you need a fact you do not have, derive it from the sources below or mark it
  **`NOT_CLAIMED`**. `NOT_CLAIMED` is an acceptable, expected answer. A plausible invented number
  is a project-ending defect, because judging is artifact-only (AF-10) — the docs ARE the product.
- **Every technical claim carries a tag: `[VERIFIED]`, `[UNVERIFIED]`, or `[ASSUMED]`.** A missing
  tag is a contract violation. `[VERIFIED]` means a live probe recorded in
  `/Users/MAC/graph-hacks/.law12-feasibility.json` or a PULSE `AF-n` row backs it — nothing else.
- **Do NOT touch `CONTRACT.md`.** It is **FROZEN at v1.0** and two other chats (engine build,
  design_forge) are consuming it live. If you believe it is wrong, write the objection into your
  own doc as a flagged risk. Amendments route through the master chat only and bump to v1.1.
- **Do NOT commit, push, merge, or stage anything.** The push is HELD; merging `fix/p0-2b` is not
  authorized. Write files only.
- **Do NOT stop, kill, restart, or `docker rm` the container `gh-falkor`.** It is the live build DB
  (image pinned `falkordb/falkordb:v4.22.1`). Read-only probes against it are fine.
- **Fresh content only.** Nothing ported from LEASH or 0g-fleet. Synthetic seeded data only,
  committed in-repo. No private data, no real user data.
- **Do not redesign the mechanism.** The winner is ruled. You are documenting and specifying it at
  depth, not re-litigating it. If you find a genuine flaw, flag it as a risk — do not silently fix.
- **Do not write files other than the ones your task names.** No cross-writing; a sibling agent
  owns each of the others.

## 2. Banned wordings (these are graded; a single instance is a defect)

| Never write | Why | Write instead |
|---|---|---|
| "stored procedure" | FalkorDB has none. Saying it marks us as not having used the product. | **"a single parameterised Cypher query"** |
| "detects conflicts" | That is agentmesh's claim, not ours. | **"refuses"** / **"admission control"** |
| "truth" / "verifies truth" | Overreach we cannot support. | **"admission control"**, "source independence" |

MENGER decides **admissibility**, never veracity. Keep every sentence inside that boundary.

## 3. The project — MENGER

An **admission-control gate on agent memory**. `POST /remember` returns **ALLOW / BLOCK /
UNDECIDED** with a replayable **DOCKET receipt** per verdict.

Scoring (all three surfaced **separately**, never pre-blended):
- `independence` (int) — `algo.maxFlow` over a **node-split** provenance DAG. Menger's theorem:
  max-flow = number of **vertex-disjoint** origin→claim chains = source independence.
- `reliability` — `algo.SPpaths` with **`weightProp`** over edges weighted `nl = -ln(trust)`;
  `reliability = exp(-pathWeight)`.
- `recency` — `exp(-lambda * age_hours)`.
- `score = independence * reliability * recency`, and it is **ORDINAL, NOT CARDINAL**. Every scored
  object carries `score_is_ordinal: true`. Verdict is decided by an **epsilon-band** rule.

### Non-negotiables (these are the invariants; breaking one breaks the product)
- **DS-1: node-split is non-negotiable.** Without it `maxFlow` counts *edge*-disjoint paths, which
  is the wrong quantity — an echo through one shared source would score as independent.
- **DS-2 / AF-3: only the key `weightProp` works** on `algo.SPpaths`. `weightProperty`,
  `relationshipWeightProperty`, `costProperty` are accepted **silently** and return **hop count** —
  a wrong key yields a plausible wrong number with no error.
- **AF-1: `algo.dijkstra` and `algo.SCC` DO NOT EXIST** in FalkorDB v4.22.1. Never reference them.
  The real set: AStar, BFS, HarmonicCentrality, MSF, SPpaths, SSpaths, WCC, betweenness,
  labelPropagation, maxFlow, pageRank.
- **AF-4: `algo.maxFlow` takes EXACTLY ONE relationship type** —
  `{relationshipTypes:[one], sourceNodes:[], targetNodes:[], capacityProperty:'cap'} YIELD maxFlow, nodes`.
- **AF-5: `algo.pageRank` takes two POSITIONAL args** `algo.pageRank(label, relType)`, not a config map.
- **AF-8: all reads go through `GRAPH.RO_QUERY`** — the containment boundary for generated Cypher,
  enforced **server-side** (CREATE rejected, MATCH allowed). **Python client only**; the TS client
  does not expose it (FalkorDB issue #408). This is why the stack is Python.
- **AF-16: boot assertions are a PUBLIC surface.** `GET /health` publishes all three
  (`node_split_echo`=1, `node_split_independent`=2, `sp_path_weight`=0.21072) and returns
  **503 `BOOT_ASSERTION_FAILED`** on any mismatch. The service refuses to serve rather than serve a
  wrong headline number.
- **AF-17 / DS-8 / R-4: epsilon and lambda are SERVER constants**, published by `/health` and echoed
  on every decision. The console **must not** hardcode them.
- **AF-9: engine pinned `falkordb/falkordb:v4.22.1`.** `:latest` currently resolves to it, but
  GraphRAG-SDK is broken on 6.0.x, so the explicit pin is load-bearing.
- **AF-10: judging is ARTIFACT-ONLY.** No live demo, no call. README + video + form prose ARE the
  product. Write for a judge reading alone with nobody to explain it.

### The only measured numbers that exist
`0.21072` (AF-3) · `echo→1`, `independent→2` (AF-6) · `41ms cold / 11ms warm` on 1402 nodes /
2400 edges (AF-7). **Everything else numeric is `NOT_CLAIMED`.** No endpoint has been built or
probed. Specifically `epsilon = 0.05` and `lambda = 0.01/hour` are **proposed, unmeasured defaults**
— tag them `[ASSUMED]` and say they are calibrated in B2 and reported by `/health`.

## 4. Sources of record — read these, cite these, contradict none

| Path | What it is |
|---|---|
| `/Users/MAC/graph-hacks/PULSE.md` | **Authoritative.** Active Facts `AF-1..AF-17` override everything, incl. the brief. Read the warroom + forge sections and the Decisions Log. |
| `/Users/MAC/graph-hacks/CONTRACT.md` | **FROZEN v1.0**, 8 endpoints, shared types, decision rule, DOCKET shape, error table. Read-only. |
| `/Users/MAC/graph-hacks/.law12-feasibility.json` | The 7 live probes with evidence + timestamps. This is what `[VERIFIED]` means. |
| `/Users/MAC/graph-hacks/warroom/WINNER-BRIEF.md` | The ruled thesis. Read `## Thesis` incl. any AMEND lines (latest wins per field). |
| `/Users/MAC/graph-hacks/warroom/deliberation-transcript.md` | Exact Cypher from the live probes. |
| `/Users/MAC/graph-hacks/PLAN.md` | The thin 435-line plan being replaced/deepened. Mine it; do not treat it as a ceiling. |
| `/Users/MAC/graph-hacks/SUBMISSION_STATUS.md` | Honest built-vs-not register. |
| `/Users/MAC/graph-hacks/config.json` | Hackathon config, tracks, judging weights. |
| `/Users/MAC/graph-hacks/docs/CHAT-KICKOFF-forge.md` | The original dispatch + rules R1–R5 + DS-1..DS-15. |
| `~/.claude/skills/hackathon-briefs/` | Only if a Graph Hacks brief exists there. PULSE wins on conflict. |

The 8 frozen endpoints: `POST /remember`, `GET /slots`, `GET /slots/{key}`,
`GET /slots/{key}/graph`, `GET /receipts/{receipt_id}`, `POST /receipts/{receipt_id}/replay`,
`GET /review`, `GET /health`.

## 5. Ownership — do not write another agent's file

| Owner | Writes |
|---|---|
| A | `PRD.md` |
| B | `ARCHITECTURE.md` |
| C | `PLAN.md` (replace in place) |
| D | `INVARIANTS.md`, `DECISIONS.md`, `LIMITATIONS.md` |
| E | `USER-ONBOARDING.md`, `ROUTE-ARCHITECTURE.md`, `FEATURE-OBSERVABLES.md`, `.env.example` |

Routing already ruled (keep consistent; `owner:` tokens are registry **skill** names):
`live_deploy` + `portfolio_readme` → `deploy-to-github` · `demo_video` → `hackathon-demo` ·
`submission_bundle` → `hackathon-package` · console/UX → `design-forge` **IN FULL** (R5) ·
engine → `hackathon-build` · adversarial read → `hackathon-critique`.

## 6. Depth bar

Length is a **consequence of substance**, not a target. A doc that hits its line count with filler
fails harder than a short one, because the padding is visible to a judge. Earn the lines with:
worked examples, exact Cypher, decision trees at every risk point, the failure mode beside every
mechanism, and **the judge's attack** beside every claim.

Write prose a competent stranger can act on with zero context — that is the actual bar, and AF-10
means a stranger is literally who reads it.

## 7. On finishing

Return a short report: file path, line count, the tag census (`[VERIFIED]`/`[UNVERIFIED]`/
`[ASSUMED]`/`NOT_CLAIMED` counts), any contradiction you found between sources, and anything you
had to mark `NOT_CLAIMED` that a human should chase. Do not claim a gate passes — you are not the
grader. State what you wrote and what you could not substantiate.
