import type { ShareNotePdfDocumentOptions } from '@/lib/share-note-pdf-footer';
import { buildShareNotePdfHtmlDocument } from '@/lib/share-note-pdf-html';
import { loadVoucherAppIconPng } from '@/lib/voucher-app-icon-png';

/** A4 margin in inches (28 pt ≈ 0.389 in) — matches mobile `writeShareMarkdownPdf.ts`. */
const PDF_MARGIN_IN = 28 / 72;

export async function renderShareNotePdf(
  markdown: string,
  documentTitle: string,
  options?: ShareNotePdfDocumentOptions,
): Promise<Buffer> {
  let brandIconDataUri: string | undefined;
  try {
    const png = await loadVoucherAppIconPng(64);
    brandIconDataUri = `data:image/png;base64,${png.toString('base64')}`;
  } catch {
    brandIconDataUri = undefined;
  }

  const html = buildShareNotePdfHtmlDocument(markdown, documentTitle, {
    ...options,
    brandIconDataUri,
  });
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      margin: {
        top: `${PDF_MARGIN_IN}in`,
        right: `${PDF_MARGIN_IN}in`,
        bottom: `${PDF_MARGIN_IN}in`,
        left: `${PDF_MARGIN_IN}in`,
      },
      printBackground: true,
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
