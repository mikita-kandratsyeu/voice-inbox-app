import { buildShareNotePdfHtmlDocument } from '@/lib/share-note-pdf-html';
import type { ShareNotePdfDocumentOptions } from '@/lib/share-note-pdf-footer';

/** A4 margin in inches (28 pt ≈ 0.389 in) — matches mobile `writeShareMarkdownPdf.ts`. */
const PDF_MARGIN_IN = 28 / 72;

export async function renderShareNotePdf(
  markdown: string,
  documentTitle: string,
  options?: ShareNotePdfDocumentOptions,
): Promise<Buffer> {
  const html = buildShareNotePdfHtmlDocument(markdown, documentTitle, options);
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
