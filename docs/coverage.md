# Fourth-edition coverage audit

Authority: Jennifer Hearson, ed., *Midwestern Style Manual*, fourth edition
(2021), supplied locally by the project owner. Page references below are
**printed page numbers**, not PDF page indices. Audited 20 October 2026.
The paid manual, its extracted text, and its sample images are not in this repo.

This is an implementation of the manual's typesetting and listed citation
patterns, accompanied by author instructions for rules that cannot be determined
from LaTeX markup. “Implemented” does not mean a document using the class is
necessarily a compliant submission. The source metadata, selected structures,
assignment requirements, and final output still matter.

| Manual area | Implementation | Verification / author responsibility |
| --- | --- | --- |
| Academic writing, pp.3–10 | [Author checklist](author-checklist.md) | Tone, clarity, argument, capitalization, historical dates, numbers and tense require author review. |
| Course/review title, pp.11–13,69–70 | Fixed grid, uppercase centered 12pt, four-line start, eight-line group spacing; `review` option | PDF positions and one-page fit tested; author supplies accurate metadata. |
| Body, pp.14–17 | Letter paper, one-inch margins, ragged right, 12pt, double spacing, half-inch paragraph indent, no paragraph gap, single punctuation spacing | PDF positions, line spacing and footers tested. |
| Required font, pp.14–15 | `submission`/`font=times` require Times New Roman | Build refuses missing font; portable tests and sample intentionally use Termes. No Times font is redistributed. |
| Headings, pp.15–17,93 | Four styles, spacing, paragraph indentation, keep-with-following behavior; optional fifth run-in level | Style/coordinates tested. Author supplies headline capitalization; fifth level requires PhD chair permission. |
| Notes, pp.18–19 | 10pt, single spacing, first-line indent, raised marker and ordinary space, blank line between notes | Font ratio, line spacing and indent tested. Manual notes must end in periods. |
| Bibliography, pp.22–24,35–37 | New page, uppercase title, 12pt, hanging half-inch entries, blank lines; author/title sorting and optional six underscores | Layout and sorting tests; manual entries must be ordered by the author. |
| Notes and shortened notes, pp.31–35 | Full first citation, short later citation, same-page consecutive Ibid., changed locator, multicites | Independent expected strings, cross-page and multiple-source tests. Short titles are retained to disambiguate works. |
| Scripture, pp.38–39,115–117 | Translation notice, canonical SBL abbreviations, parenthetical/plain/footnote commands | Scripture fixture and main example's declaration at its first quotation. Author selects appropriate reference form, edition metadata and translation exceptions. |
| Source templates, pp.40–68 | `mbts.bbx`, `mbts.cbx`, `mbts.dbx` | [Type mapping](citations.md); 66 invented variants compile, with explicit expected text and exclusion assertions. |
| Book reviews, pp.69–82 | Review title, hanging opening entry with page count/price, parenthetical p./pp., required section example | Compiled example. Author supplies the three discussions and decides whether outside-source count requires a bibliography. |
| Annotated bibliographies, p.83 | Hanging entries, single-spaced half-inch block annotations, blank lines | Indent and pagination tested. Annotation content/length and manual sorting are author responsibilities. |
| Dissertation margins, p.84 | Minimum 1.5-inch left, one-inch other margins | PDF coordinates tested. Optional copier allowance can be set through `geometry`. |
| Approval/title/copyright, p.85 | Optional inclusion of seminary PDF; excluded approval count; title i hidden, copyright ii hidden | Front-matter labels tested; approval inclusion tested with a generated PDF. School supplies the real approval page. |
| Dedication/epigraph, pp.85–86 | Hidden page numbers but counted pages, one-third-page placement, roman dedication, block epigraph and em-dash source | Example pagination tested; author omits dedication punctuation and verifies quoted epigraph. |
| Contents/lists, pp.86,91 | Uppercase heading, chapter/first-level entries, continued Roman page numbers; lists of tables, figures, graphs and illustrations | Resolved TOC, list entries and pagination tested. Optional second-level entries require committee approval. |
| Optional front matter, pp.86–87 | Named double-spaced `mbtspage` with optional TOC entry | Supports preface, acknowledgements, abbreviations, glossary and research-method page. Method page is PhD-only. |
| Abstract, p.87 | Double-spaced named page in TOC, Roman count | Required placement illustrated; word limit/content require the degree's separate guide. |
| Parts/chapters, p.88 | Counted but hidden part page; uppercase chapter label/title, top placement, Arabic body pagination; note reset per chapter | Parts, heading coordinates, pagination and note resets tested. |
| Appendices/back matter, p.89 | Lettered chapter-style appendices, glossary, bibliography and final centered vita, with contents entries | Compiled example and TOC tests. |
| Vita, p.92 | `mbtsvita`, labeled centered sections | Example includes contact, education, ministry, professional positions and societies. Author supplies correct chronology. |
| Quotations/punctuation, pp.94–107 | `mbtsquote`, ordinary LaTeX punctuation and `csquotes` support | Block indent/spacing tested. Quote length, fidelity, punctuation placement and edits require review. |
| Attribution/plagiarism, pp.108–111 | Citation tools and author checklist | Originality, proper paraphrase and attribution cannot be certified by a class. |
| Tables/charts/figures, pp.112–114 | Uppercase number and title on separate lines, spacing, double table rule, source/note helpers; half-page measurement for `mbtsvisual` | Caption/list rendering and oversize behavior tested. Data, stub/column headings, placement and grayscale legibility require review. |
| Specialist abbreviations, pp.115–120 | Canonical Bible mapping plus `\mbtsdeclarebiblebook`; ordinary user-defined commands for other terms | Refer to Appendix 6 for apocryphal/Judean-desert/scholarly abbreviations; do not derive them from older Turabian lists. |
| Changes from previous edition, p.121 | 10pt notes; author-first websites; access medium after locator; edited-volume page order; course material forms; simpler ancient citations; book-review parentheticals; SBL books | Covered above. Historical-present allowance is documented in the author checklist. |

## Interpretations where the manual is inconsistent

1. **Dissertation title top:** p.85 explicitly places the first line two inches
   from the top edge, while p.90's annotation says the fourth single-spaced line.
   The implementation follows the physical two-inch instruction and p.90's
   six-line gaps. Ask the dissertation office which rule it expects if it
   supplies a different title template.
2. **Appendix designations:** p.89 specifies letters; the sample contents on p.91
   uses numbers. The implementation follows p.89 (`APPENDIX A`, etc.).
3. **Reprint punctuation:** p.45's generic pattern has a comma after “repr.”
   whereas its worked example omits it. The implementation follows the example.
4. **Small template inconsistencies:** some dictionary, podcast and editor
   examples omit a comma between two bibliography authors that p.43 explicitly
   requires. The implementation follows the explicit author-name rule. The
   Festschrift's sentence break before “Edited by” follows its specific template.

The manual specifies Word spacing settings, not a TeX baseline in points. The
implementation uses LaTeX's 12pt double-spacing convention (24pt baseline),
14.4pt single-spaced body/bibliography lines, 12pt note lines, and a 13.8pt title
grid. Gaps count from the **last line** of a wrapped title or metadata block.
This preserves the specified relative line counts without elastic page filling.

## Requirements outside this manual

The manual itself delegates doctoral abstract limits, chapter plans and other
program-specific requirements to the applicable dissertation guide. Those guides
were not supplied, so this project does not claim universal compliance across
PhD, DMin, DEdMin and counseling programs. It provides the structures described
in this manual, including the six-chapter professional-doctorate reminder in the
author checklist. The seminary's approval page is external by definition.

The tests establish behavior of the implementation. They are not an MBTS
certification or an approval of a particular student's submission.
