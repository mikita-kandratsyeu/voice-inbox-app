import { NextResponse } from 'next/server';

import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';

const LOCALES = ['en', 'ru'] as const;
type Locale = (typeof LOCALES)[number];

function isLocale(s: string): s is Locale {
  return (LOCALES as readonly string[]).includes(s);
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateSlug(slug: string): string | null {
  const t = slug.trim().toLowerCase();
  if (t.length < 2 || t.length > 120) return 'slug length 2–120';
  if (!SLUG_RE.test(t)) return 'slug: lowercase letters, digits, hyphens only';
  return null;
}

type PatchBody = {
  locale?: unknown;
  slug?: unknown;
  title?: unknown;
  version?: unknown;
  summary?: unknown;
  body?: unknown;
  published?: unknown;
  publishedAt?: unknown;
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

  const existing = await prisma.releasePost.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }

  const data: {
    locale?: string;
    slug?: string;
    title?: string;
    version?: string | null;
    summary?: string | null;
    body?: string;
    published?: boolean;
    publishedAt?: Date | null;
  } = {};

  if (body.locale !== undefined) {
    const localeRaw = typeof body.locale === 'string' ? body.locale.trim() : '';
    if (!isLocale(localeRaw)) {
      return NextResponse.json({ ok: false, error: 'locale must be en or ru' }, { status: 400 });
    }
    data.locale = localeRaw;
  }

  if (body.slug !== undefined) {
    const slugErr = validateSlug(typeof body.slug === 'string' ? body.slug : '');
    if (slugErr) return NextResponse.json({ ok: false, error: slugErr }, { status: 400 });
    data.slug = (body.slug as string).trim().toLowerCase();
  }

  if (body.title !== undefined) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (title.length < 1 || title.length > 200) {
      return NextResponse.json({ ok: false, error: 'title length 1–200' }, { status: 400 });
    }
    data.title = title;
  }

  if (body.body !== undefined) {
    const md = typeof body.body === 'string' ? body.body : '';
    if (md.length < 1 || md.length > 200_000) {
      return NextResponse.json({ ok: false, error: 'body length 1–200000' }, { status: 400 });
    }
    data.body = md;
  }

  if (body.version !== undefined) {
    data.version =
      typeof body.version === 'string' && body.version.trim()
        ? body.version.trim().slice(0, 32)
        : null;
  }

  if (body.summary !== undefined) {
    data.summary =
      typeof body.summary === 'string' && body.summary.trim()
        ? body.summary.trim().slice(0, 2000)
        : null;
  }

  let nextPublished = existing.published;
  if (body.published !== undefined) {
    nextPublished = body.published === true;
    data.published = nextPublished;
  }

  if (body.publishedAt !== undefined) {
    if (body.publishedAt === null || body.publishedAt === '') {
      data.publishedAt = null;
    } else if (typeof body.publishedAt === 'string' && body.publishedAt.trim()) {
      const d = new Date(body.publishedAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ ok: false, error: 'Invalid publishedAt' }, { status: 400 });
      }
      data.publishedAt = d;
    }
  }

  if (body.published === true && body.publishedAt === undefined && !existing.published) {
    data.publishedAt = new Date();
  }
  if (body.published === false) {
    data.publishedAt = null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, error: 'No fields to update' }, { status: 400 });
  }

  try {
    const row = await prisma.releasePost.update({
      where: { id },
      data,
    });
    await writeAdminAudit(admin, 'releases.update', { id: row.id, slug: row.slug });
    return NextResponse.json({
      ok: true,
      item: {
        id: row.id,
        locale: row.locale,
        slug: row.slug,
        title: row.title,
        version: row.version,
        summary: row.summary,
        body: row.body,
        published: row.published,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Update failed (duplicate slug?)' },
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
    const row = await prisma.releasePost.delete({ where: { id } });
    await writeAdminAudit(admin, 'releases.delete', { id: row.id, slug: row.slug });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }
}
