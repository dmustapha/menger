# CHAT KICKOFF — `forge` (fresh dispatch)

You are a **fresh dispatch of the `hackathon-forge` skill** for Graph Hacks
(WeMakeDevs × FalkorDB). Invoke it via the Skill tool: `hackathon-forge`.

**Working directory:** `/Users/MAC/graph-hacks`
**Hackathon deadline:** 2026-10-18 **19:29 WAT**. Hard.
**Your time box:** 30 minutes wall clock.

---

## 1. Read these first, in this order — do not skip any

1. `/Users/MAC/graph-hacks/LEDGER.md` — orientation, Dami's binding rulings R1–R6, the
   11 hard constraints. **Read this before anything else.**
2. `/Users/MAC/graph-hacks/docs/ORCHESTRATION-PROTOCOL.md` — how your chat runs, which
   skill version you source from (§2 — non-obvious, get it right), your entry/exit
   obligations (§4), and your run card (§5 → `forge`).
3. `/Users/MAC/graph-hacks/PULSE.md` — **Active Facts OVERRIDE everything else**, including
   published FalkorDB documentation (AF-1..AF-3 have already falsified it). Then the
   Decisions Log (closed — do not reopen), your Downstream Items, and warroom's section
   ("Blockers for Downstream" + "For Next Skill").
4. `/Users/MAC/graph-hacks/warroom/WINNER-BRIEF.md` — the ruled winner: thesis, mechanism,
   node-split schema, risk register.
5. Only if you need raw probe evidence:
   `/Users/MAC/graph-hacks/warroom/deliberation-transcript.md` §FC-1..FC-7.

## 2. Mode

- Run profile **SPRINT**. `autonomous_mode: false`, but **no interactive user is attached
  to your chat** — where the skill would pause for approval, derive the answer, log it
  `[AUTO]` in the corrections log and your PULSE section, and continue. Never hang.
- You are **not** under the conductor. Nothing upstream enforces phase order or PULSE
  compliance — the three docs above are that enforcement.

## 3. Your two required outputs

### `PLAN.md`
The build plan for MENGER.

### `CONTRACT.md` — the FROZEN API CONTRACT, as its own file
This is the hard dependency that unblocks a **concurrent `design_forge` chat** building the
console against it while the engine is built in parallel.
**A plan with no contract is an unfinished dispatch.**

It must be concrete enough to build a frontend against with zero further questions:

- Every HTTP endpoint (method, path, purpose). Minimally `POST /remember` (the write gate),
  plus the read endpoints the console needs: slot list, slot detail, receipt by id,
  review queue.
- Exact request/response JSON shapes — field names and types — with the three component
  scores surfaced **separately** (`independence`, `reliability`, `recency`) plus `margin`
  and `epsilon`. **Never one opaque blended number** (this closes the User Advocate's
  standing dissent, PULSE DS-8).
- Verdict enum: `ALLOW` / `BLOCK` / `UNDECIDED`.
- The DOCKET receipt shape: the exact Cypher executed, the three components, the winning
  provenance path, the max-flow witness set, replay-by-id.
- Error shapes and status codes.
- A worked example request + response per endpoint.

## 4. Binding constraints — violating any of these loses the hackathon

- **Do NOT redesign the mechanism.** The winner is ruled by Dami (R1, R4). You are planning
  the build of WINNER-BRIEF.md, not reopening it.
- **Node-split is non-negotiable** (DS-1). `algo.maxFlow` over unit-capacity *edges* counts
  edge-disjoint paths; the headline claim needs *vertex*-disjoint. The seed must assert both
  controls at boot — echo chamber → **1**, independent → **2** — and refuse to run if either
  fails.
- **Only `weightProp` works on `algo.SPpaths`** (DS-2, AF-3). `weightProperty`,
  `relationshipWeightProperty`, `costProperty` silently return **hop count** with no error.
  The resolver must assert `pathWeight 0.21072` on the control fixture at boot.
- **`algo.dijkstra` and `algo.SCC` DO NOT EXIST** (AF-1). Verified live set: `AStar, BFS,
  HarmonicCentrality, MSF, SPpaths, SSpaths, WCC, betweenness, labelPropagation, maxFlow,
  pageRank`.
- `algo.maxFlow` signature: `{relationshipTypes:[exactly one], sourceNodes:[...],
  targetNodes:[...], capacityProperty:'cap'} YIELD maxFlow, nodes`.
- All reads via **`GRAPH.RO_QUERY`** — Python client only (the TS client lacks it,
  FalkorDB issue #408). This is the containment boundary for generated Cypher.
- **Never write "stored procedure"** — FalkorDB has none. Say *"a single parameterised
  Cypher query."* The judging panel wrote the engine.
- Fresh code only — nothing ported from LEASH or 0g-fleet. Synthetic seeded data only,
  committed in-repo.
- Engine pinned `falkordb/falkordb:v4.22.1`. A container named **`gh-falkor` is already
  running and is the live build DB — do NOT kill it.**
- P3 counterfactual (`GRAPH.COPY` fork + diff) is a **STRETCH ONLY**, gated at
  verify_milestone 16:25. Plan it as optional and isolated. It must not entangle the spine.
- **Merging `fix/p0-2b` is NOT authorized. Push is HELD.** Do not merge, push, or commit
  to any branch.
- **NO FABRICATION.** Do not invent probe results, timings, or API behaviour. If you need a
  fact you don't have, derive it from the transcript or mark it `NOT_CLAIMED`.

## 5. On exit

1. Append your section to `PULSE.md` using the worktree template
   (`/Users/MAC/pipeline-2b-worktree/hackathon-pulse/PULSE-PROTOCOL.md`). Exact header
   `forge` (the literal PHASE_ORDER key). Add `[phase:forge] status=complete` to Active
   Facts. 4-state claim model; every VERIFIED claim carries a `Recompute:` command; resolve
   WILL-BREAK assumptions in place.
2. Update `LEDGER.md` §3 — move forge to DONE.
3. Write your state file if the skill defines one.
4. Report back to Dami in the master chat: paths produced, the contract's endpoint list,
   any deviation and why, what you handed downstream.
