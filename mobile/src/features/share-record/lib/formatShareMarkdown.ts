import type { VoiceRecord } from '@/entities/record';
import { applySpeakerLabelsToUtterances } from '@/screens/recording-detail/lib/meetingSpeakerLabels';
import {
  normalizeMeetingDialogueMarkdownParagraphs,
  parseMeetingDialogue,
} from '@/screens/recording-detail/lib/parseMeetingDialogue';

const TRANSCRIPT_TIMESTAMP_RE = /\[\d{1,2}:\d{2}(?::\d{2})?\]/;

function normalizeTimestampLabel(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.startsWith('[') ? trimmed : `[${trimmed}]`;
}

function formatTranscriptTurn(timestamp: string, text: string, forEmail = false): string {
  const body = text.replace(/\s+/g, ' ').trim();
  if (!body) return '';
  const label = normalizeTimestampLabel(timestamp);
  if (forEmail) {
    return `${label} ${body}`;
  }
  return `**${label}**\n\n${body}`;
}

/** Splits a flat transcript string into timestamped blocks for share / PDF. */
export function formatPlainTranscriptWithTimestamps(raw: string, forEmail = false): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (!TRANSCRIPT_TIMESTAMP_RE.test(trimmed)) {
    return trimmed;
  }

  const parts = trimmed.split(/(?=\[\d{1,2}:\d{2}(?::\d{2})?\])/);
  const blocks: string[] = [];

  for (const part of parts) {
    const chunk = part.trim();
    if (!chunk) continue;

    const match = chunk.match(/^(\[\d{1,2}:\d{2}(?::\d{2})?\])\s*([\s\S]*)$/);
    if (match) {
      const line = formatTranscriptTurn(match[1], match[2] ?? '', forEmail);
      if (line) blocks.push(line);
    } else {
      blocks.push(chunk);
    }
  }

  return blocks.join('\n\n');
}

export function formatTaskLineForShare(
  task: NonNullable<VoiceRecord['tasks']>[number],
  suffix: string,
): string {
  return `- [${task.isDone ? 'x' : ' '}] ${task.text}${suffix}`;
}

export function formatMeetingDialogueForShareMarkdown(
  raw: string,
  forEmail = false,
  speakerLabels?: Record<string, string>,
): string {
  const normalized = normalizeMeetingDialogueMarkdownParagraphs(raw);
  const utterances = applySpeakerLabelsToUtterances(
    parseMeetingDialogue(normalized),
    speakerLabels,
  );
  if (utterances.length === 0) {
    return normalized;
  }

  return utterances
    .map((u) => {
      const label = u.speakerLabel.trim();
      const body = u.body.trim();
      if (!body && !label) return '';
      if (!label) return body;
      if (forEmail) {
        const flatBody = body.replace(/\r?\n+/g, ' ').trim();
        return `${label}: ${flatBody}`;
      }
      return `**${label}**\n\n${body}`;
    })
    .filter((block) => block.length > 0)
    .join('\n\n');
}

/** Transcript for share / email / PDF — one block per timestamp or segment. */
export function formatTranscriptBodyForShare(
  record: VoiceRecord,
  forEmail = false,
  forDocument = false,
): string {
  const segments = record.transcriptSegments ?? [];
  if (forDocument && segments.length > 0) {
    return segments
      .map((s) => s.text.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n\n');
  }

  if (segments.length > 0) {
    return segments
      .map((s) => formatTranscriptTurn(s.startTime, s.text, forEmail))
      .filter((block) => block.length > 0)
      .join(forEmail ? '\n' : '\n\n');
  }

  if (forDocument) {
    return (record.transcript ?? '').trim();
  }

  return formatPlainTranscriptWithTimestamps(record.transcript ?? '', forEmail);
}
