import { i18n } from '@/shared/lib';

export type SharePdfFooterLocale = 'en' | 'ru';

export type ShareNotePdfDocumentOptions = {
  generatedAt?: Date;
  locale?: SharePdfFooterLocale;
  brandIconDataUri?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildSharePdfBrandBadgeHtml(options?: ShareNotePdfDocumentOptions): string {
  const iconInner = options?.brandIconDataUri
    ? `<img class="share-pdf-brand-icon" src="${options.brandIconDataUri}" alt="" width="24" height="24" />`
    : '<span class="share-pdf-brand-mark" aria-hidden="true"></span>';

  return `<div class="share-pdf-brand-badge" aria-hidden="true">${iconInner}</div>`;
}

/** App icon mark — keep in sync with web `share-note-pdf-footer.ts`. */
export const SHARE_PDF_BRAND_BADGE_STYLES = `
  .share-pdf-brand-badge {
    position: fixed;
    top: 0;
    right: 0;
    z-index: 2;
    line-height: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .share-pdf-brand-mark {
    display: block;
    width: 24pt;
    height: 24pt;
    border-radius: 6pt;
    background: linear-gradient(180deg, #3b82f6 0%, #06b6d4 100%);
    box-shadow: 0 1pt 4pt rgba(37, 99, 235, 0.18);
  }
  .share-pdf-brand-icon {
    width: 24pt;
    height: 24pt;
    display: block;
    border-radius: 6pt;
  }
`;

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
