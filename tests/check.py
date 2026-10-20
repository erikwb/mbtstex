"""Compile real documents and inspect PDF coordinates, pagination, and failures."""
from pathlib import Path
import os
import shutil
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build" / "checks"
NS = {"x": "http://www.w3.org/1999/xhtml"}


def run(*args, **kwargs):
    result = subprocess.run(args, cwd=ROOT, text=True, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, **kwargs)
    return result


def compile_tex(engine, name, source, *, error=None, bibliography=False):
    directory = BUILD / engine
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{name}.tex"
    path.write_text(source)
    for pass_number in range(1 if error else (3 if bibliography else 2)):
        result = run(engine, "-interaction=nonstopmode", "-halt-on-error",
                     f"-output-directory={directory}", str(path))
        if error:
            assert result.returncode != 0 and error in result.stdout, result.stdout
            return
        assert result.returncode == 0, result.stdout
        if bibliography and pass_number == 0:
            result = run(os.environ.get("BIBER", "biber"),
                         f"--input-directory={directory}",
                         f"--output-directory={directory}", name)
            assert result.returncode == 0, result.stdout
    log = path.with_suffix(".log").read_text()
    for problem in ("Overfull", "Undefined control sequence", "Missing character",
                    "multiply defined", "undefined references", "destination with the same"):
        assert problem not in log, f"{name}: {problem}\n{log}"
    if bibliography:
        assert "Please (re)run Biber" not in log, log
        assert "Citation '" not in log, log
        assert "Empty bibliography" not in log, log
    pdf = path.with_suffix(".pdf")
    result = run("pdftotext", "-bbox-layout", str(pdf), "-")
    assert result.returncode == 0, result.stdout
    return ET.fromstring(result.stdout).findall(".//x:page", NS)


def words(page):
    return page.findall(".//x:word", NS)


def find_word(page, text):
    return next(w for w in words(page) if w.text == text)


def near(actual, expected, tolerance=1):
    assert abs(float(actual) - expected) <= tolerance, (actual, expected)


def footer(page):
    return [w for w in words(page) if float(w.attrib["yMin"]) > 735]


def basic_layout(pages, labels):
    assert len(pages) == len(labels), (len(pages), labels)
    for page, label in zip(pages, labels):
        near(page.attrib["width"], 612)
        near(page.attrib["height"], 792)
        f = footer(page)
        assert [w.text for w in f] == ([] if label is None else [label])
        if f:
            near((float(f[0].attrib["xMin"]) + float(f[0].attrib["xMax"])) / 2, 306)
        for w in words(page):
            assert float(w.attrib["xMin"]) >= 71.5, w.attrib
            assert float(w.attrib["xMax"]) <= 540.5, w.attrib
        assert "plus" not in [w.text for w in words(page)], "Glue leaked into title text"


FIXTURE = r"""
\documentclass[font=termes]{mbts}
\usepackage{hyperref}
\title{A Longer Paper Title That Demonstrates Wrapping Across Multiple Lines}
\author{Example Student}
\date{October 20, 2026}
\mbtssetup{course={HT 1234 Example Course},professor={Dr. Example Teacher}}
\begin{document}
\maketitle
\mbtsfrontmatter
\tableofcontents
\mbtsmainmatter
\section{Opening Heading}
Bodyfirst introduces a paragraph long enough to wrap naturally so that both
the first-line indentation and subsequent lines can be inspected in the PDF.
Several additional words keep this paragraph running over more than one line.
\footnote{Notefirst begins an intentionally lengthy note. Its first line must
be indented, while subsequent lines return to the left margin of the text
block. This extra sentence makes the note long enough to wrap more than once.}

Secondfirst begins a separate paragraph with a second footnote.
\footnote{Notesecond checks the separation between consecutive notes.}
\begin{mbtsquote}
Quotefirst begins a block quotation. Each line should start at the half-inch
indent and use single spacing. This deliberately long placeholder paragraph
ensures there are multiple lines to inspect in the resulting PDF document.
\end{mbtsquote}

Afterquote starts a new paragraph after the quotation.
\newpage
\subsection{Second Heading}
Secondbody follows a centered, regular heading.
\subsubsection{Third Heading}
Thirdbody follows a flush-left, bold heading.
\paragraph{Fourth Heading}
Fourthbody follows a flush-left, regular heading.
\begin{mbtsbibliography}
\mbtsbibitem{Alpha, Anne. \textit{Bibliography Title with Enough Words to Wrap
Onto Another Line and Demonstrate the Hanging Indent}. Example City:
An Example Publisher, 2020.}
\mbtsbibitem{Beta, Ben. \textit{Another Book}. Example City: Publisher, 2021.}
\end{mbtsbibliography}
\end{document}
"""


def check_fixture(pages):
    basic_layout(pages, [None, "i", "1", "2", "3"])
    # Title starts at the second inch, and wraps without creating a second page.
    school = find_word(pages[0], "MIDWESTERN")
    assert 140 < float(school.attrib["yMin"]) < 152
    # TOC is resolved and contains only first-level headings by default.
    contents = " ".join(w.text for w in words(pages[1]))
    assert "Opening Heading" in contents and "Second Heading" not in contents
    body = pages[2]
    for marker in ("Bodyfirst", "Secondfirst", "Quotefirst", "Afterquote"):
        near(find_word(body, marker).attrib["xMin"], 108)
    # PDF bounding-box tops differ slightly between bold/regular font metrics
    # and engines, even with identical baselines; allow one PDF point.
    near(float(find_word(body, "Bodyfirst").attrib["yMin"]) -
         float(find_word(body, "Opening").attrib["yMin"]), 28.8, tolerance=1)
    note = find_word(body, "Notefirst")
    assert 112 < float(note.attrib["xMin"]) < 123
    lines = body.findall(".//x:line", NS)
    bodyline = next(i for i, line in enumerate(lines)
                    if any(w.text == "Bodyfirst" for w in line.findall("x:word", NS)))
    near(lines[bodyline + 1].attrib["xMin"], 72)
    near(float(lines[bodyline + 1].attrib["yMin"]) -
         float(lines[bodyline].attrib["yMin"]), 24, tolerance=0.5)
    noteline = next(i for i, line in enumerate(lines)
                    if any(w.text == "Notefirst" for w in line.findall("x:word", NS)))
    near(lines[noteline + 1].attrib["xMin"], 72)
    # Compare two continuation lines (the raised marker changes line-one bounds).
    near(float(lines[noteline + 2].attrib["yMin"]) -
         float(lines[noteline + 1].attrib["yMin"]), 14.4, tolerance=0.5)
    for marker in ("Secondbody", "Thirdbody", "Fourthbody"):
        near(find_word(pages[3], marker).attrib["xMin"], 108)
    near(find_word(pages[3], "Third").attrib["xMin"], 72)
    near(find_word(pages[3], "Fourth").attrib["xMin"], 72)
    bibliography = pages[4]
    near(find_word(bibliography, "Alpha,").attrib["xMin"], 72)
    near(find_word(bibliography, "Beta,").attrib["xMin"], 72)
    blines = bibliography.findall(".//x:line", NS)
    first = next(i for i, line in enumerate(blines)
                 if any(w.text == "Alpha," for w in line.findall("x:word", NS)))
    near(blines[first + 1].attrib["xMin"], 108)


def main():
    engines = os.environ.get("MBTS_TEST_ENGINES", "xelatex pdflatex").split()
    for tool in [*engines, "pdftotext"]:
        assert shutil.which(tool), f"Missing test dependency: {tool}"
    for engine in engines:
        sample = compile_tex(engine, "sample", (ROOT / "paper.tex").read_text())
        basic_layout(sample, [None, "1", "2", "3"])
        check_fixture(compile_tex(engine, "layout", FIXTURE))
        package = FIXTURE.replace(r"\documentclass[font=termes]{mbts}",
                                  r"\documentclass[12pt]{article}\usepackage[font=termes]{mbts}")
        check_fixture(compile_tex(engine, "package", package))
        compile_tex(engine, "bad-size",
                    r"\documentclass{article}\usepackage{mbts}\begin{document}X\end{document}",
                    error="A 12pt document class is required")
        compile_tex(engine, "bad-font",
                    r"\documentclass[font=bogus]{mbts}\begin{document}X\end{document}",
                    error="Unknown font option")
        if engine == "pdflatex":
            compile_tex(engine, "strict-font",
                        r"\documentclass[font=times]{mbts}\begin{document}X\end{document}",
                        error="font=times requires LuaLaTeX or XeLaTeX")
        print(f"PASS {engine}: sample, layout, package API, and invalid options")

    if os.environ.get("MBTS_TEST_BIBLATEX") == "1":
        database = BUILD / "sources.bib"
        database.write_text("""@book{alpha,
  author = {Alpha, Anne},
  title = {An Invented Book with a Long Title for Testing Bibliography
           Wrapping and Hanging Indentation across More Than One Line},
  location = {Example City}, publisher = {Example Press}, date = {2020}}
@book{beta,
  author = {Beta, Ben}, title = {Another Invented Book},
  location = {Example City}, publisher = {Example Press}, date = {2021}}
""")
        bibsource = r"""\documentclass[font=termes]{mbts}
\usepackage[american]{babel}
\usepackage{csquotes}
\usepackage[notes,backend=biber]{biblatex-chicago}
\addbibresource{DATABASE}
\begin{document}
First citation.\autocite[25]{beta}
Another source.\autocite[10]{alpha}
Repeated source.\autocite[26]{beta}
\mbtsprintbibliography
\end{document}
""".replace("DATABASE", str(database))
        pages = compile_tex(engines[0], "biblatex", bibsource, bibliography=True)
        basic_layout(pages, ["1", "2"])
        bwords = words(pages[1])
        assert [w.text for w in bwords].index("Alpha,") < [w.text for w in bwords].index("Beta,")
        near(find_word(pages[1], "Alpha,").attrib["xMin"], 72)
        blines = pages[1].findall(".//x:line", NS)
        first = next(i for i, line in enumerate(blines)
                     if any(w.text == "Alpha," for w in line.findall("x:word", NS)))
        near(blines[first + 1].attrib["xMin"], 108)
        print("PASS biblatex-chicago/Biber: citations, sorting, and bibliography layout")


if __name__ == "__main__":
    main()
