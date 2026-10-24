# Site audit — 2026-10-24

## Final corrections after owner approval

The initial read-only findings below are retained as history. The owner subsequently requested fixes and a GitHub push.

- Final validation: **207 tests across 26 files passed**, ESLint passed without warnings, production build and TypeScript passed.
- A Windows sharing race was reproduced as EPERM during local integration-ledger replacement. Atomic rename now retries transient sharing failures without removing the existing claim; tests cover permanent failure and concurrent claim/read/update too.
- `bmc-biology` was returned to draft: its actual PDF is an external BMC Biology publication (DOI `10.1186/s12915-026-02742-0`) with different authors. Rights and attribution require review before republication.
- The older FIRST GRAD manuscript was archived after comparing its abstract/body with the complete-title FIRST GRADE version. The latter remains published, so the overlapping published page ranges are removed.
- No manuscript or author record was deleted. Before editing, snapshots were saved under ignored `.data/backups/final-hygiene-*`; each mutation has an audit entry.
- Public contact phone and correspondence address were updated from placeholders to the owner's supplied details. The institution is a correspondence location, not a claim of journal ownership.
- Invalid print ISSN `2959-1234` was cleared. Requested `1948-0989` was not substituted: [ISSN Portal](https://portal.issn.org/resource/ISSN/1948-0989) assigns it to The Academy of Management journal (Online), United States.
- Discovery checks passed again: the sitemap now has **108 URLs**, with one published article in three languages. Setup checks again report zero errors; no email was sent.

Remaining: the retained manuscript has `XXX` in its author name, including in the source PDF. The editor must obtain the confirmed name and corrected PDF. New publication and Crossref export checks reject that placeholder. A journal-owned ISSN, Crossref prefix/credentials and actual Google URL Inspection result are still required. Code deployment must be verified against the resulting GitHub commit separately.

## Initial read-only audit

At this initial stage no production records had been edited or deployments performed.

## Confirmed working

- All 114 sitemap URLs returned HTTP 200 with titles; the simple route check found no robots noindex tags.
- All three published article PDF endpoints returned HTTP 200 and application/pdf.
- The manuscript submission page renders its inputs and declarations in the browser; at 390 px its document width is also 390 px. No submission was sent.
- Production robots.txt, sitemap, canonical links, article citation metadata and ScholarlyArticle JSON-LD were checked by `npm run check:discovery -- --report`.
- `npm run check:setup -- --online` completed with zero errors for the checked database tables, storage bucket visibility, journal settings and Gmail OAuth. No email was sent.
- ESLint returned zero errors and two pre-existing unused-variable warnings in local `.data` helper scripts.
- The final full regression run passed all 203 tests, and the production build including TypeScript passed. The earlier intermittent concurrency failure remains recorded below.

## Issues found initially (see final corrections above)

1. **Published author names contain XXX.** Both preschool-to-first-grade articles list an author name ending in XXX. The actual full name must be supplied by the author/editor.
2. **Potential duplicate publication.** Two article titles are almost identical; one ends in FIRST GRAD and the other FIRST GRADE. Their metadata and manuscript versions must be compared before either is removed or corrected.
3. **Overlapping pagination.** The same issue contains articles with page ranges 1–22, 1–6 and 1–5. Editors must set the final sequence and regenerate PDFs/citations as needed. The local code has a guard for future overlapping page assignments, but existing records remain unchanged.
4. **Incomplete discovery/deposit metadata.** The published bmc-biology record has no English title, abstract or keywords. Its scholarly content and bibliographic details need editorial verification; these were not invented.
5. **Public contact settings conflict with newly provided publisher details.** The database still stores a Tashkent address (Nukus street 45) and +998 71 200 45 67, while the user supplied a Shahrisabz correspondence address and another phone for the Crossref application. Public contact settings should be deliberately updated to the correct information.
6. **Unverified/invalid journal identifier.** Stored print ISSN 2959-1234 fails its checksum and is filtered from normal public metadata by the application. The actual registered ISSN is still required; a checksum-valid number must not be invented.
7. **Crossref review pending.** The membership application reached Crossref's thank-you page earlier in this conversation, but no DOI prefix or deposit credentials have been supplied yet. Registration cannot be reported as active.
8. **Google index status remains unverified.** The user reports Search Console verification and sitemap submission. Public accessibility does not prove indexing; the actual URL Inspection reason was not provided.
9. **Local changes are not deployed.** Publication safeguards, Crossref final-report checking and admin discovery guidance are present locally. This audit did not publish them to production.
10. **Intermittent concurrency test failure.** In the first full run, the duplicate external-submission test expected one provider call but observed zero. Its isolated rerun passed. The cause has not been established; this is not evidence that the production Supabase flow is failing, nor grounds to dismiss the failure.

Artifacts: `artifacts/site-audit/routes.json` and `artifacts/search-discovery/report.json`.

Limits: this audit did not submit real manuscripts, change editorial records, register a DOI, exercise authenticated staff/MFA flows, or test a backup restore. A claim that the entire site is free of defects would exceed these checks.
