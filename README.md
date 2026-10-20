# mbtstex

LaTeX formatting and citations for the **Midwestern Style Manual, fourth edition
(2021)**, used by Midwestern Baptist Theological Seminary and Spurgeon College.
This version was audited against a user-supplied copy of the complete manual.
The manual and its copyrighted sample papers are not distributed here.

Start with [`paper.tex`](paper.tex); [`paper.pdf`](paper.pdf) is its compiled
sample. The sample explicitly uses **TeX Gyre Termes**, a draft substitute. Use
`submission` with licensed **Times New Roman** installed for submission.

The project covers the manual's document structures and listed citation
categories. It cannot certify the argument, quotation accuracy, prose, or
assignment-specific requirements. Dissertation chapter counts, abstract limits,
and other program rules come from separate dissertation guides. See the
[coverage audit](docs/coverage.md), including two inconsistencies in the manual,
and the [author's checklist](docs/author-checklist.md).

## Quick start

Keep the `mbts*.sty`, `mbts.cls`, and, for automatic citations, `mbts.bbx`,
`mbts.cbx`, and `mbts.dbx` files beside your document, or install them in your
personal TeX tree.

```latex
\documentclass[submission]{mbts}
\title{The Title of Your Paper}
\author{Your Name}
\date{October 20, 2026}
\mbtssetup{course={HT 1234 Name of Course}}
\begin{document}
\maketitle
\section{Introduction}
Your text and argument.
\end{document}
```

Compile twice with XeLaTeX or LuaLaTeX. For the included draft:

```sh
make sample        # builds build/paper.pdf and updates root paper.pdf
make examples      # builds dissertation, review, annotated bibliography, citations
make check         # PDF layout and citation regression checks
```

`build/` and auxiliary files are ignored by Git. The root `paper.pdf` is tracked.
`make bundle` optionally creates an archive under `build/`; no archive is needed
to use the project. `ENGINE=lualatex` selects another compiler; `BIBER=...` selects
Biber. Use a recent TeX Live or MiKTeX installation containing `fontspec`,
`geometry`, `setspace`, `footmisc`, `titlesec`, `caption`, `newfloat`, `graphicx`,
`array`, `etoolbox`, `kvoptions`, and `xparse`. Automatic citations additionally
need matching versions of **biblatex and Biber**, plus `babel` and `csquotes` for
the examples. There is no dependency on biblatex-chicago.

## Fonts and class options

| Option | Behavior |
| --- | --- |
| `submission` | Requires actual Times New Roman under XeLaTeX/LuaLaTeX; errors if missing. Rejects oversized in-text `mbtsvisual` objects. |
| `font=auto` | Default: Times New Roman if installed; otherwise Termes with a conspicuous compiler warning. |
| `font=times` | Requires Times New Roman, without the additional submission checks. |
| `font=termes` | Explicit draft substitute; also permits pdfLaTeX. |
| `font=none` | Advanced font setup supplied by the author; no font-compliance claim. |
| `dissertation` | Uses the report class, 1.5-inch left margin, chapter structures and dissertation title. |
| `review` | Sets the paper type to “A Book Review.” |
| `fifthlevel` | Enables run-in `\subparagraph`; only for a PhD dissertation with chair approval. |

The body, titles, bibliography and page numbers are 12pt; footnotes are 10pt.
The old `footnotesize=12` setting is rejected because it contradicts the fourth
edition. `submission` takes precedence over any `font=` option. It does not
embed or download proprietary fonts. If you supply licensed font files under
custom filenames, use `font=none` and `fontspec` explicitly, and verify the fonts
in the resulting PDF yourself.

The package API is also supported:

```latex
\documentclass[12pt,letterpaper,oneside]{article}
\usepackage[submission]{mbts}
```

For a dissertation use `report` and `\usepackage[dissertation,submission]{mbts}`.
Two columns and non-12pt classes are rejected. The samples use invented data.

## Writing a paper

Use standard `\title`, `\author`, and `\date`. `\mbtssetup` accepts `course`,
`paper-type`, `institution`, and `degree`. The default institution is MBTS; set
`institution={Spurgeon College}` when appropriate. The location is Kansas City,
Missouri. Optional `professor` and `location` overrides are available only for
an explicit assignment exception; they are not the manual's standard layout.
Long titles wrap at single spacing. A title that cannot fit the fixed layout
raises an error instead of silently creating a second title page.

| Command | Heading |
| --- | --- |
| `\section{...}` | Centered, bold |
| `\subsection{...}` | Centered, regular |
| `\subsubsection{...}` | Flush left, bold |
| `\paragraph{...}` | Flush left, regular, on its own line |

Enter heading titles in headline capitalization. Use `mbtsquote` for quotations
that would occupy five or more lines of ordinary text. It supplies single
spacing and a half-inch left indent. Supply the quotation, citation, and any
brackets or ellipses accurately yourself.

```latex
The source explains:
\begin{mbtsquote}
The exact passage, without surrounding quotation marks.\footnote{The citation.}
\end{mbtsquote}
```

Manual bibliographies remain available. Supply entries alphabetically, already
formatted, ending in periods:

```latex
\begin{mbtsbibliography}
\mbtsbibitem{Surname, Given Name. \textit{Title}. City: Publisher, 2026.}
\end{mbtsbibliography}
```

## Automatic citations

```latex
\usepackage[american]{babel}
\usepackage{csquotes}
\usepackage[backend=biber,style=mbts]{biblatex}
\addbibresource{sources.bib}
% In the document:
A supported claim.\autocite[42]{source-key}
% At the end:
\mbtsprintbibliography
```

Run XeLaTeX, Biber, then XeLaTeX twice. `\autocite` and `\footcite` produce full
first notes, shortened later notes, and “Ibid.” for an unambiguous consecutive
citation on the same page. Shortened notes retain a short title. Use `shorttitle`
to abbreviate a long title. `\autocites[42]{one}[7]{two}` places multiple sources
in one note, separated by semicolons. Inside a substantive footnote use `\cite`.

All authors appear in the bibliography; notes abbreviate four or more authors.
The bibliography sorts by author and title. `dashed=true` optionally replaces
repeated author names with six underscores. Ebook/database/software access
information follows the locator in notes. Live performances and denominational
resolutions/reports are omitted from the bibliography; web and podcast sources
require `keywords={include-bibliography}` when sufficiently important or frequent.

See the [field and source-type guide](docs/citations.md), the
[66-variant database](examples/citations.bib), and its
[renderable gallery](examples/citations.tex). These contain the special types for
course materials, sermons, interviews, media, manuscript collections and ancient
works. **Use the documented type and fields**: a generic imported BibTeX record
may need adapting. `\mbtsprintbibliography` applies the MBTS exclusion filter;
plain `\printbibliography` does not.

## Scripture

```latex
\usepackage{mbts-bible}
% In the document, at the first use of the translation:
\mbtsbibleversion{English Standard Version}{ESV}{Wheaton, IL}{Crossway}{2016}
% Verify the publication metadata of the edition actually used.
\mbtsbible{Genesis}{1:1}                 % (Gen 1:1)
\mbtsbible[ESV]{Romans}{3:21--24, 27--31}
\mbtsbiblefootnote{Philemon}{4}         % a footnote for a nonbiblical topic
\mbtsbibleref{1 Corinthians}{13:1--3}   % without parentheses
```

The canonical book abbreviations follow SBL as required by this edition.
Write full book names in narrative prose. Choose parenthetical references or
footnotes according to the topic and instructor. Scripture is normally omitted
from the bibliography. Register additional names with
`\mbtsdeclarebiblebook{Name}{Abbreviation}`; use the manual's Appendix 6 for
apocryphal and specialist abbreviations. Unicode Greek and Hebrew require an
appropriate font and, for Hebrew, a bidirectional language setup. Keep original
scripts upright; italicize transliterations.

## Other document types

- [Dissertation](examples/dissertation.tex): approval inclusion, title counted as
  i but hidden, copyright ii hidden, optional dedication/epigraph, continuing
  Roman front matter, Arabic main matter, chapters, appendices, bibliography,
  and final vita. Chapter footnotes restart at 1. `\mbtsapproval{approval.pdf}`
  requires `pdfpages` and belongs before `\maketitle`; the school supplies it.
- [Book review](examples/book-review.tex): review title page, opening entry with
  page count and price, required sections, and parenthetical page citations.
- [Annotated bibliography](examples/annotated-bibliography.tex): hanging entries,
  block-indented annotations, single spacing and blank lines between elements.

`\mbtsmainmatter` starts Arabic page 1. A dissertation title already starts Roman
numbering, so **do not call `\mbtsfrontmatter` after it**. Course papers may use
`\mbtsfrontmatter`, `\tableofcontents`, then `\mbtsmainmatter` if required.

`\begin{mbtspage}{Acknowledgements}...\end{mbtspage}` creates an uppercase named
page with a contents entry. A star **after the environment name**, as in
`\begin{mbtspage}*{Preface}`, omits that entry. This supports abbreviations,
glossaries, prefaces and PhD research methods. The standard `abstract` environment
creates a contents entry. `\mbtsvita` is an environment; its
`\mbtsvitasection{...}` commands label the centered sections.

`\chapter`, `\part` and `\mbtsappendix{Title}` handle dissertation divisions.
Parts count in pagination but hide the number. Appendices use letters. Contents
include chapters and first-level headings; set `tocdepth` to 2 only with
committee permission. Lists of tables, figures, graphs and illustrations have
uppercase headings and continue the current numbering.

## Tables and figures

Use `mbtsvisual` for a measured, nonfloating object near the related discussion:

```latex
\begin{mbtsvisual}{table}{Survey Results}
\label{tab:survey}
\centering
\begin{mbtstabular}{lcc}
Group & Before & After\\\hline
First & 10 & 15\\
Second & 12 & 18\\\hline
\end{mbtstabular}
\mbtsfiguresource{The source citation.}
\mbtsfigurenote{Any necessary explanation.}
\end{mbtsvisual}
```

The first argument can be `table`, `figure`, `graph` or `illustration`. Labels and
titles are uppercase, on separate lines. `mbtstabular` supplies the required
upper double rule. Supply headline-style column headings, a stub column and
centered numeric columns. Large objects belong after `\mbtsappendix` and should
be referenced in the text. `mbtsvisual` warns above half a page in draft mode and
errors in submission mode. Standard floats/captions are also styled, but their
placement and size must be checked by the author.

## Verification and sources

The tests compile documents and inspect PDF text, coordinates, page labels,
font-size ratios, citation strings, bibliography sorting/exclusions and expected
errors. `make check` requires XeLaTeX, pdfLaTeX, Biber and Poppler's `pdftotext`.
Set `MBTS_TEST_ENGINES='xelatex pdflatex lualatex'` to include LuaLaTeX. The tests
use the explicit Termes draft font so they do not redistribute Times New Roman.

The authority is the purchased fourth-edition manual, not an official MBTS
endorsement of this project. Obtain it from the
[MBTS bookstore](https://shop.mbts.edu/products/midwestern-style-manual-4th-edition-digital-download).
Use the [Writer's Studio](https://www.mbts.edu/current-students/writers-studio/)
and your program's dissertation guide to resolve assignment-specific questions.
