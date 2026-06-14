import { shareMarkdownToHtmlDocument } from '../shareMarkdownToHtml';

describe('shareMarkdownToHtmlDocument', () => {
  it('renders GFM markdown tables as HTML tables', () => {
    const html = shareMarkdownToHtmlDocument(
      ['## Overview', '', '| Metric | Value |', '| --- | --- |', '| Recordings | 40 |'].join('\n'),
      'Statistics',
    );

    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('Recordings');
    expect(html).toContain('40');
    expect(html).not.toContain('| --- |');
  });

  it('renders task lists and strikethrough', () => {
    const html = shareMarkdownToHtmlDocument(
      ['- [x] Done', '- [ ] Todo', '', '~~skipped~~'].join('\n'),
      'Note',
    );

    expect(html).toContain('task-list-item-checkbox');
    expect(html).toContain('Done');
    expect(html).toContain('Todo');
    expect(html).toMatch(/<s>skipped<\/s>|<del>skipped<\/del>/);
  });

  it('renders blockquotes', () => {
    const html = shareMarkdownToHtmlDocument('> Quoted text', 'Note');

    expect(html).toContain('<blockquote');
    expect(html).toContain('Quoted text');
  });
});
