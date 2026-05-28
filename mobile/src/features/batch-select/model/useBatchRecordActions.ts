import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Share } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { RECORD_TEXT_EXPORT_EXTENSION, type ShareBriefTemplate } from '@/features/share-record';
import {
  sendRecordEmail,
  sendShareEmailPdfAttachment,
  sendShareEmailZipAttachment,
  SHARE_EMAIL_MARKDOWN_MAX,
  SHARE_EMAIL_ZIP_MAX_BYTES,
} from '@/features/share-record/api/sendRecordEmail';
import { buildBatchShareMarkdown } from '@/features/share-record/lib/batchShareMarkdown';
import { isUserCancelledShare } from '@/features/share-record/lib/isUserCancelledShare';
import { resolveShareExportContext } from '@/features/share-record/lib/shareExportContext';
import { shareMarkdownAsPdf } from '@/features/share-record/lib/shareMarkdownAsPdf';
import { writeShareMarkdownPdf } from '@/features/share-record/lib/writeShareMarkdownPdf';
import { hapticError, hapticSuccess } from '@/shared/lib';
import { getCachesDirectoryPath, NitroFS } from '@/shared/lib/fs';

import type { BatchExportPackaging } from './batchExportPackaging';
import { buildBatchMarkdownZip } from './buildBatchMarkdownZip';

export type BatchEmailExportResult = {
  autoZipFallback?: boolean;
};

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

/** Progress overlay kind for sequential batch inbox actions. */
export type BatchProgressKind =
  | 'archive'
  | 'unarchive'
  | 'delete'
  | 'moveToFolder'
  | 'purgeForever';

type UseBatchRecordActionsParams = {
  onComplete: () => void;
  /** Called once at the start of a batch with the total number of items. */
  onBatchStart?: (kind: BatchProgressKind, total: number) => void;
  /** Called after each item finishes (current is 1-based count completed). */
  onProgress?: (current: number, total: number) => void;
  /** Called when the batch finishes or aborts (always pair with onBatchStart). */
  onBatchFinally?: () => void;
};

export const useBatchRecordActions = ({
  onComplete,
  onBatchStart,
  onProgress,
  onBatchFinally,
}: UseBatchRecordActionsParams) => {
  const { t } = useTranslation();
  const archiveRecord = useRecordStore((s) => s.archiveRecord);
  const unarchiveRecord = useRecordStore((s) => s.unarchiveRecord);
  const moveRecordToTrash = useRecordStore((s) => s.moveRecordToTrash);
  const purgeRecordPermanently = useRecordStore((s) => s.purgeRecordPermanently);
  const setRecordFolder = useRecordStore((s) => s.setRecordFolder);
  const [isGeneratingSharePdf, setIsGeneratingSharePdf] = useState(false);

  const batchArchive = useCallback(
    async (ids: string[]) => {
      const total = ids.length;
      if (total === 0) return;
      onBatchStart?.('archive', total);
      try {
        for (let i = 0; i < ids.length; i += 1) {
          await archiveRecord(ids[i]);
          onProgress?.(i + 1, total);
        }
        hapticSuccess();
        onComplete();
      } finally {
        onBatchFinally?.();
      }
    },
    [archiveRecord, onBatchFinally, onBatchStart, onComplete, onProgress],
  );

  const batchUnarchive = useCallback(
    async (ids: string[]) => {
      const total = ids.length;
      if (total === 0) return;
      onBatchStart?.('unarchive', total);
      try {
        for (let i = 0; i < ids.length; i += 1) {
          await unarchiveRecord(ids[i]);
          onProgress?.(i + 1, total);
        }
        hapticSuccess();
        onComplete();
      } finally {
        onBatchFinally?.();
      }
    },
    [onBatchFinally, onBatchStart, onComplete, onProgress, unarchiveRecord],
  );

  const batchDelete = useCallback(
    (ids: string[]) => {
      const total = ids.length;
      if (total === 0) return;
      Alert.alert(
        t('batch.deleteTitle', { count: total }),
        t('batch.deleteConfirm', { count: total }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('recordActions.moveToTrashConfirm'),
            style: 'destructive',
            onPress: async () => {
              onBatchStart?.('delete', total);
              try {
                for (let i = 0; i < ids.length; i += 1) {
                  await moveRecordToTrash(ids[i]);
                  onProgress?.(i + 1, total);
                }
                hapticSuccess();
                onComplete();
              } finally {
                onBatchFinally?.();
              }
            },
          },
        ],
      );
    },
    [t, moveRecordToTrash, onBatchFinally, onBatchStart, onComplete, onProgress],
  );

  const batchDeleteForever = useCallback(
    (ids: string[]) => {
      const total = ids.length;
      if (total === 0) return;
      Alert.alert(
        t('batch.deleteForeverTitle', { count: total }),
        t('batch.deleteForeverConfirm', { count: total }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('batch.deleteForeverConfirmAction'),
            style: 'destructive',
            onPress: async () => {
              onBatchStart?.('purgeForever', total);
              try {
                for (let i = 0; i < ids.length; i += 1) {
                  await purgeRecordPermanently(ids[i]!);
                  onProgress?.(i + 1, total);
                }
                hapticSuccess();
                onComplete();
              } finally {
                onBatchFinally?.();
              }
            },
          },
        ],
      );
    },
    [t, purgeRecordPermanently, onBatchFinally, onBatchStart, onComplete, onProgress],
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
        const content = buildBatchShareMarkdown(records, template);
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

      if (packaging === 'pdf') {
        const content = buildBatchShareMarkdown(records, template);
        const fileName = `voice-inbox-export-${timestamp}.pdf`;

        setIsGeneratingSharePdf(true);
        try {
          await shareMarkdownAsPdf({
            markdown: content,
            fileNameWithoutExtension: `voice-inbox-export-${timestamp}`,
            shareTitle: fileName,
          });
          hapticSuccess();
        } catch (err) {
          if (isUserCancelledShare(err)) {
            return;
          }
          hapticError();
          if (__DEV__) console.warn('[batchExport] pdf failed:', err);
          Alert.alert(t('common.error'), t('batch.exportFailed'));
        } finally {
          setIsGeneratingSharePdf(false);
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
    ): Promise<BatchEmailExportResult> => {
      if (records.length === 0) return {};

      const subject = batchEmailSubject(t, template, records.length);
      const title = t('share.emailBatchDocumentTitle', { count: records.length });

      let effectivePackaging = packaging;
      let autoZipFallback = false;

      if (effectivePackaging === 'single') {
        const markdown = buildBatchShareMarkdown(records, template, {
          ...resolveShareExportContext(),
          forEmail: true,
        });
        if (markdown.length > SHARE_EMAIL_MARKDOWN_MAX) {
          effectivePackaging = 'zip';
          autoZipFallback = true;
        } else {
          const result = await sendRecordEmail({
            to,
            subject,
            title,
            markdown,
          });
          if (!result.ok) {
            throw new Error(result.error);
          }
          return { autoZipFallback: false };
        }
      }

      if (effectivePackaging === 'pdf') {
        let pdfPath: string | undefined;
        try {
          const markdown = buildBatchShareMarkdown(records, template, {
            ...resolveShareExportContext(),
            forEmail: true,
          });
          const timestamp = Date.now();
          pdfPath = await writeShareMarkdownPdf(markdown, `voice-inbox-export-${timestamp}`);

          const stat = await NitroFS.stat(pdfPath);
          if (stat.size > SHARE_EMAIL_ZIP_MAX_BYTES) {
            throw new Error(t('batch.emailPdfTooLarge'));
          }

          const result = await sendShareEmailPdfAttachment({
            to,
            subject,
            title,
            bodyText: t('batch.emailPdfBodyPlain'),
            pdfAbsolutePath: pdfPath,
            pdfDisplayName: `voice-inbox-export-${timestamp}.pdf`,
          });

          if (!result.ok) {
            if (result.status === 413) {
              throw new Error(t('batch.emailPdfTooLarge'));
            }
            throw new Error(result.error);
          }
        } finally {
          if (pdfPath) {
            await unlinkIfExists(pdfPath);
          }
        }
        return { autoZipFallback: false };
      }

      if (effectivePackaging === 'zip') {
        let exportDir: string | undefined;
        let zipPath: string | undefined;
        try {
          const built = await buildBatchMarkdownZip(records, template, {
            ...resolveShareExportContext(),
            forEmail: true,
          });
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
        return { autoZipFallback };
      }

      return { autoZipFallback: false };
    },
    [t],
  );

  const batchMoveToFolder = useCallback(
    async (ids: string[], folderId: string | null) => {
      const total = ids.length;
      if (total === 0) return;
      onBatchStart?.('moveToFolder', total);
      try {
        for (let i = 0; i < ids.length; i += 1) {
          await setRecordFolder(ids[i], folderId);
          onProgress?.(i + 1, total);
        }
        hapticSuccess();
        onComplete();
      } finally {
        onBatchFinally?.();
      }
    },
    [onBatchFinally, onBatchStart, onComplete, onProgress, setRecordFolder],
  );

  return {
    batchArchive,
    batchUnarchive,
    batchDelete,
    batchDeleteForever,
    batchExport,
    batchEmailExport,
    batchMoveToFolder,
    isGeneratingSharePdf,
  };
};

function batchEmailSubject(
  t: (key: string, opts?: { count: number }) => string,
  template: ShareBriefTemplate,
  count: number,
): string {
  switch (template) {
    case 'meetingBrief':
      return t('share.emailBatchMeetingSubject', { count });
    case 'meetingSpeakerTurns':
      return t('share.emailBatchSpeakerTurnsSubject', { count });
    case 'emailBrief':
      return t('share.emailBatchEmailBriefSubject', { count });
    default:
      return t('share.emailBatchNoteSubject', { count });
  }
}
