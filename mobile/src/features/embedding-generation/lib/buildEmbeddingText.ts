import type { VoiceRecord } from '@/entities/record';

const MAX_TEXT_LENGTH = 800;
const SUMMARY_MAX_CHARS = 300;
const TRANSCRIPT_MAX_CHARS = 150;

export function buildEmbeddingText(record: VoiceRecord): string {
  const parts: string[] = [];

  if (record.summary) {
    parts.push(
      record.summary.length <= SUMMARY_MAX_CHARS
        ? record.summary
        : record.summary.slice(0, SUMMARY_MAX_CHARS),
    );
  }

  if (record.keyPhrases && record.keyPhrases.length > 0) {
    parts.push(record.keyPhrases.join(' '));
  }

  if (record.tasks && record.tasks.length > 0) {
    parts.push(record.tasks.map((t) => t.text).join(' '));
  }

  if (record.title) {
    parts.push(record.title);
  }

  if (record.transcript && !record.summary) {
    parts.push(
      record.transcript.length <= TRANSCRIPT_MAX_CHARS
        ? record.transcript
        : record.transcript.slice(0, TRANSCRIPT_MAX_CHARS),
    );
  }

  const combined = parts.join(' ').trim();
  if (combined.length <= MAX_TEXT_LENGTH) return combined;
  return combined.slice(0, MAX_TEXT_LENGTH);
}
