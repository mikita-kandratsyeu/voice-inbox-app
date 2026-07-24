import { escapeHtml, maskSecret, truncate } from './format.js';

describe('format', () => {
  it('escapeHtml escapes special chars', () => {
    expect(escapeHtml('a & b <c>')).toBe('a &amp; b &lt;c&gt;');
  });

  it('maskSecret hides most of value', () => {
    expect(maskSecret('abcdefghij', 4)).toBe('abcd••••••');
  });

  it('truncate shortens long text', () => {
    expect(truncate('hello world', 8)).toBe('hello w…');
  });
});
