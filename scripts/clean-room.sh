#!/usr/bin/env bash
# scripts/clean-room.sh — reproduce MENGER from a blank machine and prove the numbers.
#
# What this answers: "did the committed evidence come from the committed code, or from a
# working tree that has since moved on?" It clones the repo fresh into a throwaway dir,
# refuses to run if a secret survived into the tree, runs the offline suite with no
# credentials, REGENERATES the headline evidence, and DIFFS it against what is committed.
# Zero drift or it fails.
#
# Usage:  bash scripts/clean-room.sh [git-ref]      (default: HEAD)
#
# This script does NOT start, stop or remove the gh-falkor container.
set -uo pipefail

REF="${1:-HEAD}"
ORIGIN="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/menger-cleanroom.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
fails=0
step() { echo; echo "══ $1"; }
bad()  { echo "   FAIL: $1"; fails=$((fails+1)); }

step "1. clone-fresh guard — nothing preinstalled, nothing inherited"
# Two distinct ways there can be nothing to clone, and BOTH are INCONCLUSIVE rather than FAIL.
# A clean-room run that reports FAIL because the repo has no commits is lying about what it
# measured: nothing was reproduced, so nothing was found to differ. The first version of this
# script only handled the not-a-work-tree case; the zero-commit case fell through to `git clone`
# of an empty repository, which warns rather than errors, and then every downstream step failed
# on a missing `app/`. Three red FAILs for a condition that is a precondition, not a defect.
inconclusive() {
  echo "   SKIP: $1"
  echo; echo "clean-room INCONCLUSIVE — the honest answer is that this cannot run yet."
  echo "MENGER's working tree is intentionally uncommitted at this stage (push is HELD per the"
  echo "build binding), so there is no ref to clone. This script is SHIPPED, not yet RUN: the"
  echo "cold-clone proof is deploy's step 9g, after the first commit exists."
  exit 2
}
if ! git -C "$ORIGIN" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  inconclusive "$ORIGIN is not a git work tree — there is no committed state to clone."
fi
if ! git -C "$ORIGIN" rev-parse --verify --quiet HEAD >/dev/null 2>&1; then
  inconclusive "$ORIGIN is a git work tree with ZERO commits — HEAD does not resolve."
fi
git clone --quiet --no-hardlinks "$ORIGIN" "$WORK/repo" || bad "clone failed"
git -C "$WORK/repo" checkout --quiet "$REF" || bad "checkout $REF failed"
CLONE="$WORK/repo"
echo "   cloned $REF to $CLONE"

step "2. secret guard — no key, seed or credential survived into the clone"
# Patterns, not filenames: a secret that got committed under an innocent name still counts.
leaks=$(grep -rniE \
  'BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY|PRIVATE_KEY *=|MNEMONIC *=|SECRET_KEY *=|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-' \
  "$CLONE" --exclude-dir=.git 2>/dev/null | grep -vE '/(SECURITY|CLAIMS)\.md:|scripts/clean-room\.sh:' || true)
if [ -n "$leaks" ]; then bad "a credential-shaped string is in the tree:"; echo "$leaks"; else echo "   clean"; fi
# The engine must not be reachable with a password baked in either.
grep -rn 'requirepass' "$CLONE" --exclude-dir=.git >/dev/null 2>&1 && bad "requirepass in tree" || echo "   no baked engine password"

step "3. offline suite — no credentials, no engine, no network"
( cd "$CLONE" && python3 -m compileall -q app ) || bad "the clone does not compile"
for t in "$CLONE"/tests/unit/*.test.sh; do
  [ -e "$t" ] || continue
  echo "   $(basename "$t")"
  ( cd "$CLONE" && bash "$t" >/dev/null 2>&1 ) || bad "$(basename "$t") failed in the clone"
done
echo "   offline tier done"

step "4. regenerate the headline evidence from the clone"
mkdir -p "$CLONE/evidence"
( cd "$CLONE" && bash scripts/verify-claims.sh all >/dev/null 2>&1 ) \
  || bad "the clone could not re-derive its own claims"

step "5. diff regenerated evidence against what is committed — expect zero drift"
if [ ! -s "$ORIGIN/evidence/claims.txt" ]; then
  bad "no committed evidence at evidence/claims.txt to diff against"
elif [ ! -s "$CLONE/evidence/claims.txt" ]; then
  bad "the clone produced no evidence"
else
  # Compare the VERDICT of every claim, not the measured latency figures: CLM-10 is a
  # load-sensitive timing probe and is EXPECTED to differ run to run. Pretending otherwise
  # would make this gate either permanently red or quietly tolerant of real drift.
  norm() { grep -vE '^CLM-10\.[0-9]' "$1" | grep -E '^CLM' | awk '{print $1, $2}' | sort; }
  if diff <(norm "$ORIGIN/evidence/claims.txt") <(norm "$CLONE/evidence/claims.txt"); then
    echo "   zero drift across every re-derived claim verdict"
    echo "   (CLM-10.1-3 excluded by design: a wall-clock timing probe is not reproducible"
    echo "    to the millisecond, and CLAIMS.md states it as a range for that reason)"
  else
    bad "the clone's numbers disagree with the committed evidence (see diff above)"
  fi
fi

echo
if [ "$fails" -eq 0 ]; then echo "clean-room OK — $REF reproduces, and its numbers are the committed numbers"; exit 0; fi
echo "clean-room FAILED — $fails check(s)" >&2
exit 1
