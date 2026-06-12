import { i18n } from '@/shared/lib';

/** i18n keys for known `vi:section:*` ids (heading in markdown wins when present). */
export const NOTE_DOCUMENT_SECTION_LABEL_KEYS: Record<string, string> = {
  tags: 'share.tagsLabel',
  summary: 'recordingDetail.summary',
  'key-phrases': 'recordingDetail.keyPhrases',
  tasks: 'recordingDetail.tasks',
  'next-steps': 'recordingDetail.nextSteps',
  translation: 'share.translationLabel',
  transcript: 'recordingDetail.transcript',
  'meeting-dialogue': 'recordingDetail.meetingDialogueTitle',
  'speaker-turns': 'share.speakerTurnsBrief',
};

const COLLAPSED_SECTION_IDS = new Set([
  'transcript',
  'translation',
  'meeting-dialogue',
  'speaker-turns',
]);

export function isNoteDocumentSectionExpandedByDefault(sectionId: string): boolean {
  return !COLLAPSED_SECTION_IDS.has(sectionId);
}

function formatSectionIdFallback(sectionId: string): string {
  return sectionId
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function extractMarkdownHeading(body: string): string | null {
  const match = body.match(/^\s*##\s+(.+?)(?:\r?\n|$)/m);
  return match?.[1]?.trim() ?? null;
}

export function resolveNoteDocumentSectionTitle(sectionId: string, rawBody: string): string {
  const fromHeading = extractMarkdownHeading(rawBody);
  if (fromHeading) return fromHeading;

  const labelKey = NOTE_DOCUMENT_SECTION_LABEL_KEYS[sectionId];
  if (labelKey) return i18n.t(labelKey);

  return formatSectionIdFallback(sectionId);
}

/** Body shown inside a collapsible section — markers removed, duplicate ## heading stripped. */
export function prepareNoteDocumentSectionBody(rawBody: string): string {
  const withoutMarkers = rawBody.replace(/<!--\s*vi:section:[a-z0-9-]+\s*-->/gi, '');
  const lines = withoutMarkers.replace(/\r\n/g, '\n').split('\n');

  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }

  if (lines[0]?.match(/^#{1,3}\s/)) {
    lines.shift();
  }

  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }

  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  return lines.join('\n');
}
