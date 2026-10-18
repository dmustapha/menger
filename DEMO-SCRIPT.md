# DEMO-SCRIPT — MENGER

Generated: 2026-10-18 ~18:52 WAT · Duration target: **≤180s** (planned **170s**)
Audio strategy: **`separate`** (silent screen capture, narration added in post) → `pacing_mode: "gap"`
Console: `http://127.0.0.1:3001` · Engine: `http://127.0.0.1:8000`

**The narrative lead is the failed probe, not the architecture.** Naive `algo.maxFlow` returned
**2** on the echo graph. The node split is what made it return **1**. The 1-versus-2 pair is the only
evidence the split does any work — either number alone proves nothing. Lead with that.

---

## Pre-Recording Setup

- [ ] **Pre-flight host guard (FG-002):** `curl -s http://localhost:8000/health | head -c 40` returns MENGER JSON **and** `curl -s http://[::1]:8000/health` is refused.
- [ ] Console up on **`:3001`** (`PORT=3001 npm run start` in `frontend/`). **Never film `:3000`** — that is FalkorDB Browser (FG-001).
- [ ] Run `bash tests/drill.sh` to completion **before rolling** — it re-seeds and renumbers claims (FG-009). Last live run: 18:39 WAT, **9/9 PASS**.
- [ ] Single browser window, single tab, no tab strip showing `:3000` (FG-010).
- [ ] Browser zoom 100–125%. Notifications off. DevTools closed (no console errors on camera).
- [ ] Capture at **1920x1080** — any other resolution crashes OffthreadVideo.
- [ ] Terminal font large enough that a judge reads the JSON on a phone.

---

## Filming Sequence

### Step 1 — [Screen: console `/slots/customer%3Aacme%7Cprimary_region`] — 0:00–0:15
**Cold open on the running product doing real work.** No logo, no title card. The slot page is
already loaded: four contenders, three components reported separately on every card.

Say:
[SUB] An agent is about to write a fact into another agent's memory.
[SUB] This is the slot it wants to write to, and it is already contested.
[SUB] Independence, reliability and recency — reported separately, never blended.

**DO NOT SHOW:** `:3000` in any tab (FG-010).

---

### Step 2 — [Screen: console `/proof`] — 0:15–0:42
**Proof surface on screen inside 20 seconds.** Scroll slowly through the live boot controls.
`node_split_echo` expected 1 / actual 1 · `node_split_independent` expected 2 / actual 2 — both PASS.
Linger on the 1 and the 2.

Say:
[SUB] The probe failed first. That is the honest version of this story.
[SUB] Run max-flow naively on the echo graph and it returns two —
[SUB] two citations that look like two independent sources.
[SUB] They are not. They funnel through one shared origin.
[SUB] Splitting every source node into an in-half and an out-half returns one.
[SUB] One versus two is the only evidence the split does any work.
[SUB] Both controls run before the service agrees to answer anything.

**DO NOT SHOW:** anything implying CI ran (FG-007).

---

### Step 3 — [Screen: console `/slots/{key}/graph`] — 0:42–1:00
The node-split provenance DAG. The `SourceIn` / `SourceOut` pairs are visible on purpose.

Say:
[SUB] The split is not hidden — it is the mechanism.
[SUB] Max-flow over this graph counts vertex-disjoint chains,
[SUB] which is Menger's theorem doing the work a heuristic would fake.

---

### Step 4 — [Screen: terminal beside the console] — 1:00–1:42 · **THE CLIMAX**
**The negative path IS the demo.** One real POST into the occupied slot. Not a replay, not a fixture.

```bash
curl -sS -X POST http://127.0.0.1:8000/remember -H 'content-type: application/json' -d '{
  "agent_id":"agt_scraper_3","subject":"customer:acme","predicate":"primary_region",
  "object":"ap-south-1","sources":["src_blog_echo_a"]}'
```

Hold on the response: **`"verdict":"BLOCK"` · `"status":"REFUSED"` · `"recorded":true` · `"margin":-0.8153`**.
Then refresh the slot page. The incumbent `clm_0007 = eu-west-1` is **byte-identical** — same claim id,
same object, same `asserted_at`. The refused claim sits in the slot **marked REFUSED, not at the top**.

Say:
[SUB] A single low-trust blog, echoed, tries to overwrite the region.
[SUB] Independence one, against the incumbent's two.
[SUB] The verdict is BLOCK. The status is REFUSED.
[SUB] And it is still recorded — a refusal is an auditable event, not a silent drop.
[SUB] The incumbent is untouched. Same claim, same value, same timestamp.
[SUB] A gate that returns the string BLOCK while quietly promoting the loser
[SUB] is strictly worse than no gate, because the receipt would say the right thing.

**MONEY ARTIFACT:** the `BLOCK` / `REFUSED` response body and the unchanged `clm_0007` row, side by side.

---

### Step 5 — [Screen: console `/receipts/{id}` → replay] — 1:42–2:12
Open the receipt the refusal carried. Show the verbatim parameterised Cypher, each statement tagged
`GRAPH.RO_QUERY`. Click **replay**.

Say:
[SUB] Every verdict ships a receipt.
[SUB] This is the exact text that ran — a single parameterised Cypher query,
[SUB] through the read-only command, with the independence witness attached.
[SUB] Replay re-executes it and diffs the result. It reproduces.
[SUB] Recency drifts, because time moves. Nothing else does.

---

### Step 6 — [Screen: console `/review`] — 2:12–2:32
The queue of UNDECIDED writes.

Say:
[SUB] When the margin falls inside epsilon, the graph refuses to pretend.
[SUB] The write is not allowed and not blocked — it is queued for a human.
[SUB] Epsilon is zero point zero five, published by the engine, not by this console.

---

### Step 7 — [Screen: console `/proof`, lower half] — 2:32–2:50 · **the boundary**
**What it does NOT promise.**

Say:
[SUB] What this does not do: it does not decide which claim is correct.
[SUB] It is admission control. The score is ordinal — a rank, never a probability.
[SUB] It has no latency, throughput or accuracy numbers, because none were measured.
[SUB] And removing the graph algorithms does not degrade the product.
[SUB] It removes the output entirely.

---

## Do NOT Show During Recording

| Footgun | Severity | Cause | Why | Workaround |
|---|---|---|---|---|
| FG-001 | CRITICAL | `service-not-running` | `:3000` is FalkorDB Browser, not MENGER | film `:3001` only |
| FG-002 | HIGH | `wrong-host-silent` | a re-bound IPv6 `*:8000` silently serves a foreign server | pre-flight guard before rolling |
| FG-003 | HIGH | `unverifiable-claim` | "41ms cold / 11ms warm" is the engine on another graph, not MENGER | never say it |
| FG-004 | HIGH | `unverifiable-claim` | roster figures have no backing artifact | corpus counts read live from `/health` |
| FG-005 | CRITICAL | `wording-violation` | "removing FalkorDB" mis-frames the claim | say **"removing the graph algorithms"** |
| FG-006 | HIGH | `wording-violation` | "procedure" / "detects conflicts" / "truth" are banned | "parameterised Cypher query" / "refused" / "admission control" |
| FG-007 | HIGH | `unverified-pipeline` | CI never executed; clean-room exits 2 | claim the live drill only |
| FG-008 | LOW | `wording-violation` | λ is pinned, not calibrated | say "pinned"; read from `/health` |
| FG-009 | LOW | `stale-state` | drill step 0 re-seeds and renumbers claims | run the drill before rolling |
| FG-010 | LOW | `foreign-surface` | other UIs on screen read as MENGER | single tab, no `:3000` |

## Async Operation Timings

| Operation | Expected Wait | What to Say During Wait |
|---|---|---|
| `POST /remember` | < 1s | no wait — fires instantly, do not pad |
| `POST /receipts/{id}/replay` | < 1s | no wait |
| console route transition | < 0.5s | no wait |

No step on this path has on-camera dead time. Nothing to talk over.

## Timing Check

15 + 27 + 18 + 42 + 30 + 20 + 18 = **170s** — inside the 180s ceiling with 10s of headroom.
