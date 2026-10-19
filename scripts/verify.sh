#!/usr/bin/env bash
# scripts/verify.sh — THE one release gate. Reused byte-identical in local dev and in CI,
# so there is no gate drift. Offline + integration tiers ONLY; the live tier is excluded
# on purpose (see tests/README.md) so a green gate can never stand in for live proof.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
fails=0
step() { echo; echo "── $1"; }
run() { if "$@"; then echo "  OK"; else echo "  FAIL"; fails=$((fails+1)); fi; }

step "syntax — every module compiles"
run python3 -m compileall -q app

step "vocabulary — no cardinal-probability language on the scoring surface"
run bash -c '[ "$(grep -rniE "confidence|probability|percent" app/*.py | wc -l | tr -d "[:space:]")" = 0 ]'

step "vocabulary — no overreach language anywhere in the engine"
run bash -c '[ "$(grep -rniE "stored procedure|detects conflict|truth" app/*.py | wc -l | tr -d "[:space:]")" = 0 ]'

step "offline unit tier — tests/unit/*.test.sh"
for t in tests/unit/*.test.sh; do [ -e "$t" ] || continue; echo "  $t"; run bash "$t"; done

step "claims re-derivation — every headline number, from the engine"
run bash scripts/verify-claims.sh all

echo
if [ "$fails" -eq 0 ]; then echo "verify OK: gate green (offline + integration; live tier excluded by design)"; exit 0; fi
echo "verify FAILED: $fails step(s)" >&2; exit 1
