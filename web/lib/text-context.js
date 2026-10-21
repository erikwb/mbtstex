// Preserve offsets while excluding explicit inline quotations. Cross-paragraph
// quotation boundaries still require a reader; no prose is rewritten.
export function withoutQuotations(text) {
  return text.replace(/“[^”]*”|"[^"]*"|‘[^’]*’/g, match => ' '.repeat(match.length));
}

export function referenceText(paragraph) {
  if (paragraph.kind === 'quote') {
    // Only the terminal parenthetical is outside a recognized block quote.
    const terminal = paragraph.text.match(/\([^()]*\)[.!?]?\s*$/);
    return terminal ? ' '.repeat(terminal.index) + terminal[0] : '';
  }
  let text = withoutQuotations(paragraph.text);
  if (paragraph.kind === 'footnote') {
    let offset = 0;
    for (const run of paragraph.runs) {
      // Italicized citation titles are not the author's Scripture locators.
      if (run.italic) text = text.slice(0, offset) + ' '.repeat(run.text.length) + text.slice(offset + run.text.length);
      offset += run.text.length;
    }
  }
  return text;
}

export function originalLanguageRuns(paragraph) {
  const text = withoutQuotations(paragraph.text);
  let offset = 0;
  const found = [];
  for (const run of paragraph.runs) {
    const visible = text.slice(offset, offset + run.text.length);
    offset += run.text.length;
    const greek = /\p{Script=Greek}/u.test(visible), hebrew = /\p{Script=Hebrew}/u.test(visible);
    if (!greek && !hebrew) continue;
    found.push({ text: visible.trim(), italic: (hebrew && !!run.italicCs) ||
      (greek && !!(run.complexScript || run.rtl ? run.italicCs : run.italic)) });
  }
  return found;
}
