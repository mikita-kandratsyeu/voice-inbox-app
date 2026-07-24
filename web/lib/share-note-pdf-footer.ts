import { BASE_URL } from '@/config/constants';
import packageJson from '../package.json';

export type SharePdfFooterLocale = 'en' | 'ru';

export const SHARE_PDF_APP_DISPLAY_NAME = 'Voice Inbox AI';

export type ShareNotePdfDocumentOptions = {
  generatedAt?: Date;
  locale?: SharePdfFooterLocale;
  appVersion?: string;
  recordId?: string;
  /** Override public site URL (`NEXT_PUBLIC_BASE_URL`). */
  siteUrl?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSharePdfSiteLabelFromUrl(rawUrl: string): string | undefined {
  const raw = rawUrl.trim();
  if (!raw) return undefined;

  try {
    const parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return parsed.host || undefined;
  } catch {
    const stripped = raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    return stripped || undefined;
  }
}

function resolveSharePdfSiteLabel(override?: string): string | undefined {
  const fromOptions = override?.trim();
  if (fromOptions) {
    return formatSharePdfSiteLabelFromUrl(fromOptions);
  }

  return formatSharePdfSiteLabelFromUrl(BASE_URL);
}

function resolveSharePdfAppVersion(override?: string): string | undefined {
  const fromOptions = override?.trim();
  if (fromOptions) return fromOptions;

  const fromPackage = packageJson.version?.trim();
  return fromPackage || undefined;
}

export function formatSharePdfAppVersionLine(appVersion?: string): string {
  const version = resolveSharePdfAppVersion(appVersion);
  return version ? `${SHARE_PDF_APP_DISPLAY_NAME} (${version})` : SHARE_PDF_APP_DISPLAY_NAME;
}

export function formatSharePdfAppBrandLine(appVersion?: string, siteUrl?: string): string {
  const appLine = formatSharePdfAppVersionLine(appVersion);
  const site = resolveSharePdfSiteLabel(siteUrl);
  return site ? `${appLine} · ${site}` : appLine;
}

export function formatSharePdfFooterMetaLine(
  locale: SharePdfFooterLocale = 'en',
  recordId?: string,
): string {
  const audioNote = locale === 'ru' ? 'Аудио не включено' : 'Audio not included';
  const id = recordId?.trim();
  if (id) {
    return `ID: ${id} · ${audioNote}`;
  }
  return audioNote;
}

export function formatSharePdfGeneratedAtText(
  generatedAt: Date,
  locale: SharePdfFooterLocale = 'en',
): string {
  const intlLocale = locale === 'ru' ? 'ru-RU' : 'en-US';
  const formatted = new Intl.DateTimeFormat(intlLocale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(generatedAt);
  const prefix = locale === 'ru' ? 'Документ сформирован' : 'Document generated';
  return `${prefix} · ${formatted}`;
}

export function buildSharePdfGeneratedAtFooterHtml(options?: ShareNotePdfDocumentOptions): string {
  const generatedAt = options?.generatedAt ?? new Date();
  const locale = options?.locale ?? 'en';
  const paragraphs = [
    formatSharePdfGeneratedAtText(generatedAt, locale),
    formatSharePdfAppBrandLine(options?.appVersion, options?.siteUrl),
    formatSharePdfFooterMetaLine(locale, options?.recordId),
  ]
    .map(escapeHtml)
    .map((line) => `<p>${line}</p>`)
    .join('');
  return `<footer class="share-pdf-generated-at" aria-hidden="true">${paragraphs}</footer>`;
}

export function parseSharePdfFooterLocale(raw: string | null): SharePdfFooterLocale {
  return raw === 'ru' ? 'ru' : 'en';
}
