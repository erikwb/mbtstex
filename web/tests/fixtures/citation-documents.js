import { parseDocx } from '../../lib/docx.js';
import { lintDocument } from '../../lib/rules.js';
import { fixtureParts, zipParts, W } from '../../lib/demo.js';

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
const chapterNote = () => [run('Anne Aster, “The Emergency Casserole,” in '), run('Care after Coffee', true), run(', ed. Bennett B. Brew (St. Louis: Fictional Press, 2024), 24.')];
const chapterEntry = () => [run('Aster, Anne. “The Emergency Casserole.” In '), run('Care after Coffee', true), run(', edited by Bennett B. Brew, 20–30. St. Louis: Fictional Press, 2024.')];
const webNote = (url = 'https://example.invalid/care', date = 'October 1, 2024, ') => `Anne Aster, “A Committee of One,” Cedar.org, ${date}${url}.`;
const webEntry = (url = 'https://example.invalid/care') => `Aster, Anne. “A Committee of One.” Cedar.org. October 1, 2024. ${url}.`;
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
export { run, bookNote, bookEntry, articleNote, articleEntry, chapterNote, chapterEntry, webNote, webEntry, short, paper, lint, issues, citationIssues };
