import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { fixtureParts, zipParts, makeDemo } from '../lib/demo.js';

const file = (bytes, name = 'my-paper.docx') => ({ name, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from(bytes) });

test('demo is checked locally, with filtering, report download, and no browser errors', async ({ page }, info) => {
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => requests.push({ url: r.url(), method: r.method() }));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('MBTS linter');
  await page.screenshot({ path: `build/home-${info.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Run sample' }).click();
  await expect(page.locator('#report')).toBeVisible();
  await expect(page.locator('#error-count')).not.toHaveText('0');
  await expect(page.locator('#review-count')).not.toHaveText('0');
  await expect(page.locator('#document-name')).toHaveText('cedar-grove-demo.docx');
  await expect(page.getByRole('heading', { name: 'Use 10-point footnotes', exact: true })).toBeVisible();
  await page.locator('[data-filter="review"]').click();
  await expect(page.locator('#findings [data-severity="error"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Identify the Bible translation', exact: true })).toBeVisible();
  await page.locator('[data-filter="unchecked"]').click();
  await expect(page.locator('#findings .scope-card')).toHaveCount(6);
  const pendingDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download report' }).click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toBe('cedar-grove-demo-mbts-report.txt');
  const text = await readFile(await download.path(), 'utf8');
  expect(text).toContain('Use 10-point footnotes');
  expect(text).toContain('NOT CHECKED');
  await page.locator('[data-filter="all"]').click();
  await page.screenshot({ path: `build/report-${info.project.name}.png`, fullPage: true });
  await page.screenshot({ path: `build/report-view-${info.project.name}.png` });
  expect(errors).toEqual([]);
  expect(requests.every(r => new URL(r.url).hostname === '127.0.0.1' && r.method === 'GET')).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('real file selection checks a clean document and clears all document state', async ({ page }) => {
  await page.goto('/');
  const chooser = page.waitForEvent('filechooser');
  await page.locator('#choose-file').click();
  await (await chooser).setFiles(file(zipParts(fixtureParts())));
  await expect(page.locator('#report')).toBeVisible();
  await expect(page.locator('#error-count')).toHaveText('0');
  await expect(page.locator('#demo-notice')).toBeHidden();
  await expect(page.locator('#findings')).toContainText('No findings in this view');
  await page.getByRole('button', { name: 'Clear document' }).click();
  await expect(page.locator('#report')).toBeHidden();
  expect(await page.locator('#file-input').inputValue()).toBe('');
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test('Scripture, Ibid., and original-language findings reach the report and export', async ({ page }) => {
  const parts = fixtureParts();
  parts['word/document.xml'] = parts['word/document.xml'].replace('Jas 1:19', 'Jas. 1:19, 2:1')
    .replace('Aster, Anne. The Patient Ministry.', 'The Holy Bible: English Standard Version.')
    .replace('<w:r><w:t xml:space="preserve">The goal is', '<w:r><w:rPr><w:i/></w:rPr><w:t>ἀγάπη </w:t></w:r><w:r><w:t xml:space="preserve">The goal is');
  parts['word/footnotes.xml'] = parts['word/footnotes.xml'].replace('Unless otherwise specified, all Bible references in this paper are to the English Standard Version (ESV) (Wheaton, IL: Crossway, 2025).', 'Ibid, 24.');
  await page.goto('/');
  await expect(page.locator('#rule-count')).toHaveText('50');
  await page.locator('#file-input').setInputFiles(file(zipParts(parts), 'reference-checks.docx'));
  await expect(page.locator('#report')).toBeVisible();
  const titles = ['Review Bible book abbreviations', 'Review Scripture reference separators',
    'Review the Bible edition in the bibliography', 'Review Ibid. punctuation',
    'Check the preceding source for Ibid.', 'Keep Greek and Hebrew script upright'];
  for (const title of titles) await expect(page.locator('#findings').getByRole('heading', { name: title, exact: true })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download report' }).click();
  const text = await readFile(await (await pending).path(), 'utf8');
  for (const title of titles) expect(text).toContain(title);
  expect(text).toContain('Ibid. on the same page');
});

test('invalid and damaged documents show a recoverable error', async ({ page }) => {
  await page.goto('/');
  await page.locator('#file-input').setInputFiles(file(makeDemo(), 'old.doc'));
  await expect(page.getByRole('alert')).toContainText('Save As');
  await page.locator('#file-input').setInputFiles(file([1, 2, 3], 'broken.docx'));
  await expect(page.getByRole('alert')).toContainText('not a readable');
  await expect(page.locator('#report')).toBeHidden();
  await expect(page.locator('#choose-file')).toBeEnabled();
  await page.getByRole('button', { name: 'Run sample' }).click();
  await expect(page.locator('#report')).toBeVisible();
  await expect(page.getByRole('alert')).toBeHidden();
});

test('drag and drop works and document text is never treated as HTML', async ({ page }) => {
  await page.goto('/');
  const parts = fixtureParts({ clean: false });
  parts['word/document.xml'] = parts['word/document.xml'].replace('The goal is', '&lt;img src=x onerror=alert(1)&gt; The goal is');
  const dataTransfer = await page.evaluateHandle(bytes => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(bytes)], '<img src=x>.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
    return transfer;
  }, [...zipParts(parts)]);
  await page.locator('#choose-file').dispatchEvent('drop', { dataTransfer });
  await expect(page.locator('#report')).toBeVisible();
  await expect(page.locator('#document-name')).toHaveText('<img src=x>.docx');
  await expect(page.locator('#report img')).toHaveCount(0);
  await expect(page.locator('#findings')).toContainText('<img src=x onerror=alert(1)>');
});
