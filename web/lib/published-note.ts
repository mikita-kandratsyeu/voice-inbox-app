import { createHash } from 'node:crypto';

export const PUBLISHED_NOTE_ALLOWED_TEMPLATES = new Set([
  'noteBrief',
  'emailBrief',
  'meetingBrief',
  'meetingSpeakerTurns',
]);

export function normalizePublishedNoteTemplate(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;
  return PUBLISHED_NOTE_ALLOWED_TEMPLATES.has(value) ? value : null;
}

export function normalizePublishedNoteExpiresIn(raw: unknown): Date | null | 'invalid' {
  if (raw === 'never') return null;
  if (raw === '1d') return new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (raw === '7d') return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  if (raw === '30d') return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return 'invalid';
}

export function computePublishedNoteHash(markdown: string): string {
  return createHash('sha256').update(markdown).digest('hex');
}

export function isPublishedNoteActive(params: {
  expiresAt?: Date | null;
  revokedAt?: Date | null;
}): boolean {
  if (params.revokedAt) return false;
  if (params.expiresAt && params.expiresAt.getTime() <= Date.now()) return false;
  return true;
}
