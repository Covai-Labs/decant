import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {
  isExtractableTab,
  deduplicateFilenames,
  formatCombinedMarkdown,
  generateZipArchive,
} from '../src/shared/batch-clipper.js';

test('isExtractableTab identifies valid HTTP and HTTPS tabs', () => {
  assert.equal(isExtractableTab({ url: 'https://example.com/article' }), true);
  assert.equal(isExtractableTab({ url: 'http://news.ycombinator.com' }), true);
  assert.equal(isExtractableTab({ url: 'https://github.com/covai/decant' }), true);
});

test('isExtractableTab filters out restricted and browser internal pages', () => {
  assert.equal(isExtractableTab({ url: 'chrome://settings' }), false);
  assert.equal(isExtractableTab({ url: 'edge://extensions' }), false);
  assert.equal(isExtractableTab({ url: 'about:blank' }), false);
  assert.equal(isExtractableTab({ url: 'about:debugging' }), false);
  assert.equal(isExtractableTab({ url: 'chrome-extension://abcdef/popup.html' }), false);
  assert.equal(isExtractableTab({ url: 'moz-extension://abcdef/popup.html' }), false);
  assert.equal(isExtractableTab({ url: 'view-source:https://example.com' }), false);
  assert.equal(isExtractableTab({ url: 'javascript:void(0)' }), false);
  assert.equal(isExtractableTab({ url: 'data:text/html,<h1>Hi</h1>' }), false);
});

test('isExtractableTab filters out Web Store extension pages', () => {
  assert.equal(
    isExtractableTab({ url: 'https://chromewebstore.google.com/detail/decant/123' }),
    false,
  );
  assert.equal(
    isExtractableTab({ url: 'https://addons.mozilla.org/en-US/firefox/addon/decant/' }),
    false,
  );
});

test('isExtractableTab handles empty, null or invalid inputs', () => {
  assert.equal(isExtractableTab(null), false);
  assert.equal(isExtractableTab({}), false);
  assert.equal(isExtractableTab({ url: '' }), false);
  assert.equal(isExtractableTab({ url: 'not-a-valid-url' }), false);
});

test('deduplicateFilenames appends increment counters to colliding filenames', () => {
  const items = [
    { filename: 'article.md', markdown: 'Content 1' },
    { filename: 'article.md', markdown: 'Content 2' },
    { filename: 'article.md', markdown: 'Content 3' },
    { filename: 'unique-note.md', markdown: 'Unique' },
  ];

  const deduped = deduplicateFilenames(items);
  assert.equal(deduped[0].filename, 'article.md');
  assert.equal(deduped[1].filename, 'article-1.md');
  assert.equal(deduped[2].filename, 'article-2.md');
  assert.equal(deduped[3].filename, 'unique-note.md');
});

test('formatCombinedMarkdown creates a structured document with TOC and anchor tags', () => {
  const results = [
    { title: 'First Article', markdown: '# First Article\n\nBody of first.', url: 'https://a.com' },
    {
      title: 'Second Article',
      markdown: '# Second Article\n\nBody of second.',
      url: 'https://b.com',
    },
  ];

  const combined = formatCombinedMarkdown(results, '2026-08-20');

  assert.match(combined, /title: Decanted Tabs \(2026-08-20\)/);
  assert.match(combined, /total_tabs: 2/);
  assert.match(combined, /## Table of Contents/);
  assert.match(combined, /1\. \[First Article\]\(#tab-1\)/);
  assert.match(combined, /2\. \[Second Article\]\(#tab-2\)/);
  assert.match(combined, /<a id="tab-1"><\/a>/);
  assert.match(combined, /<a id="tab-2"><\/a>/);
  assert.match(combined, /Body of first\./);
  assert.match(combined, /Body of second\./);
});

test('generateZipArchive produces a valid ZIP containing all files', async () => {
  const results = [
    { filename: 'page1.md', markdown: '# Page One' },
    { filename: 'page2.md', markdown: '# Page Two' },
  ];

  const zipResult = await generateZipArchive(results);
  let zip;
  if (typeof zipResult === 'string') {
    assert.ok(zipResult.startsWith('data:application/zip;base64,'));
    const base64Content = zipResult.replace('data:application/zip;base64,', '');
    zip = await JSZip.loadAsync(base64Content, { base64: true });
  } else {
    assert.ok(zipResult instanceof Blob);
    const arrayBuffer = await zipResult.arrayBuffer();
    zip = await JSZip.loadAsync(arrayBuffer);
  }

  const file1 = await zip.file('page1.md')?.async('string');
  const file2 = await zip.file('page2.md')?.async('string');

  assert.equal(file1, '# Page One');
  assert.equal(file2, '# Page Two');
});
