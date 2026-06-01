import {
  displaySpeakerLabel,
  type MeetingSpeakerLabels,
  normalizeSpeakerLabelKey,
} from './meetingSpeakerLabels';
import type { MeetingUtterance } from './parseMeetingDialogue';

export type MeetingDialogueSpeakerRosterEntry = {
  originalLabel: string;
  displayLabel: string;
  colorSlot: number;
};

/** Unique speakers in first-seen order (for roster chips). */
export function buildSpeakerRoster(
  rawUtterances: MeetingUtterance[],
  speakerLabels: MeetingSpeakerLabels | undefined,
): MeetingDialogueSpeakerRosterEntry[] {
  const seen = new Set<string>();
  const out: MeetingDialogueSpeakerRosterEntry[] = [];

  for (const u of rawUtterances) {
    const raw = u.speakerLabel.trim();
    if (!raw) continue;
    const key = normalizeSpeakerLabelKey(raw);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      originalLabel: raw,
      displayLabel: displaySpeakerLabel(raw, speakerLabels) || raw,
      colorSlot: u.colorSlot,
    });
  }

  return out;
}

/** Whether to show an inline speaker label on this turn (first turn or speaker changed). */
export function shouldShowInlineSpeakerLabel(
  rawUtterances: MeetingUtterance[],
  index: number,
): boolean {
  const raw = rawUtterances[index]?.speakerLabel?.trim() ?? '';
  if (!raw) return false;
  if (index === 0) return true;
  const prev = rawUtterances[index - 1]?.speakerLabel?.trim() ?? '';
  return normalizeSpeakerLabelKey(prev) !== normalizeSpeakerLabelKey(raw);
}
