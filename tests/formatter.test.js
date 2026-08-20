import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMarkdown, sanitizeFilename } from '../src/shared/formatter.js';
import { DEFAULT_OPTIONS } from '../src/shared/storage.js';

test('sanitizeFilename removes illegal characters and spaces', () => {
  const result = sanitizeFilename('Test: Article / Title? *');
  assert.equal(result, 'Test- Article - Title- -');
});

test('formatMarkdown includes YAML frontmatter when enabled', () => {
  const article = {
    title: 'Hello World',
    byline: 'Jane Doe',
    url: 'https://example.com/hello',
    siteName: 'Example Blog',
    excerpt: 'An example article',
    content: 'This is the main body.',
  };

  const options = {
    ...DEFAULT_OPTIONS,
    includeFrontmatter: true,
    frontmatterTemplate: '---\ntitle: "{{title}}"\nauthor: "{{author}}"\n---',
  };

  const formatted = formatMarkdown(article, options);
  assert.match(formatted, /^---\ntitle: "Hello World"\nauthor: "Jane Doe"\n---/);
  assert.match(formatted, /# Hello World/);
  assert.match(formatted, /This is the main body\./);
});

test('formatMarkdown formats default frontmatter template with extracted_with', () => {
  const article = {
    title: 'Hello World',
    byline: 'Jane Doe',
    url: 'https://example.com/hello',
    siteName: 'Example Blog',
    excerpt: 'An example article',
    content: 'This is the main body.',
    publishedTime: '2026-08-20T10:00:00Z',
  };

  const formatted = formatMarkdown(article, DEFAULT_OPTIONS);
  assert.match(formatted, /extracted_with: "decant\.covai\.org"/);
  assert.match(formatted, /title: "Hello World"/);
  assert.match(formatted, /source: "https:\/\/example\.com\/hello"/);
});

test('formatMarkdown omits frontmatter when disabled', () => {
  const article = {
    title: 'No Frontmatter Test',
    byline: '',
    url: 'https://example.com',
    content: 'Content only.',
  };

  const options = {
    ...DEFAULT_OPTIONS,
    includeFrontmatter: false,
  };

  const formatted = formatMarkdown(article, options);
  assert.equal(formatted, '# No Frontmatter Test\n\nContent only.');
});
