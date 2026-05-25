/** Physical strip size for gate-fold gift voucher PDFs (PDF points: 72 pt = 1 in). */
export type VoucherPrintSize = 'a4' | 'us-letter';

const MM_TO_PT = 72 / 25.4;

/** A4 landscape strip: 297 × 105 mm (full width, gate-fold height). */
export const VOUCHER_PAGE_A4 = {
  width: Math.round(297 * MM_TO_PT),
  height: Math.round(105 * MM_TO_PT),
} as const;

/** US Letter landscape strip: 11 × 4.25 in. */
export const VOUCHER_PAGE_US_LETTER = {
  width: 792,
  height: 306,
} as const;

/** Strip height only (trim / cut area) — excludes fold guide below. */
export function getVoucherStripDimensions(size: VoucherPrintSize): {
  width: number;
  height: number;
} {
  return size === 'us-letter' ? VOUCHER_PAGE_US_LETTER : VOUCHER_PAGE_A4;
}

/** Extra page height under the voucher for fold steps + legal fine print (not part of the cut). */
export const VOUCHER_BELOW_STRIP_HEIGHT_PT = 108;

/** @deprecated Use {@link VOUCHER_BELOW_STRIP_HEIGHT_PT}. */
export const VOUCHER_FOLD_GUIDE_HEIGHT_PT = VOUCHER_BELOW_STRIP_HEIGHT_PT;

export function getVoucherPageDimensions(size: VoucherPrintSize): {
  width: number;
  height: number;
} {
  const strip = getVoucherStripDimensions(size);
  return { width: strip.width, height: strip.height + VOUCHER_BELOW_STRIP_HEIGHT_PT };
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
