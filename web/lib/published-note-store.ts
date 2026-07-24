import { isPublishedNoteActive } from '@/lib/published-note';
import { prisma } from '@/lib/prisma';

export type PublishedNoteInactiveRow = {
  id: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
};

export async function deletePublishedNoteById(id: string): Promise<void> {
  try {
    await prisma.publishedNote.delete({ where: { id } });
  } catch {
    // Row may already be gone (race or duplicate request).
  }
}

export async function purgePublishedNoteIfInactive(
  note: PublishedNoteInactiveRow,
): Promise<boolean> {
  if (isPublishedNoteActive(note)) return false;
  await deletePublishedNoteById(note.id);
  return true;
}

/** Removes published snapshots whose expiry time has passed. */
export async function purgeExpiredPublishedNotes(): Promise<void> {
  await prisma.publishedNote.deleteMany({
    where: {
      expiresAt: { not: null, lt: new Date() },
    },
  });
}
