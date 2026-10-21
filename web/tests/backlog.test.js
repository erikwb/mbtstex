import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDocx } from '../lib/docx.js';
import { lintDocument } from '../lib/rules.js';
import { fixtureParts, zipParts } from '../lib/demo.js';

const parse = parts => parseDocx(zipParts(parts), 'course-paper.docx');
const lint = parts => lintDocument(parse(parts));
const findings = (parts, id) => lint(parts).findings.filter(f => f.ruleId === id);
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const run = (text, properties = '') => `<w:r><w:rPr>${properties}</w:rPr><w:t xml:space="preserve">${escape(text)}</w:t></w:r>`;
const reference = id => `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="${id}"/></w:r>`;
const paragraph = (text, style = 'BlockText', after = '', properties = '') => `<w:p><w:pPr><w:pStyle w:val="${style}"/>${properties}</w:pPr>${run(text)}${after}</w:p>`;
function replaceQuote(parts, replacement) {
  const xml = parts['word/document.xml'];
  const start = xml.indexOf('<w:p><w:pPr><w:pStyle w:val="BlockText"');
  const end = xml.indexOf('</w:p>', start) + 6;
  parts['word/document.xml'] = xml.slice(0, start) + replacement + xml.slice(end);
}
function bibliography(parts, entries) {
  const xml = parts['word/document.xml'];
  const start = xml.indexOf('</w:p>', xml.indexOf('<w:pStyle w:val="BibliographyHeading"')) + 6;
  parts['word/document.xml'] = xml.slice(0, start) + entries.map(entry =>
    `<w:p><w:pPr><w:pStyle w:val="Bibliography"/></w:pPr>${typeof entry === 'string' ? run(entry) : entry.runs}</w:p>`).join('') + xml.slice(xml.indexOf('<w:sectPr>'));
}

test('title information includes course/name/location/date and reports recognizable order problems', () => {
  for (const [old, replacement, detail] of [
    ['HT 0000 DEMONSTRATION SEMINAR', 'DEMONSTRATION SEMINAR', 'course number'],
    ['BY MORGAN REED', 'BY', 'student name'],
    ['KANSAS CITY, MISSOURI', 'BOSTON, MASSACHUSETTS', 'KANSAS CITY'],
    ['OCTOBER 20, 2026', '', 'due date'],
  ]) {
    const parts = fixtureParts();
    parts['word/document.xml'] = parts['word/document.xml'].replace(old, replacement);
    assert.ok(findings(parts, 'title-fields').some(f => f.observed.includes(detail)), detail);
    assert.ok(findings(parts, 'title-fields').every(f => f.severity === 'review'));
  }
  const parts = fixtureParts();
  parts['word/document.xml'] = parts['word/document.xml'].replace('HT 0000 DEMONSTRATION SEMINAR', 'SWAP').replace('BY MORGAN REED', 'HT 0000 DEMONSTRATION SEMINAR').replace('SWAP', 'BY MORGAN REED');
  assert.match(findings(parts, 'title-fields')[0].observed, /order/);
});

test('Spurgeon, a separate BY/name paragraph, and a day-first date are accepted', () => {
  const parts = fixtureParts();
  parts['word/document.xml'] = parts['word/document.xml'].replace('MIDWESTERN BAPTIST THEOLOGICAL SEMINARY', 'SPURGEON COLLEGE')
    .replace('OCTOBER 20, 2026', '20 OCTOBER 2026').replace('BY MORGAN REED', 'BY\nMORGAN REED');
  assert.equal(findings(parts, 'title-fields').length, 0);
});

test('title-field check skips an unidentified title instead of asserting missing metadata', () => {
  const parts = fixtureParts();
  parts['word/document.xml'] = parts['word/document.xml'].replace('MIDWESTERN BAPTIST THEOLOGICAL SEMINARY', 'UNRECOGNIZED INSTITUTION');
  assert.equal(findings(parts, 'title-fields').length, 0);
  assert.equal(findings(parts, 'title-unidentified').length, 1);
});

test('heading capitalization respects minor words and Word All caps formatting', () => {
  const parts = fixtureParts();
  parts['word/document.xml'] = parts['word/document.xml'].replace('A Repeatable Practice', 'Listening to the whole Person');
  assert.match(findings(parts, 'heading-case')[0].observed, /whole/);
  parts['word/document.xml'] = parts['word/document.xml'].replace('Listening to the whole Person', 'Listening to the Whole Person');
  assert.equal(findings(parts, 'heading-case').length, 0);
  parts['word/document.xml'] = parts['word/document.xml'].replace('<w:r><w:t xml:space="preserve">Introduction', '<w:r><w:rPr><w:caps/></w:rPr><w:t xml:space="preserve">introduction');
  assert.equal(findings(parts, 'heading-case').length, 0);
});

test('note labels require one space, including nonbreaking space; tabs and repeated spaces fail', () => {
  for (const [separator, valid] of [[' ', true], ['\u00a0', true], ['', false], ['  ', false], ['\t', false]]) {
    const parts = fixtureParts();
    parts['word/footnotes.xml'] = parts['word/footnotes.xml'].replace('> Unless otherwise', `>${separator}Unless otherwise`);
    assert.equal(findings(parts, 'note-label-space').length, valid ? 0 : 1, JSON.stringify(separator));
  }
});

test('note marker and text can share a run; hidden note markers are excluded', () => {
  const parts = fixtureParts();
  parts['word/footnotes.xml'] = parts['word/footnotes.xml'].replace('<w:footnoteRef/></w:r><w:r><w:t', '<w:footnoteRef/><w:t');
  assert.equal(findings(parts, 'note-label-space').length, 0);
  const hidden = '<w:r><w:rPr><w:vanish/></w:rPr><w:footnoteRef/><w:t>hidden</w:t></w:r>';
  parts['word/footnotes.xml'] = parts['word/footnotes.xml'].replace('<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/>', hidden + '<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/>');
  const first = parse(parts).footnotes.find(n => n.id === '1').paragraphs[0];
  assert.equal(first.noteMarkers.length, 1);
  assert.equal(findings(parts, 'note-label-space').length, 0);
});

test('custom or missing note labels produce review rather than an inferred spacing error', () => {
  for (const custom of [true, false]) {
    const parts = fixtureParts();
    if (custom) parts['word/document.xml'] = parts['word/document.xml'].replace('<w:footnoteReference w:id="1"/>', '<w:footnoteReference w:id="1" w:customMarkFollows="1"/>');
    else parts['word/footnotes.xml'] = parts['word/footnotes.xml'].replace('<w:footnoteRef/>', '');
    assert.equal(findings(parts, 'note-label-space').length, 0);
    assert.equal(findings(parts, 'unresolved-note-label').length, 1);
  }
});

test('same-author bibliography sorts by title and resolves optional underscores', () => {
  for (const repeated of ['Aster, Anne.', '______.']) {
    const parts = fixtureParts();
    bibliography(parts, ['Aster, Anne. Zebra Ministry. Example City: Press, 2024.', `${repeated} The Apple Ministry. Example City: Press, 2025.`]);
    assert.equal(findings(parts, 'bib-order').length, 1);
    assert.match(findings(parts, 'bib-order')[0].observed, /Apple Ministry/);
    assert.equal(findings(parts, 'bib-repeated-author').length, 0);
    bibliography(parts, ['Aster, Anne. The Apple Ministry. Example City: Press, 2024.', `${repeated} Zebra Ministry. Example City: Press, 2025.`]);
    assert.equal(findings(parts, 'bib-order').length, 0);
  }
});

test('initialed and corporate authors can be resolved through italicized title boundaries', () => {
  for (const author of ['Aster, A. B.', 'Example Research Council.']) {
    const parts = fixtureParts();
    bibliography(parts, [
      { runs: run(author + ' ') + run('Zebra Ministry', '<w:i/>') + run('. Example City: Press, 2024.') },
      { runs: run('______. ') + run('Apple Ministry', '<w:i/>') + run('. Example City: Press, 2025.') },
    ]);
    assert.equal(findings(parts, 'bib-order').length, 1, author);
    assert.equal(findings(parts, 'bib-repeated-author').length, 0);
  }
});

test('different authors sharing a surname are not compared by their work titles', () => {
  const parts = fixtureParts();
  bibliography(parts, ['Aster, Anne. Zebra Ministry. Example City: Press, 2024.', 'Aster, Bella. Apple Ministry. Example City: Press, 2025.']);
  assert.equal(findings(parts, 'bib-order').length, 0);
});

test('repeated-author markers need the prescribed form and an immediately resolved predecessor', () => {
  for (const marker of ['____.', '———.', '______']) {
    const parts = fixtureParts();
    bibliography(parts, ['Aster, Anne. Apple Ministry. Example City: Press, 2024.', `${marker} Zebra Ministry. Example City: Press, 2025.`]);
    assert.equal(findings(parts, 'bib-repeated-author').length, 1, marker);
  }
  for (const entries of [
    ['______. Apple Ministry. Example City: Press, 2025.'],
    ['Aster, Anne. Apple Ministry. Example City: Press, 2024.', 'Unidentified source entry.', '______. Zebra Ministry. Example City: Press, 2025.'],
  ]) {
    const parts = fixtureParts(); bibliography(parts, entries);
    assert.equal(findings(parts, 'bib-repeated-author').length, 1);
    assert.ok(findings(parts, 'unresolved-bib-order').length);
  }
});

test('unresolved author/title boundaries are disclosed instead of silently passing', () => {
  const parts = fixtureParts();
  bibliography(parts, ['Aster, A. B. The Patient Ministry. Example City: Press, 2024.']);
  assert.equal(findings(parts, 'bib-order').length, 0);
  assert.equal(findings(parts, 'unresolved-bib-order').length, 1);
});

test('translation metadata reports each missing field independently', () => {
  for (const [old, replacement, field] of [
    ['English Standard Version', 'ESV', 'full translation name'],
    [' (ESV)', '', 'translation abbreviation'],
    ['Wheaton, IL:', ':', 'publication city'],
    ['Crossway, 2025', ', 2025', 'publisher'],
    [', 2025', '', 'publication year'],
  ]) {
    const parts = fixtureParts(); parts['word/footnotes.xml'] = parts['word/footnotes.xml'].replace(old, replacement);
    assert.equal(findings(parts, 'translation-note').length, 0);
    assert.match(findings(parts, 'translation-details')[0].observed, new RegExp(field));
  }
});

test('complete declarations are recognized beyond the previous abbreviation whitelist', () => {
  for (const translation of ['Legacy Standard Bible (LSB)', 'New Revised Standard Version Updated Edition (NRSVue)', 'The Message (MSG)', 'Vulgate (Vulg.)']) {
    const parts = fixtureParts();
    parts['word/footnotes.xml'] = parts['word/footnotes.xml'].replace('English Standard Version (ESV)', translation);
    assert.equal(findings(parts, 'translation-note').length, 0, translation);
    assert.equal(findings(parts, 'translation-details').length, 0, translation);
  }
});

test('a declaration before the quotation does not count as its attached note', () => {
  const parts = fixtureParts();
  const ref = reference(1);
  parts['word/document.xml'] = parts['word/document.xml'].replace(ref, '');
  parts['word/document.xml'] = parts['word/document.xml'].replace('<w:r><w:t xml:space="preserve">James tells', ref + '<w:r><w:t xml:space="preserve">James tells');
  assert.equal(findings(parts, 'translation-note').length, 1);
});

test('chapter-only and single-chapter Scripture quotations are recognized; author/year prose is not', () => {
  for (const reference of ['Ps 23', 'Phlm 4', 'Jude 5']) {
    const parts = fixtureParts({ clean: false });
    parts['word/document.xml'] = parts['word/document.xml'].replace('Jas 1:19', reference);
    assert.equal(findings(parts, 'translation-note').length, 1, reference);
  }
  const parts = fixtureParts({ clean: false });
  parts['word/document.xml'] = parts['word/document.xml'].replace('Jas 1:19', 'James 2025');
  assert.equal(findings(parts, 'translation-note').length, 0);
});

test('block quotations spanning paragraphs or explicit page breaks are checked as one quotation', () => {
  const parts = fixtureParts();
  replaceQuote(parts, paragraph('This is the first paragraph of an invented quotation.') +
    paragraph('This is its second paragraph.', 'BlockText', reference(3), '<w:pageBreakBefore/>'));
  const report = lint(parts);
  for (const id of ['quote-leadin', 'quote-marks', 'quote-citation']) {
    const check = report.checks.find(c => c.id === id);
    assert.equal(check.inspected, 1, id); assert.equal(check.findings, 0, id);
  }
});

test('block mechanics catch a missing colon, enclosing quotes, and a missing terminal citation', () => {
  const parts = fixtureParts();
  parts['word/document.xml'] = parts['word/document.xml'].replace('described the experience:', 'described the experience.');
  replaceQuote(parts, paragraph('“An invented quotation with enclosing quotation marks.”'));
  for (const id of ['quote-leadin', 'quote-marks', 'quote-citation']) assert.equal(findings(parts, id).length, 1, id);
});

test('internal quotation marks are retained and a nonterminal note does not prove a terminal citation', () => {
  const parts = fixtureParts();
  replaceQuote(parts, paragraph('She said, “Please listen.” Then the conversation continued.', 'BlockText', reference(3)));
  assert.equal(findings(parts, 'quote-marks').length, 0);
  assert.equal(findings(parts, 'quote-citation').length, 0);
  replaceQuote(parts, paragraph('An opening sentence.', 'BlockText', reference(3) + run(' Further quoted material follows.')));
  assert.equal(findings(parts, 'quote-citation').length, 1);
});

test('parenthetical Scripture is accepted at a block end and its declaration can attach to the last paragraph', () => {
  const parts = fixtureParts();
  parts['word/document.xml'] = parts['word/document.xml'].replace('Jas 1:19', 'a nonbiblical reference');
  replaceQuote(parts, paragraph('An invented first paragraph for the Scripture detector.') + paragraph('A second example paragraph (Ps 23).', 'BlockText', reference(1)));
  assert.equal(findings(parts, 'quote-citation').length, 0);
  assert.equal(findings(parts, 'translation-note').length, 0);
  const withoutDeclaration = fixtureParts();
  withoutDeclaration['word/document.xml'] = withoutDeclaration['word/document.xml'].replace('Jas 1:19', 'a nonbiblical reference');
  replaceQuote(withoutDeclaration, paragraph('“Example wording used to test formatting.” (Phlm 4).'));
  assert.equal(findings(withoutDeclaration, 'quote-citation').length, 0);
  assert.equal(findings(withoutDeclaration, 'quote-marks').length, 1);
  assert.equal(findings(withoutDeclaration, 'translation-note').length, 1);
});
