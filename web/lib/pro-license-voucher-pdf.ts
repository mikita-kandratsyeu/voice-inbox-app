import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

import type { ProLicenseDurationSpec } from '@/lib/pro-license-admin';
import { BASE_URL_OR_FALLBACK, SUPPORT_EMAIL } from '@/config/constants';
import {
  formatVoucherPremiumAccessHeadline,
  getVoucherBelowStripLegalLines,
  getVoucherPdfCopy,
  VOUCHER_TEMPLATE_VERSION,
  type VoucherLocale,
} from '@/lib/pro-license-voucher-copy';
import {
  getVoucherPageDimensions,
  getVoucherStripDimensions,
  VOUCHER_BELOW_STRIP_HEIGHT_PT,
  type VoucherPrintSize,
} from '@/lib/pro-license-voucher-print-size';
import { resolveVoucherPdfFonts, type VoucherPdfFonts } from '@/lib/voucher-fonts';
import { VOUCHER_PREVIEW_KEY_ID } from '@/lib/pro-license-voucher-shared';
import { loadVoucherAppIconPng } from '@/lib/voucher-app-icon-png';
import {
  loadVoucherGiftIconPng,
  loadVoucherHeartIconPng,
  loadVoucherPerkIconPng,
  VOUCHER_PERK_ICON_DISPLAY_PT,
} from '@/lib/voucher-lucide-icons-png';

const MARGIN = 14;
const CUT_RADIUS = 8;
const PANEL_PAD = 12;
/** Center panel width for tri-fold (narrower than left/right wings). */
const FOLD_CENTER_SHARE = 0.27;
/** Radius of the gift-title badge circle (center panel header). */
const GIFT_BADGE_R = 18;

/** Brand palette for color printers (aligned with web blue / indigo). */
const COL = {
  brand: '#2563EB',
  brandDark: '#1D4ED8',
  brandLight: '#DBEAFE',
  brandSoft: '#EFF6FF',
  indigo: '#4F46E5',
  amber: '#D97706',
  rose: '#E11D48',
  success: '#16A34A',
  ink: '#0F172A',
  muted: '#475569',
  faint: '#94A3B8',
  border: '#CBD5E1',
  watermark: '#BFDBFE',
  badgeFill: '#DBEAFE',
  badgeStroke: '#93C5FD',
  panelLeft: '#EFF6FF',
  panelCenter: '#FFFFFF',
  panelRight: '#F0F9FF',
  codeBg: '#F8FAFC',
  codeBorder: '#2563EB',
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
  /** ISO YYYY-MM-DD — printed in below-strip metadata. */
  issuedAt: string;
  /** Shared batch id for one print/email run. */
  batchId: string;
  templateVersion: string;
};

export type { VoucherPrintSize } from '@/lib/pro-license-voucher-print-size';

type PdfDoc = InstanceType<typeof PDFDocument>;
type PdfFonts = VoucherPdfFonts;
type VoucherPdfCopy = ReturnType<typeof getVoucherPdfCopy>;

type VoucherPanelRect = { x: number; w: number };

type VoucherLayout = {
  bounds: { x: number; y: number; w: number; h: number };
  left: VoucherPanelRect;
  center: VoucherPanelRect;
  right: VoucherPanelRect;
  fold1X: number;
  fold2X: number;
};

/** Tri-fold panel fills inside the trim area (center narrower). */
function drawPanelBackgrounds(doc: PdfDoc, layout: VoucherLayout): void {
  const { bounds, left, center, right } = layout;
  const y = bounds.y;
  const h = bounds.h;

  doc.save();
  doc.rect(left.x, y, left.w, h).fill(COL.panelLeft);
  doc.rect(center.x, y, center.w, h).fill(COL.panelCenter);
  doc.rect(right.x, y, right.w, h).fill(COL.panelRight);
  doc.restore();
}

/** Layout for the trim/cut voucher strip only (fold guide is drawn below). */
function getVoucherLayout(pageW: number, stripH: number): VoucherLayout {
  const bounds = {
    x: MARGIN,
    y: MARGIN,
    w: pageW - MARGIN * 2,
    h: stripH - MARGIN * 2,
  };
  const centerW = Math.round(bounds.w * FOLD_CENTER_SHARE);
  const sideW = Math.floor((bounds.w - centerW) / 2);
  const leftW = sideW;
  const rightW = bounds.w - leftW - centerW;
  const leftX = bounds.x;
  const fold1X = leftX + leftW;
  const fold2X = fold1X + centerW;

  return {
    bounds,
    left: { x: leftX, w: leftW },
    center: { x: fold1X, w: centerW },
    right: { x: fold2X, w: rightW },
    fold1X,
    fold2X,
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
  doc.fillColor(COL.brand);

  let fontSize = 58;
  doc.font(fonts.bold).fontSize(fontSize);
  while (fontSize > 24 && doc.widthOfString(label) > maxTextW) {
    fontSize -= 2;
    doc.fontSize(fontSize);
  }
  doc.opacity(0.1);
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
  doc.strokeColor(COL.border);
  doc.roundedRect(bounds.x, bounds.y, bounds.w, bounds.h, CUT_RADIUS).stroke();
  doc.undash();
  doc.restore();
}

function drawFoldGuides(doc: PdfDoc, layout: VoucherLayout): void {
  const { bounds, fold1X, fold2X } = layout;

  doc.save();
  doc.lineWidth(0.75);
  doc.dash(5, { space: 4 });
  doc.strokeColor(COL.border);
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
  doc.strokeColor(COL.muted);
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
  doc.font(fonts.bold).fontSize(fontSize).fillColor(COL.muted);

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

const STEP_ICON_BADGE_R = 9;

function drawStepIconBadge(doc: PdfDoc, cx: number, cy: number): void {
  doc.circle(cx, cy, STEP_ICON_BADGE_R).fill(COL.badgeFill);
  doc.circle(cx, cy, STEP_ICON_BADGE_R).lineWidth(0.35).strokeColor(COL.badgeStroke).stroke();
}

function drawPhoneIcon(doc: PdfDoc, cx: number, cy: number): void {
  const w = 6.5;
  const h = 10;
  drawStepIconBadge(doc, cx, cy);
  doc.save();
  doc.lineWidth(0.75);
  doc.strokeColor(COL.brand);
  doc.roundedRect(cx - w / 2, cy - h / 2, w, h, 1.2).stroke();
  doc.circle(cx, cy + h / 2 - 2, 0.65).fill(COL.brand);
  doc.restore();
}

function drawCardIcon(doc: PdfDoc, cx: number, cy: number): void {
  const w = 11;
  const h = 7;
  drawStepIconBadge(doc, cx, cy);
  doc.save();
  doc.lineWidth(0.75);
  doc.strokeColor(COL.indigo);
  doc.rect(cx - w / 2, cy - h / 2, w, h).stroke();
  doc
    .moveTo(cx - w / 2 + 1.5, cy - 1)
    .lineTo(cx + w / 2 - 1.5, cy - 1)
    .stroke();
  doc.restore();
}

function drawCheckIcon(doc: PdfDoc, cx: number, cy: number): void {
  drawStepIconBadge(doc, cx, cy);
  doc.save();
  doc.lineWidth(0.9);
  doc.strokeColor(COL.success);
  doc
    .moveTo(cx - 2.2, cy + 0.2)
    .lineTo(cx - 0.35, cy + 2)
    .lineTo(cx + 2.6, cy - 2.3)
    .stroke();
  doc.restore();
}

/** Gift header: soft circle badge + Lucide `Gift` icon. */
async function drawGiftHeaderBadge(doc: PdfDoc, cx: number, cy: number): Promise<void> {
  doc.save();
  doc.circle(cx, cy, GIFT_BADGE_R).fill(COL.brandLight);
  doc.circle(cx, cy, GIFT_BADGE_R).lineWidth(0.75).strokeColor(COL.brand).stroke();

  const iconPx = Math.round(GIFT_BADGE_R * 1.05);
  const iconBuf = await loadVoucherGiftIconPng(iconPx);
  doc.image(iconBuf, cx - iconPx / 2, cy - iconPx / 2, { width: iconPx, height: iconPx });

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
  const titleLineGap = locale === 'ru' ? 0.15 : 0;
  doc.font(fonts.bold).fontSize(titleSize).fillColor(COL.brandDark);
  const titleY = y + 20;
  const titleHeight = doc.heightOfString(titleText, {
    width: colW,
    align: 'center',
    lineGap: titleLineGap,
  });
  doc.text(titleText, left, titleY, {
    width: colW,
    align: 'center',
    lineGap: titleLineGap,
  });

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

function drawSidebarPerkRow(
  doc: PdfDoc,
  fonts: PdfFonts,
  x: number,
  y: number,
  w: number,
  label: string,
  iconBuf: Buffer,
  iconDisplay: number,
): number {
  const iconGap = 5;
  doc.image(iconBuf, x, y, {
    width: iconDisplay,
    height: iconDisplay,
  });

  const textX = x + iconDisplay + iconGap;
  const textW = w - (textX - x);
  doc.font(fonts.regular).fontSize(7).fillColor(COL.ink);
  const textY = y + iconDisplay / 2 - 3.5;
  const textH = doc.heightOfString(label, { width: textW, lineGap: 0.2 });
  doc.text(label, textX, textY, { width: textW, lineGap: 0.2 });
  return y + Math.max(iconDisplay, textH + 4);
}

async function drawSidebarPerks(
  doc: PdfDoc,
  fonts: PdfFonts,
  copy: VoucherPdfCopy,
  contentX: number,
  contentW: number,
  topY: number,
  bottomY: number,
  tagline: string,
): Promise<void> {
  const taglineSize = 7.5;
  doc.font(fonts.regular).fontSize(taglineSize).fillColor(COL.brandDark);
  const taglineH = doc.heightOfString(tagline, {
    width: contentW,
    lineGap: 0.35,
  });
  doc.text(tagline, contentX, topY, { width: contentW, lineGap: 0.35 });

  const perkIconBufs = await Promise.all(
    copy.sidebarPerkIcons.map((kind) =>
      loadVoucherPerkIconPng(kind, VOUCHER_PERK_ICON_DISPLAY_PT[kind]),
    ),
  );

  const perksTop = topY + taglineH + 9;
  const rowCount = copy.sidebarPerks.length;
  const rowArea = bottomY - perksTop;
  const rowGap = Math.max(5, (rowArea - rowCount * 16) / (rowCount + 1));

  let rowY = perksTop + rowGap;
  for (let i = 0; i < rowCount; i += 1) {
    const kind = copy.sidebarPerkIcons[i]!;
    rowY =
      drawSidebarPerkRow(
        doc,
        fonts,
        contentX,
        rowY,
        contentW,
        copy.sidebarPerks[i]!,
        perkIconBufs[i]!,
        VOUCHER_PERK_ICON_DISPLAY_PT[kind],
      ) + rowGap;
  }
}

async function qrPngBuffer(url: string, size: number): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    margin: 1,
    width: size,
    errorCorrectionLevel: 'M',
    color: {
      dark: COL.brandDark,
      light: '#FFFFFF',
    },
  });
}

async function drawLeftFlap(
  doc: PdfDoc,
  fonts: PdfFonts,
  copy: VoucherPdfCopy,
  headline: string,
  promoLabel: string | null | undefined,
  locale: VoucherLocale,
  layout: VoucherLayout,
): Promise<void> {
  const { left } = layout;
  const contentX = left.x + PANEL_PAD;
  const contentW = left.w - PANEL_PAD * 2;
  const top = layout.bounds.y + PANEL_PAD + 8;
  const bottom = layout.bounds.y + layout.bounds.h - PANEL_PAD;

  const iconSize = 40;
  const iconBuf = await loadVoucherAppIconPng(Math.round(iconSize * 3));
  doc.image(iconBuf, contentX, top, { width: iconSize, height: iconSize });

  const textY = top + iconSize + 10;
  const promo = promoLabel?.trim();
  const sidebarTagline = promo || copy.sidebarTagline;

  doc.font(fonts.bold).fontSize(18).fillColor(COL.brandDark);
  const headlineH = doc.heightOfString(headline, { width: contentW, lineGap: 1 });
  doc.text(headline, contentX, textY, { width: contentW, lineGap: 1, align: 'left' });
  const headlineBottom = textY + headlineH;

  const thanksLead = copy.thanksLead;
  const thanksBrand = 'Voice Inbox AI';
  const thanksSize = 7.5;
  const brandSize = 8;
  const thanksLineH = thanksSize * 1.25;
  const thankBlockH = thanksLineH + brandSize * 1.2 + 6;
  const thankPadBottom = 12;
  const dividerY = bottom - thankBlockH - thankPadBottom;
  const thankTextY = dividerY + 9;
  const heartPx = 8;
  await drawSidebarPerks(
    doc,
    fonts,
    copy,
    contentX,
    contentW,
    headlineBottom + 10,
    dividerY - 4,
    sidebarTagline,
  );

  doc.moveTo(contentX, dividerY).lineTo(contentX + contentW * 0.72, dividerY);
  doc.lineWidth(0.5).strokeColor(COL.badgeStroke);
  doc.stroke();

  const heartBuf = await loadVoucherHeartIconPng(heartPx);
  doc.image(heartBuf, contentX, thankTextY + 0.5, { width: heartPx, height: heartPx });

  const textX = contentX + heartPx + 5;
  const textW = contentW - (heartPx + 5);
  doc.font(fonts.regular).fontSize(thanksSize).fillColor(COL.muted);
  doc.text(thanksLead, textX, thankTextY, { width: textW, lineGap: 0, lineBreak: false });
  doc.font(fonts.bold).fontSize(brandSize).fillColor(COL.brand);
  doc.text(thanksBrand, textX, thankTextY + thanksLineH, {
    width: textW,
    lineGap: 0,
    lineBreak: false,
  });
}

/** Internal reference id — bottom-right of the trim area (common on tickets / gift cards). */
function drawVoucherKeyId(
  doc: PdfDoc,
  fonts: PdfFonts,
  keyId: string,
  layout: VoucherLayout,
): void {
  const fontSize = 4.5;
  const { bounds } = layout;
  const inset = PANEL_PAD;
  doc.font(fonts.mono).fontSize(fontSize).fillColor(COL.faint);
  doc.text(keyId, bounds.x + inset, bounds.y + bounds.h - inset - fontSize, {
    width: bounds.w - inset * 2,
    align: 'right',
    lineBreak: false,
  });
}

async function drawCenterPanel(
  doc: PdfDoc,
  fonts: PdfFonts,
  copy: VoucherPdfCopy,
  plainKey: string,
  locale: VoucherLocale,
  layout: VoucherLayout,
): Promise<void> {
  const { center } = layout;
  const contentX = center.x + PANEL_PAD;
  const contentW = center.w - PANEL_PAD * 2;
  const top = layout.bounds.y + PANEL_PAD + 6;
  const bottom = layout.bounds.y + layout.bounds.h - PANEL_PAD;
  const titleCenterX = contentX + contentW / 2;

  const giftBadgeGap = 8;
  await drawGiftHeaderBadge(doc, titleCenterX, top + GIFT_BADGE_R);

  const titleTop = top + GIFT_BADGE_R * 2 + giftBadgeGap;
  doc
    .font(fonts.bold)
    .fontSize(locale === 'ru' ? 15 : 17)
    .fillColor(COL.brandDark);
  const titleH = doc.heightOfString(copy.titleLine, {
    width: contentW,
    align: 'center',
    lineGap: 0,
  });
  doc.text(copy.titleLine, contentX, titleTop, { width: contentW, align: 'center', lineGap: 0 });

  const yourCodeY = titleTop + titleH + 10;
  doc.font(fonts.regular).fontSize(7).fillColor(COL.brand);
  doc.text(copy.yourCode, contentX, yourCodeY, { width: contentW, align: 'center' });

  const codeY = yourCodeY + 11;
  const codeH = 32;
  const codeW = contentW - 8;
  const codeX = contentX + 4;
  doc.roundedRect(codeX, codeY, codeW, codeH, 2).fill(COL.codeBg);
  doc.lineWidth(1.25).strokeColor(COL.codeBorder);
  doc.roundedRect(codeX, codeY, codeW, codeH, 2).stroke();
  doc.font(fonts.mono).fontSize(12).fillColor(COL.brandDark);
  doc.text(plainKey, codeX + 6, codeY + 9, {
    width: codeW - 12,
    align: 'center',
    characterSpacing: 0.8,
  });

  const codeBottom = codeY + codeH;
  const stepColW = (contentW - 12) / 3;
  const stepColInner = stepColW - 4;
  const stepDetailSize = locale === 'ru' ? 4.75 : 5;
  const stepDetailLineGap = locale === 'ru' ? 0.25 : 0.4;
  doc.font(fonts.regular).fontSize(stepDetailSize);
  const maxStepDetailH = Math.max(
    ...copy.stepDetails.map((d) =>
      doc.heightOfString(d, {
        width: stepColInner,
        align: 'center',
        lineGap: stepDetailLineGap,
      }),
    ),
  );
  const stepBlockH = 22 + 12 + maxStepDetailH;
  const footerGap = 12;
  const footerFontSize = 5.5;
  doc.font(fonts.regular).fontSize(footerFontSize);
  const footerH = doc.heightOfString(copy.footerLegal, {
    width: contentW,
    align: 'center',
    lineGap: 0.3,
  });
  const footerReserve = footerH + footerGap + 4;
  const stepsGapAfterCode = locale === 'ru' ? 18 : 14;
  const stepsY = Math.min(codeBottom + stepsGapAfterCode, bottom - footerReserve - stepBlockH);
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
      stepColInner,
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
      stepColInner,
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
      stepColInner,
    ),
  );

  doc.font(fonts.regular).fontSize(footerFontSize).fillColor(COL.muted);
  doc.text(copy.footerLegal, contentX, stepBottom + footerGap, {
    width: contentW,
    align: 'center',
    lineGap: 0.3,
  });
}

const BELOW_STRIP_GAP_PT = 8;
const BELOW_STRIP_BOTTOM_PAD_PT = 10;

/** Height of fold + legal block (PDFKit adds extra pages if the page is too short). */
function measureBelowStripContentHeight(
  doc: PdfDoc,
  fonts: PdfFonts,
  copy: VoucherPdfCopy,
  input: VoucherPdfInput,
  contentW: number,
): number {
  const sectionTitleSize = 6;
  const bodySize = 4.75;
  const stepGap = 2;
  const sectionGap = 7;
  let total = 0;

  doc.font(fonts.bold).fontSize(sectionTitleSize);
  total += doc.heightOfString(copy.foldTitle, { width: contentW, lineGap: 0 }) + 3;

  doc.font(fonts.regular).fontSize(bodySize + 0.75);
  for (const step of copy.foldSteps) {
    total += doc.heightOfString(step, { width: contentW, lineGap: 0.12 }) + stepGap;
  }
  total += sectionGap - stepGap + 5;

  doc.font(fonts.bold).fontSize(sectionTitleSize);
  total += doc.heightOfString(copy.belowStripLegalTitle, { width: contentW, lineGap: 0 }) + 3;

  doc.font(fonts.regular).fontSize(bodySize);
  const legalLines = getVoucherBelowStripLegalLines(input.locale, {
    site: BASE_URL_OR_FALLBACK,
    supportEmail: SUPPORT_EMAIL,
    year: new Date().getFullYear(),
    duration: input.duration,
    issuedAt: input.issuedAt,
    batchId: input.batchId,
    templateVersion: input.templateVersion || VOUCHER_TEMPLATE_VERSION,
  });
  for (const line of legalLines) {
    total += doc.heightOfString(line, { width: contentW, lineGap: 0.1 }) + 1.5;
  }

  return total;
}

function resolveVoucherPageSize(
  doc: PdfDoc,
  fonts: PdfFonts,
  copy: VoucherPdfCopy,
  input: VoucherPdfInput,
  printSize: VoucherPrintSize,
): { pageW: number; pageH: number; stripH: number } {
  const { width: pageW, height: stripH } = getVoucherStripDimensions(printSize);
  const contentW = pageW - MARGIN * 2;
  const belowContentH = measureBelowStripContentHeight(doc, fonts, copy, input, contentW);
  const belowArea = BELOW_STRIP_GAP_PT + belowContentH + BELOW_STRIP_BOTTOM_PAD_PT;
  const pageH = stripH + Math.max(VOUCHER_BELOW_STRIP_HEIGHT_PT, belowArea);
  return { pageW, pageH, stripH };
}

/** Fold steps + standard legal fine print below the cut line (trim off with the voucher). */
function drawBelowVoucherStrip(
  doc: PdfDoc,
  fonts: PdfFonts,
  copy: VoucherPdfCopy,
  input: VoucherPdfInput,
  layout: VoucherLayout,
): void {
  const { bounds } = layout;
  const sectionTitleSize = 6;
  const bodySize = 4.75;
  const stepGap = 2;
  const sectionGap = 7;
  const contentX = bounds.x;
  const contentW = bounds.w;
  let y = bounds.y + bounds.h + BELOW_STRIP_GAP_PT;

  doc.font(fonts.bold).fontSize(sectionTitleSize).fillColor(COL.brandDark);
  let blockH = doc.heightOfString(copy.foldTitle, { width: contentW, lineGap: 0 });
  doc.text(copy.foldTitle, contentX, y, { width: contentW, lineGap: 0 });
  y += blockH + 3;

  doc
    .font(fonts.regular)
    .fontSize(bodySize + 0.75)
    .fillColor(COL.muted);
  for (const step of copy.foldSteps) {
    blockH = doc.heightOfString(step, { width: contentW, lineGap: 0.12 });
    doc.text(step, contentX, y, { width: contentW, lineGap: 0.12 });
    y += blockH + stepGap;
  }

  y += sectionGap - stepGap;
  doc.moveTo(contentX, y).lineTo(contentX + contentW, y);
  doc.lineWidth(0.35).strokeColor(COL.border);
  doc.stroke();
  y += 5;

  const legalLines = getVoucherBelowStripLegalLines(input.locale, {
    site: BASE_URL_OR_FALLBACK,
    supportEmail: SUPPORT_EMAIL,
    year: new Date().getFullYear(),
    duration: input.duration,
    issuedAt: input.issuedAt,
    batchId: input.batchId,
    templateVersion: input.templateVersion || VOUCHER_TEMPLATE_VERSION,
  });

  doc.font(fonts.bold).fontSize(sectionTitleSize).fillColor(COL.brandDark);
  blockH = doc.heightOfString(copy.belowStripLegalTitle, { width: contentW, lineGap: 0 });
  doc.text(copy.belowStripLegalTitle, contentX, y, { width: contentW, lineGap: 0 });
  y += blockH + 3;

  doc.font(fonts.regular).fontSize(bodySize).fillColor(COL.faint);
  for (const line of legalLines) {
    blockH = doc.heightOfString(line, { width: contentW, lineGap: 0.1 });
    doc.text(line, contentX, y, { width: contentW, lineGap: 0.1 });
    y += blockH + 1.5;
  }
}

async function drawRightFlap(
  doc: PdfDoc,
  fonts: PdfFonts,
  copy: VoucherPdfCopy,
  scanUrl: string,
  layout: VoucherLayout,
): Promise<void> {
  const { right, bounds } = layout;
  const centerX = right.x + right.w / 2;
  const top = bounds.y + PANEL_PAD + 8;
  const bottom = bounds.y + bounds.h - PANEL_PAD;
  const contentW = right.w - PANEL_PAD * 2;
  const labelH = 14;
  const availableH = bottom - top - labelH;
  const qrSize = Math.min(118, contentW - 4, availableH * 0.78);
  const qrY = top + (availableH - qrSize) / 2;
  const qrBuf = await qrPngBuffer(scanUrl, Math.round(qrSize * 2));
  const qrX = centerX - qrSize / 2;
  doc.image(qrBuf, qrX, qrY, { width: qrSize, height: qrSize });

  doc.font(fonts.bold).fontSize(7).fillColor(COL.brand);
  doc.text(copy.scanToOpen, right.x, qrY + qrSize + 8, {
    width: right.w,
    align: 'center',
  });
}

async function drawVoucherPage(
  doc: PdfDoc,
  input: VoucherPdfInput,
  fonts: PdfFonts,
): Promise<void> {
  const copy = getVoucherPdfCopy(input.locale);
  const { pageW, pageH, stripH } = resolveVoucherPageSize(doc, fonts, copy, input, input.printSize);
  doc.addPage({ size: [pageW, pageH], margins: { top: 0, bottom: 0, left: 0, right: 0 } });
  const headline = formatVoucherPremiumAccessHeadline(input.duration, input.locale);
  const layout = getVoucherLayout(pageW, stripH);

  drawPanelBackgrounds(doc, layout);
  drawCutGuide(doc, layout);
  drawFoldGuides(doc, layout);
  drawCutAlongLabels(doc, fonts, copy, layout);
  drawVoucherWatermark(doc, fonts, input, layout);

  await drawLeftFlap(doc, fonts, copy, headline, input.promoLabel, input.locale, layout);
  await drawCenterPanel(doc, fonts, copy, input.plainKey, input.locale, layout);
  await drawRightFlap(doc, fonts, copy, input.scanUrl, layout);
  drawVoucherKeyId(doc, fonts, input.keyId, layout);
  drawBelowVoucherStrip(doc, fonts, copy, input, layout);
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
