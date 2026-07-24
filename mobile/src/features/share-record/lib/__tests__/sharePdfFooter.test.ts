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

import { getWebsiteUrl } from '@/shared/config';

import {
  buildSharePdfGeneratedAtFooterHtml,
  formatSharePdfAppBrandLine,
  formatSharePdfAppVersionLine,
  formatSharePdfFooterMetaLine,
} from '../sharePdfFooter';

describe('sharePdfFooter', () => {
  beforeEach(() => {
    jest.mocked(getWebsiteUrl).mockReturnValue('https://voiceinbox.ai');
  });

  it('formats app name with device version and site from WEBSITE_URL', () => {
    expect(formatSharePdfAppVersionLine()).toBe('Voice Inbox AI (2.0.0)');
    expect(formatSharePdfAppBrandLine()).toBe('Voice Inbox AI (2.0.0) · voiceinbox.ai');
  });

  it('omits site when WEBSITE_URL is not configured', () => {
    jest.mocked(getWebsiteUrl).mockReturnValue('');
    expect(formatSharePdfAppBrandLine()).toBe('Voice Inbox AI (2.0.0)');
  });

  it('formats footer meta with optional record id', () => {
    expect(formatSharePdfFooterMetaLine('en')).toBe('Audio not included');
    expect(formatSharePdfFooterMetaLine('en', 'rec_demo')).toBe(
      'ID: rec_demo · Audio not included',
    );
  });

  it('renders generation time, app brand, and meta in the footer', () => {
    const html = buildSharePdfGeneratedAtFooterHtml({
      generatedAt: new Date('2026-06-12T14:30:00'),
      locale: 'en',
      recordId: 'rec_demo',
    });

    expect(html).toContain('share-pdf-generated-at');
    expect(html).toContain('Document generated');
    expect(html).toContain('Voice Inbox AI (2.0.0) · voiceinbox.ai');
    expect(html).toContain('ID: rec_demo · Audio not included');
  });
});
