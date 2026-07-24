import type { TaskItem, VoiceRecord } from '@/entities/record';

import type { TaskFollowUpDraft } from './types';

export function buildFollowUpNoteDraft(
  source: VoiceRecord,
  task: TaskItem,
  labels: { titlePrefix: string; seedHeading: string },
): TaskFollowUpDraft {
  const taskText = task.text.trim();
  const suggestedTitle = taskText ? `${labels.titlePrefix}: ${taskText}` : labels.titlePrefix;

  const seedTranscript = taskText
    ? `${labels.seedHeading}\n${taskText}\n\n`
    : `${labels.seedHeading}\n\n`;

  return {
    suggestedTitle: suggestedTitle.slice(0, 120),
    tags: [...(source.tags ?? [])],
    folderId: source.folderId ?? null,
    seedTranscript,
  };
}
