import type { VoiceRecord } from '@/entities/record';

export const SUGGESTED_QUESTION_KEYS = ['askSuggested1', 'askSuggested2', 'askSuggested3'] as const;
export const SUGGESTED_QUESTION_LIMIT = 3;

export function buildSuggestedQuestions(
  t: (key: string, opts?: { task?: string }) => string,
  record: VoiceRecord,
): string[] {
  const dynamic: string[] = [];
  if (record.summary?.trim()) {
    dynamic.push(t('recordingDetail.askSuggestedSummary'));
  }
  if (record.tasks && record.tasks.length > 0) {
    dynamic.push(t('recordingDetail.askSuggestedTasks'));
    const firstTask = record.tasks[0];
    if (firstTask?.text) {
      dynamic.push(t('recordingDetail.askSuggestedTaskAbout', { task: firstTask.text }));
    }
  }
  if (record.tags && record.tags.length > 0) {
    dynamic.push(t('recordingDetail.askSuggestedTags'));
  }
  const staticQuestions = SUGGESTED_QUESTION_KEYS.map((key) => t(`recordingDetail.${key}`));
  return [...dynamic, ...staticQuestions].slice(0, SUGGESTED_QUESTION_LIMIT);
}

export function buildFollowUpQuestions(
  t: (key: string, opts?: { task?: string }) => string,
  record: VoiceRecord,
): string[] {
  const list: string[] = [t('recordingDetail.askSuggested2'), t('recordingDetail.askSuggested3')];
  if (record.tasks && record.tasks.length > 0) list.push(t('recordingDetail.askSuggestedTasks'));
  if (record.summary?.trim()) list.push(t('recordingDetail.askSuggestedSummary'));
  return list.slice(0, SUGGESTED_QUESTION_LIMIT);
}
