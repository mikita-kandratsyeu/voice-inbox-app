import type { TaskItem, VoiceRecord } from '@/entities/record';

export type TaskCompletionInput = {
  outcomeText?: string | null;
  outcomeRecordId?: string | null;
};

export type TaskFollowUpDraft = {
  suggestedTitle: string;
  tags: string[];
  folderId: string | null;
  seedTranscript: string;
};

export type PendingTaskFollowUp = {
  sourceRecordId: string;
  taskId: string;
  outcomeText?: string | null;
  draft: TaskFollowUpDraft;
  mode: 'voice' | 'text';
};

export type TaskCompletionTarget = {
  recordId: string;
  record: VoiceRecord;
  task: TaskItem;
};
