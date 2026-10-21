import { fixtureParts } from '../../lib/demo.js';

// Original fictional material shared by browser and word-processor fixtures.
export function sourceExpansionParts({ mistakes = false } = {}) {
  const parts = fixtureParts();
  const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const run = (text, italic = false) => `<w:r>${italic ? '<w:rPr><w:i/></w:rPr>' : ''}<w:t xml:space="preserve">${escape(text)}</w:t></w:r>`;
  const entry = content => `<w:p><w:pPr><w:pStyle w:val="Bibliography"/></w:pPr>${content}</w:p>`;
  const note = (id, content) => `<w:footnote w:id="${id}"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r>${run(' ')}${content}</w:p></w:footnote>`;
  const chapter = run(mistakes ? 'Anne Aster, “The Emergency Casserole”, in ' : 'Anne Aster, “The Emergency Casserole,” in ') +
    run('Care after Coffee', true) + run(`, ed. Clara Cedar (Example City: Fictional Press, 2024), ${mistakes ? '30–20.' : '24'}`);
  const book = run(mistakes ? 'Daniel Dove, Ella Elm, Finn Finch, and Grace Grove, ' : 'Daniel Dove et al., ') +
    run('Meetings That End', true) + run(' (Example City: Fictional Press, 2025), 18.');
  const web = run('Bennett Brew, “A Committee of One,” Cedar.org, October 1, 2024, https://example.invalid/care;version=2.');
  parts['word/footnotes.xml'] = parts['word/footnotes.xml']
    .replace(/<w:footnote w:id="2">[\s\S]*?<\/w:footnote>/, note(2, chapter + run(mistakes ? ' ' : '; ') + book))
    .replace(/<w:footnote w:id="3">[\s\S]*?<\/w:footnote>/, note(3, web));
  const entries = entry(run('Aster, Anne. “The Emergency Casserole.” In ') + run('Care after Coffee', true) + run(', edited by Clara Cedar, 20–30. Example City: Fictional Press, 2024.')) +
    (mistakes ? '' : entry(run('Brew, Bennett. “A Committee of One.” Cedar.org. October 1, 2024. https://example.invalid/care;version=2.'))) +
    entry(run('Dove, Daniel, Ella Elm, Finn Finch, and Grace Grove. ') + run('Meetings That End', true) + run('. Example City: Fictional Press, 2025.'));
  let replaced = false;
  parts['word/document.xml'] = parts['word/document.xml'].replace(/<w:p><w:pPr><w:pStyle w:val="Bibliography"\/>[\s\S]*?<\/w:p>/g,
    () => { if (replaced) return ''; replaced = true; return entries; });
  return parts;
}
