import { Share } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { formatShortDate, i18n } from '@/shared/lib';
import { NitroFS } from '@/shared/lib/fs';
import { formatTaskDeadlineTimeForDisplay } from '@/shared/lib/taskDeadlineTimeDisplay';

import { sendRecordEmail } from '../api/sendRecordEmail';
import {
  ensureShareExportDirectory,
  getShareExportDirectoryPath,
  pruneShareExportCache,
} from '../lib/shareExportCache';

const toFileUri = (path: string): string => (path.startsWith('file://') ? path : `file://${path}`);
export type ShareBriefTemplate = 'noteBrief' | 'meetingBrief';
export const RECORD_TEXT_EXPORT_EXTENSION = 'md';
const sanitizeTitleForFileName = (title: string): string =>
  title.replace(/[^a-zA-Z0-9\u0400-\u04FF\s]/g, '_');

const SHARE_WRAP_WIDTH = 72;

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
    if (!word) {
      continue;
    }
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
  if (!trimmed) {
    return '';
  }

  const blocks = trimmed
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  return blocks.map((b) => wrapParagraphToWidth(b, SHARE_WRAP_WIDTH)).join('\n\n');
}

function formatSegmentBlockForShare(startTime: string, text: string): string {
  const wrapped = wrapParagraphToWidth(text.trim(), SHARE_WRAP_WIDTH);
  if (!wrapped) {
    return '';
  }
  const lines = wrapped.split('\n');
  const prefix = `[${startTime}] `;
  const hangIndent = ' '.repeat(prefix.length);

  return lines.map((line, i) => (i === 0 ? prefix + line : hangIndent + line)).join('\n');
}

function formatTranscriptForShare(record: VoiceRecord): string {
  const segments = record.transcriptSegments ?? [];
  if (segments.length > 0) {
    return segments
      .map((s) => formatSegmentBlockForShare(s.startTime, s.text))
      .filter(Boolean)
      .join('\n\n');
  }

  return formatPlainTranscriptForShare(record.transcript ?? '');
}

const pushMeta = (lines: string[], record: VoiceRecord): void => {
  const locale = i18n.language ?? 'en';
  const dateLabel = i18n.t('share.dateLabel');
  const durationLabel = i18n.t('share.durationLabel');
  const dateValue = record.createdAt ? formatShortDate(record.createdAt, locale) : record.createdAt;

  lines.push(`${dateLabel}: ${dateValue}`);
  lines.push(`${durationLabel}: ${record.duration}`);
};

const pushTags = (lines: string[], record: VoiceRecord): void => {
  if (record.tags && record.tags.length > 0) {
    lines.push('');
    lines.push(`## ${i18n.t('share.tagsLabel')}`);
    lines.push(record.tags.map((tag) => `#${tag}`).join(' '));
  }
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
  return `- [${task.isDone ? 'x' : ' '}] ${task.text}${suffix}`;
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

const pushTranscript = (lines: string[], record: VoiceRecord): void => {
  const transcriptBody = formatTranscriptForShare(record);
  if (transcriptBody) {
    lines.push('');
    lines.push(`## ${i18n.t('recordingDetail.transcript')}`);
    lines.push(transcriptBody);
  }
};

const pushFooter = (lines: string[]): void => {
  lines.push('');
  lines.push(i18n.t('share.exportedFrom'));
};

const buildNoteBrief = (record: VoiceRecord): string => {
  const lines: string[] = [];

  lines.push(`# ${record.title}`);
  lines.push('');
  pushMeta(lines, record);
  pushTags(lines, record);
  pushSummary(lines, record);
  pushKeyPhrases(lines, record);
  pushNextSteps(lines, record);
  pushTasks(lines, record);
  pushTranscript(lines, record);
  pushFooter(lines);

  return lines.join('\n');
};

const buildMeetingBrief = (record: VoiceRecord): string => {
  const lines: string[] = [];

  lines.push(`# ${record.title}`);
  lines.push('');
  lines.push(`_${i18n.t('share.meetingBriefSubtitle')}_`);
  lines.push('');
  pushMeta(lines, record);
  pushTags(lines, record);
  pushSummary(lines, record);
  pushKeyPhrases(lines, record);
  pushNextSteps(lines, record);
  pushTasks(lines, record);
  pushTranscript(lines, record);
  pushFooter(lines);

  return lines.join('\n');
};

export const buildShareText = (
  record: VoiceRecord,
  template: ShareBriefTemplate = 'noteBrief',
): string => {
  if (template === 'meetingBrief') {
    return buildMeetingBrief(record);
  }

  return buildNoteBrief(record);
};

export const useShareRecord = () => {
  const shareRecord = async (record: VoiceRecord, template: ShareBriefTemplate = 'noteBrief') => {
    void pruneShareExportCache().catch(() => {});
    await ensureShareExportDirectory();

    const text = buildShareText(record, template);
    const templateSuffix = template === 'meetingBrief' ? '-meeting-brief' : '-note-brief';
    const fileName = `${sanitizeTitleForFileName(record.title)}${templateSuffix}.${RECORD_TEXT_EXPORT_EXTENSION}`;
    const filePath = `${getShareExportDirectoryPath()}/${fileName}`;

    try {
      await NitroFS.writeFile(filePath, text, 'utf8');

      await Share.share(
        {
          title: record.title,
          message: text,
          url: `file://${filePath}`,
        },
        { dialogTitle: i18n.t('share.shareNote') },
      );
    } catch (err) {
      const error = err as Error;
      if (error.message !== 'User did not share') {
        throw error;
      }
    }
  };

  const shareAudio = async (record: VoiceRecord) => {
    void pruneShareExportCache().catch(() => {});
    await ensureShareExportDirectory();

    const audioPath = record.audioPath;
    if (!audioPath?.trim()) {
      throw new Error(i18n.t('share.noAudio'));
    }

    const path = audioPath.startsWith('file://') ? audioPath.slice(7) : audioPath;
    const exists = await NitroFS.exists(path);
    if (!exists) {
      throw new Error(i18n.t('share.audioNotFound'));
    }

    const ext = path.split('.').pop() ?? 'm4a';
    const fileName = `${sanitizeTitleForFileName(record.title)}_${Date.now()}.${ext}`;
    const destPath = `${getShareExportDirectoryPath()}/${fileName}`;

    await NitroFS.copyFile(path, destPath);

    try {
      await Share.share(
        {
          title: record.title,
          message: record.title,
          url: toFileUri(destPath),
        },
        { dialogTitle: i18n.t('share.shareAudio') },
      );
    } catch (err) {
      const error = err as Error;
      if (error.message !== 'User did not share') {
        throw error;
      }
    }
  };

  const emailRecord = async (
    record: VoiceRecord,
    to: string,
    template: ShareBriefTemplate = 'noteBrief',
  ) => {
    const markdown = buildShareText(record, template);
    const subject =
      template === 'meetingBrief'
        ? i18n.t('share.emailMeetingSubject', { title: record.title })
        : i18n.t('share.emailNoteSubject', { title: record.title });
    const result = await sendRecordEmail({
      to,
      subject,
      title: record.title,
      markdown,
    });

    if (!result.ok) {
      throw new Error(result.error);
    }
  };

  return { shareRecord, shareAudio, emailRecord };
};
