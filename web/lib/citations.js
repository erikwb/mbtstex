// Conservative source recognition for Ibid. antecedents. This is not a full
// citation validator: publication facts and page-level placement are separate.
const normalize = text => text.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const locator = '(?:\\d+[a-z]?(?:\\s*[:–-]\\s*\\d+[a-z]?)*|[ivxlcdm]+)(?:\\s*,\\s*(?:\\d+[a-z]?(?:\\s*[:–-]\\s*\\d+[a-z]?)*|[ivxlcdm]+))*';
const ibidForm = new RegExp(`^Ibid\\.(?:,\\s+${locator}\\.)?(?:$|;|\\s+(?=[\\p{Lu}“"]))`, 'u');
const singleIbid = new RegExp(`^Ibid\\.(?:,\\s+${locator}\\.)?$`, 'u');

export function ibidUse(text) {
  const value = text.trim();
  return { present: /^ibid\b/i.test(value), valid: ibidForm.test(value), single: singleIbid.test(value) };
}

function source(author, title, publication) {
  if (!/^[\p{L}\p{M} .’'&-]+$/u.test(author) || !/\s/.test(author.trim()) || !/\p{L}/u.test(title)) return null;
  const surname = author.trim().split(/\s+/).at(-1);
  return { author: author.trim(), surname, title: title.trim(), key: JSON.stringify([author, title, publication].map(normalize)) };
}

export function fullSource(text) {
  const value = text.trim();
  // An entire ordinary book note, with one publication group and optional
  // locator. Commentary, multiple sources, and unfamiliar forms stay unknown.
  const book = value.match(new RegExp(`^([^,;]+), ([^();]+?) \\(([^():;]+): ([^();]+), (\\d{4}[a-z]?)\\)(?:,\\s*${locator})?\\.$`, 'u'));
  if (book) return source(book[1], book[2], book.slice(3).join(' '));
  const journal = value.match(new RegExp(`^([^,;]+), [“"]([^”";]+)[”"],? [^();]+ \\d+(?:, no\\. \\d+)? \\([^();]*\\d{4}\\): ${locator}\\.$`, 'u'));
  return journal ? source(journal[1], journal[2], value.slice(0, value.lastIndexOf('):'))) : null;
}

export function shortSource(text, known) {
  const match = text.trim().match(new RegExp(`^([^,;]+), (?:([^;]+?), )?${locator}\\.$`, 'u'));
  if (!match) return null;
  const author = normalize(match[1]);
  const title = match[2] && normalize(match[2]).replace(/^(?:a|an|the) /, '');
  const candidates = [...known.values()].filter(item => normalize(item.surname) === author &&
    (!title || (' ' + normalize(item.title).replace(/^(?:a|an|the) /, '') + ' ').includes(' ' + title + ' ')));
  return candidates.length === 1 ? candidates[0] : null;
}

export function ibidChecks(model) {
  const notes = new Map(model.footnotes.map(note => [note.id, note]));
  const order = model.paragraphs.flatMap(p => p.refs.map(ref => ref.id));
  const known = new Map(), results = [];
  let previous;
  for (const [index, id] of order.entries()) {
    const note = notes.get(id);
    if (!note) { previous = null; continue; }
    const use = ibidUse(note.text);
    if (use.present) {
      results.push({ note, valid: use.valid, resolved: !!previous,
        reason: index === 0 ? 'This is the first referenced footnote, so there is no preceding note.' :
          !previous ? 'The immediately preceding note could not be resolved to one source. It may contain commentary, multiple sources, or an unsupported citation form.' : '',
        source: previous });
      if (!use.valid || !use.single) previous = null;
    } else {
      previous = fullSource(note.text) || shortSource(note.text, known);
      if (previous) known.set(previous.key, previous);
    }
  }
  for (const note of model.footnotes) if (!order.includes(note.id) && ibidUse(note.text).present) {
    results.push({ note, valid: ibidUse(note.text).valid, resolved: false, reason: 'This note has no body reference, so its preceding note cannot be established.' });
  }
  return results;
}
