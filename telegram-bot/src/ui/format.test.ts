import assert from 'node:assert/strict';
import test from 'node:test';

import { escapeHtml, maskSecret, truncate } from './format.js';

test('escapeHtml escapes special chars', () => {
  assert.equal(escapeHtml('a & b <c>'), 'a &amp; b &lt;c&gt;');
});

test('maskSecret hides most of value', () => {
  assert.equal(maskSecret('abcdefghij', 4), 'abcd••••••');
});

test('truncate shortens long text', () => {
  assert.equal(truncate('hello world', 8), 'hello w…');
});
