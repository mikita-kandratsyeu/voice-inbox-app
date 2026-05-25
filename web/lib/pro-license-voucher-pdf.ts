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
  type VoucherSidebarPerkIcon,
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
} from '@/lib/voucher-lucide-icons-png';
import { drawEnvelopeAssemblyPage } from '@/lib/pro-license-voucher-envelope-pdf';

const MARGIN = 14;
const CUT_RADIUS = 8;
const PANEL_PAD = 12;
/** Gate-fold: center ~50%, wings each cover half of center plus seam overlap. */
const GATE_CENTER_SHARE = 0.5;
/** Overlap at the center seam so the code panel is fully covered when closed. */
const GATE_SEAM_OVERLAP_PT = 3;
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

/** Gate-fold panel fills inside the trim area (wide center, narrow wings). */
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
  const centerW = Math.round(bounds.w * GATE_CENTER_SHARE);
  const wingW = Math.ceil(centerW / 2) + GATE_SEAM_OVERLAP_PT;
  const leftW = wingW;
  const rightW = bounds.w - centerW - leftW;
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
/** Max glyph box inside the step badge circle (same for phone / card / check). */
const STEP_GLYPH_BOX = 8;

function drawStepIconBadge(doc: PdfDoc, cx: number, cy: number): void {
  doc.circle(cx, cy, STEP_ICON_BADGE_R).fill(COL.badgeFill);
  doc.circle(cx, cy, STEP_ICON_BADGE_R).lineWidth(0.35).strokeColor(COL.badgeStroke).stroke();
}

function drawPhoneIcon(doc: PdfDoc, cx: number, cy: number): void {
  const w = 5.5;
  const h = STEP_GLYPH_BOX;
  drawStepIconBadge(doc, cx, cy);
  doc.save();
  doc.lineWidth(0.75);
  doc.strokeColor(COL.brand);
  doc.roundedRect(cx - w / 2, cy - h / 2, w, h, 1.2).stroke();
  doc.circle(cx, cy + h / 2 - 1.8, 0.6).fill(COL.brand);
  doc.restore();
}

function drawCardIcon(doc: PdfDoc, cx: number, cy: number): void {
  const w = STEP_GLYPH_BOX;
  const h = 5.5;
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
  const half = STEP_GLYPH_BOX / 2 - 0.5;
  drawStepIconBadge(doc, cx, cy);
  doc.save();
  doc.lineWidth(0.9);
  doc.strokeColor(COL.success);
  doc
    .moveTo(cx - half * 0.55, cy + half * 0.05)
    .lineTo(cx - half * 0.08, cy + half * 0.48)
    .lineTo(cx + half * 0.62, cy - half * 0.55)
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

type StepSpacing = {
  iconTopPad: number;
  iconToTitleGap: number;
  titleToDetailGap: number;
};

function getStepSpacing(locale: VoucherLocale, compact: boolean, tight = false): StepSpacing {
  if (tight) {
    return {
      iconTopPad: 1,
      iconToTitleGap: 5,
      titleToDetailGap: locale === 'ru' ? 3 : 2.5,
    };
  }
  return {
    iconTopPad: compact ? 2 : 3,
    iconToTitleGap: compact ? 6 : 7,
    titleToDetailGap: compact ? (locale === 'ru' ? 4 : 3.5) : locale === 'ru' ? 4.5 : 3.5,
  };
}

function fitFooterLegalFontSize(
  doc: PdfDoc,
  fonts: PdfFonts,
  text: string,
  maxWidth: number,
  startSize: number,
  minSize = 3.5,
): number {
  let size = startSize;
  doc.font(fonts.regular).fontSize(size);
  while (size > minSize && doc.widthOfString(text) > maxWidth) {
    size -= 0.25;
    doc.fontSize(size);
  }
  return size;
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
  compact = false,
  spacing = getStepSpacing(locale, compact),
): number {
  const left = x - colW / 2;
  const titleSize = compact ? (locale === 'ru' ? 5 : 5.25) : locale === 'ru' ? 5.5 : 6;
  const detailSize = compact ? (locale === 'ru' ? 4.5 : 4.75) : locale === 'ru' ? 4.75 : 5;
  const detailLineGap = compact ? (locale === 'ru' ? 0.28 : 0.38) : locale === 'ru' ? 0.32 : 0.42;

  const iconCy = y + spacing.iconTopPad + STEP_ICON_BADGE_R;
  if (icon === 'phone') drawPhoneIcon(doc, x, iconCy);
  else if (icon === 'card') drawCardIcon(doc, x, iconCy);
  else drawCheckIcon(doc, x, iconCy);

  const titleText = `${stepNum}. ${title}`;
  const titleLineGap = locale === 'ru' ? 0.15 : 0;
  doc.font(fonts.bold).fontSize(titleSize).fillColor(COL.brandDark);
  const titleY = iconCy + STEP_ICON_BADGE_R + spacing.iconToTitleGap;
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
  const detailY = titleY + titleHeight + spacing.titleToDetailGap;
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

function measureStepBlockHeight(
  doc: PdfDoc,
  fonts: PdfFonts,
  copy: VoucherPdfCopy,
  locale: VoucherLocale,
  stepColInner: number,
  titleSize: number,
  detailSize: number,
  detailLineGap: number,
  spacing: StepSpacing,
): number {
  const iconBlockH = spacing.iconTopPad + STEP_ICON_BADGE_R * 2 + spacing.iconToTitleGap;
  doc.font(fonts.bold).fontSize(titleSize);
  const maxTitleH = Math.max(
    ...copy.stepTitles.map((title, i) =>
      doc.heightOfString(`${i + 1}. ${title}`, {
        width: stepColInner,
        align: 'center',
        lineGap: locale === 'ru' ? 0.15 : 0,
      }),
    ),
  );
  doc.font(fonts.regular).fontSize(detailSize);
  const maxDetailH = Math.max(
    ...copy.stepDetails.map((d) =>
      doc.heightOfString(d, {
        width: stepColInner,
        align: 'center',
        lineGap: detailLineGap,
      }),
    ),
  );
  return iconBlockH + maxTitleH + spacing.titleToDetailGap + maxDetailH;
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
  perkFontSize: number,
): number {
  const iconGap = 5;
  const textX = x + iconDisplay + iconGap;
  const textW = w - (textX - x);
  doc.font(fonts.regular).fontSize(perkFontSize).fillColor(COL.ink);
  const textH = doc.heightOfString(label, { width: textW, lineGap: 0.15 });
  const rowH = Math.max(iconDisplay, textH);
  const iconY = y + (rowH - iconDisplay) / 2;
  const textY = y + (rowH - textH) / 2;

  doc.image(iconBuf, x, iconY, {
    width: iconDisplay,
    height: iconDisplay,
  });
  doc.text(label, textX, textY, { width: textW, lineGap: 0.15 });
  return y + rowH;
}

type LeftWingPerksOpts = {
  compact: boolean;
  boxPadX: number;
  boxPadY: number;
  rowGap: number;
};

async function measureLeftWingPerksBlock(
  doc: PdfDoc,
  fonts: PdfFonts,
  copy: VoucherPdfCopy,
  innerW: number,
  opts: LeftWingPerksOpts,
): Promise<{ blockH: number }> {
  const perkFontSize = opts.compact ? 6 : 6.75;
  doc.font(fonts.regular).fontSize(perkFontSize);
  const rowHeights = copy.sidebarPerks.map((label, i) => {
    const iconW = leftWingPerkIconDisplay(copy.sidebarPerkIcons[i]!, opts.compact);
    const textH = doc.heightOfString(label, { width: innerW - iconW - 5, lineGap: 0.15 });
    return Math.max(iconW, textH);
  });
  const rowsH = rowHeights.reduce((sum, h) => sum + h, 0) + opts.rowGap * (rowHeights.length - 1);
  return { blockH: opts.boxPadY * 2 + rowsH };
}

const SIDEBAR_PERK_ICON_PT = 10;

function leftWingPerkIconDisplay(_kind: VoucherSidebarPerkIcon, _compact: boolean): number {
  return SIDEBAR_PERK_ICON_PT;
}

async function drawLeftWingPerksBlock(
  doc: PdfDoc,
  fonts: PdfFonts,
  copy: VoucherPdfCopy,
  boxX: number,
  boxY: number,
  boxW: number,
  opts: LeftWingPerksOpts,
): Promise<number> {
  const innerX = boxX + opts.boxPadX;
  const innerW = boxW - opts.boxPadX * 2;
  const perkFontSize = opts.compact ? 6 : 6.75;
  const perkIconBufs = await Promise.all(
    copy.sidebarPerkIcons.map((kind) =>
      loadVoucherPerkIconPng(kind, Math.round(leftWingPerkIconDisplay(kind, opts.compact) * 2)),
    ),
  );

  const { blockH } = await measureLeftWingPerksBlock(doc, fonts, copy, innerW, opts);

  let rowY = boxY + opts.boxPadY;
  for (let i = 0; i < copy.sidebarPerks.length; i += 1) {
    const kind = copy.sidebarPerkIcons[i]!;
    rowY = drawSidebarPerkRow(
      doc,
      fonts,
      innerX,
      rowY,
      innerW,
      copy.sidebarPerks[i]!,
      perkIconBufs[i]!,
      leftWingPerkIconDisplay(kind, opts.compact),
      perkFontSize,
    );
    if (i < copy.sidebarPerks.length - 1) {
      rowY += opts.rowGap;
    }
  }
  return boxY + blockH;
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
  const { left, bounds } = layout;
  const compactWing = left.w - PANEL_PAD * 2 < 200;
  const compactHeight = bounds.h < 175;
  const pad = compactWing ? 10 : PANEL_PAD;
  const contentX = left.x + pad;
  const contentW = left.w - pad * 2;
  const top = bounds.y + pad;
  const bottom = bounds.y + bounds.h - pad;

  const promo = promoLabel?.trim();
  const sidebarTagline = promo || copy.sidebarTagline;

  const iconSize = compactHeight ? 24 : compactWing ? 28 : 34;
  const headlineSize = compactHeight
    ? locale === 'ru'
      ? 10.5
      : 11
    : compactWing
      ? locale === 'ru'
        ? 11.5
        : 12
      : 15;
  const headlineLineGap = compactWing ? 0.35 : 0.5;
  const taglineSize = compactHeight ? 5.5 : compactWing ? 6 : 7;
  const thanksSize = compactWing ? 6.25 : 7;
  const brandSize = compactWing ? 6.75 : 7.5;
  const heartPx = compactWing ? 7 : 8;

  const gapAfterIcon = compactHeight ? 5 : compactWing ? 6 : 8;
  const gapAfterHeadline = compactHeight ? 2 : compactWing ? 3 : 4;
  const gapBeforePerks = compactHeight ? 5 : compactWing ? 7 : 9;
  const perksOpts: LeftWingPerksOpts = {
    compact: compactWing,
    boxPadX: 0,
    boxPadY: 0,
    rowGap: compactWing ? 6 : 7,
  };

  doc.font(fonts.bold).fontSize(headlineSize);
  const headlineH = doc.heightOfString(headline, {
    width: contentW,
    lineGap: headlineLineGap,
  });
  doc.font(fonts.regular).fontSize(taglineSize);
  const taglineH = doc.heightOfString(sidebarTagline, {
    width: contentW,
    lineGap: 0.25,
  });
  const { blockH: perksBlockH } = await measureLeftWingPerksBlock(
    doc,
    fonts,
    copy,
    contentW,
    perksOpts,
  );

  const thanksTextW = contentW - heartPx - 5;
  const thanksBrand = 'Voice Inbox AI';
  const thanksLineGap = compactWing ? 2 : 3;

  doc.font(fonts.regular).fontSize(thanksSize);
  const thanksLineH = doc.heightOfString(copy.thanksLead, {
    width: thanksTextW,
    lineGap: 0,
    lineBreak: false,
  });
  doc.font(fonts.bold).fontSize(brandSize);
  const brandLineH = doc.heightOfString(thanksBrand, {
    width: thanksTextW,
    lineGap: 0,
    lineBreak: false,
  });
  const thanksStackH = thanksLineH + thanksLineGap + brandLineH;
  const thanksRowH = Math.max(heartPx, thanksStackH);
  const thankPadBottom = compactWing ? 4 : 6;
  const gapAfterDivider = compactWing ? 5 : 6;

  const thanksY = bottom - thankPadBottom - thanksStackH;
  const dividerY = thanksY - gapAfterDivider;

  const mainBlockH =
    iconSize +
    gapAfterIcon +
    headlineH +
    gapAfterHeadline +
    taglineH +
    gapBeforePerks +
    perksBlockH;
  const footerReserve = gapAfterDivider + thanksRowH + thankPadBottom + 1;
  const mainAreaForTop = bottom - top - footerReserve;
  const mainTop =
    top + Math.min(Math.max(0, (mainAreaForTop - mainBlockH) * 0.22), compactWing ? 4 : 8);

  const iconBuf = await loadVoucherAppIconPng(Math.round(iconSize * 3));
  doc.image(iconBuf, contentX, mainTop, { width: iconSize, height: iconSize });

  const headlineY = mainTop + iconSize + gapAfterIcon;
  doc.font(fonts.bold).fontSize(headlineSize).fillColor(COL.brandDark);
  doc.text(headline, contentX, headlineY, {
    width: contentW,
    lineGap: headlineLineGap,
    align: 'left',
  });

  const taglineY = headlineY + headlineH + gapAfterHeadline;
  doc.font(fonts.regular).fontSize(taglineSize).fillColor(COL.muted);
  doc.text(sidebarTagline, contentX, taglineY, { width: contentW, lineGap: 0.25 });

  const perksBoxY = taglineY + taglineH + gapBeforePerks;
  await drawLeftWingPerksBlock(doc, fonts, copy, contentX, perksBoxY, contentW, perksOpts);

  const heartY = thanksY + (thanksRowH - heartPx) / 2;
  const textX = contentX + heartPx + 5;

  doc.moveTo(contentX, dividerY).lineTo(contentX + contentW, dividerY);
  doc.lineWidth(0.5).strokeColor(COL.badgeStroke);
  doc.stroke();

  const heartBuf = await loadVoucherHeartIconPng(heartPx);
  doc.image(heartBuf, contentX, heartY, { width: heartPx, height: heartPx });

  doc.font(fonts.regular).fontSize(thanksSize).fillColor(COL.muted);
  doc.text(copy.thanksLead, textX, thanksY, {
    width: thanksTextW,
    lineGap: 0,
    lineBreak: false,
  });
  doc.font(fonts.bold).fontSize(brandSize).fillColor(COL.brand);
  doc.text(thanksBrand, textX, thanksY + thanksLineH + thanksLineGap, {
    width: thanksTextW,
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

async function drawGiftHeaderBadgeSized(
  doc: PdfDoc,
  cx: number,
  cy: number,
  badgeR: number,
): Promise<void> {
  doc.save();
  doc.circle(cx, cy, badgeR).fill(COL.brandLight);
  doc.circle(cx, cy, badgeR).lineWidth(0.75).strokeColor(COL.brand).stroke();
  const iconPx = Math.round(badgeR * 1.05);
  const iconBuf = await loadVoucherGiftIconPng(iconPx);
  doc.image(iconBuf, cx - iconPx / 2, cy - iconPx / 2, { width: iconPx, height: iconPx });
  doc.restore();
}

async function drawCenterPanel(
  doc: PdfDoc,
  fonts: PdfFonts,
  copy: VoucherPdfCopy,
  plainKey: string,
  locale: VoucherLocale,
  layout: VoucherLayout,
): Promise<void> {
  const { center, bounds } = layout;
  doc.save();
  doc.rect(center.x, bounds.y, center.w, bounds.h).clip();
  const contentX = center.x + PANEL_PAD;
  const contentW = center.w - PANEL_PAD * 2;
  const top = layout.bounds.y + PANEL_PAD + 4;
  const bottom = layout.bounds.y + layout.bounds.h - PANEL_PAD;
  const contentH = bottom - top;
  const titleCenterX = contentX + contentW / 2;
  const compact = contentH < 168;

  const giftBadgeR = compact ? 14 : GIFT_BADGE_R;
  const giftBadgeGap = compact ? 4 : 6;
  const titleSize = compact ? (locale === 'ru' ? 12 : 13) : locale === 'ru' ? 15 : 17;
  const stepTitleSize = compact ? (locale === 'ru' ? 5 : 5.25) : locale === 'ru' ? 5.5 : 6;
  const stepDetailSize = compact ? (locale === 'ru' ? 4.5 : 4.75) : locale === 'ru' ? 4.75 : 5;
  const stepDetailLineGap = compact
    ? locale === 'ru'
      ? 0.28
      : 0.38
    : locale === 'ru'
      ? 0.32
      : 0.42;
  const footerTextW = contentW - 12;
  const footerTextX = contentX + 6;
  const footerBottomPad = compact ? 2 : 3;
  const codeGapAfterTitle = compact ? 5 : 6;

  await drawGiftHeaderBadgeSized(doc, titleCenterX, top + giftBadgeR, giftBadgeR);

  const titleTop = top + giftBadgeR * 2 + giftBadgeGap;
  doc.font(fonts.bold).fontSize(titleSize).fillColor(COL.brandDark);
  const titleH = doc.heightOfString(copy.titleLine, {
    width: contentW,
    align: 'center',
    lineGap: 0,
  });
  doc.text(copy.titleLine, contentX, titleTop, { width: contentW, align: 'center', lineGap: 0 });

  const codeY = titleTop + titleH + codeGapAfterTitle;
  const codeH = compact ? 24 : 28;
  const codeW = contentW - 8;
  const codeX = contentX + 4;
  const codeFontSize = compact ? 10 : 11;
  doc.roundedRect(codeX, codeY, codeW, codeH, 2).fill(COL.codeBg);
  doc.lineWidth(1.1).strokeColor(COL.codeBorder);
  doc.roundedRect(codeX, codeY, codeW, codeH, 2).stroke();
  doc.font(fonts.mono).fontSize(codeFontSize).fillColor(COL.brandDark);
  doc.text(plainKey, codeX + 5, codeY + (codeH - codeFontSize) / 2 - 1, {
    width: codeW - 10,
    align: 'center',
    characterSpacing: compact ? 0.5 : 0.7,
  });

  const codeBottom = codeY + codeH;
  const stepColW = contentW / 3;
  const stepColInner = stepColW - 14;

  let footerFontSize = compact ? (locale === 'ru' ? 4 : 4.5) : locale === 'ru' ? 4.25 : 5;
  footerFontSize = fitFooterLegalFontSize(
    doc,
    fonts,
    copy.footerLegal,
    footerTextW,
    footerFontSize,
    locale === 'ru' ? 3.5 : 3.75,
  );
  const measureFooterH = () =>
    doc.heightOfString(copy.footerLegal, {
      width: footerTextW,
      align: 'center',
      lineGap: 0.2,
    });

  let footerGap = compact ? 5 : 7;
  let stepSpacing = getStepSpacing(locale, compact);
  let stepBlockH = measureStepBlockHeight(
    doc,
    fonts,
    copy,
    locale,
    stepColInner,
    stepTitleSize,
    stepDetailSize,
    stepDetailLineGap,
    stepSpacing,
  );
  let footerH = measureFooterH();
  let footerY = bottom - footerBottomPad - footerH;
  const minStepsY = codeBottom + (compact ? 6 : 8);
  let stepsY = footerY - footerGap - stepBlockH;

  if (stepsY < minStepsY) {
    stepSpacing = getStepSpacing(locale, compact, true);
    footerGap = compact ? 4 : 5;
    stepBlockH = measureStepBlockHeight(
      doc,
      fonts,
      copy,
      locale,
      stepColInner,
      stepTitleSize,
      stepDetailSize,
      stepDetailLineGap,
      stepSpacing,
    );
    footerH = measureFooterH();
    footerY = bottom - footerBottomPad - footerH;
    stepsY = footerY - footerGap - stepBlockH;
  }

  const step1X = contentX + stepColW * 0.5;
  const step2X = contentX + stepColW * 1.5;
  const step3X = contentX + stepColW * 2.5;
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
      compact,
      stepSpacing,
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
      compact,
      stepSpacing,
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
      compact,
      stepSpacing,
    ),
  );

  footerH = measureFooterH();
  footerY = bottom - footerBottomPad - footerH;
  doc.font(fonts.regular).fontSize(footerFontSize).fillColor(COL.muted);
  doc.text(copy.footerLegal, footerTextX, footerY, {
    width: footerTextW,
    align: 'center',
    lineGap: 0.2,
  });
  doc.restore();
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
  const contentX = right.x + PANEL_PAD;
  const contentW = Math.max(0, right.w - PANEL_PAD * 2);
  const blockCenterX = contentX + contentW / 2;
  const top = bounds.y + PANEL_PAD + 8;
  const bottom = bounds.y + bounds.h - PANEL_PAD;
  const compactWing = contentW < 200;

  const labelFontSize = 7;
  const labelGap = 8;
  doc.font(fonts.bold).fontSize(labelFontSize).fillColor(COL.brand);
  const captionH = doc.heightOfString(copy.scanToOpen, {
    width: contentW,
    align: 'center',
    lineGap: 0,
  });
  const stackMaxH = bottom - top;
  const qrSize = Math.min(
    compactWing ? 92 : 118,
    contentW,
    Math.max(48, stackMaxH - captionH - labelGap),
  );
  const stackH = qrSize + labelGap + captionH;
  const stackTop = top + Math.max(0, (stackMaxH - stackH) / 2);

  const qrBuf = await qrPngBuffer(scanUrl, Math.round(qrSize * 2));
  const qrX = Math.round(blockCenterX - qrSize / 2);
  const qrY = stackTop;
  doc.image(qrBuf, qrX, qrY, { width: qrSize, height: qrSize });

  doc.text(copy.scanToOpen, contentX, qrY + qrSize + labelGap, {
    width: contentW,
    align: 'center',
    lineGap: 0,
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
    await drawEnvelopeAssemblyPage(doc, fonts, inputs[0]!.locale, inputs[0]!.printSize);
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
