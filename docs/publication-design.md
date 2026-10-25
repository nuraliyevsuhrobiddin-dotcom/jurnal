# AGM Atlas publication design

`AGM_ATLAS_1` is the journal's article cover and running-page identity. A navy
masthead, warm paper, gold rules and a discipline accent distinguish the cover
from the full text. The existing journal seal is used throughout. A stable
decorative weave varies by article ID and discipline; it is not a chart of data.

The cover contains the original-language title, authors/affiliations, abstract,
keywords and citation. Large metadata paginates without truncation. A QR code
and clickable link lead to the public article page; an existing DOI is clickable.
Only configured, valid ISSNs and assigned issue details are printed. No external
indexing logos or unsupported accreditation claims are added.

Uploaded PDF pages retain their visible crop, rotation and scientific artwork
inside the journal identity. DOCX uses the same cover, seal, discipline colour,
section accents and running pages. Figures/tables are handled by the existing
conversion pipeline. The design cannot convert unsupported Word objects.

`AGM_BODY_PAGES:n` records the journal page count. `AGM_COVER_PAGES:n` records
physical cover pages; these do not consume the journal's body page range. The
full PDF carries `AGM_FULL_ARTICLE_V2` for existing workflow compatibility and
`AGM_ATLAS_1` for design idempotency. Repeated downloads do not nest covers.
`AGM_COVER_HASH` fingerprints visible metadata so title, issue or publication-date
edits refresh the cover without rewriting the body. View/download counters are
excluded and do not trigger regeneration.

An older V2 Word PDF with a valid body-page marker has its old metadata cover
replaced. Its body is preserved without rewrapping. Older framed PDFs receive
the new cover without a second nested body frame. The download transformation
does not modify stored source files or alter publication dates/page allocation.
Article downloads, admin previews, notification attachments and issue collections
use the same publication layout.

Preview with synthetic metadata and figures (no production writes):

```sh
node scripts/preview-publication-design.mjs
```

The three PDFs are written to ignored `artifacts/publication-design/`. Their
content is clearly identified as a design demonstration, not research findings.
The sample QR points to a demonstration article path, which is not a live article.
