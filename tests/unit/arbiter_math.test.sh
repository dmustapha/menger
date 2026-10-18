#!/usr/bin/env bash
# tests/unit/arbiter_math.test.sh — OFFLINE tier. No engine, no network, no credentials.
# Exercises the pure arithmetic of the decision: the three verdict boundaries, the recency
# decay, and the deterministic incumbent tie-break. This tier is what makes the default gate
# runnable at slice-zero, before anything is deployed or even seeded.
set -euo pipefail
cd "$(cd "$(dirname "$0")/../.." && pwd)"
python3 - <<'PY'
import os, math, sys
os.environ.setdefault("MENGER_EPSILON", "0.05")
os.environ.setdefault("MENGER_LAMBDA_PER_HOUR", "0.0077")
from app import config
from app.arbiter import decide, recency, age_hours, parse_iso, pick_incumbent

fails = []
def ck(name, got, want):
    ok = got == want
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}: got={got!r} want={want!r}")
    if not ok: fails.append(name)

eps = config.EPSILON

# --- the three boundaries of CONTRACT.md 2.1, driven by score alone ------------
ck("ALLOW above the band",    decide({"score": 1.0}, {"score": 0.5})[0], "ALLOW")
ck("BLOCK below the band",    decide({"score": 0.5}, {"score": 1.0})[0], "BLOCK")
ck("UNDECIDED inside",        decide({"score": 1.0}, {"score": 1.0 - eps/2})[0], "UNDECIDED")

# The band is CLOSED: |margin| == epsilon is UNDECIDED, not ALLOW. An off-by-one on this
# comparison is exactly the kind of error a demo would never surface.
ck("UNDECIDED at +epsilon",   decide({"score": eps}, {"score": 0.0})[0], "UNDECIDED")
ck("UNDECIDED at -epsilon",   decide({"score": 0.0}, {"score": eps})[0], "UNDECIDED")

# An empty slot scores 0.0, so a first claim with any chain clears the band.
ck("empty slot admits",       decide({"score": 1.0}, None)[0], "ALLOW")
# A claim with NO measurable chain scores 0.0 and must land UNDECIDED, never ALLOW:
# "could not measure" is not "admissible".
ck("unmeasurable -> UNDECIDED", decide({"score": 0.0}, None)[0], "UNDECIDED")

# --- recency decay -----------------------------------------------------------
ck("recency(0) == 1.0", recency(0.0), 1.0)
ck("recency decays", recency(100.0) < recency(10.0), True)
ck("recency matches exp(-lambda*t)",
   round(recency(24.0), 12), round(math.exp(-config.LAMBDA_PER_HOUR * 24.0), 12))

# --- age_hours ---------------------------------------------------------------
now = parse_iso("2026-10-18T14:30:00Z")
ck("age_hours over one day", round(age_hours("2026-10-17T14:30:00Z", now), 6), 24.0)

# --- incumbent tie-break is deterministic ------------------------------------
# Equal scores must resolve by LATER asserted_at, then claim_id descending, so a receipt
# names the same incumbent on every read.
scored = [
    {"claim_id": "clm_a", "score": 1.0, "asserted_at": "2026-10-18T10:00:00Z"},
    {"claim_id": "clm_b", "score": 1.0, "asserted_at": "2026-10-18T12:00:00Z"},
    {"claim_id": "clm_me", "score": 9.0, "asserted_at": "2026-10-18T13:00:00Z"},
]
ck("tie-break picks later asserted_at", pick_incumbent(scored, "clm_me")["claim_id"], "clm_b")
ck("tie-break is stable", pick_incumbent(list(reversed(scored)), "clm_me")["claim_id"], "clm_b")
ck("no other claim -> no incumbent", pick_incumbent([scored[2]], "clm_me"), None)

print(f"\n{len(fails)} failure(s)")
sys.exit(1 if fails else 0)
PY
