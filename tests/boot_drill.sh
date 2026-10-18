#!/usr/bin/env bash
# tests/boot_drill.sh — the four boot controls, T-1..T-4, each able to FAIL.
#
# INTEGRATION tier: needs the pinned engine and the seeded corpus. No credentials, no network.
#
# This is a REWRITE of the form published in PLAN.md section 6.1, which critique DS-C4 found
# broken four ways — every one of them a way for the drill to pass without checking anything:
#
#   B-5  T-1/T-3 passed $ss/$c/$s/$t through `docker exec redis-cli`, which has NO parameter
#        binding. Both returned `Missing parameters`, and because the script never compared
#        the output to anything, `set -euo pipefail` sailed straight past. FIXED: the fixture
#        ids are written as literals (the shell has no binding, so the shell gets literals),
#        and every leg now COMPARES and exits non-zero on mismatch.
#   B-3  T-4 was inverted. `redis-cli` exits 0 on a FalkorDB error and writes the error to
#        STDOUT, so `if RO "CREATE ..."; then echo FAIL` fired on a CORRECTLY contained
#        engine. FIXED: the refusal is detected in the OUTPUT TEXT, never in the exit code.
#   B-4  T-2 had no command anywhere in the document and the script never ran it — so the
#        independent control, which is half of the headline claim, went unchecked. ADDED.
#   --   the published form also used `relTypes:['FLOW','DERIVED_FROM']`. `DERIVED_FROM` no
#        longer exists: critique RULING 2 collapsed it into one `:FLOW` carrying `kind`.
#
# Why T-1 and T-2 must BOTH run: maxFlow over unit-capacity EDGES counts EDGE-disjoint paths.
# The headline claim needs VERTEX-disjoint. The node split converts one into the other, and
# the 1-versus-2 pair is the only evidence the split is doing that work. Either alone proves
# nothing — a bug that returned a constant would satisfy whichever one it matched.
set -uo pipefail

CONTAINER="${MENGER_CONTAINER:-gh-falkor}"
G="${MENGER_GRAPH:-menger}"
API="${MENGER_API:-http://127.0.0.1:8000}"   # 127.0.0.1, never localhost — see DEV-004

fails=0
RO() { docker exec "$CONTAINER" redis-cli GRAPH.RO_QUERY "$G" "$1" 2>&1; }
scalar() { RO "$1" | sed -n 2p | tr -d '[:space:]'; }

ck() { # label expected actual
  if [ "$2" = "$3" ]; then
    printf '  [PASS] %-44s expected=%-9s actual=%s\n' "$1" "$2" "$3"
  else
    printf '  [FAIL] %-44s expected=%-9s actual=%s\n' "$1" "$2" "$3"
    fails=$((fails + 1))
  fi
}

echo "boot drill — engine=$CONTAINER graph=$G"
echo

# --- T-1: the echo chamber scores 1 ---------------------------------------------
# clm_0001 cites several sources that all funnel through ONE shared origin. The honest
# answer is 1, not the citation count.
# `maxflow_q` builds the statement in a function and every result lands in a plain variable
# first. The nested form `ck ... "$(scalar "MATCH ... {a:1, b:2} ...")"` LOOKS equivalent and
# is not: macOS ships bash 3.2, which loses the inner quoting inside `"$( ... )"` and then
# BRACE-EXPANDS the config map `{relationshipTypes:[...], sourceNodes:[...], ...}` into four
# separate arguments. `scalar` received a different (and invalid) statement each time and
# returned empty — a silent, quoting-shaped failure. Found by `bash -x`, not by reading.
maxflow_q() { # claim_id
  printf "%s" "MATCH (s:SuperSource {nid:'ss'}), (c:Claim {nid:'$1'}) CALL algo.maxFlow({relationshipTypes:['FLOW'], sourceNodes:[s], targetNodes:[c], capacityProperty:'cap'}) YIELD maxFlow RETURN maxFlow"
}

echo "T-1  echo chamber -> independence 1"
T1=$(scalar "$(maxflow_q clm_0001)")
ck "T-1 maxFlow(ss -> clm_0001)" "1" "$T1"

# --- T-2: two vertex-disjoint origins score 2 -----------------------------------
echo "T-2  genuinely independent -> independence 2"
T2=$(scalar "$(maxflow_q clm_0002)")
ck "T-2 maxFlow(ss -> clm_0002)" "2" "$T2"

# --- T-3: reliability is a WEIGHTED sum, not a hop count ------------------------
# The expected value is deliberately non-integer so a regression to hop count cannot
# accidentally satisfy it.
echo "T-3  SPpaths pathWeight is weighted (expect 0.21072)"
W=$(scalar "MATCH (s:SuperSource {nid:'ss'}), (c:Claim {nid:'clm_0001'}) CALL algo.SPpaths({sourceNode:s, targetNode:c, relTypes:['FLOW'], weightProp:'nl'}) YIELD pathWeight RETURN pathWeight")
ck "T-3 pathWeight (5 d.p.)" "0.21072" "$(python3 -c "print(f'{float(\"$W\"):.5f}')" 2>/dev/null || echo "$W")"

# --- T-3b: the AF-3 silent trap, reproduced, not quoted -------------------------
# `algo.SPpaths` accepts ONLY `weightProp`. Any other key silently returns the hop count
# and raises NOTHING. Running the identical statement both ways is the only honest proof
# that the live engine still behaves this way, and the guard is weight != hops rather than
# a memorised constant.
echo "T-3b the AF-3 trap: weightProp vs weightProperty"
HOPS=$(scalar "MATCH (s:SuperSource {nid:'ss'}), (c:Claim {nid:'clm_0001'}) CALL algo.SPpaths({sourceNode:s, targetNode:c, relTypes:['FLOW'], weightProp:'nl'}) YIELD pathCost RETURN pathCost")
TRAP=$(scalar "MATCH (s:SuperSource {nid:'ss'}), (c:Claim {nid:'clm_0001'}) CALL algo.SPpaths({sourceNode:s, targetNode:c, relTypes:['FLOW'], weightProperty:'nl'}) YIELD pathWeight RETURN pathWeight")
ck "T-3b wrong key silently returns hop count" "$HOPS" "$TRAP"
if [ "$W" = "$HOPS" ]; then
  echo "  [FAIL] T-3b pathWeight == pathCost — the weighted read has regressed to hop count"
  fails=$((fails + 1))
else
  printf '  [PASS] %-44s weight=%s hops=%s\n' "T-3b weight is not the hop count" "$W" "$HOPS"
fi

# --- T-4: containment is a SERVER-SIDE refusal ----------------------------------
# Detected in the output text. `redis-cli` exits 0 on a server-side error, so the exit code
# carries no information here — which is exactly what made the published form inverted.
echo "T-4  containment: a CREATE through GRAPH.RO_QUERY must be refused"
OUT=$(RO "CREATE (:BootProbe {x:1})")
if printf '%s' "$OUT" | grep -q 'read-only'; then
  printf '  [PASS] %-44s %s\n' "T-4 write refused server-side" "$(printf '%s' "$OUT" | head -1 | cut -c1-58)"
else
  echo "  [FAIL] T-4 RO_QUERY did NOT refuse a write — the containment boundary is not in effect"
  echo "         engine said: $OUT"
  fails=$((fails + 1))
fi

# --- the same controls through the public surface -------------------------------
# /health runs these LIVE on every request and fails closed with 503 on mismatch. If the API
# is not up, that is reported as SKIP — never as a pass.
echo
echo "the same four controls, through GET /health"
if H=$(curl -sS --max-time 5 "$API/health" 2>/dev/null) && [ -n "$H" ]; then
  ck "/health boot_checks.passed"        "true"    "$(printf '%s' "$H" | jq -r '.boot_checks.passed')"
  ck "/health node_split_echo"           "1"       "$(printf '%s' "$H" | jq -r '.boot_checks.node_split_echo.actual')"
  ck "/health node_split_independent"    "2"       "$(printf '%s' "$H" | jq -r '.boot_checks.node_split_independent.actual')"
  ck "/health sp_path_weight"            "0.21072" "$(printf '%s' "$H" | jq -r '.boot_checks.sp_path_weight.actual')"
  ck "/health ro_query_refuses_write"    "true"    "$(printf '%s' "$H" | jq -r '.boot_checks.extra.ro_query_refuses_write.pass')"
  ck "/health sp_weight_is_not_hop_count" "true"   "$(printf '%s' "$H" | jq -r '.boot_checks.extra.sp_weight_is_not_hop_count.pass')"
  echo "  epsilon=$(printf '%s' "$H" | jq -r .epsilon)  lambda=$(printf '%s' "$H" | jq -r '."lambda"')  (read from /health, never from a document)"
else
  echo "  [SKIP] the API is not listening on $API — the engine-level legs above still ran."
  echo "         Start it with: python3 -m uvicorn app.api:app --port 8000"
fi

echo
if [ "$fails" -eq 0 ]; then echo "boot drill OK — T-1, T-2, T-3, T-3b, T-4 all green"; exit 0; fi
echo "boot drill FAILED — $fails check(s)" >&2
exit 1
