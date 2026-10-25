# AGM Journal manuscript standard 1.0

Effective 25 October 2026, policy version 1.2.0. The author standard is shared by
the journal charter, author guidelines, submission declarations and downloadable
Word template. One structure is provided in Uzbek, Russian and English.

Body formatting: A4, Times New Roman 12 pt, 1.5 line spacing, 20 mm margins,
12.5 mm first-line indent and numbered pages. Title, author, abstract, heading
and reference styles are defined separately in the DOCX. These are journal
formatting choices; Scopus does not prescribe this typeface or page layout.

The template contains title and author metadata, abstract and keywords, a
research body, declarations and references. Body sections can be adapted for
reviews, theoretical papers and case studies. Declarations cover contributions,
funding, competing interests, data/code availability, ethics/consent and
generative AI use. Inapplicable declarations require a short explanation.

The main text can be in any accepted journal language. English title and abstract
are prepared and checked with editors before publication for international
readers; authors are not required to submit English full text. The template
cannot establish reproducibility, research integrity, peer-review quality or
Scopus eligibility by itself. Editorial assessment remains necessary.

The submission API requires `template_confirmed=true` and `template_version=1.0`.
The version and confirmation are recorded in existing private submission notes.
No database migration is required. Untouched `{{UPPER_CASE}}` fields in DOCX are
rejected before manuscript storage. This is not an automatic font/margin audit;
PDF and DOCX formatting, completeness and scientific suitability are checked by
the editorial office.

The canonical download is `/api/submissions/template?lang=uz` (also `ru`, `en`).
Generate reviewable local copies with:

```sh
node scripts/generate-manuscript-templates.mjs
```

Files are written to ignored `artifacts/manuscript-templates/`. The API and
generator use the same builder; update `src/lib/manuscript-standard.ts` and
`src/lib/manuscript-template.ts` together when issuing a new standard.

Reference: [Elsevier — Scopus content policy and selection](https://www.elsevier.com/products/scopus/content/content-policy-and-selection).
The official selection criteria address peer review, publication ethics,
regularity, English titles/abstracts, scholarly contribution, readability and
online availability. They do not guarantee admission for a journal using this
template. Verified on 25 October 2026.
