import {
  displaySpeakerLabel,
  type MeetingSpeakerLabels,
  normalizeSpeakerLabelKey,
} from './meetingSpeakerLabels';
import type { MeetingUtterance } from './parseMeetingDialogue';

export type MeetingDialogueSpeakerRosterEntry = {
  /** AI speaker keys merged into one roster chip when they share a display name. */
  originalLabels: string[];
  displayLabel: string;
  colorSlot: number;
};

/** Unique speakers in first-seen order (for roster chips). */
export function buildSpeakerRoster(
  rawUtterances: MeetingUtterance[],
  speakerLabels: MeetingSpeakerLabels | undefined,
): MeetingDialogueSpeakerRosterEntry[] {
  const seenOriginal = new Set<string>();
  const out: MeetingDialogueSpeakerRosterEntry[] = [];

  for (const u of rawUtterances) {
    const raw = u.speakerLabel.trim();
    if (!raw) continue;
    const originalKey = normalizeSpeakerLabelKey(raw);
    if (seenOriginal.has(originalKey)) continue;
    seenOriginal.add(originalKey);

    const displayLabel = displaySpeakerLabel(raw, speakerLabels) || raw;
    const displayKey = normalizeSpeakerLabelKey(displayLabel);
    const existing = out.find(
      (entry) => normalizeSpeakerLabelKey(entry.displayLabel) === displayKey,
    );
    if (existing) {
      existing.originalLabels.push(raw);
      continue;
    }

    out.push({
      originalLabels: [raw],
      displayLabel,
      colorSlot: u.colorSlot,
    });
  }

  return out;
}

/** Whether to show an inline speaker label on this turn (first turn or speaker changed). */
export function shouldShowInlineSpeakerLabel(
  rawUtterances: MeetingUtterance[],
  index: number,
  speakerLabels?: MeetingSpeakerLabels,
): boolean {
  const raw = rawUtterances[index]?.speakerLabel?.trim() ?? '';
  if (!raw) return false;
  if (index === 0) return true;
  const prevRaw = rawUtterances[index - 1]?.speakerLabel?.trim() ?? '';
  const prevDisplay = displaySpeakerLabel(prevRaw, speakerLabels) || prevRaw;
  const display = displaySpeakerLabel(raw, speakerLabels) || raw;
  return normalizeSpeakerLabelKey(prevDisplay) !== normalizeSpeakerLabelKey(display);
}
