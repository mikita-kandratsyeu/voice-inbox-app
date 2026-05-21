import type PDFDocument from 'pdfkit';

export type VoucherPdfFonts = { regular: string; bold: string };

/** Same family as the site (`next/font/google` Onest). */
const VOUCHER_FONT_FAMILY = 'Onest';
const GOOGLE_FONTS_CSS = `https://fonts.googleapis.com/css2?family=${VOUCHER_FONT_FAMILY}:wght@400;700&display=swap`;

let loadPromise: Promise<{ regular: Buffer; bold: Buffer }> | null = null;

function parseFontUrlsFromCss(css: string, weights: number[]): Map<number, string> {
  const urls = new Map<number, string>();
  for (const block of css.split('@font-face')) {
    const weightMatch = block.match(/font-weight:\s*(\d+)/);
    const urlMatch = block.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
    if (!weightMatch || !urlMatch) continue;
    const weight = Number(weightMatch[1]);
    if (weights.includes(weight)) urls.set(weight, urlMatch[1]!);
  }
  return urls;
}

async function loadOnestFromGoogleCdn(): Promise<{ regular: Buffer; bold: Buffer }> {
  const cssRes = await fetch(GOOGLE_FONTS_CSS, {
    headers: { Accept: 'text/css' },
  });
  if (!cssRes.ok) {
    throw new Error(`Google Fonts CSS failed: ${cssRes.status}`);
  }
  const css = await cssRes.text();
  const urls = parseFontUrlsFromCss(css, [400, 700]);
  const regularUrl = urls.get(400);
  const boldUrl = urls.get(700);
  if (!regularUrl || !boldUrl) {
    throw new Error(`Google Fonts CDN: missing Onest 400/700 URLs`);
  }

  const [regularRes, boldRes] = await Promise.all([fetch(regularUrl), fetch(boldUrl)]);
  if (!regularRes.ok || !boldRes.ok) {
    throw new Error('Google Fonts CDN: failed to download Onest files');
  }

  return {
    regular: Buffer.from(await regularRes.arrayBuffer()),
    bold: Buffer.from(await boldRes.arrayBuffer()),
  };
}

function getOnestBuffers(): Promise<{ regular: Buffer; bold: Buffer }> {
  if (!loadPromise) loadPromise = loadOnestFromGoogleCdn();
  return loadPromise;
}

/** Loads Onest from [Google Fonts](https://fonts.google.com/) CDN into PDFKit. */
export async function resolveVoucherPdfFonts(
  doc: InstanceType<typeof PDFDocument>,
): Promise<VoucherPdfFonts> {
  const { regular, bold } = await getOnestBuffers();
  doc.registerFont('VoucherSans', regular);
  doc.registerFont('VoucherSans-Bold', bold);
  return { regular: 'VoucherSans', bold: 'VoucherSans-Bold' };
}
