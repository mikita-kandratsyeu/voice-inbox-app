import type { AskEvidence } from '@/shared/lib/ai-core/types';

export function enrichInboxAskEvidence(
  evidence: AskEvidence[] | undefined,
  notes: Array<{ recordId: string; title: string }>,
): AskEvidence[] | undefined {
  if (!evidence?.length) return evidence;
  const byTitle = new Map(notes.map((note) => [note.title, note.recordId]));
  return evidence.map((item) => {
    if (item.source !== 'corpus_note') return item;
    if (item.recordId) return item;
    const recordId = item.label ? byTitle.get(item.label) : undefined;
    return recordId ? { ...item, recordId } : item;
  });
}

export function resolveInboxEvidenceRecordId(
  item: AskEvidence,
  notes: Array<{ recordId: string; title: string }>,
): string | undefined {
  if (item.source !== 'corpus_note') return undefined;
  if (item.recordId) return item.recordId;
  if (item.label) {
    const match = notes.find((note) => note.title === item.label);
    return match?.recordId;
  }
  return undefined;
}
