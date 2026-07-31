import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanUriTitle,
  buildObsidianUri,
  buildLogseqUri,
  buildBearUri,
  buildAppUri
} from '../src/shared/uri-transfer.js';

test('cleanUriTitle removes reserved characters', () => {
  const result = cleanUriTitle('Title #1 | Test [Draft]');
  assert.equal(result, 'Title 1  Test Draft');
});

test('buildObsidianUri formats obsidian scheme correctly', () => {
  const uri = buildObsidianUri({
    title: 'My Article',
    content: '# Hello',
    vault: 'MyVault'
  });
  assert.match(uri, /^obsidian:\/\/new\?/);
  assert.match(uri, /name=My\+Article/);
  assert.match(uri, /vault=MyVault/);
  assert.match(uri, /content=%23\+Hello/);
});

test('buildAppUri selects appropriate URI generator', () => {
  const obsidianUri = buildAppUri('obsidian', { title: 'Test', content: 'Body', vault: 'Notes' });
  assert.match(obsidianUri, /^obsidian:\/\//);

  const logseqUri = buildAppUri('logseq', { title: 'Test', content: 'Body' });
  assert.match(logseqUri, /^logseq:\/\//);

  const bearUri = buildAppUri('bear', { title: 'Test', content: 'Body' });
  assert.match(bearUri, /^bear:\/\//);

  const noneUri = buildAppUri('none', { title: 'Test', content: 'Body' });
  assert.equal(noneUri, null);
});
