import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus, parseJsonBody } from '@/lib/api';
import { sendTransactionalMail, isSmtpConfigured } from '@/lib/mailer';
import { createProLicenseKeyRecord } from '@/lib/pro-license-admin';
import { prisma } from '@/lib/prisma';
import { VOUCHER_TEMPLATE_VERSION } from '@/lib/pro-license-voucher-copy';
import { buildVoucherGiftEmail } from '@/lib/pro-license-voucher-email';
import { renderVoucherPdf } from '@/lib/pro-license-voucher-pdf';
import {
  buildVoucherAdminNotes,
  buildVoucherPdfInput,
  generateVoucherBatchId,
  parseVoucherRequestBody,
  sanitizeVoucherExtraNote,
  voucherIssuedDateIso,
} from '@/lib/pro-license-voucher-shared';
import { NextResponse } from 'next/server';

type PostBody = {
  email?: unknown;
  durationMonths?: unknown;
  durationDays?: unknown;
  locale?: unknown;
  adminNotes?: unknown;
  promoLabel?: unknown;
};

function normalizeRecipientEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 320) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

export async function POST(request: Request): Promise<NextResponse> {
  const path = new URL(request.url).pathname;
  const admin = await getAdminSession();
  if (!admin) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED, { pathname: path });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return apiError('Database not configured', HttpStatus.SERVICE_UNAVAILABLE, { pathname: path });
  }

  if (!isSmtpConfigured()) {
    return apiError(
      'SMTP is not configured (set SMTP_HOST and MAIL_FROM)',
      HttpStatus.SERVICE_UNAVAILABLE,
      { pathname: path },
    );
  }

  const body = await parseJsonBody<PostBody>(request);
  const to = normalizeRecipientEmail(body?.email);
  if (!to) {
    return apiError('Valid email is required', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const parsed = parseVoucherRequestBody(body ?? {});
  if (parsed == null) {
    return apiError(
      'Provide exactly one of durationMonths (1, 3, 6, 12) or durationDays (1, 7, 14)',
      HttpStatus.BAD_REQUEST,
      { pathname: path },
    );
  }

  const adminNotes = buildVoucherAdminNotes(sanitizeVoucherExtraNote(body?.adminNotes));
  const issuedAt = voucherIssuedDateIso();
  const batchId = generateVoucherBatchId(new Date(`${issuedAt}T12:00:00Z`));

  let plainKey: string;
  let keyId: string;
  try {
    const created = await createProLicenseKeyRecord(admin.adminId, parsed.spec, {
      issuedToEmail: to,
      adminNotes,
      voucherBatchId: batchId,
      voucherTemplateVersion: VOUCHER_TEMPLATE_VERSION,
    });
    plainKey = created.plainKey;
    keyId = created.keyId;
  } catch (e) {
    console.error('[vouchers/send-email] create key', e);
    return apiError('Failed to create license key', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname: path,
    });
  }

  let pdf: Buffer;
  try {
    pdf = await renderVoucherPdf(
      buildVoucherPdfInput(plainKey, keyId, parsed.spec, parsed.locale, parsed.printSize, {
        promoLabel: parsed.promoLabel,
        batchId,
        issuedAt,
        includeEnvelope: parsed.includeEnvelope,
      }),
    );
  } catch (e) {
    console.error('[vouchers/send-email] pdf', e);
    try {
      await prisma.proLicenseKey.delete({ where: { id: keyId } });
    } catch (delErr) {
      console.error('[vouchers/send-email] rollback key', delErr);
    }
    return apiError('Failed to generate voucher PDF', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname: path,
    });
  }

  const mail = buildVoucherGiftEmail({
    plainKey,
    duration: parsed.spec,
    locale: parsed.locale,
    recipientEmail: to,
  });

  try {
    await sendTransactionalMail({
      to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      attachments: [
        {
          filename: mail.pdfFilename,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
    });
  } catch (e) {
    console.error('[vouchers/send-email] mail', e);
    try {
      await prisma.proLicenseKey.delete({ where: { id: keyId } });
    } catch (delErr) {
      console.error('[vouchers/send-email] rollback key', delErr);
    }
    return apiError('Failed to send email (check SMTP settings)', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname: path,
    });
  }

  await writeAdminAudit(admin, 'pro_license.email_voucher', {
    durationMonths: parsed.spec.kind === 'months' ? parsed.spec.months : null,
    durationDays: parsed.spec.kind === 'days' ? parsed.spec.days : null,
    locale: parsed.locale,
    to,
    keyId,
  });

  return NextResponse.json({ ok: true, keyId });
}
