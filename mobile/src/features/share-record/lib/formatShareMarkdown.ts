import type { VoiceRecord } from '@/entities/record';
import {
  normalizeMeetingDialogueMarkdownParagraphs,
  parseMeetingDialogue,
} from '@/screens/recording-detail/lib/parseMeetingDialogue';

/** Email-safe task line (avoids GFM checkboxes stripped in HTML mail). */
export function formatTaskLineForShare(
  task: NonNullable<VoiceRecord['tasks']>[number],
  suffix: string,
): string {
  const mark = task.isDone ? '✅' : '☐';
  return `- ${mark} ${task.text}${suffix}`;
}

/** Speaker turns as blockquotes for readable HTML email and .md export. */
export function formatMeetingDialogueForShareMarkdown(raw: string): string {
  const normalized = normalizeMeetingDialogueMarkdownParagraphs(raw);
  const utterances = parseMeetingDialogue(normalized);
  if (utterances.length === 0) {
    return normalized;
  }
  const hasSpeakerLabels = utterances.some((u) => u.speakerLabel.length > 0);
  if (!hasSpeakerLabels) {
    return normalized;
  }

  return utterances
    .map((u) => {
      const bodyLines = u.body.split(/\r?\n/).filter((line) => line.trim().length > 0);
      if (bodyLines.length === 0) {
        return u.speakerLabel ? `> **${u.speakerLabel}:**` : '';
      }
      const prefix = u.speakerLabel ? `**${u.speakerLabel}:** ` : '';
      const first = `> ${prefix}${bodyLines[0]}`;
      const rest = bodyLines.slice(1).map((line) => `> ${line}`);
      return [first, ...rest].join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
}

/** Transcript for share / email (no hard wrap — HTML and code blocks handle layout). */
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

export function wrapTranscriptInMarkdownFence(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return '';
  return ['```', trimmed, '```'].join('\n');
}
