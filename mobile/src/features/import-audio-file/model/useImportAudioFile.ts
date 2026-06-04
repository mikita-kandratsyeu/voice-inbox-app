import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import type { RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { useAiProcessing } from '@/features/ai-processing';
import {
  getMaxRecordingMsForTier,
  shouldApplyAutoAiAfterTranscription,
  shouldApplyAutoTranscribeOnSave,
} from '@/features/app-storefront';
import { generateAndSaveEmbeddingForRecord } from '@/features/embedding-generation';
import { useProEntitlement } from '@/features/pro-license';
import { isTranscriptionBlockedForRecord, useTranscription } from '@/features/transcription';
import { generateRecordId } from '@/screens/record/lib/generateRecordId';
import { getAutoTitle } from '@/screens/record/lib/getAutoTitle';
import { hapticError, hapticMedium, hapticSuccess, useNetworkStatus } from '@/shared/lib';
import { convertToWav, getAudioDurationMs } from '@/shared/lib/audio';
import { formatTime } from '@/shared/lib/date';
import {
  copyExternalUriToCachesForImport,
  getReadableDocumentPickerFsPath,
  NitroFS,
  pickSingleFileToCachesDirectory,
} from '@/shared/lib/fs';
import { ensureRecordingsDir, RECORDINGS_DIR } from '@/shared/lib/recordings';

import { getImportMediaPickerTypes } from '../lib/getImportMediaPickerTypes';
import { isAudioImportFileName } from '../lib/isAudioImportFileName';
import { isSubtitleImportFileName } from '../lib/isSubtitleImportFile';
import { parseSubtitleFile } from '../lib/parseSubtitleFile';
import type { ImportAudioPhase } from './types';

type PickedCopy = { localUri: string; name: string | null };

export function useImportAudioFile() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const addRecord = useRecordStore((s) => s.addRecord);
  const autoTranscribeOnSave = useSettingsStore((s) => s.autoTranscribeOnSave);
  const autoAiAfterTranscription = useSettingsStore((s) => s.autoAiAfterTranscription);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const { isProActive } = useProEntitlement();
  const { isConnected } = useNetworkStatus();
  const { processRecord } = useAiProcessing();
  const maxImportMs = useMemo(
    () => getMaxRecordingMsForTier(isProActive, aiExecutionMode, privateAiProvider),
    [isProActive, aiExecutionMode, privateAiProvider],
  );
  const applyAutoTranscribe = shouldApplyAutoTranscribeOnSave(autoTranscribeOnSave, isProActive);
  const applyAutoAi = shouldApplyAutoAiAfterTranscription(autoAiAfterTranscription, isProActive);
  const { startTranscription } = useTranscription();
  const [isImporting, setIsImporting] = useState(false);
  const [importPhase, setImportPhase] = useState<ImportAudioPhase | null>(null);
  const [pendingSubtitleImport, setPendingSubtitleImport] = useState<PendingSubtitleImport | null>(
    null,
  );
  const [subtitleConfirmVisible, setSubtitleConfirmVisible] = useState(false);

  const titleFromFileName = useCallback((name: string | null | undefined): string => {
    const base = name?.replace(/\.[^.]+$/, '')?.trim();
    return base && base.length > 0 ? base : getAutoTitle();
  }, []);

  const runSubtitleImportFromPath = useCallback(
    async (sourcePath: string, picked: PickedCopy) => {
      setImportPhase('reading');
      setIsImporting(true);

      let raw: string;
      try {
        raw = await NitroFS.readFile(sourcePath, 'utf8');
      } catch {
        hapticError();
        Alert.alert(t('importAudio.subtitleReadErrorTitle'), t('importAudio.subtitleReadError'));
        return;
      }

      const parsed = parseSubtitleFile(raw, picked.name);
      if (!parsed) {
        hapticError();
        Alert.alert(t('importAudio.subtitleInvalidTitle'), t('importAudio.subtitleInvalid'));
        return;
      }

      const { transcript, segments, durationMs } = parsed;
      if (durationMs > maxImportMs) {
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

      setPendingSubtitleImport({
        transcript,
        transcriptSegments: segments,
        durationMs,
        defaultTitle: titleFromFileName(picked.name),
      });
      setSubtitleConfirmVisible(true);
    },
    [t, maxImportMs, titleFromFileName],
  );

  const cancelSubtitleImport = useCallback(() => {
    setSubtitleConfirmVisible(false);
    setPendingSubtitleImport(null);
  }, []);

  const confirmSubtitleImport = useCallback(
    async ({ title, isMeetingMode }: SubtitleImportConfirmOptions) => {
      const pending = pendingSubtitleImport;
      if (!pending) return;

      setSubtitleConfirmVisible(false);
      setPendingSubtitleImport(null);

      const durationSec = Math.max(1, Math.floor(pending.durationMs / 1000));
      const recordId = generateRecordId();
      const record: VoiceRecord = {
        id: recordId,
        title: title.trim() || pending.defaultTitle,
        transcript: pending.transcript,
        transcriptSegments: pending.transcriptSegments,
        summary: '',
        tasks: [],
        duration: formatTime(durationSec),
        durationMs: Math.round(pending.durationMs),
        createdAt: dayjs().toISOString(),
        status: 'unread',
        aiStatus: 'idle',
        transcriptProgress: 0,
        isPinned: false,
        tags: [],
        classification: isMeetingMode && isProActive ? 'meeting' : undefined,
        audioPath: '',
      };

      await addRecord(record);
      hapticSuccess();
      generateAndSaveEmbeddingForRecord(record).catch(() => {});

      if (applyAutoAi && isConnected) {
        void processRecord(record).catch(() => {});
      }

      navigation.navigate('RecordingDetail', { record });
    },
    [
      pendingSubtitleImport,
      isProActive,
      addRecord,
      applyAutoAi,
      isConnected,
      processRecord,
      navigation,
    ],
  );

  const runImportFromPickedCopy = useCallback(
    async (picked: PickedCopy) => {
      try {
        const fileRef = {
          uri: picked.localUri,
          fileUri: picked.localUri,
          fileCopyUri: picked.localUri,
        };
        const sourcePath = await getReadableDocumentPickerFsPath(fileRef);
        if (!sourcePath) {
          if (__DEV__) {
            console.warn('[importAudioFile] path is not readable', {
              uri: fileRef.uri,
              fileUri: fileRef.fileUri,
              fileCopyUri: fileRef.fileCopyUri,
            });
          }
          return;
        }

        if (isSubtitleImportFileName(picked.name)) {
          await runSubtitleImportFromPath(sourcePath, picked);
          return;
        }

        if (!isAudioImportFileName(picked.name)) {
          hapticError();
          Alert.alert(t('importAudio.unsupportedFormatTitle'), t('importAudio.unsupportedFormat'));
          return;
        }

        setImportPhase('copying');
        setIsImporting(true);

        const normalizedSource = sourcePath;

        await ensureRecordingsDir();
        const recordId = generateRecordId();
        const ext = picked.name?.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? '.m4a';
        let destPath = `${RECORDINGS_DIR}/${recordId}${ext}`;

        try {
          await NitroFS.copyFile(normalizedSource, destPath);
        } catch {
          destPath = normalizedSource;
        }

        const needsConversion = !/\.wav$/i.test(ext);
        if (needsConversion) {
          setImportPhase('converting');
          const wavPath = `${RECORDINGS_DIR}/${recordId}.wav`;
          const converted = await convertToWav(destPath, wavPath);
          if (converted === null) {
            hapticError();
            Alert.alert(t('importAudio.conversionErrorTitle'), t('importAudio.conversionError'));
            try {
              if (destPath !== normalizedSource) await NitroFS.unlink(destPath);
            } catch {
              if (__DEV__) {
                console.warn('[importAudioFile] Could not delete original file');
              }
            }
            return;
          }
          try {
            if (destPath !== normalizedSource) await NitroFS.unlink(destPath);
          } catch {
            if (__DEV__) {
              console.warn('[importAudioFile] Could not delete original file');
            }
          }
          destPath = converted;
        }

        setImportPhase('analyzing');
        let durationMs: number | null = null;
        try {
          durationMs = await getAudioDurationMs(destPath);
        } catch {
          if (__DEV__) {
            console.warn('[importAudioFile] getAudioDurationMs failed');
          }
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
            if (__DEV__) {
              console.warn('[importAudioFile] Could not delete file after unknown duration');
            }
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
            if (__DEV__) {
              console.warn('[importAudioFile] Could not delete original file');
            }
          }
          return;
        }

        const durationSec = Math.floor(durationMs / 1000);
        const record: VoiceRecord = {
          id: recordId,
          title: getAutoTitle(),
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

        await addRecord(record);
        hapticSuccess();

        if (applyAutoTranscribe) {
          const records = useRecordStore.getState().records;
          if (!isTranscriptionBlockedForRecord(record.id, records)) {
            startTranscription(record);
          }
        }

        navigation.navigate('RecordingDetail', { record });
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code;
        if (code !== 'OPERATION_CANCELED') {
          if (__DEV__) {
            console.warn('[importAudioFile] pipeline', err);
          }
          hapticError();
          Alert.alert(t('importAudio.importErrorTitle'), t('importAudio.importError'));
        }
      } finally {
        setIsImporting(false);
        setImportPhase(null);
      }
    },
    [
      t,
      addRecord,
      applyAutoTranscribe,
      maxImportMs,
      startTranscription,
      navigation,
      runSubtitleImportFromPath,
    ],
  );

  const importAudioFromExternalUri = useCallback(
    async (uri: string, suggestedName: string | null) => {
      if (isImporting) return;

      hapticMedium();

      try {
        const trimmed = uri.trim();
        const fallbackName =
          suggestedName?.trim() ||
          (() => {
            try {
              return decodeURIComponent(new URL(trimmed).pathname.split('/').pop() ?? '');
            } catch {
              return '';
            }
          })() ||
          'shared-audio.m4a';

        const copyResult = await copyExternalUriToCachesForImport(trimmed, fallbackName);
        if (copyResult.kind === 'failed') {
          if (__DEV__) {
            console.warn('[importAudioFile] keepLocalCopy failed', copyResult.message);
          }
          hapticError();
          Alert.alert(t('importAudio.importErrorTitle'), t('importAudio.importError'));
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
        if (__DEV__) {
          console.warn('[importAudioFile] external uri', err);
        }
        hapticError();
        Alert.alert(t('importAudio.importErrorTitle'), t('importAudio.importError'));
      }
    },
    [isImporting, t, runImportFromPickedCopy],
  );

  const importAudioFile = useCallback(async () => {
    if (isImporting) return;

    hapticMedium();

    try {
      const picked = await pickSingleFileToCachesDirectory({
        type: getImportMediaPickerTypes(),
      });

      if (picked.kind === 'canceled') return;
      if (picked.kind === 'failed') {
        if (__DEV__) {
          console.warn('[importAudioFile] pick/copy failed', picked.message);
        }
        return;
      }

      await runImportFromPickedCopy({
        localUri: picked.localUri,
        name: picked.name,
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'OPERATION_CANCELED') {
        return;
      }
      if (__DEV__) {
        console.warn('[importAudioFile]', err);
      }
      hapticError();
      Alert.alert(t('importAudio.importErrorTitle'), t('importAudio.importError'));
    }
  }, [isImporting, t, runImportFromPickedCopy]);

  return {
    importAudioFile,
    importAudioFromExternalUri,
    isImporting,
    importPhase,
    subtitleConfirmVisible,
    pendingSubtitleImport,
    confirmSubtitleImport,
    cancelSubtitleImport,
  };
}
