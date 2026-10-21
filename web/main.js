import './style.css';
import { MAX_FILE_BYTES } from './lib/limits.js';
import { RULES, NOT_CHECKED, reportText } from './lib/rules.js';
import { makeDemo } from './lib/demo.js';

const $ = selector => document.querySelector(selector);
const el = (tag, className, text) => { const n = document.createElement(tag); if (className) n.className = className; if (text !== undefined) n.textContent = text; return n; };
let report, worker, timer, generation = 0, filter = 'all', demo = false;

function download(bytes, name, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = el('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function busy(value) {
  $('#processing').hidden = !value;
  $('#choose-file').disabled = value;
  $('#try-demo').disabled = value;
  $('#file-input').disabled = value;
}
function cancel() { generation++; clearTimeout(timer); worker?.terminate(); worker = null; busy(false); }
function error(message) { $('#file-error').textContent = message; $('#file-error').hidden = false; }
function reset() {
  cancel(); report = null; demo = false; $('#report').hidden = true; $('#file-error').hidden = true;
  $('#file-input').value = ''; $('#findings').replaceChildren(); $('#document-name').textContent = '';
  $('#document-stats').textContent = ''; $('#evaluated-checks').replaceChildren();
}

async function inspect(file, isDemo = false) {
  reset(); const current = generation; demo = isDemo;
  if (!/\.docx$/i.test(file.name)) { error('Choose a .docx file. For an older .doc document, use Word’s Save As → Word Document (.docx). PDFs are not supported in this release.'); return; }
  if (file.size > MAX_FILE_BYTES) { error('This file is larger than 20 MB. Save a copy with compressed images and try again.'); return; }
  busy(true);
  try {
    const buffer = await file.arrayBuffer();
    if (current !== generation) return;
    worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    timer = setTimeout(() => { cancel(); error('This document took too long to process. Try a shorter paper or save a fresh .docx copy.'); }, 30000);
    worker.onmessage = ({ data }) => {
      if (current !== generation) return;
      clearTimeout(timer); worker?.terminate(); worker = null; busy(false);
      if (data.error) { error(data.error); return; }
      report = data.report; renderReport();
    };
    worker.onerror = () => { if (current === generation) { cancel(); error('The local document checker could not start. Reload the page and try again.'); } };
    worker.postMessage({ buffer, name: file.name }, [buffer]);
  } catch { if (current === generation) { cancel(); error('The file could not be read. Try choosing it again.'); } }
}

function locationNode(finding) {
  const n = el('div', 'issue-detail');
  const label = el('div', 'issue-location'); label.append(el('span', '', finding.location));
  if (finding.pages) label.append(el('span', '', `Manual pp. ${finding.pages}`));
  n.append(label, el('p', 'issue-observed', finding.observed));
  if (finding.excerpt) n.append(el('blockquote', 'issue-excerpt', finding.excerpt));
  return n;
}

function scopeNode(item) { const n = el('article', 'scope-card'); n.append(el('h3', '', item.title), el('p', '', item.detail)); return n; }

function renderFindings() {
  const container = $('#findings'); container.replaceChildren();
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  if (filter === 'unchecked') {
    report.notChecked.forEach(item => container.append(scopeNode(item)));
    $('#result-count').textContent = `${report.notChecked.length} areas for human review`;
    return;
  }
  const selected = report.findings.filter(f => filter === 'all' || filter === f.severity);
  const groups = new Map();
  for (const f of selected) {
    const key = `${f.severity}:${f.ruleId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  $('#result-count').textContent = `${selected.length} findings · ${groups.size} groups`;
  if (!selected.length) {
    const empty = el('div', 'empty-state');
    empty.append(el('h3', '', filter === 'error' ? 'No errors in the settings we could check.' : 'No findings in this view.'),
      el('p', '', 'Read the Not checked section and review your final pages before submitting.'));
    container.append(empty);
  }
  const ordered = [...groups.values()].sort((a, b) => (a[0].severity === 'error' ? 0 : 1) - (b[0].severity === 'error' ? 0 : 1));
  for (const group of ordered) {
    const first = group[0]; const card = el('article', 'issue-card'); card.dataset.severity = first.severity;
    const heading = el('div', 'issue-heading');
    heading.append(el('span', 'severity', first.severity === 'error' ? 'Error' : 'Review'), el('h3', '', first.title),
      el('span', 'occurrences', `${group.length} ${group.length === 1 ? 'location' : 'locations'}`));
    const fix = el('p', 'issue-fix'); fix.append(el('strong', '', 'How to fix: '), document.createTextNode(first.fix || 'Review this item in Word.'));
    card.append(heading, fix, locationNode(first));
    if (group.length > 1) {
      const more = el('details', 'more-locations'); more.append(el('summary', '', `Show ${group.length - 1} more ${group.length === 2 ? 'location' : 'locations'}`));
      for (const item of group.slice(1)) { const n = locationNode(item); n.classList.add('additional-location'); more.append(n); }
      card.append(more);
    }
    container.append(card);
  }
  if (report.omitted) container.prepend(el('p', 'demo-notice', `${report.omitted} additional findings were omitted. Fix common formatting issues and run the check again.`));
}

function renderReport() {
  $('#document-name').textContent = report.filename;
  $('#error-count').textContent = report.counts.error;
  $('#review-count').textContent = report.counts.review;
  $('#unchecked-count').textContent = report.notChecked.length;
  const s = report.stats;
  const countLabel = (count, noun) => `${count.toLocaleString()} ${noun}${count === 1 ? '' : 's'}`;
  $('#document-stats').textContent = `${countLabel(s.words, 'word')} · ${countLabel(s.paragraphs, 'paragraph')} · ${countLabel(s.footnotes, 'footnote')} · ${s.rulesEvaluated} of ${s.rulesAvailable} rule types evaluated`;
  $('#demo-notice').hidden = !demo;
  $('#evaluated-checks').replaceChildren(...report.checks.map(check => {
    const row = el('div', 'check-row'); row.append(el('span', '', check.title),
      el('span', '', `${check.inspected} inspected · ${check.findings ? `${check.findings} findings` : 'no findings'}`)); return row;
  }));
  filter = 'all'; renderFindings(); $('#report').hidden = false;
  $('#report-title').focus({ preventScroll: true }); $('#report').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}

$('#choose-file').addEventListener('click', () => $('#file-input').click());
$('#file-input').addEventListener('change', event => { if (event.target.files[0]) inspect(event.target.files[0]); });
const dropzone = $('#choose-file');
for (const type of ['dragenter', 'dragover']) dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('dragging'); });
for (const type of ['dragleave', 'drop']) dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.remove('dragging'); });
dropzone.addEventListener('drop', event => {
  if (event.dataTransfer.files.length !== 1) { error('Choose one Word document at a time.'); return; }
  inspect(event.dataTransfer.files[0]);
});
window.addEventListener('dragover', event => event.preventDefault());
window.addEventListener('drop', event => event.preventDefault());
$('#try-demo').addEventListener('click', () => inspect(new File([makeDemo()], 'cedar-grove-demo.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), true));
$('#clear-report').addEventListener('click', () => { reset(); $('#choose-file').focus(); });
$('#download-report').addEventListener('click', () => { if (report) download(reportText(report), report.filename.replace(/\.docx$/i, '-mbts-report.txt'), 'text/plain;charset=utf-8'); });
$('#download-demo').addEventListener('click', () => download(makeDemo(), 'cedar-grove-demo.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
$('#filters').addEventListener('click', event => { const button = event.target.closest('[data-filter]'); if (button && report) { filter = button.dataset.filter; renderFindings(); } });

const categories = new Map();
for (const r of Object.values(RULES)) { if (!categories.has(r.group)) categories.set(r.group, []); categories.get(r.group).push(r); }
for (const [name, rules] of categories) {
  const section = el('section', 'rule-category'); section.append(el('h3', '', name)); const list = el('ul');
  for (const r of rules) { const item = el('li'); item.append(el('span', '', r.title), el('span', '', `pp. ${r.pages}`)); list.append(item); }
  section.append(list); $('#rule-list').append(section);
}
NOT_CHECKED.forEach(item => $('#scope-list').append(scopeNode(item)));
