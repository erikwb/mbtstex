// Review only mechanics for source forms the recognizer has already identified.
// This does not establish publication facts or the accuracy of quoted pages.
const simpleLocator = /^(?:\d+[a-z]?(?::\d+)?(?:\s*[–-]\s*\d+[a-z]?)*|[ivxlcdm]+(?:\s*[–-]\s*[ivxlcdm]+)?)(?:\s*,\s*(?:\d+[a-z]?(?::\d+)?(?:\s*[–-]\s*\d+[a-z]?)*|[ivxlcdm]+(?:\s*[–-]\s*[ivxlcdm]+)?))*$/i;

function rangeProblems(value) {
  const problems = [];
  if (!simpleLocator.test(value)) return ['Unrecognized page/volume locator; check its form against the source.'];
  for (const match of value.matchAll(/(\d+)\s*[–-]\s*(\d+)/g)) {
    const start = Number(match[1]);
    const end = Number(match[2].length < match[1].length ? match[1].slice(0, -match[2].length) + match[2] : match[2]);
    if (end < start) problems.push(`The page range “${match[0]}” appears to run backwards.`);
  }
  return problems;
}

export function citationMechanics(record) {
  const results = [], syntax = [], { type, bibliography, head } = record;
  const add = (id, problems) => results.push({ id, ok: !problems.length, observed: problems.join(' ') });
  if (head?.nameOrderWrong) syntax.push(bibliography ? 'Invert the first personal author’s name in the bibliography.' : 'Use given name then surname in the full note.');
  if (head?.delimiterWrong) syntax.push(bibliography ? 'Separate the author from the title with a period.' : 'Separate the author from the title with a comma.');
  const quoted = head?.rest.match(/^[“"]([^”"]+)[”"]([,.]?)/);
  if (quoted) {
    const expected = bibliography ? '.' : ',';
    if (!quoted[1].endsWith(expected) || quoted[2]) syntax.push(`Place the ${bibliography ? 'period' : 'comma'} inside the closing title quotation mark.`);
  }
  if (type === 'chapter') {
    if (record.inLabel !== (bibliography ? 'In' : 'in')) syntax.push(`Use “${bibliography ? 'In' : 'in'}” before the containing book title.`);
    if (record.editorLabel && record.editorLabel !== (bibliography ? 'edited by' : 'ed.')) syntax.push(`Introduce the chapter’s editor(s) with “${bibliography ? 'edited by' : 'ed.'}”.`);
  }
  if (type === 'book' && !bibliography && record.authors.truncated && !/et al\.$/.test(record.authors.raw)) syntax.push('Spell the author abbreviation “et al.” with its final period.');
  add('citation-syntax', syntax);

  if (type === 'website') return results;
  let value = record.pages || '', problems = [];
  if (!bibliography) {
    const tail = (record.tail || '').trim();
    if (type === 'journal' && !record.pages && /^[.,]?\s*(?:https?:\/\/|(?:JSTOR|ATLA|EBSCO|ProQuest)\b)/i.test(tail)) return results;
    // A whole-book/chapter reference can omit a locator. Explanatory prose
    // after the final period is not another part of that locator.
    if (tail && !tail.startsWith('.')) {
      const expected = type === 'journal' ? ':' : ',';
      if (!tail.startsWith(expected)) problems.push(`Use ${expected === ':' ? 'a colon' : 'a comma'} before the cited page.`);
      const body = tail.replace(/^[:,]\s*/, '');
      const leading = body.match(/^(?:(?:pp?\.)\s*)?[\divxlcdm][\divxlcdm ,:–-]*(?=[.;]|$|https?:\/\/|(?:JSTOR|ATLA|EBSCO|ProQuest)\b)/i)?.[0]?.trim().replace(/,$/, '');
      if (leading) value = leading;
      else if (!/^https?:\/\/|^(?:JSTOR|ATLA|EBSCO|ProQuest)\b/i.test(body)) problems.push('Unrecognized page/volume locator; check its form against the source.');
    }
  }
  if (value) problems.push(...rangeProblems(value));
  if (value || problems.length) add('citation-locators', problems);
  return results;
}
