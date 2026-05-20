import { NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus, parseJsonBody } from '@/lib/api';
import { sendSupportReplyEmailForIssue } from '@/lib/support-reply-send';

type Body = {
  issueId?: unknown;
  markdown?: unknown;
  locale?: unknown;
};

export async function POST(request: Request): Promise<NextResponse> {
  const path = new URL(request.url).pathname;

  if (!process.env.DATABASE_URL?.trim()) {
    return apiError('Database not configured', HttpStatus.SERVICE_UNAVAILABLE, { pathname: path });
  }

  const admin = await getAdminSession();
  if (!admin) {
    return apiError('Unauthorized', HttpStatus.UNAUTHORIZED, { pathname: path });
  }

  const body = await parseJsonBody<Body>(request);
  const issueId = typeof body?.issueId === 'string' ? body.issueId.trim() : '';
  if (!issueId) {
    return apiError('issueId is required', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const markdown = typeof body?.markdown === 'string' ? body.markdown : '';
  const localeRaw = typeof body?.locale === 'string' ? body.locale.trim() : 'auto';
  const locale =
    localeRaw === 'en' || localeRaw === 'ru' || localeRaw === 'auto' ? localeRaw : 'auto';

  const result = await sendSupportReplyEmailForIssue(
    issueId,
    markdown,
    admin,
    locale === 'auto' ? 'auto' : locale,
  );
  if (!result.ok) {
    return apiError(result.error, result.status, { pathname: path });
  }

  return NextResponse.json({ ok: true });
}
