import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDocx } from '../lib/docx.js';
import { lintDocument, reportText, RULES } from '../lib/rules.js';
import { fixtureParts, zipParts, makeDemo, W } from '../lib/demo.js';

const parse = parts => parseDocx(zipParts(parts), 'test.docx');
const lint = parts => lintDocument(parse(parts));
const has = (report, id) => report.findings.some(f => f.ruleId === id);
const body = document => document.paragraphs.find(p => p.text.startsWith('The goal'));

test('documents re-saved by LibreOffice preserve clean settings and intentional faults', () => {
  const clean = lintDocument(parseDocx(readFileSync(new URL('./fixtures/libreoffice-clean.docx', import.meta.url)), 'clean.docx'));
  assert.equal(clean.counts.error, 0, JSON.stringify(clean.findings));
  assert.equal(clean.counts.review, 0, JSON.stringify(clean.findings));
  const bad = lintDocument(parseDocx(readFileSync(new URL('./fixtures/libreoffice-demo.docx', import.meta.url)), 'demo.docx'));
  for (const id of ['font', 'body-size', 'margins', 'note-size', 'bib-indent', 'translation-note']) assert.ok(has(bad, id), id);
});

test('clean reference document: defaults, all paragraph roles, notes, and footer fields', () => {
  const document = parse(fixtureParts());
  const report = lintDocument(document);
  assert.equal(report.counts.error, 0, JSON.stringify(report.findings, null, 2));
  assert.equal(report.counts.review, 0, JSON.stringify(report.findings, null, 2));
  assert.equal(report.stats.footnotes, 3);
  assert.equal(report.stats.bibliographyEntries, 2);
  assert.equal(document.titleDetected, true);
  assert.equal(document.footerParagraphs[0].pageField, true);
  assert.ok(report.stats.rulesEvaluated > 25);
  assert.ok(report.notChecked.length >= 5);
});

test('the deliberate mistakes produce actionable errors and separate review items', () => {
  const report = lintDocument(parseDocx(makeDemo(), 'demo.docx'));
  for (const id of ['margins', 'font', 'body-size', 'body-spacing', 'body-indent', 'body-alignment', 'body-gaps', 'sentence-space',
    'heading-weight', 'heading-alignment', 'note-size', 'note-period', 'bib-indent', 'bib-period', 'bib-order', 'translation-note']) assert.ok(has(report, id), id);
  assert.equal(report.findings.find(f => f.ruleId === 'translation-note').severity, 'review');
  assert.equal(report.findings.find(f => f.ruleId === 'note-size').severity, 'error');
  assert.ok(report.findings.every(f => f.location && f.fix && f.observed));
});

test('inherited paragraph properties merge; direct overrides can clear values', () => {
  const parts = fixtureParts();
  parts['word/styles.xml'] = parts['word/styles.xml'].replace('</w:styles>', '<w:style w:type="paragraph" w:styleId="Derived"><w:name w:val="Derived"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="120"/></w:pPr></w:style></w:styles>');
  parts['word/document.xml'] = parts['word/document.xml'].replace('<w:pStyle w:val="Normal"/></w:pPr><w:r><w:t xml:space="preserve">The goal', '<w:pStyle w:val="Derived"/><w:spacing w:after="0"/></w:pPr><w:r><w:t xml:space="preserve">The goal');
  const p = body(parse(parts));
  assert.equal(p.p.spacing.line, 480);
  assert.equal(p.p.spacing.after, 0);
  assert.equal(p.p.indent.first, 720);
  assert.equal(lint(parts).counts.error, 0);
});

test('character styles and mixed direct run formatting are inspected', () => {
  const parts = fixtureParts();
  parts['word/styles.xml'] = parts['word/styles.xml'].replace('</w:styles>', '<w:style w:type="character" w:styleId="Large"><w:name w:val="Large"/><w:rPr><w:sz w:val="28"/></w:rPr></w:style></w:styles>');
  parts['word/document.xml'] = parts['word/document.xml'].replace('<w:r><w:t xml:space="preserve">The goal', '<w:r><w:rPr><w:rStyle w:val="Large"/></w:rPr><w:t xml:space="preserve">The goal');
  assert.equal(body(parse(parts)).runs[0].size, 28);
  assert.ok(has(lint(parts), 'body-size'));
});

test('a default character style is applied when a run has no explicit character style', () => {
  const parts = fixtureParts();
  parts['word/styles.xml'] = parts['word/styles.xml'].replace('</w:styles>', '<w:style w:type="character" w:default="1" w:styleId="DefaultCharacter"><w:name w:val="Default character"/><w:rPr><w:sz w:val="26"/></w:rPr></w:style></w:styles>');
  assert.equal(body(parse(parts)).runs[0].size, 26);
  assert.ok(has(lint(parts), 'body-size'));
});

test('bold is a style toggle but an absolute direct override', () => {
  const parts = fixtureParts();
  parts['word/styles.xml'] = parts['word/styles.xml'].replace('<w:name w:val="Normal"/>', '<w:name w:val="Normal"/><w:rPr><w:b/></w:rPr>');
  let heading = parse(parts).paragraphs.find(p => p.text === 'Introduction');
  assert.equal(heading.runs[0].bold, false);
  parts['word/document.xml'] = parts['word/document.xml'].replace('<w:r><w:t xml:space="preserve">Introduction', '<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Introduction');
  heading = parse(parts).paragraphs.find(p => p.text === 'Introduction');
  assert.equal(heading.runs[0].bold, true);
});

test('theme fonts are resolved, not assumed from missing direct font properties', () => {
  const parts = fixtureParts();
  parts['word/styles.xml'] = parts['word/styles.xml'].replace('w:ascii="Times New Roman" w:hAnsi="Times New Roman"', 'w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"');
  parts['word/_rels/document.xml.rels'] = parts['word/_rels/document.xml.rels'].replace('</Relationships>', '<Relationship Id="theme" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/></Relationships>');
  parts['word/theme/theme1.xml'] = '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:themeElements><a:fontScheme name="Test"><a:minorFont><a:latin typeface="Cambria"/></a:minorFont></a:fontScheme></a:themeElements></a:theme>';
  assert.equal(body(parse(parts)).runs[0].font, 'Cambria');
  assert.ok(has(lint(parts), 'font'));
});

test('manual first-line tabs are accepted only when they reach a half-inch stop', () => {
  const parts = fixtureParts();
  parts['word/document.xml'] = parts['word/document.xml'].replace('<w:pStyle w:val="Normal"/></w:pPr><w:r><w:t xml:space="preserve">The goal', '<w:pStyle w:val="Normal"/><w:ind w:firstLine="0"/></w:pPr><w:r><w:tab/><w:t xml:space="preserve">The goal');
  assert.ok(!has(lint(parts), 'body-indent'));
  parts['word/settings.xml'] = parts['word/settings.xml'].replace('w:val="720"', 'w:val="1440"');
  assert.ok(has(lint(parts), 'body-indent'));
});

test('hanging and first-line indents override one another', () => {
  const p = parse(fixtureParts()).paragraphs.find(p => p.kind === 'bibliography');
  assert.equal(p.p.indent.hanging, 720);
  assert.equal(p.p.indent.first, undefined);
});

test('translation declaration must attach to the first recognized quotation', () => {
  const parts = fixtureParts();
  parts['word/document.xml'] = parts['word/document.xml'].replace('<w:footnoteReference w:id="1"/>', '<w:footnoteReference w:id="2"/>');
  assert.ok(has(lint(parts), 'translation-note'));
  const note = lint(fixtureParts()).checks.find(c => c.id === 'translation-note');
  assert.equal(note.findings, 0);
  assert.equal(note.inspected, 1);
});

test('Scripture detection includes books outside the most common examples', () => {
  for (const reference of ['Mal 3:10', '1 Thess 5:17', 'Phlm 4', '2 Chronicles 7:14']) {
    const parts = fixtureParts({ clean: false });
    parts['word/document.xml'] = parts['word/document.xml'].replace('Jas 1:19', reference);
    assert.ok(has(lint(parts), 'translation-note'), reference);
  }
});

test('paragraphs with an unclear role get review findings, not body-format errors', () => {
  const parts = fixtureParts();
  parts['word/document.xml'] = parts['word/document.xml'].replace('<w:pStyle w:val="Heading1"/>', '<w:pStyle w:val="Normal"/><w:jc w:val="center"/><w:ind w:firstLine="0"/>');
  const findings = lint(parts).findings.filter(f => f.excerpt === 'Introduction');
  assert.ok(findings.some(f => f.ruleId === 'uncertain-structure'));
  assert.ok(!findings.some(f => f.ruleId === 'body-indent'));
});

test('unresolved fonts and missing styles are review items, never assumed compliant', () => {
  const parts = fixtureParts();
  parts['word/styles.xml'] = parts['word/styles.xml'].replace('<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>', '');
  assert.ok(has(lint(parts), 'unresolved-font'));
  parts['word/document.xml'] = parts['word/document.xml'].replace('<w:pStyle w:val="Normal"/>', '<w:pStyle w:val="MissingStyle"/>');
  assert.ok(has(lint(parts), 'missing-styles'));
});

test('strict namespaces and nonstandard part locations work through relationships', () => {
  let parts = Object.fromEntries(Object.entries(fixtureParts()).map(([k, v]) => [k, v.replaceAll(W, 'http://purl.oclc.org/ooxml/wordprocessingml/main')]));
  assert.equal(lint(parts).counts.error, 0);
  parts = Object.fromEntries(Object.entries(parts).map(([k, v]) => [k.replace(/^word\//, 'custom/'), v.replaceAll('word/document.xml', 'custom/document.xml')]));
  assert.equal(lint(parts).counts.error, 0);
});

test('tracked deletions and text boxes are excluded and disclosed', () => {
  const parts = fixtureParts();
  const extra = '<w:del><w:p><w:r><w:t>Deleted text must not appear</w:t></w:r></w:p></w:del><w:p><w:r><w:pict><w:txbxContent><w:p><w:r><w:t>Text box content</w:t></w:r></w:p></w:txbxContent></w:pict></w:r></w:p>';
  parts['word/document.xml'] = parts['word/document.xml'].replace('</w:body>', extra + '</w:body>');
  const document = parse(parts);
  assert.ok(document.paragraphs.every(p => !/Deleted text|Text box content/.test(p.text)));
  assert.ok(has(lintDocument(document), 'tracked-changes'));
  assert.ok(has(lintDocument(document), 'text-boxes'));
});

test('reject old .doc, renamed non-ZIP files, malformed XML, entities, and style cycles', () => {
  assert.throws(() => parseDocx(makeDemo(), 'old.doc'), /\.docx/);
  assert.throws(() => parseDocx(new Uint8Array([1, 2]), 'fake.docx'), /not a readable/);
  let parts = fixtureParts(); parts['word/document.xml'] = '<w:document><unclosed';
  assert.throws(() => parse(parts), /damaged/);
  parts = fixtureParts(); parts['word/document.xml'] = '<!DOCTYPE w:document [<!ENTITY x SYSTEM "file:///etc/passwd">]>' + parts['word/document.xml'];
  assert.throws(() => parse(parts), /unsupported XML/);
  parts = fixtureParts(); parts['word/styles.xml'] = parts['word/styles.xml'].replace('<w:name w:val="Normal"/>', '<w:name w:val="Normal"/><w:basedOn w:val="Heading1"/>');
  assert.throws(() => parse(parts), /circular/);
});

test('reject oversized inflated XML before extraction, and macro-enabled packages', () => {
  const parts = fixtureParts(); parts['word/large.xml'] = 'x'.repeat(8 * 1024 * 1024 + 1);
  assert.throws(() => parse(parts), /expanded document/);
  delete parts['word/large.xml'];
  parts['[Content_Types].xml'] = parts['[Content_Types].xml'].replace('wordprocessingml.document.main', 'wordprocessingml.macroEnabled.main');
  assert.throws(() => parse(parts), /macro-free/);
});

test('plain-text export includes fixes, evidence, manual pages, and untested scope', () => {
  const report = lintDocument(parseDocx(makeDemo(), 'demo.docx'));
  const output = reportText(report);
  for (const text of ['demo.docx', 'ERROR', 'REVIEW', 'Manual pp.', 'Fix:', 'NOT CHECKED', 'not certification']) assert.ok(output.includes(text), text);
  assert.equal(report.stats.rulesAvailable, Object.keys(RULES).length);
});
