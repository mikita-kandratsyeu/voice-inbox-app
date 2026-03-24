import { Share } from 'react-native';
import RNFS from 'react-native-fs';

import type { VoiceRecord } from '@/entities/record';
import { formatShortDate, i18n } from '@/shared/lib';

const toFileUri = (path: string): string => (path.startsWith('file://') ? path : `file://${path}`);
export const RECORD_TEXT_EXPORT_EXTENSION = 'txt';

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

export const buildShareText = (record: VoiceRecord): string => {
  const locale = i18n.language ?? 'en';
  const lines: string[] = [];

  lines.push(`# ${record.title}`);
  lines.push('');

  const dateLabel = i18n.t('share.dateLabel');
  const durationLabel = i18n.t('share.durationLabel');
  const dateValue = record.createdAt ? formatShortDate(record.createdAt, locale) : record.createdAt;
  lines.push(`${dateLabel}: ${dateValue}`);
  lines.push(`${durationLabel}: ${record.duration}`);

  if (record.tags && record.tags.length > 0) {
    lines.push('');
    lines.push(`## ${i18n.t('share.tagsLabel')}`);
    lines.push(record.tags.map((tag) => `#${tag}`).join(' '));
  }

  const transcriptBody = formatTranscriptForShare(record);
  if (transcriptBody) {
    lines.push('');
    lines.push(`## ${i18n.t('recordingDetail.transcript')}`);
    lines.push(transcriptBody);
  }

  if (record.summary) {
    lines.push('');
    lines.push(`## ${i18n.t('recordingDetail.summary')}`);
    lines.push(formatPlainTranscriptForShare(record.summary));
  }

  if (record.tasks && record.tasks.length > 0) {
    lines.push('');
    lines.push(`## ${i18n.t('recordingDetail.tasks')}`);
    record.tasks.forEach((t) => {
      lines.push(`- [${t.isDone ? 'x' : ' '}] ${t.text}`);
    });
  }

  lines.push('');
  lines.push(i18n.t('share.exportedFrom'));

  return lines.join('\n');
};

export const useShareRecord = () => {
  const shareRecord = async (record: VoiceRecord) => {
    const text = buildShareText(record);
    const fileName = `${record.title.replace(/[^a-zA-Z0-9\u0400-\u04FF\s]/g, '_')}.${RECORD_TEXT_EXPORT_EXTENSION}`;
    const filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, text, 'utf8');

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
    const audioPath = record.audioPath;
    if (!audioPath?.trim()) {
      throw new Error(i18n.t('share.noAudio'));
    }

    const path = audioPath.startsWith('file://') ? audioPath.slice(7) : audioPath;
    const exists = await RNFS.exists(path);
    if (!exists) {
      throw new Error(i18n.t('share.audioNotFound'));
    }

    const ext = path.split('.').pop() ?? 'm4a';
    const fileName = `${record.title.replace(/[^a-zA-Z0-9\u0400-\u04FF\s]/g, '_')}.${ext}`;
    const destPath = `${RNFS.CachesDirectoryPath}/${fileName}`;

    await RNFS.copyFile(path, destPath);

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

  return { shareRecord, shareAudio };
};
