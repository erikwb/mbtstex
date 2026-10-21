import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bookCreditParts } from './fixtures/book-credits.js';
import { zipParts } from '../lib/demo.js';
import { parseDocx } from '../lib/docx.js';
import { lintDocument } from '../lib/rules.js';
import { run, bookNote, bookEntry, short, paper, issues, citationIssues } from './fixtures/citation-documents.js';

const creditedNote = (label = 'trans.', name = 'Bennett B. Brew', title = 'The Patient Ministry') => {
  const note = bookNote(title); note[2].text = `, ${label} ${name}` + note[2].text; return note;
};
const creditedEntry = (label = 'Translated by', name = 'Bennett B. Brew', title = 'The Patient Ministry') => {
  const entry = bookEntry(title); entry[2].text = `. ${label} ${name}.` + entry[2].text.slice(1); return entry;
};
const editedNote = (names = 'Anne Aster', label = 'ed.') => {
  const note = bookNote(); note[0].text = `${names}, ${label}, `; return note;
};
const editedEntry = (names = 'Aster, Anne', label = 'ed.') => {
  const entry = bookEntry(); entry[0].text = `${names}, ${label} `; return entry;
};

test('authored translated books match full notes, short notes, and bibliography entries', () => {
  assert.deepEqual(citationIssues(paper([creditedNote(), short('Patient Ministry')], [creditedEntry()])), []);
});

test('authored books with one or multiple editors use post-title editor credits', () => {
  for (const name of ['Bennett Brew', 'Bennett Brew and Clara Cedar']) {
    assert.deepEqual(citationIssues(paper([creditedNote('ed.', name), short()], [creditedEntry('Edited by', name)])), []);
  }
});

test('standalone edited books use the editor as their primary name for short citations', () => {
  for (const [fn, bib, label] of [['Anne Aster', 'Aster, Anne', 'ed.'], ['Anne Aster and Bennett Brew', 'Aster, Anne, and Bennett Brew', 'eds.']]) {
    assert.deepEqual(citationIssues(paper([editedNote(fn, label), short('Patient Ministry')], [editedEntry(bib, label)])), []);
  }
});

test('editor-led books can be recognized even when their titles lack italics', () => {
  const note = editedNote(), entry = editedEntry(); note[1].italic = entry[1].italic = false;
  const parts = paper([note], [entry]);
  assert.equal(issues(parts, 'unverified-citation').length, 0);
  assert.equal(issues(parts, 'citation-titles').length, 2);
});

test('contributor initials and cities with periods retain the correct boundary', () => {
  for (const name of ['B. B. Brew', 'B.B. Brew', 'Renée O’Reed', 'Clara St. John']) {
    const note = creditedNote('trans.', name), entry = creditedEntry('Translated by', name);
    note[2].text = note[2].text.replace('Example City', 'St. Louis');
    entry[2].text = entry[2].text.replace('Example City', 'St. Louis');
    assert.deepEqual(citationIssues(paper([note], [entry])), [], name);
  }
});

test('separate editor and translator clauses retain both identities', () => {
  const note = creditedNote('ed.', 'Clara Cedar'); note[2].text = note[2].text.replace(' (', ', trans. Bennett Brew (');
  const entry = creditedEntry('Edited by', 'Clara Cedar'); entry[2].text = entry[2].text.replace(' Example City', ' Translated by Bennett Brew. Example City');
  assert.deepEqual(citationIssues(paper([note, short()], [entry])), []);
});

test('leading editor labels distinguish singular from plural', () => {
  for (const [fn, bib, label] of [['Anne Aster', 'Aster, Anne', 'eds.'], ['Anne Aster and Bennett Brew', 'Aster, Anne, and Bennett Brew', 'ed.']]) {
    const parts = paper([editedNote(fn, label)], [editedEntry(bib, label)]);
    assert.equal(issues(parts, 'citation-syntax').length, 2);
    assert.equal(issues(parts, 'citation-authors').length, 0);
  }
});

test('editor labels keep the appropriate note and bibliography punctuation', () => {
  const note = editedNote(); note[0].text = 'Anne Aster, ed. ';
  const entry = editedEntry(); entry[0].text = 'Aster, Anne, ed., ';
  assert.equal(issues(paper([note], [entry]), 'citation-syntax').length, 2);
});

test('editor-led sources still check personal-name order', () => {
  assert.equal(issues(paper([editedNote('Aster, Anne')], [editedEntry('Anne Aster')]), 'citation-syntax').length, 2);
});

test('post-title role labels differ from standalone editor labels', () => {
  for (const [label, bibLabel] of [['eds.', 'ed.'], ['Translated by', 'trans.']]) {
    assert.equal(issues(paper([creditedNote(label)], [creditedEntry(bibLabel)]), 'citation-syntax').length, 2);
  }
});

test('an explicit contributor label with no name gets a missing-field review', () => {
  for (const [label, bibLabel, role] of [['trans.', 'Translated by', 'translator'], ['ed.', 'Edited by', 'editor']]) {
    const found = issues(paper([creditedNote(label, '')], [creditedEntry(bibLabel, '')]), 'citation-fields');
    assert.equal(found.length, 2);
    assert.ok(found.every(f => f.observed.includes(role + ' name(s)')));
  }
});

test('contributor names and labels remain upright outside the italic book title', () => {
  const note = creditedNote(); note[2].italic = true;
  const entry = creditedEntry(); entry[2].italic = true;
  const found = issues(paper([note], [entry]), 'citation-titles');
  assert.equal(found.length, 2);
  assert.ok(found.every(f => f.observed.includes('translator credit should be upright')));
  const edited = editedNote(); edited[0].italic = true;
  assert.equal(issues(paper([edited], [editedEntry()]), 'citation-titles').length, 1);
});

test('publication fields are still checked after contributor clauses', () => {
  const note = creditedNote(), entry = creditedEntry();
  note[2].text = note[2].text.replace(', 2024', ''); entry[2].text = entry[2].text.replace(', 2024', '');
  const found = issues(paper([note], [entry]), 'citation-fields');
  assert.equal(found.length, 2); assert.ok(found.every(f => f.observed.includes('publication year')));
});

test('different translators distinguish editions even with the same author, title, and year', () => {
  const parts = paper([creditedNote(), creditedNote('trans.', 'Clara Cedar'), short('Patient Ministry')], [creditedEntry(), creditedEntry('Translated by', 'Clara Cedar')]);
  assert.equal(issues(parts, 'citation-bibliography').length, 0);
  assert.equal(issues(parts, 'citation-short').length, 1);
  assert.equal(issues(paper([creditedNote()], [creditedEntry('Translated by', 'Clara Cedar')]), 'citation-bibliography').length, 1);
});

test('a missing editor or translator credit does not silently match a credited edition', () => {
  for (const [note, entry] of [[creditedNote(), bookEntry()], [bookNote(), creditedEntry()], [creditedNote('ed.'), bookEntry()]]) {
    assert.equal(issues(paper([note], [entry]), 'citation-bibliography').length, 1);
  }
});

test('the same name acting as an author versus editor is a role mismatch', () => {
  assert.equal(issues(paper([editedNote()], [bookEntry()]), 'citation-bibliography').length, 1);
  assert.equal(issues(paper([bookNote()], [editedEntry()]), 'citation-bibliography').length, 1);
});

test('editor and translator credits are not interchangeable for source matching', () => {
  assert.equal(issues(paper([creditedNote('ed.')], [creditedEntry('Translated by')]), 'citation-bibliography').length, 1);
});

test('a translator’s surname does not become the author of a short note', () => {
  const parts = paper([creditedNote(), short('Patient Ministry', 'Brew')], [creditedEntry()]);
  assert.equal(issues(parts, 'citation-short').length, 1);
  assert.equal(issues(parts, 'citation-first-full').length, 1);
});

test('simple numbered and revised editions coexist with contributor clauses', () => {
  for (const [noteEdition, entryEdition] of [['2nd ed.', '2nd ed.'], ['rev. ed.', 'Rev. ed.']]) {
    for (const before of [false, true]) {
      const note = creditedNote(), entry = creditedEntry();
      note[2].text = before ? `, ${noteEdition}` + note[2].text : note[2].text.replace(' (', `, ${noteEdition} (`);
      entry[2].text = before ? `. ${entryEdition}` + entry[2].text.slice(1) : entry[2].text.replace(' Example City', ` ${entryEdition} Example City`);
      assert.deepEqual(citationIssues(paper([note], [entry])), [], `${noteEdition}: ${before}`);
    }
  }
});

test('edition and year mismatches remain visible for translated books', () => {
  const note = creditedNote(), entry = creditedEntry();
  note[2].text = ', 2nd ed.' + note[2].text;
  entry[2].text = '. 3rd ed.' + entry[2].text.slice(1);
  assert.equal(issues(paper([note], [entry]), 'citation-bibliography').length, 1);
  assert.equal(issues(paper([creditedNote()], [creditedEntry().map(r => ({ ...r, text: r.text.replace('2024', '2025') }))]), 'citation-bibliography').length, 1);
});

test('See prefixes and multiple sources preserve contributor formatting offsets', () => {
  const note = creditedNote(); note[0].text = 'See ' + note[0].text;
  note[2].text = note[2].text.replace(/\.$/, '');
  assert.deepEqual(citationIssues(paper([[...note, run('; '), ...editedNote()]], [creditedEntry(), editedEntry()])), []);
});

test('combined role labels, reprints, and unsupported names stay explicitly unverified', () => {
  for (const text of ['ed. and trans. Bennett Brew', 'translated by Erasmus', 'trans. Bennett Brew, repr.']) {
    const note = bookNote(); note[2].text = ', ' + text + note[2].text;
    const parts = paper([note, [run('Ibid.')]], []);
    assert.equal(issues(parts, 'unverified-citation').length, 1, text);
    assert.equal(issues(parts, 'ibid-source').length, 1, text);
  }
});

test('short citations still require an earlier full note for credited books', () => {
  assert.equal(issues(paper([short()], [creditedEntry()]), 'citation-first-full').length, 1);
});

test('Ibid. follows credited and editor-led books through full and short notes', () => {
  for (const [note, entry] of [[creditedNote(), creditedEntry()],
    [editedNote('Anne Aster and Bennett Brew', 'eds.'), editedEntry('Aster, Anne, and Bennett Brew', 'eds.')]]) {
    const parts = paper([note, [run('Ibid., 21.')], short('Patient Ministry'), [run('Ibid.')], [run('Ibid., 23.')]], [entry]);
    assert.deepEqual(issues(parts, 'ibid-source'), []);
    assert.deepEqual(issues(parts, 'ibid-form'), []);
  }
});

test('Ibid. does not resolve an ambiguous short citation across translations', () => {
  const parts = paper([creditedNote(), creditedNote('trans.', 'Clara Cedar'), short(), [run('Ibid.')]],
    [creditedEntry(), creditedEntry('Translated by', 'Clara Cedar')]);
  assert.equal(issues(parts, 'ibid-source').length, 1);
});

test('commentary, multiple sources, and incomplete credits still block Ibid.', () => {
  const commentary = creditedNote(); commentary[2].text += ' The translator deserves more coffee.';
  const first = creditedNote(); first[2].text = first[2].text.replace(/\.$/, '');
  for (const note of [commentary, [...first, run('; '), ...editedNote()], creditedNote('trans.', '')]) {
    const parts = paper([note, [run('Ibid.')]], [creditedEntry(), editedEntry()]);
    assert.equal(issues(parts, 'ibid-source').length, 1);
  }
});

test('translated and edited books remain clean after a word-processor save', async () => {
  const saved = await readFile(new URL('./fixtures/libreoffice-book-credits.docx', import.meta.url));
  for (const bytes of [zipParts(bookCreditParts()), saved]) {
    const report = lintDocument(parseDocx(bytes, 'book-credits.docx'));
    assert.deepEqual(report.findings, []);
    assert.equal(report.stats.rulesAvailable, 60);
    for (const id of ['citation-fields', 'citation-syntax', 'citation-titles', 'citation-bibliography']) {
      assert.ok(report.checks.some(c => c.id === id && c.inspected > 0), id);
    }
  }
});
