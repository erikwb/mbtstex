"""Compile real documents and inspect PDF coordinates, pagination, and failures."""
from pathlib import Path
import os
import re
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


def basic_layout(pages, labels, *, left=72, center=306):
    assert len(pages) == len(labels), (len(pages), labels)
    for page, label in zip(pages, labels):
        near(page.attrib["width"], 612)
        near(page.attrib["height"], 792)
        f = footer(page)
        assert [w.text for w in f] == ([] if label is None else [label])
        if f:
            near((float(f[0].attrib["xMin"]) + float(f[0].attrib["xMax"])) / 2, center)
        for w in words(page):
            assert float(w.attrib["xMin"]) >= left - 0.5, w.attrib
            assert float(w.attrib["xMax"]) <= 540.5, w.attrib
        assert "plus" not in [w.text for w in words(page)], "Glue leaked into title text"


FIXTURE = r"""
\documentclass[font=termes]{mbts}
\usepackage{hyperref}
\title{A Longer Paper Title That Demonstrates Wrapping Across Multiple Lines}
\author{Example Student}
\date{October 20, 2026}
\mbtssetup{course={HT 1234 Example Course},}
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
block. This extra sentence makes the note long enough to wrap more than once.
Additional text ensures that there are at least three full lines in the smaller
ten-point type required by the fourth edition, so its baseline can be measured.}

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
    # Fourth-edition title: school on line four of a fixed single-spaced grid.
    # PDF font bounding boxes vary by engine (Lua includes a taller ascender);
    # baseline differences below are the precise spacing checks.
    school = find_word(pages[0], "MIDWESTERN")
    assert 108 < float(school.attrib["yMin"]) < 120
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
         float(lines[noteline + 1].attrib["yMin"]), 12, tolerance=0.5)
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
    # Footnote glyphs are 10pt while main text uses 12pt (compare font bounds).
    body_height = float(find_word(body, "Bodyfirst").attrib["yMax"]) - float(find_word(body, "Bodyfirst").attrib["yMin"])
    note_height = float(note.attrib["yMax"]) - float(note.attrib["yMin"])
    near(note_height / body_height, 10 / 12, tolerance=.02)


def text(pages):
    return " ".join(w.text or "" for page in pages for w in words(page))


def check_structures(engine):
    pages = compile_tex(engine, "dissertation", (ROOT / "examples/dissertation.tex").read_text())
    basic_layout(pages, [None] * 4 + ["v", "vi", "vii", "viii", "ix", "x", "xi", "xii"]
                 + [str(i) for i in range(1, 8)], left=108, center=324)
    toc = text([pages[4]])
    for title in ("CHAPTER 1 INTRODUCTION", "APPENDIX A SUPPORTING MATERIAL",
                  "ABSTRACT", "BIBLIOGRAPHY", "VITA", "Research Question"):
        assert title in toc, toc
    assert "PREFACE" not in toc and "Copyright" not in toc
    for i in (12, 13):
        near(find_word(pages[i], "CHAPTER").attrib["yMin"], 74.6, tolerance=7)
    near(find_word(pages[12], "Introduce").attrib["xMin"], 144)
    # Regular/bold PDF ascent boxes differ across engines; compare centers.
    def vertical_center(word):
        return (float(word.attrib["yMin"]) + float(word.attrib["yMax"])) / 2
    near(vertical_center(find_word(pages[12], "Research")) -
         vertical_center(find_word(pages[12], "INTRODUCTION")), 43.2, tolerance=1)
    near(find_word(pages[13], "Present").attrib["xMin"], 144)
    # Chapter 2 restarts notes at 1, and body/table captions stay 12pt.
    assert "Second chapter’s first note." in text([pages[13]])
    assert "TABLE 1 ILLUSTRATIVE RESULTS" in text([pages[13]])
    near(find_word(pages[0], "MIDWESTERN").attrib["yMin"], 144, tolerance=7)
    review = compile_tex(engine, "review", (ROOT / "examples/book-review.tex").read_text())
    basic_layout(review, [None, "1"])
    assert "(p. 12)" in text(review) and "(pp. 12–14)" in text(review)
    annotated = compile_tex(engine, "annotated", (ROOT / "examples/annotated-bibliography.tex").read_text())
    basic_layout(annotated, ["1"])
    near(find_word(annotated[0], "Alpha,").attrib["xMin"], 72)
    near(find_word(annotated[0], "Summarize").attrib["xMin"], 108)
    scripture = compile_tex(engine, "scripture", r"""\documentclass[font=termes]{mbts}
\usepackage{mbts-bible}\begin{document}
\mbtsbibleversion{Example Translation}{EXT}{Example City}{Example Press}{2020}
Genesis is written in full in narrative text. \mbtsbible{Genesis}{1:1}
\mbtsbible[EXT]{1 Corinthians}{13:1--3}
\mbtsbiblefootnote{Philemon}{4} \mbtsbible{Psalms}{1--2}
\end{document}""")
    for expected in ("(Gen 1:1)", "(1 Cor 13:1–3 EXT)", "Phlm 4.", "(Pss 1–2)"):
        assert expected in text(scripture), text(scripture)
    # Explicitly exercise every extra list, part pages, and approved fifth level.
    extra = compile_tex(engine, "extra-structure", r"""\documentclass[dissertation,fifthlevel,font=termes]{mbts}
\usepackage{hyperref}\begin{document}
\mbtsfrontmatter\listofgraphs\listofillustrations\mbtsmainmatter\part{Evidence}
\chapter{Analysis}\subparagraph{Run-in heading} Body follows on the same line.
\begin{mbtsvisual}{graph}{Graph Example}\label{graph:test}\rule{1in}{.4in}\end{mbtsvisual}
\begin{mbtsvisual}{illustration}{Image Example}\label{image:test}\rule{1in}{.4in}\end{mbtsvisual}
\mbtsappendix{Details} See graph \ref{graph:test} and illustration \ref{image:test}.
\end{document}""")
    assert "Graph Example" in text([extra[0]]) and "Image Example" in text([extra[1]])
    assert "Run-in heading. Body" in text(extra)
    assert not footer(extra[2]) and [w.text for w in footer(extra[3])] == ["2"]
    approval_source = (ROOT / "examples/dissertation.tex").read_text().replace(
        "% \\usepackage{pdfpages}", "\\usepackage{pdfpages}").replace(
        "% \\mbtsapproval{approval.pdf}",
        "\\mbtsapproval{" + str(BUILD / engine / "sample.pdf") + "}")
    approval = compile_tex(engine, "approval", approval_source)
    assert len(approval) == len(pages) + 1
    assert not footer(approval[0]) and not footer(approval[1])
    assert [w.text for w in footer(approval[5])] == ["v"]
    # Test the visual-size guard independently of the licensed-font dependency.
    compile_tex(engine, "large-visual", r"""\documentclass[font=termes]{mbts}
\makeatletter\mbts@submissiontrue\makeatother
\begin{document}\begin{mbtsvisual}{figure}{Large}\rule{1in}{5in}\end{mbtsvisual}\end{document}""",
        error="Visual exceeds half a page")
    caption = compile_tex(engine, "captionof", r"""\documentclass[font=termes]{mbts}
\usepackage{hyperref}\begin{document}
\captionof{figure}{A Caption Outside a Float}\rule{1in}{1in}\end{document}""")
    assert "A CAPTION OUTSIDE A FLOAT" in text(caption)
    for option, error in (("footnotesize=12", "Footnotes must be 10pt"),
                          ("fifthlevel", "Fifth level is dissertation-only")):
        compile_tex(engine, "bad-" + option.split("=")[0],
            rf"\documentclass[font=termes,{option}]{{mbts}}\begin{{document}}X\end{{document}}", error=error)


def check_citations(engine):
    gallery = compile_tex(engine, "citations", (ROOT / "examples/citations.tex").read_text(), bibliography=True)
    all_text = text(gallery)
    notes, bibliography = all_text.split("BIBLIOGRAPHY", 1)
    # These expected strings are transcribed from the manual's formatting rules
    # using invented metadata. They test output, not driver implementation.
    expected_notes = [
        "Anne Alpha, A Sample Book (Example City: Example Press, 2020), 12.",
        "David Delta, Eve Epsilon, and Zoe Zeta, A Sample Book",
        "Ellen Eta et al., A Sample Book",
        "Emma Editor and Henry Helper, eds., A Sample Book",
        "A Sample Book, 2nd ed. (Example City",
        "A Sample Book (1850; repr. Example City",
        "A Larger Work, vol. 2, The Second Part",
        "A Sample Book (Example City: Example Press, 2020), 2:12.",
        "A Sample Book, 12 vols. (Example City",
        "2020), 12, Kindle.", "2020), 12, EBSCO.",
        "2020), 12, https://example.org/book.",
        "2020), 12, Logos Bible Software.",
        "Dictionary of Example Theology (2020), s.v. “mercy.”",
        "Example Review 2, no. 1 (2020): 12.",
        "(PhD diss., Example Seminary, 2020), 12.",
        "(DMin diss., Example Seminary, 2020), 12.",
        "lecture notes for HT 1234 Example Theology, Example Seminary, October 2020.",
        "Class notes, Master of Divinity, HT 1234 Example Theology",
        "Seminary Chapel sermon, Example Seminary, Example City, October 2, 2020.",
        "(plenary address, Example Conference, Example City, October 2–4, 2020)",
        "Professor of Theology, interview by author, Example City, October 2, 2020.",
        "Example Podcast (MP3 podcast), Example Seminary, October 2, 2020,",
        "“An Example Song” (music video), directed by Drew Director,",
        "Willow Webster (@example), “An Example Online Item,”",
        "162nd Session, 174th Year, June 11–12, 2019: Item 7, 2019 SBC Annual, 12.",
        "Ancient Author, An Ancient Work 2.3.4.",
    ]
    for expected in expected_notes:
        assert expected in notes, f"Missing note output: {expected}\n{notes}"
    for expected in [
        "Eta, Ellen, Theo Theta, Ian Iota, and Kate Kappa.",
        "Beta, Ben, and Grace Gamma.",
        "In Collected Studies, edited by Emma Editor, 30–50.",
        "In Collected Studies. Edited by Emma Editor, 30–50.",
        "Preface to Collected Studies, by Alice Author",
        "Introduction to Collected Studies, by Alice Author. Example City",
        "Foreword to Collected Studies, by Alice Author. Example City",
        "A Sample Book, 12 vols. Example City",
        "review of A Reviewed Book by Alice Author.",
        "Dictionary of Example Theology. Example City: Example Press, 2020. 3:511–521.",
        "“A Sample Dissertation.” PhD diss., Example Seminary, 2020.",
        "Speaker, Sarah. “An Illustrative Address.” Plenary address,",
        "Example Society, 1900. Example Papers.",
        "Translated by Tina Translator. 2 vols. Example City: Example Press, 2020.",
    ]:
        assert expected in bibliography, f"Missing bibliography output: {expected}\n{bibliography}"
    for forbidden in ("Occasional Website", "Occasional Episode", "An Individual Item",
                      "An Example Resolution", "An Example Report", "Recommendation 4", "Performer, Parker"):
        assert forbidden not in bibliography, forbidden
    for forbidden in ("vol. vol.", "vols. vols.", "family=", "undefined"):
        assert forbidden not in all_text, forbidden
    assert bibliography.index("Alpha, Anne.") < bibliography.index("Class notes.")
    assert bibliography.index("Dictionary of Example Theology. 2nd ed.") < bibliography.index("Editor, Emma, ed.")

    notes_source = r"""\documentclass[font=termes]{mbts}
\usepackage[american]{babel}\usepackage{csquotes}
\usepackage[backend=biber,style=mbts,dashed=true]{biblatex}
\addbibresource{examples/citations.bib}\begin{document}
First.\autocite[3]{single} Same.\autocite[3]{single} Different.\autocite[5]{single}
Other.\autocite[4]{journal} Return.\autocite[9]{single}
\newpage Same source on a new page.\autocite[9]{single}
Two sources.\autocites[10]{single}[101]{journal}
Substantive.\footnote{Compare \cite[12]{edition}; \cite[5]{single}.}
\mbtsprintbibliography\end{document}"""
    notes = compile_tex(engine, "note-tracking", notes_source, bibliography=True)
    assert "Ibid." in text([notes[0]]) and "Ibid., 5." in text([notes[0]])
    assert "Alpha, Sample Book, 9." in text([notes[0]])
    assert "Ibid." not in text([notes[1]])
    assert "Alpha, Sample Book, 10; Journal, “A Sample Article,” 101." in text(notes)
    assert "______" in text(notes)
    # Separate subtitle fields must share a single set of quotation marks.
    database = BUILD / "subtitles.bib"
    database.write_text('''@article{subtitle,
      author={Subtitle, Sara}, title={The Main Title}, subtitle={A Subtitle},
      journaltitle={Example Journal}, volume={1}, date={2020}, pages={1--10}}
@reference{unsigned, title={Example Dictionary}, editor={Editor, Emma},
      date={2020}, mbtsword={mercy}, location={Example City}, publisher={Example Press}}
''')
    subtitle = compile_tex(engine, "subtitles", r"""\documentclass[font=termes]{mbts}
\usepackage[american]{babel}\usepackage{csquotes}\usepackage[backend=biber,style=mbts]{biblatex}
\addbibresource{DATABASE}\begin{document}
First.\autocite[4]{subtitle} Dictionary.\autocite{unsigned}
Return.\autocite[5]{subtitle} Dictionary again.\autocite{unsigned}
\mbtsprintbibliography\end{document}""".replace("DATABASE", str(database)), bibliography=True)
    assert '“The Main Title: A Subtitle,” Example Journal 1 (2020): 4.' in text(subtitle)
    assert 'Editor, Example Dictionary' not in text(subtitle)
    print("PASS Biber/MBTS style: 66 variants, bibliography exclusions, Ibid., short notes, multi-cites, repeated authors")


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
        check_structures(engine)
        print(f"PASS {engine}: sample, layout, document structures, package API, and invalid options")

    if os.environ.get("MBTS_TEST_BIBLATEX") == "1":
        check_citations(engines[0])


if __name__ == "__main__":
    main()
