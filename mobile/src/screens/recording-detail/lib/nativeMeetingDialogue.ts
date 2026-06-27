import type { TranscriptSegment } from '@/entities/record';

import type { MeetingUtterance } from './parseMeetingDialogue';

const speakerDisplayLabel = (speakerId: string, order: Map<string, number>): string => {
  const index = order.get(speakerId) ?? order.size + 1;
  return `Speaker ${index}`;
};

/** Groups timed transcript segments into meeting utterance cards (voice diarization). */
export const buildNativeMeetingUtterances = (segments: TranscriptSegment[]): MeetingUtterance[] => {
  const speakerOrder = new Map<string, number>();
  let nextSpeakerIndex = 1;
  const labelToSlot = new Map<string, number>();
  let nextSlot = 0;
  const out: MeetingUtterance[] = [];

  const slotFor = (label: string): number => {
    const key = label.trim().toLowerCase();
    if (!labelToSlot.has(key)) {
      labelToSlot.set(key, nextSlot % 4);
      nextSlot += 1;
    }
    return labelToSlot.get(key)!;
  };

  for (const segment of segments) {
    const text = segment.text.trim();
    if (!text) continue;

    const speakerId = segment.speakerId?.trim();
    if (!speakerId) {
      const last = out[out.length - 1];
      if (last && !last.speakerLabel) {
        last.body = last.body ? `${last.body} ${text}` : text;
      } else {
        out.push({ speakerLabel: '', body: text, colorSlot: 0 });
      }
      continue;
    }

    if (!speakerOrder.has(speakerId)) {
      speakerOrder.set(speakerId, nextSpeakerIndex);
      nextSpeakerIndex += 1;
    }

    const speakerLabel = speakerDisplayLabel(speakerId, speakerOrder);
    const last = out[out.length - 1];
    if (last?.speakerLabel === speakerLabel) {
      last.body = last.body ? `${last.body} ${text}` : text;
      continue;
    }

    out.push({
      speakerLabel,
      body: text,
      colorSlot: slotFor(speakerLabel),
    });
  }

  return out.filter((utterance) => utterance.body.length > 0 || utterance.speakerLabel.length > 0);
};

/** Persists native speaker turns in the same markdown shape as AI pseudo-diarization. */
export const buildMeetingDialogueMarkdownFromNativeSegments = (
  segments: TranscriptSegment[],
): string =>
  buildNativeMeetingUtterances(segments)
    .map((utterance) =>
      utterance.speakerLabel ? `${utterance.speakerLabel}: ${utterance.body}` : utterance.body,
    )
    .join('\n\n');
