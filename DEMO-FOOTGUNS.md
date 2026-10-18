# DEMO-FOOTGUNS — MENGER

Generated: 2026-10-18 ~18:50 WAT · phase `demo_rehearsal` · run_profile `SPRINT`

Every row carries a **cause tag** and a **disposition** (`fixed` + proof, or `accepted` + reason).
No row is left open. The cause tag `cold-hero-unavailable` does not appear and may not be used —
a hero a cold judge cannot run is resolved upstream, never scripted around.

| ID | Cause tag | Severity | Description | Workaround / what to do on camera | Disposition |
|---|---|---|---|---|---|
| FG-001 | `service-not-running` | CRITICAL | The MENGER console was **not running at all**. `:3000` is served by **FalkorDB Browser** (the engine container's own UI), not by the console. Filming against `:3000` would have put a stranger's UI on camera. | Console started on **`:3001`** (PID 9304). Film `http://127.0.0.1:3001`, never `:3000`. | **fixed** — 5/5 routes HTTP 200 (`/`, `/remember`, `/slots`, `/review`, `/proof`); two live Chrome screenshots render real engine data. |
| FG-002 | `wrong-host-silent` | HIGH | The console's API base defaults to `http://localhost:8000` (`src/lib/api.ts:20`). macOS resolves `localhost` to `::1` first. If **any** process re-binds IPv6 `*:8000` mid-shoot, the console silently reads a foreign server and every panel goes wrong on camera. (DEV-004: a foreign `python -m http.server` previously owned that socket.) | **Pre-flight guard, run immediately before recording:** `curl -s http://localhost:8000/health \| head -c 40` must return MENGER JSON, and `curl -s http://[::1]:8000/health` must REFUSE. | **accepted** — foreign listener is gone (`[::1]:8000` connection refused; only `Python 90866` on `127.0.0.1:8000`). Fixing properly needs a `NEXT_PUBLIC_MENGER_API` rebuild; not worth the deadline risk. Guarded by pre-flight. |
| FG-003 | `unverifiable-claim` | HIGH | The "41 ms cold / 11 ms warm" figure measures the **engine on a different graph**, not MENGER. Saying it on camera attributes a number to MENGER that MENGER never measured. | Do not say it. Do not show a frame where it is the headline. MENGER's own latency/throughput/p99/accuracy/scale are **NOT_CLAIMED** `[VF-8]`. | **accepted** — excluded from script; no narration line references it. |
| FG-004 | `unverifiable-claim` | HIGH | The roster dataset figures (384 / 267 / 71 / 17 / 33 / 18) have **no backing artifact** (CL-F-008). | Never quote them. Corpus counts come from `/health` on camera: 40 agents, 150 sources, 65 claims, 21 slots. | **accepted** — excluded from script; corpus numbers read live from `/health`. |
| FG-005 | `wording-violation` | CRITICAL | Saying **"removing FalkorDB"** mis-frames the product as a database swap and collapses the core claim. | The line is **"removing the graph algorithms"** — verbatim, every time. | **fixed** — script line 7 uses the mandated wording; no occurrence of the banned phrase in `DEMO-SCRIPT.md`. |
| FG-006 | `wording-violation` | HIGH | The words **"procedure"**, **"detects conflicts"**, and **"truth"** are banned in all copy (CONTRACT §4; LEDGER §5). They re-frame admission control as oracle-of-truth. | Say **"a single parameterised Cypher query"**, **"refused"**, **"admission control"**. | **fixed** — grep-clean across `DEMO-SCRIPT.md`. |
| FG-007 | `unverified-pipeline` | HIGH | `scripts/clean-room.sh` exits **2 (INCONCLUSIVE)** — zero commits, push HELD. CI has **never been executed** (UNVERIFIED). | Do not show a CI badge. Do not say "tests pass in CI". The on-camera evidence is the **live drill**, which genuinely ran. | **accepted** — script claims only the live drill (9/9, run at 18:39 WAT), never CI. |
| FG-008 | `wording-violation` | LOW | λ = 0.008 is **PINNED**, not calibrated. "Calibrated" implies a fitting run that never happened. | Say "pinned". Read ε and λ from `/health` on screen, never from a document. | **accepted** — script reads both off the live response. |
| FG-009 | `stale-state` | LOW | `tests/drill.sh` **step 0 re-seeds the corpus**, which reassigns claim ids. Running the full drill mid-take would renumber claims already on screen. | Run the full drill **before** rolling. During the take, fire only the single hero `curl` POST. | **accepted** — script Step 4 is one POST, not the drill. |
| FG-010 | `foreign-surface` | LOW | FalkorDB Browser on `:3000` and the engine container are other surfaces that must not be mistaken for MENGER. | Keep the browser window single-tab on `:3001`. No tab strip showing `:3000`. | **accepted** — framing note in script Pre-Recording Setup. |

## Counts

- CRITICAL: **2** — both dispositioned (`FG-001` fixed with proof, `FG-005` fixed by script control). **Open CRITICAL: 0.**
- HIGH: **4** — all dispositioned.
- LOW: **3** — all dispositioned.
- Open / undispositioned: **0**.
