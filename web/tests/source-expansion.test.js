import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sourceExpansionParts } from './fixtures/source-expansion.js';
import { zipParts } from '../lib/demo.js';
import { parseDocx } from '../lib/docx.js';
import { lintDocument } from '../lib/rules.js';

test('chapters, websites, and multi-author books remain clean after a word-processor save', async () => {
  const saved = await readFile(new URL('./fixtures/libreoffice-sources.docx', import.meta.url));
  for (const bytes of [zipParts(sourceExpansionParts()), saved]) {
    const report = lintDocument(parseDocx(bytes, 'sources.docx'));
    assert.deepEqual(report.findings, []);
    assert.equal(report.stats.rulesAvailable, 60);
    for (const id of ['citation-fields', 'citation-syntax', 'citation-authors', 'citation-locators', 'citation-separators', 'citation-web-bibliography']) {
      assert.ok(report.checks.some(c => c.id === id && c.inspected > 0), id);
    }
  }
});
