import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { i18n } from '@/shared/lib';

export type SharePdfFooterLocale = 'en' | 'ru';

export const SHARE_PDF_APP_DISPLAY_NAME = 'Voice Inbox AI';

export type ShareNotePdfDocumentOptions = {
  generatedAt?: Date;
  locale?: SharePdfFooterLocale;
  appVersion?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveSharePdfAppVersion(override?: string): string | undefined {
  const fromOptions = override?.trim();
  if (fromOptions) return fromOptions;

  try {
    const fromDevice = String(DeviceInfoModule.version ?? '').trim();
    return fromDevice || undefined;
  } catch {
    return undefined;
  }
}

export function formatSharePdfAppVersionLine(appVersion?: string): string {
  const version = resolveSharePdfAppVersion(appVersion);
  return version ? `${SHARE_PDF_APP_DISPLAY_NAME} (${version})` : SHARE_PDF_APP_DISPLAY_NAME;
}

export function formatSharePdfGeneratedAtText(
  generatedAt: Date,
  locale: SharePdfFooterLocale = 'en',
): string {
  const intlLocale = locale === 'ru' ? 'ru-RU' : 'en-US';
  const datetime = new Intl.DateTimeFormat(intlLocale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(generatedAt);

  return i18n.t('share.pdfGeneratedAt', {
    datetime,
    lng: locale,
  });
}

export function buildSharePdfGeneratedAtFooterHtml(options?: ShareNotePdfDocumentOptions): string {
  const generatedAt = options?.generatedAt ?? new Date();
  const locale = (options?.locale ?? i18n.language ?? 'en').startsWith('ru') ? 'ru' : 'en';
  const generatedLine = escapeHtml(formatSharePdfGeneratedAtText(generatedAt, locale));
  const appLine = escapeHtml(formatSharePdfAppVersionLine(options?.appVersion));
  return `<footer class="share-pdf-generated-at" aria-hidden="true"><p>${generatedLine}</p><p>${appLine}</p></footer>`;
}
