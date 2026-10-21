// Conservative recognizers for course-paper conventions. These describe
// recognizable structure; they do not establish the truth of source metadata.
const tidy = text => text.replace(/\s+/g, ' ').trim();
const normalized = text => tidy(text).toLocaleLowerCase('en');
const compare = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });

export function titleProblems(paragraphs) {
  const lines = paragraphs.filter(p => p.kind === 'title').flatMap(p => p.text.split(/\n/)).map(tidy).filter(Boolean);
  const find = pattern => lines.findIndex(line => pattern.test(line));
  const school = find(/^(?:midwestern baptist theological seminary|spurgeon college)$/i);
  const type = find(/^(?:a|an) (?:\w+ ){0,5}(?:paper|report|review|essay|analysis|reflection|summary|project)$/i);
  const course = find(/^(?:[A-Z]{1,5}-)?[A-Z]{1,8}[ -]*\d{2,5}[A-Z]?\s+[A-Z]/i);
  const by = find(/^by(?:\s+.+)?$/i);
  const city = find(/^kansas city\s*,?\s*missouri$/i);
  const months = '(?:January|February|March|April|May|June|July|August|September|October|November|December)';
  const date = find(new RegExp(`^(?:${months} \\d{1,2},? \\d{4}|\\d{1,2} ${months} \\d{4}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{4}|\\d{4}-\\d{2}-\\d{2})$`, 'i'));
  const problems = [];
  if (school < 0) problems.push('school name');
  if (type < 0) problems.push('paper type (for example, A RESEARCH PAPER)');
  if (school >= 0 && type >= 0 && type <= school + 1) problems.push('paper title between the school and paper type');
  if (course < 0) problems.push('course number and name');
  const name = by < 0 ? '' : lines[by].replace(/^by\s*/i, '') || lines[by + 1] || '';
  if (by < 0 || !/\p{L}/u.test(name) || name === lines[city] || name === lines[date]) problems.push('BY and student name');
  if (city < 0) problems.push('KANSAS CITY, MISSOURI');
  if (date < 0) problems.push('due date');
  const positions = [school, type, course, by, city, date].filter(i => i >= 0);
  if (positions.some((n, i) => i && n <= positions[i - 1])) problems.push('school → title/type → course → student → location → date order');
  return problems;
}

const minorWords = new Set('a an the and but for nor or so yet as at by from in into of on onto per to up via vs with without over under'.split(' '));
export function lowercaseHeadingWords(paragraph) {
  const text = paragraph.runs.map(r => r.caps ? r.text.toUpperCase() : r.text).join('');
  const words = text.match(/[A-Za-z][A-Za-z’'-]*/g) || [];
  return words.filter((word, index) => /^[a-z]/.test(word) &&
    (index === 0 || index === words.length - 1 || !minorWords.has(word.toLowerCase())));
}

function italicTitle(paragraph) {
  let offset = 0, start, title = '';
  for (const run of paragraph.runs) {
    if (run.italic && /\p{L}/u.test(run.text)) { if (start === undefined) start = offset; title += run.text; }
    else if (start !== undefined && /\S/.test(run.text)) break;
    else if (start !== undefined) title += run.text;
    offset += run.text.length;
  }
  return start === undefined ? null : { start, title: tidy(title) };
}

export function bibliographyRecord(paragraph, previous) {
  const text = paragraph.text.trim();
  const repeated = text.match(/^([_—–-]{2,})(\.?)(\s*)/u);
  const italics = italicTitle(paragraph);
  if (repeated) {
    const valid = repeated[1] === '______' && repeated[2] === '.' && !!repeated[3];
    return { repeated: true, validRepeat: valid, resolvedRepeat: !!previous?.author,
      surname: valid ? previous?.surname : undefined, author: valid ? previous?.author : undefined,
      title: italics?.title || (valid ? text.slice(repeated[0].length).split('. ')[0] : undefined) };
  }
  const surname = text.match(/^([\p{L}][\p{L} '\-’]{0,80}),/u)?.[1];
  // Italic titles identify the author/title boundary even with initials.
  if (italics && italics.start > 0 && /\.\s*$/.test(paragraph.text.slice(0, italics.start))) {
    const author = tidy(paragraph.text.slice(0, italics.start)).replace(/\.\s*$/, '');
    return { surname: surname || author, author, title: italics.title };
  }
  if (!surname) return {};
  const end = text.indexOf('. ');
  // Without typography, initials and abbreviated roles make the boundary
  // ambiguous. Retain the surname comparison but do not guess the title.
  if (end < 0 || /\b(?:[A-Za-z]|Jr|Sr|eds?)$/.test(text.slice(0, end))) return { surname };
  const author = text.slice(0, end);
  if (!/^[\p{L}\s,'’&-]+$/u.test(author)) return { surname };
  return { surname, author, title: text.slice(end + 2).split('. ')[0] };
}

export function bibliographyOrder(previous, current) {
  if (!previous?.surname || !current.surname) return null;
  const authorOrder = compare(previous.surname, current.surname);
  if (authorOrder !== 0) return { ok: authorOrder < 0, observed: `“${current.surname}” appears after “${previous.surname}”.` };
  if (!previous.author || !current.author || normalized(previous.author) !== normalized(current.author)) return null;
  if (!previous.title || !current.title) return null;
  const sortTitle = title => title.replace(/^[“"'‘]+/, '').replace(/^(?:a|an|the)\s+/i, '');
  return { ok: compare(sortTitle(previous.title), sortTitle(current.title)) <= 0,
    observed: `For ${current.author}, “${current.title}” appears after “${previous.title}”. English titles are compared without an initial A, An, or The.` };
}

export function translationDetails(text) {
  const problems = [];
  const abbreviation = [...text.matchAll(/\(([A-Za-z][A-Za-z\d.-]{1,14})\)/g)]
    .find(m => (m[1].match(/[A-Z]/g)?.length || 0) >= 2 || /^Vulg\.$/i.test(m[1]));
  if (!abbreviation) problems.push('translation abbreviation in parentheses');
  const before = abbreviation ? text.slice(0, abbreviation.index) : text;
  if (!/\b(?:[A-Z][\p{L}’'-]+\s+){1,8}(?:Bible|Version|Translation|Testament|Scriptures)\b|\bThe Message\b|\bVulgate\b/u.test(before)) {
    problems.push('full translation name');
  }
  const publication = text.match(/\(([^():]*):([^()]*)\)/);
  if (!publication || !/\p{L}/u.test(publication[1])) problems.push('publication city');
  const imprint = publication?.[2] || '';
  const year = imprint.match(/(?:^|,\s*)(\d{4})(?:\s*\[[^\]]*\])?\s*$/);
  const publisher = year ? imprint.slice(0, year.index).replace(/,\s*$/, '') : imprint.replace(/,\s*\d*\s*$/, '');
  if (!/\p{L}/u.test(publisher)) problems.push('publisher');
  if (!year) problems.push('publication year');
  return problems;
}

export function quoteBlocks(paragraphs) {
  const blocks = [];
  let current;
  for (const p of paragraphs) {
    if (p.kind === 'empty') continue;
    if (p.kind !== 'quote') { current = undefined; continue; }
    if (!current) { current = []; blocks.push(current); }
    current.push(p);
  }
  return blocks;
}
