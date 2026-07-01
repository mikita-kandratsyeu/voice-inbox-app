import { i18n } from '@/shared/lib';

export type SharePdfFooterLocale = 'en' | 'ru';

export type ShareNotePdfDocumentOptions = {
  generatedAt?: Date;
  locale?: SharePdfFooterLocale;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  const label = escapeHtml(formatSharePdfGeneratedAtText(generatedAt, locale));
  return `<footer class="share-pdf-generated-at" aria-hidden="true"><p>${label}</p></footer>`;
}
