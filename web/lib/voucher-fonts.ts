import type PDFDocument from 'pdfkit';

export type VoucherPdfFonts = { regular: string; bold: string; mono: string };

const GOOGLE_FONTS_CSS_ONEST =
  'https://fonts.googleapis.com/css2?family=Onest:wght@400;700&display=swap';
const GOOGLE_FONTS_CSS_MONO =
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@700&display=swap';

let loadPromise: Promise<{ regular: Buffer; bold: Buffer; mono: Buffer }> | null = null;

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

async function fetchFontBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Fonts CDN: failed to download ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function loadVoucherFontsFromGoogleCdn(): Promise<{
  regular: Buffer;
  bold: Buffer;
  mono: Buffer;
}> {
  const [onestCssRes, monoCssRes] = await Promise.all([
    fetch(GOOGLE_FONTS_CSS_ONEST, { headers: { Accept: 'text/css' } }),
    fetch(GOOGLE_FONTS_CSS_MONO, { headers: { Accept: 'text/css' } }),
  ]);
  if (!onestCssRes.ok) {
    throw new Error(`Google Fonts CSS failed: ${onestCssRes.status}`);
  }
  if (!monoCssRes.ok) {
    throw new Error(`Google Fonts CSS failed: ${monoCssRes.status}`);
  }

  const onestUrls = parseFontUrlsFromCss(await onestCssRes.text(), [400, 700]);
  const monoUrls = parseFontUrlsFromCss(await monoCssRes.text(), [700]);
  const regularUrl = onestUrls.get(400);
  const boldUrl = onestUrls.get(700);
  const monoUrl = monoUrls.get(700);
  if (!regularUrl || !boldUrl) {
    throw new Error('Google Fonts CDN: missing Onest 400/700 URLs');
  }
  if (!monoUrl) {
    throw new Error('Google Fonts CDN: missing JetBrains Mono 700 URL');
  }

  const [regular, bold, mono] = await Promise.all([
    fetchFontBuffer(regularUrl),
    fetchFontBuffer(boldUrl),
    fetchFontBuffer(monoUrl),
  ]);
  return { regular, bold, mono };
}

function getFontBuffers(): Promise<{ regular: Buffer; bold: Buffer; mono: Buffer }> {
  if (!loadPromise) loadPromise = loadVoucherFontsFromGoogleCdn();
  return loadPromise;
}

/** Loads Onest + JetBrains Mono (code) from Google Fonts CDN into PDFKit. */
export async function resolveVoucherPdfFonts(
  doc: InstanceType<typeof PDFDocument>,
): Promise<VoucherPdfFonts> {
  const { regular, bold, mono } = await getFontBuffers();
  doc.registerFont('VoucherSans', regular);
  doc.registerFont('VoucherSans-Bold', bold);
  doc.registerFont('VoucherMono', mono);
  return { regular: 'VoucherSans', bold: 'VoucherSans-Bold', mono: 'VoucherMono' };
}
