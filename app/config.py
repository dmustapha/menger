# app/config.py
"""Every tunable in MENGER, in exactly one place.

AF-17 / DS-8 / R-4: epsilon and lambda are SERVER constants. They are published by
GET /health and echoed on every decision. Nothing downstream — and in particular not the
console — may hold its own copy. Any module that needs them imports them from here.
"""
import os

# --- engine identity -------------------------------------------------------
# AF-9: the pin is load-bearing. :latest currently resolves to v4.22.1, but GraphRAG-SDK
# is broken on 6.0.x, so the explicit tag is the thing that keeps this reproducible.
ENGINE_IMAGE = "falkordb/falkordb:v4.22.1"
REDIS_URL = os.getenv("MENGER_REDIS_URL", "redis://localhost:6379")
GRAPH_NAME = os.getenv("MENGER_GRAPH", "menger")

# AF-8: the containment boundary, enforced server-side. This literal is what
# CONTRACT.md requires in receipt.engine.read_path and in every recorded statement.
READ_PATH = "GRAPH.RO_QUERY"

# --- the decision band -----------------------------------------------------
# [ASSUMED] epsilon is a proposed, UNMEASURED default (brief section 3). It is calibrated in
# B2 against the seeded near-tie (section 6.3) and reported by /health. It is NEVER tuned to
# manufacture a demo outcome, because it is visible on every decision.
EPSILON = float(os.getenv("MENGER_EPSILON", "0.05"))

# [ASSUMED] lambda is likewise unmeasured — but its VALUE is now pinned by evidence rather
# than by a declaration, per critique RULING 1 (CL-F-009, P0).
#
# Three values existed across the documents, all per-hour: 0.0077 (15 sites), 0.0080 (4),
# 0.01 (14). The tie-break is NOT "what the contract declares", because CONTRACT.md
# contradicts itself: it declares `lambda: 0.0077` while PUBLISHING `recency: 0.9261` at
# `age_hours: 9.6`, and -ln(0.9261)/9.6 = 0.0079972. That recency is load-bearing on the
# contract's own hero arithmetic (`score: 1.5002`, `top_margin: 0.9782`), and both 0.0077
# and 0.01 break it. A published OUTPUT pins the constant that produced it; a declared
# input that disagrees with its own output is the thing in error.
#
# So: 0.0080/hour (86.6h half-life). The ruling's side effect is accepted deliberately —
# re-pinning lambda flips the SIGN of the near-tie set-piece margin. The verdict stays
# UNDECIDED, so no guarantee moves. The rule is: RE-SEED THE TRUSTS, NEVER RE-TUNE LAMBDA.
# Tuning a published constant to make a demo read better is the one thing it must never do.
# /health remains the single runtime authoritative source — never read this from a document.
LAMBDA_PER_HOUR = float(os.getenv("MENGER_LAMBDA_PER_HOUR", "0.0080"))

# --- rounding --------------------------------------------------------------
# CONTRACT.md prints reliability/recency/score at 4 d.p. and path_weight at 5 d.p.
# Rounding happens ONCE, in the response projection (section 9), never before.
DP_COMPONENT = 4
DP_PATH_WEIGHT = 5
DP_MARGIN = 4

# --- node-id conventions (CONTRACT.md section 2.4, frozen) -----------------
SS_NID = "ss"


def si(sid: str) -> str:
    """The :SourceIn half of source `sid`."""
    return f"si:{sid}"


def so(sid: str) -> str:
    """The :SourceOut half of source `sid`."""
    return f"so:{sid}"


# --- boot assertions (AF-16) ----------------------------------------------
# The three contract-named checks, plus the two additions justified in section 13.2.
# These claim ids are SEEDED boot controls, created by app/seed.py on the two
# `control:boot|*` slots. They are part of the corpus on purpose: a judge can click them.
BOOT_ECHO_CLAIM = "clm_0001"          # funnels through one shared origin -> expect 1
BOOT_INDEPENDENT_CLAIM = "clm_0002"   # two vertex-disjoint origins       -> expect 2

BOOT_ECHO_EXPECTED = 1                # AF-6 / DS-1, [VERIFIED section 3-P11]
BOOT_INDEPENDENT_EXPECTED = 2         # AF-6 / DS-1, [VERIFIED section 3-P13]
BOOT_SP_WEIGHT_EXPECTED = 0.21072     # AF-3 / DS-2, [VERIFIED section 3-P7]

# path_weight is a float sum; compare with a tolerance tighter than the 5th decimal place
# it is published at, so a real regression cannot hide inside the tolerance.
BOOT_SP_WEIGHT_TOLERANCE = 5e-6

# --- corpus determinism (section 6) ---------------------------------------
SEED_RNG = 20261018
SEED_NOW = "2026-10-18T14:30:00Z"     # the corpus's frozen reference instant

# --- limits ----------------------------------------------------------------
MAX_PATH_HOPS = 12          # variable-length bound for the subgraph read, [VERIFIED P44]
SLOT_LIMIT_DEFAULT = 50     # CONTRACT.md section 2.2
SLOT_LIMIT_MAX = 200
