import { applyMarkdownEdit } from '../applyMarkdownEdit';

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

  it('prefixes heading on current line', () => {
    const text = 'Summary\nBody line';
    const result = applyMarkdownEdit(text, { start: 9, end: 9 }, 'heading2');
    expect(result.text).toBe('Summary\n## Body line');
  });

  it('inserts a task checkbox line prefix', () => {
    const text = 'Tasks\nBuy milk';
    const result = applyMarkdownEdit(text, { start: 11, end: 11 }, 'task');
    expect(result.text).toBe('Tasks\n- [ ] Buy milk');
  });
});
