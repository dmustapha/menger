# GRAPH HACKS — BUILD KICKOFF (fresh chat entry point)

**Written 2026-10-18 10:5x WAT. Read this file and nothing else to start. The clock is the
constraint — act, don't re-research.**

---

## ⏰ DEADLINE — HARD

**Today, 2026-10-18 · 23:59 IST = 18:29 UTC = 19:29 WAT.**
Confirmed on two official pages (Rules §7 + Schedule). No earlier registration cutoff — you can
register and submit in the same session. **Budget 30 min at the end for the submission form**
(login-gated SPA, fields unread — assume friction).

**Prize:** ~$20,000 pool. One winner per track, physical goods (iPhone 18 Pro / PS5+GTA VI /
M6 Mac Mini / AirPods 5 for the blog bonus / T-shirts top-50). Scale: 6,000+ registered.

Host: WeMakeDevs × FalkorDB · https://www.wemakedevs.org/hackathons/falkordb
Submit: https://www.wemakedevs.org/hackathons/falkordb/submit

---

## 1. THE RULES THAT CAN DISQUALIFY YOU

1. **FalkorDB must be load-bearing** (Rules §2/§3). If the product still works with FalkorDB
   removed, the graph is "decoration" → effectively disqualifying. **Design so that removing the
   graph breaks the app.** Be able to say that in one sentence in the README.
2. **Fresh code only** (§8). "The main coding and design work must begin after the hackathon
   starts" (Oct 15). **Do NOT port LEASH / 0g-fleet code.** Ideas, sketches and graph-model
   thinking from before are allowed. Public libraries, frameworks, templates, datasets are fine.
3. **No private data** (§6). Public, synthetic, or your own only. For anything org-shaped, generate
   synthetic data with a seed script in the repo.
4. **Disclose AI assistance** (§11). Add a disclosure section to the README. Fully AI-generated
   work with no real understanding may be rejected (§13).
5. **You must be able to explain** the graph model, the queries, and the architecture (§12).

## 2. SUBMISSION CHECKLIST — all mandatory (Rules §10)

- [ ] Public source-code repository (URL)
- [ ] README with setup instructions **and the graph data model**
- [ ] **The Cypher queries / graph algorithms the product depends on, documented explicitly**
      (a separate listed artifact — put them in the README under their own heading)
- [ ] Demo video of the working product (no max length published; keep to 2–3 min)
- [ ] Live deployment URL (*preferred*) — or complete local setup instructions
- [ ] Track designation — **you may enter multiple tracks with one project (§5). Do it. Free upside.**
- [ ] AI-assistance disclosure in README

**Bonus, separate prize:** a blog post about the build (AirPods 5). Competitors are already posting
on DEV.to. Cheap second shot — write it if the build lands with time to spare.

## 3. TRACKS

| Track | What it wants |
|---|---|
| Agents That Act on Connected Data | multi-hop reasoning, graph-driven decisions |
| Agent Memory and Coordination | persistent memory, multi-agent shared state |
| Company Brain | org knowledge: people, teams, projects, docs, decisions |

Crowding is not published. Inference only: *Company Brain* is the most-promoted → likely most
crowded. *Agent Memory and Coordination* is the narrowest framing.

**No judging criteria page exists** (404s on /judging, /prizes, /faq). The only judgeable signals
are the rules above — especially "the graph must do real work."

## 4. BUILD DIRECTION — DECIDE FIRST, FAST (Dami had not ruled when this was written)

Recommended (not yet approved): **an agent memory substrate.** An agent that writes its experience
into a FalkorDB graph — entities, decisions, causal links — and does multi-hop retrieval that flat
vector memory structurally cannot do. Why it fits:
- Hits **all three tracks** with one project (acts-on-connected-data + agent-memory + company-brain
  if seeded with synthetic org data).
- The graph is **unremovable by construction** — delete it and the agent is amnesiac. That satisfies
  §3 cleanly and gives a one-sentence answer to the decoration test.
- Dami's agent-runtime judgement from LEASH transfers even though **the code must be new**.

Alternatives considered: Company Brain (cleanest demo, likely most crowded); multi-agent
coordination graph (least contested, highest demo risk in the time available).

**Ask Dami to confirm or redirect in the first message, then start — do not re-litigate past ~10 min.**

## 5. ZERO-TO-RUNNING (fastest paths, verified from docs)

FalkorDB = a graph database speaking the **Redis protocol** (successor to RedisGraph), queried in
**openCypher** via `GRAPH.QUERY` / `GRAPH.RO_QUERY`. Sparse-matrix backed.

```bash
# Local, ~30s, includes visual browser UI at http://localhost:3000
docker run -p 6379:6379 -p 3000:3000 --rm falkordb/falkordb:latest
```

```bash
pip install falkordb      # Python
npm install falkordb      # JS/TS
```

```python
from falkordb import FalkorDB
db = FalkorDB(host="localhost", port=6379)
g = db.select_graph("memory")
g.query("CREATE (:Person {name:'a'})-[:KNOWS]->(:Person {name:'b'})")
```

**Live deploy artifact:** FalkorDB Cloud free tier — https://app.falkordb.cloud — free, no credit
card, 100 MB. ⚠ **No persistence, no backups**; idle instances stop after 1 day, deleted after 7.
So **the seed data must be reproducible from a script in the repo**, and the demo video is the
durable proof.

Docs: https://docs.falkordb.com/getting-started/ · Cypher https://docs.falkordb.com/cypher/ ·
Algorithms https://docs.falkordb.com/algorithms/ · GraphRAG-SDK
https://github.com/FalkorDB/GraphRAG-SDK · Official agent-over-graph tutorial:
https://www.wemakedevs.org/blogs/how-to-build-an-agent-that-reasons-over-a-graph

## 6. ⚠ DO NOT MERGE THE PIPELINE FIX BRANCH

Ruled 2026-10-18. `~/.claude/skills`: `main` @ `ea2aaf5`, `fix/p0-2b` is **49 commits ahead**, main
is **41 ahead of origin/main**, 14 uncommitted files in main's tree.

The fix branch **does** modify 10 hackathon skill files (`hackathon-conductor`, `hackathon-build`,
`hackathon-verify`, `hackathon-wire`, `hackathon-debug`, `hackathon-demo`, `hackathon-package`,
`hackathon-stress`, `hackathon-pulse`, plus `shared-pipeline/` + 18 `utils/`). It is **deliberately
not merged**: those commits turn hollow gates into fail-closed blocking enforcement that has never
run in a real hackathon, and C3-D37C has not passed red-team. Flipping that on hours before a
deadline risks halting the run mid-build.

**Therefore: build directly. Do NOT invoke `hackathon-conductor` or the pipeline skills.** No brief
exists for Graph Hacks either, and every pipeline skill requires one. The deliverables (repo,
README, Cypher, video, deploy) need no pipeline skill to produce.

## 7. PARKED — resume only after the hackathons

**Pipeline fix campaign (`~/pipeline-audit/skill-audit/win-audit/v2/`).** Parked at a clean seam,
per the 2026-10-10 precedent ("hackathon deadlines live → fix campaign PARKED"). Worktree
`/Users/MAC/pipeline-2b-worktree` on `fix/p0-2b` @ `a31ac43`, clean, push HELD, nothing merged.

Just closed: **C3-D37C Gate-② = AGREE** (0 blockers, 2 NITs) —
`win-audit/v2/C3-D37C-GATE2-REVIEW.md`.

Remaining to **GATE B** (Dami ruled its scope = **D-37 slice only**; the other 8 Cluster-3 gaps run
after hackathons):
1. C3-D37C **red-team to DRY** — 2 consecutive clean rounds, distinct-model adversaries. Seeds: the
   2 NITs + the confirmed `<!DOCTYPE` universally-present-substring residual.
2. C3-D37C **live re-prove** — currently accepted on builder transcript only (the Vercel deploy was
   removed before the reviewer ran). Decide whether to re-prove.
3. **★ GATE B** — present to Dami: Gate-② + DRY + live proof + hackathon-readiness proposal.
   **Merge/push is Dami's call only.**

## 8. ALSO OPEN — Ascend Meme Comp ($2.5k), undecided

A **literal meme contest, no code.** @AscendLaunch — a launchpad for Elysium, the Hyperliquid L2.
Single winner, $2,500 USDC. Submit in their Discord (https://discord.gg/ascendlaunch) with a meme
**name + ticker**. Community voting Oct 18–20, team picks the winner from the top — so **posting
early in the voting window matters**.

- **Deadline UNCONFIRMED** — Oct 18 is official; the exact time is inferred as 11:59 PM PST
  (≈07:59 WAT Oct 19) from the sibling Builder track. **Authoritative text is in Discord.**
- ⚠ **Blocked on Dami's authorization to accept the Discord invite** (joining a server on his
  account is his call).
- Angle: everyone memes the cat mascot. Nobody memes the actual hook — *"Hold your HYPE. Ascend
  anyway,"* kHYPE, no protocol token, protocol revenue buys back HYPE/KNTQ. Differentiate there.
- Community greeting: "gAscend". Handles: @AscendLaunch, @Enter_Elysium, @Kinetiq_xyz, founder
  @CryptoTomYT.

## 9. STANDING CONSTRAINTS

- Process hygiene: kill every process the moment its output is consumed (the Docker FalkorDB
  container especially — `--rm` and stop it when done).
- Evidence law: see it in real Chrome, not headless-only, before claiming it works.
- Don't mark anything complete without proving it works.
