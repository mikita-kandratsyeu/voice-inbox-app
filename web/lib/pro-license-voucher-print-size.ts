/** Physical strip size for bi-fold gift voucher PDFs (PDF points: 72 pt = 1 in). */
export type VoucherPrintSize = 'a4' | 'us-letter';

const MM_TO_PT = 72 / 25.4;

/** A4 landscape strip: 208 × 74 mm (single center fold; fits the envelope pocket). */
export const VOUCHER_PAGE_A4 = {
  width: Math.round(208 * MM_TO_PT),
  height: Math.round(74 * MM_TO_PT),
} as const;

/** US Letter landscape strip (same aspect as A4 variant). */
export const VOUCHER_PAGE_US_LETTER = {
  width: Math.round(7.77 * 72),
  height: Math.round(2.99 * 72),
} as const;

/** Strip height only (trim / cut area) — excludes fold guide below. */
export function getVoucherStripDimensions(size: VoucherPrintSize): {
  width: number;
  height: number;
} {
  return size === 'us-letter' ? VOUCHER_PAGE_US_LETTER : VOUCHER_PAGE_A4;
}

/** Minimum reserved height for fold + legal block when estimating layout (legacy). */
export const VOUCHER_BELOW_STRIP_HEIGHT_PT = 108;

/** @deprecated Use {@link VOUCHER_BELOW_STRIP_HEIGHT_PT}. */
export const VOUCHER_FOLD_GUIDE_HEIGHT_PT = VOUCHER_BELOW_STRIP_HEIGHT_PT;

/** Landscape A4 — voucher + footer on one sheet (matches home printer “album” orientation). */
export const VOUCHER_SHEET_A4 = {
  width: Math.round(297 * MM_TO_PT),
  height: Math.round(210 * MM_TO_PT),
} as const;

/** Landscape US Letter. */
export const VOUCHER_SHEET_US_LETTER = {
  width: Math.round(11 * 72),
  height: Math.round(8.5 * 72),
} as const;

/** Side margins on the print sheet (see `pro-license-voucher-pdf.ts`). */
export const VOUCHER_SHEET_SIDE_MARGIN_PT = 24;

/** Full print sheet (landscape) — scaled voucher centered, instructions at the bottom. */
export function getVoucherSheetDimensions(size: VoucherPrintSize): {
  width: number;
  height: number;
} {
  return size === 'us-letter' ? VOUCHER_SHEET_US_LETTER : VOUCHER_SHEET_A4;
}

/** Largest strip that fits the sheet while keeping the standard bi-fold aspect ratio. */
export function fitVoucherStripToSheet(
  printSize: VoucherPrintSize,
  sheetW: number,
  sheetH: number,
  reservedTopPt: number,
  reservedBottomPt: number,
): { width: number; height: number } {
  const base = getVoucherStripDimensions(printSize);
  const aspect = base.width / base.height;
  const maxW = sheetW - VOUCHER_SHEET_SIDE_MARGIN_PT * 2;
  const maxH = sheetH - reservedTopPt - reservedBottomPt;
  let width = maxW;
  let height = width / aspect;
  if (height > maxH) {
    height = maxH;
    width = height * aspect;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

export function getVoucherPageDimensions(size: VoucherPrintSize): {
  width: number;
  height: number;
} {
  return getVoucherSheetDimensions(size);
}

/** Matches {@link MARGIN} in `pro-license-voucher-pdf.ts`. */
export const VOUCHER_STRIP_MARGIN_PT = 14;

/** Folded voucher card size in PDF points (bi-fold closed — half of open trim width). */
export function getVoucherFoldedCardDimensionsPt(size: VoucherPrintSize): {
  width: number;
  height: number;
} {
  const strip = getVoucherStripDimensions(size);
  const boundsW = strip.width - VOUCHER_STRIP_MARGIN_PT * 2;
  const boundsH = strip.height - VOUCHER_STRIP_MARGIN_PT * 2;
  return {
    width: Math.round(boundsW / 2),
    height: boundsH,
  };
}

const ptToMm = (pt: number) => (pt * 25.4) / 72;

/** Dieline dimensions (mm) derived from the folded bi-fold voucher on page 1. */
export type EnvelopeDielineDimensionsMm = {
  /** Interior pocket (front panel) — card must fit inside. */
  pocket: { width: number; height: number };
  /** Left/right glue flaps — each covers half the front when folded in. */
  sideFlap: number;
  topFlap: number;
  bottomFlap: number;
  topTab: number;
  /** Closed card face for assembly copy. */
  card: { width: number; height: number };
};

/** Pocket + flap sizes for a printed strip (scaled or default). */
export function getEnvelopeDielineDimensionsMmForStrip(
  stripW: number,
  stripH: number,
): EnvelopeDielineDimensionsMm {
  const boundsW = stripW - VOUCHER_STRIP_MARGIN_PT * 2;
  const boundsH = stripH - VOUCHER_STRIP_MARGIN_PT * 2;
  const cardW = ptToMm(boundsW / 2);
  const cardH = ptToMm(boundsH);

  const pocketPadW = 5;
  const pocketPadH = 4;
  const cardThicknessMm = 2.5;
  const sideSeamMm = 4;
  const flapOverlapMm = 10;
  const topTabMm = 11;

  const pocketW = Math.ceil(cardW + pocketPadW * 2);
  const pocketH = Math.ceil(cardH + pocketPadH * 2 + cardThicknessMm);
  const sideFlap = Math.ceil(pocketW / 2) + sideSeamMm;
  const bottomFlap = Math.ceil((pocketH + flapOverlapMm) * 0.44);
  const topFlap = Math.ceil((pocketH + flapOverlapMm) * 0.56);

  return {
    pocket: { width: pocketW, height: pocketH },
    sideFlap,
    topFlap,
    bottomFlap,
    topTab: topTabMm,
    card: {
      width: Math.round(cardW * 10) / 10,
      height: Math.round(cardH * 10) / 10,
    },
  };
}

/** Pocket + flap sizes so the folded voucher fits and the envelope fully closes. */
export function getEnvelopeDielineDimensionsMm(
  size: VoucherPrintSize,
): EnvelopeDielineDimensionsMm {
  const strip = getVoucherStripDimensions(size);
  return getEnvelopeDielineDimensionsMmForStrip(strip.width, strip.height);
}

/** Pocket inside the branded envelope (mm). */
export function getEnvelopePocketDimensionsMm(size: VoucherPrintSize): {
  width: number;
  height: number;
} {
  return getEnvelopeDielineDimensionsMm(size).pocket;
}

/** Full landscape sheet for the envelope assembly template. */
export const ENVELOPE_PAGE_A4 = {
  width: Math.round(297 * MM_TO_PT),
  height: Math.round(210 * MM_TO_PT),
} as const;

export const ENVELOPE_PAGE_US_LETTER = {
  width: Math.round(11 * 72),
  height: Math.round(8.5 * 72),
} as const;

export function getEnvelopePageDimensions(size: VoucherPrintSize): {
  width: number;
  height: number;
} {
  return size === 'us-letter' ? ENVELOPE_PAGE_US_LETTER : ENVELOPE_PAGE_A4;
}

/** Default for EU printers — no scaling on A4 width. */
export function parseVoucherPrintSize(raw: unknown): VoucherPrintSize {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (s === 'us-letter' || s === 'letter' || s === 'us') return 'us-letter';
  return 'a4';
}

export function voucherPreviewAspectRatio(size: VoucherPrintSize): string {
  const { width, height } = getVoucherPageDimensions(size);
  return `${width}/${height}`;
}
