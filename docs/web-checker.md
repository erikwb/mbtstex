# Browser-based MBTS checker

The [public checker](https://erikwb.github.io/mbtstex/) lives in `web/` and is
published by GitHub Pages. It is an early release for **standard course papers**
using the fourth-edition Midwestern Style Manual (2021), with 55 rule types.
It does not certify a paper's compliance or replace assignment instructions.

The [coverage roadmap](checker-roadmap.md) lists proposed additions, stronger
checks, and future document profiles separately from the implemented rules.

## Use it

Choose or drop a `.docx` file, up to 20 MB. An older `.doc` must first be saved
as Word Document (`.docx`). PDF, encrypted documents, macro-enabled documents,
and dissertation/review-specific profiles are not supported in this release.
The built-in example has deliberate mistakes and can be downloaded as a Word
file. It is original fictional material, not a sample copied from the manual.

The report separates explicit formatting errors from items needing review.
Each finding provides a document location, an excerpt, the observed setting,
a suggested fix, and manual page numbers where applicable. Related findings
are grouped. A plain-text download includes the findings and the unchecked areas.
The six **Not checked** categories are always available; there is no compliance
percentage. "No findings" means only that the checks that ran found no issues.

Locations are paragraph order, not rendered page numbers. Footnotes are labeled
by reference order; custom marks or numbering restarts may differ from Word's
visible numbers. Only applicable, resolvable rules run, so the evaluated-rule
count may be smaller than 55.

## Processing and privacy

All parsing and checking happens in a dedicated browser worker. Document bytes
and excerpts are never uploaded to a server or sent to an AI service. There are
no analytics, cookies, accounts, persistent document storage, external fonts,
or external scripts. GitHub Pages serves the application assets and receives
ordinary website requests; it does not receive the selected document.

Clearing the document removes the report from application state and the page.
Downloads are generated locally. Only the report the user explicitly downloads
is saved. Uploaded names and text are inserted using DOM text nodes, never HTML.

The parser follows internal package relationships, supports transitional and
strict WordprocessingML namespaces, and never retrieves external relationships.
It rejects DTD/entity declarations, malformed XML, duplicate ZIP parts, and
macro-enabled package content. Limits include 4,000 package entries, 8 MB per
XML part, 48 MB of selected expanded XML, 12,000 body paragraphs, and a 30-second
worker timeout. Reports retain at most 1,000 findings and disclose truncation.

## What is checked

The rule catalogue is in [`web/lib/rules.js`](../web/lib/rules.js), with the
manual page range and suggested correction beside each rule. It covers:

- Section paper size, margins, and columns.
- Resolved Latin font family and size; 12-point body/title/bibliography text
  and 10-point footnotes.
- Body alignment, double spacing, first-line indentation, side indents,
  paragraph gaps, and repeated spaces after punctuation.
- Recognized heading levels, alignment, weight, capitalization, and an advisory
  about keeping a heading with its following text.
- Recognized title-page uppercase text, centering, single spacing, and a review
  of required information and its order.
- Footnote line spacing, indents, final punctuation, marker spacing, one space
  after an automatic note label, and an advisory about superscript/placement.
- Opening Ibid. spelling/punctuation and whether the preceding note can be
  resolved to one source. Ordinary book/journal notes, unambiguous short notes,
  and Ibid. chains are recognized in body-reference order. Missing notes,
  commentary, multiple sources, and unfamiliar forms require review.
- First full citations and ambiguous shortened notes for recognized ordinary
  books and journal articles, in body-reference order. Matching cited works to
  bibliography entries includes recognized author, title, year, and edition
  details. Extra consulted works are allowed, and Bible references/declarations
  are exempt from this matching requirement.
- Publication fields for those books and articles, and italics/quotation marks
  for their full and resolved short titles. Online journal citations with an
  access URL or recognized database may lack pagination. These are review
  checks; missing fields and uncertain matches need a reader.
- Bibliography heading, single spacing, hanging indent, alignment, final
  periods, an explicit new-page advisory, surname ordering, title ordering for
  a recognized repeated author, and optional repeated-author notation.
- Recognized block quotation spacing and indentation, plus review checks for
  a colon in the lead-in, enclosing quotation marks, and a terminal citation.
  Consecutive quotation paragraphs are checked together, including across
  explicit page breaks. Internal quotation marks are preserved.
- A **heuristic** check for a translation declaration attached to the first
  recognized inline or block Scripture quotation, including chapter-only and
  single-chapter-book references. A separate review checks for the full
  translation name, abbreviation, publication city, publisher, and year.
- Review of recognized Bible book abbreviations against the recommended SBL
  forms, commas/semicolons between recognized references, and clear Bible-edition
  bibliography entries. Full book names are accepted; instructor preferences
  take precedence. Inline quotations and italicized note titles are excluded;
  only the terminal parenthetical is inspected in a recognized block quotation.
- Review of Greek/Hebrew italics in body text and notes. Greek uses the ordinary
  italic property unless complex-script formatting applies; Hebrew uses the
  separate complex-script italic property. Inheritance, style toggles, and
  direct overrides are resolved. Recognizable inline quotations are excluded.
- Alignment, font, and size of recognized footer PAGE fields.

Formatting resolution combines document defaults, the default/named paragraph
style and its `basedOn` chain, character styles, and direct run/paragraph
overrides. Theme Latin fonts and style toggle properties are resolved. Partial
spacing/indent properties inherit separately. A leading tab can satisfy a
first-line indent when it reaches a half-inch tab stop. Unresolved fonts,
missing styles, character-based indents, and contextual/automatic paragraph
spacing become review findings rather than assumed passes.

Title detection requires a school-name paragraph and an identifiable end of
the title page. Word outline levels/heading styles and quotation styles identify
paragraph roles. Obvious but unstyled heading/quotation candidates are flagged
for review and exempted from body-specific rules. Bibliography entries follow
an identified BIBLIOGRAPHY heading. These classifications can be imperfect;
inspect the excerpts and use meaningful Word styles.

Bibliography recognition uses ordinary surname/name patterns and italicized
title boundaries where available. Six underscores followed by a period can
inherit the preceding recognized author; repeating the name is also accepted.
Ambiguous author/title boundaries are disclosed for review. English titles
for the same author are compared without an initial A, An, or The.

Source recognition covers ordinary personal names, up to three named authors,
identifiable initials, repeated-author notation, simple edition labels, and
multiple citations separated by semicolons. Short notes are compared with the
whole recognized source catalogue, including works first cited later in the
paper. Unrecognized bibliography entries and citation-like notes are disclosed
for review, rather than treated as successfully checked.

## What is not verified

- **Rendered pages:** exact title layout, heading gaps, stranded headings,
  actual font substitution, page-number placement/sequence, title-page number
  suppression, visual dimensions, or the five-line threshold for block quotes.
  Word's double-spacing setting is checked as such; LaTeX baseline distances
  are not used as Word requirements. The heading advisory checks Word's
  **Keep with next** setting; enabling it does not verify the rendered pages.
  A future layout checker will use a matching PDF freshly exported from Word,
  not assume that another converter reproduces Word's pagination.
- **Citations:** the 66 LaTeX citation variants are not a Word citation parser.
  Recognition does not yet cover edited-volume chapters, websites, translated
  or edited works, anonymous/corporate authors, complex author lists, or every
  punctuation and locator form. Initials are not expanded to full names.
  Complex titles and embedded commentary can obscure source boundaries;
  unreferenced footnotes are outside the source-matching sequence. Source
  facts, Ibid. page placement, locator accuracy, attribution, and completeness
  require review. Bibliography ordering is also partial: different authors
  sharing a surname, foreign title articles, and underlined spaces used instead
  of literal underscores can still need manual ordering checks.
- **Scripture semantics:** the detector looks for inline quotation marks near a
  canonical book name/abbreviation and a numeric reference, or references in
  recognized block quotations. It can miss quotations in other forms or
  misunderstand nearby quotations. Declaration fields are checked for presence,
  not factual accuracy or name/abbreviation agreement. It does not
  verify translation wording, publication facts, every translation exception,
  or whether the recognized quotation is truly the first one in the paper.
  Reference parsing covers canonical books and a limited alternative-abbreviation
  list. Unknown book forms, cross-paragraph quotations, source-title boundaries,
  verse existence, and punctuation outside recognized reference lists need review.
- **Original-language context:** transliteration identification, Greek symbols
  used as mathematics, and italicized source-title exceptions are not decided
  by Unicode script detection. Review the flagged passage before editing it.
- **Special structures:** list/table/equation formatting, text boxes, imported
  document chunks, footnote numbering restarts/custom marks, complex-script
  fonts, blank lines between entries/notes, unusual or wrapped title metadata,
  and the truth of supplied title-page information.
- **Academic or program requirements:** argument, theology, plagiarism, prose,
  course instructions, dissertations, book reviews, and annotated bibliographies.

Inserted tracked changes are read, deleted/moved-from text and hidden text are
excluded, and the presence of revisions is disclosed. Resolve changes and
review a clean Word/PDF copy before submitting.

## Development and validation

Node 22.12+ is required. The JavaScript tools do not change the LaTeX build.

```sh
npm ci
npm test             # parser/rules, malformed input, real-application fixtures
npm run build        # static assets under build/site/
npm run preview      # local production preview, http://127.0.0.1:4173
npm run test:e2e     # desktop/mobile Chromium: files, demo, exports, privacy, errors
```

For browser tests, install Chromium with `npx playwright install chromium`, or
set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing Chromium executable.
`npm run dev` runs the development server. All dependencies are pinned in the
lockfile. Generated sites, screenshots, and test output stay under ignored
`build/`; dependencies and browser reports are also ignored.

The corpus includes original synthetic fixtures and copies opened and re-saved
by LibreOffice. It is not yet a validation corpus of real student papers from
multiple Word versions. Add anonymized, authorized fixtures when fixing
compatibility issues; do not commit student work or the paid manual.

The [Pages workflow](../.github/workflows/pages.yml) runs unit tests, builds,
and tests the production site in desktop and mobile Chromium before deploying
changes on `main`. Pull requests run the same checks without deployment.

Technical references: [Word package structure](https://learn.microsoft.com/en-us/office/open-xml/general/how-to-create-a-package),
[Word run properties](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.runproperties),
[complex-script italics](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.italiccomplexscript?view=openxml-3.0.1),
[complex-script formatting](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.complexscript?view=openxml-3.0.1),
and [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
