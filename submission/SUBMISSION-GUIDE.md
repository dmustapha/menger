# Submission Guide: MENGER

**Deadline: 2026-10-18 23:59 IST = 19:29 WAT. Hard, no extension.**

Submit at https://www.wemakedevs.org/hackathons/falkordb/submit (verified `200`).

## Read this first about the form fields

The exact field list was never extracted. The submission page is a login-gated
single-page app: an unauthenticated fetch returns only a loading state, so the real field
names, their order, and their character limits are unknown until you log in. Do not treat
the mapping below as the literal form. Log in, read the actual fields, then pick the
matching file from `submission/copy/`. Every field the form asks for has copy waiting for
it; the only unknown is what the labels are called.

## Steps

1. **Record the demo video before you open the form.** It is the one blocking item. See
   "Missing items" below. Uploading takes YouTube several minutes to process, so start it
   first and fill the form while it processes.
2. **Log in** at https://www.wemakedevs.org/hackathons/falkordb/submit with the account
   that registered for Graph Hacks.
3. **Read the whole form before typing anything.** Note which fields are required, and
   note every character limit. Screenshot the blank form, so a resubmission does not start
   from memory.
4. **Fill the fields** using the mapping in the next section. Paste, do not retype.
5. **Declare Track 02 explicitly.** The rules require every track entered to be named at
   submission. Name exactly one: Agent Memory and Coordination. Do not tick the other two.
6. **Check for an AI-assistance field.** If the form has one, answer it there as well as
   in the README. If it does not, the README section satisfies the rule.
7. **Check for a blog-post link field.** Leave it empty. No blog post exists, and an empty
   optional field costs nothing while a dead link costs credibility.
8. **Submit, then reload the page** and confirm the submission is recorded. A form that
   silently failed looks exactly like a form that succeeded.
9. **Screenshot the confirmation.**

## Field-by-field mapping

| Likely field | Source file | Notes |
|--------------|-------------|-------|
| Project name / title | `submission/copy/title.txt` | `MENGER`. One word, no punctuation. |
| Tagline / one-liner | `submission/copy/tagline.txt` | Under 100 characters. Fits any limit the form is likely to impose. |
| Description / what it does / how it works | `submission/copy/description.md` | 4,500 characters. If the limit is smaller, cut from the bottom: drop "What is honest about this", then "Track fit". Never cut "Run the proof first" or "Why the graph is load-bearing". |
| Tech stack / technologies used | `submission/copy/tech-stack.md` | If the field is a single line, paste the `Primary:` / `Secondary:` / `Sponsor:` lines only and drop the two prose sections. |
| How FalkorDB is used / sponsor integration | `submission/sponsor-tracks.md` | The load-bearing answer. If the field is short, lead with the "Integration depth" paragraph, because it answers the stated disqualifier directly. |
| Track selection | `submission/sponsor-tracks.md` | Track 02: Agent Memory and Coordination. Sole track. |
| Repository URL | `submission/links.md` | https://github.com/dmustapha/menger |
| Live demo / deployment URL | `submission/links.md` | No deployment. If the field is required, state: "No live deployment. Complete local setup instructions are in the README, which the rules permit as the alternative." Do not paste `127.0.0.1`, which resolves to the judge's own machine. |
| Demo video URL | pending | The YouTube link, once uploaded. |
| Team / members | `submission/team.md` | Solo: Dami Mustapha, GitHub @dmustapha. |
| AI-assistance disclosure | `submission/team.md` plus `README.md` | Both carry it. |
| Blog post link (AirPods bonus) | none | Leave empty. |

## Missing items

| Item | Status | What to do |
|------|--------|-----------|
| Demo video | **BLOCKING.** No `.mp4` exists in the repo. | Record it. 3 minutes maximum per the organizer's published guidance. Upload to YouTube as unlisted or public. Running order: `GET /health` green with its published constants, then `bash tests/boot_drill.sh` showing the `1` and the `2` and the `0.21072`, then `bash tests/drill.sh` landing on step 9's real BLOCK, then the console showing the slot, the verdict, and the receipt. Say the load-bearing sentence out loud: removing the graph algorithms does not degrade the product, it removes the output entirely. |
| Screenshots | Missing. No `.png` in the repo outside `node_modules`. | Capture the console: the slot list, one verdict detail, one receipt with its replay result. Two criteria in the rubric (User Experience, Presentation Quality) have nothing else to score. |
| Live deployment URL | Absent by decision, not by oversight. | Nothing to do. The rules accept complete local setup instructions instead. Do not invent a URL. |
| Blog post | Not written. | Optional bounty. Skip it at this hour. |

## Before you hit submit

- The repository is public and loads for a logged-out visitor.
- `README.md` contains setup instructions, the graph data model, and the AI-assistance
  disclosure. All three are rules requirements.
- `docs/CYPHER-QUERIES.md` is linked from the README as a separately listed artifact. The
  rules require the Cypher and graph algorithms to be documented explicitly as their own
  item, not buried in a README section.
- The demo video link opens in a logged-out browser.
- Track 02 is named, and only Track 02.
- No field contains a placeholder, an invented URL, or a number that
  `bash scripts/verify-claims.sh all` does not re-derive.
