import type { VoiceRecord } from '@/entities/record';
import { normalizeMeetingDialogueMarkdownParagraphs } from '@/screens/recording-detail/lib/parseMeetingDialogue';

export function formatTaskLineForShare(
  task: NonNullable<VoiceRecord['tasks']>[number],
  suffix: string,
): string {
  return `- [${task.isDone ? 'x' : ' '}] ${task.text}${suffix}`;
}

export function formatMeetingDialogueForShareMarkdown(raw: string): string {
  return normalizeMeetingDialogueMarkdownParagraphs(raw);
}

/** Transcript for share / email. */
export function formatTranscriptBodyForShare(record: VoiceRecord): string {
  const segments = record.transcriptSegments ?? [];
  if (segments.length > 0) {
    return segments
      .map((s) => `[${s.startTime}] ${s.text.trim()}`)
      .filter((line) => line.length > 6)
      .join('\n');
  }
  return (record.transcript ?? '').trim();
}
