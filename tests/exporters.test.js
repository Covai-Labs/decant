import test from 'node:test';
import assert from 'node:assert/strict';
import { toMarkdown, toHtml, toJson, toDoc } from '../src/shared/exporters.js';

const mockArticleData = {
  title: 'Test Article Title',
  markdown: '# Test Article Title\n\nThis is a sample article body.',
  htmlContent: '<h1>Test Article Title</h1><p>This is a sample article body.</p>',
  url: 'https://example.com/test-article',
  byline: 'Jane Doe',
  siteName: 'Example News',
  excerpt: 'A sample excerpt from the article.',
  publishedTime: '2026-08-13T12:00:00Z',
  baseFilename: 'test-article-title',
};

test('toMarkdown returns correct blob type and extension', async () => {
  const result = toMarkdown(mockArticleData);
  assert.equal(result.ext, 'md');
  assert.ok(result.blob instanceof Blob);
  const text = await result.blob.text();
  assert.equal(text, mockArticleData.markdown);
});

test('toHtml constructs full HTML document with metadata', async () => {
  const result = toHtml(mockArticleData);
  assert.equal(result.ext, 'html');
  assert.ok(result.blob instanceof Blob);
  const text = await result.blob.text();
  assert.ok(text.includes('<!doctype html>'));
  assert.ok(text.includes('Test Article Title'));
  assert.ok(text.includes('By Jane Doe'));
  assert.ok(text.includes('Example News'));
  assert.ok(text.includes('https://example.com/test-article'));
});

test('toJson returns structured JSON blob and correct extension', async () => {
  const result = toJson(mockArticleData);
  assert.equal(result.ext, 'json');
  assert.ok(result.blob instanceof Blob);
  const text = await result.blob.text();
  const parsed = JSON.parse(text);
  assert.equal(parsed.title, 'Test Article Title');
  assert.equal(parsed.url, 'https://example.com/test-article');
  assert.equal(parsed.byline, 'Jane Doe');
  assert.equal(parsed.content, mockArticleData.markdown);
  assert.ok(parsed.clippedAt);
});

test('toDoc creates Word-compatible HTML blob with BOM', async () => {
  const result = toDoc(mockArticleData);
  assert.equal(result.ext, 'doc');
  assert.ok(result.blob instanceof Blob);
  const text = await result.blob.text();
  assert.ok(text.includes('xmlns:w="urn:schemas-microsoft-com:office:word"'));
  assert.ok(text.includes('Test Article Title'));
  assert.ok(text.includes('By Jane Doe'));
});
