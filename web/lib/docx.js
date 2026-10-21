import { unzipSync, strFromU8 } from 'fflate';
import { DOMParser } from '@xmldom/xmldom';
import { MAX_FILE_BYTES } from './limits.js';

const MAX_PART_BYTES = 8 * 1024 * 1024;
const W = new Set(['http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  'http://purl.oclc.org/ooxml/wordprocessingml/main']);
const elements = node => Array.from(node?.childNodes || []).filter(n => n.nodeType === 1);
const word = (node, name) => node?.localName === name && W.has(node.namespaceURI);
const child = (node, name) => elements(node).find(n => word(n, name));
const descendants = (node, name) => Array.from(node?.getElementsByTagName('*') || []).filter(n => word(n, name));
const attr = (node, name) => Array.from(node?.attributes || []).find(a => a.localName === name)?.value;
const value = (node, name) => attr(child(node, name), 'val');
const number = v => v === undefined ? undefined : (Number.isFinite(Number(v)) ? Number(v) : undefined);
const on = node => node ? !['0', 'false', 'off'].includes(attr(node, 'val')) : undefined;
const compact = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

function xml(bytes, part) {
  const source = strFromU8(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('This document contains unsupported XML declarations. Save a fresh .docx copy in Word.');
  try {
    return new DOMParser({ onError: () => { throw new Error('Invalid XML'); } })
      .parseFromString(source, 'application/xml');
  } catch { throw new Error(`Could not read ${part}. The Word document may be damaged. Try saving a new .docx copy.`); }
}

function normalizePath(path) {
  const parts = [];
  for (const part of path.replaceAll('\\', '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!parts.length) throw new Error('This document contains an invalid package path.');
      parts.pop();
    } else parts.push(part);
  }
  return parts.join('/');
}

function relationships(files, source) {
  const dir = source.includes('/') ? source.slice(0, source.lastIndexOf('/') + 1) : '';
  const name = source.slice(source.lastIndexOf('/') + 1);
  const relPath = source ? `${dir}_rels/${name}.rels` : '_rels/.rels';
  if (!files[relPath]) return [];
  return Array.from(xml(files[relPath], relPath).getElementsByTagName('*'))
    .filter(n => n.localName === 'Relationship').map(n => ({
      id: n.getAttribute('Id'), type: n.getAttribute('Type').split('/').pop(),
      external: n.getAttribute('TargetMode') === 'External',
      target: n.getAttribute('TargetMode') === 'External' ? null : normalizePath(
        n.getAttribute('Target').startsWith('/') ? n.getAttribute('Target') : dir + n.getAttribute('Target')),
    }));
}

function readParagraphProperties(node) {
  if (!node) return {};
  const ind = child(node, 'ind');
  const spacing = child(node, 'spacing');
  const num = child(node, 'numPr');
  return compact({
    style: value(node, 'pStyle'), align: value(node, 'jc'), outline: number(value(node, 'outlineLvl')),
    keepNext: on(child(node, 'keepNext')), pageBreakBefore: on(child(node, 'pageBreakBefore')),
    contextualSpacing: on(child(node, 'contextualSpacing')), bidi: on(child(node, 'bidi')),
    numId: value(num, 'numId'), level: number(value(num, 'ilvl')),
    indent: ind ? compact({
      left: number(attr(ind, 'start') ?? attr(ind, 'left')),
      right: number(attr(ind, 'end') ?? attr(ind, 'right')),
      first: number(attr(ind, 'firstLine')), hanging: number(attr(ind, 'hanging')),
      chars: attr(ind, 'firstLineChars') ?? attr(ind, 'hangingChars') ?? attr(ind, 'leftChars') ?? attr(ind, 'startChars'),
    }) : undefined,
    spacing: spacing ? compact({
      line: number(attr(spacing, 'line')), rule: attr(spacing, 'lineRule'),
      before: number(attr(spacing, 'before')), after: number(attr(spacing, 'after')),
      beforeAuto: attr(spacing, 'beforeAutospacing'), afterAuto: attr(spacing, 'afterAutospacing'),
      beforeLines: number(attr(spacing, 'beforeLines')), afterLines: number(attr(spacing, 'afterLines')),
    }) : undefined,
    tabs: child(node, 'tabs') ? elements(child(node, 'tabs')).map(t => ({ pos: number(attr(t, 'pos')), kind: attr(t, 'val') })) : undefined,
  });
}

function readRunProperties(node) {
  if (!node) return {};
  const fonts = child(node, 'rFonts');
  return compact({
    style: value(node, 'rStyle'), size: number(value(node, 'sz')),
    bold: on(child(node, 'b')), italic: on(child(node, 'i')), caps: on(child(node, 'caps')),
    italicCs: on(child(node, 'iCs')), complexScript: on(child(node, 'cs')), rtl: on(child(node, 'rtl')),
    hidden: on(child(node, 'vanish')), vertical: value(node, 'vertAlign'), position: number(value(node, 'position')),
    fonts: fonts ? compact(Object.fromEntries(['ascii', 'hAnsi', 'asciiTheme', 'hAnsiTheme', 'eastAsia', 'cs']
      .map(key => [key, attr(fonts, key)]))) : undefined,
  });
}

function mergeParagraph(base, next) {
  const merged = { ...base, ...next };
  for (const key of ['indent', 'spacing']) if (next[key]) merged[key] = { ...base[key], ...next[key] };
  // Word treats first-line and hanging indents as alternatives.
  if (next.indent?.first !== undefined) delete merged.indent.hanging;
  if (next.indent?.hanging !== undefined) delete merged.indent.first;
  if (next.tabs) {
    const tabs = new Map((base.tabs || []).map(t => [t.pos, t]));
    for (const t of next.tabs) t.kind === 'clear' ? tabs.delete(t.pos) : tabs.set(t.pos, t);
    merged.tabs = [...tabs.values()].sort((a, b) => a.pos - b.pos);
  }
  return merged;
}

function mergeRun(base, next, style = false) {
  const merged = { ...base, ...next };
  if (next.fonts) {
    merged.fonts = { ...base.fonts, ...next.fonts };
    for (const key of ['ascii', 'hAnsi']) if (next.fonts[key] && !next.fonts[`${key}Theme`]) delete merged.fonts[`${key}Theme`];
  }
  // In styles, bold/italic/caps/vanish are toggle properties. Direct
  // formatting is absolute, including an explicit false value.
  if (style) for (const key of ['bold', 'italic', 'italicCs', 'caps', 'hidden']) {
    if (next[key] !== undefined) merged[key] = next[key] ? !base[key] : base[key];
  }
  return merged;
}

function parseStyles(stylesXml) {
  const styles = new Map();
  let defaultParagraph, defaultCharacter;
  for (const s of descendants(stylesXml, 'style')) {
    const id = attr(s, 'styleId');
    if (styles.has(id)) throw new Error('Duplicate Word styles prevent a reliable check. Save a new .docx copy.');
    const data = { id, type: attr(s, 'type'), name: value(s, 'name') || id, basedOn: value(s, 'basedOn'),
      p: readParagraphProperties(child(s, 'pPr')), r: readRunProperties(child(s, 'rPr')) };
    styles.set(id, data);
    if (data.type === 'paragraph' && ['1', 'true', 'on'].includes(attr(s, 'default'))) defaultParagraph = id;
    if (data.type === 'character' && ['1', 'true', 'on'].includes(attr(s, 'default'))) defaultCharacter = id;
  }
  const defaults = descendants(stylesXml, 'docDefaults')[0];
  const pDefault = readParagraphProperties(child(child(defaults, 'pPrDefault'), 'pPr'));
  const rDefault = readRunProperties(child(child(defaults, 'rPrDefault'), 'rPr'));
  const cache = new Map();
  const missing = new Set();
  function chain(id, visiting = new Set()) {
    if (!id) return [];
    if (cache.has(id)) return cache.get(id);
    if (visiting.has(id) || visiting.size > 50) throw new Error('This document has a circular or unusually deep style chain. Save a new .docx copy.');
    const s = styles.get(id);
    if (!s) { missing.add(id); return []; }
    visiting.add(id);
    const list = [...chain(s.basedOn, visiting), s];
    cache.set(id, list);
    return list;
  }
  return { styles, defaultParagraph, defaultCharacter, pDefault, rDefault, chain, missing };
}

function parseTheme(theme) {
  const fonts = {};
  for (const node of Array.from(theme?.getElementsByTagName('*') || [])) {
    if (!['majorFont', 'minorFont'].includes(node.localName)) continue;
    const latin = elements(node).find(n => n.localName === 'latin')?.getAttribute('typeface');
    if (latin) fonts[node.localName === 'majorFont' ? 'major' : 'minor'] = latin;
  }
  return fonts;
}

function effectiveFont(properties, text, theme) {
  const fonts = properties.fonts || {};
  const key = /[^\x00-\x7f]/.test(text.replace(/[“”‘’–—…]/g, '')) ? 'hAnsi' : 'ascii';
  const themed = fonts[`${key}Theme`] || fonts.asciiTheme;
  if (themed) return theme[themed.startsWith('major') ? 'major' : 'minor'];
  return fonts[key] || fonts.ascii || fonts.hAnsi;
}

function isExcluded(node, stop) {
  for (let p = node.parentNode; p && p !== stop; p = p.parentNode) {
    if (W.has(p.namespaceURI) && ['del', 'moveFrom', 'txbxContent', 'pPrChange', 'rPrChange'].includes(p.localName)) return true;
  }
  return false;
}

function readParagraph(node, styles, theme, index) {
  const direct = readParagraphProperties(child(node, 'pPr'));
  const styleId = direct.style || styles.defaultParagraph;
  const chain = styles.chain(styleId);
  let p = styles.pDefault;
  let r = styles.rDefault;
  for (const s of chain) { p = mergeParagraph(p, s.p); r = mergeRun(r, s.r, true); }
  p = mergeParagraph(p, direct);
  const result = { index, styleId, styleName: styles.styles.get(styleId)?.name || '',
    styleNames: chain.map(s => s.name).join(' '), p, runs: [], refs: [], noteMarkers: [], text: '', tokens: [],
    pageBreakAfter: false, sectionEnd: !!child(child(node, 'pPr'), 'sectPr') };
  for (const run of descendants(node, 'r')) {
    if (isExcluded(run, node)) continue;
    let props = r;
    const own = readRunProperties(child(run, 'rPr'));
    for (const s of styles.chain(own.style || styles.defaultCharacter)) props = mergeRun(props, s.r, true);
    props = mergeRun(props, own);
    if (props.hidden) { result.hidden = true; continue; }
    let text = '';
    for (const el of elements(run)) {
      if (!W.has(el.namespaceURI)) continue;
      if (el.localName === 't') text += el.textContent;
      if (el.localName === 'tab') text += '\t';
      if (el.localName === 'br') {
        if (attr(el, 'type') === 'page') result.pageBreakAfter = true;
        else text += '\n';
      }
      if (el.localName === 'footnoteRef') {
        result.tokens.push('note-marker');
        result.noteMarkers.push({ offset: result.text.length + text.length, props });
      }
      if (el.localName === 'footnoteReference') result.refs.push({ id: attr(el, 'id'),
        before: result.text + text, props, custom: ['1', 'true', 'on'].includes(attr(el, 'customMarkFollows')) });
    }
    if (text) {
      result.tokens.push(text.startsWith('\t') ? 'tab' : 'text');
      result.runs.push({ text, ...props, font: effectiveFont(props, text, theme) });
      result.text += text;
    }
  }
  result.leadingTab = result.tokens[0] === 'tab';
  result.inTable = false;
  for (let parent = node.parentNode; parent; parent = parent.parentNode) if (word(parent, 'tc')) result.inTable = true;
  result.outline = p.outline !== undefined && p.outline < 9 ? p.outline + 1 :
    Number(result.styleNames.match(/\bheading\s*([1-9])\b/i)?.[1]) || undefined;
  return result;
}

function classify(paragraphs) {
  const school = paragraphs.findIndex(p => /^(midwestern baptist theological seminary|spurgeon college)$/i.test(p.text.trim().replace(/\s+/g, ' ')));
  let titleEnd = -1;
  if (school >= 0 && school < 15) {
    for (let i = school; i < Math.min(paragraphs.length, school + 60); i++) {
      if (i > school && (paragraphs[i].p.pageBreakBefore || paragraphs[i].outline)) { titleEnd = i - 1; break; }
      if (paragraphs[i].pageBreakAfter || paragraphs[i].sectionEnd) { titleEnd = i; break; }
    }
  }
  let region = 'body';
  let bibliographyIndex = 0;
  for (const p of paragraphs) {
    const previous = paragraphs[p.index - 1];
    if (region === 'other' && (p.p.pageBreakBefore || previous?.pageBreakAfter || previous?.sectionEnd)) region = 'body';
    p.location = `Paragraph ${p.index + 1}`;
    p.kind = 'body';
    if (!p.text.trim()) { p.kind = 'empty'; continue; }
    if (p.inTable) { p.kind = 'table'; continue; }
    if (p.index <= titleEnd) { p.kind = 'title'; continue; }
    if (/^bibliography\s*$/i.test(p.text)) { p.kind = 'bibliography-heading'; region = 'bibliography'; continue; }
    if (/^(?:table of contents|contents|abstract|list of (?:tables|figures|graphs|illustrations)|appendix\b.*)$/i.test(p.text.trim())) {
      p.kind = 'special-heading'; region = 'other'; continue;
    }
    if (p.outline) { p.kind = 'heading'; region = 'body'; continue; }
    if (/\bTOC\s*\d|table of contents/i.test(p.styleNames)) { p.kind = 'front-matter'; continue; }
    if (region === 'bibliography') { p.kind = 'bibliography'; p.location = `Bibliography entry ${++bibliographyIndex}`; continue; }
    if (region === 'other') { p.kind = 'other'; continue; }
    if (/\bquote\b|\bquotation\b|\bblock\s*text\b/i.test(p.styleNames)) { p.kind = 'quote'; continue; }
    if (p.p.numId && p.p.numId !== '0') { p.kind = 'list'; continue; }
    if (p.text.trim().length < 140 && (p.p.align === 'center' || p.runs.filter(r => /\p{L}/u.test(r.text)).every(r => r.bold))) {
      p.kind = 'possible-heading'; continue;
    }
    if ((p.p.indent?.left || 0) >= 600 && (p.p.spacing?.line || 240) === 240) p.kind = 'possible-quote';
  }
  return { titleDetected: titleEnd >= 0, schoolDetected: school >= 0 };
}

export function parseDocx(input, filename = 'document.docx') {
  if (!/\.docx$/i.test(filename)) throw new Error('Choose a .docx Word document. For an older .doc file, use Word’s Save As → Word Document (.docx). PDF and macro-enabled files are not supported.');
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length > MAX_FILE_BYTES) throw new Error('This file exceeds the 20 MB limit. Save a copy with compressed images and try again.');
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('This is not a readable .docx package. Check the file type; password-protected documents must be saved as an unencrypted copy.');
  let count = 0, total = 0;
  const seen = new Set();
  let files;
  try {
    files = unzipSync(bytes, { filter: info => {
      if (++count > 4000) throw new Error('This file contains too many document parts.');
      if (seen.has(info.name)) throw new Error('This file contains duplicate document parts.');
      seen.add(info.name);
      if (!/\.(xml|rels)$/i.test(info.name)) return false;
      if (info.name !== normalizePath(info.name)) throw new Error('This document contains an invalid package path.');
      if (info.originalSize > MAX_PART_BYTES || (total += info.originalSize) > 48 * 1024 * 1024) throw new Error('The expanded document text exceeds the checker’s processing limit.');
      return true;
    } });
  } catch (error) { throw new Error(error.message?.startsWith('This ') || error.message?.startsWith('The expanded') ? error.message : 'Could not open this Word document. Try saving a new .docx copy.'); }
  const main = relationships(files, '').find(r => r.type === 'officeDocument');
  if (!main || main.external || !files[main.target]) throw new Error('No Word document was found in this file. Choose a standard .docx document.');
  const types = files['[Content_Types].xml'] && strFromU8(files['[Content_Types].xml']);
  if (!types || /macroEnabled|vbaProject/i.test(types)) throw new Error('Use a standard, macro-free .docx Word document.');
  const rels = relationships(files, main.target);
  const part = type => {
    const rel = rels.find(r => r.type === type && !r.external);
    return rel && files[rel.target] ? xml(files[rel.target], rel.target) : null;
  };
  const document = xml(files[main.target], main.target);
  const body = descendants(document, 'body')[0];
  if (!body) throw new Error('This document does not contain a Word document body.');
  const styles = parseStyles(part('styles'));
  const theme = parseTheme(part('theme'));
  const nodes = descendants(body, 'p').filter(p => !isExcluded(p, body));
  if (nodes.length > 12000) throw new Error('This document has too many paragraphs for this checker. Try a shorter course paper.');
  const paragraphs = nodes.map((p, i) => readParagraph(p, styles, theme, i));
  if (!paragraphs.some(p => p.text.trim())) throw new Error('No readable text was found. Scanned pages and text inside images cannot be checked.');
  const classification = classify(paragraphs);
  const referenceOrder = paragraphs.flatMap(p => p.refs.map(r => r.id));
  const noteXml = part('footnotes');
  const footnotes = descendants(noteXml, 'footnote').filter(n => !attr(n, 'type') || attr(n, 'type') === 'normal').map(n => {
    const id = attr(n, 'id');
    const order = referenceOrder.indexOf(id);
    const ps = descendants(n, 'p').map((p, i) => ({ ...readParagraph(p, styles, theme, i), kind: 'footnote', location: order < 0 ? `Unreferenced footnote ${id}` : `Footnote ${order + 1}` }));
    return { id, order, paragraphs: ps, text: ps.map(p => p.text).join('\n') };
  });
  const sections = descendants(body, 'sectPr').filter(n => !isExcluded(n, body) && !word(n.parentNode, 'sectPrChange')).map((s, i) => {
    const size = child(s, 'pgSz'), margins = child(s, 'pgMar'), cols = child(s, 'cols');
    return { location: `Section ${i + 1}`, width: number(attr(size, 'w')), height: number(attr(size, 'h')),
      margins: Object.fromEntries(['top', 'right', 'bottom', 'left', 'gutter'].map(k => [k, number(attr(margins, k))])),
      columns: number(attr(cols, 'num')) ?? (elements(cols).length || 1) };
  });
  const settings = part('settings');
  const footerParagraphs = rels.filter(r => r.type === 'footer' && !r.external && files[r.target]).flatMap(rel => {
    const footer = xml(files[rel.target], rel.target);
    return descendants(footer, 'p').map((p, i) => ({ ...readParagraph(p, styles, theme, i), kind: 'footer', location: 'Footer',
      pageField: descendants(p, 'instrText').some(t => /^\s*PAGE\b/i.test(t.textContent)) || descendants(p, 'fldSimple').some(f => /^\s*PAGE\b/i.test(attr(f, 'instr') || '')) }));
  });
  return { filename, paragraphs, footnotes, sections, footerParagraphs, ...classification,
    defaultTab: number(value(settings?.documentElement, 'defaultTabStop')) ?? 720,
    missingStyles: [...styles.missing],
    trackedChanges: ['ins', 'del', 'moveFrom', 'moveTo', 'pPrChange', 'rPrChange'].some(n => descendants(body, n).length),
    textBoxes: descendants(body, 'txbxContent').length,
    tables: descendants(body, 'tbl').length,
    drawings: descendants(body, 'drawing').length + descendants(body, 'pict').length,
    endnotes: !!part('endnotes'),
    mirroredMargins: descendants(settings, 'mirrorMargins').some(on),
    numbering: !!part('numbering'),
    hiddenText: paragraphs.some(p => p.hidden),
    embeddedContent: descendants(body, 'altChunk').length,
    missingFootnotes: referenceOrder.filter(id => !footnotes.some(n => n.id === id)),
    words: paragraphs.reduce((sum, p) => sum + (p.text.match(/\S+/g)?.length || 0), 0),
  };
}
