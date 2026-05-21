import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

import type { ProLicenseDurationSpec } from '@/lib/pro-license-admin';
import {
  formatVoucherPremiumAccessHeadline,
  getVoucherPdfCopy,
  type VoucherLocale,
} from '@/lib/pro-license-voucher-copy';
import { resolveVoucherPdfFonts, type VoucherPdfFonts } from '@/lib/voucher-fonts';
import { VOUCHER_PREVIEW_KEY_ID } from '@/lib/pro-license-voucher-shared';
import { loadVoucherAppIconPng } from '@/lib/voucher-app-icon-png';

const PAGE_W = 792;
const PAGE_H = 306;
const MARGIN = 18;
const SIDEBAR_W = 200;

const COL = {
  sidebarBg: '#F3F3F3',
  codeBg: '#FFFFFF',
  muted: '#555555',
  faint: '#B5B5B5',
  watermark: '#D8D8D8',
  line: '#D0D0D0',
  ink: '#000000',
} as const;

export type VoucherPdfInput = {
  plainKey: string;
  keyId: string;
  duration: ProLicenseDurationSpec;
  scanUrl: string;
  locale: VoucherLocale;
  /** Partner / promo name shown under the gift title line (optional). */
  promoLabel?: string | null;
};

type PdfDoc = InstanceType<typeof PDFDocument>;

type PdfFonts = VoucherPdfFonts;

/** Preview-only SAMPLE watermark; issued print vouchers have none. */
function drawVoucherWatermark(doc: PdfDoc, fonts: PdfFonts, input: VoucherPdfInput): void {
  if (input.keyId !== VOUCHER_PREVIEW_KEY_ID) return;

  const label = input.locale === 'ru' ? 'ОБРАЗЕЦ' : 'SAMPLE';

  const innerL = MARGIN;
  const innerT = MARGIN;
  const innerW = PAGE_W - MARGIN * 2;
  const innerH = PAGE_H - MARGIN * 2;
  const cx = innerL + innerW / 2;
  const cy = innerT + innerH / 2;
  const maxTextW = innerW * 0.78;

  doc.save();
  doc.rect(innerL, innerT, innerW, innerH).clip();

  doc.translate(cx, cy);
  doc.rotate(-45);
  doc.fillColor(COL.watermark);

  let fontSize = 64;
  doc.font(fonts.bold).fontSize(fontSize);
  while (fontSize > 28 && doc.widthOfString(label) > maxTextW) {
    fontSize -= 2;
    doc.fontSize(fontSize);
  }
  doc.opacity(0.12);
  const w = doc.widthOfString(label);
  doc.text(label, -w / 2, -fontSize * 0.35, { lineBreak: false });

  doc.opacity(1);
  doc.restore();
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
  const scale = 0.6;
  doc.save();
  doc.translate(x, y);
  if (flip) doc.rotate(180);
  doc.scale(scale);
  doc.lineWidth(0.85);
  doc.strokeColor(COL.ink);
  doc.circle(-4, 0, 3).stroke();
  doc.circle(4, 0, 3).stroke();
  doc.moveTo(-4, 0).lineTo(8, 10).stroke();
  doc.moveTo(4, 0).lineTo(-8, 10).stroke();
  doc.restore();
}

function drawPhoneIcon(doc: PdfDoc, cx: number, cy: number): void {
  const w = 10;
  const h = 16;
  doc.save();
  doc.lineWidth(0.9);
  doc.strokeColor(COL.ink);
  doc.roundedRect(cx - w / 2, cy - h / 2, w, h, 1.5).stroke();
  doc.circle(cx, cy + h / 2 - 3, 0.9).fill(COL.ink);
  doc.restore();
}

function drawCardIcon(doc: PdfDoc, cx: number, cy: number): void {
  const w = 17;
  const h = 11;
  doc.save();
  doc.lineWidth(0.9);
  doc.strokeColor(COL.ink);
  doc.rect(cx - w / 2, cy - h / 2, w, h).stroke();
  doc
    .moveTo(cx - w / 2 + 2, cy - 1.5)
    .lineTo(cx + w / 2 - 2, cy - 1.5)
    .stroke();
  doc.restore();
}

function drawCheckIcon(doc: PdfDoc, cx: number, cy: number): void {
  doc.save();
  doc.lineWidth(0.9);
  doc.strokeColor(COL.ink);
  doc.circle(cx, cy, 8).stroke();
  doc
    .moveTo(cx - 3, cy)
    .lineTo(cx - 0.5, cy + 3)
    .lineTo(cx + 4, cy - 3.5)
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
): number {
  const left = x - STEP_COL_W / 2;
  const titleSize = locale === 'ru' ? 6.5 : 7;
  const detailSize = locale === 'ru' ? 5.25 : 5.5;
  const titleGap = locale === 'ru' ? 5 : 4;
  const detailLineGap = locale === 'ru' ? 0.35 : 0.5;

  const iconY = y + 9;
  if (icon === 'phone') drawPhoneIcon(doc, x, iconY);
  else if (icon === 'card') drawCardIcon(doc, x, iconY);
  else drawCheckIcon(doc, x, iconY);

  const titleText = `${stepNum}. ${title}`;
  doc.font(fonts.bold).fontSize(titleSize).fillColor(COL.ink);
  const titleY = y + 24;
  const titleHeight = doc.heightOfString(titleText, {
    width: STEP_COL_W,
    align: 'center',
    lineGap: 0,
  });
  doc.text(titleText, left, titleY, { width: STEP_COL_W, align: 'center', lineGap: 0 });

  doc.font(fonts.regular).fontSize(detailSize).fillColor(COL.muted);
  const detailY = titleY + titleHeight + titleGap;
  const detailHeight = doc.heightOfString(detail, {
    width: STEP_COL_W,
    align: 'center',
    lineGap: detailLineGap,
  });
  doc.text(detail, left, detailY, {
    width: STEP_COL_W,
    align: 'center',
    lineGap: detailLineGap,
  });
  return detailY + detailHeight;
}

type VoucherPdfCopy = ReturnType<typeof getVoucherPdfCopy>;

/** Stacked title: GIFT → VOUCHER. Returns Y below the block. */
function drawVoucherTitleBlock(
  doc: PdfDoc,
  fonts: PdfFonts,
  copy: VoucherPdfCopy,
  x: number,
  y: number,
  width: number,
): number {
  let cursorY = y;

  doc.font(fonts.bold).fontSize(28).fillColor(COL.ink);
  const giftH = doc.heightOfString(copy.titleGiftLine, { width, lineGap: 0 });
  doc.text(copy.titleGiftLine, x, cursorY, { width, lineGap: 0 });
  cursorY += giftH + 2;

  doc.font(fonts.bold).fontSize(28).fillColor(COL.ink);
  const voucherH = doc.heightOfString(copy.titleVoucherLine, { width, lineGap: 0 });
  doc.text(copy.titleVoucherLine, x, cursorY, { width, lineGap: 0 });
  cursorY += voucherH;

  return cursorY;
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
  promoLabel: string | null | undefined,
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

  let textY = iconTop + iconSize + 10;
  const promo = promoLabel?.trim();
  if (promo) {
    doc.font(fonts.regular).fontSize(9).fillColor(COL.muted);
    const promoH = doc.heightOfString(promo, { width: contentW, lineGap: 0 });
    doc.text(promo, contentX, textY, {
      width: contentW,
      align: 'left',
      lineGap: 0,
      characterSpacing: 0.3,
    });
    textY += promoH + 8;
  }

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
  drawVoucherWatermark(doc, fonts, input);
  // Scissors sit in the page margin, outside the dashed cut line.
  drawScissors(doc, MARGIN - 12, MARGIN - 10);
  drawScissors(doc, PAGE_W - MARGIN + 12, PAGE_H - MARGIN + 10, true);

  await drawGiftSidebar(doc, fonts, copy, headline, input.promoLabel);

  const mainX = MARGIN + SIDEBAR_W + 10;
  const mainW = PAGE_W - mainX - MARGIN - 10;

  doc.moveTo(MARGIN + SIDEBAR_W, MARGIN + 14).lineTo(MARGIN + SIDEBAR_W, PAGE_H - MARGIN - 14);
  doc.lineWidth(0.75).strokeColor(COL.line);

  const titleWidth = mainW - 140;
  const titleBottom = drawVoucherTitleBlock(doc, fonts, copy, mainX, MARGIN + 26, titleWidth);

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

  const codeW = Math.min(380, mainW - 32);
  const codeX = mainX + (mainW - codeW) / 2;

  const yourCodeY = titleBottom + 12;
  doc.font(fonts.regular).fontSize(8).fillColor(COL.ink);
  doc.text(copy.yourCode, mainX, yourCodeY, { width: mainW, align: 'center' });

  const codeY = yourCodeY + 14;
  const codeH = 38;
  doc.lineWidth(1).strokeColor(COL.ink);
  doc.rect(codeX, codeY, codeW, codeH).stroke();
  doc.font(fonts.bold).fontSize(18).fillColor(COL.ink);
  doc.text(input.plainKey, codeX + 8, codeY + 11, {
    width: codeW - 16,
    align: 'center',
    characterSpacing: 0.8,
  });

  const loc = input.locale;
  const codeBottom = codeY + codeH;
  const stepsAnchor = loc === 'ru' ? PAGE_H - MARGIN - 108 : PAGE_H - MARGIN - 96;
  const stepsY = Math.max(codeBottom + 20, stepsAnchor);
  const stepW = (mainW - 40) / 3;
  const step1X = mainX + stepW * 0.5;
  const step2X = mainX + stepW * 1.5;
  const step3X = mainX + stepW * 2.5;
  const stepBottom = Math.max(
    drawStep(doc, fonts, step1X, stepsY, 1, copy.stepTitles[0], copy.stepDetails[0], 'phone', loc),
    drawStep(doc, fonts, step2X, stepsY, 2, copy.stepTitles[1], copy.stepDetails[1], 'card', loc),
    drawStep(doc, fonts, step3X, stepsY, 3, copy.stepTitles[2], copy.stepDetails[2], 'check', loc),
  );

  const footerGap = loc === 'ru' ? 18 : 13;
  let footerTextY = stepBottom + footerGap;
  const footerBottomLimit = PAGE_H - MARGIN - (loc === 'ru' ? 26 : 20);
  const footerTopLimit = stepBottom + 12;
  if (footerTextY > footerBottomLimit) footerTextY = footerBottomLimit;
  if (footerTextY < footerTopLimit) footerTextY = footerTopLimit;

  const footerRuleY = footerTextY - 9;
  doc.moveTo(mainX, footerRuleY).lineTo(PAGE_W - MARGIN - 12, footerRuleY);
  doc.lineWidth(0.5).strokeColor(COL.line);
  doc.font(fonts.regular).fontSize(7).fillColor(COL.muted);
  doc.text(copy.footerLegal, mainX, footerTextY, {
    width: mainW,
    align: 'center',
  });

  doc.font(fonts.regular).fontSize(4.5).fillColor(COL.faint);
  doc.text(input.keyId, MARGIN + 8, PAGE_H - MARGIN - 10, {
    width: PAGE_W - MARGIN * 2 - 16,
    align: 'left',
    lineGap: 0,
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
  const fonts = resolveVoucherPdfFonts(doc);
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
