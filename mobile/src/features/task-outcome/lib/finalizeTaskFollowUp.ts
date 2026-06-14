import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';

import { applyTaskCompletion, patchTaskInList } from './applyTaskCompletion';
import { usePendingTaskFollowUpStore } from '../model/pendingTaskFollowUpStore';
import type { PendingTaskFollowUp } from './types';

export function enrichRecordWithFollowUpDraft(
  record: VoiceRecord,
  pending: PendingTaskFollowUp,
): VoiceRecord {
  const { draft } = pending;
  const title = draft.suggestedTitle.trim() || record.title;
  const transcript = record.transcript.trim() || draft.seedTranscript.trim();

  return {
    ...record,
    title,
    transcript,
    tags: draft.tags.length > 0 ? draft.tags : record.tags,
    folderId: draft.folderId ?? record.folderId,
  };
}

export function prepareRecordForTaskFollowUp(
  record: VoiceRecord,
  pending: PendingTaskFollowUp | null,
): VoiceRecord {
  if (!pending) return record;
  return enrichRecordWithFollowUpDraft(record, pending);
}

export async function finalizeTaskFollowUp(
  followUpRecordId: string,
  pending: PendingTaskFollowUp,
): Promise<void> {
  const { sourceRecordId, taskId, outcomeText } = pending;
  const store = useRecordStore.getState();
  const source = store.records.find((record) => record.id === sourceRecordId);
  if (!source?.tasks?.length) return;

  const nextTasks = patchTaskInList(source.tasks, taskId, (task) =>
    applyTaskCompletion(task, {
      outcomeText,
      outcomeRecordId: followUpRecordId,
    }),
  );

  await store.updateTasks(sourceRecordId, nextTasks);
  await store.linkRecord(sourceRecordId, followUpRecordId);
}

export async function completePendingTaskFollowUp(
  followUpRecordId: string,
  pending: PendingTaskFollowUp | null,
): Promise<void> {
  if (!pending) return;
  await finalizeTaskFollowUp(followUpRecordId, pending);
  usePendingTaskFollowUpStore.getState().clearPending();
}
