import { isPublishedNoteActive } from '@/lib/published-note';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    publishedNote: {
      delete: jest.fn(async () => ({})),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  deletePublishedNoteById,
  purgeExpiredPublishedNotes,
  purgePublishedNoteIfInactive,
} from '@/lib/published-note-store';

describe('published-note-store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('purgePublishedNoteIfInactive deletes expired notes', async () => {
    const note = {
      id: 'n1',
      expiresAt: new Date(Date.now() - 1000),
      revokedAt: null,
    };
    const deleted = await purgePublishedNoteIfInactive(note);
    expect(deleted).toBe(true);
    expect(prisma.publishedNote.delete).toHaveBeenCalledWith({ where: { id: 'n1' } });
  });

  test('purgePublishedNoteIfInactive keeps active notes', async () => {
    const note = {
      id: 'n1',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    };
    const deleted = await purgePublishedNoteIfInactive(note);
    expect(deleted).toBe(false);
    expect(prisma.publishedNote.delete).not.toHaveBeenCalled();
  });

  test('purgePublishedNoteIfInactive deletes revoked notes', async () => {
    const note = {
      id: 'n1',
      expiresAt: null,
      revokedAt: new Date(),
    };
    const deleted = await purgePublishedNoteIfInactive(note);
    expect(deleted).toBe(true);
    expect(isPublishedNoteActive(note)).toBe(false);
  });

  test('purgeExpiredPublishedNotes deletes rows past expiresAt', async () => {
    await purgeExpiredPublishedNotes();
    expect(prisma.publishedNote.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { not: null, lt: expect.any(Date) } },
    });
  });

  test('deletePublishedNoteById swallows missing row errors', async () => {
    (prisma.publishedNote.delete as jest.Mock).mockRejectedValueOnce(new Error('not found'));
    await expect(deletePublishedNoteById('missing')).resolves.toBeUndefined();
  });
});
