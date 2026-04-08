import { NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus, parseJsonBody } from '@/lib/api';
import { isSmtpConfigured } from '@/lib/mailer';
import { parseProLicenseDurationFromBody } from '@/lib/pro-license-admin';
import { sendSupportProLicenseEmailForIssue } from '@/lib/support-pro-license-send';

type Body = { issueId?: unknown; durationMonths?: unknown; durationDays?: unknown };

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

  const spec = parseProLicenseDurationFromBody(body ?? {});
  if (spec == null) {
    return apiError(
      'Provide exactly one of durationMonths (1, 3, 6, 12) or durationDays (1, 7, 14)',
      HttpStatus.BAD_REQUEST,
      { pathname: path },
    );
  }

  const result = await sendSupportProLicenseEmailForIssue(
    issueId,
    spec,
    admin,
    'support.pro_license_email',
  );
  if (!result.ok) {
    return apiError(result.error, result.status, { pathname: path });
  }

  return NextResponse.json({ ok: true });
}
