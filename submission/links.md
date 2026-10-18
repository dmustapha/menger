# Links: MENGER

Verified: 2026-10-18 18:36 WAT (deadline 19:29 WAT). Every status below came from
`curl -s -o /dev/null -w "%{http_code}" <url>` run in this session.

## Judge-reachable

| Link | URL | HTTP | State |
|------|-----|------|-------|
| Public source repository | https://github.com/dmustapha/menger | `200` | [x] live and public |
| Hackathon submission form | https://www.wemakedevs.org/hackathons/falkordb/submit | `200` | [x] reachable (login-gated SPA once loaded) |

## Local only, not judge-reachable

| Link | URL | HTTP | State |
|------|-----|------|-------|
| Engine health | http://127.0.0.1:8000/health | `200` | [x] passes locally. This is a loopback address on the build machine, so it is not a URL a judge can open. It is listed as the command a judge runs after local setup, not as a deployment. |

Use `127.0.0.1`, not `localhost`. On macOS `localhost` resolves to `::1` first, and a
foreign process on the IPv6 wildcard shadowed the API during the build (BUILD-REPORT.md
DEV-004).

## Missing, with the reason

| Item | State | Reason |
|------|-------|--------|
| Live deployment URL | [ ] | No live deployment. Complete local setup instructions ship instead, which the rules permit: "Live deployment URL (preferred) or complete local setup instructions". No URL is invented to fill this row. |
| Demo video | [ ] | No `.mp4` exists anywhere in the repo as of the timestamp above (`find . -name "*.mp4"` returned nothing). Must be recorded and uploaded before submitting. See `submission/SUBMISSION-GUIDE.md`. |
| Screenshots | [ ] | No `.png` exists in the repo outside `node_modules`. Optional for the form, but the console is the only visual evidence and the judging rubric includes User Experience and Presentation Quality. |
| Blog post (AirPods bonus) | [ ] | Not written. Optional bounty, not a submission requirement. |

## In-repo artifacts the form will ask about

These are paths in the repository above, not URLs.

- `README.md` (setup instructions plus the graph data model, plus the AI-assistance disclosure)
- `docs/CYPHER-QUERIES.md` (the separately listed Cypher and graph-algorithm artifact)
- `CLAIMS.md` (every number, each with the command that re-derives it)
- `submission/HONESTY-LEDGER.md` (real, simplified, not built)
- `BUILD-REPORT.md` (eight deviations, four silent failures and how each was found)
