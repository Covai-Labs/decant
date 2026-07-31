import test from 'node:test';
import assert from 'node:assert/strict';
import { isAiChatUrl } from '../src/shared/ai-detect.js';

test('isAiChatUrl detects AI chat platforms correctly', () => {
  assert.equal(isAiChatUrl('https://chatgpt.com/c/12345'), true);
  assert.equal(isAiChatUrl('https://claude.ai/chat/abc'), true);
  assert.equal(isAiChatUrl('https://gemini.google.com/app'), true);
  assert.equal(isAiChatUrl('https://chat.deepseek.com/'), true);
  assert.equal(isAiChatUrl('https://lumo.proton.me/'), true);
});

test('isAiChatUrl returns false for non-AI websites', () => {
  assert.equal(isAiChatUrl('https://en.wikipedia.org/wiki/Teeline_Shorthand'), false);
  assert.equal(isAiChatUrl('https://github.com/Rat-S/decant'), false);
  assert.equal(isAiChatUrl('https://covai.org'), false);
});
