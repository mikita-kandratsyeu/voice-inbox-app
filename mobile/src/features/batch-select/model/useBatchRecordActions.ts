import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Share } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import {
  buildShareText,
  RECORD_TEXT_EXPORT_EXTENSION,
  type ShareBriefTemplate,
} from '@/features/share-record';
import {
  sendRecordEmail,
  sendShareEmailZipAttachment,
  SHARE_EMAIL_ZIP_MAX_BYTES,
} from '@/features/share-record/api/sendRecordEmail';
import { hapticError, hapticSuccess } from '@/shared/lib';
import { getCachesDirectoryPath, NitroFS } from '@/shared/lib/fs';

import type { BatchExportPackaging } from './batchExportPackaging';
import { buildBatchMarkdownZip } from './buildBatchMarkdownZip';

const SHARE_EMAIL_MARKDOWN_MAX = 80_000;

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

async function unlinkIfExists(path: string): Promise<void> {
  try {
    const exists = await NitroFS.exists(path);
    if (exists) {
      await NitroFS.unlink(path);
    }
  } catch {
    if (__DEV__) {
      console.warn('[batchExport] unlinkIfExists failed', path);
    }
  }
}

async function removeDirRecursiveIfExists(path: string): Promise<void> {
  try {
    const exists = await NitroFS.exists(path);
    if (exists) {
      await removeDirRecursive(path);
    }
  } catch {
    if (__DEV__) {
      console.warn('[batchExport] removeDirRecursiveIfExists failed', path);
    }
  }
}

function isUserCancelledShare(err: unknown): boolean {
  return err instanceof Error && err.message === 'User did not share';
}

type UseBatchRecordActionsParams = {
  onComplete: () => void;
};

export const useBatchRecordActions = ({ onComplete }: UseBatchRecordActionsParams) => {
  const { t } = useTranslation();
  const archiveRecord = useRecordStore((s) => s.archiveRecord);
  const unarchiveRecord = useRecordStore((s) => s.unarchiveRecord);
  const deleteRecord = useRecordStore((s) => s.deleteRecord);
  const setRecordFolder = useRecordStore((s) => s.setRecordFolder);

  const batchArchive = useCallback(
    async (ids: string[]) => {
      await Promise.all(ids.map((id) => archiveRecord(id)));
      hapticSuccess();
      onComplete();
    },
    [archiveRecord, onComplete],
  );

  const batchUnarchive = useCallback(
    async (ids: string[]) => {
      await Promise.all(ids.map((id) => unarchiveRecord(id)));
      hapticSuccess();
      onComplete();
    },
    [unarchiveRecord, onComplete],
  );

  const batchDelete = useCallback(
    (ids: string[]) => {
      Alert.alert(
        t('batch.deleteTitle', { count: ids.length }),
        t('batch.deleteConfirm', { count: ids.length }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.delete'),
            style: 'destructive',
            onPress: async () => {
              await Promise.all(ids.map((id) => deleteRecord(id)));
              hapticSuccess();
              onComplete();
            },
          },
        ],
      );
    },
    [t, deleteRecord, onComplete],
  );

  const batchExport = useCallback(
    async (
      records: VoiceRecord[],
      template: ShareBriefTemplate = 'noteBrief',
      packaging: BatchExportPackaging = 'single',
    ) => {
      if (records.length === 0) return;

      const cache = getCachesDirectoryPath();
      const timestamp = Date.now();

      if (packaging === 'single') {
        const lines = records.map((record) => buildShareText(record, template));
        const content = lines.join('\n\n---\n\n');
        const fileName = `voice-inbox-export-${timestamp}.${RECORD_TEXT_EXPORT_EXTENSION}`;
        const filePath = `${cache}/${fileName}`;

        try {
          await NitroFS.writeFile(filePath, content, 'utf8');

          await Share.share({
            url: `file://${filePath}`,
            title: fileName,
          });
          hapticSuccess();
        } catch (err) {
          if (isUserCancelledShare(err)) {
            return;
          }
          hapticError();
          if (__DEV__) console.warn('[batchExport] failed:', err);
          Alert.alert(t('common.error'), t('batch.exportFailed'));
        }
        return;
      }

      let built: Awaited<ReturnType<typeof buildBatchMarkdownZip>> | undefined;

      try {
        built = await buildBatchMarkdownZip(records, template);

        await Share.share({
          url: `file://${built.zipPath}`,
          title: built.zipFileName,
        });
        hapticSuccess();
      } catch (err) {
        if (isUserCancelledShare(err)) {
          return;
        }
        hapticError();
        if (__DEV__) console.warn('[batchExport] zip failed:', err);
        Alert.alert(t('common.error'), t('batch.exportFailed'));
      } finally {
        if (built) {
          await removeDirRecursiveIfExists(built.exportDir);
          await unlinkIfExists(built.zipPath);
        }
      }
    },
    [t],
  );

  const batchEmailExport = useCallback(
    async (
      records: VoiceRecord[],
      template: ShareBriefTemplate,
      to: string,
      packaging: BatchExportPackaging = 'single',
    ) => {
      if (records.length === 0) return;

      const subject =
        template === 'meetingBrief'
          ? t('share.emailBatchMeetingSubject', { count: records.length })
          : t('share.emailBatchNoteSubject', { count: records.length });
      const title = t('share.emailBatchDocumentTitle', { count: records.length });

      if (packaging === 'zip') {
        let exportDir: string | undefined;
        let zipPath: string | undefined;
        try {
          const built = await buildBatchMarkdownZip(records, template);
          exportDir = built.exportDir;
          zipPath = built.zipPath;

          const stat = await NitroFS.stat(zipPath);
          if (stat.size > SHARE_EMAIL_ZIP_MAX_BYTES) {
            throw new Error(t('batch.emailZipTooLarge'));
          }

          const result = await sendShareEmailZipAttachment({
            to,
            subject,
            title,
            bodyText: t('batch.emailZipBodyPlain'),
            zipAbsolutePath: zipPath,
            zipDisplayName: built.zipFileName,
          });

          if (!result.ok) {
            if (result.status === 413) {
              throw new Error(t('batch.emailZipTooLarge'));
            }
            throw new Error(result.error);
          }
        } finally {
          if (exportDir) {
            await removeDirRecursiveIfExists(exportDir);
          }
          if (zipPath) {
            await unlinkIfExists(zipPath);
          }
        }
        return;
      }

      const markdown = records.map((r) => buildShareText(r, template)).join('\n\n---\n\n');

      if (markdown.length > SHARE_EMAIL_MARKDOWN_MAX) {
        throw new Error(t('batch.emailTooLargeBody'));
      }

      const result = await sendRecordEmail({
        to,
        subject,
        title,
        markdown,
      });

      if (!result.ok) {
        throw new Error(result.error);
      }
    },
    [t],
  );

  const batchMoveToFolder = useCallback(
    async (ids: string[], folderId: string | null) => {
      if (ids.length === 0) return;
      await Promise.all(ids.map((id) => setRecordFolder(id, folderId)));
      hapticSuccess();
      onComplete();
    },
    [setRecordFolder, onComplete],
  );

  return {
    batchArchive,
    batchUnarchive,
    batchDelete,
    batchExport,
    batchEmailExport,
    batchMoveToFolder,
  };
};
