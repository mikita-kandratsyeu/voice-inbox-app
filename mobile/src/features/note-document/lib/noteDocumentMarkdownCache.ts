import type { VoiceRecord } from '@/entities/record';
import { resolveShareExportContext } from '@/features/share-record/lib/shareExportContext';
import runAfterInteractions from '@/shared/lib/runAfterInteractions';

import { buildNoteDocumentMarkdown } from './buildNoteDocumentMarkdown';
import { buildNoteDocumentCacheKey } from './noteDocumentCacheKey';
import {
  hasCachedNoteDocumentMarkdown,
  setCachedNoteDocumentMarkdown,
} from './noteDocumentMarkdownStore';

export { buildNoteDocumentCacheKey } from './noteDocumentCacheKey';
export {
  getCachedNoteDocumentMarkdown,
  invalidateNoteDocumentCacheForRecord,
  setCachedNoteDocumentMarkdown,
} from './noteDocumentMarkdownStore';

const warmScheduledKeys = new Set<string>();

export function warmNoteDocumentMarkdown(record: VoiceRecord, language: string): void {
  const ctx = resolveShareExportContext();
  const key = buildNoteDocumentCacheKey(record, language, ctx);
  if (hasCachedNoteDocumentMarkdown(key) || warmScheduledKeys.has(key)) {
    return;
  }

  warmScheduledKeys.add(key);
  runAfterInteractions(() => {
    warmScheduledKeys.delete(key);
    if (hasCachedNoteDocumentMarkdown(key)) return;

    const built = buildNoteDocumentMarkdown(record, ctx);
    setCachedNoteDocumentMarkdown(key, built);
  });
}
