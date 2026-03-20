import { prisma } from '@/lib/prisma';

export type ReleaseListItem = {
  slug: string;
  title: string;
  version: string | null;
  summary: string | null;
  publishedAt: Date | null;
  createdAt: Date;
};

function normalizeLocale(locale: string): 'en' | 'ru' {
  return locale === 'ru' ? 'ru' : 'en';
}

export async function listPublishedReleases(locale: string): Promise<ReleaseListItem[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  const loc = normalizeLocale(locale);
  try {
    const rows = await prisma.releasePost.findMany({
      where: { locale: loc, published: true },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        slug: true,
        title: true,
        version: true,
        summary: true,
        publishedAt: true,
        createdAt: true,
      },
    });
    return rows;
  } catch {
    return [];
  }
}

export async function getPublishedRelease(
  locale: string,
  slug: string,
): Promise<(ReleaseListItem & { body: string }) | null> {
  if (!process.env.DATABASE_URL?.trim()) return null;
  const loc = normalizeLocale(locale);
  try {
    const row = await prisma.releasePost.findFirst({
      where: { locale: loc, slug, published: true },
      select: {
        slug: true,
        title: true,
        version: true,
        summary: true,
        body: true,
        publishedAt: true,
        createdAt: true,
      },
    });
    return row;
  } catch {
    return null;
  }
}

export async function listPublishedSlugsForLocale(locale: string): Promise<string[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  const loc = normalizeLocale(locale);
  try {
    const rows = await prisma.releasePost.findMany({
      where: { locale: loc, published: true },
      select: { slug: true },
    });
    return rows.map((r) => r.slug);
  } catch {
    return [];
  }
}

export async function allPublishedReleasePaths(): Promise<{ locale: string; slug: string }[]> {
  if (!process.env.DATABASE_URL?.trim()) return [];
  try {
    const rows = await prisma.releasePost.findMany({
      where: { published: true },
      select: { locale: true, slug: true },
    });
    return rows;
  } catch {
    return [];
  }
}
