import { Share } from 'react-native';

import { diagWarn } from '@/shared/lib/appLogger';

import {
  sendRecordEmail,
  sendShareEmailPdfAttachment,
  SHARE_EMAIL_MARKDOWN_MAX,
  SHARE_EMAIL_ZIP_MAX_BYTES,
} from '@/features/share-record/api/sendRecordEmail';
import { RECORD_TEXT_EXPORT_EXTENSION } from '@/features/share-record/lib/buildShareText';
import { isUserCancelledShare } from '@/features/share-record/lib/isUserCancelledShare';
import {
  ensureShareExportDirectory,
  getShareExportDirectoryPath,
  pruneShareExportCache,
} from '@/features/share-record/lib/shareExportCache';
import { shareMarkdownAsPdf } from '@/features/share-record/lib/shareMarkdownAsPdf';
import { writeShareMarkdownPdf } from '@/features/share-record/lib/writeShareMarkdownPdf';
import type { ShareRecordExportFormat } from '@/features/share-record/model/shareRecordExportFormat';
import { i18n } from '@/shared/lib';
import { NitroFS } from '@/shared/lib/fs';

export type DigestSharePayload = {
  message: string;
  title: string;
  fileBaseName: string;
};

export function sanitizeDigestFileBaseName(title: string): string {
  return title.replace(/[^a-zA-Z0-9\u0400-\u04FF\s]/g, '_').trim() || 'digest';
}

export async function shareDigestPlainText(payload: DigestSharePayload): Promise<void> {
  try {
    await Share.share({ message: payload.message, title: payload.title });
  } catch (err) {
    if (!isUserCancelledShare(err)) {
      throw err;
    }
  }
}

export async function shareDigestAsMarkdownFile(payload: DigestSharePayload): Promise<void> {
  void pruneShareExportCache().catch(() => {});
  await ensureShareExportDirectory();

  const fileName = `${payload.fileBaseName}.${RECORD_TEXT_EXPORT_EXTENSION}`;
  const filePath = `${getShareExportDirectoryPath()}/${fileName}`;

  try {
    await NitroFS.writeFile(filePath, payload.message, 'utf8');
    await Share.share(
      {
        title: payload.title,
        message: payload.message,
        url: `file://${filePath}`,
      },
      { dialogTitle: i18n.t('share.share') },
    );
  } catch (err) {
    if (!isUserCancelledShare(err)) {
      throw err;
    }
  }
}

export async function shareDigestExport(
  payload: DigestSharePayload,
  format: ShareRecordExportFormat,
): Promise<void> {
  if (format === 'pdf') {
    await shareMarkdownAsPdf({
      markdown: payload.message,
      fileNameWithoutExtension: payload.fileBaseName,
      shareTitle: `${payload.fileBaseName}.pdf`,
    });
    return;
  }

  await shareDigestAsMarkdownFile(payload);
}

export async function emailDigestExport(
  to: string,
  payload: DigestSharePayload,
  format: ShareRecordExportFormat,
): Promise<void> {
  const subject = payload.title;

  if (format === 'pdf') {
    let pdfPath: string | undefined;
    try {
      const timestamp = Date.now();
      pdfPath = await writeShareMarkdownPdf(
        payload.message,
        `${payload.fileBaseName}-${timestamp}`,
      );

      const stat = await NitroFS.stat(pdfPath);
      if (stat.size > SHARE_EMAIL_ZIP_MAX_BYTES) {
        throw new Error(i18n.t('batch.emailPdfTooLarge'));
      }

      const result = await sendShareEmailPdfAttachment({
        to,
        subject,
        title: payload.title,
        bodyText: i18n.t('batch.emailPdfBodyPlain'),
        pdfAbsolutePath: pdfPath,
        pdfDisplayName: `${payload.fileBaseName}.pdf`,
      });
      if (!result.ok) {
        if (result.status === 413) {
          throw new Error(i18n.t('batch.emailPdfTooLarge'));
        }
        throw new Error(result.error);
      }
    } finally {
      if (pdfPath) {
        try {
          if (await NitroFS.exists(pdfPath)) {
            await NitroFS.unlink(pdfPath);
          }
        } catch {
          diagWarn('[share] unlink failed', pdfPath);
        }
      }
    }
    return;
  }

  if (payload.message.length > SHARE_EMAIL_MARKDOWN_MAX) {
    throw new Error(i18n.t('batch.emailLimitReminder'));
  }

  const result = await sendRecordEmail({
    to,
    subject,
    title: payload.title,
    markdown: payload.message,
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
}
