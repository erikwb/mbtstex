// Book contributor clauses are separate from both the book title and imprint.
// Name parsing is supplied by the source recognizer; no publication data is fetched.
const editionStart = /^(\d+(?:st|nd|rd|th) ed\.|rev\. ed\.)\s*/i;
const creditStart = /^(edited by|translated by|eds?\.|trans\.)\s*/i;
const role = label => /^(?:trans\.|translated)/i.test(label) ? 'translator' : 'editor';

function plausibleNames(value, parseNames) {
  const names = parseNames(value);
  if (!names || names.truncated) return null;
  // Periods inside names can be initials or common name particles/suffixes,
  // but a full surname followed by a period ends the contributor clause.
  if (value.split(/[\s,]+/).some(word => word.includes('.') && !/^(?:\p{L}\.)+$|^(?:Jr|Sr|St)\.$/u.test(word))) return null;
  return names;
}

export function bookMetadata(text, start, bibliography, parseNames) {
  const result = { edition: '', credits: [], missing: [], syntax: [], rest: '', restStart: start };
  function addCredit(label, value, offset, prefixLength) {
    const kind = role(label);
    if (result.credits.some(c => c.role === kind)) return false;
    const names = value.trim() ? plausibleNames(value.trim(), parseNames) : null;
    if (value.trim() && !names) return false;
    if (!names) result.missing.push(`${kind} name(s)`);
    const expected = bibliography ? (kind === 'editor' ? 'Edited by' : 'Translated by') : (kind === 'editor' ? 'ed.' : 'trans.');
    if (label !== expected) result.syntax.push(`Use “${expected}” for the ${kind} credit ${bibliography ? 'in the bibliography' : 'after the book title in the note'}.`);
    result.credits.push({ role: kind, label, names, key: names?.list.map(p => p.key).join(';') || '',
      start: offset, end: offset + prefixLength + value.length });
    return true;
  }
  if (!bibliography) {
    const markers = [...text.matchAll(/,\s*((?:\d+(?:st|nd|rd|th)|rev\.) ed\.|edited by|translated by|eds?\.|trans\.)(?=\s|,|$)\s*/gi)];
    result.title = markers.length ? text.slice(0, markers[0].index) : text;
    for (const [index, marker] of markers.entries()) {
      const value = text.slice(marker.index + marker[0].length, markers[index + 1]?.index ?? text.length).trimEnd();
      if (editionStart.test(marker[1])) {
        if (value.trim() || result.edition) return null;
        result.edition = marker[1];
      } else if (!addCredit(marker[1], value, start + marker.index + marker[0].indexOf(marker[1]),
        marker[0].length - marker[0].indexOf(marker[1]))) return null;
    }
    return result;
  }
  let rest = text, offset = start;
  // At most one edition and one clause for each supported contributor role.
  for (let count = 0; count < 4; count++) {
    const edition = rest.match(editionStart);
    if (edition) {
      if (result.edition) return null;
      result.edition = edition[1]; offset += edition[0].length; rest = rest.slice(edition[0].length); continue;
    }
    const credit = rest.match(creditStart);
    if (!credit) break;
    const body = rest.slice(credit[0].length);
    let boundary;
    for (const end of body.matchAll(/\.\s+/g)) {
      const value = body.slice(0, end.index);
      const after = body.slice(end.index + end[0].length);
      if (!editionStart.test(after) && !creditStart.test(after) && !/^[^:()]+:/.test(after)) continue;
      // Preserve initials and St. inside names, while leaving St. Louis in the city.
      if (/(?:^|\s)(?:\p{L}|St)$/u.test(value)) continue;
      if (value.trim() && !plausibleNames(value.trim(), parseNames)) continue;
      boundary = { value, length: end.index + end[0].length }; break;
    }
    if (!boundary || !addCredit(credit[1], boundary.value, offset, credit[0].length)) return null;
    const consumed = credit[0].length + boundary.length;
    rest = rest.slice(consumed); offset += consumed;
  }
  if (creditStart.test(rest) || editionStart.test(rest)) return null;
  result.rest = rest; result.restStart = offset;
  return result;
}
