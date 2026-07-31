import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAiPrompt, getAiPlatformUrl, AI_PLATFORMS } from '../src/shared/ai-transfer.js';

test('getAiPlatformUrl returns correct URL for platform', () => {
  assert.equal(getAiPlatformUrl('chatgpt'), AI_PLATFORMS.chatgpt.url);
  assert.equal(getAiPlatformUrl('claude'), AI_PLATFORMS.claude.url);
  assert.equal(getAiPlatformUrl('gemini'), AI_PLATFORMS.gemini.url);
  assert.equal(getAiPlatformUrl('unknown'), 'https://chatgpt.com/');
});

test('buildAiPrompt formats default prompt when template is omitted', () => {
  const prompt = buildAiPrompt({
    title: 'Test Article',
    url: 'https://example.com/test',
    content: 'Article body text.',
  });

  assert.match(prompt, /Please analyze and summarize/);
  assert.match(prompt, /Title: Test Article/);
  assert.match(prompt, /Source: https:\/\/example\.com\/test/);
  assert.match(prompt, /Article body text\./);
});

test('buildAiPrompt replaces template variables when custom template provided', () => {
  const prompt = buildAiPrompt({
    title: 'Custom Title',
    url: 'https://example.com',
    content: 'Body content',
    template: 'Summarize {{title}} from {{url}}:\n\n{{content}}',
  });

  assert.equal(prompt, 'Summarize Custom Title from https://example.com:\n\nBody content');
});
