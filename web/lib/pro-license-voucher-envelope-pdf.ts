import type PDFDocument from 'pdfkit';

import {
  getVoucherEnvelopeCopy,
  type VoucherEnvelopeCopy,
  type VoucherLocale,
} from '@/lib/pro-license-voucher-copy';
import {
  getEnvelopeDielineDimensionsMm,
  getEnvelopePageDimensions,
  type VoucherPrintSize,
} from '@/lib/pro-license-voucher-print-size';
import { loadVoucherAppIconPng } from '@/lib/voucher-app-icon-png';
import { loadVoucherGiftIconPng } from '@/lib/voucher-lucide-icons-png';
import type { VoucherPdfFonts } from '@/lib/voucher-fonts';

const MM_TO_PT = 72 / 25.4;

const COL = {
  brand: '#2563EB',
  brandDark: '#1D4ED8',
  brandLight: '#DBEAFE',
  brandSoft: '#EFF6FF',
  ink: '#0F172A',
  muted: '#475569',
  faint: '#94A3B8',
  border: '#CBD5E1',
  badgeStroke: '#93C5FD',
} as const;

const PAGE_MARGIN_PT = 24;
const HEADER_H_PT = 16;
const DIELINE_TO_INSTRUCTIONS_GAP_PT = 6;
const INSTRUCTION_BOTTOM_PAD_PT = 10;

const ASSEMBLY_TITLE_SIZE = 6;
const ASSEMBLY_BODY_SIZE = 4.65;
const ASSEMBLY_FIT_SIZE = 4.25;
const ASSEMBLY_STEP_GAP = 1.5;
const ASSEMBLY_TITLE_GAP = 6;

const PREVIEW_TITLE_SIZE = 5.25;
const PREVIEW_CAPTION_SIZE = 4.5;
const PREVIEW_TITLE_GAP = 3;
const PREVIEW_CAPTION_GAP = 3;
const PREVIEW_DIAGRAM_H_PT = 34;
const PREVIEW_LEGEND_ROW_H = 6;
const PREVIEW_LEGEND_GAP = 2;

const CORNER_CHAMFER_MM = 2.5;
/** Minimum flap overlap (mm) when the dieline must shrink to fit the sheet. */
const MIN_FLAP_OVERLAP_MM = 6;

type PdfDoc = InstanceType<typeof PDFDocument>;

type EnvelopeDielineLayout = {
  x: number;
  y: number;
  pocketW: number;
  pocketH: number;
  sideW: number;
  topH: number;
  bottomH: number;
  tabH: number;
  totalW: number;
  totalH: number;
  left: { x: number; y: number; w: number; h: number };
  front: { x: number; y: number; w: number; h: number };
  right: { x: number; y: number; w: number; h: number };
  topFlap: { x: number; y: number; w: number; h: number };
  bottomFlap: { x: number; y: number; w: number; h: number };
  slot: { x: number; y: number; w: number; h: number };
};

function mmToPt(mm: number): number {
  return mm * MM_TO_PT;
}

function measurePreviewColumnHeight(
  doc: PdfDoc,
  fonts: VoucherPdfFonts,
  copy: VoucherEnvelopeCopy,
  colW: number,
): number {
  doc.font(fonts.bold).fontSize(PREVIEW_TITLE_SIZE);
  let h =
    doc.heightOfString(copy.previewTitle, { width: colW, align: 'center', lineGap: 0 }) +
    PREVIEW_TITLE_GAP +
    PREVIEW_DIAGRAM_H_PT +
    PREVIEW_CAPTION_GAP;
  doc.font(fonts.regular).fontSize(PREVIEW_CAPTION_SIZE);
  h += doc.heightOfString(copy.previewCaption, { width: colW, align: 'center', lineGap: 0 });
  h += PREVIEW_LEGEND_GAP + PREVIEW_LEGEND_ROW_H * 3;
  return h;
}

function measureAssemblyBlockHeight(
  doc: PdfDoc,
  fonts: VoucherPdfFonts,
  copy: VoucherEnvelopeCopy,
  pageW: number,
): number {
  const pad = PAGE_MARGIN_PT;
  const contentW = pageW - pad * 2;
  const leftW = contentW * 0.56;
  const rightW = contentW - leftW - 10;

  doc.font(fonts.bold).fontSize(ASSEMBLY_TITLE_SIZE);
  let leftH =
    doc.heightOfString(copy.assemblyTitle, { width: contentW, lineGap: 0 }) + ASSEMBLY_TITLE_GAP;

  doc.font(fonts.regular).fontSize(ASSEMBLY_BODY_SIZE);
  for (const step of copy.assemblySteps) {
    leftH += doc.heightOfString(step, { width: leftW, lineGap: 0.08 }) + ASSEMBLY_STEP_GAP;
  }

  doc.font(fonts.regular).fontSize(ASSEMBLY_FIT_SIZE);
  leftH += doc.heightOfString(copy.pocketFitNote, { width: leftW, lineGap: 0.08 }) + 3;

  const rightH = measurePreviewColumnHeight(doc, fonts, copy, rightW);
  return Math.max(leftH, rightH) + 4;
}

function getEnvelopeDielineLayout(
  pageW: number,
  pageH: number,
  printSize: VoucherPrintSize,
  instructionsH: number,
): EnvelopeDielineLayout {
  const dims = getEnvelopeDielineDimensionsMm(printSize);
  const pocketW = mmToPt(dims.pocket.width);
  const pocketH = mmToPt(dims.pocket.height);
  let sideW = mmToPt(dims.sideFlap);
  let topH = mmToPt(dims.topFlap);
  let bottomH = mmToPt(dims.bottomFlap);
  const tabH = mmToPt(dims.topTab);

  const bottomReserve = instructionsH + DIELINE_TO_INSTRUCTIONS_GAP_PT + INSTRUCTION_BOTTOM_PAD_PT;
  const maxDielineH = pageH - PAGE_MARGIN_PT - HEADER_H_PT - bottomReserve;
  const minFlapStackMm = dims.pocket.height + MIN_FLAP_OVERLAP_MM;
  const minTopMm = Math.ceil(minFlapStackMm * 0.52);
  const minBottomMm = Math.ceil(minFlapStackMm * 0.48);

  let totalH = topH + pocketH + bottomH;
  if (totalH > maxDielineH && maxDielineH > pocketH + mmToPt(minTopMm + minBottomMm)) {
    const flapBudget = maxDielineH - pocketH;
    const flapH = topH + bottomH;
    const flapScale = Math.max(
      (mmToPt(minTopMm) + mmToPt(minBottomMm)) / flapH,
      flapBudget / flapH,
    );
    topH *= flapScale;
    bottomH *= flapScale;
    totalH = topH + pocketH + bottomH;
  }

  const minSideMm = Math.ceil(dims.pocket.width / 2) + 2;
  sideW = Math.max(sideW, mmToPt(minSideMm));

  const totalW = sideW * 2 + pocketW;
  const maxTotalW = pageW - PAGE_MARGIN_PT * 2;
  if (totalW > maxTotalW) {
    sideW = Math.max(mmToPt(minSideMm), (maxTotalW - pocketW) / 2);
  }
  const x = (pageW - totalW) / 2;
  const y = PAGE_MARGIN_PT + HEADER_H_PT;
  const mainTop = y + topH;
  const mainBot = mainTop + pocketH;

  return {
    x,
    y,
    pocketW,
    pocketH,
    sideW,
    topH,
    bottomH,
    tabH,
    totalW,
    totalH,
    left: { x, y: mainTop, w: sideW, h: pocketH },
    front: { x: x + sideW, y: mainTop, w: pocketW, h: pocketH },
    right: { x: x + sideW + pocketW, y: mainTop, w: sideW, h: pocketH },
    topFlap: { x: x + sideW, y, w: pocketW, h: topH },
    bottomFlap: { x: x + sideW, y: mainBot, w: pocketW, h: bottomH },
    slot: {
      x: x + sideW + pocketW * 0.34,
      y: mainTop + Math.min(mmToPt(12), pocketH * 0.14),
      w: pocketW * 0.32,
      h: mmToPt(2),
    },
  };
}

function drawDashedFoldLine(doc: PdfDoc, x1: number, y1: number, x2: number, y2: number): void {
  doc.save();
  doc.lineWidth(0.65);
  doc.dash(4, { space: 3 });
  doc.strokeColor(COL.border);
  doc.moveTo(x1, y1).lineTo(x2, y2).stroke();
  doc.undash();
  doc.restore();
}

function drawScissors(doc: PdfDoc, x: number, y: number): void {
  const scale = 0.45;
  doc.save();
  doc.translate(x, y);
  doc.scale(scale);
  doc.lineWidth(0.8);
  doc.strokeColor(COL.muted);
  doc.circle(-4, 0, 3).stroke();
  doc.circle(4, 0, 3).stroke();
  doc.moveTo(-4, 0).lineTo(8, 10).stroke();
  doc.moveTo(4, 0).lineTo(-8, 10).stroke();
  doc.restore();
}

function traceDielineCutPath(doc: PdfDoc, layout: EnvelopeDielineLayout): void {
  const c = mmToPt(CORNER_CHAMFER_MM);
  const { x, y, totalW, sideW, topH, pocketW, pocketH, bottomH, tabH } = layout;
  const mainTop = y + topH;
  const mainBot = mainTop + pocketH;
  const botTipY = mainBot + bottomH;
  const botCx = x + sideW + pocketW / 2;
  const tabCx = botCx;
  const tabHalf = mmToPt(9);
  const topEdgeY = y;

  doc.moveTo(botCx, botTipY);
  doc.lineTo(layout.bottomFlap.x + c, mainBot);
  doc.lineTo(x + c, mainBot);
  doc.lineTo(x, mainTop + c);
  doc.lineTo(x, mainTop);
  doc.lineTo(layout.topFlap.x, mainTop);
  doc.lineTo(tabCx - tabHalf, topEdgeY + tabH);
  doc.lineTo(tabCx, topEdgeY);
  doc.lineTo(tabCx + tabHalf, topEdgeY + tabH);
  doc.lineTo(layout.topFlap.x + pocketW, mainTop);
  doc.lineTo(x + totalW, mainTop);
  doc.lineTo(x + totalW, mainTop + c);
  doc.lineTo(x + totalW, mainBot);
  doc.lineTo(x + totalW - c, mainBot);
  doc.lineTo(layout.bottomFlap.x + pocketW - c, mainBot);
  doc.closePath();
}

function drawPanelFills(doc: PdfDoc, layout: EnvelopeDielineLayout): void {
  doc.save();
  doc.rect(layout.left.x, layout.left.y, layout.left.w, layout.left.h).fill(COL.brandSoft);
  doc.rect(layout.front.x, layout.front.y, layout.front.w, layout.front.h).fill(COL.brandSoft);
  doc.rect(layout.right.x, layout.right.y, layout.right.w, layout.right.h).fill(COL.brandSoft);
  doc
    .rect(layout.topFlap.x, layout.topFlap.y, layout.topFlap.w, layout.topFlap.h)
    .fill(COL.brandLight);
  doc
    .rect(layout.bottomFlap.x, layout.bottomFlap.y, layout.bottomFlap.w, layout.bottomFlap.h)
    .fill(COL.brandLight);
  doc.restore();
}

function drawFoldGuides(doc: PdfDoc, layout: EnvelopeDielineLayout): void {
  const { left, front, right, bottomFlap } = layout;
  const mainTop = front.y;
  const mainBot = front.y + front.h;

  drawDashedFoldLine(doc, left.x + left.w, mainTop + 5, left.x + left.w, mainBot - 5);
  drawDashedFoldLine(doc, right.x, mainTop + 5, right.x, mainBot - 5);
  drawDashedFoldLine(doc, front.x + 6, mainTop, front.x + front.w - 6, mainTop);
  drawDashedFoldLine(doc, bottomFlap.x + 6, mainBot, bottomFlap.x + bottomFlap.w - 6, mainBot);
}

function drawCutContour(doc: PdfDoc, layout: EnvelopeDielineLayout): void {
  doc.save();
  doc.lineWidth(0.95);
  doc.strokeColor(COL.brand);
  traceDielineCutPath(doc, layout);
  doc.stroke();
  doc.restore();
}

/** Slot cut on the front — minimal line inside the lock strip (visible after assembly). */
function drawSlotCut(doc: PdfDoc, layout: EnvelopeDielineLayout): void {
  const { slot } = layout;
  doc.save();
  doc.lineWidth(0.75);
  doc.strokeColor(COL.brandDark);
  doc.roundedRect(slot.x, slot.y, slot.w, slot.h, slot.h / 2).stroke();
  doc.restore();
}

function drawCutHintOutside(
  doc: PdfDoc,
  fonts: VoucherPdfFonts,
  copy: VoucherEnvelopeCopy,
  layout: EnvelopeDielineLayout,
): void {
  const { x, y } = layout;
  if (x < 52) return;
  drawScissors(doc, x - 12, y + 4);
  doc.font(fonts.bold).fontSize(5).fillColor(COL.faint);
  doc.text(copy.cutAlongOuterLine, PAGE_MARGIN_PT, y - 1, {
    width: x - PAGE_MARGIN_PT - 6,
    align: 'right',
    lineBreak: false,
  });
}

async function drawFrontBranding(
  doc: PdfDoc,
  fonts: VoucherPdfFonts,
  copy: VoucherEnvelopeCopy,
  layout: EnvelopeDielineLayout,
): Promise<void> {
  const { front, slot } = layout;
  const cx = front.x + front.w / 2;
  const inset = 10;
  const cardX = front.x + inset;
  const cardY = front.y + inset;
  const cardW = front.w - inset * 2;
  const cardH = front.h - inset * 2;
  const lockBandH = Math.max(26, slot.y + slot.h - cardY + 9);
  const brandAreaTop = cardY + lockBandH + 6;
  const brandAreaH = cardY + cardH - brandAreaTop;

  doc.save();
  doc.roundedRect(cardX, cardY, cardW, cardH, 4).fill('#FFFFFF');
  doc.rect(cardX, cardY, cardW, lockBandH).fill(COL.brandLight);
  doc
    .roundedRect(cardX, cardY, cardW, cardH, 4)
    .lineWidth(0.65)
    .strokeColor(COL.badgeStroke)
    .stroke();
  doc.restore();

  const accentY = cardY + lockBandH + 3;
  doc.save();
  doc.lineWidth(0.75);
  doc.strokeColor(COL.brand);
  doc
    .moveTo(cardX + cardW * 0.18, accentY)
    .lineTo(cardX + cardW * 0.82, accentY)
    .stroke();
  doc.restore();

  const iconSize = Math.min(28, cardW * 0.2);
  const brandSize = Math.min(11.5, cardW * 0.085);
  const tagSize = 6.75;
  const giftPx = 11;
  const gapAfterIcon = 7;
  const gapAfterBrand = 5;
  const ruleW = Math.min(52, cardW * 0.38);
  const ruleGap = 5;

  doc.font(fonts.bold).fontSize(brandSize);
  const brandH = doc.heightOfString('Voice Inbox AI', { width: cardW, align: 'center' });
  doc.font(fonts.regular).fontSize(tagSize);
  const tagH = doc.heightOfString(copy.frontTagline, { width: cardW, align: 'center' });
  const tagRowH = Math.max(giftPx, tagH);
  const blockH = iconSize + gapAfterIcon + brandH + gapAfterBrand + ruleGap + tagRowH + 2;
  const blockTop = brandAreaTop + Math.max(0, (brandAreaH - blockH) / 2);
  const iconY = blockTop;

  const iconBuf = await loadVoucherAppIconPng(Math.round(iconSize * 3));
  doc.image(iconBuf, cx - iconSize / 2, iconY, {
    width: iconSize,
    height: iconSize,
  });

  const brandY = iconY + iconSize + gapAfterIcon;
  doc.font(fonts.bold).fontSize(brandSize).fillColor(COL.brandDark);
  doc.text('Voice Inbox AI', cardX, brandY, { width: cardW, align: 'center', lineGap: 0 });

  const ruleY = brandY + brandH + gapAfterBrand;
  doc.save();
  doc.lineWidth(0.5);
  doc.strokeColor(COL.border);
  doc
    .moveTo(cx - ruleW / 2, ruleY)
    .lineTo(cx + ruleW / 2, ruleY)
    .stroke();
  doc.restore();

  const giftBuf = await loadVoucherGiftIconPng(Math.round(giftPx * 2.5));
  doc.font(fonts.regular).fontSize(tagSize).fillColor(COL.muted);
  const tagTextW = doc.widthOfString(copy.frontTagline);
  const tagGap = 4;
  const tagRowW = giftPx + tagGap + tagTextW;
  const tagRowX = cx - tagRowW / 2;
  const tagRowTop = ruleY + ruleGap;
  const giftY = tagRowTop + (tagRowH - giftPx) / 2;
  const textY = tagRowTop + (tagRowH - tagH) / 2;
  doc.image(giftBuf, tagRowX, giftY, { width: giftPx, height: giftPx });
  doc.text(copy.frontTagline, tagRowX + giftPx + tagGap, textY, { lineBreak: false });
}

async function drawEnvelopePreview(
  doc: PdfDoc,
  fonts: VoucherPdfFonts,
  copy: VoucherEnvelopeCopy,
  x: number,
  y: number,
  w: number,
  diagramH: number,
): Promise<number> {
  doc.font(fonts.bold).fontSize(PREVIEW_TITLE_SIZE).fillColor(COL.brandDark);
  const titleH = doc.heightOfString(copy.previewTitle, { width: w, align: 'center', lineGap: 0 });
  doc.text(copy.previewTitle, x, y, { width: w, align: 'center', lineGap: 0 });

  const diagramTop = y + titleH + PREVIEW_TITLE_GAP;
  const bx = x + w * 0.1;
  const bw = w * 0.8;
  const by = diagramTop;
  const bh = diagramH;

  doc.save();
  doc.lineWidth(0.75);
  doc.strokeColor(COL.brand);
  doc.rect(bx, by + bh * 0.2, bw, bh * 0.8).stroke();
  doc
    .moveTo(bx, by + bh * 0.2)
    .lineTo(bx + bw / 2, by)
    .lineTo(bx + bw, by + bh * 0.2)
    .stroke();
  doc
    .moveTo(bx, by + bh)
    .lineTo(bx + bw / 2, by + bh * 0.55)
    .lineTo(bx + bw, by + bh)
    .stroke();
  const slotY = by + bh * 0.36;
  doc
    .moveTo(bx + bw * 0.4, slotY)
    .lineTo(bx + bw * 0.6, slotY)
    .lineWidth(1)
    .stroke();
  doc.restore();

  const giftPx = Math.min(11, bh * 0.22);
  const giftBuf = await loadVoucherGiftIconPng(Math.round(giftPx * 2));
  doc.image(giftBuf, bx + bw / 2 - giftPx / 2, by + bh * 0.46, {
    width: giftPx,
    height: giftPx,
  });

  doc.font(fonts.regular).fontSize(PREVIEW_CAPTION_SIZE).fillColor(COL.muted);
  const captionY = by + bh + PREVIEW_CAPTION_GAP;
  doc.text(copy.previewCaption, x, captionY, { width: w, align: 'center', lineGap: 0 });
  const captionH = doc.heightOfString(copy.previewCaption, {
    width: w,
    align: 'center',
    lineGap: 0,
  });
  return captionY + captionH;
}

function drawLineLegend(
  doc: PdfDoc,
  fonts: VoucherPdfFonts,
  copy: VoucherEnvelopeCopy,
  x: number,
  y: number,
  w: number,
): void {
  const rowH = PREVIEW_LEGEND_ROW_H;
  const items: { dash?: boolean; label: string; scissors?: boolean }[] = [
    { dash: true, label: copy.foldLineLabel },
    { dash: false, label: copy.cutLineLabel },
    { scissors: true, label: copy.scissorsLabel },
  ];

  let rowY = y;
  for (const item of items) {
    const midY = rowY + 3;
    if (item.dash) {
      doc.save();
      doc.lineWidth(0.65);
      doc.dash(3, { space: 2 });
      doc.strokeColor(COL.border);
      doc
        .moveTo(x, midY)
        .lineTo(x + 14, midY)
        .stroke();
      doc.undash();
      doc.restore();
    } else if (item.scissors) {
      drawScissors(doc, x + 6, midY - 1);
    } else {
      doc.lineWidth(0.85).strokeColor(COL.brand);
      doc
        .moveTo(x, midY)
        .lineTo(x + 14, midY)
        .stroke();
    }
    doc.font(fonts.regular).fontSize(4.35).fillColor(COL.faint);
    doc.text(item.label, x + 16, rowY + 0.5, { width: w - 16, lineBreak: false });
    rowY += rowH;
  }
}

async function drawAssemblyBlock(
  doc: PdfDoc,
  fonts: VoucherPdfFonts,
  copy: VoucherEnvelopeCopy,
  dims: ReturnType<typeof getEnvelopeDielineDimensionsMm>,
  pageW: number,
  pageH: number,
  startY: number,
): Promise<void> {
  const pad = PAGE_MARGIN_PT;
  const contentW = pageW - pad * 2;
  const leftW = contentW * 0.56;
  const rightW = contentW - leftW - 10;
  const rightX = pad + leftW + 10;
  doc.font(fonts.bold).fontSize(ASSEMBLY_TITLE_SIZE).fillColor(COL.brandDark);
  doc.text(copy.assemblyTitle, pad, startY, { width: contentW, lineGap: 0 });

  let y = startY + ASSEMBLY_TITLE_GAP;
  doc.font(fonts.regular).fontSize(ASSEMBLY_BODY_SIZE).fillColor(COL.ink);
  for (const step of copy.assemblySteps) {
    const h = doc.heightOfString(step, { width: leftW, lineGap: 0.08 });
    if (y + h > pageH - INSTRUCTION_BOTTOM_PAD_PT) break;
    doc.text(step, pad, y, { width: leftW, lineGap: 0.08 });
    y += h + ASSEMBLY_STEP_GAP;
  }

  doc.font(fonts.regular).fontSize(ASSEMBLY_FIT_SIZE).fillColor(COL.faint);
  const fitNote = `${dims.card.width}×${dims.card.height} mm → ${dims.pocket.width}×${dims.pocket.height} mm`;
  if (y + 6 < pageH - INSTRUCTION_BOTTOM_PAD_PT) {
    doc.text(fitNote, pad, y + 1, { width: leftW, lineGap: 0.08 });
  }

  const previewTop = startY + 4;
  const pageBottom = pageH - INSTRUCTION_BOTTOM_PAD_PT;
  const previewBottom = await drawEnvelopePreview(
    doc,
    fonts,
    copy,
    rightX,
    previewTop,
    rightW,
    PREVIEW_DIAGRAM_H_PT,
  );
  const legendY = previewBottom + PREVIEW_LEGEND_GAP;
  if (legendY + PREVIEW_LEGEND_ROW_H * 3 <= pageBottom) {
    drawLineLegend(doc, fonts, copy, rightX, legendY, rightW);
  }
}

function drawPageHeader(
  doc: PdfDoc,
  fonts: VoucherPdfFonts,
  copy: VoucherEnvelopeCopy,
  pageW: number,
): void {
  doc.font(fonts.bold).fontSize(8).fillColor(COL.brandDark);
  doc.text(copy.pageTitle, PAGE_MARGIN_PT, PAGE_MARGIN_PT - 2, {
    width: pageW - PAGE_MARGIN_PT * 2,
    align: 'center',
  });
}

/** Second PDF page: branded envelope dieline sized for the folded gate-fold voucher. */
export async function drawEnvelopeAssemblyPage(
  doc: PdfDoc,
  fonts: VoucherPdfFonts,
  locale: VoucherLocale,
  printSize: VoucherPrintSize,
): Promise<void> {
  const copy = getVoucherEnvelopeCopy(locale);
  const { width: pageW, height: pageH } = getEnvelopePageDimensions(printSize);
  const dims = getEnvelopeDielineDimensionsMm(printSize);

  doc.addPage({ size: [pageW, pageH], margins: { top: 0, bottom: 0, left: 0, right: 0 } });

  const instructionsH = measureAssemblyBlockHeight(doc, fonts, copy, pageW);
  const layout = getEnvelopeDielineLayout(pageW, pageH, printSize, instructionsH);
  const instructionsY = layout.y + layout.totalH + DIELINE_TO_INSTRUCTIONS_GAP_PT;

  drawPageHeader(doc, fonts, copy, pageW);
  drawPanelFills(doc, layout);
  drawFoldGuides(doc, layout);
  drawCutContour(doc, layout);
  drawSlotCut(doc, layout);
  drawCutHintOutside(doc, fonts, copy, layout);
  await drawFrontBranding(doc, fonts, copy, layout);
  await drawAssemblyBlock(doc, fonts, copy, dims, pageW, pageH, instructionsY);
}
