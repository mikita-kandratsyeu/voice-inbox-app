import path from 'node:path';

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

import type { ProLicenseDurationSpec } from '@/lib/pro-license-admin';
import {
  formatVoucherPremiumAccessHeadline,
  getVoucherPdfCopy,
  getVoucherPdfDejaVuDir,
  type VoucherLocale,
} from '@/lib/pro-license-voucher-copy';

const PAGE_W = 792;
const PAGE_H = 306;
const MARGIN = 18;
const SIDEBAR_W = 200;

export type VoucherPdfInput = {
  plainKey: string;
  duration: ProLicenseDurationSpec;
  scanUrl: string;
  locale: VoucherLocale;
};

type PdfDoc = InstanceType<typeof PDFDocument>;

type PdfFonts = { regular: string; bold: string };

function resolvePdfFonts(doc: PdfDoc, locale: VoucherLocale): PdfFonts {
  if (locale === 'en') {
    return { regular: 'Helvetica', bold: 'Helvetica-Bold' };
  }
  const dir = getVoucherPdfDejaVuDir();
  doc.registerFont('VoucherSans', path.join(dir, 'DejaVuSans.ttf'));
  doc.registerFont('VoucherSans-Bold', path.join(dir, 'DejaVuSans-Bold.ttf'));
  return { regular: 'VoucherSans', bold: 'VoucherSans-Bold' };
}

function drawDashedCutLine(doc: PdfDoc): void {
  doc.save();
  doc.lineWidth(0.75);
  doc.dash(4, { space: 3 });
  doc.strokeColor('#000000');
  doc.rect(MARGIN, MARGIN, PAGE_W - MARGIN * 2, PAGE_H - MARGIN * 2).stroke();
  doc.undash();
  doc.restore();
}

function drawScissors(doc: PdfDoc, x: number, y: number, flip = false): void {
  doc.save();
  doc.translate(x, y);
  if (flip) doc.rotate(180);
  doc.lineWidth(1);
  doc.strokeColor('#000000');
  doc.circle(-4, 0, 3).stroke();
  doc.circle(4, 0, 3).stroke();
  doc.moveTo(-4, 0).lineTo(8, 10).stroke();
  doc.moveTo(4, 0).lineTo(-8, 10).stroke();
  doc.restore();
}

function drawPhoneIcon(doc: PdfDoc, cx: number, cy: number): void {
  const w = 14;
  const h = 22;
  doc.save();
  doc.lineWidth(1.2);
  doc.strokeColor('#000000');
  doc.roundedRect(cx - w / 2, cy - h / 2, w, h, 2).stroke();
  doc.circle(cx, cy + h / 2 - 4, 1.2).fill('#000000');
  doc.restore();
}

function drawCardIcon(doc: PdfDoc, cx: number, cy: number): void {
  const w = 24;
  const h = 16;
  doc.save();
  doc.lineWidth(1.2);
  doc.strokeColor('#000000');
  doc.rect(cx - w / 2, cy - h / 2, w, h).stroke();
  doc
    .moveTo(cx - w / 2 + 3, cy - 2)
    .lineTo(cx + w / 2 - 3, cy - 2)
    .stroke();
  doc.restore();
}

function drawCheckIcon(doc: PdfDoc, cx: number, cy: number): void {
  doc.save();
  doc.lineWidth(1.2);
  doc.strokeColor('#000000');
  doc.circle(cx, cy, 11).stroke();
  doc
    .moveTo(cx - 4, cy)
    .lineTo(cx - 1, cy + 4)
    .lineTo(cx + 5, cy - 4)
    .stroke();
  doc.restore();
}

const STEP_COL_W = 124;

function drawStep(
  doc: PdfDoc,
  fonts: PdfFonts,
  x: number,
  y: number,
  stepNum: number,
  title: string,
  detail: string,
  icon: 'phone' | 'card' | 'check',
  locale: VoucherLocale,
): void {
  const left = x - STEP_COL_W / 2;
  const titleSize = locale === 'ru' ? 6.5 : 7;
  const detailSize = locale === 'ru' ? 5.25 : 5.5;
  const titleGap = locale === 'ru' ? 5 : 4;

  const iconY = y + 10;
  if (icon === 'phone') drawPhoneIcon(doc, x, iconY);
  else if (icon === 'card') drawCardIcon(doc, x, iconY);
  else drawCheckIcon(doc, x, iconY);

  const titleText = `${stepNum}. ${title}`;
  doc.font(fonts.bold).fontSize(titleSize).fillColor('#000000');
  const titleY = y + 28;
  const titleHeight = doc.heightOfString(titleText, {
    width: STEP_COL_W,
    align: 'center',
    lineGap: 0,
  });
  doc.text(titleText, left, titleY, { width: STEP_COL_W, align: 'center', lineGap: 0 });

  doc.font(fonts.regular).fontSize(detailSize).fillColor('#000000');
  const detailY = titleY + titleHeight + titleGap;
  doc.text(detail, left, detailY, { width: STEP_COL_W, align: 'center', lineGap: 0.5 });
}

async function qrPngBuffer(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    margin: 0,
    width: 128,
    errorCorrectionLevel: 'M',
  });
}

async function drawVoucherPage(
  doc: PdfDoc,
  input: VoucherPdfInput,
  fonts: PdfFonts,
): Promise<void> {
  doc.addPage({ size: [PAGE_W, PAGE_H], margins: { top: 0, bottom: 0, left: 0, right: 0 } });
  const copy = getVoucherPdfCopy(input.locale);

  drawDashedCutLine(doc);
  drawScissors(doc, MARGIN + 10, MARGIN + 10);
  drawScissors(doc, PAGE_W - MARGIN - 10, PAGE_H - MARGIN - 10, true);

  const sidebarX = MARGIN + 12;
  const sidebarTop = MARGIN + 28;
  const mainX = MARGIN + SIDEBAR_W + 8;
  const mainW = PAGE_W - mainX - MARGIN - 12;

  doc.font(fonts.regular).fontSize(8).fillColor('#000000');
  doc.text(copy.brandName, sidebarX, sidebarTop, { width: SIDEBAR_W - 16 });

  const headline = formatVoucherPremiumAccessHeadline(input.duration, input.locale);
  doc.font(fonts.bold).fontSize(22).fillColor('#000000');
  doc.text(headline, sidebarX, sidebarTop + 52, {
    width: SIDEBAR_W - 20,
    lineGap: 2,
  });

  doc.moveTo(MARGIN + SIDEBAR_W, MARGIN + 14).lineTo(MARGIN + SIDEBAR_W, PAGE_H - MARGIN - 14);
  doc.lineWidth(0.75).strokeColor('#000000').stroke();

  doc.font(fonts.regular).fontSize(7).fillColor('#000000');
  doc.text(copy.thankYouSidebar, sidebarX, PAGE_H - MARGIN - 52, {
    width: SIDEBAR_W - 16,
    lineGap: 1,
  });

  doc.font(fonts.bold).fontSize(28).fillColor('#000000');
  doc.text(copy.giftVoucherTitle, mainX, MARGIN + 28, { width: mainW - 140 });

  const qrBuf = await qrPngBuffer(input.scanUrl);
  const qrSize = 72;
  const qrX = PAGE_W - MARGIN - qrSize - 16;
  const qrY = MARGIN + 24;
  doc.image(qrBuf, qrX, qrY, { width: qrSize, height: qrSize });
  doc.font(fonts.regular).fontSize(7).fillColor('#000000');
  doc.text(copy.scanToOpen, qrX - 4, qrY + qrSize + 4, {
    width: qrSize + 8,
    align: 'center',
  });

  doc.font(fonts.regular).fontSize(8).fillColor('#000000');
  doc.text(copy.yourCode, mainX, MARGIN + 88, { width: mainW });

  const codeY = MARGIN + 102;
  const codeH = 36;
  doc.lineWidth(1).strokeColor('#000000');
  doc.rect(mainX, codeY, mainW - 150, codeH).stroke();
  doc.font(fonts.bold).fontSize(18).fillColor('#000000');
  doc.text(input.plainKey, mainX + 10, codeY + 10, {
    width: mainW - 170,
    characterSpacing: 0.5,
  });

  const stepsY = PAGE_H - MARGIN - 102;
  const stepW = (mainW - 40) / 3;
  const step1X = mainX + stepW * 0.5;
  const step2X = mainX + stepW * 1.5;
  const step3X = mainX + stepW * 2.5;
  const loc = input.locale;
  drawStep(doc, fonts, step1X, stepsY, 1, copy.stepTitles[0], copy.stepDetails[0], 'phone', loc);
  drawStep(doc, fonts, step2X, stepsY, 2, copy.stepTitles[1], copy.stepDetails[1], 'card', loc);
  drawStep(doc, fonts, step3X, stepsY, 3, copy.stepTitles[2], copy.stepDetails[2], 'check', loc);

  const footerY = PAGE_H - MARGIN - 18;
  doc.moveTo(mainX, footerY - 6).lineTo(PAGE_W - MARGIN - 12, footerY - 6);
  doc.lineWidth(0.5).stroke();
  doc.font(fonts.regular).fontSize(7).fillColor('#000000');
  doc.text(copy.footerLegal, mainX, footerY, {
    width: mainW,
    align: 'center',
  });
}

function createVoucherPdfDocument(): PdfDoc {
  return new PDFDocument({
    size: [PAGE_W, PAGE_H],
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    autoFirstPage: false,
  });
}

function collectPdfBuffer(doc: PdfDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

/** One PDF with a voucher per page (for print). */
export async function renderVouchersPrintPdf(inputs: VoucherPdfInput[]): Promise<Buffer> {
  if (inputs.length === 0) {
    throw new Error('At least one voucher is required');
  }
  const doc = createVoucherPdfDocument();
  const done = collectPdfBuffer(doc);
  const fonts = resolvePdfFonts(doc, inputs[0]!.locale);
  try {
    for (const input of inputs) {
      await drawVoucherPage(doc, input, fonts);
    }
    doc.end();
  } catch (e) {
    doc.destroy();
    throw e;
  }
  return done;
}

/** Single-page voucher PDF. */
export function renderVoucherPdf(input: VoucherPdfInput): Promise<Buffer> {
  return renderVouchersPrintPdf([input]);
}

export async function buildVoucherPdfZip(
  vouchers: { filename: string; input: VoucherPdfInput }[],
): Promise<Buffer> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  for (const v of vouchers) {
    const pdf = await renderVoucherPdf(v.input);
    zip.file(v.filename, pdf);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
