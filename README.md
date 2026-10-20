# MBTS LaTeX course papers

`mbts.sty` formats course papers for **Midwestern Baptist Theological Seminary**.
`mbts.cls` is a convenient wrapper that selects the required 12-point article
class. Start by editing [paper.tex](paper.tex); [paper.pdf](paper.pdf) is the
compiled example included in the repository.

**Edition status:** this is an unofficial implementation of the publicly
accessible **2018 second edition, revised**, checked against a 2020 MBTS syllabus.
The MBTS library currently lists the **fourth edition**. Its text was not available
for verification, and the current formatting resources require a student login.
Compare the output with your assigned edition and syllabus before submitting.
This release covers course papers; it does not implement dissertation front
matter, chapter layouts, or binding margins.

## Quick start

Keep `mbts.cls`, `mbts.sty`, and your `.tex` file together. No installation of the
module is necessary. With a working TeX Live or MiKTeX installation:

```sh
xelatex paper.tex
xelatex paper.tex
```

Or run `make` to put the PDF and intermediate files in `build/`. To use another
engine, run `make clean` followed by `make ENGINE=lualatex` or
`make ENGINE=pdflatex`. The second pass resolves contents and references.
Run `make sample` to refresh the tracked root-level `paper.pdf` from the latest
build. Intermediate output stays in `build/`, which Git ignores.

Optional: `make bundle` creates `build/mbts-template.zip` with the class,
package, example, guide, and PDF. You can import it into Overleaf and choose
`paper.tex` with the XeLaTeX compiler.

```latex
\documentclass{mbts}
\title{The Title of the Paper}
\author{Student Name}
\date{October 20, 2026}
\mbtssetup{
  course={HT 0000 Course Name},
  paper-type={A Research Paper},
  location={Kansas City, Missouri}
}
\begin{document}
\maketitle
\section{Introduction}
Begin your paper here.\footnote{Your formatted source citation.}
\begin{mbtsbibliography}
  \mbtsbibitem{Your formatted bibliography entry.}
\end{mbtsbibliography}
\end{document}
```

For an existing article, replace the class wrapper with:

```latex
\documentclass[12pt,letterpaper,oneside]{article}
\usepackage{mbts}
```

The package owns margins, spacing, heading styles, footnote layout, and page
styles. Remove competing layout settings from an existing template. It requires
`geometry`, `setspace`, `footmisc`, `titlesec`, `indentfirst`, `kvoptions`,
`etoolbox`, and `iftex`; Unicode engines also use `fontspec`.

## Fonts

MBTS specifies **Times New Roman**. For a submission, install a licensed copy
and use XeLaTeX or LuaLaTeX with:

```latex
\documentclass[font=times]{mbts}
```

This mode fails if Times New Roman is unavailable. It never silently substitutes
a different font. In the default `font=auto` mode, the module uses Times New
Roman when available, otherwise **TeX Gyre Termes** with a warning. `font=termes`
explicitly selects that draft substitute. pdfLaTeX uses Termes. The included PDF
was built with Termes, because Times New Roman is absent on the build machine.

`font=none` leaves font selection to you. For example, if your Overleaf project
contains licensed font files, load them explicitly with `fontspec`:

```latex
\documentclass[font=none]{mbts}
\usepackage{fontspec}
\setmainfont{times.ttf}[
  BoldFont=timesbd.ttf,
  ItalicFont=timesi.ttf,
  BoldItalicFont=timesbi.ttf
]
```

Use your actual filenames. Fonts are not included in this project. For Greek or
Hebrew, use a Unicode engine and configure an appropriate language/font package;
the module does not supply language switching or right-to-left typesetting.

## Formatting and commands

| Feature | Default |
| --- | --- |
| Paper and margins | US Letter; one inch on all sides |
| Body | 12 point; double spaced; ragged right; single spaces after sentences |
| Paragraphs | Half-inch first-line indent, including after headings; no extra paragraph gap |
| Pagination | Centered footer; title unnumbered and excluded; body starts at 1 |
| `\section{Title}` | Centered, bold |
| `\subsection{Title}` | Centered, regular |
| `\subsubsection{Title}` | Flush left, bold |
| `\paragraph{Title}` | Flush left, regular; separate line |
| `mbtsquote` environment | Single spaced; half-inch left indent; no right indent |
| Footnotes | 12 point, including raised numbers; single spaced; first line indented |
| `mbtsbibliography` environment | New page; single-spaced entries with half-inch hanging indents |

Headings are unnumbered. Supply headline capitalization yourself. The four
heading commands retain LaTeX's contents behavior; starred headings are omitted
from the contents. `\footnote{...}` handles notes; numbering continues throughout
a course paper. Continuation footnotes receive a full-width separator.

Title-page fields use uppercase, with the institution beginning about two inches
from the top. `\mbtssetup` accepts `course`, `paper-type`, `location`,
`institution`, and optional `professor`. Omit `professor` unless your assignment
requires it. The template supplies the school and Kansas City by default.

For a longer paper, place these commands between `\maketitle` and the body:

```latex
\mbtsfrontmatter
\tableofcontents
\mbtsmainmatter
```

Contents pages start at roman `i`, excluding the title page; body pagination
restarts at Arabic `1`. Only first-level headings appear by default. Use
`\setcounter{tocdepth}{2}` to include second-level headings. This front-matter
numbering choice is a course-paper convention; verify it for your assignment.

The half-inch interpretation of “one tab,” spacing measurements, title-group
spacing, and the separator's interpretation of “22 spaces” are implementation
choices. Preamble lengths let you tune them without editing the package:

```latex
\setlength{\mbtsindent}{0.5in}
\setlength{\mbtsheadbefore}{28.8pt}
\setlength{\mbtsheadafter}{14.4pt}
\setlength{\mbtsentrysep}{14.4pt}
\setlength{\mbtsfootnoterulewidth}{1.5in}
\setlength{\mbtstitletop}{1in} % added to the one-inch top margin
\setlength{\mbtstitlegap}{0.5in} % minimum gap; remaining space is distributed
```

If your instructor specifies smaller notes, use `footnotesize=10` as a class or
package option. The default remains 12. Load `hyperref` after `mbts`, if needed;
the module makes links black without boxes or underlining.

## Citations

The ready-to-edit paper needs **no bibliography processor**. Write full or short
citations inside `\footnote`, then put alphabetized bibliography entries inside
`\mbtsbibitem{...}`. The module formats their layout; it does not generate citation
wording, sort manual entries, or decide when to use *Ibid.* The sample entries
are plainly labeled placeholders, not real sources.

For a `.bib` database, optional `biblatex-chicago` integration is available:

```latex
% Preamble, after \documentclass{mbts}:
\usepackage[american]{babel}
\usepackage{csquotes}
\usepackage[notes,backend=biber]{biblatex-chicago}
\addbibresource{sources.bib}

% In the body:
% ...text.\autocite[25]{source-key}
% At the end, instead of the manual environment:
% \mbtsprintbibliography
```

Build with XeLaTeX, Biber, then XeLaTeX twice. Install `biblatex`,
`biblatex-chicago`, and matching Biber versions for this path. The integration
sets the bibliography heading, spacing, and indents. **Chicago citation output
is not an MBTS-specific citation style**: check wording, repeated authors,
online-source dates, Bible references, and specialized theological sources
against your manual. The older manual has institutional exceptions.

## Sources and checks

Requirements were researched on October 20, 2026:

- [MBTS Writer's Studio](https://library.mbts.edu/writers-studio-0): identifies
  the current fourth edition and links to the bookstore.
- [MBTS formatting resources](https://mbts.instructure.com/courses/5368/pages/formatting-resources):
  linked by the library; redirects to student sign-in.
- [2018 second edition, revised](https://github.com/gq9000/styles/blob/master/The-Midwestern-Style-Manual-Second-Edition-Revised-110718.pdf):
  a publicly hosted copy of the seminary's manual, referenced by the
  [CSL style's documentation](https://github.com/citation-style-language/styles/pull/4363#issuecomment-546532333).
  Printed pages 1–3, 18–22, and 32–33 inform layout, title pages, and notes.
  The manual itself is not redistributed here.
- [2020 MBTS Reformation syllabus, page 7](https://jgduesing.com/wp-content/uploads/2020/06/DR37375_Barrett-Duesing-Syllabus-Oct-2020.pdf):
  confirms Times New Roman 12, one-inch margins, double spacing, and ragged right.

Run `make check` for compilation and PDF layout checks. It uses Python's standard
library, XeLaTeX, pdfLaTeX, and Poppler's `pdftotext`. To include LuaLaTeX, run
`MBTS_TEST_ENGINES="xelatex pdflatex lualatex" make check` with a complete
LuaLaTeX installation (including `luaotfload` and `lualibs`). The sample and
layout checks passed with all three engines during development. Automated
checks verify layout behavior; they do not certify fourth-edition compliance.
The optional bibliography integration was also tested with `biblatex-chicago`
2.3b, `biblatex` 3.22a, and Biber 2.22. With those dependencies installed, run
`MBTS_TEST_BIBLATEX=1 make check` to include the bibliography test.
