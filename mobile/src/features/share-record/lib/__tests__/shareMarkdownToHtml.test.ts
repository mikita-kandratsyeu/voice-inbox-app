jest.mock('react-native-nitro-device-info', () => ({
  DeviceInfoModule: {
    version: '2.0.0',
  },
}));

jest.mock('@/shared/config', () => ({
  getWebsiteUrl: jest.fn(() => 'https://voiceinbox.ai'),
}));

jest.mock('@/shared/lib', () => ({
  i18n: {
    language: 'en',
    t: (key: string, opts?: Record<string, string>) => {
      if (key === 'share.pdfGeneratedAt') {
        return `Document generated · ${opts?.datetime ?? ''}`;
      }
      if (key === 'share.pdfAppBrand') {
        return `${opts?.appName ?? ''} · ${opts?.site ?? ''}`;
      }
      if (key === 'share.pdfFooterMetaWithId') {
        return `ID: ${opts?.recordId ?? ''} · ${opts?.audioNote ?? ''}`;
      }
      if (key === 'share.pdfAudioNotIncluded') {
        return 'Audio not included';
      }
      return key;
    },
  },
}));

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
