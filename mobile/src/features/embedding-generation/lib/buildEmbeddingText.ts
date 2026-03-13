import type { VoiceRecord } from '@/entities/record';

const MAX_TEXT_LENGTH = 1800;
const TITLE_MAX_CHARS = 120;
const SUMMARY_MAX_CHARS = 600;
const TRANSCRIPT_MAX_CHARS = 400;
const KEY_PHRASES_MAX = 12;
const TASKS_MAX = 8;

export function buildEmbeddingText(record: VoiceRecord): string {
  const parts: string[] = [];

  if (record.title) {
    parts.push(record.title.slice(0, TITLE_MAX_CHARS));
  }

  if (record.summary) {
    parts.push(record.summary.slice(0, SUMMARY_MAX_CHARS));
  }

  if (record.keyPhrases && record.keyPhrases.length > 0) {
    const phrases = record.keyPhrases.slice(0, KEY_PHRASES_MAX).join(', ');
    parts.push(phrases);
  }

  if (record.tasks && record.tasks.length > 0) {
    const taskTexts = record.tasks
      .slice(0, TASKS_MAX)
      .map((t) => t.text)
      .join('. ');
    parts.push(taskTexts);
  }

  if (record.transcript) {
    const hasSummary = record.summary && record.summary.length >= 80;
    if (!hasSummary) {
      parts.push(record.transcript.slice(0, TRANSCRIPT_MAX_CHARS));
    }
  }

  const combined = parts.join(' ').trim();
  return combined.slice(0, MAX_TEXT_LENGTH);
}
