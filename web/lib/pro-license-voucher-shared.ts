import {
  parseProLicenseDurationFromBody,
  PRO_LICENSE_VOUCHER_NOTE,
  type ProLicenseDurationSpec,
} from '@/lib/pro-license-admin';
import { getProLicenseVoucherScanUrl } from '@/lib/pro-license-go-url';
import { parseVoucherLocale, type VoucherLocale } from '@/lib/pro-license-voucher-copy';
import type { VoucherPdfInput } from '@/lib/pro-license-voucher-pdf';

export const VOUCHER_PREVIEW_PLAIN_KEY = 'VI-XXXX-XXXX-XXXX';
export const VOUCHER_PREVIEW_KEY_ID = 'preview-sample';

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
}): { spec: ProLicenseDurationSpec; locale: VoucherLocale; promoLabel: string | null } | null {
  const spec = parseProLicenseDurationFromBody(body);
  if (spec == null) return null;
  return {
    spec,
    locale: parseVoucherLocale(body.locale),
    promoLabel: sanitizeVoucherPromoLabel(body.promoLabel),
  };
}

export function buildVoucherPdfInput(
  plainKey: string,
  keyId: string,
  spec: ProLicenseDurationSpec,
  locale: VoucherLocale,
  promoLabel?: string | null,
): VoucherPdfInput {
  return {
    plainKey,
    keyId,
    duration: spec,
    scanUrl: getProLicenseVoucherScanUrl(),
    locale,
    promoLabel: promoLabel ?? null,
  };
}

export function buildVoucherPreviewPdfInput(
  spec: ProLicenseDurationSpec,
  locale: VoucherLocale,
  promoLabel?: string | null,
): VoucherPdfInput {
  return buildVoucherPdfInput(
    VOUCHER_PREVIEW_PLAIN_KEY,
    VOUCHER_PREVIEW_KEY_ID,
    spec,
    locale,
    promoLabel,
  );
}
