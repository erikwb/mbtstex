import test from 'node:test';
import assert from 'node:assert/strict';
import { run, bookNote, bookEntry, articleNote, articleEntry, chapterNote, chapterEntry, webNote, webEntry, short, paper, lint, issues, citationIssues } from './fixtures/citation-documents.js';

test('ordinary books and journals match their bibliography and permit later short notes', () => {
  const parts = paper([bookNote(), articleNote(), short('Patient Ministry'), short('Listening Carefully', 'Aster', 'journal')], [bookEntry(), articleEntry()]);
  assert.deepEqual(citationIssues(parts), []);
  assert.ok(lint(parts).checks.find(c => c.id === 'citation-first-full').inspected >= 2);
});

test('a bibliography entry or a later full note does not replace the first full citation', () => {
  for (const notes of [[short()], [short(), bookNote()]]) {
    const parts = paper(notes, [bookEntry()]);
    assert.equal(issues(parts, 'citation-short').length, 0);
    assert.equal(issues(parts, 'citation-first-full').length, 1);
    assert.equal(issues(parts, 'citation-first-full')[0].severity, 'review');
  }
});

test('surname-only notes account for other works introduced later in the paper', () => {
  const parts = paper([bookNote(), short(), bookNote('After the Meeting')], [bookEntry(), bookEntry('After the Meeting')]);
  assert.equal(issues(parts, 'citation-short').length, 1);
  assert.match(issues(parts, 'citation-short')[0].observed, /2 different works/);
  const clear = paper([bookNote(), short('Patient Ministry'), bookNote('After the Meeting')], [bookEntry(), bookEntry('After the Meeting')]);
  assert.equal(issues(clear, 'citation-short').length, 0);
});

test('two different authors with the same surname need a distinguishing short title', () => {
  const notes = [bookNote(), bookNote('Another Study', 'Bella Aster'), short()];
  const entries = [bookEntry(), bookEntry('Another Study', 'Aster, Bella')];
  assert.equal(issues(paper(notes, entries), 'citation-short').length, 1);
  notes[2] = short('Another Study');
  assert.equal(issues(paper(notes, entries), 'citation-short').length, 0);
});

test('different editions do not collapse to one source or match the wrong bibliography year', () => {
  const later = 'Example City: Fictional Press, 2025';
  const parts = paper([bookNote(), bookNote('The Patient Ministry', 'Anne Aster', later), short('Patient Ministry')], [bookEntry(), bookEntry('The Patient Ministry', 'Aster, Anne', later)]);
  assert.equal(issues(parts, 'citation-short').length, 1);
  assert.equal(issues(parts, 'citation-bibliography').length, 0);
  assert.equal(issues(paper([bookNote()], [bookEntry('The Patient Ministry', 'Aster, Anne', later)]), 'citation-bibliography').length, 1);
});

test('missing and duplicate bibliography matches get review; unused consulted works are allowed', () => {
  assert.equal(issues(paper([bookNote()], []), 'citation-bibliography').length, 1);
  assert.equal(issues(paper([bookNote()], [bookEntry(), bookEntry()]), 'citation-bibliography').length, 1);
  assert.deepEqual(citationIssues(paper([bookNote()], [bookEntry(), bookEntry('Another Study', 'Brew, Bennett')])), []);
});

test('book publication fields are checked separately in notes and bibliography', () => {
  for (const [imprint, field] of [[': Fictional Press, 2024', 'publication city'], ['Example City: , 2024', 'publisher'], ['Example City: Fictional Press', 'publication year']]) {
    const parts = paper([bookNote('The Patient Ministry', 'Anne Aster', imprint)], [bookEntry('The Patient Ministry', 'Aster, Anne', imprint)]);
    const found = issues(parts, 'citation-fields');
    assert.equal(found.length, 2, imprint);
    assert.ok(found.every(f => f.observed.includes(field)), field);
  }
});

test('journal publication fields distinguish volume, date, and applicable pages', () => {
  for (const [detail, field] of [['(2024): 24.', 'journal volume'], ['12, no. 2 (): 24.', 'publication year'], ['12, no. 2 (2024).', 'page']]) {
    const parts = paper([articleNote('Listening Carefully', 'Anne Aster', detail)], [articleEntry('Listening Carefully', 'Aster, Anne', detail)]);
    const found = issues(parts, 'citation-fields');
    assert.equal(found.length, 2, detail);
    assert.ok(found.every(f => f.observed.includes(field)), field);
  }
});

test('online journal citations may be unpaginated and do not require fetching their URLs', () => {
  for (const detail of ['12, no. 2 (2024), https://example.invalid/article.', '12 (2024). JSTOR.']) {
    const parts = paper([articleNote('Listening Carefully', 'Anne Aster', detail)], [articleEntry('Listening Carefully', 'Aster, Anne', detail)]);
    assert.deepEqual(citationIssues(parts), [], detail);
  }
});

test('explicitly different journal issues do not match as one source', () => {
  const parts = paper([articleNote()], [articleEntry('Listening Carefully', 'Aster, Anne', '12, no. 3 (2024): 20–30.')]);
  assert.equal(issues(parts, 'citation-bibliography').length, 1);
  assert.equal(issues(parts, 'citation-fields').length, 0);
});

test('book-title formatting uses all title runs, including a mixed-format title', () => {
  const note = bookNote(); note[1].italic = false;
  const entry = bookEntry(); entry[1] = run('The Patient ', true); entry.splice(2, 0, run('Ministry'));
  assert.equal(issues(paper([note], [entry]), 'citation-titles').length, 2);
});

test('article titles need upright quotation marks, and journal titles need italics', () => {
  const note = articleNote(); note[0].italic = true; note[1].italic = false;
  const found = issues(paper([note], [articleEntry()]), 'citation-titles');
  assert.equal(found.length, 1);
  assert.match(found[0].observed, /article title should be upright/);
  assert.match(found[0].observed, /journal title should be italic/);
  const noQuotes = articleNote(); noQuotes[0].text = noQuotes[0].text.replaceAll('“', '').replaceAll('”', '');
  assert.match(issues(paper([noQuotes], [articleEntry()]), 'citation-titles')[0].observed, /quotation marks/);
});

test('short titles follow their resolved source type', () => {
  const wrongBook = short('Patient Ministry'); wrongBook[1].italic = false;
  const wrongArticle = short('Listening Carefully', 'Aster', 'journal'); wrongArticle[1].italic = true;
  assert.equal(issues(paper([bookNote(), wrongBook], [bookEntry()]), 'citation-titles').length, 1);
  assert.equal(issues(paper([articleNote(), wrongArticle], [articleEntry()]), 'citation-titles').length, 1);
});

test('inherited character-style italics count as title formatting', () => {
  const parts = paper([bookNote()], [bookEntry()]);
  for (const name of ['word/document.xml', 'word/footnotes.xml']) parts[name] = parts[name].replaceAll('<w:i/>', '<w:rStyle w:val="SourceTitle"/>');
  parts['word/styles.xml'] = parts['word/styles.xml'].replace('</w:styles>', '<w:style w:type="character" w:styleId="SourceTitle"><w:rPr><w:i/></w:rPr></w:style></w:styles>');
  assert.deepEqual(citationIssues(parts), []);
});

test('multiple sources in one note retain title boundaries and source order', () => {
  const first = bookNote(); first[2].text = first[2].text.replace(/\.$/, '');
  const shortened = short('Patient Ministry'); shortened.at(-1).text = shortened.at(-1).text.replace(/\.$/, '');
  const notes = [[...first, run('; '), ...shortened, run('; '), ...articleNote('Listening; Carefully')]];
  const parts = paper(notes, [bookEntry(), articleEntry('Listening; Carefully')]);
  assert.deepEqual(citationIssues(parts), []);
});

test('initialed and multi-author book names match across note and bibliography forms', () => {
  for (const [fn, bib] of [['A. B. Aster', 'Aster, A. B.'], ['Anne Aster and Bennett Brew', 'Aster, Anne, and Bennett Brew'], ['Anne Aster, Bennett Brew, and Clara Cedar', 'Aster, Anne, Bennett Brew, and Clara Cedar']]) {
    assert.deepEqual(citationIssues(paper([bookNote('The Patient Ministry', fn)], [bookEntry('The Patient Ministry', bib)])), [], fn);
  }
});

test('repeated-author bibliography notation resolves only through its immediate predecessor', () => {
  const repeated = bookEntry('Zebra Ministry'); repeated[0].text = '______. ';
  assert.deepEqual(citationIssues(paper([bookNote(), bookNote('Zebra Ministry')], [bookEntry(), repeated])), []);
  assert.equal(issues(paper([bookNote('Zebra Ministry')], [repeated]), 'unverified-citation').length, 1);
});

test('citation history follows body references, not numeric IDs or note XML order', () => {
  assert.deepEqual(citationIssues(paper([bookNote(), short()], [bookEntry()])), []);
});

test('ordinary prose notes and explanatory text after a book citation are not mistaken for new sources', () => {
  const full = [...bookNote(), run(' This example is fictional, and no source fact is asserted.')];
  const prose = 'However, This paragraph merely explains a point. It cites no source.';
  assert.deepEqual(citationIssues(paper([prose, full, short()], [bookEntry()])), []);
});

test('unsupported source types are disclosed without assuming bibliography inclusion or missing book fields', () => {
  for (const note of [
    'Anne Aster, “An Invented Study” (PhD diss., Example University, 2024), 24.',
    'Anne Aster, “A Web Article,” Example Blog (blog), https://example.invalid/article.',
  ]) {
    const parts = paper([note], []);
    assert.equal(issues(parts, 'unverified-citation').length, 1, note);
    assert.equal(issues(parts, 'citation-fields').length, 0, note);
    assert.equal(issues(parts, 'citation-bibliography').length, 0, note);
  }
});

test('Bible references and translation declarations do not require bibliography matches', () => {
  const declaration = 'Unless otherwise specified, all Bible references use the English Standard Version (ESV) (Wheaton, IL: Crossway, 2025).';
  assert.deepEqual(citationIssues(paper(['Rom 3:21–24.', declaration], [])), []);
});

test('a citation to a whole book need not invent a page locator', () => {
  const whole = bookNote(); whole[2].text = whole[2].text.replace(', 24.', '.');
  assert.deepEqual(citationIssues(paper([whole], [bookEntry()])), []);
});

test('publication cities containing periods do not become part of the book title', () => {
  const imprint = 'St. Louis: Fictional Press, 2024';
  assert.deepEqual(citationIssues(paper([bookNote('The Patient Ministry', 'Anne Aster', imprint)], [bookEntry('The Patient Ministry', 'Aster, Anne', imprint)])), []);
});

test('explicit edition numbers distinguish otherwise identical book entries', () => {
  const note = bookNote(); note[2].text = ', 2nd ed.' + note[2].text;
  const entry = bookEntry(); entry[2].text = '. 2nd ed.' + entry[2].text.slice(1);
  assert.deepEqual(citationIssues(paper([note], [entry])), []);
  entry[2].text = entry[2].text.replace('2nd', '3rd');
  assert.equal(issues(paper([note], [entry]), 'citation-bibliography').length, 1);
});

test('See and Cf. prefixes retain formatting offsets and source identities', () => {
  for (const prefix of ['See ', 'See also ', 'Cf. ']) {
    const note = bookNote(); note[0].text = prefix + note[0].text;
    assert.deepEqual(citationIssues(paper([note, short()], [bookEntry()])), []);
  }
});

test('unrecognized bibliography entries remain visible even when another source is matched', () => {
  const parts = paper([bookNote()], [bookEntry(), 'An unusual source whose form is not understood.']);
  assert.equal(issues(parts, 'unverified-citation').length, 1);
  assert.equal(issues(parts, 'citation-bibliography').length, 0);
});

test('edited-book chapters match full notes, short notes, and bibliography forms', () => {
  assert.deepEqual(citationIssues(paper([chapterNote(), short('Emergency Casserole', 'Aster', 'journal')], [chapterEntry()])), []);
});

test('chapter recognition preserves initials in editors and periods in publication cities', () => {
  const note = chapterNote(), entry = chapterEntry();
  note[2].text = note[2].text.replace('Bennett B. Brew', 'B. B. Brew and Clara Cedar');
  entry[2].text = entry[2].text.replace('Bennett B. Brew', 'B. B. Brew and Clara Cedar');
  assert.deepEqual(citationIssues(paper([note], [entry])), []);
});

test('chapter bibliography entries need the full chapter range and recognizable editor', () => {
  const entry = chapterEntry(); entry[2].text = entry[2].text.replace(', 20–30', '');
  assert.match(issues(paper([chapterNote()], [entry]), 'citation-fields')[0].observed, /chapter page range/);
  const note = chapterNote(); note[2].text = note[2].text.replace(', ed. Bennett B. Brew', '');
  assert.match(issues(paper([note], [chapterEntry()]), 'citation-fields')[0].observed, /editor name/);
});

test('chapter matching distinguishes containing books and editors', () => {
  for (const [from, to] of [['Care after Coffee', 'Care before Coffee'], ['Bennett B. Brew', 'Clara Cedar']]) {
    const entry = chapterEntry().map(r => ({ ...r, text: r.text.replace(from, to) }));
    assert.equal(issues(paper([chapterNote()], [entry]), 'citation-bibliography').length, 1);
  }
});

test('chapter titles stay upright and quoted while containing book titles are italic', () => {
  const note = chapterNote(); note[0].italic = true; note[1].italic = false;
  assert.equal(issues(paper([note], [chapterEntry()]), 'citation-titles').length, 1);
  const plain = chapterNote(); plain[0].text = plain[0].text.replace(/[“”]/g, '');
  assert.match(issues(paper([plain], [chapterEntry()]), 'citation-titles')[0].observed, /quotation marks/);
});

test('chapter note and bibliography use their own in/editor labels', () => {
  const note = chapterNote(); note[0].text = note[0].text.replace('in ', 'In '); note[2].text = note[2].text.replace('ed.', 'edited by');
  const entry = chapterEntry(); entry[2].text = entry[2].text.replace('edited by', 'ed.');
  assert.equal(issues(paper([note], [entry]), 'citation-syntax').length, 2);
});

test('a chapter occupying one page can have a single-page bibliography locator', () => {
  const entry = chapterEntry(); entry[2].text = entry[2].text.replace('20–30', '24');
  assert.deepEqual(citationIssues(paper([chapterNote()], [entry])), []);
});

test('web articles match their bibliography and support short titles without invented page numbers', () => {
  assert.deepEqual(citationIssues(paper([webNote(), 'Aster, “Committee of One.”'], [webEntry()])), []);
});

test('website bibliography inclusion remains a contextual review, not a missing-entry error', () => {
  const parts = paper([webNote()], []);
  assert.equal(issues(parts, 'citation-bibliography').length, 0);
  const found = issues(parts, 'citation-web-bibliography');
  assert.equal(found.length, 1); assert.equal(found[0].severity, 'review');
  assert.match(found[0].observed, /only if.*critical.*frequently/);
});

test('missing web publication dates are requested only if available', () => {
  const found = issues(paper([webNote('https://example.invalid/care', '')], []), 'citation-fields');
  assert.equal(found.length, 1); assert.match(found[0].observed, /date \(if available\)/);
  assert.doesNotMatch(found[0].observed, /city|publisher/);
});

test('anonymous and organization-named web pages do not require invented personal authors', () => {
  for (const label of ['', 'Cedar Council', 'Cedar.org']) {
    const note = webNote().replace('Anne Aster, ', label ? label + ', ' : '');
    const entry = webEntry().replace('Aster, Anne. ', label ? label + '. ' : '');
    assert.deepEqual(citationIssues(paper([note], [entry])), [], label);
  }
});

test('website names stay upright and sponsor repetition is not required', () => {
  const runs = [run('Anne Aster, “A Committee of One,” '), run('Cedar.org', true), run(', October 1, 2024, https://example.invalid/care.')];
  assert.match(issues(paper([runs], [webEntry()]), 'citation-titles')[0].observed, /website name should be upright/);
  assert.deepEqual(citationIssues(paper([webNote().replace('Cedar.org, ', 'Cedar.org, Example Foundation, ')], [webEntry().replace('Cedar.org. ', 'Cedar.org. Example Foundation. ')])), []);
});

test('web matching preserves URL path case and query values', () => {
  for (const url of ['https://example.invalid/Care', 'https://example.invalid/care?version=2']) {
    assert.equal(issues(paper([webNote()], [webEntry(url)]), 'citation-web-bibliography').length, 1);
  }
});

test('URL semicolons are not treated as separators between source citations', () => {
  const url = 'https://example.invalid/care;version=2?a=1;b=2';
  assert.deepEqual(citationIssues(paper([webNote(url)], [webEntry(url)])), []);
});

test('web citations without recognizable URLs stay explicitly unverified', () => {
  const note = webNote().replace('https://example.invalid/care.', '');
  assert.equal(issues(paper([note], []), 'unverified-citation').length, 1);
});

test('full-note and bibliography name order and author/title punctuation are reviewed', () => {
  const note = bookNote(); note[0].text = 'Aster, Anne, ';
  const entry = bookEntry(); entry[0].text = 'Anne Aster. ';
  assert.equal(issues(paper([note], [entry]), 'citation-syntax').length, 2);
  note[0].text = 'Anne Aster. '; entry[0].text = 'Aster, Anne, ';
  assert.equal(issues(paper([note], [entry]), 'citation-syntax').length, 2);
});

test('full article and chapter title punctuation belongs inside closing quotes', () => {
  for (const [makeNote, makeEntry] of [[articleNote, articleEntry], [chapterNote, chapterEntry]]) {
    const note = makeNote(); note[0].text = note[0].text.replace(',”', '”,');
    const entry = makeEntry(); entry[0].text = entry[0].text.replace('.”', '”.');
    assert.equal(issues(paper([note], [entry]), 'citation-syntax').length, 2);
  }
});

const fourAuthors = 'Anne Aster, Bennett Brew, Clara Cedar, and Daniel Dove';
const fourAuthorEntry = 'Aster, Anne, Bennett Brew, Clara Cedar, and Daniel Dove';
test('four-author books use et al. in notes and a complete bibliography author list', () => {
  assert.deepEqual(citationIssues(paper([bookNote('The Patient Ministry', 'Anne Aster et al.')], [bookEntry('The Patient Ministry', fourAuthorEntry)])), []);
  const parts = paper([bookNote('The Patient Ministry', fourAuthors)], [bookEntry('The Patient Ministry', 'Aster, Anne et al.')]);
  assert.equal(issues(parts, 'citation-authors').length, 2);
});

test('et al. does not silently stand for one, two, or three book authors', () => {
  for (const author of ['Aster, Anne', 'Aster, Anne, and Bennett Brew', 'Aster, Anne, Bennett Brew, and Clara Cedar']) {
    assert.equal(issues(paper([bookNote('The Patient Ministry', 'Anne Aster et al.')], [bookEntry('The Patient Ministry', author)]), 'citation-authors').length, 1);
  }
});

test('an unverifiable abbreviated author list remains a review item', () => {
  assert.match(issues(paper([bookNote('The Patient Ministry', 'Anne Aster et al.')], []), 'citation-authors')[0].observed, /No complete matching author list/);
});

test('et al punctuation is checked without preventing a recognized source match', () => {
  const parts = paper([bookNote('The Patient Ministry', 'Anne Aster et al')], [bookEntry('The Patient Ministry', fourAuthorEntry)]);
  assert.match(issues(parts, 'citation-syntax')[0].observed, /et al/);
  assert.equal(issues(parts, 'citation-bibliography').length, 0);
});

test('page locators accept abbreviated ranges, roman pages, and volume-page references', () => {
  for (const locator of ['311–12', '100-104', 'xiv', 'xiv–xvi', '2:24–27']) {
    const note = bookNote(); note[2].text = note[2].text.replace('24.', locator + '.');
    assert.deepEqual(citationIssues(paper([note], [bookEntry()])), [], locator);
  }
});

test('backwards ranges and p/pp prefixes are reviewed in source notes', () => {
  for (const locator of ['30–20', '211–09', 'pp. 24–25', 'p. 24']) {
    const note = bookNote(); note[2].text = note[2].text.replace('24.', locator + '.');
    assert.equal(issues(paper([note], [bookEntry()]), 'citation-locators').length, 1, locator);
  }
});

test('book and journal page delimiters follow the source form', () => {
  const note = bookNote(); note[2].text = note[2].text.replace('), 24', '): 24');
  assert.equal(issues(paper([note], [bookEntry()]), 'citation-locators').length, 1);
  const article = articleNote(); article[2].text = article[2].text.replace('): 24', '), 24');
  assert.equal(issues(paper([article], [articleEntry()]), 'citation-locators').length, 1);
});

test('missing semicolons between two independently recognized sources are reviewed', () => {
  for (const separator of [' ', ', ', ' and ']) {
    const note = bookNote();
    if (separator.startsWith(',')) note[2].text = note[2].text.replace(/\.$/, '');
    const parts = paper([[...note, run(separator), ...articleNote()]], [bookEntry(), articleEntry()]);
    assert.equal(issues(parts, 'citation-separators').length, 1, separator);
  }
});

test('valid multiple-source notes accept an and prefix after the final semicolon', () => {
  const first = bookNote(); first[2].text = first[2].text.replace(/\.$/, '');
  const parts = paper([[...first, run('; and '), ...chapterNote()]], [bookEntry(), chapterEntry()]);
  assert.deepEqual(citationIssues(parts), []);
});

test('ordinary commentary and commas within titles do not trigger source separator advice', () => {
  const parts = paper([[...bookNote('Listen, Then Listen Again'), run(' This is an explanation, and it is not another source.')]], [bookEntry('Listen, Then Listen Again')]);
  assert.equal(issues(parts, 'citation-separators').length, 0);
});

test('paginated online journal citations retain pages before their URL or database', () => {
  for (const medium of ['https://example.invalid/journal', 'JSTOR']) {
    assert.deepEqual(citationIssues(paper([articleNote('Listening Carefully', 'Anne Aster', `12 (2024): 24, ${medium}.`)],
      [articleEntry('Listening Carefully', 'Aster, Anne', `12 (2024): 20–30. ${medium}.`)])), []);
  }
});

test('unusual locator labels are reviewed rather than partially read as roman page numbers', () => {
  const note = bookNote(); note[2].text = note[2].text.replace('24.', 'chap. 3.');
  assert.equal(issues(paper([note], [bookEntry()]), 'citation-locators').length, 1);
});

test('a source locator does not need a period immediately before its separating semicolon', () => {
  const parts = paper([[...bookNote(), run('; '), ...chapterNote()]], [bookEntry(), chapterEntry()]);
  assert.match(issues(parts, 'citation-separators')[0].observed, /semicolon alone/);
});
