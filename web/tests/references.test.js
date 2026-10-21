import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDocx } from '../lib/docx.js';
import { lintDocument, reportText } from '../lib/rules.js';
import { BIBLE_BOOKS, SCRIPTURE_CITATION } from '../lib/scripture.js';
import { fixtureParts, zipParts, W } from '../lib/demo.js';

const parse = parts => parseDocx(zipParts(parts), 'references.docx');
const lint = parts => lintDocument(parse(parts));
const findings = (parts, id) => lint(parts).findings.filter(f => f.ruleId === id);
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const run = (text, properties = '') => `<w:r>${properties ? `<w:rPr>${properties}</w:rPr>` : ''}<w:t xml:space="preserve">${escape(text)}</w:t></w:r>`;
const paragraph = (runs, style = 'Normal') => `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${runs}</w:p>`;
const ref = id => `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="${id}"/></w:r>`;
function body(parts, text, props = '') {
  // The ordinary paragraph must precede the bibliography region.
  const inserted = paragraph(run(text, props));
  parts['word/document.xml'] = parts['word/document.xml'].replace('<w:p><w:pPr><w:pStyle w:val="BibliographyHeading"', inserted + '<w:p><w:pPr><w:pStyle w:val="BibliographyHeading"');
}
function notes(texts, ids = texts.map((_, i) => String(i + 10))) {
  const parts = fixtureParts();
  // Replace all original references and notes; deliberately store the note XML
  // in reverse order so tests exercise body-reference order, not package order.
  parts['word/document.xml'] = parts['word/document.xml'].replace(/<w:footnoteReference\b[^>]*\/>/g, '');
  parts['word/document.xml'] = parts['word/document.xml'].replace('<w:sectPr>', paragraph(texts.map((_, i) => run('An invented claim.') + ref(ids[i])).join('')) + '<w:sectPr>');
  parts['word/footnotes.xml'] = `<w:footnotes xmlns:w="${W}">${texts.map((text, i) =>
    `<w:footnote w:id="${ids[i]}">${paragraph('<w:r><w:footnoteRef/></w:r>' + run(' ' + text), 'FootnoteText')}</w:footnote>`).reverse().join('')}</w:footnotes>`;
  return parts;
}
const book = 'Anne Aster, The Patient Ministry (Example City: Fictional Press, 2024), 24.';
const otherBook = 'Anne Aster, After the Meeting (Example City: Fictional Press, 2025), 12.';

test('canonical website reference names remain compatible with the LaTeX module', () => {
  const tex = readFileSync(new URL('../../mbts-bible.sty', import.meta.url), 'utf8');
  for (const [, name, abbreviation] of tex.matchAll(/\\mbtsdeclarebiblebook\{([^}]+)\}\{([^}]+)\}/g)) {
    assert.ok(BIBLE_BOOKS.some(b => b.names.includes(name) && b.abbreviations.includes(abbreviation)), name);
    assert.ok(SCRIPTURE_CITATION.test(`${name} 1:2`), name);
    assert.ok(SCRIPTURE_CITATION.test(`${abbreviation} 1:2`), abbreviation);
  }
  assert.equal(SCRIPTURE_CITATION.test('James 2025'), false);
  assert.equal(SCRIPTURE_CITATION.test('NotJohn 3:16'), false);
});

test('full book names and recommended abbreviations can coexist in prose', () => {
  const parts = fixtureParts();
  body(parts, 'Romans 3:21 introduces the passage; compare Rom 3:21–24, 27–31; 4:1–5; Col 2:11–12.');
  assert.equal(findings(parts, 'scripture-abbreviation').length, 0);
  assert.equal(findings(parts, 'scripture-separators').length, 0);
});

test('non-SBL abbreviations and periods are review items with instructor preference disclosed', () => {
  for (const text of ['Rom. 3:21', 'Rm 3:21', 'Mt 5:3', '1 Thes. 5:17', '1 John. 1:4']) {
    const parts = fixtureParts(); body(parts, `Compare ${text} for context.`);
    const found = findings(parts, 'scripture-abbreviation');
    assert.equal(found.length, 1, text);
    assert.equal(found[0].severity, 'review');
    assert.match(found[0].observed, /Instructor preferences/);
  }
});

test('Scripture separators distinguish same-chapter verses from new chapters and books', () => {
  for (const [reference, bad] of [
    ['Rom 3:21, 4:1–5, Col 2:11', true], ['Rom 3:21; 3:27', true],
    ['Rom 3:21, Col 3:21', true], ['Rom 3:21–4:2, 4:5', false],
    ['Rom 3:21; 4', false], ['Rom 3; 4', false], ['Phlm 4, 6', false],
    ['Jude 5; 7', true], ['2 John 4, 6', false], ['Ps 23; Pss 24–25', false],
  ]) {
    const parts = fixtureParts(); body(parts, `Compare (${reference}).`);
    assert.equal(findings(parts, 'scripture-separators').length, bad ? 1 : 0, reference);
  }
});

test('references inside quotations and italicized note titles are not restyled', () => {
  const parts = notes(['Anne Aster, A Source (Example City: Fictional Press, 2024), 12.']);
  parts['word/footnotes.xml'] = parts['word/footnotes.xml'].replace(run(' Anne Aster, A Source (Example City: Fictional Press, 2024), 12.'),
    run(' Anne Aster, ') + run('Rom. 3:21, 4:2', '<w:i/>') + run(' (Example City: Fictional Press, 2024), 12.'));
  body(parts, 'The author writes, “Compare Rom. 3:21, 4:2.” We preserve that wording.');
  assert.equal(findings(parts, 'scripture-abbreviation').length, 0);
  assert.equal(findings(parts, 'scripture-separators').length, 0);
});

test('prose numbers following a Bible reference are not assumed to be additional chapters', () => {
  const parts = fixtureParts();
  body(parts, 'We returned to Psalm 23, 20 years later. This is an invented example.');
  assert.equal(findings(parts, 'scripture-separators').length, 0);
});

test('block-quote reference checks use only the terminal parenthetical', () => {
  const parts = fixtureParts();
  parts['word/document.xml'] = parts['word/document.xml'].replace('I arrived with three suggestions', 'Rom. 3:21, 4:2 is mentioned. I arrived with three suggestions')
    .replace('This quotation and its speaker are fictional.', 'This quotation and its speaker are fictional. (Rom. 3:21, 4:2).');
  assert.equal(findings(parts, 'scripture-abbreviation').length, 1);
  assert.equal(findings(parts, 'scripture-separators').length, 1);
});

test('Bible bibliography review distinguishes editions from secondary scholarship', () => {
  for (const [title, expected] of [
    ['The Holy Bible: English Standard Version', 1], ['New International Version', 1],
    ['English Standard Version', 1], ['The Message', 1],
    ['The Bible: An Introduction', 0], ['A Dictionary of the Bible', 0],
    ['The Holy Bible: A Commentary', 0], ['The Message of Romans', 0],
  ]) {
    const parts = fixtureParts();
    parts['word/document.xml'] = parts['word/document.xml'].replace('The Patient Ministry', title);
    assert.equal(findings(parts, 'bible-bibliography').length, expected, title);
  }
  const parts = fixtureParts();
  parts['word/document.xml'] = parts['word/document.xml'].replace(run('Aster, Anne. ') + run('The Patient Ministry', '<w:i/>') + run('. Example City: Fictional Press, 2024.'),
    run('Example Publishing. ') + run('English Standard Version', '<w:i/>') + run('. Example City: Fictional Press, 2024.'));
  assert.equal(findings(parts, 'bible-bibliography').length, 1);
});

test('Ibid. forms accept ordinary locators and preserve the period before the comma', () => {
  for (const text of ['Ibid.', 'Ibid., 25.', 'Ibid., iv.', 'Ibid., 2:25–26.', 'Ibid., 25, 31–32.', 'Ibid. Further discussion follows.']) {
    const parts = notes([book, text]);
    assert.equal(findings(parts, 'ibid-form').length, 0, text);
    assert.equal(findings(parts, 'ibid-source').length, 0, text);
  }
  for (const text of ['Ibid', 'Ibid, 25.', 'Ibid. 25.', 'Ibid., 25', 'ibid.', 'Ibid.,']) {
    const parts = notes([book, text]);
    assert.equal(findings(parts, 'ibid-form').length, 1, text);
    assert.equal(findings(parts, 'ibid-form')[0].severity, 'review');
  }
});

test('Ibid. resolves by body-reference order and propagates through a valid chain', () => {
  const parts = notes([book, 'Ibid., 25.', 'Ibid.'], ['90', '2', '47']);
  assert.equal(findings(parts, 'ibid-source').length, 0);
  assert.equal(lint(parts).checks.find(c => c.id === 'ibid-source').inspected, 2);
});

test('Ibid. as the first referenced note cannot resolve an antecedent', () => {
  const found = findings(notes(['Ibid.']), 'ibid-source');
  assert.equal(found.length, 1);
  assert.match(found[0].observed, /first referenced/);
});

test('commentary, multiple sources, and missing notes break Ibid. source resolution', () => {
  for (const before of ['A helpful explanation without a source.', book + '; ' + otherBook, book + ' ' + otherBook, 'An unfamiliar source format.']) {
    assert.equal(findings(notes([book, before, 'Ibid.']), 'ibid-source').length, 1, before);
  }
  const parts = notes([book, 'A missing note.', 'Ibid.']);
  parts['word/footnotes.xml'] = parts['word/footnotes.xml'].replace(/<w:footnote w:id="11">[\s\S]*?<\/w:footnote>/, '');
  assert.equal(findings(parts, 'ibid-source').length, 1);
});

test('unreferenced notes and malformed or substantive Ibid. do not supply a later antecedent', () => {
  for (const text of ['Ibid, 25.', 'Ibid.; ' + otherBook, 'Ibid. See also an unfamiliar source.']) {
    const parts = notes([book, text, 'Ibid.']);
    assert.equal(findings(parts, 'ibid-source').length, 1, text);
  }
  const parts = notes([book, 'Ibid.']);
  parts['word/document.xml'] = parts['word/document.xml'].replace('<w:footnoteReference w:id="11"/>', '');
  assert.match(findings(parts, 'ibid-source')[0].observed, /no body reference/);
});

test('ordinary journal notes and unambiguous short book notes can precede Ibid.', () => {
  const journal = 'Anne Aster, “Patient Ministry,” Journal of Fiction 2, no. 1 (2024): 12–25.';
  for (const sequence of [[journal, 'Ibid.'], [book, 'Aster, 25.', 'Ibid.'], [book, otherBook, 'Aster, Patient Ministry, 25.', 'Ibid.']]) {
    assert.equal(findings(notes(sequence), 'ibid-source').length, 0, sequence.join('\n'));
  }
});

test('short notes with ambiguous works or editions remain unresolved', () => {
  for (const other of [otherBook, book.replace('2024', '2025')]) {
    assert.equal(findings(notes([book, other, 'Aster, 25.', 'Ibid.']), 'ibid-source').length, 1);
  }
});

test('mentioning Ibid. inside prose does not create an Ibid. citation', () => {
  const parts = notes(['The term “Ibid.” refers to the preceding source.']);
  assert.equal(findings(parts, 'ibid-form').length, 0);
  assert.equal(findings(parts, 'ibid-source').length, 0);
});

test('Greek and Hebrew italics use their appropriate Word properties', () => {
  for (const [text, props, expected] of [
    ['The term ἀγάπη appears here.', '<w:i/>', 1], ['The term ἀγάπη appears here.', '', 0],
    ['The term שָׁלוֹם appears here.', '<w:iCs/>', 1], ['The term שָׁלוֹם appears here.', '<w:i/>', 0],
    ['The term ἀγάπη appears here.', '<w:cs/><w:iCs/>', 1],
    ['The term ἀγάπη appears here.', '<w:rtl/><w:i/><w:iCs w:val="0"/>', 0],
    ['The transliteration agape appears here.', '<w:i/>', 0],
    ['The source writes “ἀγάπη.”', '<w:i/>', 0],
  ]) {
    const parts = fixtureParts(); body(parts, text, props);
    assert.equal(findings(parts, 'original-language-italics').length, expected, text + props);
  }
});

test('complex-script italics inherit, toggle through styles, and respect direct clearing', () => {
  const parts = fixtureParts(); body(parts, 'The term שָׁלוֹם appears here.');
  parts['word/styles.xml'] = parts['word/styles.xml'].replace('<w:sz w:val="24"/>', '<w:sz w:val="24"/><w:iCs/>');
  assert.equal(findings(parts, 'original-language-italics').length, 1);
  parts['word/document.xml'] = parts['word/document.xml'].replace(run('The term שָׁלוֹם appears here.'), run('The term שָׁלוֹם appears here.', '<w:iCs w:val="0"/>'));
  assert.equal(findings(parts, 'original-language-italics').length, 0);
  parts['word/document.xml'] = parts['word/document.xml'].replace('<w:iCs w:val="0"/>', '');
  parts['word/styles.xml'] = parts['word/styles.xml'].replace('<w:name w:val="Normal"/>', '<w:name w:val="Normal"/><w:rPr><w:iCs/></w:rPr>');
  assert.equal(findings(parts, 'original-language-italics').length, 0);
});

test('reports retain the explicit limitation on Ibid. page placement', () => {
  const report = lint(notes([book, 'Ibid.']));
  assert.match(reportText(report), /Ibid\. on the same page/);
  assert.equal(report.stats.rulesAvailable, 55);
});
