import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import { prepareShareNoteWebMarkdown } from '@/lib/prepareShareNoteWebMarkdown';
import { purgePublishedNoteIfInactive } from '@/lib/published-note-store';
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
      id: true,
      title: true,
      markdown: true,
      publishedAt: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!note) return null;

  if (await purgePublishedNoteIfInactive(note)) return null;

  return {
    title: note.title,
    markdown: prepareShareNoteWebMarkdown(note.markdown),
    publishedAt: note.publishedAt,
    expiresAt: note.expiresAt,
  };
}
