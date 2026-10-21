import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDocx } from '../lib/docx.js';
import { lintDocument } from '../lib/rules.js';
import { fixtureParts, zipParts, W } from '../lib/demo.js';

const esc = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const run = (text, italic = false) => ({ text, italic });
const xmlRuns = runs => (typeof runs === 'string' ? [run(runs)] : runs).map(r => `<w:r>${r.italic ? '<w:rPr><w:i/></w:rPr>' : ''}<w:t xml:space="preserve">${esc(r.text)}</w:t></w:r>`).join('');
const paragraph = (runs, style) => `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${xmlRuns(runs)}</w:p>`;
const bookNote = (title = 'The Patient Ministry', author = 'Anne Aster', imprint = 'Example City: Fictional Press, 2024') =>
  [run(author + ', '), run(title, true), run(` (${imprint}), 24.`)];
const bookEntry = (title = 'The Patient Ministry', author = 'Aster, Anne', imprint = 'Example City: Fictional Press, 2024') =>
  [run(author + '. '), run(title, true), run(`. ${imprint}.`)];
const articleNote = (title = 'Listening Carefully', author = 'Anne Aster', detail = '12, no. 2 (2024): 24.') =>
  [run(`${author}, “${title},” `), run('Journal of Invented Studies', true), run(' ' + detail)];
const articleEntry = (title = 'Listening Carefully', author = 'Aster, Anne', detail = '12, no. 2 (2024): 20–30.') =>
  [run(`${author}. “${title}.” `), run('Journal of Invented Studies', true), run(' ' + detail)];
const short = (title = '', author = 'Aster', type = 'book') =>
  [run(author + ', '), ...(title ? [run(type === 'journal' ? `“${title},” ` : title + ', ', type === 'book')] : []), run('25.')];
function paper(notes, entries) {
  const parts = fixtureParts();
  const ids = notes.map((_, i) => String(90 - i * 3));
  let document = parts['word/document.xml'].replace(/<w:footnoteReference\b[^>]*\/>/g, '');
  const bib = document.indexOf('<w:p><w:pPr><w:pStyle w:val="BibliographyHeading"');
  const bibEnd = document.indexOf('</w:p>', bib) + 6;
  const refs = ids.map(id => `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="${id}"/></w:r>`).join('');
  document = document.slice(0, bib) + `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>${xmlRuns('An invented claim.')}${refs}</w:p>` +
    document.slice(bib, bibEnd) + entries.map(e => paragraph(e, 'Bibliography')).join('') + document.slice(document.indexOf('<w:sectPr>'));
  parts['word/document.xml'] = document;
  parts['word/footnotes.xml'] = `<w:footnotes xmlns:w="${W}">${notes.map((n, i) => `<w:footnote w:id="${ids[i]}"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr><w:r><w:footnoteRef/></w:r>${xmlRuns(' ')}${xmlRuns(n)}</w:p></w:footnote>`).reverse().join('')}</w:footnotes>`;
  return parts;
}
const lint = parts => lintDocument(parseDocx(zipParts(parts), 'sources.docx'));
const issues = (parts, rule) => lint(parts).findings.filter(f => f.ruleId === rule);
const citationIssues = parts => lint(parts).findings.filter(f => f.ruleId.startsWith('citation-') || f.ruleId === 'unverified-citation');

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
  const notes = [[...bookNote(), run('; '), ...short('Patient Ministry'), run('; '), ...articleNote('Listening; Carefully')]];
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
    'Anne Aster, “An Essay,” in Edited Studies, ed. Bennett Brew (Example City: Fictional Press, 2024), 24.',
    'Anne Aster, “An Invented Study” (PhD diss., Example University, 2024), 24.',
    'Anne Aster, “A Web Article,” Example Site, https://example.invalid/article.',
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
