import { NextResponse } from 'next/server';

import { getAdminSession } from '@/lib/admin-session';
import { apiError, HttpStatus } from '@/lib/api';
import { generateReleasePostDraft, type ReleasePostDraftLocale } from '@/lib/release-post-generate';

type Body = {
  locale?: unknown;
  version?: unknown;
  sinceTag?: unknown;
};

function isLocale(s: string): s is ReleasePostDraftLocale {
  return s === 'en' || s === 'ru';
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

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    return apiError('Invalid JSON', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const localeRaw = typeof body.locale === 'string' ? body.locale.trim() : 'en';
  if (!isLocale(localeRaw)) {
    return apiError('locale must be en or ru', HttpStatus.BAD_REQUEST, { pathname: path });
  }

  const version =
    typeof body.version === 'string' && body.version.trim() ? body.version.trim() : undefined;
  const sinceTag =
    typeof body.sinceTag === 'string' && body.sinceTag.trim() ? body.sinceTag.trim() : undefined;

  try {
    const draft = await generateReleasePostDraft(localeRaw, { version, sinceTag });
    return NextResponse.json({ ok: true, draft });
  } catch (e) {
    console.error('[admin/releases/generate-draft]', e);
    return apiError(
      e instanceof Error ? e.message : 'Failed to generate draft',
      HttpStatus.SERVICE_UNAVAILABLE,
      { pathname: path },
    );
  }
}
