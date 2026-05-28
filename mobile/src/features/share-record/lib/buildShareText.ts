import { getRecordingMarkKindUi, type VoiceRecord } from '@/entities/record';
import { formatShortDate, formatTime, i18n } from '@/shared/lib';
import { formatTaskDeadlineTimeForDisplay } from '@/shared/lib/taskDeadlineTimeDisplay';

import {
  formatMeetingDialogueForShareMarkdown,
  formatPlainTranscriptWithTimestamps,
  formatTaskLineForShare,
  formatTranscriptBodyForShare,
} from './formatShareMarkdown';
import { resolveShareExportContext, type ShareExportContext } from './shareExportContext';

export type ShareBriefTemplate =
  | 'noteBrief'
  | 'meetingBrief'
  | 'meetingSpeakerTurns'
  | 'emailBrief';

export const RECORD_TEXT_EXPORT_EXTENSION = 'md';

const SHARE_WRAP_WIDTH = 72;

const sanitizeTitleForFileName = (title: string): string =>
  title.replace(/[^a-zA-Z0-9\u0400-\u04FF\s]/g, '_');

export function shareTemplateFileSuffix(template: ShareBriefTemplate): string {
  switch (template) {
    case 'meetingBrief':
      return '-meeting-brief';
    case 'meetingSpeakerTurns':
      return '-speaker-turns';
    case 'emailBrief':
      return '-email-brief';
    default:
      return '-note-brief';
  }
}

function wrapParagraphToWidth(paragraph: string, maxWidth: number): string {
  const normalized = paragraph.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }
  if (normalized.length <= maxWidth) {
    return normalized;
  }

  const words = normalized.split(' ');
  const outLines: string[] = [];
  let line = '';

  const flush = () => {
    if (line) {
      outLines.push(line);
      line = '';
    }
  };

  for (const word of words) {
    if (!word) continue;
    if (word.length >= maxWidth) {
      flush();
      let rest = word;
      while (rest.length > maxWidth) {
        outLines.push(rest.slice(0, maxWidth));
        rest = rest.slice(maxWidth);
      }
      line = rest;
      continue;
    }
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxWidth) {
      line = candidate;
    } else {
      flush();
      line = word;
    }
  }
  flush();
  return outLines.join('\n');
}

function formatPlainTranscriptForShare(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const blocks = trimmed
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return blocks.map((b) => wrapParagraphToWidth(b, SHARE_WRAP_WIDTH)).join('\n\n');
}

function folderNameFor(record: VoiceRecord, ctx: ShareExportContext): string | null {
  const id = record.folderId;
  if (!id) return null;
  return ctx.folderNameById?.[id] ?? null;
}

function pushMeta(lines: string[], record: VoiceRecord, ctx: ShareExportContext): void {
  const locale = i18n.language ?? 'en';
  const dateLabel = i18n.t('share.dateLabel');
  const durationLabel = i18n.t('share.durationLabel');
  const dateValue = record.createdAt ? formatShortDate(record.createdAt, locale) : record.createdAt;

  lines.push(`**${dateLabel}:** ${dateValue}`);
  lines.push(`**${durationLabel}:** ${record.duration}`);

  const folder = folderNameFor(record, ctx);
  if (folder) {
    lines.push(`**${i18n.t('share.folderLabel')}:** ${folder}`);
  }

  if (record.classification) {
    lines.push(
      `**${i18n.t('share.classificationLabel')}:** ${i18n.t(`classification.${record.classification}`)}`,
    );
  }

  lines.push(`**${i18n.t('share.recordIdLabel')}:** \`${record.id}\``);
}

const pushTags = (lines: string[], record: VoiceRecord): void => {
  if (record.tags && record.tags.length > 0) {
    lines.push('');
    lines.push(`## ${i18n.t('share.tagsLabel')}`);
    lines.push(record.tags.map((tag) => `#${tag}`).join(' '));
  }
};

const pushRecordingMarks = (lines: string[], record: VoiceRecord): void => {
  const marks = record.recordingMarks ?? [];
  if (marks.length === 0) return;

  const sorted = [...marks].sort((a, b) => a.offsetMs - b.offsetMs);
  lines.push('');
  lines.push(`## ${i18n.t('recordingDetail.marksSectionTitle')}`);
  sorted.forEach((m) => {
    const timeStr = formatTime(Math.floor(m.offsetMs / 1000));
    const label = m.label.trim();
    const { sharePrefix, untitledKey } = getRecordingMarkKindUi(m.kind);
    const text = (label.length > 0 ? label : i18n.t(untitledKey))
      .replace(/\r?\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    lines.push(`- ${sharePrefix} **${timeStr}** — ${text}`);
  });
};

const pushSummary = (lines: string[], record: VoiceRecord): void => {
  if (record.summary) {
    lines.push('');
    lines.push(`## ${i18n.t('recordingDetail.summary')}`);
    lines.push(formatPlainTranscriptForShare(record.summary));
  }
};

const pushKeyPhrases = (lines: string[], record: VoiceRecord): void => {
  if (record.keyPhrases && record.keyPhrases.length > 0) {
    lines.push('');
    lines.push(`## ${i18n.t('recordingDetail.keyPhrases')}`);
    record.keyPhrases.forEach((phrase) => {
      lines.push(`- ${phrase}`);
    });
  }
};

const formatTaskForShare = (task: NonNullable<VoiceRecord['tasks']>[number]): string => {
  const meta: string[] = [];
  if (task.deadline) {
    const timeLabel =
      task.deadlineTime != null && String(task.deadlineTime).trim() !== ''
        ? formatTaskDeadlineTimeForDisplay(task.deadlineTime)
        : '';
    const deadline = timeLabel.length > 0 ? `${task.deadline} ${timeLabel}` : task.deadline;
    meta.push(`${i18n.t('tasks.deadlineLabel')}: ${deadline}`);
  }
  if (task.priority) {
    meta.push(`${i18n.t('tasks.priorityLabel')}: ${i18n.t(`tasks.priority.${task.priority}`)}`);
  }
  const suffix = meta.length > 0 ? ` (${meta.join(', ')})` : '';
  return formatTaskLineForShare(task, suffix);
};

const pushTasks = (lines: string[], record: VoiceRecord): void => {
  if (record.tasks && record.tasks.length > 0) {
    lines.push('');
    lines.push(`## ${i18n.t('recordingDetail.tasks')}`);
    record.tasks.forEach((t) => {
      lines.push(formatTaskForShare(t));
    });
  }
};

const pushNextSteps = (lines: string[], record: VoiceRecord): void => {
  if (record.nextSteps && record.nextSteps.length > 0) {
    lines.push('');
    lines.push(`## ${i18n.t('recordingDetail.nextSteps')}`);
    record.nextSteps.forEach((step) => {
      lines.push(`- ${step}`);
    });
  }
};

const pushTranslation = (lines: string[], record: VoiceRecord, ctx: ShareExportContext): void => {
  const translated = record.translatedTranscript?.trim();
  if (!translated) return;

  const lang = record.translationLanguage?.trim();
  const heading =
    lang && lang.length > 0
      ? `${i18n.t('share.translationLabel')} (${lang})`
      : i18n.t('share.translationLabel');

  lines.push('');
  lines.push(`## ${heading}`);
  lines.push(formatPlainTranscriptWithTimestamps(translated, ctx.forEmail));
};

const pushTranscript = (lines: string[], record: VoiceRecord, ctx: ShareExportContext): void => {
  const transcriptBody = formatTranscriptBodyForShare(record, ctx.forEmail);
  if (transcriptBody) {
    lines.push('');
    lines.push(`## ${i18n.t('recordingDetail.transcript')}`);
    lines.push(transcriptBody);
  }
};

const pushMeetingDialogue = (
  lines: string[],
  record: VoiceRecord,
  ctx: ShareExportContext,
): void => {
  const body = record.meetingDialogue?.trim();
  if (!body) return;

  lines.push('');
  lines.push(`## ${i18n.t('recordingDetail.meetingDialogueTitle')}`);
  lines.push('');
  lines.push(`_${i18n.t('recordingDetail.meetingDialogueDisclaimer')}_`);
  lines.push('');
  lines.push(formatMeetingDialogueForShareMarkdown(body, ctx.forEmail));
};

const pushFooter = (lines: string[]): void => {
  lines.push('');
  lines.push(i18n.t('share.exportedFrom'));
};

const pushRecordHeader = (lines: string[], record: VoiceRecord, ctx: ShareExportContext): void => {
  if (ctx.forEmail) return;
  lines.push(`# ${record.title}`);
  lines.push('');
  pushMeta(lines, record, ctx);
};

function buildNoteBrief(record: VoiceRecord, ctx: ShareExportContext): string {
  const lines: string[] = [];
  pushRecordHeader(lines, record, ctx);
  pushTags(lines, record);
  pushRecordingMarks(lines, record);
  pushSummary(lines, record);
  pushKeyPhrases(lines, record);
  pushTranslation(lines, record, ctx);
  pushNextSteps(lines, record);
  pushTasks(lines, record);
  pushTranscript(lines, record, ctx);
  pushFooter(lines);
  return lines.join('\n');
}

function buildMeetingBrief(record: VoiceRecord, ctx: ShareExportContext): string {
  const lines: string[] = [];
  pushRecordHeader(lines, record, ctx);
  lines.push(`_${i18n.t('share.meetingBriefSubtitle')}_`);
  lines.push('');
  pushTags(lines, record);
  pushRecordingMarks(lines, record);
  pushSummary(lines, record);
  pushKeyPhrases(lines, record);
  pushMeetingDialogue(lines, record, ctx);
  pushTranslation(lines, record, ctx);
  pushNextSteps(lines, record);
  pushTasks(lines, record);
  pushTranscript(lines, record, ctx);
  pushFooter(lines);
  return lines.join('\n');
}

function buildMeetingSpeakerTurnsOnly(record: VoiceRecord, ctx: ShareExportContext): string {
  const lines: string[] = [];
  pushRecordHeader(lines, record, ctx);
  pushTags(lines, record);
  lines.push('');
  lines.push(`## ${i18n.t('recordingDetail.meetingDialogueTitle')}`);
  lines.push('');
  lines.push(`_${i18n.t('recordingDetail.meetingDialogueDisclaimer')}_`);
  lines.push('');
  const body = record.meetingDialogue?.trim();
  if (body) {
    lines.push(formatMeetingDialogueForShareMarkdown(body, ctx.forEmail));
  } else {
    lines.push(`_${i18n.t('share.speakerTurnsEmpty')}_`);
  }
  pushFooter(lines);
  return lines.join('\n');
}

/** Compact export: summary, tasks, meeting dialogue — no transcript or translation. */
function buildEmailBrief(record: VoiceRecord, ctx: ShareExportContext): string {
  const lines: string[] = [];
  pushRecordHeader(lines, record, ctx);
  const isMeeting = record.classification === 'meeting' || Boolean(record.meetingDialogue?.trim());
  pushTags(lines, record);
  pushRecordingMarks(lines, record);
  pushSummary(lines, record);
  pushKeyPhrases(lines, record);
  if (isMeeting) {
    pushMeetingDialogue(lines, record, ctx);
  }
  pushNextSteps(lines, record);
  pushTasks(lines, record);
  pushFooter(lines);
  return lines.join('\n');
}

export const buildShareText = (
  record: VoiceRecord,
  template: ShareBriefTemplate = 'noteBrief',
  context?: ShareExportContext,
): string => {
  const ctx = resolveShareExportContext(context);

  switch (template) {
    case 'meetingBrief':
      return buildMeetingBrief(record, ctx);
    case 'meetingSpeakerTurns':
      return buildMeetingSpeakerTurnsOnly(record, ctx);
    case 'emailBrief':
      return buildEmailBrief(record, ctx);
    default:
      return buildNoteBrief(record, ctx);
  }
};

export { sanitizeTitleForFileName };
