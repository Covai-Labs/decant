import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_OPTIONS, getOptions, saveOptions } from '../src/shared/storage.js';

test('DEFAULT_OPTIONS contains expected default settings', () => {
  assert.equal(DEFAULT_OPTIONS.includeFrontmatter, true);
  assert.equal(DEFAULT_OPTIONS.headingStyle, 'atx');
  assert.equal(DEFAULT_OPTIONS.bulletListMarker, '-');
  assert.equal(DEFAULT_OPTIONS.codeBlockStyle, 'fenced');
  assert.equal(DEFAULT_OPTIONS.defaultAppTarget, 'obsidian');
  assert.equal(DEFAULT_OPTIONS.defaultAiTarget, 'chatgpt');
  assert.equal(DEFAULT_OPTIONS.promptSaveLocation, true);
});

test('getOptions returns DEFAULT_OPTIONS when chrome.storage is unavailable', async () => {
  const options = await getOptions();
  assert.deepEqual(options, DEFAULT_OPTIONS);
});

test('saveOptions returns false when chrome.storage is unavailable', async () => {
  const result = await saveOptions({ includeFrontmatter: false });
  assert.equal(result, false);
});
