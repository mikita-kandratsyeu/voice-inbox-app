import type { MeetingUtterance } from './parseMeetingDialogue';
import { parseMeetingDialogue, SPEAKER_LINE_RE } from './parseMeetingDialogue';

export type MeetingSpeakerLabels = Record<string, string>;

export type MeetingDialogueHeuristics = {
  distinctLabeledSpeakers: number;
  unlabeledUtteranceCount: number;
  showSingleSpeakerHint: boolean;
  showNoSpeakerLabelsHint: boolean;
};

const MAX_LABEL_LEN = 64;
const MAX_RENAMES = 32;

export function normalizeSpeakerLabelKey(label: string): string {
  return label.trim().toLowerCase();
}

export function sanitizeMeetingSpeakerLabels(raw: unknown): MeetingSpeakerLabels | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: MeetingSpeakerLabels = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_RENAMES) break;
    const key = normalizeSpeakerLabelKey(k);
    if (!key) continue;
    if (typeof v !== 'string') continue;
    const name = v.trim().slice(0, MAX_LABEL_LEN);
    if (!name) continue;
    out[key] = name;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function displaySpeakerLabel(
  rawLabel: string,
  labels: MeetingSpeakerLabels | undefined,
): string {
  const trimmed = rawLabel.trim();
  if (!trimmed) return '';
  const mapped = labels?.[normalizeSpeakerLabelKey(trimmed)];
  return mapped?.trim() || trimmed;
}

export function applySpeakerLabelsToUtterances(
  utterances: MeetingUtterance[],
  labels: MeetingSpeakerLabels | undefined,
): MeetingUtterance[] {
  if (!labels || Object.keys(labels).length === 0) return utterances;
  return utterances.map((u) => ({
    ...u,
    speakerLabel: u.speakerLabel ? displaySpeakerLabel(u.speakerLabel, labels) : u.speakerLabel,
  }));
}

export function collectSpeakerLabelsFromDialogue(raw: string): string[] {
  const utterances = parseMeetingDialogue(raw);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of utterances) {
    const label = u.speakerLabel.trim();
    if (!label) continue;
    const key = normalizeSpeakerLabelKey(label);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

export function analyzeMeetingDialogueHeuristics(
  utterances: MeetingUtterance[],
): MeetingDialogueHeuristics {
  const labeled = utterances.filter((u) => u.speakerLabel.trim().length > 0);
  const distinctKeys = new Set(labeled.map((u) => normalizeSpeakerLabelKey(u.speakerLabel)));
  const unlabeledUtteranceCount = utterances.filter((u) => !u.speakerLabel.trim()).length;
  const distinctLabeledSpeakers = distinctKeys.size;

  return {
    distinctLabeledSpeakers,
    unlabeledUtteranceCount,
    showSingleSpeakerHint: utterances.length > 0 && distinctLabeledSpeakers === 1,
    showNoSpeakerLabelsHint:
      utterances.length > 0 &&
      distinctLabeledSpeakers === 0 &&
      unlabeledUtteranceCount === utterances.length,
  };
}

/** Whether raw markdown contains any speaker-prefixed lines. */
export function rawMeetingDialogueHasSpeakerPrefixes(raw: string): boolean {
  const text = raw.trim();
  if (!text) return false;
  return text.split(/\r?\n/).some((line) => SPEAKER_LINE_RE.test(line.trim()));
}

/** Keep user renames only for speakers still present after a new AI breakdown. */
export function pruneSpeakerLabelsForDialogue(
  labels: MeetingSpeakerLabels | undefined,
  dialogueMarkdown: string,
): MeetingSpeakerLabels | undefined {
  if (!labels || Object.keys(labels).length === 0) return labels;
  const present = new Set(
    collectSpeakerLabelsFromDialogue(dialogueMarkdown).map((l) => normalizeSpeakerLabelKey(l)),
  );
  const out: MeetingSpeakerLabels = {};
  for (const [key, name] of Object.entries(labels)) {
    if (present.has(key)) out[key] = name;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function mergeSpeakerRename(
  labels: MeetingSpeakerLabels | undefined,
  originalLabel: string,
  displayName: string,
): MeetingSpeakerLabels | undefined {
  const key = normalizeSpeakerLabelKey(originalLabel);
  if (!key) return labels;
  const next = { ...(labels ?? {}) };
  const trimmed = displayName.trim().slice(0, MAX_LABEL_LEN);
  if (!trimmed || normalizeSpeakerLabelKey(trimmed) === key) {
    delete next[key];
  } else {
    next[key] = trimmed;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

export function renameSpeakerGroup(
  labels: MeetingSpeakerLabels | undefined,
  originalLabels: string[],
  displayName: string,
): MeetingSpeakerLabels | undefined {
  let next = labels;
  for (const originalLabel of originalLabels) {
    next = mergeSpeakerRename(next, originalLabel, displayName);
  }
  return next;
}
