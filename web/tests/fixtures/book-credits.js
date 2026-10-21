import { fixtureParts } from '../../lib/demo.js';

// Fictional book credits shared by browser and word-processor checks.
export function bookCreditParts({ mistakes = false } = {}) {
  const parts = fixtureParts();
  const run = (text, italic = false) => `<w:r>${italic ? '<w:rPr><w:i/></w:rPr>' : ''}<w:t xml:space="preserve">${text}</w:t></w:r>`;
  const note = (id, content) => `<w:footnote w:id="${id}"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr><w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r>${run(' ')}${content}</w:p></w:footnote>`;
  const entry = content => `<w:p><w:pPr><w:pStyle w:val="Bibliography"/></w:pPr>${content}</w:p>`;
  const translated = run('Anne Aster, ') + run('The Patient Ministry', true) +
    run(`, 2nd ed., ed. Clara Cedar, trans. ${mistakes ? '' : 'Bennett B. Brew'}`, mistakes) + run(' (St. Louis: Fictional Press, 2024), 24.');
  const edited = run(`Bennett Brew and Clara Cedar, ${mistakes ? 'ed.' : 'eds.'}, `) + run('After the Meeting', true) +
    run(' (Example City: Fictional Press, 2025), 18.');
  parts['word/footnotes.xml'] = parts['word/footnotes.xml']
    .replace(/<w:footnote w:id="2">[\s\S]*?<\/w:footnote>/, note(2, translated))
    .replace(/<w:footnote w:id="3">[\s\S]*?<\/w:footnote>/, note(3, edited));
  const entries = entry(run('Aster, Anne. ') + run('The Patient Ministry', true) +
    run('. 2nd ed. Edited by Clara Cedar. Translated by Bennett B. Brew. St. Louis: Fictional Press, 2024.')) +
    entry(run('Brew, Bennett, and Clara Cedar, eds. ') + run('After the Meeting', true) + run('. Example City: Fictional Press, 2025.'));
  let replaced = false;
  parts['word/document.xml'] = parts['word/document.xml'].replace(/<w:p><w:pPr><w:pStyle w:val="Bibliography"\/>[\s\S]*?<\/w:p>/g,
    () => { if (replaced) return ''; replaced = true; return entries; });
  return parts;
}
