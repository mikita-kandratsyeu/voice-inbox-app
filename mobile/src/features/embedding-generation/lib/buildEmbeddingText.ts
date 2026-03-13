import type { VoiceRecord } from '@/entities/record';

export function buildEmbeddingText(record: VoiceRecord): string {
  const parts: string[] = [];

  if (record.summary) {
    parts.push(record.summary);
  }

  if (record.keyPhrases && record.keyPhrases.length > 0) {
    parts.push(record.keyPhrases.join(' '));
  }

  if (parts.length > 0) {
    return parts.join(' ');
  }

  if (record.transcript) {
    return record.transcript;
  }

  if (record.title) {
    return record.title;
  }

  return '';
}
