import { isBibleEdition, SCRIPTURE_CITATION } from './scripture.js';
import { ibidUse } from './citations.js';
import { citationMechanics } from './citation-mechanics.js';

const normalize = text => text.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const titleKey = text => normalize(text).replace(/^(?:a|an|the) /, '');
const locator = /^(?:\d+[a-z]?(?:\s*[:–-]\s*\d+[a-z]?)*|[ivxlcdm]+)(?:\s*,\s*(?:\d+[a-z]?(?:\s*[:–-]\s*\d+[a-z]?)*|[ivxlcdm]+))*$/;
const letters = text => /\p{L}/u.test(text || '');
const cleanTitle = text => text.trim().replace(/^[“"]|[,”".]+$/g, '').trim();
const unsupported = /\b(?:review of|(?:PhD|DMin|DEdMin|DCoun) diss\.|dissertation|lecture notes|interview|personal communication|edited by|trans\.|translated by|repr\.)(?=\s|$|[,.(])|\((?:blog|podcast|video)\)|[”"]\s*,?\s+in\s/i;

function view(paragraphs) {
  let offset = 0;
  const runs = [];
  for (const p of paragraphs) {
    let start = offset;
    for (const run of p.runs) { runs.push({ ...run, start, end: start + run.text.length }); start += run.text.length; }
    offset += p.text.length + 1;
  }
  return { text: paragraphs.map(p => p.text).join('\n'), runs, p: paragraphs[0] };
}

function trimPart(text, start = 0) {
  const leading = text.length - text.trimStart().length;
  return { text: text.trim(), start: start + leading };
}

// Semicolons inside publication parentheses or quoted titles belong to the
// source, not the separator between sources. Preserve offsets for typography.
function segments(text) {
  const parts = [];
  let begin = 0, depth = 0, quote = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = ''; continue; }
    if (c === '“' || c === '"') { quote = c === '“' ? '”' : '"'; continue; }
    if (/^https?:\/\//i.test(text.slice(i, i + 8))) {
      const url = text.slice(i).match(/^\S+/)[0];
      // A terminal semicolon followed by whitespace can separate citations;
      // semicolons within a URL are part of its path/query.
      i += url.replace(/;$/, '').length - 1; continue;
    }
    if (c === '(') depth++;
    if (c === ')') depth = Math.max(0, depth - 1);
    if (c === ';' && !depth) { parts.push(trimPart(text.slice(begin, i), begin)); begin = i + 1; }
  }
  parts.push(trimPart(text.slice(begin), begin));
  return parts.filter(p => p.text);
}

function person(name, surname) {
  const value = name.trim();
  if (!/^[\p{L}\p{M} .’'-]+$/u.test(value) || !/\s/.test(value) || value.split(/\s+/).length > 8) return null;
  return { name: value, key: normalize(value), surname: surname || value.split(/\s+/).at(-1) };
}

function authors(text, bibliography = false) {
  let value = text.trim(), truncated = / et al\.?$/i.test(value);
  value = value.replace(/ et al\.?$/i, '');
  if (bibliography) {
    const match = value.match(/^([^,]+),\s*(.+)$/);
    if (!match) return null;
    // Initials remain in the given name. Subsequent authors use natural order.
    const rest = match[2].split(/,\s*(?:and\s+)?|\s+and\s+/);
    const first = person(rest.shift().trim() + ' ' + match[1].trim(), match[1].trim());
    const list = [first, ...rest.map(n => person(n))];
    return list.every(Boolean) && list.length <= 50 ? { list, truncated, raw: text, bibliography } : null;
  }
  if (value.includes(',') && !/\band\b/.test(value)) return null;
  const list = value.split(/,\s*(?:and\s+)?|\s+and\s+/).map(n => person(n));
  return list.every(Boolean) && list.length <= 50 ? { list, truncated, raw: text, bibliography } : null;
}

function nameBoundary(prefix, bibliography) {
  const delimiter = prefix.match(/[,.]\s*$/)?.[0];
  if (!delimiter) return null;
  const name = prefix.slice(0, -delimiter.length);
  const correct = authors(name, bibliography), reversed = !correct && authors(name, !bibliography);
  // “Anne Aster, Unquoted Article” is not safely distinguishable from an
  // inverted author at an italic journal boundary. Leave that split to the
  // ordinary article recognizer instead of absorbing its title as a name.
  const parsed = correct || (reversed && (bibliography || !/\s/.test(reversed.list[0].surname)) && reversed);
  return parsed ? { authors: parsed, nameOrderWrong: parsed.bibliography !== bibliography,
    delimiterWrong: delimiter.trim() !== (bibliography ? '.' : ',') } : null;
}

function italicStart(v, start, end) {
  return v.runs.find(r => r.italic && r.start >= start && r.start < end && letters(r.text))?.start;
}

function head(v, part, bibliography, previous) {
  const text = part.text;
  if (bibliography && /^______\.\s+/.test(text)) {
    const length = text.match(/^______\.\s+/)[0].length;
    return previous?.authors ? { authors: previous.authors, rest: text.slice(length), start: part.start + length } : null;
  }
  // Quoted titles and italicized book titles give a safe boundary at which to
  // review name order and the note/bibliography delimiter independently.
  const quoted = text.search(/[“"]/);
  const italic = italicStart(v, part.start, part.start + text.length);
  for (const at of [quoted < 0 ? undefined : part.start + quoted, italic]) {
    if (at === undefined) continue;
    const names = nameBoundary(v.text.slice(part.start, at), bibliography);
    if (names) return { ...names, rest: v.text.slice(at, part.start + text.length), start: at };
  }
  if (!bibliography) {
    const commas = [...text.matchAll(/,\s+/g)].map(m => m.index);
    const italics = italicStart(v, part.start, part.start + text.length);
    if (italics !== undefined) {
      const prefix = v.text.slice(part.start, italics);
      const parsed = /,\s*$/.test(prefix) && authors(prefix.replace(/,\s*$/, ''));
      if (parsed) return { authors: parsed, rest: v.text.slice(italics, part.start + text.length), start: italics };
    }
    for (const index of commas.reverse()) {
      const parsed = authors(text.slice(0, index));
      if (parsed) {
        const after = trimPart(text.slice(index + 1), part.start + index + 1);
        return { authors: parsed, rest: after.text, start: after.start };
      }
    }
    return null;
  }
  const italics = italicStart(v, part.start, part.start + text.length);
  if (italics !== undefined) {
    const prefix = v.text.slice(part.start, italics);
    const parsed = /\.\s*$/.test(prefix) && authors(prefix.replace(/\.\s*$/, ''), true);
    if (parsed) return { authors: parsed, rest: v.text.slice(italics, part.start + text.length), start: italics };
  }
  // Article quotation marks provide a boundary even with initialed authors.
  const quote = text.search(/[“"]/);
  if (quote >= 0 && /\.\s*$/.test(text.slice(0, quote))) {
    const parsed = authors(text.slice(0, quote).replace(/\.\s*$/, ''), true);
    if (parsed) return { authors: parsed, rest: text.slice(quote), start: part.start + quote };
  }
  const end = text.indexOf('. ');
  if (end < 0 || /\b(?:[A-Za-z]|Jr|Sr|eds?)$/.test(text.slice(0, end))) return null;
  const parsed = authors(text.slice(0, end), true);
  return parsed ? { authors: parsed, rest: text.slice(end + 2), start: part.start + end + 2 } : null;
}

function publication(value) {
  const colon = value.indexOf(':');
  const date = value.match(/(?:^|,\s*)(\d{4}[a-z]?|n\.d\.)\s*$/i);
  const publisherEnd = date ? date.index : value.length;
  const city = colon < 0 ? '' : value.slice(0, colon).trim();
  const publisher = colon < 0 ? '' : value.slice(colon + 1, publisherEnd).trim().replace(/,\s*$/, '');
  const missing = [];
  if (!letters(city)) missing.push('publication city');
  if (!letters(publisher)) missing.push('publisher');
  if (!date) missing.push('publication year');
  return { city, publisher, year: date?.[1] || '', missing };
}

function span(start, text, italic, label) { return { start, end: start + text.length, italic, label }; }

function book(v, part, bibliography, previous) {
  const h = head(v, part, bibliography, previous);
  if (!h) return null;
  let match, title, imprint, tail, edition = '';
  if (bibliography) {
    match = h.rest.match(/^(.+?)\.\s+([^()]*:[^()]*)\.?$/s);
    if (!match) return null;
    title = match[1]; imprint = match[2].replace(/\.$/, ''); tail = '';
    const ed = imprint.match(/^((?:\d+(?:st|nd|rd|th)|Rev\.) ed\.)\s*/i);
    if (ed) { edition = ed[1]; imprint = imprint.slice(ed[0].length); }
  } else {
    match = h.rest.match(/^([^()]+?)\s*\(([^()]*)\)(.*)$/s);
    if (!match || (!match[2].includes(':') && !/\d{4}/.test(match[2]))) return null;
    title = match[1]; imprint = match[2]; tail = match[3];
    const ed = title.match(/,\s*((?:\d+(?:st|nd|rd|th)|rev\.) ed\.)$/i);
    if (ed) { edition = ed[1]; title = title.slice(0, ed.index); }
    // Do not swallow a second source without its required separator.
    if (/\([^()]*:[^()]*\)/.test(tail)) return null;
  }
  if (unsupported.test(h.rest) || /^(?:ed\.|eds\.),/.test(title)) return null;
  if (!letters(title)) return null;
  const pub = publication(imprint);
  const clean = cleanTitle(title);
  if (isBibleEdition(clean)) return { exempt: true };
  return { type: 'book', form: 'full', authors: h.authors, title: clean, edition, ...pub, head: h, bibliography, tail,
    spans: [span(h.start, title, true, 'book title')], quotedBook: /^[“"]/.test(title), p: v.p, text: part.text };
}

function journal(v, part, bibliography, previous) {
  const h = head(v, part, bibliography, previous);
  if (!h || unsupported.test(h.rest)) return null;
  let article, journalText, articleStart = h.start, journalStart, quoted = false;
  const quote = h.rest.match(/^[“"]([^”"]+)[”"][,.]?\s*/);
  let remainder;
  if (quote) {
    article = cleanTitle(quote[1]); articleStart++;
    journalStart = h.start + quote[0].length; remainder = h.rest.slice(quote[0].length); quoted = true;
  } else {
    // Missing article quotes can still be recognized when the journal itself
    // has an italic style boundary. Otherwise the title split is ambiguous.
    const firstItalic = italicStart(v, h.start, part.start + part.text.length);
    if (firstItalic === undefined || firstItalic <= h.start) return null;
    article = cleanTitle(v.text.slice(h.start, firstItalic)); journalStart = firstItalic;
    remainder = v.text.slice(firstItalic, part.start + part.text.length);
  }
  const match = remainder.match(/^([^()]*)\(([^()]*)\)(.*)$/s);
  if (!match || match[1].includes(':')) return null;
  const before = match[1].trim();
  const volume = before.match(/\s+(\d+)(?:,?\s+no\.\s*([^,]+))?\s*$/i);
  journalText = volume ? before.slice(0, volume.index).trim() : before;
  if (!letters(article) || !letters(journalText)) return null;
  const year = match[2].match(/\b\d{4}[a-z]?\b/)?.[0] || '';
  const missing = [];
  if (!volume) missing.push('journal volume');
  if (!year) missing.push('publication year');
  const tail = match[3];
  if (/\([^()]*\d{4}[^()]*\)/.test(tail)) return null;
  const pages = tail.match(/^\s*:\s*([\divxlcdm][\divxlcdm ,:–-]*)/i)?.[1]?.trim().replace(/,$/, '');
  // Online journal examples in the manual may have no pagination. Do not
  // manufacture missing-page errors when an access medium is supplied.
  const online = /https?:\/\/|\bdoi\b|\b(?:JSTOR|ATLA|EBSCO|ProQuest)\b/i.test(tail);
  if (!pages && !online) missing.push(bibliography ? 'article page range (if paginated)' : 'cited page (if paginated)');
  return { type: 'journal', form: 'full', authors: h.authors, title: article, journal: journalText, head: h, bibliography, tail, pages,
    volume: volume?.[1] || '', issue: volume?.[2]?.trim() || '', year, missing, p: v.p, text: part.text, quotedArticle: quoted,
    spans: [span(articleStart, article, false, 'article title'), span(journalStart, journalText, true, 'journal title')] };
}

function chapter(v, part, bibliography, previous) {
  const h = head(v, part, bibliography, previous);
  if (!h || !/\bin\s/i.test(h.rest) || /\b(?:trans\.|translated by|repr\.)/i.test(h.rest)) return null;
  const quoted = h.rest.match(/^[“"]([^”"]+)[”"][,.]?\s+(in)\s+/i);
  const plain = !quoted && h.rest.match(/^(.+?)[,.]\s+(in)\s+/i);
  const opening = quoted || plain;
  if (!opening) return null;
  const title = cleanTitle(opening[1]), start = h.start + opening[0].length;
  const remainder = h.rest.slice(opening[0].length);
  const match = bibliography ? (remainder.match(/^(.+?,\s*[\divxlcdm][\divxlcdm :–-]*)\.\s+([^()]*:[^()]*)\.?$/is) ||
    remainder.match(/^(.+?)\.\s+([^()]*:[^()]*)\.?$/s)) : remainder.match(/^([^()]+)\s*\(([^()]*)\)(.*)$/s);
  if (!match) return null;
  let description = match[1].trim(), pages = '', editorLabel = '';
  const imprint = match[2].replace(/\.$/, ''), tail = bibliography ? '' : match[3];
  if (/\([^()]*:[^()]*\)/.test(tail)) return null;
  if (bibliography) {
    const range = description.match(/,\s*([\divxlcdm][\divxlcdm :–-]*)$/i);
    if (range) { pages = range[1]; description = description.slice(0, range.index); }
  }
  const editor = description.match(/,\s*(edited by|eds?\.)\s*(.*)$/i);
  const container = (editor ? description.slice(0, editor.index) : description).trim();
  const names = editor && authors(editor[2]);
  if (editor) editorLabel = editor[1];
  if (!letters(container) || !letters(title)) return null;
  const pub = publication(imprint), missing = [...pub.missing];
  if (!names) missing.push('editor name(s)');
  if (bibliography && !pages) missing.push('chapter page range');
  return { type: 'chapter', form: 'full', authors: h.authors, title, container,
    ...pub, missing, editors: names?.list.map(n => n.key).join(';') || '',
    head: h, bibliography, tail, pages, editorLabel, inLabel: opening[2], quotedArticle: !!quoted,
    spans: [span(h.start + (quoted ? 1 : 0), title, false, 'chapter title'), span(start, container, true, 'containing book title')], p: v.p, text: part.text };
}

function website(v, part, bibliography, previous) {
  const urls = [...part.text.matchAll(/https?:\/\/[^\s<>]+/gi)];
  if (urls.length !== 1) return null;
  const urlMatch = urls[0];
  let h = head(v, part, bibliography, previous);
  if (!h) {
    const at = part.text.search(/[“"]/);
    if (at < 0) return null;
    const label = part.text.slice(0, at).trim().replace(/[,.]$/, '').trim();
    if (label && !/^[\p{L}\p{M} .’'&,-]+$/u.test(label)) return null;
    h = { authors: { list: label ? [{ name: label, key: normalize(label), surname: label }] : [], truncated: false, nonPersonal: true },
      rest: part.text.slice(at), start: part.start + at };
  }
  // An uninverted web author can be an organization. Do not infer that a
  // two-word organization label is a personal name with incorrect order.
  if (bibliography && h.nameOrderWrong) h = { ...h, nameOrderWrong: false };
  const opening = h.rest.match(/^[“"]([^”"]+)[”"][,.]?\s*/);
  if (!opening) return null;
  const url = urlMatch[0].replace(/[.,;]$/, '');
  let urlKey;
  try { urlKey = new URL(url).href; } catch { return null; }
  const metadata = v.text.slice(h.start + opening[0].length, part.start + urlMatch.index).trim().replace(/[,.]$/, '');
  // Online journals, chapters, blogs, and audiovisual media have their own
  // patterns. A URL alone must not reclassify them as ordinary website content.
  if (/\([^)]*\d{4}[^)]*\)|^in\s|:\s*[^:]+,\s*\d{4}|\b(?:blog|podcast|video|YouTube|Facebook|Twitter|Instagram)\b/i.test(metadata)) return null;
  const date = metadata.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s*\d{4}|\b\d{4}-\d{2}-\d{2}\b/i);
  const beforeDate = (date ? metadata.slice(0, date.index) : metadata).trim().replace(/[,.]$/, '');
  const site = beforeDate.split(bibliography ? /\.\s+/ : /,\s+/)[0]?.trim() || '';
  const missing = [];
  if (!letters(site)) missing.push('website name or description (if available)');
  if (!date) missing.push('publication/revision date (if available)');
  const title = cleanTitle(opening[1]);
  return { type: 'website', form: 'full', authors: h.authors, title, url: urlKey, site, year: date?.[0].match(/\d{4}/)?.[0] || '',
    missing, head: h, bibliography, metadata, quotedArticle: true,
    spans: [span(h.start + 1, title, false, 'web article title'), span(h.start + opening[0].length, site, false, 'website name')], p: v.p, text: part.text };
}

function short(part, p) {
  const text = part.text.replace(/\.$/, '');
  const commas = [...text.matchAll(/,\s*/g)].map(m => m.index);
  const first = commas.shift();
  if (first === undefined) return null;
  const author = text.slice(0, first).trim();
  if (!/^[\p{L}\p{M} .’'-]+$/u.test(author) || author.split(/\s+/).length > 4) return null;
  const rest = text.slice(first + 1).trim();
  if (locator.test(rest)) return { form: 'short', author, title: '', p, text: part.text };
  if (/^[“"][^”"]+[”"]$/.test(rest)) {
    const title = cleanTitle(rest), start = part.start + text.indexOf(rest, first + 1) + 1;
    return { form: 'short', author, title, quoted: true, spans: [span(start, title, false, 'short title')], p, text: part.text };
  }
  const quoted = rest.match(/^[“"]([^”"]+)[”"],?\s*(.+)$/s);
  if (quoted && locator.test(quoted[2]) && (/,$/.test(quoted[1]) || /^[“"][^”"]+[”"],/.test(rest))) {
    const start = part.start + text.indexOf(rest, first + 1) + 1;
    return { form: 'short', author, title: cleanTitle(quoted[1]), quoted: true,
      spans: [span(start, cleanTitle(quoted[1]), false, 'short title')], p, text: part.text };
  }
  if (/^[“"]/.test(rest)) return null;
  for (const index of commas) {
    if (!locator.test(text.slice(index + 1).trim())) continue;
    const raw = text.slice(first + 1, index).trim();
    if (!letters(raw) || /[();]/.test(raw)) continue;
    const start = part.start + text.indexOf(raw, first + 1);
    return { form: 'short', author, title: cleanTitle(raw), quoted: /^[“"]/.test(raw),
      spans: [span(start, raw, true, 'short title')], p, text: part.text };
  }
  return null;
}

function exempt(text) {
  return /^(?:unless otherwise|all (?:bible|scripture|biblical)|scripture (?:quotations|references)|bible (?:quotations|references))/i.test(text) ||
    isBibleEdition(text) || (SCRIPTURE_CITATION.test(text) && !/\([^)]*:\s*\p{L}/u.test(text) && !/\d{4}|https?:\/\//.test(text));
}

function parse(v, part, bibliography, previous) {
  if (exempt(part.text)) return { exempt: true };
  if (!bibliography && ibidUse(part.text).present) return { exempt: true };
  const prefix = !bibliography && part.text.match(/^(?:See(?: also)?|Cf\.|and)\s+/i);
  if (prefix) part = { text: part.text.slice(prefix[0].length), start: part.start + prefix[0].length };
  return chapter(v, part, bibliography, previous) || journal(v, part, bibliography, previous) || website(v, part, bibliography, previous) || book(v, part, bibliography, previous) ||
    (!bibliography && short(part, v.p));
}

function sameAuthors(a, b) {
  const names = a.list.map(p => p.key), other = b.list.map(p => p.key);
  const count = a.truncated || b.truncated ? Math.min(names.length, other.length) : Math.max(names.length, other.length);
  return names.slice(0, count).every((n, i) => n === other[i]) && count <= names.length && count <= other.length;
}
function sameWork(a, b) { return a.type === b.type && titleKey(a.title) === titleKey(b.title) && sameAuthors(a.authors, b.authors); }
function sameSource(a, b) {
  return sameWork(a, b) && (!a.url || !b.url || a.url === b.url) &&
    ['year', 'edition', 'publisher', 'journal', 'volume', 'issue', 'container', 'editors'].every(k => !a[k] || !b[k] || normalize(a[k]) === normalize(b[k]));
}
function sourceKey(r) {
  return JSON.stringify([r.type, r.authors.list.map(a => a.key), titleKey(r.title), r.url, ...['year', 'edition', 'publisher', 'journal', 'volume', 'issue', 'container', 'editors'].map(k => normalize(r[k] || ''))]);
}
function typography(v, record) {
  const problems = [];
  for (const range of record.spans || []) {
    const runs = v.runs.filter(r => r.start < range.end && r.end > range.start && letters(v.text.slice(Math.max(range.start, r.start), Math.min(range.end, r.end))));
    if (runs.some(r => !!r.italic !== range.italic)) problems.push(`${range.label} should be ${range.italic ? 'italic' : 'upright'}`);
  }
  if (record.quotedBook) problems.push('book title should not have enclosing quotation marks');
  if (['journal', 'chapter'].includes(record.type) && !record.quotedArticle) problems.push('article/chapter title needs quotation marks');
  return problems;
}
function looksLikeCitation(text) { return /https?:\/\/|\bdoi\b|\([^)]*\d{4}|[“"][^”"]+[”"]\s*[,.)]|[“"][^”"]+[”"][\s\S]*\b\d{4}\b|^[\p{L} .’-]+,\s*\d/u.test(text); }

function joinedSources(v, part) {
  // Flag a missing semicolon only when both sides independently resolve to a
  // full source, with no explanatory prose trailing the first source.
  for (const match of [...part.text.matchAll(/[.,]\s+(?=(?:and\s+)?[\p{Lu}])/gu)].slice(0, 50)) {
    const left = trimPart(part.text.slice(0, match.index + 1), part.start);
    const right = trimPart(part.text.slice(match.index + match[0].length), part.start + match.index + match[0].length);
    const a = parse(v, left, false), b = parse(v, right, false);
    if (a?.form !== 'full' || b?.form !== 'full') continue;
    if (!['book', 'chapter', 'journal'].includes(a.type) || !/^[,:]?\s*[\divxlcdm ,:–-]*[.,]?$/i.test((a.tail || '').trim())) continue;
    return [left, right];
  }
  return null;
}

export function sourceCitationChecks(model) {
  const checks = [], unverified = [], bibliography = [], fullNotes = [], sequence = [];
  const add = (id, ok, record, observed) => checks.push({ id, ok, p: { ...record.p, text: record.text }, observed });
  function inspect(v, part, isBibliography, previous) {
    const record = parse(v, part, isBibliography, previous);
    if (record?.exempt) return null;
    if (!record) {
      if (isBibliography || looksLikeCitation(part.text)) unverified.push({ p: v.p, text: part.text,
        detail: 'This source form or its author/title boundary was not recognized. Full/short form, publication fields, title formatting, and bibliography matching were not verified for this citation.' });
      return null;
    }
    record.view = v;
    record.bibliography = isBibliography;
    if (record.form === 'full') {
      add('citation-fields', !record.missing.length, record, `Missing or unrecognized fields in this ${record.type} citation: ${record.missing.join('; ')}. Verify against the source.`);
      const problems = typography(v, record);
      add('citation-titles', !problems.length, record, `For “${record.title}”: ${problems.join('; ')}.`);
      for (const result of citationMechanics(record)) add(result.id, result.ok, record, result.observed);
    }
    return record;
  }
  let previous;
  for (const p of model.paragraphs.filter(p => p.kind === 'bibliography')) {
    const v = view([p]); const record = inspect(v, trimPart(v.text), true, previous);
    if (record) bibliography.push(record);
    previous = record;
  }
  const notes = new Map(model.footnotes.map(n => [n.id, n]));
  const ordered = [...new Set(model.paragraphs.flatMap(p => p.refs.map(r => r.id)))];
  for (const id of ordered) {
    const note = notes.get(id);
    if (!note) continue;
    const v = view(note.paragraphs);
    const parts = segments(v.text), expanded = [];
    let separated = true;
    for (const part of parts) {
      const joined = joinedSources(v, part);
      if (joined) {
        separated = false;
        add('citation-separators', false, { p: v.p, text: part.text }, 'Two recognizable full citations are joined without a semicolon. Separate the sources with a semicolon.');
        expanded.push(...joined);
      } else expanded.push(part);
    }
    let recognized = 0;
    for (const [index, part] of expanded.entries()) {
      const record = inspect(v, part, false);
      if (!record) continue;
      recognized++;
      if (parts.length > 1 && index < expanded.length - 1 && /^[,:]?\s*[\divxlcdm ,:–-]*\.$/i.test((record.tail || '').trim())) {
        separated = false;
        add('citation-separators', false, record, 'A period appears after the source locator immediately before a source separator. Use the semicolon alone between citations.');
      }
      sequence.push(record);
      if (record.form === 'full') fullNotes.push(record);
    }
    if (separated && parts.length > 1 && recognized > 1) add('citation-separators', true, { p: v.p, text: v.text }, 'Recognized sources are separated by semicolons.');
  }
  // Inspect the whole paper before resolving short notes: another work by the
  // same author can appear later, and still makes a surname-only note ambiguous.
  const catalogue = [...new Map([...fullNotes, ...bibliography].map(r => [sourceKey(r), r])).values()];
  const seenFull = [];
  for (const record of sequence) {
    if (record.form === 'full') {
      if (!seenFull.some(s => sameSource(s, record))) add('citation-first-full', true, record, 'The first recognized citation uses a full source form.');
      seenFull.push(record);
      const matches = bibliography.filter(b => sameSource(record, b));
      add(record.type === 'website' ? 'citation-web-bibliography' : 'citation-bibliography', matches.length === 1, record, record.type === 'website' && !matches.length ?
        `No matching bibliography entry was recognized for “${record.title}”. Website content needs one only if it is critical to the paper or used frequently; decide from the paper’s context.` : matches.length ?
        `More than one bibliography entry could match “${record.title}”. Review duplicate or indistinguishable entries.` :
        `No recognizable bibliography entry matches “${record.title}” and its author/publication details. An unsupported entry may need manual matching.`);
      continue;
    }
    const candidates = catalogue.filter(r => normalize(r.authors.list[0]?.surname || '') === normalize(record.author) &&
      (!record.title || (' ' + titleKey(r.title) + ' ').includes(' ' + titleKey(record.title) + ' ')));
    // A bibliography record and note with omitted nonessential details can
    // represent the same source; collapse only mutually compatible candidates.
    const groups = [];
    for (const candidate of candidates) {
      const group = groups.find(g => g.every(r => sameSource(r, candidate)));
      if (group) group.push(candidate); else groups.push([candidate]);
    }
    const resolved = groups.length === 1 ? groups[0] : null;
    add('citation-short', !!resolved, record, groups.length > 1 ?
      `“${record.text}” could refer to ${groups.length} different works or editions. Include enough title/edition information to distinguish them.` :
      'No single source could be recognized for this shortened note. Check the author, short title, and earlier full citation.');
    add('citation-first-full', !!resolved && seenFull.some(s => resolved.some(r => sameSource(s, r))), record,
      'No unambiguous earlier full citation was recognized for this shortened note. A bibliography entry does not replace the first full note.');
    if (resolved && record.title) {
      const source = resolved[0];
      const expectedItalic = source.type === 'book';
      const problems = typography(record.view, { ...record, spans: record.spans.map(s => ({ ...s, italic: expectedItalic })) });
      if (source.type !== 'book' && !record.quoted) problems.push('short article/chapter title needs quotation marks');
      add('citation-titles', !problems.length, record, `For this short title: ${problems.join('; ')}.`);
    }
  }
  for (const record of [...fullNotes, ...bibliography].filter(r => r.type === 'book')) {
    const peers = [...fullNotes, ...bibliography].filter(r => sameSource(record, r));
    const fullLists = peers.filter(r => !r.authors.truncated);
    const count = Math.max(0, ...fullLists.map(r => r.authors.list.length));
    const a = record.authors;
    const problem = record.bibliography && a.truncated ? 'List all book authors in the bibliography instead of using et al.' :
      !record.bibliography && a.truncated && a.list.length !== 1 ? 'Use only the first book author’s name before et al. in the note.' :
      !record.bibliography && !a.truncated && a.list.length >= 4 ? 'For a book with four or more authors, use the first author followed by et al. in the note.' :
      !record.bibliography && a.truncated && count > 0 && count < 4 ? `The matching full author list has ${count} author(s); et al. applies to books with four or more.` :
      !record.bibliography && a.truncated && !count ? 'No complete matching author list was recognized; verify that this book has four or more authors.' : '';
    add('citation-authors', !problem, record, problem);
  }
  return { checks, unverified };
}
