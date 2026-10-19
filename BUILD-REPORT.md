# Build Report - MENGER (Graph Hacks · WeMakeDevs × FalkorDB)

Generated: 2026-10-18 17:03 WAT
Builder: hackathon-build skill (orchestrator; implementation dispatched to subagents)
Scope: the engine only - C1..C7 (`owner: hackathon-build` in PLAN.md's Skill-Ownership Map).
The console is `design_forge`'s, in its own chat, concurrently.

Source of truth for code: `ARCHITECTURE.md` §7.1–§7.15 (the codebook).
Source of truth for order and done-criteria: `PLAN.md` §11 (the cursor).
Law: `INVARIANTS.md` INV-1..INV-27. Contract: `CONTRACT.md` v1.0 **FROZEN**.

---

## Summary

| Phase | Steps | Status | Notes |
|-------|-------|--------|-------|
| preflight (§11.1) | 4 | **PASS** | engine up, pin confirmed, algo set re-derived live, write path rejected |
| B1 schema + seed | `graph.py` → `cypher.py` → `bootcheck.py` → `seed.py` | **PASS** | T-1..T-4 green, re-derived by the orchestrator directly against `gh-falkor` |
| B2 resolver | `arbiter.py` + ε/λ | **PASS** | offline tier `tests/unit/arbiter_math.test.sh` 14/14; the band is CLOSED at exactly ±ε |
| GATE (§11.4) | spine-standing decision | **PROCEED** | recorded explicitly - see "The §11.4 GATE decision" below |
| B3 write gate | `api.py` (`/health` FIRST) | **PASS** | 8 endpoints; `/health` fails closed with 503 on any boot-check mismatch |
| B4 DOCKET | `docket.py` + 2 receipt routes | **PASS** | verbatim statements, `read_command GRAPH.RO_QUERY` on every one, replay `matches_original true` |
| B5 counterfactual | stretch | **not started** | gated at verify_milestone (DS-11). DS-10 produced the number it needed; the go/no-go is not build's |

**Build sequenced off `LEDGER.md` §3, not `PLAN.md` §11.** Critique B-6/DS-C5: PLAN §11's
schedule table is timed off a plan that the 16:27 re-cut superseded. Using it as the cursor
would have pointed the build at the wrong clock.

---

## Deviations from Architecture

| ID | Component | ARCHITECTURE/skill Said | ACTUAL | Reason | Class | Downstream Impact |
|----|-----------|-------------------------|--------|--------|-------|-------------------|
| DEV-001 | skill entry | read `~/.claude/skills/hackathon-briefs/<hackathon>.md` first | no Graph Hacks brief exists (19 briefs, none matching) | never authored; `KICKOFF.md` + `LEDGER.md` §5 are the rules source | AUTO | none - rules sourced from KICKOFF/LEDGER instead |
| DEV-002 | git workflow | progressive `_git_checkpoint` commit per verified phase | nothing staged, committed, merged or pushed | user binding ("Do not merge, push, or commit. Push is HELD") + INV-25; user instructions override skill instructions | AUTO | CL-F-007 (HANDOFF.md needs a SHA) stays open - master chat's call |
| DEV-003 | console port | CONTRACT.md §0: console on `:3000` | `gh-falkor` already publishes `:3000` | cannot free it - gh-falkor is the live build DB and is not mine to stop (INV-25, PLAN §11.8) | AUTO | design_forge / master chat must choose another console port; API `:8000` is free, engine unaffected |
| DEV-004 | every script + doc that names the API | `http://localhost:8000` | `http://127.0.0.1:8000`, everywhere, with `MENGER_API` as the override | macOS resolves `localhost` to `::1` first, and a **foreign** process (PID 44792, `python -m http.server`) was listening on the IPv6 wildcard `*:8000`. `curl localhost:8000/health` returned that server's HTML, so `jq` failed with `Invalid numeric literal at line 1, column 10`. The API was healthy the whole time | AUTO | none - but anything downstream that hardcodes `localhost` will hit the same shadowing. Use `127.0.0.1`. The foreign process was deliberately **not** killed (process hygiene: never kill what you did not start) |
| DEV-005 | `app/docket.py` `_numbers_of` | compare the original receipt's numbers against the replayed numbers | dropped `path_cost` from the replay projection so both sides carry `{path_weight}` only | `_numbers_of` returned `{path_weight, path_cost}` while `_original_numbers` returned `{path_weight}`. The equality compared mismatched **key sets**, so `matches_original` was unconditionally `false` - a replay check that could never pass is worse than none, because the receipt reports it as a finding | AUTO | none; drill step 7 now reports `matches_original true` with divergence reasons all `RECENCY_DECAY` |
| DEV-006 | `tests/boot_drill.sh` T-1/T-2 | `ck "T-1" "1" "$(scalar "MATCH ... CALL algo.maxFlow({relationshipTypes:['FLOW'], ...}) ...")"` | statement built in a `maxflow_q()` helper, result assigned to a plain variable first | macOS ships **bash 3.2**, which loses the inner quoting inside `"$( cmd "…" )"` and then **brace-expands** the comma-containing config map `{relationshipTypes:[…], sourceNodes:[…], …}` into four separate arguments. `scalar` received a different, invalid statement each time and returned empty. Found with `bash -x`, not by reading | AUTO | none - but the nested-command-substitution form is unsafe on this host for any statement containing a `{a:1, b:2}` map. T-3 was unaffected because it already used the assignment form |
| DEV-007 | `SECURITY.md` (contract rule 21) | scaffold from forge's `## Security spec (for build's SECURITY.md)` section in ARCHITECTURE.md | authored from the code as build's own reading of the threat surface | forge never wrote that section. Fabricating a citation to a spec that does not exist would be worse than naming the gap | AUTO | `verify_milestone` should read `SECURITY.md` as build's reading, not as conformance to a forge spec |
| DEV-008 | `scripts/clean-room.sh` step 1 | guard that the origin is a git work tree | second guard on `git rev-parse --verify --quiet HEAD`, and both guards exit **2 INCONCLUSIVE** rather than 1 FAIL | a work tree with **zero commits** fell through the first guard: `git clone` of an empty repo only *warns*, so every downstream step then failed on a missing `app/` - three red FAILs for a precondition, not a defect. A clean-room run that reports FAIL because there is nothing to clone is lying about what it measured | AUTO | the cold-clone proof is deploy's step 9g, after the first commit exists. Until then the honest result is exit 2 |

---

## Failed Attempts & Resolutions

Four. Every one of them was a **silent** failure - nothing raised, nothing crashed; the output
was simply wrong or empty. That is the shape of defect this project is most exposed to, so they
are recorded in full rather than summarised.

| Step | Error | Attempts | Resolution |
|------|-------|----------|------------|
| B3 - first `/health` read | `curl localhost:8000/health \| jq` → `parse error: Invalid numeric literal at line 1, column 10` | 3 (re-curl, check uvicorn logs, `lsof -i :8000`) | `lsof` showed **two** listeners: mine on `127.0.0.1:8000` and a foreign `python -m http.server` (PID 44792) on `*:8000`. macOS resolves `localhost` to `::1`, which the wildcard listener owned, so `curl` was reading someone else's HTML. Addressed `127.0.0.1` explicitly everywhere - DEV-004. Foreign PID left running |
| B4 - receipt replay | `matches_original` always `false`, with no divergence that explained it | 2 (inspected the receipt, then diffed the two projections) | `_numbers_of` vs `_original_numbers` returned different **key sets** (`path_cost` present on one side only). Dropped `path_cost` - DEV-005. Now `true` |
| boot drill T-1/T-2 | `[FAIL] expected=1 actual=` - empty, while the identical statement returned `1` when run raw through `docker exec` | 4 (re-quote, single-quote, heredoc, then `bash -x`) | `bash -x` showed `scalar` being called **four** times with the config map split across arguments. bash 3.2 brace expansion inside nested command substitution - DEV-006. Rewritten with a helper + plain assignment; 12/12 green |
| clean-room run | `clean-room FAILED - 3 check(s)`, all three downstream of a clone that produced no `app/` | 1 | the repo has zero commits (push is HELD), so there is no ref to clone. Turned the precondition into an honest `exit 2 INCONCLUSIVE` - DEV-008 |

---

## Verification Results

Every row below is a command the orchestrator ran itself, with the actual output pasted.

| Phase | Command | Expected | Actual | Pass? |
|-------|---------|----------|--------|-------|
| §11.1-1 | `docker ps --filter name=gh-falkor` | container up on the pinned image | `gh-falkor \| falkordb/falkordb:v4.22.1 \| Up 4 hours` | ✅ |
| §11.1-2 | `docker exec gh-falkor redis-cli MODULE LIST` | `graph` ver `42201` | `name graph / ver 42201 / path /var/lib/falkordb/bin/falkordb.so` | ✅ |
| §11.1-3 | `GRAPH.RO_QUERY menger "CALL dbms.procedures() YIELD name RETURN name"` filtered on `algo.` | `algo.maxFlow` + `algo.SPpaths` present; `algo.dijkstra` + `algo.SCC` **absent** | `AStar, BFS, HarmonicCentrality, MSF, SPpaths, SSpaths, WCC, betweenness, labelPropagation, maxFlow, pageRank` - 11 procedures, no `dijkstra`, no `SCC` | ✅ |
| §11.1-4 | `GRAPH.RO_QUERY menger "CREATE (:PreflightProbe {x:1})"` | an **error** | `graph.RO_QUERY is to be executed only on read-only queries` | ✅ |
| B1 / T-1 | `maxFlow(ss → clm_0001)`, `relationshipTypes:['FLOW']`, `capacityProperty:'cap'` | `1` (echo chamber funnels through one shared origin) | `1` | ✅ |
| B1 / T-2 | `maxFlow(ss → clm_0002)`, same shape | `2` (two vertex-disjoint origins) | `2` | ✅ |
| B1 / T-3 | `algo.SPpaths(... weightProp:'nl')` on `clm_0001` | `pathWeight ≈ 0.21072` (tol 5e-6) | `pathWeight 0.210722`, `pathCost 5` | ✅ |
| B1 / T-3b | the **same** statement with `weightProperty:'nl'` - the AF-3 trap | silently returns the **hop count**, no error | `pathWeight 5` - identical to `pathCost`, no error raised | ✅ trap reproduced |
| B1 / T-4 | `GRAPH.RO_QUERY menger "CREATE (:BootProbe {x:1})"` | an **error** | `graph.RO_QUERY is to be executed only on read-only queries` | ✅ |
| B1 / integrity 1 | `MATCH (:Claim)-[:CITES]->(:SourceOut) RETURN count(*)` | `0` (no bypass edge) | `0` | ✅ |
| B1 / integrity 2 | `MATCH (:SuperSource)-[:FLOW]->(:SourceOut) RETURN count(*)` | `0` (split never skipped) | `0` | ✅ |
| B1 / integrity 3 | `MATCH ()-[f:FLOW]->() WHERE f.cap <> 1.0 RETURN count(f)` | `0` (unit capacity everywhere) | `0` | ✅ |
| B1 / integrity 4 | `MATCH (s:Source) WHERE s.trust <= 0 OR s.trust > 1 RETURN count(s)` | `0` | `0` | ✅ |
| B1 / node-split | `count(:SourceIn)` vs `count(:SourceOut)` | equal, and equal to the source count | `150` and `150`, against `sources: 150` | ✅ |
| B1 / vocab | `grep -rniE 'stored procedure\|detects conflict\|truth' app/*.py \| wc -l` | `0` | `0` | ✅ |
| B1 / vocab | `grep -rniE 'confidence\|probability\|percent' app/*.py \| wc -l` | `0` | `0` | ✅ |
| DS-10 | `GRAPH.COPY menger ds10_probe_N` ×3, wall-clocked, minus a `redis-cli PING` baseline | a real number - previously NOT_CLAIMED | wall `81.8 / 70.5 / 73.9 ms`; `PING` baseline `58.5 / 48.6 / 49.0 ms` → **GRAPH.COPY ≈ 20–30 ms** on a 574-node graph | ✅ measured |
| RULING 1 | `curl -sS http://127.0.0.1:8000/health \| jq -r '."lambda", .epsilon'` | λ `0.008`, ε `0.05` - published by the server, never read from a document | `0.008` / `0.05` | ✅ |
| RULING 1 / regression | the near-tie set-piece after re-seeding at λ=0.0080 | still **UNDECIDED** - the closed band must not have moved | `margin=0.021 epsilon=0.05` → `UNDECIDED`, `review_id` non-null | ✅ no guarantee moved |
| RULING 2 | `MATCH ()-[r:DERIVED_FROM]->() RETURN count(r)` and `MATCH ()-[f:FLOW]->() RETURN count(DISTINCT f.kind)` | `0` and `4` - provenance collapsed into **one** relationship type carrying `kind` | `0`; `4` (`ORIGIN, SPLIT, CITED, DERIVED`) | ✅ |
| AF-3 / 2nd form | `MATCH ()-[f:FLOW]->() WHERE f.nl IS NULL RETURN count(f)` | `0` - the *correct* weight key over a property-less edge also returns a hop count, silently | `0` | ✅ |
| boot drill | `bash tests/boot_drill.sh` | 12/12 | `T-1 1 · T-2 2 · T-3 0.21072 · T-3b 5==5 and 0.210722≠5 · T-4 refused server-side` + 6 `/health` legs, `epsilon=0.05 lambda=0.008` | ✅ 12/12 |
| **DS-C11** | `bash tests/drill.sh` - the eight-step drill plus the new ninth step | 9/9, and step 9 must produce a **real BLOCK** | all 9 PASS. Step 9: `verdict BLOCK`, `status REFUSED`, `recorded true`, `receipt_id` non-null; `incumbent before: clm_0007 = 'eu-west-1' asserted_at=2026-10-18T04:54:00Z` → `after: clm_0007 = 'eu-west-1' asserted_at=2026-10-18T04:54:00Z`; `ranking[0]` is not the refused claim | ✅ blocker closed |
| claims | `bash scripts/verify-claims.sh all` | every number in `CLAIMS.md` re-derives | **21/21 PASS**, `evidence/claims.txt` written | ✅ |
| one-command gate | `bash scripts/verify.sh` | green with no engine, no credentials | `compileall` clean · both vocabulary greps `0` · `arbiter_math` 14/14 · verify-claims OK | ✅ |
| clean room | `bash scripts/clean-room.sh` | an honest verdict | `exit 2 INCONCLUSIVE` - zero commits, nothing to clone. Not a PASS, and deliberately not a FAIL | ✅ honest |

### B1 - independently verified by the orchestrator

The implementer's own run reported `node_split_echo PASS 1`, `node_split_independent PASS 2`,
`sp_path_weight PASS 0.21072`, `sp_weight_is_not_hop_count PASS (0.21072 vs 5)`, `seed OK`.
The orchestrator did **not** take that on trust: every row above was re-run directly against
`gh-falkor` with `redis-cli GRAPH.RO_QUERY`, without going through the application code at all.
Seeded corpus: `agents=40 sources=150 split_nodes=300 origin_edges=90 derived_edges=60
slots=20 claims=60 citations=117`, `indexes=18`.

**T-3b is the row that matters most.** The project's single most dangerous trap is that
`algo.SPpaths` *silently* accepts a wrong weight key and returns a hop count with no error.
Running the identical statement twice - once with `weightProp`, once with `weightProperty` -
produced `0.210722` and `5` respectively, and the second raised nothing. That is the trap
reproduced live on this engine, not quoted from a document, and it is why T-3's expected value
is deliberately non-integer: a regression to hop count cannot accidentally satisfy it.

### DS-10 - `GRAPH.COPY` latency, measured

Previously `NOT_CLAIMED`. Now: `GRAPH.COPY` of the 574-node `menger` graph completes in
**tens of milliseconds - measured between ~20 ms and ~83 ms, load-sensitive.** Method and its
limits, stated plainly: three runs wall-clocked around `docker exec gh-falkor redis-cli
GRAPH.COPY`, with three `redis-cli PING` runs used to estimate the `docker exec` overhead that
dominates the raw figure. The copy was confirmed faithful (`count(n)` = 574 on both source and
copy) and every probe graph was deleted; `EXISTS menger` → `1`, `KEYS ds10*` → empty.

**The probe was run twice and the two runs disagreed, so both are recorded.** Idle host:
wall `81.8/70.5/73.9 ms` against baseline `58.5/48.6/49.0 ms` → ~20–30 ms. With two build
subagents running concurrently: wall `126.3/98.5/100.7 ms` against baseline `42.9/42.2/43.6 ms`
→ ~55–83 ms. Quoting the 20 ms figure alone would be selecting the measurement that flatters,
so the claim is the range.

This is a **bounded** measurement, not a benchmark: n=3 per run, one graph size, overhead
subtracted rather than isolated. It is sufficient for its only purpose - DS-10 exists so the B5
counterfactual stretch is decided against a real number instead of a guess, and "tens of ms" is
enough to answer that. The decision itself is `verify_milestone`'s (DS-11), not build's.

### The §11.4 GATE decision

**Decision: PROCEED to B3.** Recorded here explicitly, because "we ran out of time" is not a
decision - it is the absence of one, and a gate that is passed by the clock rather than by a
basis is not a gate.

PLAN §11.4 holds B3 behind one question: *is the spine standing?* It resolves to two conditions,
and both were met before B3 started:

| Condition | Required | Evidence |
|---|---|---|
| T-1..T-4 green | the node split actually converts edge-disjoint into vertex-disjoint, the weight is a weight and not a hop count, and the read path refuses writes server-side | `bash tests/boot_drill.sh` → 12/12. T-1 `1` **and** T-2 `2` (either alone proves nothing); T-3 `0.210722` with T-3b showing the misspelled key returns `5`; T-4 refused by the server |
| C-2 demonstrated | the resolver produces all **three** verdicts, not just the two easy ones, and UNDECIDED is a real state with a review handle | `bash tests/drill.sh` steps 2/3/4 → `BLOCK` / `ALLOW` / `UNDECIDED`, the last with `review_id` non-null and `\|margin\| 0.021 <= epsilon 0.05`; step 5 finds `rev_0001` in `GET /review?status=OPEN` |

What the gate did **not** require, and what was therefore not claimed at the time it was passed:
the DS-C11 BLOCK witness (step 9) did not exist yet - it was a separate blocker, due before B4,
and it was discharged before B4 completed rather than waved through. The gate's scope was the
spine, not the headline.

### Honesty machine scaffolded (build contract rules 21–23)

| Artifact | Path | State |
|---|---|---|
| Human claims ledger | `CLAIMS.md` | **15 VERIFIED** (each with a recompute command) · 1 UNVERIFIABLE · 6 NOT_CLAIMED |
| Machine ledger stub | `docs/pipeline/claims.json` | `{"claims":[]}` - populated by `verify`, rendered by `deploy` |
| Independent recompute verifier | `scripts/verify-claims.sh` | **21/21 PASS** - re-derives every number from the engine and the source tree, never reads one back out of a document |
| Threat matrix + what is *not* defended | `SECURITY.md` | 12 enforced threats mapped to the file that enforces each; 10 named exclusions |
| Evidence output dir | `evidence/claims.txt` | written by the verifier, for the clean-room diff |

**The verifier caught a bug in itself on first run.** `CLM-8.b` reported
`expected=42201 actual=ver` - my `MODULE LIST` parse took the line *one* after the module name,
but the reply is a flat `name / graph / ver / 42201` sequence, so the version is *two* lines
down. Fixed, re-run, now `PASS`. Recording this because a verifier that passes on its first
ever run is usually not actually checking anything.

**AF-1 re-derived live.** PLAN §11.1 says live re-derivation is authoritative over the recorded
Active Fact. The live list matches AF-1 exactly - no delta to escalate.

**The containment boundary is real, not asserted.** Step 4 is the only evidence that
`GRAPH.RO_QUERY` is a server-side refusal rather than a client-side convention, and it is the
precondition for done-criterion C-6.

---

## Known Risks (for debug)

- **DEV-003 port collision on `:3000`.** The engine does not care (it binds `:8000`), but the
  contract's stated console port is occupied by the database container. Surfaced, not fixed.
- **ε and λ are UNMEASURED defaults** - ε `0.05`, λ **`0.0080/hour`** (86.6 h half-life). Their
  *values* are now pinned; their *calibration against reality* is still NOT_CLAIMED, and nothing
  in the pipeline should imply otherwise. Critique RULING 1 settled the three-way document
  disagreement (0.0077 / 0.0080 / 0.01 per hour) by arithmetic rather than by vote:
  `CONTRACT.md` declares `lambda: 0.0077` while **publishing** `recency: 0.9261` at
  `age_hours: 9.6`, and `-ln(0.9261)/9.6 = 0.0079972`. A published output pins the constant that
  produced it; a declared input that contradicts its own output is the side in error. The
  standing rule is **re-seed the trusts, never re-tune λ** - tuning a published constant to make
  a demo read better is the one thing this project must never do. CL-F-009 is why nothing
  downstream may read either constant from a document: only `GET /health` is authoritative.
- **CONTRACT.md §2.5's DOCKET Cypher does not execute as written** (CL-F-009, P0). B4 must carry
  the *verbatim executed* statements (INV-17), which will therefore differ from §2.5's
  illustration. That difference is a contract-conformance question for `verify_milestone`
  (C-5, DS-13) - build cannot self-certify it.
- **`GRAPH.COPY` latency is now MEASURED** (DS-10) - tens of ms, `~20–83 ms`, load-sensitive,
  n=3. That unblocks the *input* to the B5 go/no-go; it does not make the decision. B5 remains
  not started and the call is `verify_milestone`'s (DS-11).
- **The clean-room proof has not run** - `scripts/clean-room.sh` is SHIPPED and exits
  `2 INCONCLUSIVE` because the tree has zero commits (push is HELD). The cold-clone proof is
  deploy's step 9g. Nothing downstream may report it as PASS.
- **CI is UNVERIFIED.** `.github/workflows/ci.yml` is scaffolded and has never executed - there
  is no remote and no commit, so Actions cannot have run. Scaffolded ≠ green.

---

## Contract Addresses

| Contract | Network | Address | Tx Hash |
|----------|---------|---------|---------|
| N/A | N/A | N/A | N/A |

MENGER is not an on-chain project. INV-22: it holds no keys and signs nothing.

---

## Environment Variables Added

| Key | Source Step | Value/Description |
|-----|-------------|-------------------|
| - | - | none yet; `.env.example` is forge's and is untouched |
