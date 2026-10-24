# AGM Journal integration operations

## Available in this checkout

| Feature | Address | Behavior |
| --- | --- | --- |
| Integration dashboard | `/admin/integrations` | Authenticated configuration overview and article export gaps. Never prints secrets. |
| RSS 2.0 | `/feed.xml?lang=en` | Latest 50 published articles; `uz`, `en`, `ru`. Feed discovery link in document metadata. |
| OAI-PMH 2.0 | `/api/oai?verb=Identify` | GET and form POST; Dublin Core (`oai_dc`); all six verbs; UTC day/second date filters; 100-record pages. Sets unsupported; deletion history advertised as `no`. |
| Public article JSON | `/api/articles/{id}/metadata` | Published-only whitelist. No author email, source manuscript path or submission notes. Optional `lang`. |
| Crossref XML download | `/api/admin/articles/{id}/crossref` | Admin-only XML 5.3.1 preparation. Does not allocate/register a DOI or submit externally. |
| Crossref / Zenodo action | `/api/admin/articles/{id}/deposit` | Admin POST with `provider`. Crossref submission defaults to its test system; Zenodo uploads a draft to sandbox. Requires accounts and migration 009. |
| ORCID authentication | `/api/orcid/start?lang=en` | State-bound OAuth and signed one-hour browser proof. Sandbox proof is displayed as test data and never stored as a real author ORCID. |
| Connection checks | `/api/admin/integrations/check` | Admin POST; probes Supabase, storage and configured providers without publishing anything. |
| Email smoke test | `/api/admin/integrations/email-test` | Admin POST; sends only to Resend's virtual `delivered@resend.dev` address. |
| Email retry worker | `/api/cron/notifications` | GET protected with `CRON_SECRET`; processes at most three pending messages. A scheduler must be configured separately. |
| Publication archive | `/api/admin/archive?issue_id={id}` | Admin ZIP download with PDFs, public JSON, Dublin Core, RIS and SHA-256 manifest. Up to 25 articles / 20 MB; missing PDFs block incomplete export. |
| Citation downloads | `/api/articles/{id}/citation?format=ris` | Existing RIS and BibTeX support for reference managers. |
| Scholarly discovery | Article pages and `/sitemap.xml` | Existing Google Scholar metadata, JSON-LD and language alternates. Providers control indexing. |
| Email | `/admin/notifications` | Durable receipts, localized status-change emails, manual retries and a protected worker. Duplicate event keys do not reset sent notifications. |

## OAI-PMH examples

```text
/api/oai?verb=ListMetadataFormats
/api/oai?verb=ListIdentifiers&metadataPrefix=oai_dc
/api/oai?verb=ListRecords&metadataPrefix=oai_dc&from=2026-10-01&until=2026-10-31
/api/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=<URL-encoded identifier from ListIdentifiers>
/api/oai?verb=ListRecords&resumptionToken=<token from previous response>
```

Use a resumption token with only its original verb; do not add filters. Tokens use timestamp/ID keyset pagination. This is a live catalogue, not a frozen snapshot: edits during a harvest may appear in a later incremental harvest. Overlap date windows and deduplicate by identifier. Withdrawal/deletion tombstones are not retained; full reconciliation is required to remove records no longer listed.

The endpoint currently obtains the published catalogue through the existing DB abstraction before filtering. Large catalogues will need DB-level date/cursor queries. Storage failures return HTTP 503 rather than an empty success response. Public endpoints do not constitute repository registration or guaranteed indexing.

## Crossref preparation

1. Set journal name, publisher, contact email, valid ISSN and your assigned DOI prefix in `/admin/settings`.
2. Add the assigned article DOI, English title, abstract, keywords, authors and publication date. Publish after editorial checks and PDF verification.
3. Download XML from `/admin/integrations`. Missing fields and DOI prefixes that do not match journal settings block export.
4. Review names: the current model stores a single full name. The exporter preserves it in `surname`; it does not guess given/family names. Correct name parts before depositing when applicable.
5. Independently verify ISSN registration and prefix ownership, validate XML against Crossref's official XSD, deposit through the publisher's authorized account and inspect the processing report. Local checks do not verify ownership, membership or acceptance.

No Crossref credentials are required to download XML. Admin submission uses `CROSSREF_USERNAME` and `CROSSREF_PASSWORD`; it defaults to `https://test.crossref.org/servlet/deposit`. Crossref must provision a separate test account. Queue acceptance does not prove DOI registration. The admin deposit controls can now retrieve the final processing report by batch ID; successful test reports remain distinct from production DOI registration. Status checks do not resubmit a deposit. See [Google and Crossref setup](google-crossref-setup-uz.md).

The private ledger stores batch/deposition references before later network steps. It uses `integration_jobs` when migration 009 is available; if that table is absent, it uses the existing private `journal-manuscripts/_integration-jobs/` storage prefix with atomic create-only claims. Other database errors fail closed. An uncertain, failed or interrupted request is not repeated automatically: reconcile the stored reference with the provider first. Zenodo keeps one draft per article/environment; subsequent edits/versioning must be managed in the repository. No Zenodo publish request is sent by this application. Before applying migration 009 to a storage-backed installation, migrate/reconcile existing storage job records to avoid replaying a prior submission.

`CROSSREF_MODE=test`, `ZENODO_MODE=sandbox` and `ORCID_MODE=sandbox` are defaults. Production modes require `INTEGRATION_PRODUCTION_ENABLED=true` in addition to the corresponding mode and real account credentials. These settings intentionally remain disabled in the current local test setup.

ORCID can also be enabled independently with `ORCID_MODE=production` and `ORCID_PRODUCTION_ENABLED=true`. This does not permit production Crossref/Zenodo deposits. The provided production ORCID credentials passed a live client-credentials `/read-public` check (HTTP 200) and were saved only to the ignored local environment file. This verifies the application credentials, not a user's identity or consent.

After explicit user authorization, ORCID-only credentials/settings were stored as production Secrets in Vercel project `jurnal` (`agmjoural.uz`). Deployment `dpl_EUKTTc73oZnM7qyobAFTktWZoeDB` is READY and serves the start/callback routes. Live checks: submit/RSS/OAI return 200, ORCID start returns 307 to orcid.org with the exact callback and Secure/HttpOnly cookie; the provider authorization page returns 200 without a redirect mismatch. A callback without valid state safely redirects to the failure message. Full author consent/code exchange remains a user-driven check. The screenshot-exposed credential should be rotated through ORCID; neither secrets nor access tokens are recorded here.

## External accounts and deployment settings

Never paste private keys into public site settings or commit them.

| Service | Configuration or account needed | Remaining activation work |
| --- | --- | --- |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Existing DB/outbox/storage verified live. Apply migration 009 before enabling deposits. Full backup/restore still needs separate verification. |
| Resend | `RESEND_API_KEY`, `MAIL_FROM` with a verified domain | Local sender configured against the verified journal domain; virtual test delivery confirmed. Configure hosting environment and a scheduler separately. |
| Search Console | `GOOGLE_SITE_VERIFICATION` | Verify domain, submit sitemap, monitor coverage. This is not Scholar acceptance. |
| Crossref | Membership/sponsor, assigned prefix and deposit account | Test/production submission code exists; no account supplied, so only mocked provider-contract tests ran. Verify XML/name parts and final deposit result. |
| ORCID OAuth | `ORCID_CLIENT_ID`, `ORCID_CLIENT_SECRET`, callback `${NEXT_PUBLIC_SITE_URL}/api/orcid/callback` | OAuth start/callback and submission binding are implemented; register a sandbox application before live user authorization. Set `ORCID_COOKIE_SECRET` independently or use the existing admin secret fallback. Tokens are not persisted. |
| Zenodo | `ZENODO_ACCESS_TOKEN` with deposition permissions | Draft/file/metadata code exists; no account supplied. Review and publish through Zenodo. Sandbox token and production token belong to different environments. |
| Similarity Check / iThenticate | Eligible subscription and authorized API | Integrate private manuscript checks and editorial review. No plagiarism score is fabricated. |
| Preservation | CLOCKSS/LOCKSS/PKP PN eligibility or archive agreement | Establish actual preservation and verify ingest/restore. Public download is not preservation. |
| Monitoring | Hosting logs, uptime/error service and alert recipient | Configure production checks, redact personal data and verify alerts. |

`NEXT_PUBLIC_SITE_URL` must match the canonical domain before deployment. Configuration badges indicate setting presence, not a successful external connection.

`MAIL_FROM`, `CRON_SECRET` and an independent `ORCID_COOKIE_SECRET` were prepared in the ignored local environment file; their values are never printed or committed. No deployment settings were changed. To schedule retries, invoke `GET /api/cron/notifications` with `Authorization: Bearer <CRON_SECRET>` from a trusted scheduler. A local endpoint alone is not a running schedule.

Status emails are queued after a successful admin article update and only when the status actually changes and a corresponding author has a valid email. Both status-action PATCH and editor PATCH use this path. If queuing fails, the API returns `notification_warning` with the saved article and the admin UI displays it; the status is not rolled back. Article saving and outbox insertion are not one database transaction, so operational monitoring is still required.

## Further editorial engineering

PDF/metadata versioning, transactional upload activation, secure author tracking and real reviewer assignments/deadlines remain separate work. Discovery services do not replace editorial processes. See `artifacts/site-analysis-2026-10-17.md` and `artifacts/scopus-readiness-2026-10-20.md`.

## Primary specifications

- https://openarchives.org/OAI/openarchivesprotocol.html
- https://www.rssboard.org/rss-2-0-11
- https://www.crossref.org/documentation/schema-library/markup-guide-record-types/journals-and-articles/
- https://www.crossref.org/schemas/crossref5.3.1.xsd

## Validation on 2026-10-20

- 137 automated tests passed, including 12 discovery integration tests and 19 provider-workflow tests. The additional test verifies that enabling production ORCID does not enable production publishing providers.
- TypeScript, ESLint and production build passed.
- A synthetic Crossref deposit passed the official 5.3.1 XSD; responses for all six OAI verbs passed the official OAI-PMH and Dublin Core schemas. RSS parsed as well-formed XML.
- Local production HTTP checks returned 200 for RSS, OAI GET/form POST, public JSON and all three integration page languages. Public JSON contained no author emails or internal submission fields.
- Unauthenticated Crossref export returned 401; admin page redirected to login. Authenticated admin integrations returned 200. A real article with missing deposit fields correctly returned 422 for export.
- Agent-browser verified the admin check button, real test-email button, mobile layout and author submission form. The automated admin accessibility audit reported no violations; this is not a complete manual accessibility certification.
- Supabase article/outbox queries and all three storage buckets answered successfully. The Resend API verified the sender domain and reported `delivered` for the virtual test message.
- A synthetic manuscript was submitted through the real browser form as a private draft, changed to `under_review` through the admin API, and then deleted with its source file. Both receipt and status emails were accepted by Resend for the virtual test recipient. No test article was published; test audit/outbox records are retained.
- A real stored PDF was downloaded in the ZIP archive, reopened and verified against the SHA-256 manifest; private metadata fields were absent.
- The protected notification worker returned 401 without a secret and 200 with the local secret against an empty outbox. No recurring schedule has been installed. The visible ORCID failure message was verified in the final browser build.
- Crossref and Zenodo endpoints returned 503 for absent credentials as expected. Their request/response, timeout, duplicate prevention and malicious upload-host cases ran against mocked provider responses; no real sandbox deposit or ORCID authorization was performed. Migration 009 was prepared but not applied to the remote database. Production deployment was completed after explicit user authorization; see the ORCID deployment notes above.

## Zenodo sandbox activation ? 2026-10-20

With explicit user authorization, ZENODO_ACCESS_TOKEN and ZENODO_MODE=sandbox were stored as production Secrets for Vercel project jurnal (agmjoural.uz). Deployment dpl_C93o7PQh9Ns6gxTsB5cVZvJTomEe completed successfully. The authenticated live integration check returned HTTP 200 and Zenodo status ok. The live admin page returned 200 and did not expose the token. Direct sandbox checks returned 200 for account access, 201 for creation of an empty test draft, and 204 for its cleanup. No record was published. Full article PDF deposition has not yet been exercised against Zenodo. Token values are excluded from this document.

## Production completion checks ? 2026-10-20

Deployment dpl_GXWyHGK6kf95dLcDNN8YC5ExwEgB is READY at https://agmjoural.uz. MAIL_FROM was configured for the existing verified sending domain; the authenticated live checks report Supabase, Resend and Zenodo as ok. A live email-test request returned 200 and accepted=true for the virtual Resend test recipient. Submit, RSS and OAI Identify return 200; ORCID start redirects to the production provider.

A real synthetic PDF/metadata upload through prepareZenodoDraft was verified in Zenodo sandbox with a matching file checksum; no publication was performed and test resources were removed. This exposed and fixed both the missing integration_jobs table dependency (private storage fallback) and HTTP 415 from the upload endpoint (binary application/octet-stream transport). 142 automated tests, TypeScript, ESLint and production builds passed.

Remaining external prerequisites: Crossref publisher/test account and DOI prefix, an antiplagiarism subscription/API entitlement, a real preservation agreement, and a production Zenodo account/token if real repository publication is desired. Existing published article metadata still lacks English title/abstract and must be supplied before its deposit. No scholarly content or translation was fabricated.

Cron secret upload was rejected by automatic approval review because explicit permission for that specific credential/destination is required. MAIL_FROM alone was configured successfully; CRON_SECRET was not copied and no recurring scheduler was installed. Initial receipt/status email delivery and authenticated manual retries work without a recurring schedule.

## Scheduled email retry activation ? 2026-10-20

After explicit user permission, CRON_SECRET was stored as a Vercel production Secret for jurnal. This resolves the earlier approval-review block for that credential. Deployment dpl_1ugB8oFs6RyhQ1wfDPxcpXvLUZFz is READY at https://agmjoural.uz. Vercel project metadata confirms an active cron definition for /api/cron/notifications with schedule `0 3 * * *` (03:00 UTC, 06:00 Europe/Moscow; Hobby execution may occur during the hour). The first automatic scheduled invocation has not yet been observed.

The deployed worker was tested: no authorization returned 401; the correct bearer returned 200 and sent one synthetic notification to delivered@resend.dev. Its outbox record is sent with one attempt. Existing non-test pending messages were checked before testing and none were dispatched by the smoke check. New receipt/status delivery still starts immediately; the daily cron retries up to three remaining pending messages per invocation. Manual admin retries remain available for a larger backlog.

The 19 provider-workflow tests, ESLint, TypeScript and hosting production build passed for this deployment. The preceding full regression suite passed 142 tests. Crossref account, paid similarity-check entitlement and real preservation arrangements are still external prerequisites; this configuration does not establish them.
