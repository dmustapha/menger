# Tests — the three tiers, and why the split exists

The split is here so a green default gate can never be mistaken for live proof. Each tier
names its own dependencies, and the default gate runs only the tiers that can honestly run
without a server.

| Tier | Glob | Dependencies | In the default gate? |
|------|------|--------------|----------------------|
| **offline unit** | `tests/unit/*.test.sh` | none — no engine, no network, no credentials | **yes** |
| **integration** | `tests/boot_drill.sh`, `tests/drill.sh` | the pinned engine, the seeded synthetic corpus, and for `drill.sh` a running API on `127.0.0.1:8000` | `boot_drill` yes via the claims verifier; **`drill.sh` no — see below** |
| **live network** | *(none)* | — | n/a |

## There is no live-network tier, and that is a fact about the project

MENGER touches no external network. It holds no keys and signs nothing (INV-22): no RPC
endpoint, no third-party API, no credential. So `liveGlob` is empty not because the live
tests were skipped, but because there is nothing live to test. If MENGER ever acquires an
external dependency, that dependency's tests belong in a `*.live.sh` tier and must stay out
of `scripts/verify.sh`.

## Why `tests/drill.sh` is excluded from the default gate

`drill.sh` drives the real HTTP surface and therefore needs `uvicorn app.api:app` already
listening. A gate that silently started a server would be a gate that passes for reasons the
reader cannot see. So it is named here, run explicitly, and owned downstream:

```bash
# the default gate — identical locally and in CI
bash scripts/verify.sh

# the API end-to-end drill — requires the API to be up first
python3 -m uvicorn app.api:app --port 8000 &
bash tests/drill.sh
```

`drill.sh` is the artifact that discharges PLAN.md's C-2/C-3/C-4 done-criteria, and it is
handed to the downstream live-run phase to execute against the deployed stack. Excluding it
from the default gate is a visibility decision, not a coverage decision — the one thing not
permitted is for it to pass quietly inside something else.

## Addressing

Use `127.0.0.1`, never `localhost`. On this host `localhost` resolves to `::1` first, and an
unrelated process holding IPv6 `*:8000` will answer instead of the API. See DEV-004.
