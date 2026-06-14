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
});
