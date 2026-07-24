import { sha256Hex } from '@/features/git-remote-sync/lib/contentHash';

/** Must match `computePublishedNoteHash` on web (SHA-256 hex). */
export function computeShareContentHash(markdown: string): string {
  return sha256Hex(markdown);
}
