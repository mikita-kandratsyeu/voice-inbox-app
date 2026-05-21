import type { VoiceRecord } from '@/entities/record';

export const SUGGESTED_QUESTION_LIMIT = 3;

const CHIP_LABEL_MAX_CHARS = 36;
const TASK_IN_PROMPT_MAX_CHARS = 120;

export type AskAiSuggestion = {
  label: string;
  prompt: string;
};

type SuggestionCandidate = AskAiSuggestion & {
  priority: number;
};

function truncateText(text: string, max: number): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

function truncateForLabel(text: string): string {
  return truncateText(text, CHIP_LABEL_MAX_CHARS);
}

function truncateForPrompt(text: string): string {
  return truncateText(text, TASK_IN_PROMPT_MAX_CHARS);
}

function flatSuggestion(text: string, priority: number): SuggestionCandidate {
  const prompt = text.trim();
  return {
    label: truncateForLabel(prompt),
    prompt,
    priority,
  };
}

function pickTopSuggestions(
  candidates: SuggestionCandidate[],
  limit = SUGGESTED_QUESTION_LIMIT,
): AskAiSuggestion[] {
  return [...candidates]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
    .map(({ label, prompt }) => ({ label, prompt }));
}

function buildContextCandidates(
  t: (key: string, opts?: { task?: string }) => string,
  record: VoiceRecord,
): SuggestionCandidate[] {
  const candidates: SuggestionCandidate[] = [];
  const hasSummary = Boolean(record.summary?.trim());
  const tasks = record.tasks ?? [];
  const openTasks = tasks.filter((task) => !task.isDone);
  const focusTask = openTasks[0] ?? tasks[0];
  const nextSteps = (record.nextSteps ?? []).map((step) => step.trim()).filter(Boolean);
  const keyPhrases = (record.keyPhrases ?? []).map((phrase) => phrase.trim()).filter(Boolean);
  const tags = (record.tags ?? []).map((tag) => tag.trim()).filter(Boolean);
  const isMeeting = record.classification === 'meeting';

  if (focusTask?.text) {
    const taskText = focusTask.text.trim();
    candidates.push({
      label: t('recordingDetail.askSuggestedTaskAboutLabel', {
        task: truncateForLabel(taskText),
      }),
      prompt: t('recordingDetail.askSuggestedTaskAbout', {
        task: truncateForPrompt(taskText),
      }),
      priority: 100,
    });
  }

  if (nextSteps.length > 0) {
    candidates.push(flatSuggestion(t('recordingDetail.askSuggestedNextSteps'), 92));
  }

  if (openTasks.length >= 2) {
    candidates.push(flatSuggestion(t('recordingDetail.askSuggestedOpenTasks'), 88));
  }

  if (hasSummary) {
    candidates.push(flatSuggestion(t('recordingDetail.askSuggestedSummary'), 84));
  }

  if (tasks.length > 0 && openTasks.length <= 1) {
    candidates.push(flatSuggestion(t('recordingDetail.askSuggestedTasks'), 80));
  }

  if (isMeeting && (record.meetingDialogue?.trim() || hasSummary)) {
    candidates.push(flatSuggestion(t('recordingDetail.askSuggestedMeetingSpeakers'), 76));
  }

  if (keyPhrases.length > 0) {
    candidates.push(flatSuggestion(t('recordingDetail.askSuggestedKeyPhrases'), 68));
  }

  if (tags.length > 0) {
    candidates.push(flatSuggestion(t('recordingDetail.askSuggestedTags'), 56));
  }

  if (!hasSummary) {
    candidates.push(flatSuggestion(t('recordingDetail.askSuggested1'), 40));
    candidates.push(flatSuggestion(t('recordingDetail.askSuggested2'), 36));
  }

  candidates.push(flatSuggestion(t('recordingDetail.askSuggested3'), 32));

  return candidates;
}

export function buildSuggestedQuestions(
  t: (key: string, opts?: { task?: string }) => string,
  record: VoiceRecord,
): AskAiSuggestion[] {
  return pickTopSuggestions(buildContextCandidates(t, record));
}

export function buildFollowUpQuestions(
  t: (key: string, opts?: { task?: string }) => string,
  record: VoiceRecord,
): AskAiSuggestion[] {
  const askSuggested1 = t('recordingDetail.askSuggested1');
  const candidates = buildContextCandidates(t, record).filter(
    (item) => item.prompt !== askSuggested1,
  );

  candidates.push(flatSuggestion(t('recordingDetail.askSuggested2'), 30));

  return pickTopSuggestions(candidates);
}
