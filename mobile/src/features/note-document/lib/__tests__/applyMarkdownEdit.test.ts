import {
  applyMarkdownEdit,
  applyMarkdownLink,
  isValidMarkdownLinkUrl,
  normalizeMarkdownLinkUrl,
} from '../applyMarkdownEdit';

describe('applyMarkdownEdit', () => {
  it('wraps bold around selection', () => {
    const text = 'Hello world';
    const result = applyMarkdownEdit(text, { start: 6, end: 11 }, 'bold');
    expect(result.text).toBe('Hello **world**');
    expect(result.selection).toEqual({ start: 8, end: 13 });
  });

  it('inserts empty bold markers at cursor', () => {
    const result = applyMarkdownEdit('Hello', { start: 5, end: 5 }, 'bold');
    expect(result.text).toBe('Hello****');
    expect(result.selection).toEqual({ start: 7, end: 7 });
  });

  it('wraps strikethrough around selection', () => {
    const result = applyMarkdownEdit('Done item', { start: 0, end: 4 }, 'strikethrough');
    expect(result.text).toBe('~~Done~~ item');
    expect(result.selection).toEqual({ start: 2, end: 6 });
  });

  it('wraps inline code around selection', () => {
    const result = applyMarkdownEdit('Use npm install', { start: 4, end: 7 }, 'code');
    expect(result.text).toBe('Use `npm` install');
    expect(result.selection).toEqual({ start: 5, end: 8 });
  });

  it('prefixes heading on current line', () => {
    const text = 'Summary\nBody line';
    const result = applyMarkdownEdit(text, { start: 9, end: 9 }, 'heading2');
    expect(result.text).toBe('Summary\n## Body line');
  });

  it('prefixes ordered list lines', () => {
    const text = 'Steps\nFirst\nSecond';
    const result = applyMarkdownEdit(text, { start: 7, end: 18 }, 'ordered');
    expect(result.text).toBe('Steps\n1. First\n2. Second');
  });

  it('inserts a task checkbox line prefix', () => {
    const text = 'Tasks\nBuy milk';
    const result = applyMarkdownEdit(text, { start: 11, end: 11 }, 'task');
    expect(result.text).toBe('Tasks\n- [ ] Buy milk');
  });
});

describe('applyMarkdownLink', () => {
  it('wraps selected text with a link', () => {
    const result = applyMarkdownLink('See docs here', { start: 4, end: 8 }, 'example.com');
    expect(result.text).toBe('See [docs](https://example.com) here');
    expect(result.selection).toEqual({ start: 31, end: 31 });
  });

  it('inserts a placeholder label when nothing is selected', () => {
    const result = applyMarkdownLink('Hello', { start: 5, end: 5 }, 'https://voiceinbox.ai');
    expect(result.text).toBe('Hello[link](https://voiceinbox.ai)');
    expect(result.selection).toEqual({ start: 6, end: 10 });
  });
});

describe('normalizeMarkdownLinkUrl', () => {
  it('adds https when protocol is missing', () => {
    expect(normalizeMarkdownLinkUrl('example.com/path')).toBe('https://example.com/path');
  });

  it('keeps explicit https urls', () => {
    expect(normalizeMarkdownLinkUrl('https://example.com')).toBe('https://example.com');
  });
});

describe('isValidMarkdownLinkUrl', () => {
  it('accepts normalized web urls', () => {
    expect(isValidMarkdownLinkUrl('example.com')).toBe(true);
    expect(isValidMarkdownLinkUrl('https://example.com')).toBe(true);
  });

  it('rejects empty values', () => {
    expect(isValidMarkdownLinkUrl('   ')).toBe(false);
  });
});
