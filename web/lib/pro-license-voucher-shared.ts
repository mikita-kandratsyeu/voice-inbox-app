import { randomBytes } from 'node:crypto';

import {
  parseProLicenseDurationFromBody,
  PRO_LICENSE_VOUCHER_NOTE,
  type ProLicenseDurationSpec,
} from '@/lib/pro-license-admin';
import { VOUCHER_TEMPLATE_VERSION } from '@/lib/pro-license-voucher-copy';
import { getProLicenseVoucherScanUrl } from '@/lib/pro-license-go-url';
import { parseVoucherLocale, type VoucherLocale } from '@/lib/pro-license-voucher-copy';
import type { VoucherPdfInput } from '@/lib/pro-license-voucher-pdf';
import { parseVoucherPrintSize, type VoucherPrintSize } from '@/lib/pro-license-voucher-print-size';

export const VOUCHER_PREVIEW_PLAIN_KEY = 'VI-XXXX-XXXX-XXXX';
export const VOUCHER_PREVIEW_KEY_ID = 'preview-sample';
export const VOUCHER_PREVIEW_BATCH_ID = 'VB-PREVIEW';

/** ISO date (YYYY-MM-DD) for voucher metadata. */
export function voucherIssuedDateIso(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** One batch id per admin print/email run (support & audits). */
export function generateVoucherBatchId(date = new Date()): string {
  const day = voucherIssuedDateIso(date).replace(/-/g, '');
  return `VB-${day}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

/** `print_pdf` = one multi-page PDF; `zip` = one PDF file per voucher. */
export type VoucherOutputFormat = 'print_pdf' | 'zip';

export function parseVoucherOutputFormat(raw: unknown): VoucherOutputFormat {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return s === 'zip' ? 'zip' : 'print_pdf';
}

export function sanitizeVoucherExtraNote(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t) return null;
  return t.slice(0, 500);
}

/** Optional promo / partner name printed under the gift title line on the voucher. */
export function sanitizeVoucherPromoLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t) return null;
  return t.slice(0, 48);
}

export function buildVoucherAdminNotes(extra: string | null): string {
  if (extra && extra.toLowerCase() !== PRO_LICENSE_VOUCHER_NOTE) {
    return `${PRO_LICENSE_VOUCHER_NOTE}: ${extra}`;
  }
  return PRO_LICENSE_VOUCHER_NOTE;
}

export function parseVoucherRequestBody(body: {
  durationMonths?: unknown;
  durationDays?: unknown;
  locale?: unknown;
  promoLabel?: unknown;
  printSize?: unknown;
}): {
  spec: ProLicenseDurationSpec;
  locale: VoucherLocale;
  promoLabel: string | null;
  printSize: VoucherPrintSize;
} | null {
  const spec = parseProLicenseDurationFromBody(body);
  if (spec == null) return null;
  return {
    spec,
    locale: parseVoucherLocale(body.locale),
    promoLabel: sanitizeVoucherPromoLabel(body.promoLabel),
    printSize: parseVoucherPrintSize(body.printSize),
  };
}

export type BuildVoucherPdfInputOpts = {
  promoLabel?: string | null;
  /** Shared across vouchers from one generate/print action. */
  batchId?: string;
  /** ISO YYYY-MM-DD; defaults to today (UTC). */
  issuedAt?: string;
};

export function buildVoucherPdfInput(
  plainKey: string,
  keyId: string,
  spec: ProLicenseDurationSpec,
  locale: VoucherLocale,
  printSize: VoucherPrintSize,
  opts?: BuildVoucherPdfInputOpts | null,
): VoucherPdfInput {
  const issuedAt = opts?.issuedAt ?? voucherIssuedDateIso();
  const batchId = opts?.batchId ?? generateVoucherBatchId(new Date(`${issuedAt}T12:00:00Z`));
  return {
    plainKey,
    keyId,
    duration: spec,
    scanUrl: getProLicenseVoucherScanUrl(keyId),
    locale,
    printSize,
    promoLabel: opts?.promoLabel ?? null,
    issuedAt,
    batchId,
    templateVersion: VOUCHER_TEMPLATE_VERSION,
  };
}

export function buildVoucherPreviewPdfInput(
  spec: ProLicenseDurationSpec,
  locale: VoucherLocale,
  printSize: VoucherPrintSize,
  promoLabel?: string | null,
): VoucherPdfInput {
  return buildVoucherPdfInput(
    VOUCHER_PREVIEW_PLAIN_KEY,
    VOUCHER_PREVIEW_KEY_ID,
    spec,
    locale,
    printSize,
    {
      promoLabel,
      batchId: VOUCHER_PREVIEW_BATCH_ID,
      issuedAt: voucherIssuedDateIso(),
    },
  );
}
