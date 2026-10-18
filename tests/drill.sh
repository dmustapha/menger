#!/usr/bin/env bash
# tests/drill.sh — the end-to-end drill: C-2 (all three verdicts), C-3 (receipt + replay),
# C-4 (witness sets), and DS-C11 (an executable BLOCK witness).
#
# INTEGRATION tier: needs the pinned engine, the seeded corpus, and the API. No credentials,
# no external network. Every leg addresses 127.0.0.1 explicitly.
#
# This is a REWRITE of the form published in PLAN.md section 6.2. Four defects, all found by
# running it rather than reading it:
#
#   DEV-004  it used `http://localhost:8000`. On this host `localhost` resolves to `::1`
#            first, and a FOREIGN process (an unrelated `python -m http.server`) was bound to
#            the IPv6 wildcard on :8000. The drill was talking to someone else's server and
#            getting a SimpleHTTP 404. 127.0.0.1 pins it to our uvicorn.
#   ids      it posted as `agt_planner_7` (the corpus seeds `agt_planner_1..5`) and cited
#            `src_tie_a` (never seeded at all). The near-tie set-piece's real sources are
#            `src_nw_email` + `src_nw_email_mirror`, against the incumbent `clm_0019`
#            (`silver`, cited from `src_nw_portal` + its mirror).
#   re-run   it was not re-runnable. Step 3 ADMITS a claim into `vendor:northwind|region`, so
#            on the second run that slot is occupied and the ALLOW becomes UNDECIDED. The fix
#            is to re-seed first: `app/seed.py main()` DELETEs the graph, rebuilds it, and
#            re-asserts the boot controls before returning. The drill is now deterministic,
#            which is also what makes step 9's incumbent-unchanged assertion mean anything.
#   DS-C11   it had no step that asserted a BLOCK. The eight-step drill in ARCHITECTURE
#            section 7.14 asserts no BLOCK on any step; the HERO BEAT asserts an ADMITTED
#            write. So the product's headline verdict — "the graph refused it" (PRD.md:553) —
#            had no executable witness anywhere in the repo. Step 9 is that witness.
set -uo pipefail

API="${MENGER_API:-http://127.0.0.1:8000}"   # 127.0.0.1, never localhost — see DEV-004
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fails=0
post() { curl -sS -X POST "$API/remember" -H 'content-type: application/json' -d "$1"; }

ck() { # label file jq-filter
  if printf '%s' "$(cat "$2")" | jq -e "$3" >/dev/null 2>&1; then
    printf '  [PASS] %s\n' "$1"
  else
    printf '  [FAIL] %s\n' "$1"
    printf '         filter: %s\n' "$3"
    printf '         got:    %s\n' "$(head -c 400 "$2")"
    fails=$((fails + 1))
  fi
}

# --- 0. determinism: re-seed ------------------------------------------------
# Not optional. Steps 3 and 9 both depend on the corpus being in its pinned state: step 3
# needs `vendor:northwind|region` EMPTY, step 9 needs `customer:acme|primary_region` held by
# clm_0007 and nothing else.
echo "--- 0. re-seed the corpus (deterministic: SEED_RNG + SEED_NOW are pinned)"
if ! (cd "$REPO_ROOT" && python3 -m app.seed >"$TMP/seed.log" 2>&1); then
  echo "  [FAIL] seed failed" >&2; tail -20 "$TMP/seed.log" >&2; exit 1
fi
printf '  [PASS] %s\n' "$(grep -c . "$TMP/seed.log" >/dev/null; tail -1 "$TMP/seed.log")"

# --- 1. the gate is live ---------------------------------------------------
echo "--- 1. GET /health — the four boot controls, run live on this request"
if ! curl -sS --max-time 5 "$API/health" >"$TMP/health.json" 2>/dev/null; then
  echo "  [FAIL] the API is not listening on $API." >&2
  echo "         start it: python3 -m uvicorn app.api:app --host 127.0.0.1 --port 8000" >&2
  exit 1
fi
ck "boot_checks.passed == true" "$TMP/health.json" '.boot_checks.passed == true'
EPS=$(jq -r .epsilon "$TMP/health.json")
LAM=$(jq -r '."lambda"' "$TMP/health.json")
echo "  epsilon=$EPS lambda=$LAM  (read from /health — never from a document, CL-F-009)"

# --- 2. the echo chamber -> BLOCK ------------------------------------------
# Two blog echoes that both funnel through src_blog_hub. The citation count is 2; the honest
# independence is 1. The incumbent clm_0007 cites two vertex-disjoint origins.
echo "--- 2. echo chamber into an occupied slot -> expect BLOCK"
post '{"agent_id":"agt_scraper_2","subject":"customer:acme","predicate":"primary_region",
       "object":"us-east-1","sources":["src_blog_echo_a","src_blog_echo_b"]}' >"$TMP/m2.json"
ck "verdict BLOCK, recorded, no review opened, status REFUSED" "$TMP/m2.json" \
  '.verdict=="BLOCK" and .recorded==true and .review_id==null and .status=="REFUSED"'
ck "the echo's independence is 1, not its citation count (2)" "$TMP/m2.json" \
  '.incoming.components.independence==1 and (.incoming.sources|length)==2'

# --- 3. corroborated -> ALLOW ---------------------------------------------
# Two independent origins into an EMPTY slot. Empty slot + a measurable chain = ALLOW.
echo "--- 3. two vertex-disjoint origins into an empty slot -> expect ALLOW"
post '{"agent_id":"agt_planner_1","subject":"vendor:northwind","predicate":"region",
       "object":"eu-central-1","sources":["src_crm_export","src_contract_pdf"]}' >"$TMP/m3.json"
ck "verdict ALLOW, independence 2, status ADMITTED" "$TMP/m3.json" \
  '.verdict=="ALLOW" and .incoming.components.independence==2 and .status=="ADMITTED"'

# --- 4. the near-tie -> UNDECIDED -----------------------------------------
# Both sides are echoes (independence 1), so the decision falls to reliability x recency and
# lands inside the band. The band is CLOSED: |margin| <= epsilon is UNDECIDED.
echo "--- 4. the near-tie set-piece -> expect UNDECIDED"
post '{"agent_id":"agt_crawler_1","subject":"vendor:northwind","predicate":"sla_tier",
       "object":"gold","sources":["src_nw_email","src_nw_email_mirror"]}' >"$TMP/m4.json"
ck "verdict UNDECIDED, a review opened, |margin| <= epsilon" "$TMP/m4.json" \
  '.verdict=="UNDECIDED" and .review_id!=null
   and ((if .margin<0 then -.margin else .margin end) <= .epsilon)'
echo "  margin=$(jq -r .margin "$TMP/m4.json") epsilon=$(jq -r .epsilon "$TMP/m4.json")"

# --- 5. the review queue --------------------------------------------------
echo "--- 5. the opened review is in GET /review?status=OPEN"
RID=$(jq -r .review_id "$TMP/m4.json")
curl -sS "$API/review?status=OPEN" >"$TMP/review.json"
ck "review_id $RID is queued" "$TMP/review.json" \
  "[.items[].review_id]|index(\"$RID\")!=null"

# --- 6. the receipt -------------------------------------------------------
echo "--- 6. GET /receipts/{id} — verbatim statements and un-blended components"
RCPT=$(jq -r .receipt_id "$TMP/m3.json")
curl -sS "$API/receipts/$RCPT" >"$TMP/rcpt.json"
ck "read_command is GRAPH.RO_QUERY on every statement" "$TMP/rcpt.json" \
  '[.cypher[].read_command]|length>0 and all(.=="GRAPH.RO_QUERY")'
ck "the three components are surfaced separately, path_weight raw" "$TMP/rcpt.json" \
  '.candidates[0].components|has("independence") and has("reliability") and has("recency")'
ck "the independence witness is present" "$TMP/rcpt.json" \
  '.candidates[0].independence_witness.max_flow==.candidates[0].components.independence'

# --- 7. replay ------------------------------------------------------------
# Only recency may legitimately drift, because it is a function of the clock.
echo "--- 7. POST /receipts/{id}/replay — re-executes and diffs"
curl -sS -X POST "$API/receipts/$RCPT/replay" >"$TMP/replay.json"
ck "matches_original, and any divergence is RECENCY_DECAY only" "$TMP/replay.json" \
  '.matches_original==true and ([.divergence[]?.reason]|all(.=="RECENCY_DECAY"))'
# the contract allows an empty body AND no body at all
curl -sS -X POST "$API/receipts/$RCPT/replay" -H 'content-type: application/json' -d '{}' \
  >"$TMP/replay2.json"
ck "replay with an explicit {} body behaves identically" "$TMP/replay2.json" \
  '.matches_original==true'

# --- 8. the witness subgraph ---------------------------------------------
echo "--- 8. GET /slots/{key}/graph — the vertex-disjoint witness sets"
KEY=$(printf 'customer:acme|primary_region' | jq -sRr @uri)
curl -sS "$API/slots/$KEY/graph" >"$TMP/graph.json"
ck "the subgraph has nodes and at least one witness set" "$TMP/graph.json" \
  '(.nodes|length)>0 and (.witness_sets|length)>0'

# --- 9. DS-C11: the BLOCK witness ---------------------------------------
# The headline verdict, with an executable proof on BOTH halves.
#
# Asserting the BLOCK alone is not enough, and that is the whole point of this step. A gate
# that returns the string "BLOCK" while quietly promoting the loser is strictly worse than no
# gate, because the receipt would say the right thing. So: capture the incumbent FIRST, post a
# losing write, assert the refusal, then re-read the slot and assert the incumbent is byte-for-
# byte the claim that was there before. That re-read is the half that satisfies TASTE C-IN1.
echo "--- 9. DS-C11: a losing write into an occupied slot must be REFUSED, and the"
echo "       incumbent must be unchanged afterwards"
curl -sS "$API/slots/$KEY" >"$TMP/slot_before.json"
BEFORE_TOP=$(jq -r '.ranking[0]' "$TMP/slot_before.json")
BEFORE_OBJ=$(jq -r --arg c "$BEFORE_TOP" '.claims[]|select(.claim_id==$c)|.object' "$TMP/slot_before.json")
BEFORE_AT=$(jq -r --arg c "$BEFORE_TOP" '.claims[]|select(.claim_id==$c)|.asserted_at' "$TMP/slot_before.json")
echo "  incumbent before: $BEFORE_TOP = '$BEFORE_OBJ' asserted_at=$BEFORE_AT"
ck "the slot is genuinely OCCUPIED before the write (a BLOCK needs something to lose to)" \
  "$TMP/slot_before.json" '(.claims|length)>0 and .ranking[0]!=null'

# a single low-trust blog, echoed: independence 1 against the incumbent's 2.
post '{"agent_id":"agt_scraper_3","subject":"customer:acme","predicate":"primary_region",
       "object":"ap-south-1","sources":["src_blog_echo_a"]}' >"$TMP/m9.json"
ck "verdict == BLOCK" "$TMP/m9.json" '.verdict=="BLOCK"'
ck "status == REFUSED  (the claim is kept, and kept MARKED)" "$TMP/m9.json" '.status=="REFUSED"'
ck "recorded == true   (a refusal is still an auditable event)" "$TMP/m9.json" '.recorded==true'
ck "the refusal is replayable — it carries a receipt" "$TMP/m9.json" '.receipt_id!=null'

curl -sS "$API/slots/$KEY" >"$TMP/slot_after.json"
AFTER_TOP=$(jq -r '.ranking[0]' "$TMP/slot_after.json")
AFTER_OBJ=$(jq -r --arg c "$AFTER_TOP" '.claims[]|select(.claim_id==$c)|.object' "$TMP/slot_after.json")
AFTER_AT=$(jq -r --arg c "$AFTER_TOP" '.claims[]|select(.claim_id==$c)|.asserted_at' "$TMP/slot_after.json")
echo "  incumbent after:  $AFTER_TOP = '$AFTER_OBJ' asserted_at=$AFTER_AT"
if [ "$BEFORE_TOP" = "$AFTER_TOP" ] && [ "$BEFORE_OBJ" = "$AFTER_OBJ" ] \
   && [ "$BEFORE_AT" = "$AFTER_AT" ]; then
  printf '  [PASS] %s\n' "the incumbent is UNCHANGED — claim_id, object and asserted_at all identical"
else
  printf '  [FAIL] %s\n' "the incumbent MOVED across a refused write"
  printf '         before: %s / %s / %s\n' "$BEFORE_TOP" "$BEFORE_OBJ" "$BEFORE_AT"
  printf '         after:  %s / %s / %s\n' "$AFTER_TOP" "$AFTER_OBJ" "$AFTER_AT"
  fails=$((fails + 1))
fi
REFUSED_ID=$(jq -r .claim_id "$TMP/m9.json")
ck "the refused claim is visible in the slot, marked REFUSED, and NOT at the top" \
  "$TMP/slot_after.json" \
  "(.claims[]|select(.claim_id==\"$REFUSED_ID\")|.status)==\"REFUSED\" and .ranking[0]!=\"$REFUSED_ID\""

echo
if [ "$fails" -eq 0 ]; then echo "DRILL OK — 9 steps, all three verdicts, replay, and a BLOCK witness"; exit 0; fi
echo "DRILL FAILED — $fails check(s)" >&2
exit 1
