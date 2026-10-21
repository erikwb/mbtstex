import { isBibleEdition, SCRIPTURE_CITATION } from './scripture.js';
import { ibidUse } from './citations.js';

const normalize = text => text.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const titleKey = text => normalize(text).replace(/^(?:a|an|the) /, '');
const locator = /^(?:\d+[a-z]?(?:\s*[:–-]\s*\d+[a-z]?)*|[ivxlcdm]+)(?:\s*,\s*(?:\d+[a-z]?(?:\s*[:–-]\s*\d+[a-z]?)*|[ivxlcdm]+))*$/;
const letters = text => /\p{L}/u.test(text || '');
const cleanTitle = text => text.trim().replace(/^[“"]|[,”".]+$/g, '').trim();
const unsupported = /\b(?:review of|(?:PhD|DMin|DEdMin|DCoun) diss\.|dissertation|lecture notes|interview|personal communication|edited by|trans\.|translated by|repr\.)(?=\s|$|[,.(])|[”"]\s*,?\s+in\s/i;

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
  let value = text.trim(), truncated = / et al\.$/i.test(value);
  value = value.replace(/ et al\.$/i, '');
  if (bibliography) {
    const match = value.match(/^([^,]+),\s*(.+)$/);
    if (!match) return null;
    // Initials remain in the given name. Subsequent authors use natural order.
    const rest = match[2].split(/,\s*(?:and\s+)?|\s+and\s+/);
    const first = person(rest.shift().trim() + ' ' + match[1].trim(), match[1].trim());
    const list = [first, ...rest.map(n => person(n))];
    return list.every(Boolean) && list.length <= 3 ? { list, truncated } : null;
  }
  if (value.includes(',') && !/\band\b/.test(value)) return null;
  const list = value.split(/,\s*(?:and\s+)?|\s+and\s+/).map(n => person(n));
  return list.every(Boolean) && list.length <= 3 ? { list, truncated } : null;
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
  return { type: 'book', form: 'full', authors: h.authors, title: clean, edition, ...pub,
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
  const pages = tail.match(/^\s*:\s*([\divxlcdm][\divxlcdm ,:–-]*)/i)?.[1]?.trim();
  // Online journal examples in the manual may have no pagination. Do not
  // manufacture missing-page errors when an access medium is supplied.
  const online = /https?:\/\/|\bdoi\b|\b(?:JSTOR|ATLA|EBSCO|ProQuest)\b/i.test(tail);
  if (!pages && !online) missing.push(bibliography ? 'article page range (if paginated)' : 'cited page (if paginated)');
  return { type: 'journal', form: 'full', authors: h.authors, title: article, journal: journalText,
    volume: volume?.[1] || '', issue: volume?.[2]?.trim() || '', year, missing, p: v.p, text: part.text, quotedArticle: quoted,
    spans: [span(articleStart, article, false, 'article title'), span(journalStart, journalText, true, 'journal title')] };
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
  const quoted = rest.match(/^[“"]([^”"]+)[”"],?\s*(.+)$/s);
  if (quoted && locator.test(quoted[2]) && (/,$/.test(quoted[1]) || /^[“"][^”"]+[”"],/.test(rest))) {
    const start = part.start + text.indexOf(rest, first + 1) + 1;
    return { form: 'short', author, title: cleanTitle(quoted[1]), quoted: true,
      spans: [span(start, cleanTitle(quoted[1]), false, 'short title')], p, text: part.text };
  }
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
  const prefix = !bibliography && part.text.match(/^(?:See(?: also)?|Cf\.)\s+/i);
  if (prefix) part = { text: part.text.slice(prefix[0].length), start: part.start + prefix[0].length };
  return journal(v, part, bibliography, previous) || book(v, part, bibliography, previous) ||
    (!bibliography && short(part, v.p));
}

function sameAuthors(a, b) {
  const names = a.list.map(p => p.key), other = b.list.map(p => p.key);
  const count = a.truncated || b.truncated ? Math.min(names.length, other.length) : Math.max(names.length, other.length);
  return names.slice(0, count).every((n, i) => n === other[i]) && count <= names.length && count <= other.length;
}
function sameWork(a, b) { return a.type === b.type && titleKey(a.title) === titleKey(b.title) && sameAuthors(a.authors, b.authors); }
function sameSource(a, b) {
  return sameWork(a, b) && ['year', 'edition', 'publisher', 'journal', 'volume', 'issue'].every(k => !a[k] || !b[k] || normalize(a[k]) === normalize(b[k]));
}
function sourceKey(r) {
  return JSON.stringify([r.type, r.authors.list.map(a => a.key), titleKey(r.title), ...['year', 'edition', 'publisher', 'journal', 'volume', 'issue'].map(k => normalize(r[k] || ''))]);
}
function typography(v, record) {
  const problems = [];
  for (const range of record.spans || []) {
    const runs = v.runs.filter(r => r.start < range.end && r.end > range.start && letters(v.text.slice(Math.max(range.start, r.start), Math.min(range.end, r.end))));
    if (runs.some(r => !!r.italic !== range.italic)) problems.push(`${range.label} should be ${range.italic ? 'italic' : 'upright'}`);
  }
  if (record.quotedBook) problems.push('book title should not have enclosing quotation marks');
  if (record.type === 'journal' && !record.quotedArticle) problems.push('article title needs quotation marks');
  return problems;
}
function looksLikeCitation(text) { return /https?:\/\/|\bdoi\b|\([^)]*\d{4}|[“"][^”"]+[”"]\s*[,.)]|^[\p{L} .’-]+,\s*\d/u.test(text); }

export function sourceCitationChecks(model) {
  const checks = [], unverified = [], bibliography = [], fullNotes = [], sequence = [];
  const add = (id, ok, record, observed) => checks.push({ id, ok, p: record.p, observed });
  function inspect(v, part, isBibliography, previous) {
    const record = parse(v, part, isBibliography, previous);
    if (record?.exempt) return null;
    if (!record) {
      if (isBibliography || looksLikeCitation(part.text)) unverified.push({ p: v.p, text: part.text,
        detail: 'This source form or its author/title boundary was not recognized. Full/short form, publication fields, title formatting, and bibliography matching were not verified for this citation.' });
      return null;
    }
    record.view = v;
    if (record.form === 'full') {
      add('citation-fields', !record.missing.length, record, `Missing or unrecognized fields in this ${record.type} citation: ${record.missing.join('; ')}. Verify against the source.`);
      const problems = typography(v, record);
      add('citation-titles', !problems.length, record, `For “${record.title}”: ${problems.join('; ')}.`);
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
    for (const part of segments(v.text)) {
      const record = inspect(v, part, false);
      if (!record) continue;
      sequence.push(record);
      if (record.form === 'full') fullNotes.push(record);
    }
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
      add('citation-bibliography', matches.length === 1, record, matches.length ?
        `More than one bibliography entry could match “${record.title}”. Review duplicate or indistinguishable entries.` :
        `No recognizable bibliography entry matches “${record.title}” and its author/publication details. An unsupported entry may need manual matching.`);
      continue;
    }
    const candidates = catalogue.filter(r => normalize(r.authors.list[0].surname) === normalize(record.author) &&
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
      if (source.type === 'journal' && !record.quoted) problems.push('short article title needs quotation marks');
      add('citation-titles', !problems.length, record, `For this short title: ${problems.join('; ')}.`);
    }
  }
  return { checks, unverified };
}
