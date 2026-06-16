import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { prepareShareNoteEmailMarkdown } from '@/lib/prepareShareNoteEmailMarkdown';
import { isPublishedNoteActive } from '@/lib/published-note';
import { prisma } from '@/lib/prisma';

export type SharedNotePublicView = {
  title: string;
  markdown: string;
  publishedAt: Date;
  expiresAt: Date | null;
};

export function buildSharedNotePublicPath(token: string, locale = 'en'): string {
  const normalizedToken = token.trim();
  const prefix = locale === 'en' ? '' : `/${locale}`;
  return `${prefix}/s/${normalizedToken}`;
}

export function buildSharedNotePublicUrl(token: string, locale = 'en'): string {
  const base = BASE_URL_OR_FALLBACK.replace(/\/$/, '');
  return `${base}${buildSharedNotePublicPath(token, locale)}`;
}

export async function loadSharedNoteByToken(token: string): Promise<SharedNotePublicView | null> {
  const normalizedToken = token.trim();
  if (!normalizedToken) return null;

  const note = await prisma.publishedNote.findUnique({
    where: { token: normalizedToken },
    select: {
      title: true,
      markdown: true,
      publishedAt: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!note || !isPublishedNoteActive({ expiresAt: note.expiresAt, revokedAt: note.revokedAt })) {
    return null;
  }

  return {
    title: note.title,
    markdown: prepareShareNoteEmailMarkdown(note.markdown),
    publishedAt: note.publishedAt,
    expiresAt: note.expiresAt,
  };
}

export function formatSharedNoteDateTime(date: Date, locale: string): string {
  const intlLocale = locale === 'ru' ? 'ru-RU' : 'en-US';
  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'shortOffset',
  }).format(date);
}
