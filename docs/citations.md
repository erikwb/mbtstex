# Citation data guide

Load `biblatex` with `style=mbts,backend=biber`, and compile LaTeX → Biber →
LaTeX → LaTeX. Examples below are invented. The complete working database is
[`examples/citations.bib`](../examples/citations.bib); render its gallery with
`make citations`. Page numbers refer to the fourth-edition manual.

## Common fields and commands

Enter names as `Family, Given and Family, Given`; enclose an institutional author
in an extra pair of braces, e.g. `author={{Example Committee}}`. Use `title` and
optional `subtitle`, preserving proper-name capitals with braces as necessary.
Use `location` for the publication city, `publisher`, and `date` (`2020`,
`2020-10`, or `2020-10-02`). `mbtsdate` supplies a literal date for seasons,
conference ranges, release wording or the manual's day-month-year magazine form.
Keep a numeric `date` as well when available for sorting.

`pages` is the entire article/chapter/review range for the bibliography.
**The optional argument of `\autocite[12]{key}` is the particular locator.**
It has no automatic `p.` prefix. Page spans can use TeX `--`. Ancient locators
can be `2.3.4`; a whole multi-volume work uses e.g. `2:257`.

`shorttitle` controls the title in subsequent notes. Supply a useful short title
for interviews, chapel sermons and other untitled material when more than one
item by the same person needs distinguishing. `mbtsaccess` is the ebook reader,
database or Bible-software name. Put the URL in `url`, without `\url{...}`.
The access information follows the locator, never precedes it.

```bibtex
@book{example,
  author = {Example, Anne},
  title = {An Invented Book},
  subtitle = {A Demonstration},
  shorttitle = {Invented Book},
  location = {Example City},
  publisher = {Example Press},
  date = {2020},
  mbtsaccess = {Kindle}
}
```

```latex
First use.\autocite[12]{example}
Consecutive use.\autocite[12]{example} % Ibid., only when appropriate
Several sources.\autocites[12]{example}[5]{another}
A substantive note.\footnote{Compare \cite[12]{example}; \cite[5]{another}.}
\mbtsprintbibliography
```

The style always keeps a short title when one is available. This is a permitted
short form and disambiguates multiple works by one author. It does not guess
when different records represent the same edition; use a consistent citation key.
Do not put manual `Ibid.` in your source: page breaks can invalidate it.

## Template mapping

| Manual template | Entry type / fields in addition to common fields |
| --- | --- |
| One, two, three, four-plus authors, pp.43–44 | `@book`; names separated by `and`. Four-plus notes become first author et al.; bibliography lists everyone. |
| Edition/revised edition, pp.44–45 | `@book`, `edition={2}` or `edition={rev. ed.}`. |
| Reprint, p.45 | `@book`, `origdate={1850}`, current edition's `date`. |
| Editor instead of author, pp.45–46 | `@book`, omit `author`, supply `editor` (one or many names). |
| Author with editor/translator, p.46 | `@book`, `author` plus `editor` and/or `translator`. |
| One volume with a title, p.47 | `@book`, `maintitle`, optional `mainsubtitle`, `volume`, and volume's `title`. |
| One numbered volume, p.47 | `@book`, `title`, `volume`; supply page-only postnote, e.g. `[257]`. |
| Whole multivolume work, pp.47–48 | `@mvbook`, `volumes`; no fixed `volume`; supply volume-and-page postnote, e.g. `[2:257]`. Notes cite the particular volume; bibliography gives total volumes. |
| Book series, p.48 | `@book`, `series`, optional series `number`. |
| Ebook reader/database/online, pp.48–49 | `@book`, `mbtsaccess={Kindle}` / database name, or `url`. |
| Chapter, essay, anthology selection, pp.49–50 | `@incollection`, chapter `author`/`title`, `booktitle`, optional `booksubtitle`, `editor`, `pages`. |
| Preface/foreword/introduction by another author, p.51 | `@inbook`, `entrysubtype={preface}`, `{foreword}` or `{introduction}`, contributor `author`, `bookauthor`, `booktitle`, `pages`; set `shorttitle` appropriately. |
| Commentary by author, p.51 | `@book`, commentary title, `author`, `series`, optional series `number`. |
| Editor's whole multivolume commentary, pp.51–52 | `@book`, `entrysubtype={commentary}`, `editor`, `volumes`; the total is also printed in its full note, as the specific template shows. |
| Print journal, p.52 | `@article`, `journaltitle`, `volume`, `number`, `date`/`mbtsdate`, `pages`. |
| Online/database journal, pp.52–53 | Same plus `url` or `mbtsaccess`. |
| Article in edited volume, p.53 | `@incollection`, as for a chapter. Pages precede publication information in bibliography. |
| Festschrift, p.54 | `@incollection`, `entrysubtype={festschrift}`; uses the specific sentence break before “Edited by.” |
| Concordance, p.54 | `@book`, `mbtsword` for the entry being cited. Normally omit a page postnote because the locator is s.v. |
| Signed dictionary/lexicon article, p.55 | `@inreference`, article `author`/`title`, dictionary `booktitle`, `volume`, `pages`. Postnote is page-only. |
| Unsigned dictionary/lexicon article, p.55 | `@reference`, dictionary `title`, `date`, `edition`, `editor`, publisher/city and `mbtsword`; its full note deliberately gives title/year/s.v. only. |
| Journal book review, p.56 | `@review`, reviewer `author`, `reviewtitle`, `reviewauthor`, `journaltitle`, `volume`, `number`, `date`, `pages`. |
| Magazine/newspaper review, p.56 | `@review`, `entrysubtype={magazine}`, review article `title`, reviewed book `reviewtitle`/`reviewauthor`, `journaltitle`, `mbtsdate={12 January 2020}`, `pages`. |
| Dissertation, p.57 | `@thesis`, `type={PhD diss.}` / `{DMin diss.}` / `{DEdMin diss.}` / `{DCoun diss.}`, `institution`, `date`. |
| Lecture notes, p.58 | `@mbtscourse`, `entrysubtype={lecture}`, professor `author`, `mbtscourse={HT 1234 Course Name}`, `institution`, `date`/`mbtsdate`. |
| Class discussion/unsigned course notes, p.58 | `@mbtscourse`, `entrysubtype={classnotes}`, `title={Class notes}`, `mbtsprogram`, `mbtscourse`, `institution`, date; no author. |
| Syllabus, pp.58–59 | `@mbtscourse`, `entrysubtype={syllabus}`, professor `author`, `mbtscourse`, `institution`, date; page postnote as needed. |
| Class paper, p.59 | `@mbtscourse`, `entrysubtype={paper}`, student `author`, paper `title`, `mbtscourse`, `institution`, date. |
| Chapel sermon, p.59 | `@mbtslecture`, `entrysubtype={chapel}`, preacher `author`, `institution`, `location`, date. |
| Conference address, p.60 | `@mbtslecture`, speaker `author`, `title`, `type={plenary address}`, `eventtitle`, `venue`, date; optional `url`. |
| Personal interview, p.60 | `@mbtsinterview`, interviewee `author`, `mbtsrole`, `location`, date. The interviewer is the paper's author. |
| Podcast, pp.60–61 | `@mbtspodcast`, host `author`, episode `title`, program `booktitle`, source `organization`, date, `url`. |
| Live classical music/song, p.61 | `@mbtsperformance`, `entrysubtype={classical}` or `{song}`, performer `author`, `mbtsrole`, work `title`, `composer`, `venue`, `location`, date. Notes only. |
| Music video, pp.61–62 | `@mbtsvideo`, artist/group `author`, `title`, `director`, `url`. |
| Score, p.62 | `@music`, composer as `author`; other fields as a book. |
| Website content, pp.62–63 | `@online`, `entrysubtype={website}`, article `author`/`title`, website `booktitle`, distinct sponsor `organization`, date, `url`. |
| Blog, p.63 | `@online`, `entrysubtype={blog}`, post `author`/`title`, blog `booktitle`, sponsoring site `organization`, date, `url`. “(blog)” is added automatically. |
| Social media, p.63 | `@online`, `entrysubtype={social}`, `author`, `mbtshandle={@example}`, opening phrase as `title`, platform `booktitle`, date, `url`. |
| Online database, p.64 | `@online`, `entrysubtype={database}`, `editor`, item `title`, database `booktitle`, date/`mbtsdate`, `url`. |
| Bible software for non-Bible material, p.64 | Use the source's ordinary type; add `mbtsaccess={Logos Bible Software}` (or the actual application). |
| Convention resolution/report/recommendation, p.65 | `@mbtsresolution`, person or committee `author`, `title`, `eventtitle`, `mbtssession={162nd}`, `mbtsmeetingyear={174th}`, `mbtsdate`, optional `mbtsitem`, annual/bulletin `booktitle`. Put “Recommendation 4:” in the title when applicable. Notes only. |
| Authored manuscript item, p.66 | `@mbtsmanuscript`, `author`, item description `title`, date, `mbtsfile`, `mbtscollection`, `mbtsarchive`, optional `url`. |
| Anonymous/group manuscript item, pp.66–67 | Same, omit `author`; put the group in `organization`. Description precedes group and date. |
| Manuscript collection as a whole, pp.66–67 | `@mbtsmanuscript`, collection creator `author` (corporate names double-braced), `title={Papers}`, `mbtsarchive`. Use `\nocite{collection-key}` if only item records were cited. |
| Ancient/classical theological work, pp.67–68 | `@mbtsclassical`, canonical `author`/`title`, edition `editor`, `translator`, `volumes`, series/publication fields. Postnote gives stable book.chapter.section. Notes omit modern publication details; bibliography includes the edition used. |

`@collection` and `@mvcollection` also use the book driver. For other source types
not listed in the manual, adapt a documented type where appropriate or enter a
manual note and bibliography entry after consulting Turabian/instructor guidance.
The project does not claim that every entry type accepted by biblatex's base
library is an MBTS template. `@misc` explicitly errors to avoid a silent guess.

## Bibliography inclusion and manuscript collections

`\mbtsprintbibliography` applies the `mbts` filter:

- `@mbtsperformance` and `@mbtsresolution` are always excluded.
- Website, blog, social and podcast entries appear only with
  `keywords={include-bibliography}`. Database entries are not subject to that
  condition. The author decides whether a source is critical/frequently used.
- `keywords={notes-only}` excludes an item, for example when its manuscript
  collection is represented by a separate bibliography record.

The manual permits a frequently used manuscript item to appear individually.
When citing many items, add a collection record with `\nocite` and mark the items
`notes-only`. The software cannot infer whether separate descriptions belong to
one archival collection.

To produce an annotated bibliography from a database, use `\fullcite{key}` as
the first argument to `\mbtsannotation{...}{...}`. Supply entries in alphabetical
order. `\fullcite` renders bibliography wording; use `\autocite` for a note.

Do not include a trailing period in title/URL/name fields unless it belongs to
that value. `type={PhD diss.}` and `edition={rev. ed.}` are deliberate exceptions.
For special date prose, use `mbtsdate`; its first letter is capitalized in bibliography form. If the
website name already identifies the sponsor, omit `organization` to avoid
printing it twice.
