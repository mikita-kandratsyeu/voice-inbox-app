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

type PatchBody = {
  eventId?: unknown;
  locale?: unknown;
  title?: unknown;
  contentType?: unknown;
  body?: unknown;
  ctaLabel?: unknown;
  published?: unknown;
};

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, error: 'Invalid id' }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const existing = await prisma.inAppEventPage.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  const data: {
    eventId?: string;
    locale?: string;
    title?: string;
    contentType?: string;
    body?: string;
    ctaLabel?: string | null;
    published?: boolean;
    revision?: { increment: number };
  } = {};

  let bumpRevision = false;

  if (body.eventId !== undefined) {
    const eventIdErr = validateInAppEventId(typeof body.eventId === 'string' ? body.eventId : '');
    if (eventIdErr) return NextResponse.json({ ok: false, error: eventIdErr }, { status: 400 });
    data.eventId = (body.eventId as string).trim().toLowerCase();
    bumpRevision = true;
  }

  if (body.locale !== undefined) {
    const localeRaw = typeof body.locale === 'string' ? body.locale.trim() : '';
    if (!isInAppEventLocale(localeRaw)) {
      return NextResponse.json({ ok: false, error: 'locale must be en or ru' }, { status: 400 });
    }
    data.locale = localeRaw;
    bumpRevision = true;
  }

  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (title.length < 1 || title.length > 200) {
      return NextResponse.json({ ok: false, error: 'title length 1–200' }, { status: 400 });
    }
    data.title = title;
  }

  if (body.contentType !== undefined) {
    const contentTypeRaw = typeof body.contentType === 'string' ? body.contentType.trim() : '';
    if (!isInAppEventContentType(contentTypeRaw)) {
      return NextResponse.json({ ok: false, error: 'contentType must be html or markdown' }, { status: 400 });
    }
    data.contentType = contentTypeRaw;
    bumpRevision = true;
  }

  if (body.body !== undefined) {
    const contentBody = typeof body.body === 'string' ? body.body : '';
    if (contentBody.length < 1 || contentBody.length > IN_APP_EVENT_BODY_MAX_LENGTH) {
      return NextResponse.json(
        { ok: false, error: `body length 1–${IN_APP_EVENT_BODY_MAX_LENGTH}` },
        { status: 400 },
      );
    }
    data.body = contentBody;
    bumpRevision = true;
  }

  if (body.ctaLabel !== undefined) {
    data.ctaLabel =
      typeof body.ctaLabel === 'string' && body.ctaLabel.trim()
        ? body.ctaLabel.trim().slice(0, 80)
        : null;
    bumpRevision = true;
  }

  if (body.published !== undefined) {
    data.published = body.published === true;
    bumpRevision = true;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: 'No fields to update' }, { status: 400 });
  }

  if (bumpRevision) {
    data.revision = { increment: 1 };
  }

  try {
    const row = await prisma.inAppEventPage.update({
      where: { id },
      data,
    });
    await writeAdminAudit(admin, 'in_app_events.update', { id: row.id, eventId: row.eventId });
    return NextResponse.json({ ok: true, item: serializeItem(row) });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Update failed (duplicate eventId for locale?)' },
      { status: 409 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id?.trim()) {
    return NextResponse.json({ ok: false, error: 'Invalid id' }, { status: 400 });
  }

  try {
    const row = await prisma.inAppEventPage.delete({ where: { id } });
    await writeAdminAudit(admin, 'in_app_events.delete', { id: row.id, eventId: row.eventId });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }
}
