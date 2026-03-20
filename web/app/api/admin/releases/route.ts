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

export async function GET(request: Request): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 503 });
  }

  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const loc = new URL(request.url).searchParams.get('locale')?.trim();
  const where = loc && isLocale(loc) ? { locale: loc } : {};

  try {
    const items = await prisma.releasePost.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    });
    return NextResponse.json({
      ok: true,
      items: items.map((r) => ({
        id: r.id,
        locale: r.locale,
        slug: r.slug,
        title: r.title,
        version: r.version,
        summary: r.summary,
        body: r.body,
        published: r.published,
        publishedAt: r.publishedAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error('[admin/releases GET]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}

type PostBody = {
  locale?: unknown;
  slug?: unknown;
  title?: unknown;
  version?: unknown;
  summary?: unknown;
  body?: unknown;
  published?: unknown;
  publishedAt?: unknown;
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

  const localeRaw = typeof body.locale === 'string' ? body.locale.trim() : '';
  if (!isLocale(localeRaw)) {
    return NextResponse.json({ ok: false, error: 'locale must be en or ru' }, { status: 400 });
  }

  const slugErr = validateSlug(typeof body.slug === 'string' ? body.slug : '');
  if (slugErr) return NextResponse.json({ ok: false, error: slugErr }, { status: 400 });

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (title.length < 1 || title.length > 200) {
    return NextResponse.json({ ok: false, error: 'title length 1–200' }, { status: 400 });
  }

  const md = typeof body.body === 'string' ? body.body : '';
  if (md.length < 1 || md.length > 200_000) {
    return NextResponse.json({ ok: false, error: 'body length 1–200000' }, { status: 400 });
  }

  const version =
    typeof body.version === 'string' && body.version.trim()
      ? body.version.trim().slice(0, 32)
      : null;
  const summary =
    typeof body.summary === 'string' && body.summary.trim()
      ? body.summary.trim().slice(0, 2000)
      : null;

  const published = body.published === true;
  let publishedAt: Date | null = null;
  if (typeof body.publishedAt === 'string' && body.publishedAt.trim()) {
    const d = new Date(body.publishedAt);
    if (!Number.isNaN(d.getTime())) publishedAt = d;
  }
  if (published && !publishedAt) publishedAt = new Date();

  const slug = (typeof body.slug === 'string' ? body.slug : '').trim().toLowerCase();

  try {
    const row = await prisma.releasePost.create({
      data: {
        locale: localeRaw,
        slug,
        title,
        version,
        summary,
        body: md,
        published,
        publishedAt: published ? publishedAt : null,
      },
    });
    await writeAdminAudit(admin, 'releases.create', {
      id: row.id,
      slug: row.slug,
      locale: row.locale,
    });
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
      { ok: false, error: 'Slug already exists for this locale' },
      { status: 409 },
    );
  }
}
