import { types } from '@react-native-documents/picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, InteractionManager } from 'react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { dispatchAutoAiAfterTranscription } from '@/features/ai-task-queue';
import {
  getMaxRecordingMsForTier,
  shouldApplyAutoTranscribeOnSave,
} from '@/features/app-storefront';
import { generateAndSaveEmbeddingForRecord } from '@/features/embedding-generation';
import { useProEntitlement } from '@/features/pro-license';
import {
  notifyAutoTranscriptionTooShort,
  tryScheduleAutoTranscription,
  useTranscription,
} from '@/features/transcription';
import { generateRecordId } from '@/screens/record/lib/generateRecordId';
import { getAutoTitle } from '@/screens/record/lib/getAutoTitle';
import { hapticError, hapticMedium, IS_IOS, useNetworkStatus } from '@/shared/lib';
import { diagWarn } from '@/shared/lib/appLogger';
import { convertToWav, getAudioDurationMs } from '@/shared/lib/audio';
import { formatTime } from '@/shared/lib/date';
import { extractPdfText } from '@/shared/lib/document';
import {
  copyExternalUriToCachesForImport,
  getReadableDocumentPickerFsPath,
  NitroFS,
  pickSingleFileToCachesDirectory,
} from '@/shared/lib/fs';
import { ensureRecordingsDir, RECORDINGS_DIR } from '@/shared/lib/recordings';

import {
  isDocumentImportFileName,
  isPdfImportFileName,
  isPlainTextImportFileName,
  MAX_DOCUMENT_IMPORT_CHARS,
  type ParsedDocumentImport,
  parseDocumentImport,
} from '../lib/documentImport';
import {
  isSubtitleImportFileName,
  looksLikeSubtitleContent,
  type ParsedSubtitleImport,
  parseSubtitleImport,
} from '../lib/subtitleImport';
import type { ImportFileConfirmOptions } from '../ui/ImportSubtitleConfirmSheet';
import type { ImportAudioPhase } from './types';

type PickedCopy = { localUri: string; name: string | null };

type PendingSubtitleImport = {
  kind: 'subtitles';
  parsed: ParsedSubtitleImport;
  defaultTitle: string;
};

type PendingDocumentImport = {
  kind: 'document';
  parsed: ParsedDocumentImport;
  defaultTitle: string;
};

type PendingAudioImport = {
  kind: 'audio';
  record: VoiceRecord;
};

type PendingFileImport = PendingAudioImport | PendingDocumentImport | PendingSubtitleImport;

const FALLBACK_SHARED_IMPORT_NAME = 'shared-import';
const AUDIO_PICKER_TYPES = [
  types.audio,
  'audio/mpeg',
  'audio/mp3',
  'public.mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
  'audio/flac',
  'audio/ogg',
  'audio/opus',
  'audio/webm',
  'audio/amr',
  'audio/3gpp',
  'audio/x-caf',
  'audio/aiff',
] as const;

const IOS_AUDIO_PICKER_TYPES = IS_IOS
  ? (['public.mpeg-4-audio', 'public.wav'] as const)
  : ([] as const);

const DOCUMENT_PICKER_TYPES = [
  'text/markdown',
  'text/x-markdown',
  'application/pdf',
  'public.markdown',
  'public.plain-text',
  'com.adobe.pdf',
] as const;

const IOS_DOCUMENT_PICKER_TYPES = IS_IOS
  ? (['net.daringfireball.markdown', 'public.pdf'] as const)
  : ([] as const);

const SUBTITLE_PICKER_TYPES = [
  types.plainText,
  'text/plain',
  'text/srt',
  'application/srt',
  'application/x-subrip',
  'text/vtt',
  'text/webvtt',
  'public.text',
  'public.plain-text',
  'public.utf8-plain-text',
  'public.srt',
  'public.subrip',
  'public.subtitle',
  'com.apple.quicktime.srt',
  'org.videolan.srt',
] as const;

const IOS_PICKER_FALLBACK_TYPES = IS_IOS ? ([types.allFiles] as const) : [];

function stripFileScheme(uri: string): string {
  return uri.startsWith('file://') ? uri.slice(7) : uri;
}

function fallbackNameFromUri(uri: string): string {
  try {
    return decodeURIComponent(new URL(uri).pathname.split('/').pop() ?? '');
  } catch {
    return '';
  }
}

function titleFromFileName(name: string | null): string {
  const raw = name?.trim();
  if (!raw) return getAutoTitle();
  const withoutExt = raw.replace(/\.[^.]+$/, '').trim();
  return withoutExt.length > 0 ? withoutExt : getAutoTitle();
}

function fileNameForCopy(name: string | null): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  return `${FALLBACK_SHARED_IMPORT_NAME}.m4a`;
}

function waitForImportOverlayPaint(): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

async function readTextFile(path: string): Promise<string> {
  const normalized = stripFileScheme(path);
  try {
    return await NitroFS.readFile(normalized, 'utf8');
  } catch {
    return NitroFS.readFile(`file://${normalized}`, 'utf8');
  }
}

async function loadImportTextSource(
  path: string,
  fileLabel: string,
  language?: string | null,
  onPdfProgress?: (progress: { current: number; total: number }) => void,
): Promise<string | null> {
  if (isPdfImportFileName(fileLabel) || isPdfImportFileName(path)) {
    return extractPdfText(path, language, onPdfProgress);
  }
  return readTextFile(path);
}

function tryParseSubtitleImportFromText(
  rawText: string,
  fileLabel: string,
): ParsedSubtitleImport | null {
  const contentLooksSubtitle = looksLikeSubtitleContent(rawText);
  if (!contentLooksSubtitle && !isSubtitleImportFileName(fileLabel)) {
    return null;
  }
  return parseSubtitleImport(rawText);
}

export function useImportAudioFile() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const addRecord = useRecordStore((s) => s.addRecord);
  const autoTranscribeOnSave = useSettingsStore((s) => s.autoTranscribeOnSave);
  const autoAiAfterTranscription = useSettingsStore((s) => s.autoAiAfterTranscription);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const { isProActive } = useProEntitlement();
  const { isConnected } = useNetworkStatus();
  const maxImportMs = useMemo(
    () => getMaxRecordingMsForTier(isProActive, aiExecutionMode, privateAiProvider),
    [isProActive, aiExecutionMode, privateAiProvider],
  );
  const applyAutoTranscribe = shouldApplyAutoTranscribeOnSave(
    autoTranscribeOnSave,
    isProActive,
    aiExecutionMode,
  );
  const { startTranscription } = useTranscription();
  const [isImporting, setIsImporting] = useState(false);
  const [importPhase, setImportPhase] = useState<ImportAudioPhase | null>(null);
  const [documentImportProgress, setDocumentImportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [pendingFileImport, setPendingFileImport] = useState<PendingFileImport | null>(null);

  const createSubtitleRecord = useCallback(
    async (parsed: ParsedSubtitleImport, options: ImportFileConfirmOptions) => {
      const durationMs = Math.max(1000, Math.round(parsed.durationMs));
      const durationSec = Math.max(1, Math.floor(durationMs / 1000));
      const record: VoiceRecord = {
        id: generateRecordId(),
        title: options.title,
        transcript: parsed.transcript,
        transcriptSegments: parsed.segments,
        summary: '',
        tasks: [],
        duration: formatTime(durationSec),
        durationMs,
        createdAt: dayjs().toISOString(),
        status: 'unread',
        aiStatus: 'done',
        transcriptProgress: 100,
        isPinned: false,
        tags: [],
        classification: options.isMeetingMode ? 'meeting' : undefined,
      };

      await addRecord(record);
      generateAndSaveEmbeddingForRecord(record).catch(() => {});

      void dispatchAutoAiAfterTranscription({
        record,
        autoAiAfterTranscription,
        isProActive,
        isConnected: isConnected === true,
        aiExecutionMode,
        privateAiProvider,
      }).catch(() => {});

      navigation.navigate('RecordingDetail', { record });
    },
    [
      addRecord,
      aiExecutionMode,
      autoAiAfterTranscription,
      isConnected,
      isProActive,
      navigation,
      privateAiProvider,
    ],
  );

  const createDocumentRecord = useCallback(
    async (parsed: ParsedDocumentImport, options: ImportFileConfirmOptions) => {
      const record: VoiceRecord = {
        id: generateRecordId(),
        title: options.title,
        transcript: parsed.transcript,
        transcriptSegments: [],
        summary: '',
        tasks: [],
        duration: '00:00',
        durationMs: 0,
        createdAt: dayjs().toISOString(),
        status: 'unread',
        aiStatus: 'done',
        transcriptProgress: 100,
        isPinned: false,
        tags: [],
        classification: options.isMeetingMode ? 'meeting' : undefined,
      };

      await addRecord(record);
      generateAndSaveEmbeddingForRecord(record).catch(() => {});

      void dispatchAutoAiAfterTranscription({
        record,
        autoAiAfterTranscription,
        isProActive,
        isConnected: isConnected === true,
        aiExecutionMode,
        privateAiProvider,
      }).catch(() => {});

      navigation.navigate('RecordingDetail', { record });
    },
    [
      addRecord,
      aiExecutionMode,
      autoAiAfterTranscription,
      isConnected,
      isProActive,
      navigation,
      privateAiProvider,
    ],
  );

  const confirmFileImport = useCallback(
    async (options: ImportFileConfirmOptions) => {
      const pending = pendingFileImport;
      if (!pending) return;

      setPendingFileImport(null);

      if (pending.kind === 'subtitles') {
        await createSubtitleRecord(pending.parsed, options);
        return;
      }

      if (pending.kind === 'document') {
        await createDocumentRecord(pending.parsed, options);
        return;
      }

      const record: VoiceRecord = {
        ...pending.record,
        title: options.title,
        classification: options.isMeetingMode ? 'meeting' : undefined,
      };

      await addRecord(record);

      if (applyAutoTranscribe) {
        const scheduleResult = tryScheduleAutoTranscription(
          record,
          useRecordStore.getState().records,
          (nextRecord) => startTranscription(nextRecord, undefined, { enforceMinDuration: true }),
          record,
        );
        if (scheduleResult === 'too_short') {
          notifyAutoTranscriptionTooShort();
        }
      }

      navigation.navigate('RecordingDetail', { record });
    },
    [
      addRecord,
      applyAutoTranscribe,
      createDocumentRecord,
      createSubtitleRecord,
      navigation,
      pendingFileImport,
      startTranscription,
    ],
  );

  const cancelFileImport = useCallback(() => {
    const pending = pendingFileImport;
    setPendingFileImport(null);

    if (pending?.kind === 'audio' && pending.record.audioPath) {
      NitroFS.unlink(pending.record.audioPath).catch(() => {
        diagWarn('[importAudioFile] Could not delete canceled import file');
      });
    }
  }, [pendingFileImport]);

  const runImportFromPickedCopy = useCallback(
    async (picked: PickedCopy) => {
      setImportPhase('copying');
      setIsImporting(true);

      try {
        const fileRef = {
          uri: picked.localUri,
          fileUri: picked.localUri,
          fileCopyUri: picked.localUri,
        };
        const sourcePath = await getReadableDocumentPickerFsPath(fileRef);
        if (!sourcePath) {
          diagWarn('[importAudioFile] path is not readable', {
            uri: fileRef.uri,
            fileUri: fileRef.fileUri,
            fileCopyUri: fileRef.fileCopyUri,
          });
          return;
        }

        const normalizedSource = sourcePath;
        const fileLabel = picked.name ?? normalizedSource;
        const isDocumentByName =
          isDocumentImportFileName(fileLabel) || isDocumentImportFileName(normalizedSource);
        const isPlainTextByName =
          isPlainTextImportFileName(fileLabel) || isPlainTextImportFileName(normalizedSource);

        if (isDocumentByName || isPlainTextByName) {
          setImportPhase('parsing_document');
          setDocumentImportProgress(null);
          const rawText = await loadImportTextSource(
            normalizedSource,
            fileLabel,
            i18n.language,
            setDocumentImportProgress,
          );
          if (!rawText?.trim()) {
            hapticError();
            if (isPdfImportFileName(fileLabel) || isPdfImportFileName(normalizedSource)) {
              Alert.alert(t('importAudio.pdfImportErrorTitle'), t('importAudio.pdfImportError'));
            } else {
              Alert.alert(t('common.error'), t('importAudio.documentImportError'));
            }
            return;
          }

          const subtitleParsed = tryParseSubtitleImportFromText(rawText, fileLabel);
          if (subtitleParsed) {
            if (subtitleParsed.durationMs > maxImportMs) {
              hapticError();
              Alert.alert(
                t('importAudio.maxDurationTitle'),
                t('importAudio.maxDurationMessage', {
                  max: Math.round(maxImportMs / (60 * 1000)),
                }),
                [{ text: t('common.ok') }],
              );
              return;
            }

            setPendingFileImport({
              kind: 'subtitles',
              parsed: subtitleParsed,
              defaultTitle: titleFromFileName(picked.name),
            });
            return;
          }

          const documentParsed = parseDocumentImport(rawText);
          if (!documentParsed) {
            hapticError();
            if (rawText.trim().length > MAX_DOCUMENT_IMPORT_CHARS) {
              Alert.alert(
                t('importAudio.documentTooLargeTitle'),
                t('importAudio.documentTooLargeMessage', {
                  max: Math.round(MAX_DOCUMENT_IMPORT_CHARS / 1000),
                }),
                [{ text: t('common.ok') }],
              );
            } else {
              Alert.alert(t('common.error'), t('importAudio.documentImportError'));
            }
            return;
          }

          setPendingFileImport({
            kind: 'document',
            parsed: documentParsed,
            defaultTitle: titleFromFileName(picked.name),
          });
          return;
        }

        const shouldTrySubtitleImport =
          isSubtitleImportFileName(fileLabel) || isSubtitleImportFileName(normalizedSource);
        if (shouldTrySubtitleImport) {
          setImportPhase('parsing_subtitles');
          const rawText = await readTextFile(normalizedSource);
          const parsed = tryParseSubtitleImportFromText(rawText, fileLabel);

          if (!parsed) {
            hapticError();
            Alert.alert(
              t('importAudio.subtitleImportErrorTitle'),
              t('importAudio.subtitleImportError'),
            );
            return;
          }

          if (parsed.durationMs > maxImportMs) {
            hapticError();
            Alert.alert(
              t('importAudio.maxDurationTitle'),
              t('importAudio.maxDurationMessage', {
                max: Math.round(maxImportMs / (60 * 1000)),
              }),
              [{ text: t('common.ok') }],
            );
            return;
          }

          setPendingFileImport({
            kind: 'subtitles',
            parsed,
            defaultTitle: titleFromFileName(picked.name),
          });
          return;
        }

        await ensureRecordingsDir();
        const recordId = generateRecordId();
        const ext = picked.name?.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? '.m4a';
        let destPath = `${RECORDINGS_DIR}/${recordId}${ext}`;

        try {
          await NitroFS.copyFile(normalizedSource, destPath);
        } catch {
          hapticError();
          Alert.alert(t('common.error'), t('importAudio.importError'));
          return;
        }

        const needsConversion = !/\.wav$/i.test(ext);
        if (needsConversion) {
          setImportPhase('converting');
          const wavPath = `${RECORDINGS_DIR}/${recordId}.wav`;
          const converted = await convertToWav(destPath, wavPath);
          if (converted === null) {
            hapticError();
            Alert.alert(t('common.error'), t('importAudio.conversionError'));
            try {
              if (destPath !== normalizedSource) await NitroFS.unlink(destPath);
            } catch {
              diagWarn('[importAudioFile] Could not delete original file');
            }
            return;
          }
          try {
            if (destPath !== normalizedSource) await NitroFS.unlink(destPath);
          } catch {
            diagWarn('[importAudioFile] Could not delete original file');
          }
          destPath = converted;
        }

        setImportPhase('analyzing');
        let durationMs: number | null = null;
        try {
          durationMs = await getAudioDurationMs(destPath);
        } catch {
          diagWarn('[importAudioFile] getAudioDurationMs failed');
        }
        if (durationMs == null || durationMs <= 0) {
          hapticError();
          const maxMinutes = Math.round(maxImportMs / (60 * 1000));
          Alert.alert(
            t('importAudio.durationUnknownTitle'),
            t('importAudio.durationUnknownMessage', { max: maxMinutes }),
            [{ text: t('common.ok') }],
          );
          try {
            await NitroFS.unlink(destPath);
          } catch {
            diagWarn('[importAudioFile] Could not delete file after unknown duration');
          }
          return;
        }

        if (durationMs > maxImportMs) {
          hapticError();
          Alert.alert(
            t('importAudio.maxDurationTitle'),
            t('importAudio.maxDurationMessage', {
              max: Math.round(maxImportMs / (60 * 1000)),
            }),
            [{ text: t('common.ok') }],
          );
          try {
            await NitroFS.unlink(destPath);
          } catch {
            diagWarn('[importAudioFile] Could not delete original file');
          }
          return;
        }

        const durationSec = Math.floor(durationMs / 1000);
        const record: VoiceRecord = {
          id: recordId,
          title: titleFromFileName(picked.name),
          transcript: '',
          transcriptSegments: [],
          summary: '',
          tasks: [],
          duration: formatTime(durationSec),
          durationMs: Math.round(durationMs),
          createdAt: dayjs().toISOString(),
          status: 'unread',
          aiStatus: 'idle',
          transcriptProgress: 0,
          isPinned: false,
          tags: [],
          audioPath: destPath,
        };

        setPendingFileImport({ kind: 'audio', record });
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code !== 'OPERATION_CANCELED') {
          diagWarn('[importAudioFile] pipeline', err);
          hapticError();
          Alert.alert(t('common.error'), t('importAudio.importError'));
        }
      } finally {
        setIsImporting(false);
        setImportPhase(null);
        setDocumentImportProgress(null);
      }
    },
    [t, maxImportMs, i18n.language],
  );

  const importAudioFromExternalUri = useCallback(
    async (uri: string, suggestedName: string | null) => {
      if (isImporting || pendingFileImport) return;

      hapticMedium();
      setImportPhase('copying');
      setIsImporting(true);

      try {
        const trimmed = uri.trim();
        const fallbackName = suggestedName?.trim() || fallbackNameFromUri(trimmed);

        const copyResult = await copyExternalUriToCachesForImport(
          trimmed,
          fileNameForCopy(fallbackName),
        );
        if (copyResult.kind === 'failed') {
          diagWarn('[importAudioFile] keepLocalCopy failed', copyResult.message);
          hapticError();
          Alert.alert(t('common.error'), t('importAudio.importError'));
          return;
        }
        if (copyResult.kind !== 'picked') {
          return;
        }

        await runImportFromPickedCopy({
          localUri: copyResult.localUri,
          name: copyResult.name,
        });
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code === 'OPERATION_CANCELED') {
          return;
        }
        diagWarn('[importAudioFile] external uri', err);
        hapticError();
        Alert.alert(t('common.error'), t('importAudio.importError'));
      } finally {
        setIsImporting(false);
        setImportPhase(null);
        setDocumentImportProgress(null);
      }
    },
    [isImporting, pendingFileImport, t, runImportFromPickedCopy],
  );

  const importAudioFile = useCallback(async () => {
    if (isImporting || pendingFileImport) {
      return;
    }

    hapticMedium();
    setIsImporting(true);
    setImportPhase('preparing');

    let importPipelineStarted = false;
    try {
      await waitForImportOverlayPaint();

      const picked = await pickSingleFileToCachesDirectory({
        type: [
          ...AUDIO_PICKER_TYPES,
          ...IOS_AUDIO_PICKER_TYPES,
          ...DOCUMENT_PICKER_TYPES,
          ...IOS_DOCUMENT_PICKER_TYPES,
          ...SUBTITLE_PICKER_TYPES,
          ...IOS_PICKER_FALLBACK_TYPES,
        ],
      });

      if (picked.kind === 'canceled') {
        return;
      }
      if (picked.kind === 'failed') {
        diagWarn('[importAudioFile] pick/copy failed', picked.message);
        hapticError();
        Alert.alert(t('common.error'), picked.message || t('importAudio.importError'));
        return;
      }

      importPipelineStarted = true;
      await runImportFromPickedCopy({
        localUri: picked.localUri,
        name: picked.name,
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'OPERATION_CANCELED') {
        return;
      }
      diagWarn('[importAudioFile]', err);
      hapticError();
      Alert.alert(t('common.error'), t('importAudio.importError'));
    } finally {
      if (!importPipelineStarted) {
        setIsImporting(false);
        setImportPhase(null);
        setDocumentImportProgress(null);
      }
    }
  }, [isImporting, pendingFileImport, t, runImportFromPickedCopy]);

  return {
    importAudioFile,
    importAudioFromExternalUri,
    isImporting,
    importPhase,
    documentImportProgress,
    subtitleImportConfirm: {
      visible: pendingFileImport !== null,
      kind: pendingFileImport?.kind ?? 'subtitles',
      defaultTitle:
        pendingFileImport?.kind === 'audio'
          ? pendingFileImport.record.title
          : (pendingFileImport?.defaultTitle ?? ''),
      durationMs:
        pendingFileImport?.kind === 'audio'
          ? (pendingFileImport.record.durationMs ?? 1000)
          : pendingFileImport?.kind === 'subtitles'
            ? (pendingFileImport.parsed.durationMs ?? 1000)
            : 0,
      documentCharCount:
        pendingFileImport?.kind === 'document' ? pendingFileImport.parsed.charCount : 0,
      onConfirm: confirmFileImport,
      onCancel: cancelFileImport,
    },
  };
}
