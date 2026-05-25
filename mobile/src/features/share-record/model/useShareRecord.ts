import { Share } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { i18n } from '@/shared/lib';
import { NitroFS } from '@/shared/lib/fs';

import {
  sendRecordEmail,
  sendShareEmailPdfAttachment,
  sendShareEmailZipAttachment,
  SHARE_EMAIL_MARKDOWN_MAX,
  SHARE_EMAIL_ZIP_MAX_BYTES,
} from '../api/sendRecordEmail';
import {
  buildShareText,
  RECORD_TEXT_EXPORT_EXTENSION,
  sanitizeTitleForFileName,
  type ShareBriefTemplate,
  shareTemplateFileSuffix,
} from '../lib/buildShareText';
import { buildSingleNoteEmailZip } from '../lib/buildSingleNoteEmailZip';
import {
  ensureShareExportDirectory,
  getShareExportDirectoryPath,
  pruneShareExportCache,
} from '../lib/shareExportCache';
import { resolveShareExportContext } from '../lib/shareExportContext';
import { writeShareMarkdownPdf } from '../lib/writeShareMarkdownPdf';
import type { ShareRecordExportFormat } from './shareRecordExportFormat';

export type { ShareBriefTemplate } from '../lib/buildShareText';
export { buildShareText, RECORD_TEXT_EXPORT_EXTENSION } from '../lib/buildShareText';
export type { ShareRecordExportFormat } from './shareRecordExportFormat';

const toFileUri = (path: string): string => (path.startsWith('file://') ? path : `file://${path}`);

async function removeDirRecursive(path: string): Promise<void> {
  const items = await NitroFS.readdir(path);
  for (const item of items) {
    const st = await NitroFS.stat(item.path);
    if (st.isFile) {
      await NitroFS.unlink(item.path);
    } else {
      await removeDirRecursive(item.path);
    }
  }
  await NitroFS.unlink(path);
}

async function removeDirRecursiveIfExists(path: string): Promise<void> {
  try {
    if (await NitroFS.exists(path)) {
      await removeDirRecursive(path);
    }
  } catch {
    if (__DEV__) console.warn('[share] cleanup failed', path);
  }
}

async function unlinkIfExists(path: string): Promise<void> {
  try {
    if (await NitroFS.exists(path)) {
      await NitroFS.unlink(path);
    }
  } catch {
    if (__DEV__) console.warn('[share] unlink failed', path);
  }
}

export const useShareRecord = () => {
  const shareRecord = async (
    record: VoiceRecord,
    template: ShareBriefTemplate = 'noteBrief',
    format: ShareRecordExportFormat = 'markdown',
  ) => {
    void pruneShareExportCache().catch(() => {});
    await ensureShareExportDirectory();

    const text = buildShareText(record, template);
    const baseName = `${sanitizeTitleForFileName(record.title)}${shareTemplateFileSuffix(template)}`;

    if (format === 'pdf') {
      let pdfPath: string | undefined;
      try {
        pdfPath = await writeShareMarkdownPdf(text, baseName);
        await Share.share(
          {
            title: record.title,
            url: toFileUri(pdfPath),
          },
          { dialogTitle: i18n.t('share.shareNote') },
        );
      } catch (err) {
        const error = err as Error;
        if (error.message !== 'User did not share') {
          throw error;
        }
      } finally {
        if (pdfPath) {
          await unlinkIfExists(pdfPath);
        }
      }
      return;
    }

    const fileName = `${baseName}.${RECORD_TEXT_EXPORT_EXTENSION}`;
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
    template: ShareBriefTemplate = 'emailBrief',
    format: ShareRecordExportFormat = 'markdown',
  ) => {
    const subject = emailSubjectForTemplate(record, template);

    const markdown = buildShareText(record, template, {
      ...resolveShareExportContext(),
      forEmail: true,
    });

    if (format === 'pdf') {
      let pdfPath: string | undefined;
      try {
        const baseName = `${sanitizeTitleForFileName(record.title)}${shareTemplateFileSuffix(template)}`;
        const timestamp = Date.now();
        pdfPath = await writeShareMarkdownPdf(markdown, `${baseName}-${timestamp}`);

        const stat = await NitroFS.stat(pdfPath);
        if (stat.size > SHARE_EMAIL_ZIP_MAX_BYTES) {
          throw new Error(i18n.t('batch.emailPdfTooLarge'));
        }

        const result = await sendShareEmailPdfAttachment({
          to,
          subject,
          title: record.title,
          bodyText: i18n.t('batch.emailPdfBodyPlain'),
          pdfAbsolutePath: pdfPath,
          pdfDisplayName: `${baseName}.pdf`,
        });
        if (!result.ok) {
          if (result.status === 413) {
            throw new Error(i18n.t('batch.emailPdfTooLarge'));
          }
          throw new Error(result.error);
        }
      } finally {
        if (pdfPath) {
          await unlinkIfExists(pdfPath);
        }
      }
      return;
    }

    if (markdown.length <= SHARE_EMAIL_MARKDOWN_MAX) {
      const result = await sendRecordEmail({
        to,
        subject,
        title: record.title,
        markdown,
      });
      if (!result.ok) throw new Error(result.error);
      return;
    }

    let exportDir: string | undefined;
    let zipPath: string | undefined;
    try {
      const built = await buildSingleNoteEmailZip(record, template, {
        ...resolveShareExportContext(),
        forEmail: true,
      });
      exportDir = built.exportDir;
      zipPath = built.zipPath;

      const result = await sendShareEmailZipAttachment({
        to,
        subject,
        title: record.title,
        bodyText: i18n.t('share.emailAutoZipBodySingle'),
        zipAbsolutePath: zipPath,
        zipDisplayName: built.zipFileName,
      });
      if (!result.ok) throw new Error(result.error);
    } finally {
      if (exportDir) await removeDirRecursiveIfExists(exportDir);
      if (zipPath) await unlinkIfExists(zipPath);
    }
  };

  return { shareRecord, shareAudio, emailRecord };
};

function emailSubjectForTemplate(record: VoiceRecord, template: ShareBriefTemplate): string {
  switch (template) {
    case 'meetingBrief':
      return i18n.t('share.emailMeetingSubject', { title: record.title });
    case 'meetingSpeakerTurns':
      return i18n.t('share.emailSpeakerTurnsSubject', { title: record.title });
    case 'emailBrief':
      return i18n.t('share.emailBriefSubject', { title: record.title });
    default:
      return i18n.t('share.emailNoteSubject', { title: record.title });
  }
}
