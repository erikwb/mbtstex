# Linter coverage roadmap

Audited against the supplied fourth-edition Midwestern Style Manual on
20 October 2026. Page references are printed page numbers. The manual is not
distributed with the project.

The website currently has **55 rule types**. The original inventory identified
**83 items**: new checks, improvements to existing checks, and rules for
additional document profiles. Progress is recorded below; 83 is not the number
of remaining items. This is a development inventory, not an official MBTS rule
count or an exhaustive count of every instruction in the manual. Counts of
rules and backlog items do not establish a compliance percentage.

| Area | Backlog items |
| --- | ---: |
| Course-paper layout, headings, and notes | 12 |
| Scripture | 6 |
| Citations and bibliography | 16 |
| Quotations and original-language typography | 9 |
| Writing conventions | 7 |
| Tables and figures | 7 |
| Book reviews and annotated bibliographies | 10 |
| Dissertations | 16 |
| **Total** | **83** |

## First implementation batch

Eight new rule types and stronger bibliography/Scripture recognition are
implemented. These cover parts of ten inventory items; the limitations below
remain open. Ambiguous structure produces review findings rather than errors.
Regression cases are in [backlog.test.js](../web/tests/backlog.test.js), with
additional parser and real-application fixtures in the test suite.

| Items | Implemented behavior | Remaining limits |
| --- | --- | --- |
| L01 | Reviews required title fields and their recognizable order | Unusual/wrapped metadata and factual accuracy need review |
| L06 | Reviews lowercase key words in headings; honors Word All caps | Proper names and language-dependent capitalization need context |
| L09 | Checks one space after an automatic footnote label, including a nonbreaking space | Custom/missing labels receive review findings |
| C13 | Compares recognized surnames and same-author titles; uses italic title boundaries for initials/corporate authors | Complex/anonymous entries, same-surname authors, and foreign articles remain partial |
| C14 | Reviews optional six-underscore notation and resolves the preceding author | Underlined spaces and ambiguous predecessors need review |
| S01 | Recognizes inline/block quotations, chapter-only references, and single-chapter books | First-quotation identification remains heuristic |
| S02 | Checks translation name, abbreviation, city, publisher, and year separately | Does not verify publication facts or name/abbreviation agreement |
| Q02 | Reviews the colon before a recognized block quotation | Depends on correct paragraph classification |
| Q03 | Reviews enclosing quotation marks while preserving internal marks | Nested quotation interpretation needs context |
| Q04 | Reviews a terminal footnote or parenthetical Scripture reference across a block's paragraphs | Inline quotations, source identity, and other paper profiles remain open |

## Second implementation batch

Six more review checks cover Scripture, Ibid., and original-language italics.
The canonical book-name catalogue is shared in scope with the LaTeX module;
tests check their agreement. Regression cases and exceptions are in
[references.test.js](../web/tests/references.test.js).

| Items | Implemented behavior | Remaining limits |
| --- | --- | --- |
| S03 | Reviews recognized alternative abbreviations and periods against the recommended SBL forms | Instructor preferences take precedence; full names are accepted; unknown abbreviations and custom conventions remain open |
| S04 | Checks commas/semicolons between recognized verse, chapter, and book locators | Does not validate verse existence or every punctuation form; ambiguous prose numbers are skipped |
| S06 | Reviews recognizable Bible-edition entries in the bibliography | Unfamiliar editions, study editions, and assignment exceptions need context; secondary scholarship is a separate source |
| C03 | Resolves Ibid. through ordinary full book/journal notes, unambiguous short notes, and Ibid. chains in reference order | Missing notes, commentary, multiple sources, and unsupported forms produce review; complete citation syntax/source matching remains open |
| C05 | Reviews the opening Ibid. spelling/period/comma and ordinary numeric/Roman locators | Unusual locators and embedded uses need review; C04 (first note on a page) still requires page-layout evidence |
| Q09 | Reviews Greek/Hebrew italics in body text and notes, including complex-script properties and style inheritance | Transliterations, source-title exceptions, symbols, rendered fonts, and quoted formatting still need context |

These checks preserve recognizable inline quotations. Scripture checks also
exclude italicized note titles and inspect only the terminal parenthetical of
a recognized block quotation. Cross-paragraph quotations and ambiguous source
boundaries remain limitations. None of these additions verifies pagination.

## Third implementation batch

Five review checks add source recognition for ordinary books and journal
articles. Regression cases are in [citations.test.js](../web/tests/citations.test.js).
Recognized full and short forms are checked in body-reference order; uncertain
source forms are explicitly left for review.

| Items | Implemented behavior | Remaining limits |
| --- | --- | --- |
| C01 | Reviews shortened notes without an unambiguous earlier full citation; a bibliography entry alone does not satisfy the first-note requirement | Only recognized ordinary book/journal forms; embedded commentary and unfamiliar source forms need review |
| C02 | Matches short titles and surnames against the whole source catalogue; distinguishes recognized authors, works, and editions | Complex names, initials versus full names, unusual locators, and unsupported source forms remain open |
| C08 | Checks book/journal italics and upright, quoted article titles, including resolved short titles and inherited formatting | Embedded emphasis, unusual title punctuation, other source types, and missing style information need review |
| C09 | Checks book city/publisher/year and journal volume/date/applicable pages; accepts online articles without pagination | Facts, source-specific issue requirements, editors/translators, complex editions, and other metadata remain open |
| C12 | Reviews missing, duplicate, or mismatched recognizable bibliography entries; allows additional consulted works and Bible exceptions | Chapters, websites, other source-specific exceptions, and unrecognized bibliography entries need manual matching |

The source matcher handles up to three named personal authors, identifiable
initials, repeated-author notation, simple edition labels, and semicolon-separated
sources. It does not fetch URLs or verify publication facts. Edited-volume
chapters and websites are the next source types to add; PDF layout checks and
other document profiles remain separate work.

## Implementation order

1. **Finish the common course-paper checks.** Title information, heading
   capitalization, spacing after note numbers, gaps between notes and entries,
   bibliography sorting within an author, repeated-author notation, Scripture
   punctuation and declaration details, and block-quotation mechanics.
2. **Build citation recognition and source matching.** Start with books, journal
   articles, edited-volume chapters, and websites. Then cover the source forms
   in the manual. The LaTeX project's 66 citation variants can supply a fixture
   matrix, but producing a citation and recognizing arbitrary Word prose are
   different tasks. Include full notes, short notes, bibliography forms, and
   valid exceptions in that matrix.
3. **Add optional PDF comparison.** Use the Word file for styles and document
   structure, and a matching PDF freshly exported from Word for page positions. This
   enables measured title layout, page numbering, stranded headings, note gaps,
   and figure placement. Mismatched document/PDF pairs must be detected or
   explicitly disclosed. Keep both files in the browser. Prioritize L08
   (stranded headings) among the first page-layout checks.
4. **Add explicit document profiles.** Book review, annotated bibliography, then
   dissertation. Accept assignment overrides rather than guessing a program's
   requirements from the document.

Word's stored page-break markers describe the layout at its last paginated
save; they do not establish a fresh rendering. See Microsoft's
[LastRenderedPageBreak documentation](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.lastrenderedpagebreak).
Mozilla's [PDF.js browser examples](https://mozilla.github.io/pdf.js/examples/)
demonstrate local page rendering and page geometry. A PDF comparison layer is
a proposed feature; the website does not currently accept PDFs.

Pagination must come from the user's Word export, not a DOCX conversion by
LibreOffice or a browser renderer. Those engines are not guaranteed to match
Word's page breaks. A PDF fixes the pages of that particular export; it cannot
guarantee how the DOCX will paginate on another machine, with different fonts,
or after further edits. See Microsoft's [Word PDF export guidance](https://support.microsoft.com/en-us/word/save-or-convert-to-pdf-on-your-mac).
The checker must disclose text-matching or heading-location uncertainty and
must not turn absent layout evidence into a passed orphan-heading check.

Word's **Keep with next** option is already checked as a preventive advisory.
Select a heading, then open Home → Paragraph dialog → Line and Page Breaks →
Keep with next, or set it in the heading style. This keeps the heading with the
start of the following paragraph. Empty paragraphs inserted between a heading
and its text can interfere; use paragraph spacing for the gap. See Microsoft's
[Keep text together guidance](https://support.microsoft.com/en-us/word/keep-text-together-in-word).

## Evidence and severity

Each item below names the evidence it needs:

- **D:** document XML, resolved formatting, or explicit profile settings.
- **P:** rendered-page evidence, usually a matching PDF. PDF line counts alone
  cannot prove how a block quotation would wrap at ordinary body width.
- **R:** contextual recognition or user review. Uncertain recognition produces
  a review finding or an explicit skip, never an assumed pass.

Use errors only when both the requirement and the relevant document structure
are clear. Quoted text, source titles, Scripture locators, URLs, proper names,
tables, and assignment exceptions need appropriate exclusions. Formatting
equivalents, such as blank paragraphs versus paragraph spacing, should be
evaluated by their resulting layout rather than by one preferred editing method.

## Course-paper layout, headings, and notes — 12

| ID | Proposed check | Evidence / manual pages |
| --- | --- | --- |
| L01 | Required title-page information and its order, including school location and course information | D/R; 11–13 |
| L02 | Title-page first-line position and gaps between information blocks | P; 13 |
| L03 | Title page has no visible page number | D/P; 13, 15 |
| L04 | Main text starts at page 1 and subsequent numbering continues correctly | D/P; 15 |
| L05 | Page numbers actually appear at the bottom center of the page | P; 15; extends the footer-paragraph alignment check |
| L06 | Headline capitalization of recognized headings | D/R; 16, 93 |
| L07 | Space before and after headings, accounting for blank paragraphs and explicit spacing | D/P; 16–17 |
| L08 | A heading is not stranded at a page bottom | P; 17; strengthens the existing keep-with-next advisory |
| L09 | One ordinary space follows the number inside a footnote | D; 19, 32 |
| L10 | One blank line between footnotes, allowing for page boundaries | D/P; 19, 32 |
| L11 | One blank line between bibliography entries | D/P; 22 |
| L12 | Rendered Latin fonts match the required family rather than a substituted font | P/R; 14–15; strengthens the requested-font check |

## Scripture — 6

| ID | Proposed check | Evidence / manual pages |
| --- | --- | --- |
| S01 | Identify the first Scripture quotation across inline, block, chapter-only, and single-chapter-book forms | D/R; 38–39; extends translation-note detection |
| S02 | Check the declaration's translation name, abbreviation, city, publisher, and year individually | D/R; 39; extends the present year/colon heuristic |
| S03 | Consistent book abbreviations using the recommended SBL forms when abbreviations are selected | D/R; 39, 115–117; instructor preference takes precedence |
| S04 | Commas within a chapter, semicolons between chapters/books, and reference punctuation | D/R; 38–39 |
| S05 | Review explicit translation changes against the declared default and its exceptions | D/R; 39; cannot infer an unlabeled translation from reference syntax |
| S06 | Review Bible entries in the bibliography under the normal exclusion convention | D/R; 38 |

## Citations and bibliography — 16

| ID | Proposed check | Evidence / manual pages |
| --- | --- | --- |
| C01 | First recognizable citation of a source uses the applicable full form | D/R; 33, 43–68 |
| C02 | Short notes identify their source unambiguously; include a short title when needed | D/R; 33 |
| C03 | Ibid. refers to the immediately preceding, identifiable source | D/R; 33 |
| C04 | Ibid. does not begin the notes on a new page | P/R; 33 |
| C05 | Ibid. punctuation and changed-locator form | D/R; 33 |
| C06 | Note and bibliography syntax use the correct name order, separators, and publication grouping for the recognized source type | D/R; 32, 35, 43–68 |
| C07 | Author lists and et al. follow the applicable note/bibliography form | D/R; 43–44 |
| C08 | Recognized work and article titles use the appropriate italics or quotation marks | D/R; 43–68, 102 |
| C09 | Required metadata is present for the recognized source type, including relevant edition/editor/translator information | D/R; 43–68; presence does not establish factual accuracy |
| C10 | Locators, volume references, article ranges, and access-medium placement follow the applicable source pattern | D/R; 43–68 |
| C11 | Multiple source citations within one note use the required separators | D/R; 97 |
| C12 | Cited sources that require bibliography entries have matching entries | D/R; 35–68; do not reject additional consulted works merely because they lack a note |
| C13 | Same-author entries sort by title; resolve repeated-author and corporate-author forms | D/R; 23; extends the present surname comparison |
| C14 | Optional repeated-author notation has the proper form and a resolvable preceding author | D/R; 23; do not require use of underscores |
| C15 | Apply source-specific bibliography inclusion/exclusion rules for performances, resolutions, web sources, podcasts, and manuscript collections | D/R; 60–67; importance/frequency can require user input |
| C16 | Bibliography occupies the correct position for the selected paper profile | D/R; 22, 75, 89 |

The 66 existing citation fixtures represent variants, not 66 additional rule
types. Several checks above apply to each variant. Unrecognized citations must
be reported as unverified, not silently treated as compliant.

## Quotations and original-language typography — 9

| ID | Proposed check | Evidence / manual pages |
| --- | --- | --- |
| Q01 | Apply the four-line inline/five-line block threshold | P/R; 105–106; requires body-width wrapping evidence, not a word-count substitute |
| Q02 | A recognized block quotation has the required colon in its lead-in | D/R; 106 |
| Q03 | No enclosing quotation marks around a block quotation | D/R; 106; preserve legitimate quotation marks inside the passage |
| Q04 | Quotations have an identifiable source citation in the appropriate position | D/R; 105–106; account for Scripture and book-review conventions |
| Q05 | Blank-line spacing around block quotations and return to body spacing | D/P; 106 |
| Q06 | Nested quotations use the appropriate inner quotation marks | D/R; 106; account for quotations inside block quotes |
| Q07 | Quotation punctuation and following citations occur in the appropriate order | D/R; 99–100, 105; account for questions and parenthetical references |
| Q08 | Review ellipsis and bracket notation used to mark quotation changes | D/R; 107; source comparison is required to establish fidelity; accept typographic equivalents supported by the manual |
| Q09 | Greek/Hebrew scripts remain upright; identified transliterations use italics | D/R; 102; transliteration recognition needs context |

## Writing conventions — 7

These should generally be review findings. Do not rewrite quotations or impose
the manual's prose conventions on citation fields.

| ID | Proposed check | Evidence / manual pages |
| --- | --- | --- |
| W01 | Contractions in the author's academic prose | D/R; 3, 95 |
| W02 | Unnecessary first/second person or informal address | D/R; 3–4; assignment and genre exceptions apply |
| W03 | B.C./A.D. date convention instead of BCE/CE in the author's prose | D/R; 8 |
| W04 | Spelled-out numbers through one hundred, round numbers, and compound-number hyphens | D/R; 8–9; exclude dates, citations, measurements, and other legitimate contexts |
| W05 | Sentences beginning with a numeral | D/R; 9 |
| W06 | Percentages use numerals followed by the word percent | D/R; 9 |
| W07 | Contextual capitalization of biblical names, Bible/Scripture, and divine references | D/R; 8; pronoun referents cannot be settled by a capitalization regex |

## Tables and figures — 7

| ID | Proposed check | Evidence / manual pages |
| --- | --- | --- |
| V01 | Visuals have numbers and uppercase titles | D/R; 113–114 |
| V02 | Labels and titles occupy separate lines with the specified gap | D/P; 113–114 |
| V03 | Source or explanatory lines have the appropriate placement when applicable | D/P/R; 113–114; source attribution requires context |
| V04 | Column headings use headline capitalization | D/R; 114 |
| V05 | Table stub column and numerical column alignment | D/R; 114; applicability depends on table contents |
| V06 | Double rule above table column headings | D; 114 |
| V07 | Large visuals move to an appendix and have a corresponding text reference | D/P/R; 112–114; assess the half-page threshold and applicable exceptions |

Reduced font sizes in visuals are explicitly allowed for fit. Do not simply
apply the ordinary 12-point body rule to every table cell. Grayscale readability,
appropriate chart choice, and faithful data representation still need review.

## Book reviews and annotated bibliographies — 10

| ID | Proposed check | Evidence / manual pages |
| --- | --- | --- |
| R01 | Book-review title page uses the appropriate paper description and metadata | D/R; 69–70 |
| R02 | Opening bibliography entry has the correct location/format, book page count, and price | D/R; 72 |
| R03 | Author sketch, contents summary, and critical evaluation appear in order with first-level headings | D/R; 72–74 |
| R04 | Review sections follow the stated approximate page lengths or assignment overrides | P/R; 72–73 |
| R05 | Reviewed-book citations use parenthetical p./pp. forms and proper punctuation | D/R; 74–75 |
| R06 | Outside sources use notes rather than the reviewed-book citation convention | D/R; 75 |
| R07 | More than two outside sources triggers an outside-source bibliography | D/R; 75 |
| A01 | Each annotated-bibliography entry has its associated annotation | D/R; 83 |
| A02 | Annotation paragraphs are single-spaced and indented half an inch as a block | D; 83 |
| A03 | One blank line separates annotated-bibliography elements | D/P; 83 |

## Dissertations — 16

These need an explicitly selected dissertation profile. External program guides
must be supplied and versioned before program-specific requirements can be
implemented. Instructor/chair permissions are inputs, not facts a parser infers.

| ID | Proposed check | Evidence / manual pages |
| --- | --- | --- |
| D01 | Apply binding margins, including the minimum 1.5-inch left margin | D/P; 84; profile extension of the existing margin rule |
| D02 | Required front/body/back matter is present and ordered appropriately | D/R; 85–89 |
| D03 | Approval page is excluded from pagination and contents | D/P; 85 |
| D04 | Title/copyright pages count as i/ii with their numbers suppressed | D/P; 85 |
| D05 | Dissertation title-page positions and group spacing | P; 85, 90; retain the documented conflict between the prose and sample annotation |
| D06 | Dedication placement, upright type, terminal punctuation, and number suppression | D/P; 85 |
| D07 | Epigraph placement, block formatting, source attribution, and number suppression | D/P/R; 85–86 |
| D08 | Roman front matter and Arabic main matter have the required numbering sequence | D/P; 85–88 |
| D09 | Contents headings, included levels, entries, and page references match the document | D/P/R; 86, 91; committee permissions may alter depth |
| D10 | Optional front-matter pages have the applicable headings, spacing, and numbering | D/P; 86–87 |
| D11 | Abstract placement, spacing, contents entry, and configured program word limit | D/R; 87; the numeric limit comes from the program guide |
| D12 | Part-title pages have appropriate placement, hidden numbering, and contents entries | D/P; 88 |
| D13 | Chapter labels/titles have the required capitalization, placement, and spacing | D/P; 88 |
| D14 | Footnote numbering restarts by chapter | D/P; 88 |
| D15 | Appendices use the required labels, chapter-style layout, and contents entries | D/P; 89; retain the documented letters-versus-sample-numbers conflict |
| D16 | Vita is last and contains the applicable sections in the required order | D/R; 89, 92; chronology and factual accuracy require review |

## What comprehensive coverage should mean

- Every requirement has a recorded disposition: checked, partially checked,
  not applicable, or needs human review. Publish the evidence and skip reason.
- Every implemented check has valid and invalid fixtures plus relevant
  exceptions. Build an authorized, anonymized corpus from Microsoft Word,
  LibreOffice, and other supported exporters. Include common manual formatting,
  style inheritance, long notes, multi-paragraph entries, and section breaks.
- Report when a profile, source form, or structure is unsupported. Improve
  recognition alongside adding rules; a large catalogue is of little value if
  real documents are misclassified.
- Keep assignment/program settings separate from the manual's baseline. Include
  edition, profile, and overrides in exported reports.
- Keep argument quality, theology, meaningful paraphrase, plagiarism, source
  facts, quotation fidelity, and context-dependent writing judgments in the
  human-review checklist. A formatting pass cannot certify them.

The inventory tables retain the original item IDs. Use the progress tables above
and [web-checker.md](web-checker.md) for the current implemented scope.
