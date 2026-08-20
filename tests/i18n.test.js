import test from 'node:test';
import assert from 'node:assert/strict';
import { getMessage } from '../src/shared/i18n.js';

test('getMessage returns fallback string when key is missing and substitutes variables', () => {
  const result = getMessage('clippingProgress', 'Clipping $1 of $2 tabs…', ['3', '7']);
  assert.equal(result, 'Clipping 3 of 7 tabs…');
});

test('getMessage handles single substitution correctly', () => {
  const result = getMessage('batchComplete', 'Successfully clipped $1 tabs!', ['5']);
  assert.equal(result, 'Successfully clipped 5 tabs!');
});

test('getMessage returns fallback unchanged when no substitutions provided', () => {
  const result = getMessage('saveButton', '⬇ Save');
  assert.equal(result, '⬇ Save');
});
