import { NextResponse } from 'next/server';

import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus, parseJsonBody } from '@/lib/api';
import { sendTransactionalMail, isSmtpConfigured } from '@/lib/mailer';
import { buildProLicenseKeyEmail } from '@/lib/pro-license-email-template';
import {
  createProLicenseKeyRecord,
  parseProLicenseDurationFromBody,
} from '@/lib/pro-license-admin';
import { prisma } from '@/lib/prisma';

type Body = { email?: unknown; durationMonths?: unknown; durationDays?: unknown };

function normalizeRecipientEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 320) return null;
  // Pragmatic check; SMTP will reject truly invalid addresses.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

export async function POST(request: Request): Promise<NextResponse> {
  const path = new URL(request.url).pathname;

  if (!process.env.DATABASE_URL?.trim()) {
    return apiError('Database not configured', HttpStatus.SERVICE_UNAVAILABLE, { pathname: path });
  }

  const admin = await getAdminSession();
  if (!admin) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED, { pathname: path });
  }

  if (!isSmtpConfigured()) {
    return apiError(
      'SMTP is not configured (set SMTP_HOST and MAIL_FROM)',
      HttpStatus.SERVICE_UNAVAILABLE,
      { pathname: path },
    );
  }

  const body = await parseJsonBody<Body>(request);
  const to = normalizeRecipientEmail(body?.email);
  if (!to) {
    return apiError('Valid email is required', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const spec = parseProLicenseDurationFromBody(body ?? {});
  if (spec == null) {
    return apiError(
      'Provide exactly one of durationMonths (1, 3, 6, 12) or durationDays (1, 7, 14)',
      HttpStatus.BAD_REQUEST,
      { pathname: path },
    );
  }

  let plainKey: string;
  let keyId: string;

  try {
    const created = await createProLicenseKeyRecord(admin.adminId, spec, {
      issuedToEmail: to,
    });
    plainKey = created.plainKey;
    keyId = created.keyId;
  } catch (e) {
    console.error('[pro-licenses/send-email] create key', e);
    return apiError('Failed to create license key', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname: path,
    });
  }

  const { subject, text, html } = buildProLicenseKeyEmail({
    plainKey,
    duration:
      spec.kind === 'days'
        ? { kind: 'days', days: spec.days }
        : { kind: 'months', months: spec.months },
    recipientEmail: to,
  });

  try {
    await sendTransactionalMail({ to, subject, text, html });
  } catch (e) {
    console.error('[pro-licenses/send-email] mail', e);
    try {
      await prisma.proLicenseKey.delete({ where: { id: keyId } });
    } catch (delErr) {
      console.error('[pro-licenses/send-email] rollback key', delErr);
    }
    return apiError('Failed to send email (check SMTP settings)', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname: path,
    });
  }

  await writeAdminAudit(admin, 'pro_license.email_direct', {
    durationMonths: spec.kind === 'months' ? spec.months : null,
    durationDays: spec.kind === 'days' ? spec.days : null,
    to,
  });

  return NextResponse.json({ ok: true });
}
