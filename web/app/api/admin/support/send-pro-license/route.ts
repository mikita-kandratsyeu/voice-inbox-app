import { NextResponse } from 'next/server';

import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus, parseJsonBody } from '@/lib/api';
import { sendTransactionalMail, isSmtpConfigured } from '@/lib/mailer';
import { buildProLicenseKeyEmail } from '@/lib/pro-license-email-template';
import { createProLicenseKeyRecord, parseProLicenseDurationMonths } from '@/lib/pro-license-admin';
import { prisma } from '@/lib/prisma';
import {
  isSupportProKeyRequestSubject,
  SUPPORT_PRO_KEY_SUBJECT_MARKER,
} from '@/lib/support-pro-key-request';

type Body = { issueId?: unknown; durationMonths?: unknown };

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
  const issueId = typeof body?.issueId === 'string' ? body.issueId.trim() : '';
  if (!issueId) {
    return apiError('issueId is required', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const durationMonths = parseProLicenseDurationMonths(body?.durationMonths);
  if (durationMonths == null) {
    return apiError('durationMonths must be 1, 3, 6, or 12', HttpStatus.BAD_REQUEST, {
      pathname: path,
    });
  }

  const issue = await prisma.supportIssue.findUnique({
    where: { id: issueId },
    select: {
      id: true,
      email: true,
      subject: true,
      proLicenseEmailSentAt: true,
      status: true,
    },
  });

  if (!issue) {
    return apiError('Support issue not found', HttpStatus.NOT_FOUND, { pathname: path });
  }

  if (!issue.email?.trim()) {
    return apiError(
      'This request has no email address — ask the user to resubmit with email',
      HttpStatus.BAD_REQUEST,
      { pathname: path },
    );
  }

  if (!isSupportProKeyRequestSubject(issue.subject)) {
    return apiError(
      `Subject does not contain the Pro key marker (${SUPPORT_PRO_KEY_SUBJECT_MARKER})`,
      HttpStatus.BAD_REQUEST,
      { pathname: path },
    );
  }

  if (issue.proLicenseEmailSentAt != null) {
    return apiError('A Pro key was already emailed for this request', HttpStatus.CONFLICT, {
      pathname: path,
    });
  }

  const to = issue.email.trim();
  let plainKey: string;
  let keyId: string;

  try {
    const created = await createProLicenseKeyRecord(admin.adminId, durationMonths, {
      issuedToEmail: to,
    });
    plainKey = created.plainKey;
    keyId = created.keyId;
  } catch (e) {
    console.error('[send-pro-license] create key', e);
    return apiError('Failed to create license key', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname: path,
    });
  }

  const { subject, text, html } = buildProLicenseKeyEmail({
    plainKey,
    durationMonths,
  });

  try {
    await sendTransactionalMail({ to, subject, text, html });
  } catch (e) {
    console.error('[send-pro-license] mail', e);
    try {
      await prisma.proLicenseKey.delete({ where: { id: keyId } });
    } catch (delErr) {
      console.error('[send-pro-license] rollback key', delErr);
    }
    return apiError('Failed to send email (check SMTP settings)', HttpStatus.SERVICE_UNAVAILABLE, {
      pathname: path,
    });
  }

  const now = new Date();
  try {
    await prisma.supportIssue.update({
      where: { id: issueId },
      data: {
        proLicenseEmailSentAt: now,
        proLicenseDurationMonths: durationMonths,
        status: 'closed',
        closedAt: now,
      },
    });
  } catch (e) {
    console.error('[send-pro-license] update issue', e);
    return apiError(
      'Email was sent but failed to update the ticket',
      HttpStatus.SERVICE_UNAVAILABLE,
      {
        pathname: path,
      },
    );
  }

  await writeAdminAudit(admin, 'support.pro_license_email', {
    issueId,
    durationMonths,
    to,
  });

  return NextResponse.json({ ok: true });
}
