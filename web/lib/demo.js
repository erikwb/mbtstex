import { zipSync, strToU8 } from 'fflate';

// Original synthetic Word documents, never derived from the paid manual's
// sample papers. Shared by the interactive demo and regression fixtures.
export const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PACKAGE = 'http://schemas.openxmlformats.org/package/2006/relationships';
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const run = (text, props = '') => `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${escape(text)}</w:t></w:r>`;
const reference = id => `<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="${id}"/></w:r>`;
const p = (text, style = 'Normal', extra = '', after = '') => `<w:p><w:pPr><w:pStyle w:val="${style}"/>${extra}</w:pPr>${run(text)}${after}</w:p>`;
const note = (id, text) => `<w:footnote w:id="${id}"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r>${run(' ' + text)}</w:p></w:footnote>`;

export function fixtureParts({ clean = true } = {}) {
  const title = ['MIDWESTERN BAPTIST THEOLOGICAL SEMINARY', 'LISTENING BEYOND THE COFFEE URN',
    'A RESEARCH PAPER', 'HT 0000 DEMONSTRATION SEMINAR', 'BY MORGAN REED', 'KANSAS CITY, MISSOURI', 'OCTOBER 20, 2026']
    .map((t, i) => p(t, 'Title', '', i === 6 ? '<w:r><w:br w:type="page"/></w:r>' : '')).join('');
  const quotation = 'James tells readers to be “quick to hear, slow to speak, slow to anger” (Jas 1:19).';
  const body = p('Introduction', 'Heading1') + p(quotation, 'Normal', '', clean ? reference(1) : '') +
    p(`Cedar Grove’s care committee had a clipboard, a calendar, and a coffee urn.${clean ? ' ' : '  '}Only the coffee urn had a clear operating procedure. This invented paper asks how volunteers could make their promises easier to remember.`, 'Normal',
      clean ? '' : '<w:jc w:val="both"/><w:ind w:firstLine="0"/><w:spacing w:line="360" w:lineRule="auto" w:after="160"/>', reference(2)) +
    `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr>${run('The goal is to listen carefully before proposing a solution. A completed form records an activity; it does not prove that someone felt heard.',
      clean ? '' : '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="28"/>')}</w:p>` +
    p('A Repeatable Practice', 'Heading2') + p('Listen, reflect, and agree on a next step. This sequence is an invented teaching example, not a finding from a real study. The team can return to listening whenever its summary is mistaken.') +
    p('I arrived with three suggestions and a casserole. After listening, I discovered that the request was for a ride. The casserole remained available for emergencies. This quotation and its speaker are fictional.', 'BlockText') +
    p('Conclusion', 'Heading1') + p('A useful procedure makes the next step clear without replacing attention to the person. Coffee can remain on a fixed schedule; care requires judgment.') +
    p('BIBLIOGRAPHY', 'BibliographyHeading') +
    (clean ? [
      'Aster, Anne. The Patient Ministry. Example City: Fictional Press, 2024.',
      'Brew, Bennett. After the Meeting. Example City: Fictional Press, 2025.',
    ] : [
      'Brew, Bennett. After the Meeting. Example City: Fictional Press, 2025',
      'Aster, Anne. The Patient Ministry. Example City: Fictional Press, 2024.',
    ]).map(t => p(t, 'Bibliography')).join('');
  return {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footnotes.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>`,
    '_rels/.rels': `<Relationships xmlns="${PACKAGE}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/></Relationships>`,
    'word/_rels/document.xml.rels': `<Relationships xmlns="${PACKAGE}"><Relationship Id="styles" Type="${R}/styles" Target="styles.xml"/><Relationship Id="notes" Type="${R}/footnotes" Target="footnotes.xml"/><Relationship Id="settings" Type="${R}/settings" Target="settings.xml"/><Relationship Id="footer" Type="${R}/footer" Target="footer1.xml"/></Relationships>`,
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${W}" xmlns:r="${R}"><w:body>${title}${body}<w:sectPr><w:footerReference w:type="default" r:id="footer"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="${clean ? 1440 : 1080}" w:header="720" w:footer="720" w:gutter="0"/><w:cols w:num="1"/><w:titlePg/></w:sectPr></w:body></w:document>`,
    'word/styles.xml': `<w:styles xmlns:w="${W}">
      <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0" w:line="480" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
      <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:jc w:val="left"/><w:ind w:left="0" w:right="0" w:firstLine="720"/></w:pPr></w:style>
      <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:ind w:firstLine="0"/><w:spacing w:line="240"/></w:pPr></w:style>
      <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="${clean ? 'center' : 'left'}"/><w:ind w:firstLine="0"/><w:keepNext/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b w:val="${clean ? 1 : 0}"/></w:rPr></w:style>
      <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:ind w:firstLine="0"/><w:keepNext/><w:outlineLvl w:val="1"/></w:pPr></w:style>
      <w:style w:type="paragraph" w:styleId="FootnoteText"><w:name w:val="footnote text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:line="240"/></w:pPr><w:rPr><w:sz w:val="${clean ? 20 : 24}"/></w:rPr></w:style>
      <w:style w:type="character" w:styleId="FootnoteReference"><w:name w:val="footnote reference"/><w:rPr><w:vertAlign w:val="superscript"/></w:rPr></w:style>
      <w:style w:type="paragraph" w:styleId="BlockText"><w:name w:val="Block Text"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="720" w:firstLine="0"/><w:spacing w:line="240"/></w:pPr></w:style>
      <w:style w:type="paragraph" w:styleId="BibliographyHeading"><w:name w:val="Bibliography Heading"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/><w:ind w:firstLine="0"/><w:pageBreakBefore/></w:pPr></w:style>
      <w:style w:type="paragraph" w:styleId="Bibliography"><w:name w:val="Bibliography"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="${clean ? 720 : 0}" w:hanging="${clean ? 720 : 0}"/><w:spacing w:line="240" w:after="240"/></w:pPr></w:style>
    </w:styles>`,
    'word/footnotes.xml': `<w:footnotes xmlns:w="${W}"><w:footnote w:type="separator" w:id="-1"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>${clean ? note(1, 'Unless otherwise specified, all Bible references in this paper are to the English Standard Version (ESV) (Wheaton, IL: Crossway, 2025).') : ''}${note(2, 'Anne Aster, The Patient Ministry (Example City: Fictional Press, 2024), 24' + (clean ? '.' : ''))}</w:footnotes>`,
    'word/footer1.xml': `<w:ftr xmlns:w="${W}"><w:p><w:pPr><w:pStyle w:val="Normal"/><w:jc w:val="center"/><w:ind w:firstLine="0"/></w:pPr><w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`,
    'word/settings.xml': `<w:settings xmlns:w="${W}"><w:defaultTabStop w:val="720"/></w:settings>`,
  };
}

export function zipParts(parts) {
  return zipSync(Object.fromEntries(Object.entries(parts).map(([name, value]) => [name, strToU8(value)])), { level: 6 });
}
export function makeDemo() { return zipParts(fixtureParts({ clean: false })); }
