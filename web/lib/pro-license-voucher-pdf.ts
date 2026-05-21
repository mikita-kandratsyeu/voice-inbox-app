import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

import type { ProLicenseDurationSpec } from '@/lib/pro-license-admin';
import {
  formatVoucherPremiumAccessHeadline,
  getVoucherPdfCopy,
  type VoucherLocale,
} from '@/lib/pro-license-voucher-copy';
import {
  getVoucherPageDimensions,
  type VoucherPrintSize,
} from '@/lib/pro-license-voucher-print-size';
import { resolveVoucherPdfFonts, type VoucherPdfFonts } from '@/lib/voucher-fonts';
import { VOUCHER_PREVIEW_KEY_ID } from '@/lib/pro-license-voucher-shared';
import { loadVoucherAppIconPng } from '@/lib/voucher-app-icon-png';

const MARGIN = 14;
const CUT_RADIUS = 8;
const PANEL_PAD = 12;

const COL = {
  muted: '#555555',
  faint: '#B5B5B5',
  watermark: '#D8D8D8',
  ink: '#000000',
} as const;

export type VoucherPdfInput = {
  plainKey: string;
  keyId: string;
  duration: ProLicenseDurationSpec;
  scanUrl: string;
  locale: VoucherLocale;
  printSize: VoucherPrintSize;
  /** Partner / promo name shown on the left flap (optional). */
  promoLabel?: string | null;
};

export type { VoucherPrintSize } from '@/lib/pro-license-voucher-print-size';

type PdfDoc = InstanceType<typeof PDFDocument>;
type PdfFonts = VoucherPdfFonts;
type VoucherPdfCopy = ReturnType<typeof getVoucherPdfCopy>;

type VoucherLayout = {
  bounds: { x: number; y: number; w: number; h: number };
  panelW: number;
  fold1X: number;
  fold2X: number;
};

function getVoucherLayout(pageW: number, pageH: number): VoucherLayout {
  const bounds = {
    x: MARGIN,
    y: MARGIN,
    w: pageW - MARGIN * 2,
    h: pageH - MARGIN * 2,
  };
  const panelW = bounds.w / 3;
  return {
    bounds,
    panelW,
    fold1X: bounds.x + panelW,
    fold2X: bounds.x + panelW * 2,
  };
}

/** Preview-only SAMPLE watermark; issued print vouchers have none. */
function drawVoucherWatermark(
  doc: PdfDoc,
  fonts: PdfFonts,
  input: VoucherPdfInput,
  layout: VoucherLayout,
): void {
  if (input.keyId !== VOUCHER_PREVIEW_KEY_ID) return;

  const label = input.locale === 'ru' ? 'ОБРАЗЕЦ' : 'SAMPLE';
  const { bounds } = layout;
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const maxTextW = bounds.w * 0.72;

  doc.save();
  doc.rect(bounds.x, bounds.y, bounds.w, bounds.h).clip();
  doc.translate(cx, cy);
  doc.rotate(-45);
  doc.fillColor(COL.watermark);

  let fontSize = 58;
  doc.font(fonts.bold).fontSize(fontSize);
  while (fontSize > 24 && doc.widthOfString(label) > maxTextW) {
    fontSize -= 2;
    doc.fontSize(fontSize);
  }
  doc.opacity(0.12);
  const w = doc.widthOfString(label);
  doc.text(label, -w / 2, -fontSize * 0.35, { lineBreak: false });
  doc.opacity(1);
  doc.restore();
}

/** Trim guide only — dashed, cut away before folding. */
function drawCutGuide(doc: PdfDoc, layout: VoucherLayout): void {
  const { bounds } = layout;
  doc.save();
  doc.lineWidth(0.5);
  doc.dash(4, { space: 3 });
  doc.strokeColor(COL.ink);
  doc.roundedRect(bounds.x, bounds.y, bounds.w, bounds.h, CUT_RADIUS).stroke();
  doc.undash();
  doc.restore();
}

function drawFoldGuides(doc: PdfDoc, layout: VoucherLayout): void {
  const { bounds, fold1X, fold2X } = layout;

  doc.save();
  doc.lineWidth(0.75);
  doc.dash(5, { space: 4 });
  doc.strokeColor(COL.ink);
  doc
    .moveTo(fold1X, bounds.y + 4)
    .lineTo(fold1X, bounds.y + bounds.h - 4)
    .stroke();
  doc
    .moveTo(fold2X, bounds.y + 4)
    .lineTo(fold2X, bounds.y + bounds.h - 4)
    .stroke();
  doc.undash();
  doc.restore();
}

function drawScissors(doc: PdfDoc, x: number, y: number, flip = false): void {
  const scale = 0.55;
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

function drawCutAlongLabels(
  doc: PdfDoc,
  fonts: PdfFonts,
  copy: VoucherPdfCopy,
  layout: VoucherLayout,
): void {
  const { bounds } = layout;
  const fontSize = 5.5;
  doc.font(fonts.bold).fontSize(fontSize).fillColor(COL.ink);

  drawScissors(doc, bounds.x - 10, bounds.y - 8);
  doc.text(copy.cutAlongOuterLine, bounds.x + 2, bounds.y - 11, { lineBreak: false });

  const labelW = doc.widthOfString(copy.cutAlongOuterLine);
  const brX = bounds.x + bounds.w + 10;
  const brY = bounds.y + bounds.h + 8;
  drawScissors(doc, brX, brY, true);
  doc.save();
  doc.translate(brX - 2, brY + 2);
  doc.rotate(180);
  doc.text(copy.cutAlongOuterLine, -labelW, -fontSize + 1, { lineBreak: false });
  doc.restore();
}

function drawPhoneIcon(doc: PdfDoc, cx: number, cy: number): void {
  const w = 9;
  const h = 14;
  doc.save();
  doc.lineWidth(0.85);
  doc.strokeColor(COL.ink);
  doc.roundedRect(cx - w / 2, cy - h / 2, w, h, 1.5).stroke();
  doc.circle(cx, cy + h / 2 - 2.5, 0.8).fill(COL.ink);
  doc.restore();
}

function drawCardIcon(doc: PdfDoc, cx: number, cy: number): void {
  const w = 15;
  const h = 10;
  doc.save();
  doc.lineWidth(0.85);
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
  doc.lineWidth(0.85);
  doc.strokeColor(COL.ink);
  doc.circle(cx, cy, 7).stroke();
  doc
    .moveTo(cx - 2.5, cy)
    .lineTo(cx - 0.5, cy + 2.5)
    .lineTo(cx + 3.5, cy - 3)
    .stroke();
  doc.restore();
}

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
  colW: number,
): number {
  const left = x - colW / 2;
  const titleSize = locale === 'ru' ? 5.5 : 6;
  const detailSize = locale === 'ru' ? 4.75 : 5;
  const titleGap = locale === 'ru' ? 4 : 3;
  const detailLineGap = locale === 'ru' ? 0.25 : 0.4;

  const iconY = y + 7;
  if (icon === 'phone') drawPhoneIcon(doc, x, iconY);
  else if (icon === 'card') drawCardIcon(doc, x, iconY);
  else drawCheckIcon(doc, x, iconY);

  const titleText = `${stepNum}. ${title}`;
  doc.font(fonts.bold).fontSize(titleSize).fillColor(COL.ink);
  const titleY = y + 20;
  const titleHeight = doc.heightOfString(titleText, {
    width: colW,
    align: 'center',
    lineGap: 0,
  });
  doc.text(titleText, left, titleY, { width: colW, align: 'center', lineGap: 0 });

  doc.font(fonts.regular).fontSize(detailSize).fillColor(COL.muted);
  const detailY = titleY + titleHeight + titleGap;
  const detailHeight = doc.heightOfString(detail, {
    width: colW,
    align: 'center',
    lineGap: detailLineGap,
  });
  doc.text(detail, left, detailY, {
    width: colW,
    align: 'center',
    lineGap: detailLineGap,
  });
  return detailY + detailHeight;
}

async function qrPngBuffer(url: string, size: number): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    margin: 1,
    width: size,
    errorCorrectionLevel: 'M',
  });
}

async function drawLeftFlap(
  doc: PdfDoc,
  fonts: PdfFonts,
  copy: VoucherPdfCopy,
  headline: string,
  promoLabel: string | null | undefined,
  layout: VoucherLayout,
): Promise<void> {
  const panelX = layout.bounds.x;
  const panelW = layout.panelW;
  const contentX = panelX + PANEL_PAD;
  const contentW = panelW - PANEL_PAD * 2;
  const top = layout.bounds.y + PANEL_PAD + 8;
  const bottom = layout.bounds.y + layout.bounds.h - PANEL_PAD;

  const iconSize = 40;
  const iconBuf = await loadVoucherAppIconPng(Math.round(iconSize * 3));
  doc.image(iconBuf, contentX, top, { width: iconSize, height: iconSize });

  let textY = top + iconSize + 10;
  const promo = promoLabel?.trim();
  if (promo) {
    doc.font(fonts.regular).fontSize(8).fillColor(COL.muted);
    const promoH = doc.heightOfString(promo, { width: contentW, lineGap: 0 });
    doc.text(promo, contentX, textY, { width: contentW, align: 'left', lineGap: 0 });
    textY += promoH + 10;
  }

  doc.font(fonts.bold).fontSize(18).fillColor(COL.ink);
  doc.text(headline, contentX, textY, { width: contentW, lineGap: 1, align: 'left' });

  const thankY = bottom - 36;
  doc.moveTo(contentX, thankY).lineTo(contentX + contentW * 0.55, thankY);
  doc.lineWidth(0.6).strokeColor(COL.ink);
  doc.stroke();

  doc.font(fonts.regular).fontSize(7).fillColor(COL.muted);
  doc.text(copy.thankYouSidebar, contentX, thankY + 8, {
    width: contentW,
    lineGap: 0.5,
    align: 'left',
  });
}

function drawCenterPanel(
  doc: PdfDoc,
  fonts: PdfFonts,
  copy: VoucherPdfCopy,
  plainKey: string,
  keyId: string,
  locale: VoucherLocale,
  layout: VoucherLayout,
): void {
  const panelX = layout.bounds.x + layout.panelW;
  const panelW = layout.panelW;
  const contentX = panelX + PANEL_PAD;
  const contentW = panelW - PANEL_PAD * 2;
  const top = layout.bounds.y + PANEL_PAD + 6;
  const bottom = layout.bounds.y + layout.bounds.h - PANEL_PAD;

  doc
    .font(fonts.bold)
    .fontSize(locale === 'ru' ? 17 : 20)
    .fillColor(COL.ink);
  const titleH = doc.heightOfString(copy.titleLine, {
    width: contentW,
    align: 'center',
    lineGap: 0,
  });
  doc.text(copy.titleLine, contentX, top, { width: contentW, align: 'center', lineGap: 0 });

  const yourCodeY = top + titleH + 10;
  doc.font(fonts.regular).fontSize(7).fillColor(COL.ink);
  doc.text(copy.yourCode, contentX, yourCodeY, { width: contentW, align: 'center' });

  const codeY = yourCodeY + 11;
  const codeH = 32;
  const codeW = contentW - 8;
  const codeX = contentX + 4;
  doc.lineWidth(1).strokeColor(COL.ink);
  doc.rect(codeX, codeY, codeW, codeH).stroke();
  doc.font(fonts.mono).fontSize(14).fillColor(COL.ink);
  doc.text(plainKey, codeX + 6, codeY + 9, {
    width: codeW - 12,
    align: 'center',
    characterSpacing: 0.8,
  });

  const codeBottom = codeY + codeH;
  const stepColW = (contentW - 12) / 3;
  const stepsY = codeBottom + 14;
  const step1X = contentX + stepColW * 0.5 + 6;
  const step2X = contentX + stepColW * 1.5 + 6;
  const step3X = contentX + stepColW * 2.5 + 6;
  const stepBottom = Math.max(
    drawStep(
      doc,
      fonts,
      step1X,
      stepsY,
      1,
      copy.stepTitles[0],
      copy.stepDetails[0],
      'phone',
      locale,
      stepColW - 4,
    ),
    drawStep(
      doc,
      fonts,
      step2X,
      stepsY,
      2,
      copy.stepTitles[1],
      copy.stepDetails[1],
      'card',
      locale,
      stepColW - 4,
    ),
    drawStep(
      doc,
      fonts,
      step3X,
      stepsY,
      3,
      copy.stepTitles[2],
      copy.stepDetails[2],
      'check',
      locale,
      stepColW - 4,
    ),
  );

  const footerY = Math.min(stepBottom + 10, bottom - 30);
  doc.font(fonts.regular).fontSize(5.5).fillColor(COL.muted);
  const footerH = doc.heightOfString(copy.footerLegal, {
    width: contentW,
    align: 'center',
    lineGap: 0.3,
  });
  doc.text(copy.footerLegal, contentX, footerY, {
    width: contentW,
    align: 'center',
    lineGap: 0.3,
  });

  doc.font(fonts.regular).fontSize(4.5).fillColor(COL.faint);
  doc.text(keyId, contentX, footerY + footerH + 4, {
    width: contentW,
    align: 'center',
    lineGap: 0,
  });
}

async function drawRightFlap(
  doc: PdfDoc,
  fonts: PdfFonts,
  copy: VoucherPdfCopy,
  scanUrl: string,
  layout: VoucherLayout,
): Promise<void> {
  const panelX = layout.bounds.x + layout.panelW * 2;
  const panelW = layout.panelW;
  const centerX = panelX + panelW / 2;
  const midY = layout.bounds.y + layout.bounds.h / 2;

  const qrSize = Math.min(118, panelW - PANEL_PAD * 2 - 8);
  const qrBuf = await qrPngBuffer(scanUrl, Math.round(qrSize * 2));
  const qrX = centerX - qrSize / 2;
  const qrY = midY - qrSize / 2 - 6;
  doc.image(qrBuf, qrX, qrY, { width: qrSize, height: qrSize });

  doc.font(fonts.regular).fontSize(7).fillColor(COL.ink);
  doc.text(copy.scanToOpen, panelX, qrY + qrSize + 8, {
    width: panelW,
    align: 'center',
  });
}

async function drawVoucherPage(
  doc: PdfDoc,
  input: VoucherPdfInput,
  fonts: PdfFonts,
): Promise<void> {
  const { width: pageW, height: pageH } = getVoucherPageDimensions(input.printSize);
  doc.addPage({ size: [pageW, pageH], margins: { top: 0, bottom: 0, left: 0, right: 0 } });
  const copy = getVoucherPdfCopy(input.locale);
  const headline = formatVoucherPremiumAccessHeadline(input.duration, input.locale);
  const layout = getVoucherLayout(pageW, pageH);

  drawCutGuide(doc, layout);
  drawFoldGuides(doc, layout);
  drawCutAlongLabels(doc, fonts, copy, layout);
  drawVoucherWatermark(doc, fonts, input, layout);

  await drawLeftFlap(doc, fonts, copy, headline, input.promoLabel, layout);
  drawCenterPanel(doc, fonts, copy, input.plainKey, input.keyId, input.locale, layout);
  await drawRightFlap(doc, fonts, copy, input.scanUrl, layout);
}

function createVoucherPdfDocument(printSize: VoucherPrintSize): PdfDoc {
  const { width, height } = getVoucherPageDimensions(printSize);
  return new PDFDocument({
    size: [width, height],
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
  const doc = createVoucherPdfDocument(inputs[0]!.printSize);
  const done = collectPdfBuffer(doc);
  const fonts = await resolveVoucherPdfFonts(doc);
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
