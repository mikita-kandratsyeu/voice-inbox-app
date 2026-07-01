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
  const label = escapeHtml(formatSharePdfGeneratedAtText(generatedAt, locale));
  return `<footer class="share-pdf-generated-at" aria-hidden="true"><p>${label}</p></footer>`;
}

export function parseSharePdfFooterLocale(raw: string | null): SharePdfFooterLocale {
  return raw === 'ru' ? 'ru' : 'en';
}
