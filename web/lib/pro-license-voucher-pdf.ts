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
import { loadVoucherAppIconPng } from '@/lib/voucher-app-icon-png';

const PAGE_W = 792;
const PAGE_H = 306;
const MARGIN = 18;
const SIDEBAR_W = 200;

const COL = {
  sidebarBg: '#F3F3F3',
  codeBg: '#FFFFFF',
  muted: '#555555',
  line: '#D0D0D0',
  ink: '#000000',
} as const;

export type VoucherPdfInput = {
  plainKey: string;
  duration: ProLicenseDurationSpec;
  scanUrl: string;
  locale: VoucherLocale;
};

type PdfDoc = InstanceType<typeof PDFDocument>;

type PdfFonts = { regular: string; bold: string };

function resolvePdfFonts(doc: PdfDoc): PdfFonts {
  const dir = getVoucherPdfDejaVuDir();
  doc.registerFont('VoucherSans', path.join(dir, 'DejaVuSans.ttf'));
  doc.registerFont('VoucherSans-Bold', path.join(dir, 'DejaVuSans-Bold.ttf'));
  return { regular: 'VoucherSans', bold: 'VoucherSans-Bold' };
}

function drawDashedCutLine(doc: PdfDoc): void {
  doc.save();
  doc.lineWidth(0.75);
  doc.dash(4, { space: 3 });
  doc.strokeColor(COL.ink);
  doc.rect(MARGIN, MARGIN, PAGE_W - MARGIN * 2, PAGE_H - MARGIN * 2).stroke();
  doc.undash();
  doc.restore();
}

function drawScissors(doc: PdfDoc, x: number, y: number, flip = false): void {
  doc.save();
  doc.translate(x, y);
  if (flip) doc.rotate(180);
  doc.lineWidth(1);
  doc.strokeColor(COL.ink);
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
  doc.strokeColor(COL.ink);
  doc.roundedRect(cx - w / 2, cy - h / 2, w, h, 2).stroke();
  doc.circle(cx, cy + h / 2 - 4, 1.2).fill(COL.ink);
  doc.restore();
}

function drawCardIcon(doc: PdfDoc, cx: number, cy: number): void {
  const w = 24;
  const h = 16;
  doc.save();
  doc.lineWidth(1.2);
  doc.strokeColor(COL.ink);
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
  doc.strokeColor(COL.ink);
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

  const iconY = y + 12;
  if (icon === 'phone') drawPhoneIcon(doc, x, iconY);
  else if (icon === 'card') drawCardIcon(doc, x, iconY);
  else drawCheckIcon(doc, x, iconY);

  const titleText = `${stepNum}. ${title}`;
  doc.font(fonts.bold).fontSize(titleSize).fillColor(COL.ink);
  const titleY = y + 32;
  const titleHeight = doc.heightOfString(titleText, {
    width: STEP_COL_W,
    align: 'center',
    lineGap: 0,
  });
  doc.text(titleText, left, titleY, { width: STEP_COL_W, align: 'center', lineGap: 0 });

  doc.font(fonts.regular).fontSize(detailSize).fillColor(COL.muted);
  const detailY = titleY + titleHeight + titleGap;
  doc.text(detail, left, detailY, { width: STEP_COL_W, align: 'center', lineGap: 0.5 });
}

async function qrPngBuffer(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    margin: 1,
    width: 140,
    errorCorrectionLevel: 'M',
  });
}

async function drawGiftSidebar(
  doc: PdfDoc,
  fonts: PdfFonts,
  copy: ReturnType<typeof getVoucherPdfCopy>,
  headline: string,
): Promise<void> {
  const innerL = MARGIN;
  const innerR = MARGIN + SIDEBAR_W;
  const innerT = MARGIN;
  const innerB = PAGE_H - MARGIN;

  doc.save();
  doc.rect(innerL, innerT, innerR - innerL, innerB - innerT).fill(COL.sidebarBg);
  doc.restore();

  const contentX = MARGIN + 14;
  const contentW = SIDEBAR_W - 28;
  const iconSize = 46;
  const iconTop = innerT + 22;
  const iconBuf = await loadVoucherAppIconPng(Math.round(iconSize * 3));

  doc.image(iconBuf, contentX, iconTop, {
    width: iconSize,
    height: iconSize,
  });

  const textY = iconTop + iconSize + 12;
  doc.font(fonts.bold).fontSize(22).fillColor(COL.ink);
  doc.text(headline, contentX, textY, {
    width: contentW,
    lineGap: 1,
    align: 'left',
  });

  doc.font(fonts.regular).fontSize(7).fillColor(COL.muted);
  doc.text(copy.thankYouSidebar, contentX, innerB - 50, {
    width: contentW,
    lineGap: 1,
    align: 'left',
  });
}

async function drawVoucherPage(
  doc: PdfDoc,
  input: VoucherPdfInput,
  fonts: PdfFonts,
): Promise<void> {
  doc.addPage({ size: [PAGE_W, PAGE_H], margins: { top: 0, bottom: 0, left: 0, right: 0 } });
  const copy = getVoucherPdfCopy(input.locale);
  const headline = formatVoucherPremiumAccessHeadline(input.duration, input.locale);

  drawDashedCutLine(doc);
  drawScissors(doc, MARGIN + 10, MARGIN + 10);
  drawScissors(doc, PAGE_W - MARGIN - 10, PAGE_H - MARGIN - 10, true);

  await drawGiftSidebar(doc, fonts, copy, headline);

  const mainX = MARGIN + SIDEBAR_W + 10;
  const mainW = PAGE_W - mainX - MARGIN - 10;

  doc.moveTo(MARGIN + SIDEBAR_W, MARGIN + 14).lineTo(MARGIN + SIDEBAR_W, PAGE_H - MARGIN - 14);
  doc.lineWidth(0.75).strokeColor(COL.line);

  doc.font(fonts.bold).fontSize(28).fillColor(COL.ink);
  doc.text(copy.giftVoucherTitle, mainX, MARGIN + 26, { width: mainW - 140 });

  const qrSize = 72;
  const qrX = PAGE_W - MARGIN - qrSize - 14;
  const qrY = MARGIN + 22;
  const qrBuf = await qrPngBuffer(input.scanUrl);
  doc.image(qrBuf, qrX, qrY, { width: qrSize, height: qrSize });

  doc.font(fonts.regular).fontSize(7).fillColor(COL.ink);
  doc.text(copy.scanToOpen, qrX - 2, qrY + qrSize + 5, {
    width: qrSize + 4,
    align: 'center',
  });

  doc.font(fonts.regular).fontSize(8).fillColor(COL.ink);
  doc.text(copy.yourCode, mainX, MARGIN + 86, { width: mainW });

  const codeY = MARGIN + 100;
  const codeH = 38;
  const codeW = mainW - 150;
  doc.lineWidth(1).strokeColor(COL.ink);
  doc.rect(mainX, codeY, codeW, codeH).stroke();
  doc.font(fonts.bold).fontSize(18).fillColor(COL.ink);
  doc.text(input.plainKey, mainX + 8, codeY + 11, {
    width: codeW - 16,
    align: 'center',
    characterSpacing: 0.8,
  });

  const stepsY = PAGE_H - MARGIN - 96;
  const stepW = (mainW - 40) / 3;
  const step1X = mainX + stepW * 0.5;
  const step2X = mainX + stepW * 1.5;
  const step3X = mainX + stepW * 2.5;
  const loc = input.locale;
  drawStep(doc, fonts, step1X, stepsY, 1, copy.stepTitles[0], copy.stepDetails[0], 'phone', loc);
  drawStep(doc, fonts, step2X, stepsY, 2, copy.stepTitles[1], copy.stepDetails[1], 'card', loc);
  drawStep(doc, fonts, step3X, stepsY, 3, copy.stepTitles[2], copy.stepDetails[2], 'check', loc);

  const footerY = PAGE_H - MARGIN - 20;
  doc.moveTo(mainX, footerY - 6).lineTo(PAGE_W - MARGIN - 12, footerY - 6);
  doc.lineWidth(0.5).strokeColor(COL.line);
  doc.font(fonts.regular).fontSize(7).fillColor(COL.muted);
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
  const fonts = resolvePdfFonts(doc);
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
