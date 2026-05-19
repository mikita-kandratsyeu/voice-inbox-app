import type { RecordingMark } from '@/entities/record';

export type RecordingMarkForPrompt = {
  offsetMs: number;
  label: string;
};

export const RECORDING_MARKS_PROMPT_MAX_ITEMS = 40;
export const RECORDING_MARKS_PROMPT_LABEL_MAX_CHARS = 300;

export function formatRecordingMarkOffset(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function sanitizeRecordingMarksForPrompt(
  marks: RecordingMark[] | undefined | null,
): RecordingMarkForPrompt[] | undefined {
  if (!marks?.length) return undefined;

  const out: RecordingMarkForPrompt[] = [];
  for (const mark of marks) {
    if (!mark || !Number.isFinite(mark.offsetMs) || mark.offsetMs < 0) continue;
    const rawLabel = typeof mark.label === 'string' ? mark.label : '';
    const label = rawLabel
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, RECORDING_MARKS_PROMPT_LABEL_MAX_CHARS);
    out.push({ offsetMs: Math.floor(mark.offsetMs), label });
    if (out.length >= RECORDING_MARKS_PROMPT_MAX_ITEMS) break;
  }

  if (out.length === 0) return undefined;

  out.sort((a, b) => a.offsetMs - b.offsetMs);
  return out;
}

export function buildRecordingMarksPromptBlock(marks: RecordingMarkForPrompt[]): string {
  if (marks.length === 0) return '';

  const lines = marks.map((m) => {
    const time = formatRecordingMarkOffset(m.offsetMs);
    if (m.label.length > 0) {
      return `- [${time}] "${m.label.replace(/"/g, "'")}"`;
    }
    return `- [${time}] (no label)`;
  });

  return [
    '## RECORDING PINS (user-placed during capture)',
    'The user pinned these moments while recording. Treat pin labels as intentional signals about what matters.',
    '- Reflect pin themes in summary when supported by transcript content near each timestamp.',
    '- Give extra weight to actionable content within ~30 seconds before or after each pin when extracting tasks[] and nextSteps[].',
    '- Do not invent tasks or facts solely from a pin label if the transcript does not support them.',
    '',
    ...lines,
    '',
  ].join('\n');
}
