import type { TaskItem, TranscriptSegment, VoiceRecord } from '@/entities/record';
import { stripDocumentTranscriptMarkup } from '@/entities/record/lib/transcriptText';
import { restoreMeetingSummaryFromDocumentMarkdown } from '@/screens/recording-detail/lib/parseMeetingRecapSummary';
import { i18n } from '@/shared/lib';

import {
  listNoteDocumentSectionIds,
  NOTE_DOCUMENT_SECTION_MARKER_RE,
} from './noteDocumentSectionMarkers';

export type NoteDocumentPatch = {
  title?: string;
  summary?: string;
  transcript?: string;
  transcriptSegments?: TranscriptSegment[];
  tags?: string[];
  tasks?: TaskItem[];
  nextSteps?: string[];
  keyPhrases?: string[];
  meetingDialogue?: string | null;
  translatedTranscript?: string | null;
};

export type ParseNoteDocumentResult =
  | { ok: true; patch: NoteDocumentPatch }
  | { ok: false; error: 'title_missing' };

const TASK_CHECKBOX_RE = /^[-*]\s+\[([ xX])\]\s+(.+)$/;
const PRIORITY_VALUES = ['high', 'medium', 'low'] as const;
const PRIORITY_VALUE_SET = new Set<string>(PRIORITY_VALUES);

function splitDocumentSections(markdown: string): {
  preamble: string;
  sections: Map<string, string>;
} {
  const sections = new Map<string, string>();
  const parts = markdown.split(NOTE_DOCUMENT_SECTION_MARKER_RE);
  const preamble = parts[0] ?? '';

  for (let i = 1; i < parts.length; i += 2) {
    const sectionId = parts[i];
    const rawBody = parts[i + 1] ?? '';
    if (sectionId) {
      sections.set(sectionId, rawBody);
    }
  }

  return { preamble, sections };
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim();
}

function parseTitleFromPreamble(preamble: string): string | null {
  const match = preamble.match(/^#\s+(.+?)(?:\r?\n|$)/m);
  if (!match?.[1]) return null;
  const title = stripInlineMarkdown(match[1].trim());
  return title.length > 0 ? title : null;
}

function normalizeSectionBody(body: string): string {
  const lines = body.replace(/\r\n/g, '\n').split('\n');

  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }

  if (lines[0]?.match(/^#{1,3}\s/)) {
    lines.shift();
  }

  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }

  if (lines[0]?.startsWith('_') && lines[0]?.endsWith('_')) {
    lines.shift();
  }

  while (lines.length > 0 && lines[0].trim() === '') {
    lines.shift();
  }

  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  return lines.join('\n').trim();
}

function parseTagsSection(body: string): string[] {
  const tags: string[] = [];

  for (const line of body.split('\n')) {
    const bulletTag = line.trim().match(/^[-*•]\s+#([\w\u0400-\u04FF-]+)/);
    if (bulletTag?.[1]) {
      tags.push(bulletTag[1]);
    }
  }

  for (const match of body.matchAll(/#([\w\u0400-\u04FF-]+)/g)) {
    const tag = match[1]?.trim();
    if (tag) tags.push(tag);
  }

  return [...new Set(tags)];
}

function parseBulletList(body: string): string[] {
  return body
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*]|•|\d+[.)])\s+/, '').trim())
    .filter(Boolean);
}

function localizedPriorityValue(label: string): TaskItem['priority'] | undefined {
  const normalized = label.trim().toLowerCase();
  if (PRIORITY_VALUE_SET.has(normalized)) {
    return normalized as (typeof PRIORITY_VALUES)[number];
  }

  for (const priority of PRIORITY_VALUES) {
    if (i18n.t(`tasks.priority.${priority}`).toLowerCase() === normalized) {
      return priority;
    }
  }

  return undefined;
}

function parseTaskMetaSuffix(
  suffix: string,
): Pick<TaskItem, 'deadline' | 'deadlineTime' | 'priority'> {
  const result: Pick<TaskItem, 'deadline' | 'deadlineTime' | 'priority'> = {};
  const parts = suffix.split(',').map((part) => part.trim());

  for (const part of parts) {
    const colonIndex = part.indexOf(':');
    if (colonIndex === -1) continue;

    const label = part.slice(0, colonIndex).trim().toLowerCase();
    const value = part.slice(colonIndex + 1).trim();
    if (!value) continue;

    const priority = localizedPriorityValue(value);
    if (priority) {
      result.priority = priority;
      continue;
    }

    const deadlineLabel = i18n.t('tasks.deadlineLabel').toLowerCase();
    if (label === deadlineLabel || label.includes('deadline') || label.includes('срок')) {
      const dateMatch = value.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(.+))?$/);
      if (dateMatch) {
        result.deadline = dateMatch[1];
        if (dateMatch[2]?.trim()) {
          result.deadlineTime = dateMatch[2].trim();
        }
      }
    }
  }

  return result;
}

function localizedTaskOutcomeLabel(label: string): 'result' | 'followUp' | null {
  const normalized = label.trim().toLowerCase();
  const resultLabels = [
    i18n.t('taskOutcome.resultLabel').toLowerCase(),
    i18n.t('taskOutcome.outcomeLabel').toLowerCase(),
    'result',
    'итог',
  ];
  if (resultLabels.includes(normalized)) {
    return 'result';
  }

  const followUpLabels = [
    i18n.t('taskOutcome.followUpSectionTitle').toLowerCase(),
    'linked note',
    'связанная заметка',
  ];
  if (followUpLabels.includes(normalized)) {
    return 'followUp';
  }

  return null;
}

function parseTaskSubline(label: string, value: string): Pick<TaskItem, 'outcomeText'> {
  const kind = localizedTaskOutcomeLabel(label);
  const trimmed = value.trim();

  if (kind === 'result') {
    return { outcomeText: trimmed.length > 0 ? trimmed : null };
  }

  return {};
}

function parseTasksSection(body: string, record: VoiceRecord): TaskItem[] {
  const existing = record.tasks ?? [];
  const tasks: TaskItem[] = [];

  let draft: {
    text: string;
    isDone: boolean;
    meta: Pick<TaskItem, 'deadline' | 'deadlineTime' | 'priority'>;
    outcomeText?: string | null;
    hasOutcomeLine: boolean;
  } | null = null;

  const flushDraft = () => {
    if (!draft) return;

    const existingTask = existing.find(
      (task) => task.text.trim().toLowerCase() === draft!.text.toLowerCase(),
    );

    const outcomeText = draft.hasOutcomeLine
      ? (draft.outcomeText ?? null)
      : (existingTask?.outcomeText ?? null);

    tasks.push({
      id:
        existingTask?.id ??
        `${record.id}-manual-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      text: draft.text,
      isDone: draft.isDone,
      deadline: draft.meta.deadline ?? existingTask?.deadline ?? null,
      deadlineTime: draft.meta.deadlineTime ?? existingTask?.deadlineTime ?? null,
      priority: draft.meta.priority ?? existingTask?.priority,
      source: existingTask?.source,
      completedAt: existingTask?.completedAt ?? (draft.isDone ? new Date().toISOString() : null),
      outcomeText,
      outcomeRecordId: existingTask?.outcomeRecordId ?? null,
    });
    draft = null;
  };

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(TASK_CHECKBOX_RE);
    if (match) {
      flushDraft();

      const isDone = match[1].toLowerCase() === 'x';
      let remainder = match[2].trim();
      let meta: Pick<TaskItem, 'deadline' | 'deadlineTime' | 'priority'> = {};

      const metaMatch = remainder.match(/\(([^)]+)\)\s*$/);
      if (metaMatch) {
        meta = parseTaskMetaSuffix(metaMatch[1]);
        remainder = remainder.slice(0, -metaMatch[0].length).trim();
      }

      draft = {
        text: remainder,
        isDone,
        meta,
        hasOutcomeLine: false,
      };
      continue;
    }

    if (!draft || !/^\s+[-*]/.test(line)) {
      continue;
    }

    const subline = trimmed.match(/^[-*]\s+\*\*(.+?):\*\*\s*(.*)$/);
    if (!subline?.[1]) continue;

    const parsed = parseTaskSubline(subline[1], subline[2] ?? '');
    if (parsed.outcomeText !== undefined) {
      draft.hasOutcomeLine = true;
      draft.outcomeText = parsed.outcomeText;
    }
  }

  flushDraft();
  return tasks;
}

function collapseTranscriptSegments(record: VoiceRecord, transcript: string): TranscriptSegment[] {
  const trimmed = transcript.trim();
  if (!trimmed) return [];

  const existing = record.transcriptSegments ?? [];
  const priorTranscript = record.transcript?.trim() ?? '';
  const transcriptChanged = priorTranscript !== trimmed;
  const shouldFlattenSegments = existing.length > 1 || transcriptChanged || existing.length === 0;

  if (shouldFlattenSegments) {
    return [
      {
        id: `${record.id}-text`,
        startTime: '00:00',
        startMs: 0,
        endMs: record.durationMs ?? 0,
        text: trimmed,
      },
    ];
  }

  return [{ ...existing[0]!, text: trimmed }];
}

function serializeSummarySectionBody(body: string, record: VoiceRecord): string {
  const isMeeting = record.classification === 'meeting' || Boolean(record.meetingDialogue?.trim());
  if (!isMeeting) return body;
  return restoreMeetingSummaryFromDocumentMarkdown(body);
}

function hadSectionContent(record: VoiceRecord, sectionId: string): boolean {
  switch (sectionId) {
    case 'tags':
      return (record.tags?.length ?? 0) > 0;
    case 'summary':
      return Boolean(record.summary?.trim());
    case 'key-phrases':
      return (record.keyPhrases?.length ?? 0) > 0;
    case 'translation':
      return Boolean(record.translatedTranscript?.trim());
    case 'next-steps':
      return (record.nextSteps?.length ?? 0) > 0;
    case 'tasks':
      return (record.tasks?.length ?? 0) > 0;
    case 'transcript':
      return Boolean(record.transcript?.trim());
    case 'meeting-dialogue':
      return Boolean(record.meetingDialogue?.trim());
    default:
      return false;
  }
}

export function parseNoteDocumentMarkdown(
  markdown: string,
  record: VoiceRecord,
): ParseNoteDocumentResult {
  const title = parseTitleFromPreamble(markdown);
  if (!title) {
    return { ok: false, error: 'title_missing' };
  }

  const { sections } = splitDocumentSections(markdown);
  const markerIds = listNoteDocumentSectionIds(markdown);
  const patch: NoteDocumentPatch = { title };

  if (markerIds.has('tags') || hadSectionContent(record, 'tags')) {
    patch.tags = markerIds.has('tags')
      ? parseTagsSection(normalizeSectionBody(sections.get('tags') ?? ''))
      : [];
  }

  if (markerIds.has('summary') || hadSectionContent(record, 'summary')) {
    patch.summary = markerIds.has('summary')
      ? serializeSummarySectionBody(normalizeSectionBody(sections.get('summary') ?? ''), record)
      : '';
  }

  if (markerIds.has('key-phrases') || hadSectionContent(record, 'key-phrases')) {
    patch.keyPhrases = markerIds.has('key-phrases')
      ? parseBulletList(normalizeSectionBody(sections.get('key-phrases') ?? ''))
      : [];
  }

  if (markerIds.has('translation') || hadSectionContent(record, 'translation')) {
    patch.translatedTranscript = markerIds.has('translation')
      ? normalizeSectionBody(sections.get('translation') ?? '') || null
      : null;
  }

  if (markerIds.has('next-steps') || hadSectionContent(record, 'next-steps')) {
    patch.nextSteps = markerIds.has('next-steps')
      ? parseBulletList(normalizeSectionBody(sections.get('next-steps') ?? ''))
      : [];
  }

  if (markerIds.has('tasks') || hadSectionContent(record, 'tasks')) {
    patch.tasks = markerIds.has('tasks')
      ? parseTasksSection(normalizeSectionBody(sections.get('tasks') ?? ''), record)
      : [];
  }

  if (markerIds.has('transcript') || hadSectionContent(record, 'transcript')) {
    const transcript = markerIds.has('transcript')
      ? stripDocumentTranscriptMarkup(normalizeSectionBody(sections.get('transcript') ?? ''))
      : '';
    patch.transcript = transcript;
    patch.transcriptSegments = collapseTranscriptSegments(record, transcript);
  }

  if (markerIds.has('meeting-dialogue') || hadSectionContent(record, 'meeting-dialogue')) {
    patch.meetingDialogue = markerIds.has('meeting-dialogue')
      ? normalizeSectionBody(sections.get('meeting-dialogue') ?? '') || null
      : null;
  }

  return { ok: true, patch };
}

/** Task rows for reading view — reflects unsaved checkbox edits in document markdown. */
export function parseTasksFromNoteDocumentMarkdown(
  markdown: string,
  record: VoiceRecord,
): TaskItem[] {
  const markerIds = listNoteDocumentSectionIds(markdown);
  if (!markerIds.has('tasks')) {
    return record.tasks ?? [];
  }

  const { sections } = splitDocumentSections(markdown);
  return parseTasksSection(normalizeSectionBody(sections.get('tasks') ?? ''), record);
}
