// Canonical names and SBL forms (manual pp. 115–117), plus a limited set of
// common alternatives for recognition. Alternative forms are not requirements.
const rows = `Genesis|Gen|Ge,Gn
Exodus|Exod|Ex,Exo
Leviticus|Lev|Le,Lv
Numbers|Num|Nu,Nm
Deuteronomy|Deut|Dt
Joshua|Josh|Jos
Judges|Judg|Jdg,Jdgs
Ruth|Ruth|Ru
1 Samuel|1 Sam|1 Sa
2 Samuel|2 Sam|2 Sa
1 Kings|1 Kgs|1 Ki
2 Kings|2 Kgs|2 Ki
1 Chronicles|1 Chr|1 Chron
2 Chronicles|2 Chr|2 Chron
Ezra|Ezra|
Nehemiah|Neh|
Esther|Esth|Est
Job|Job|
Psalm,Psalms|Ps,Pss|
Proverbs|Prov|Pr,Prv
Ecclesiastes|Eccl|Ecc,Eccles
Song of Solomon,Song of Songs|Song|Sg,Cant
Isaiah|Isa|Is
Jeremiah|Jer|Je
Lamentations|Lam|
Ezekiel|Ezek|Eze,Ezk
Daniel|Dan|Dn
Hosea|Hos|
Joel|Joel|Jl
Amos|Amos|Am
Obadiah|Obad|Ob
Jonah|Jonah|Jon
Micah|Mic|
Nahum|Nah|
Habakkuk|Hab|
Zephaniah|Zeph|
Haggai|Hag|
Zechariah|Zech|Zec
Malachi|Mal|
Matthew|Matt|Mt
Mark|Mark|Mk,Mrk
Luke|Luke|Lk
John|John|Jn,Jhn
Acts,Acts of the Apostles|Acts|Ac
Romans|Rom|Ro,Rm
1 Corinthians|1 Cor|1 Co
2 Corinthians|2 Cor|2 Co
Galatians|Gal|Ga
Ephesians|Eph|Ephes
Philippians|Phil|Php,Philipp
Colossians|Col|
1 Thessalonians|1 Thess|1 Thes,1 Th
2 Thessalonians|2 Thess|2 Thes,2 Th
1 Timothy|1 Tim|1 Ti
2 Timothy|2 Tim|2 Ti
Titus|Titus|Tit
Philemon|Phlm|Philem,Phm
Hebrews|Heb|
James|Jas|Jam,Jm
1 Peter|1 Pet|1 Pe,1 Pt
2 Peter|2 Pet|2 Pe,2 Pt
1 John|1 John|1 Jn,1 Jhn
2 John|2 John|2 Jn,2 Jhn
3 John|3 John|3 Jn,3 Jhn
Jude|Jude|
Revelation,Apocalypse|Rev|Re,Apoc`;

export const BIBLE_BOOKS = rows.split('\n').map(row => {
  const [names, abbreviations, alternatives] = row.split('|');
  return { names: names.split(','), abbreviations: abbreviations.split(','), alternatives: alternatives.split(',').filter(Boolean) };
});
const normalize = text => text.replace(/\s+/g, ' ').trim().toLowerCase();
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll(' ', '\\s+');
const aliases = new Map();
for (const book of BIBLE_BOOKS) for (const alias of [...book.names, ...book.abbreviations, ...book.alternatives]) aliases.set(normalize(alias), book);
const books = [...aliases.keys()].sort((a, b) => b.length - a.length).map(escape).join('|');
const boundary = '(?<![\\p{L}\\p{N}])';
const bookPattern = `(${books})(\\.?)\\s+`;
const number = '\\d{1,3}[a-c]?';
const locator = `${number}(?:\\s*:\\s*${number})?(?:\\s*[-–]\\s*${number}(?:\\s*:\\s*${number})?)?(?![\\p{L}\\p{N}:])`;
export const BIBLE_REFERENCE = new RegExp(`${boundary}(?:${books})\\.?\\s+\\d{1,3}:\\d{1,3}(?![\\d:])`, 'iu');
export const SCRIPTURE_CITATION = new RegExp(`${boundary}${bookPattern}${locator}`, 'iu');
const explicitReference = new RegExp(`${boundary}${bookPattern}(${locator})`, 'giu');
const nextReference = new RegExp(`^\\s*([,;])\\s*(?:${bookPattern})?(${locator})`, 'iu');
const singleChapter = new Set(['Obadiah', 'Philemon', '2 John', '3 John', 'Jude']);

function reference(book, name, period, value, previous, separator) {
  const numbers = [...value.matchAll(/\d+/g)].map(m => Number(m[0]));
  const isVerse = value.includes(':') || singleChapter.has(book.names[0]) || (!name && separator === ',' && previous.isVerse);
  const chapter = value.includes(':') ? numbers[0] : singleChapter.has(book.names[0]) ? 1 : isVerse ? previous.chapter : numbers[0];
  const endChapter = (value.match(/:/g)?.length || 0) === 2 ? numbers[2] : chapter;
  const display = name ? name.replace(/\s+/g, ' ') + period : '';
  const full = name && book.names.some(n => normalize(n) === normalize(name));
  const standard = name && !period && book.abbreviations.includes(display);
  return { book, name: display, value, chapter, endChapter, isVerse, full, standard };
}

// Only punctuation between fully recognized locators is judged. A bare number
// after a semicolon can mean a new chapter; do not guess that it is a verse.
export function scriptureReferences(text) {
  const clusters = [];
  explicitReference.lastIndex = 0;
  let match;
  while ((match = explicitReference.exec(text))) {
    let previous = reference(aliases.get(normalize(match[1])), match[1], match[2], match[3]);
    const refs = [previous], problems = [];
    let end = explicitReference.lastIndex;
    let next;
    while ((next = nextReference.exec(text.slice(end)))) {
      // A following prose word makes a bare number ambiguous (for example,
      // “Psalm 23, 20 years later”). Do not treat it as another locator.
      if (!next[2] && !next[4].includes(':') && /^\s+\p{L}/u.test(text.slice(end + next[0].length))) break;
      const book = next[2] ? aliases.get(normalize(next[2])) : previous.book;
      const current = reference(book, next[2], next[3], next[4], previous, next[1]);
      const sameChapter = book === previous.book && current.chapter === previous.endChapter && previous.isVerse && current.isVerse;
      const expected = sameChapter ? ',' : ';';
      if (next[1] !== expected) problems.push(`Use ${expected === ';' ? 'a semicolon' : 'a comma'} before “${[current.name, current.value].filter(Boolean).join(' ')}”.`);
      refs.push(current); previous = current; end += next[0].length;
    }
    clusters.push({ start: match.index, end, text: text.slice(match.index, end), refs, problems });
    explicitReference.lastIndex = end;
  }
  return clusters;
}

// The normal bibliography exclusion concerns Bible editions, not scholarship
// about the Bible. This deliberately recognizes only clear translation titles.
const translations = /^(?:the\s+)?(?:holy bible|(?:new\s+)?king james version|(?:new\s+)?american standard bible|english standard version|(?:new\s+)?revised standard version(?: updated edition)?|new international version|new living translation|(?:holman\s+)?christian standard bible|legacy standard bible|new english translation|the message)(?=$|[.:,(])/i;
export function isBibleEdition(text, recognizedTitle) {
  return [recognizedTitle, text].filter(Boolean).some(value => {
    const title = value.trim().replace(/^[“"‘']|[”"’']$/g, '');
    return translations.test(title) && !/\b(?:commentary|dictionary|lexicon|concordance|introduction|handbook|guide|critique)\b/i.test(title.split('. ')[0]);
  });
}
