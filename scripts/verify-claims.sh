#!/usr/bin/env bash
# verify-claims.sh — re-derive every headline number in CLAIMS.md from the live engine.
#
# This script RE-DERIVES. It never reads a number back out of CLAIMS.md, BUILD-REPORT.md,
# PULSE.md or any other document and calls that verification. Every value below comes from
# the engine or from the source tree.
#
# Writes machine-readable output to evidence/claims.txt so a clean-room run can diff it.
#
# Usage:  scripts/verify-claims.sh          # all claims
#         scripts/verify-claims.sh ds10     # only the GRAPH.COPY latency probe
#
# It does NOT start, stop or remove the gh-falkor container, and it does NOT re-seed.

set -uo pipefail

CONTAINER="${MENGER_CONTAINER:-gh-falkor}"
GRAPH_NAME="${MENGER_GRAPH:-menger}"
EVIDENCE_DIR="$(cd "$(dirname "$0")/.." && pwd)/evidence"
OUT="$EVIDENCE_DIR/claims.txt"
mkdir -p "$EVIDENCE_DIR"

fails=0

RO() { docker exec "$CONTAINER" redis-cli GRAPH.RO_QUERY "$GRAPH_NAME" "$1" 2>&1; }

# Pull the scalar out of a redis-cli graph reply: line 1 is the header, line 2 the value.
scalar() { RO "$1" | sed -n 2p | tr -d '[:space:]'; }

emit() { printf '%-10s %-12s %s\n' "$1" "$2" "$3" | tee -a "$OUT"; }

check() { # id  expected  actual  description
  local id="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    emit "$id" "PASS" "expected=$expected actual=$actual"
  else
    emit "$id" "FAIL" "expected=$expected actual=$actual"
    fails=$((fails + 1))
  fi
}

ds10() {
  # CLM-10 — GRAPH.COPY latency. Bounded probe: n=3, with a PING baseline used to estimate
  # the docker-exec overhead that dominates the raw wall time. Honest about its own limits.
  local i start end copy_ms ping_ms
  for i in 1 2 3; do
    start=$(python3 -c 'import time;print(time.time())')
    docker exec "$CONTAINER" redis-cli GRAPH.COPY "$GRAPH_NAME" "ds10_probe_$i" >/dev/null 2>&1
    end=$(python3 -c 'import time;print(time.time())')
    copy_ms=$(python3 -c "print(f'{($end-$start)*1000:.1f}')")

    start=$(python3 -c 'import time;print(time.time())')
    docker exec "$CONTAINER" redis-cli PING >/dev/null 2>&1
    end=$(python3 -c 'import time;print(time.time())')
    ping_ms=$(python3 -c "print(f'{($end-$start)*1000:.1f}')")

    emit "CLM-10.$i" "MEASURED" "copy_wall=${copy_ms}ms ping_baseline=${ping_ms}ms"
  done
  # Confirm the copy was faithful, then clean up the probes. Never touch $GRAPH_NAME.
  local src cp
  src=$(scalar 'MATCH (n) RETURN count(n)')
  cp=$(docker exec "$CONTAINER" redis-cli GRAPH.RO_QUERY ds10_probe_1 'MATCH (n) RETURN count(n)' 2>&1 | sed -n 2p | tr -d '[:space:]')
  check "CLM-10.f" "$src" "$cp"
  for i in 1 2 3; do docker exec "$CONTAINER" redis-cli GRAPH.DELETE "ds10_probe_$i" >/dev/null 2>&1; done
}

all() {
  # --- CLM-8: the engine is the pinned image -------------------------------
  local image ver
  image=$(docker ps --filter "name=$CONTAINER" --format '{{.Image}}')
  check "CLM-8.a" "falkordb/falkordb:v4.22.1" "$image"
  # MODULE LIST replies as a flat sequence: name / graph / ver / 42201 / path / ...
  # so the version is TWO lines after the module name, not one.
  ver=$(docker exec "$CONTAINER" redis-cli MODULE LIST | grep -A2 '^graph$' | tail -1 | tr -d '[:space:]')
  check "CLM-8.b" "42201" "$ver"

  # --- CLM-9: dijkstra and SCC do not exist --------------------------------
  local procs
  procs=$(RO 'CALL dbms.procedures() YIELD name RETURN name' | grep -cE 'algo\.(dijkstra|SCC)$')
  check "CLM-9" "0" "$procs"

  # --- CLM-1 / CLM-2: the node-split independence pair ---------------------
  local echo_flow indep_flow
  echo_flow=$(scalar "MATCH (s:SuperSource {nid:'ss'}), (c:Claim {nid:'clm_0001'}) CALL algo.maxFlow({relationshipTypes:['FLOW'], sourceNodes:[s], targetNodes:[c], capacityProperty:'cap'}) YIELD maxFlow RETURN maxFlow")
  indep_flow=$(scalar "MATCH (s:SuperSource {nid:'ss'}), (c:Claim {nid:'clm_0002'}) CALL algo.maxFlow({relationshipTypes:['FLOW'], sourceNodes:[s], targetNodes:[c], capacityProperty:'cap'}) YIELD maxFlow RETURN maxFlow")
  check "CLM-1" "1" "$echo_flow"
  check "CLM-2" "2" "$indep_flow"

  # --- CLM-3: weighted, not hop count --------------------------------------
  local weight
  weight=$(scalar "MATCH (s:SuperSource {nid:'ss'}), (c:Claim {nid:'clm_0001'}) CALL algo.SPpaths({sourceNode:s, targetNode:c, relTypes:['FLOW'], weightProp:'nl'}) YIELD pathWeight RETURN pathWeight")
  # 0.21072 within the seeded tolerance; compare to 5 decimal places.
  check "CLM-3" "0.21072" "$(python3 -c "print(f'{float('$weight'):.5f}')")"

  # --- CLM-4: the silent trap, reproduced ----------------------------------
  # The SAME statement with a misspelled weight key must return the hop count, with no error.
  local trap hops
  trap=$(scalar "MATCH (s:SuperSource {nid:'ss'}), (c:Claim {nid:'clm_0001'}) CALL algo.SPpaths({sourceNode:s, targetNode:c, relTypes:['FLOW'], weightProperty:'nl'}) YIELD pathWeight RETURN pathWeight")
  hops=$(scalar "MATCH (s:SuperSource {nid:'ss'}), (c:Claim {nid:'clm_0001'}) CALL algo.SPpaths({sourceNode:s, targetNode:c, relTypes:['FLOW'], weightProp:'nl'}) YIELD pathCost RETURN pathCost")
  check "CLM-4" "$hops" "$trap"

  # --- CLM-5: the read path is a server-side refusal -----------------------
  local refusal
  refusal=$(RO 'CREATE (:VerifyProbe {x:1})' | grep -c 'read-only')
  check "CLM-5" "1" "$refusal"

  # --- CLM-6: node split intact, no bypass ---------------------------------
  check "CLM-6.a" "$(scalar 'MATCH (n:SourceIn) RETURN count(n)')"  "$(scalar 'MATCH (n:SourceOut) RETURN count(n)')"
  check "CLM-6.b" "0" "$(scalar 'MATCH (:SuperSource)-[:FLOW]->(:SourceOut) RETURN count(*)')"
  check "CLM-6.c" "0" "$(scalar 'MATCH (:Claim)-[:CITES]->(:SourceOut) RETURN count(*)')"

  # --- CLM-7: unit capacity everywhere -------------------------------------
  check "CLM-7" "0" "$(scalar 'MATCH ()-[f:FLOW]->() WHERE f.cap <> 1.0 RETURN count(f)')"

  # --- CLM-14: provenance is ONE relationship type (critique RULING 2) -----
  # `algo.maxFlow` accepts exactly one entry in `relationshipTypes`, and max-flow does not
  # decompose over an edge-type partition, so two-calls-and-combine would be unsound. The
  # collapse into a single `:FLOW` carrying `kind` is what makes the single entry sufficient.
  check "CLM-14.a" "0" "$(scalar 'MATCH ()-[r:DERIVED_FROM]->() RETURN count(r)')"
  check "CLM-14.b" "4" "$(scalar 'MATCH ()-[f:FLOW]->() RETURN count(DISTINCT f.kind)')"

  # --- CLM-15: every :FLOW edge carries nl ---------------------------------
  # The second form of the AF-3 silent trap: the CORRECT weight key over edges that have no
  # weight property also returns a hop count, and also raises nothing. The guard is structural.
  check "CLM-15" "0" "$(scalar 'MATCH ()-[f:FLOW]->() WHERE f.nl IS NULL RETURN count(f)')"

  # --- CLM-11 / CLM-12: vocabulary, re-derived from the source tree --------
  local root; root="$(cd "$(dirname "$0")/.." && pwd)"
  check "CLM-11" "0" "$(grep -rniE 'confidence|probability|percent' "$root"/app/*.py | wc -l | tr -d '[:space:]')"
  check "CLM-12" "0" "$(grep -rniE 'stored procedure|detects conflict|truth' "$root"/app/*.py | wc -l | tr -d '[:space:]')"

  ds10
}

: > "$OUT"
echo "# MENGER claims, re-derived from the live engine" >> "$OUT"
echo "# container=$CONTAINER graph=$GRAPH_NAME" >> "$OUT"

case "${1:-all}" in
  ds10) ds10 ;;
  all)  all ;;
  *)    echo "usage: $0 [all|ds10]" >&2; exit 2 ;;
esac

echo
if [ "$fails" -eq 0 ]; then
  echo "verify-claims OK — every re-derived number matches CLAIMS.md"
  echo "evidence written to $OUT"
  exit 0
fi
echo "verify-claims FAILED — $fails claim(s) did not re-derive" >&2
exit 1
