import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus, parseJsonBody } from '@/lib/api';
import { createProLicenseKeyRecord, type ProLicenseDurationSpec } from '@/lib/pro-license-admin';
import {
  formatVoucherPremiumAccessLabel,
  type VoucherLocale,
} from '@/lib/pro-license-voucher-copy';
import { buildVoucherPdfZip, renderVouchersPrintPdf } from '@/lib/pro-license-voucher-pdf';
import {
  buildVoucherAdminNotes,
  buildVoucherPdfInput,
  parseVoucherOutputFormat,
  parseVoucherRequestBody,
  sanitizeVoucherExtraNote,
} from '@/lib/pro-license-voucher-shared';
import { NextResponse } from 'next/server';

const MIN_COUNT = 1;
const MAX_COUNT = 50;

type PostBody = {
  count?: unknown;
  durationMonths?: unknown;
  durationDays?: unknown;
  adminNotes?: unknown;
  locale?: unknown;
  promoLabel?: unknown;
  /** `print_pdf` (default) or `zip` */
  output?: unknown;
};

function parseCount(raw: unknown): number | null {
  const n =
    typeof raw === 'number' ? raw : typeof raw === 'string' ? parseInt(raw.trim(), 10) : NaN;
  if (!Number.isFinite(n) || n < MIN_COUNT || n > MAX_COUNT) return null;
  return Math.trunc(n);
}

function voucherFilename(
  index: number,
  duration: ProLicenseDurationSpec,
  keyId: string,
  locale: VoucherLocale,
): string {
  const label = formatVoucherPremiumAccessLabel(duration);
  const suffix = keyId.slice(-6);
  return `voice-inbox-voucher-${locale}-${String(index).padStart(2, '0')}-${label}-${suffix}.pdf`;
}

export async function POST(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname;
  const admin = await getAdminSession();
  if (!admin) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED, { pathname: path });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'DATABASE_URL is not configured' },
      { status: 503 },
    );
  }

  const body = await parseJsonBody<PostBody>(request);
  const count = parseCount(body?.count);
  if (count == null) {
    return apiError(`count must be between ${MIN_COUNT} and ${MAX_COUNT}`, HttpStatus.BAD_REQUEST, {
      pathname: path,
    });
  }

  const parsed = parseVoucherRequestBody(body ?? {});
  if (parsed == null) {
    return apiError(
      'Provide exactly one of durationMonths (1, 3, 6, 12) or durationDays (1, 7, 14)',
      HttpStatus.BAD_REQUEST,
      { pathname: path },
    );
  }
  const { spec, locale } = parsed;

  const adminNotes = buildVoucherAdminNotes(sanitizeVoucherExtraNote(body?.adminNotes));
  const output = parseVoucherOutputFormat(body?.output);

  const created: { plainKey: string; keyId: string }[] = [];
  try {
    for (let i = 0; i < count; i += 1) {
      const row = await createProLicenseKeyRecord(admin.adminId, spec, { adminNotes });
      created.push(row);
    }
  } catch (e) {
    console.error('[admin/pro-licenses/vouchers POST]', e);
    return NextResponse.json({ ok: false, error: 'Failed to create keys' }, { status: 503 });
  }

  const inputs = created.map((row) =>
    buildVoucherPdfInput(row.plainKey, row.keyId, spec, locale, parsed.promoLabel),
  );
  const stamp = new Date().toISOString().slice(0, 10);
  const label = formatVoucherPremiumAccessLabel(spec);

  try {
    if (output === 'zip') {
      const zip = await buildVoucherPdfZip(
        created.map((row, i) => ({
          filename: voucherFilename(i + 1, spec, row.keyId, locale),
          input: inputs[i]!,
        })),
      );

      await writeAdminAudit(admin, 'pro_license.generate_vouchers', {
        count,
        locale,
        output,
        durationMonths: spec.kind === 'months' ? spec.months : 0,
        durationDays: spec.kind === 'days' ? spec.days : null,
        keyIds: created.map((c) => c.keyId),
        adminNotes,
      });

      const filename = `voice-inbox-vouchers-${locale}-${count}x-${label}-${stamp}.zip`;
      return new Response(new Uint8Array(zip), {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
          'X-Voucher-Count': String(count),
        },
      });
    }

    const pdf = await renderVouchersPrintPdf(inputs);

    await writeAdminAudit(admin, 'pro_license.generate_vouchers', {
      count,
      locale,
      output,
      durationMonths: spec.kind === 'months' ? spec.months : 0,
      durationDays: spec.kind === 'days' ? spec.days : null,
      keyIds: created.map((c) => c.keyId),
      adminNotes,
    });

    const filename = `voice-inbox-vouchers-${locale}-${count}x-${label}-${stamp}.pdf`;
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Voucher-Count': String(count),
      },
    });
  } catch (e) {
    console.error('[admin/pro-licenses/vouchers PDF]', e);
    return NextResponse.json(
      { ok: false, error: 'Keys were created but PDF generation failed' },
      { status: 503 },
    );
  }
}
