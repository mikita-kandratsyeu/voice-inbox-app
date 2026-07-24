import { NextResponse } from 'next/server';

import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import {
  IN_APP_EVENT_BODY_MAX_LENGTH,
  isInAppEventContentType,
  isInAppEventLocale,
  validateInAppEventId,
} from '@/lib/in-app-event-page';
import { prisma } from '@/lib/prisma';

function serializeItem(row: {
  id: string;
  eventId: string;
  locale: string;
  title: string;
  contentType: string;
  body: string;
  ctaLabel: string | null;
  published: boolean;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    eventId: row.eventId,
    locale: row.locale,
    title: row.title,
    contentType: row.contentType,
    body: row.body,
    ctaLabel: row.ctaLabel,
    published: row.published,
    revision: row.revision,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const loc = new URL(request.url).searchParams.get('locale')?.trim();
  const where = loc && isInAppEventLocale(loc) ? { locale: loc } : {};

  try {
    const items = await prisma.inAppEventPage.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { eventId: 'asc' }],
    });
    return NextResponse.json({
      ok: true,
      items: items.map(serializeItem),
    });
  } catch (e) {
    console.error('[admin/in-app-events GET]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}

type PostBody = {
  eventId?: unknown;
  locale?: unknown;
  title?: unknown;
  contentType?: unknown;
  body?: unknown;
  ctaLabel?: unknown;
  published?: unknown;
};

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const eventIdRaw = typeof body.eventId === 'string' ? body.eventId : '';
  const eventIdErr = validateInAppEventId(eventIdRaw);
  if (eventIdErr) {
    return NextResponse.json({ ok: false, error: eventIdErr }, { status: 400 });
  }
  const eventId = eventIdRaw.trim().toLowerCase();

  const localeRaw = typeof body.locale === 'string' ? body.locale.trim() : '';
  if (!isInAppEventLocale(localeRaw)) {
    return NextResponse.json({ ok: false, error: 'locale must be en or ru' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (title.length < 1 || title.length > 200) {
    return NextResponse.json({ ok: false, error: 'title length 1–200' }, { status: 400 });
  }

  const contentTypeRaw = typeof body.contentType === 'string' ? body.contentType.trim() : '';
  if (!isInAppEventContentType(contentTypeRaw)) {
    return NextResponse.json(
      { ok: false, error: 'contentType must be html or markdown' },
      { status: 400 },
    );
  }

  const contentBody = typeof body.body === 'string' ? body.body : '';
  if (contentBody.length < 1 || contentBody.length > IN_APP_EVENT_BODY_MAX_LENGTH) {
    return NextResponse.json(
      { ok: false, error: `body length 1–${IN_APP_EVENT_BODY_MAX_LENGTH}` },
      { status: 400 },
    );
  }

  const ctaLabel =
    typeof body.ctaLabel === 'string' && body.ctaLabel.trim()
      ? body.ctaLabel.trim().slice(0, 80)
      : null;
  const published = body.published === true;

  try {
    const row = await prisma.inAppEventPage.create({
      data: {
        eventId,
        locale: localeRaw,
        title,
        contentType: contentTypeRaw,
        body: contentBody,
        ctaLabel,
        published,
        revision: 1,
      },
    });
    await writeAdminAudit(admin, 'in_app_events.create', { id: row.id, eventId: row.eventId });
    return NextResponse.json({ ok: true, item: serializeItem(row) });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Create failed (duplicate eventId for locale?)' },
      { status: 409 },
    );
  }
}
