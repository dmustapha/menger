# SECURITY — MENGER

MENGER is an **admission-control gate on agent memory**. It decides whether a fact an agent
wants to write into a shared graph is **admissible**. It does **not** decide whether that fact
is correct. That distinction is the whole security posture, so it is stated first: MENGER
answers "may this be written, given where it came from?" — never "is this right?"

MENGER **holds no keys and signs nothing.** There is no wallet, no private key, no credential
in the repository or in the running process. The corpus is synthetic and committed in-repo.

---

## Threat matrix

Each row is a threat the design actually enforces against, mapped to the code that enforces it.

| Threat | Enforcement | File |
|--------|-------------|------|
| **Echo chamber** — N citations that all funnel through one origin, inflating apparent corroboration | Independence is `algo.maxFlow` over a **node-split** provenance DAG, so it counts **vertex**-disjoint source paths. Five citations sharing one origin yield independence `1`, not `5`. | `app/seed.py` (the split), `app/cypher.py` → `independence.maxFlow`, `app/arbiter.py` |
| **Generated Cypher escaping read-only intent** | Every read goes through one channel that issues `GRAPH.RO_QUERY`. The engine itself refuses writes on that path — verified live: `CREATE` returns `graph.RO_QUERY is to be executed only on read-only queries`. This is a **server-side** refusal, not a client-side convention. | `app/graph.py` → read channel |
| **Unintended writes from the write channel** | The write channel **raises** unless the statement's first keyword is `CREATE` or `MERGE`, and it only ever inserts `:Claim` / `:Review` / `:Receipt`. | `app/graph.py` → write channel |
| **Cypher injection via request fields** | Every value in every statement is a **bound parameter**. No request field is ever interpolated into a query string. Statements live as constants in one module. | `app/cypher.py`, `app/graph.py` |
| **Silent metric regression** (`algo.SPpaths` returns a hop count instead of a weighted sum when the weight key is misspelled — **no error is raised**) | `GET /health` asserts `pathWeight == 0.21072` on a seeded control, and separately asserts `pathWeight != pathCost`. The expected value is deliberately **non-integer** so a regression to hop count cannot satisfy it. `/health` fails **closed**: on mismatch every route serves `503 BOOT_ASSERTION_FAILED`. | `app/bootcheck.py`, `app/config.py`, `app/api.py` |
| **Booting on a broken assumption** | Six boot assertions run live on every `/health` — not cached at process start, because a cached result reports the graph as it was, which is the opposite of what a status strip is for. | `app/bootcheck.py` |
| **Provenance-graph forgery — a claim citing a split node directly to bypass the source gate** | Structural integrity assertions: `(:Claim)-[:CITES]->(:SourceOut)` must be `0`, `(:SuperSource)-[:FLOW]->(:SourceOut)` must be `0`, every `:FLOW` edge must carry `cap = 1.0`. | `app/seed.py`, verified in `BUILD-REPORT.md` |
| **Out-of-range trust values skewing reliability** | `0 < trust <= 1` asserted across the corpus; `trust` is never exactly `0.0` or `1.0` (either breaks `-ln(trust)`). | `app/seed.py`, `app/config.py` |
| **A verdict that cannot be audited** | Every verdict ships a DOCKET receipt carrying the **verbatim executed** Cypher with parameters kept separate, the four components, the winning provenance path, and the max-flow witness set — replayable by id. | `app/docket.py` |
| **Losing a decision** | Nothing is silently dropped: `recorded: true` on every response; `UNDECIDED` writes a `(:Review)` node and returns a non-null `review_id` that appears in `GET /review?status=OPEN`; `BLOCK` leaves a `(:Claim {status:'REFUSED'})` node. A refusal is a record, not a discard. | `app/api.py` |
| **Score misread as a probability** | The three components are **never pre-blended** — `independence` (an integer), `reliability`, and `recency` are surfaced separately, `path_weight` is surfaced raw, and `score_is_ordinal: true` is set on every scored object. The words `confidence`, `probability`, and `percent` do not appear in the scoring surface (grep-asserted to `0`). | `app/schema.py`, `app/arbiter.py`, `app/api.py` |
| **Resource exhaustion via an expensive query** | Server-side `TIMEOUT 1000` and `MAX_QUEUED_QUERIES 25` are set on the engine module itself, so a pathological query is cut off by the database, not by application politeness. | engine config (`MODULE LIST` args) |

---

## Not defended against

This section is load-bearing. Naming what is outside the defense is the honest signal; a
threat matrix with no exclusions is a marketing document.

- **Authentication and authorization — there is none.** Every endpoint is open. `agent_id` is
  an *assertion by the caller*, not an authenticated identity. Anyone who can reach the API can
  claim to be any agent in the roster. MENGER as built is a mechanism demonstration on a local
  synthetic corpus, not a multi-tenant service.
- **Agent impersonation and Sybil agents.** Because `agent_id` is unauthenticated, nothing stops
  one caller from writing as many agents. Note that this does **not** inflate the independence
  count — independence is computed over *sources*, not agents, and `Agent.trust` is seeded and
  is deliberately **not** an input to the score — but it does pollute attribution.
- **Source registration.** Sources are seeded. There is no flow by which a caller introduces a
  new source, and therefore no defense against a caller introducing a *dishonest* one. A real
  deployment's hardest problem — who may assert that a source exists, and at what trust — is
  out of scope here.
- **Veracity.** MENGER cannot tell a well-sourced falsehood from a well-sourced fact. Two
  genuinely independent sources that are both wrong produce `independence 2` and a clean ALLOW.
  Admissibility is not correctness.
- **Rate limiting.** `429 RATE_LIMITED` exists in the error table and is **reserved** — the
  code is defined, the enforcement is not implemented.
- **Review resolution.** `GET /review` is read-only in contract v1.0. Queued UNDECIDED items
  accumulate; there is no endpoint to resolve one. The queue is observable, not actionable.
- **Transport security.** Plain HTTP on localhost, CORS `*`. Appropriate for a local
  demonstration, unacceptable for anything reachable.
- **Durability and crash-consistency.** A process death partway through the write sequence can
  leave a claim recorded without its receipt. The failure is documented, not prevented.
- **Concurrency on the id counter.** Id allocation atomicity under concurrent writers is
  **unprobed**. Sequential use is sound; simultaneous writers are not characterised.
- **Adversarial graph scale.** Every measurement here is on a 574-node synthetic corpus. The
  behaviour of `maxFlow` and `SPpaths` on a hostile, large, or deliberately pathological
  provenance graph is **not claimed**.

---

## Reporting

This is a hackathon artifact built against a local, synthetic, in-repo corpus. There is no
production deployment and no user data. Issues belong in the repository's issue tracker.
