import { BIBLE_REFERENCE } from './scripture.js';

export const EDITION = 'Midwestern Style Manual · 4th edition (2021)';
const rule = (title, group, pages, fix, severity = 'error') => ({ title, group, pages, fix, severity });

export const RULES = {
  'page-size': rule('Use US Letter paper', 'Page setup', '14', 'In Word: Layout → Size → Letter (8.5 × 11 inches).'),
  margins: rule('Use one-inch margins', 'Page setup', '14', 'In Word: Layout → Margins → Normal. Check every section of the document.'),
  columns: rule('Use a single text column', 'Page setup', '14', 'In Word: Layout → Columns → One.'),
  font: rule('Use Times New Roman', 'Typography', '14–15, 18–19, 22', 'Select the affected text and set its font to Times New Roman. Check its paragraph and character styles too.'),
  'body-size': rule('Use 12-point text', 'Typography', '14–15, 22', 'Set the affected text to 12 pt. Footnote text uses 10 pt.'),
  'body-spacing': rule('Double-space body paragraphs', 'Body', '14', 'Open Paragraph → Indents and Spacing and set Line spacing to Double.'),
  'body-alignment': rule('Align body text to the left', 'Body', '14', 'Choose Align Left, leaving the right edge ragged.'),
  'body-indent': rule('Indent the first line half an inch', 'Body', '15', 'In Paragraph → Special, choose First line, By 0.5 inches. A leading tab to a half-inch stop is also accepted.'),
  'body-margins': rule('Keep body paragraphs at the text margins', 'Body', '14–15', 'Set paragraph Left and Right indents to 0. Keep the separate first-line indent at 0.5 inches.'),
  'body-gaps': rule('Remove extra paragraph spacing', 'Body', '14', 'Set paragraph spacing Before and After to 0 pt. Keep line spacing at Double.'),
  'sentence-space': rule('Use one space after punctuation', 'Body', '17', 'Remove the extra space after sentence punctuation. Check the excerpt before changing it.'),
  'heading-alignment': rule('Align the heading for its level', 'Headings', '16, 93', 'Center levels 1–2. Left-align levels 3–4. Use Word heading styles to identify the level.'),
  'heading-weight': rule('Use the right heading weight', 'Headings', '16, 93', 'Use bold for levels 1 and 3, and regular text for levels 2 and 4.'),
  'heading-level': rule('Review headings below level four', 'Headings', '16, 93', 'Course papers use up to four levels. The fifth level requires special doctoral approval.', 'review'),
  'heading-keep': rule('Keep headings with their text', 'Headings', '17', 'Consider Paragraph → Line and Page Breaks → Keep with next. Check the final pages for stranded headings.', 'review'),
  'title-caps': rule('Capitalize title-page text', 'Title page', '11–13', 'Use uppercase letters for the title-page information. Word’s All caps font setting is also recognized.'),
  'title-alignment': rule('Center title-page text', 'Title page', '11–13', 'Select the title-page paragraphs and choose Center alignment.'),
  'title-spacing': rule('Single-space title-page text', 'Title page', '13', 'Set title-page line spacing to Single. Verify the larger gaps between blocks in the finished document.'),
  'note-size': rule('Use 10-point footnotes', 'Footnotes', '18–19', 'Modify the Footnote Text style to 10 pt, then remove any conflicting size overrides.'),
  'note-spacing': rule('Single-space footnotes', 'Footnotes', '19', 'Set the Footnote Text style’s line spacing to Single.'),
  'note-indent': rule('Indent the first footnote line half an inch', 'Footnotes', '19', 'Set the first footnote paragraph to a 0.5-inch first-line indent, not a hanging indent.'),
  'note-margins': rule('Align continued note lines with the left margin', 'Footnotes', '19', 'Set footnote paragraph Left and Right indents to 0. Use a first-line indent for the first line only.'),
  'note-period': rule('Review the footnote’s final punctuation', 'Footnotes', '19, 31–34', 'A standard source note ends with a period. Check whether this note needs final punctuation.', 'review'),
  'note-space': rule('Remove the space before the footnote marker', 'Footnotes', '19', 'The raised footnote marker should follow the preceding punctuation without an intervening space.'),
  'note-marker': rule('Check the footnote marker’s position', 'Footnotes', '18–19', 'Normally place a superscript footnote marker immediately after punctuation. Midsentence notes can be appropriate.', 'review'),
  'bib-spacing': rule('Single-space bibliography entries', 'Bibliography', '22', 'Set each bibliography entry’s line spacing to Single. Leave one blank line between entries.'),
  'bib-indent': rule('Use a half-inch hanging indent', 'Bibliography', '22', 'Set Paragraph → Special → Hanging, By 0.5 inches. The first line should begin at the left margin.'),
  'bib-alignment': rule('Left-align bibliography entries', 'Bibliography', '22', 'Choose Align Left for the entries; center the bibliography heading.'),
  'bib-period': rule('End bibliography entries with a period', 'Bibliography', '22', 'Check the entry and add its required final period.'),
  'bib-heading': rule('Format the bibliography heading', 'Bibliography', '22', 'Use BIBLIOGRAPHY in uppercase, centered above the entries.'),
  'bib-order': rule('Check bibliography alphabetical order', 'Bibliography', '22–23', 'Arrange entries by author’s surname, then by title for the same author. Check corporate authors and repeated-author underscores manually.', 'review'),
  'bib-page': rule('Start the bibliography on a new page', 'Bibliography', '22–24', 'Use a page break before the heading, or verify that it already starts a fresh page in Word.', 'review'),
  'quote-spacing': rule('Single-space block quotations', 'Quotations', '105–106', 'Set the block quotation’s line spacing to Single.'),
  'quote-indent': rule('Indent the block quotation half an inch', 'Quotations', '105–106', 'Indent the quotation 0.5 inches from the left text margin and keep the right indent at 0.'),
  'translation-note': rule('Identify the Bible translation', 'Scripture', '39', 'At the first Scripture quotation, add a footnote identifying the translation’s full name, abbreviation, publication city, publisher, and year.', 'review'),
  'footer-alignment': rule('Center page-number fields in the footer', 'Page numbering', '15', 'Center the footer paragraph containing the PAGE field. Check the title page and numbering sequence in Word.'),
};

export const NOT_CHECKED = [
  { title: 'Exact appearance of the finished pages', detail: 'Title-page vertical positions, heading gaps, page breaks, orphaned headings, actual page numbers, installed/substituted fonts, and the size and placement of visuals need a final PDF review.' },
  { title: 'Citation accuracy and completeness', detail: 'Source identity, publication facts, quoted page numbers, full/short note forms, Ibid. on the same page, and missing attributions are not verified.' },
  { title: 'Writing and interpretation', detail: 'Argument quality, theology, quotation fidelity, plagiarism, contextual capitalization, and the meaning of a passage require a reader.' },
  { title: 'Other paper types and special formatting', detail: 'This release checks standard course papers. Dissertation, book-review, and annotated-bibliography requirements; lists, tables, equations, text boxes, and complex-script typography need separate review.' },
  { title: 'Spacing between notes and bibliography entries', detail: 'Blank paragraphs, paragraph spacing, and page boundaries can interact. Check that there is a single blank line between entries and notes in the finished document.' },
  { title: 'Assignment requirements', detail: 'Your professor’s instructions and program supplements may override or add requirements. This is an independent aid, not an MBTS certification.' },
];

const close = (a, b, tolerance = 2) => Math.abs(a - b) <= tolerance;
const inches = n => n === undefined ? 'not specified' : `${Number((n / 1440).toFixed(3))} in`;
const excerpt = text => text.replace(/\s+/g, ' ').trim().slice(0, 230);
const left = p => ['left', 'start'].includes(p.p.align || 'left');
const indent = p => ({ left: 0, right: 0, first: 0, hanging: 0, ...p.p.indent });
const visibleRuns = p => p.runs.filter(r => /\p{L}|\p{N}/u.test(r.text));
const punctuation = s => /\.[”’"')\]]*\s*$/.test(s);

function lineSpacing(p) {
  const s = p.p.spacing || {};
  return { amount: s.line ?? 240, rule: s.rule ?? 'auto' };
}

function firstIndent(p, model) {
  const i = indent(p);
  if (i.chars !== undefined) return undefined;
  if (p.leadingTab && !i.first && !i.hanging) {
    const stop = (p.p.tabs || []).find(t => t.pos > i.left && (!t.kind || t.kind === 'left'));
    return (stop?.pos ?? (Math.floor(i.left / model.defaultTab) + 1) * model.defaultTab) - i.left;
  }
  return i.first - i.hanging;
}

export function lintDocument(model) {
  const findings = [];
  let omitted = 0;
  const checked = new Map();
  function add(id, p, observed, override = {}) {
    const r = RULES[id] || override;
    const item = { ruleId: id, title: r.title, group: r.group || 'Document review', pages: r.pages,
      severity: override.severity || r.severity || 'review', fix: r.fix, observed,
      location: p?.location || 'Document', excerpt: excerpt(p?.text || ''), ...override };
    if (findings.length < 1000) findings.push(item); else omitted++;
  }
  function check(id, ok, p, observed) {
    const c = checked.get(id) || { id, ...RULES[id], inspected: 0, findings: 0 };
    c.inspected++; if (!ok) { c.findings++; add(id, p, observed); }
    checked.set(id, c);
  }
  function review(id, title, detail, p, fix, pages) {
    add(id, p, detail, { title, severity: 'review', fix, pages });
  }
  function fonts(p, size) {
    const runs = visibleRuns(p);
    const known = runs.filter(r => /[A-Za-z]/.test(r.text) && r.font);
    if (known.length) check('font', known.every(r => /^Times New Roman$|^TimesNewRomanPS(?:MT|-\w+MT)$/i.test(r.font)), p,
      `Detected font${new Set(known.map(r => r.font)).size > 1 ? 's' : ''}: ${[...new Set(known.map(r => r.font))].join(', ')}.`);
    const sized = runs.filter(r => r.size !== undefined);
    if (sized.length) check(size === 10 ? 'note-size' : 'body-size', sized.every(r => close(r.size / 2, size, .05)), p,
      `Detected size${new Set(sized.map(r => r.size)).size > 1 ? 's' : ''}: ${[...new Set(sized.map(r => r.size / 2))].join(', ')} pt; expected ${size} pt.`);
    if (runs.some(r => /[A-Za-z]/.test(r.text) && (!r.font || r.size === undefined))) review('unresolved-font', 'Some font settings could not be resolved',
      'A font name or size is missing from the document’s explicit defaults, styles, theme, and text formatting.', p,
      'Select this text in Word and verify its effective font and size. Set them explicitly if needed.', '14–15');
  }
  function spacing(p, id, amount) {
    const s = lineSpacing(p);
    check(id, s.rule === 'auto' && close(s.amount, amount, 1), p,
      s.rule === 'auto' ? `Line spacing is ${Number((s.amount / 240).toFixed(2))}×; expected ${amount / 240}×.` :
        `Line spacing is ${s.rule === 'exact' ? 'Exactly' : 'At least'} ${s.amount / 20} pt; the manual specifies ${amount === 480 ? 'Double' : 'Single'}.`);
  }
  function indentsKnown(p) {
    if (p.p.indent?.chars !== undefined) {
      review('character-indent', 'Check this character-based indent', 'This indent is measured in characters rather than inches.', p,
        'Verify the physical indentation using Word’s ruler.');
      return false;
    }
    return true;
  }

  for (const section of model.sections) {
    if (section.width !== undefined && section.height !== undefined) check('page-size', close(section.width, 12240, 20) && close(section.height, 15840, 20), section,
      `${inches(section.width)} × ${inches(section.height)}; expected 8.5 × 11 in.`);
    else review('unknown-page-size', 'Page size is not specified', 'The document does not provide a complete page size for this section.', section, 'Verify Layout → Size → Letter in Word.', '14');
    const sides = ['top', 'right', 'bottom', 'left'];
    if (sides.every(s => section.margins[s] !== undefined)) check('margins', sides.every(s => close(section.margins[s], 1440, 2)) && !section.margins.gutter, section,
      sides.map(s => `${s}: ${inches(section.margins[s])}`).join('; ') + (section.margins.gutter ? `; gutter: ${inches(section.margins.gutter)}` : '') + '.');
    else review('unknown-margins', 'Some margins are not specified', 'The document leaves one or more margin values implicit.', section, 'Verify all four margins in Layout → Margins.', '14');
    check('columns', section.columns === 1, section, `${section.columns} columns detected; expected one.`);
  }
  if (!model.sections.length) review('no-sections', 'Page setup could not be checked', 'No section page settings were found.', null, 'Check paper size and margins in Word.', '14');
  if (model.mirroredMargins) review('mirrored-margins', 'Review mirrored margins', 'Mirrored margins are enabled; this checker uses the standard course-paper profile.', null, 'Check Layout → Margins and your assignment requirements.', '14');
  if (!model.titleDetected) review('title-unidentified', 'Title-page boundaries were not identified',
    'The checker could not identify both the school name and the end of the title page.', null,
    'Check the title page against the manual. A real page break after it makes the boundary clear.', '11–13');

  const allParagraphs = [...model.paragraphs, ...model.footnotes.flatMap(n => n.paragraphs)];
  for (const p of allParagraphs) {
    if (['empty', 'table', 'list', 'front-matter', 'other'].includes(p.kind)) continue;
    fonts(p, p.kind === 'footnote' ? 10 : 12);
    const i = indent(p);
    if (p.p.bidi) { review('bidi', 'Review right-to-left paragraph formatting', 'This paragraph uses bidirectional layout.', p, 'Review its alignment and original-language typography in Word.'); continue; }
    if (p.kind === 'body') {
      spacing(p, 'body-spacing', 480);
      check('body-alignment', left(p), p, `Alignment: ${p.p.align || 'left (default)'}.`);
      if (indentsKnown(p)) {
        check('body-indent', close(firstIndent(p, model), 720), p, `First-line indent: ${inches(firstIndent(p, model))}; expected 0.5 in.`);
        check('body-margins', close(i.left, 0) && close(i.right, 0), p, `Left indent: ${inches(i.left)}; right indent: ${inches(i.right)}.`);
      }
      const s = p.p.spacing || {};
      if ([s.beforeAuto, s.afterAuto].some(v => ['1', 'true', 'on'].includes(v)) || p.p.contextualSpacing) {
        review('contextual-spacing', 'Review automatic paragraph spacing', 'Word’s automatic or same-style spacing options affect the visible gaps.', p, 'Check that body paragraphs have no extra gap before or after them.', '14');
      } else check('body-gaps', !(s.before || s.after || s.beforeLines || s.afterLines), p,
        `Before: ${(s.before || 0) / 20} pt; after: ${(s.after || 0) / 20} pt${s.beforeLines || s.afterLines ? '; line-based spacing is also set' : ''}.`);
      check('sentence-space', !/[.!?,;:][”’"')\]]* {2,}\S/.test(p.text), p, 'Two or more spaces follow punctuation in this paragraph.');
    }
    if (p.kind === 'heading') {
      const level = p.outline;
      check('heading-level', level <= 4, p, `Heading level ${level} detected.`);
      if (level <= 4) {
        check('heading-alignment', level <= 2 ? p.p.align === 'center' : left(p), p,
          `Level ${level} is ${p.p.align || 'left'}-aligned; expected ${level <= 2 ? 'center' : 'left'}.`);
        check('heading-weight', visibleRuns(p).every(r => !!r.bold === [1, 3].includes(level)), p,
          `Level ${level} should use ${[1, 3].includes(level) ? 'bold' : 'regular'} text throughout.`);
        check('heading-keep', !!p.p.keepNext, p, 'Keep with next is not enabled. This is a preventive suggestion; the heading may already be placed correctly.');
      }
    }
    if (p.kind === 'title') {
      check('title-caps', visibleRuns(p).every(r => r.caps || r.text === r.text.toUpperCase()), p, 'Some title-page text is not uppercase.');
      check('title-alignment', p.p.align === 'center', p, `Alignment: ${p.p.align || 'left'}.`);
      spacing(p, 'title-spacing', 240);
    }
    if (p.kind === 'footnote') {
      spacing(p, 'note-spacing', 240);
      if (indentsKnown(p)) {
        if (p.index === 0) check('note-indent', close(firstIndent(p, model), 720), p, `First-line indent: ${inches(firstIndent(p, model))}; expected 0.5 in.`);
        check('note-margins', close(i.left, 0) && close(i.right, 0), p, `Left indent: ${inches(i.left)}; right indent: ${inches(i.right)}.`);
      }
    }
    if (p.kind === 'bibliography') {
      spacing(p, 'bib-spacing', 240);
      if (indentsKnown(p)) check('bib-indent', close(i.left, 720) && close(i.hanging, 720) && !i.first && !i.right, p,
        `Left: ${inches(i.left)}; hanging: ${inches(i.hanging)}; first line: ${inches(i.first)}.`);
      check('bib-alignment', left(p), p, `Alignment: ${p.p.align || 'left'}.`);
      check('bib-period', /\.[”’"')\]]*\s*$/.test(p.text), p, 'This entry does not end with a period.');
    }
    if (p.kind === 'bibliography-heading') {
      check('bib-heading', p.p.align === 'center' && visibleRuns(p).every(r => r.caps || r.text === r.text.toUpperCase()), p,
        `Heading: “${excerpt(p.text)}”; alignment: ${p.p.align || 'left'}.`);
      const before = model.paragraphs[p.index - 1];
      check('bib-page', !!(p.p.pageBreakBefore || before?.pageBreakAfter || before?.sectionEnd), p,
        'No explicit page break was found immediately before the bibliography heading. Its actual page position needs review.');
    }
    if (p.kind === 'quote') {
      spacing(p, 'quote-spacing', 240);
      if (indentsKnown(p)) check('quote-indent', close(i.left, 720) && !i.right, p, `Left indent: ${inches(i.left)}; right indent: ${inches(i.right)}.`);
    }
    if (p.kind === 'possible-heading' || p.kind === 'possible-quote') review('uncertain-structure', 'Confirm this paragraph’s role',
      p.kind === 'possible-heading' ? 'This looks like a heading, but has no recognized heading level.' : 'This may be a block quotation, but has no recognized quotation style.', p,
      'Apply the appropriate Word style, or review this paragraph manually. Body-specific checks were skipped here.', '15–17, 105–106');
    for (const ref of p.refs) {
      check('note-space', !/\s$/.test(ref.before), p, 'Whitespace appears immediately before a footnote marker.');
      const raised = ref.props.vertical === 'superscript' || (ref.props.position || 0) > 0;
      check('note-marker', /[.,;:!?…”’"')\]]$/.test(ref.before) && raised, p,
        `Footnote reference ${ref.id}: ${raised ? 'superscript' : 'superscript formatting not resolved'}; preceding text: “…${ref.before.slice(-45)}”.`);
    }
  }
  for (const note of model.footnotes) if (note.text.trim()) check('note-period', punctuation(note.text), note.paragraphs[0], 'This note does not end with a period.');
  const bibliography = model.paragraphs.filter(p => p.kind === 'bibliography');
  let previous;
  for (const p of bibliography) {
    const key = p.text.match(/^\s*([\p{L}][\p{L} '\-’]{0,60}),/u)?.[1];
    if (key && previous) check('bib-order', previous.key.localeCompare(key, 'en', { sensitivity: 'base' }) <= 0, p,
      `“${key}” appears after “${previous.key}”.`);
    previous = key ? { key } : undefined;
  }
  const quote = model.paragraphs.find(p => /[“"][^”"]{5,}[”"]/.test(p.text) && BIBLE_REFERENCE.test(p.text));
  if (quote) {
    const attached = model.footnotes.filter(n => quote.refs.some(r => r.id === n.id));
    const declaration = attached.find(n => /Bible|Scripture|quotations|references|translation/i.test(n.text) && /\b(?:ESV|NASB|NIV|KJV|NKJV|NRSV|CSB|HCSB|NLT|NET|ASV|RSV|CEB|WEB)\b|Standard Version|King James|American Standard/i.test(n.text));
    check('translation-note', !!declaration && /\b(?:18|19|20)\d{2}\b/.test(declaration.text) && declaration.text.includes(':'), quote,
      declaration ? 'A likely translation declaration was found, but publication details may be incomplete.' :
        'A possible Scripture quotation was found without a recognizable translation declaration in its attached footnotes. This detection is heuristic.');
  }
  for (const p of model.footerParagraphs.filter(p => p.pageField)) {
    fonts(p, 12);
    check('footer-alignment', p.p.align === 'center', p, `Page-number paragraph alignment: ${p.p.align || 'left'}.`);
  }
  const flags = [
    [model.trackedChanges, 'tracked-changes', 'Review tracked changes', 'The checker reads inserted text and ignores deleted text. Unresolved changes can affect formatting.', 'Accept or reject changes as appropriate, then check a clean copy.'],
    [model.missingStyles.length, 'missing-styles', 'Some referenced styles are missing', `Missing styles: ${model.missingStyles.join(', ')}. Affected formatting may be incomplete.`, 'Save a clean copy from Word and check the affected styles.'],
    [model.textBoxes, 'text-boxes', 'Text boxes are not checked', `${model.textBoxes} text boxes were detected. Their contents are excluded from paragraph checks.`, 'Review their text and positioning in Word.'],
    [model.endnotes, 'endnotes', 'Review endnotes', 'An endnotes part is present. This checker examines footnotes, not endnote content.', 'Confirm whether your assignment allows endnotes.'],
    [model.hiddenText, 'hidden-text', 'Hidden text was excluded', 'Some text is marked hidden. Word’s display and print settings may show it.', 'Review the hidden text and your print settings.'],
    [model.embeddedContent, 'embedded-content', 'Embedded document content was excluded', 'The document includes imported content that is not ordinary Word paragraphs.', 'Open the file in Word and review the imported material.'],
    [model.missingFootnotes.length, 'missing-footnotes', 'Some referenced footnotes could not be found', 'One or more footnote references have no matching note in the package.', 'Check these notes in Word and save a fresh copy.'],
  ];
  for (const [condition, id, title, detail, fix] of flags) if (condition) review(id, title, detail, null, fix);
  const counts = { error: findings.filter(f => f.severity === 'error').length, review: findings.filter(f => f.severity === 'review').length };
  return { version: 1, edition: EDITION, filename: model.filename, profile: 'Standard course paper', generatedAt: new Date().toISOString(),
    counts, findings, omitted, checks: [...checked.values()], notChecked: NOT_CHECKED,
    stats: { words: model.words, paragraphs: model.paragraphs.filter(p => p.text.trim()).length,
      footnotes: model.footnotes.length, sections: model.sections.length, bibliographyEntries: bibliography.length,
      rulesEvaluated: checked.size, rulesAvailable: Object.keys(RULES).length },
  };
}

export function reportText(report) {
  const lines = ['MBTS CHECKER REPORT', report.filename, report.edition, `Profile: ${report.profile}`,
    `${report.counts.error} errors · ${report.counts.review} items to review`,
    `${report.stats.rulesEvaluated} of ${report.stats.rulesAvailable} rule types evaluated; only applicable, resolvable checks run.`,
    'Paragraph locations are document order, not page numbers. Footnote locations follow reference order.', '',
    ...report.findings.flatMap(f => [`[${f.severity.toUpperCase()}] ${f.title}`, `${f.location}${f.pages ? ` · Manual pp.${f.pages}` : ''}`,
      f.observed, f.excerpt ? `Text: ${f.excerpt}` : '', `Fix: ${f.fix}`, '']),
    ...(report.omitted ? [`${report.omitted} additional findings omitted. Fix common issues and run the checker again.`, ''] : []),
    'NOT CHECKED', ...report.notChecked.map(n => `${n.title}: ${n.detail}`), '',
    'This report is an independent formatting aid, not certification of MBTS compliance.'];
  return lines.filter(l => l !== undefined).join('\n');
}
