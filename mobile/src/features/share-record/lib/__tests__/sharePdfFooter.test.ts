jest.mock('react-native-nitro-device-info', () => ({
  DeviceInfoModule: {
    version: '2.0.0',
  },
}));

jest.mock('@/shared/lib', () => ({
  i18n: {
    language: 'en',
    t: (key: string, opts?: { datetime?: string; lng?: string }) => {
      if (key === 'share.pdfGeneratedAt') {
        return `Document generated · ${opts?.datetime ?? ''}`;
      }
      return key;
    },
  },
}));

import {
  buildSharePdfGeneratedAtFooterHtml,
  formatSharePdfAppVersionLine,
} from '../sharePdfFooter';

describe('sharePdfFooter', () => {
  it('formats app name with device version', () => {
    expect(formatSharePdfAppVersionLine()).toBe('Voice Inbox AI (2.0.0)');
    expect(formatSharePdfAppVersionLine('1.9.0')).toBe('Voice Inbox AI (1.9.0)');
  });

  it('renders generation time and app version in the footer', () => {
    const html = buildSharePdfGeneratedAtFooterHtml({
      generatedAt: new Date('2026-06-12T14:30:00'),
      locale: 'en',
    });

    expect(html).toContain('share-pdf-generated-at');
    expect(html).toContain('Document generated');
    expect(html).toContain('Voice Inbox AI (2.0.0)');
  });
});
