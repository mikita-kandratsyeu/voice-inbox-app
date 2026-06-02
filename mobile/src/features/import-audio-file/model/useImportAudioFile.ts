import { types } from '@react-native-documents/picker';
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
import {
  getMaxRecordingMsForTier,
  shouldApplyAutoTranscribeOnSave,
} from '@/features/app-storefront';
import { useProEntitlement } from '@/features/pro-license';
import { isTranscriptionBlockedForRecord, useTranscription } from '@/features/transcription';
import { generateRecordId } from '@/screens/record/lib/generateRecordId';
import { getAutoTitle } from '@/screens/record/lib/getAutoTitle';
import { hapticError, hapticMedium, hapticSuccess } from '@/shared/lib';
import { convertToWav, getAudioDurationMs } from '@/shared/lib/audio';
import { formatTime } from '@/shared/lib/date';
import {
  copyExternalUriToCachesForImport,
  getReadableDocumentPickerFsPath,
  NitroFS,
  pickSingleFileToCachesDirectory,
} from '@/shared/lib/fs';
import { ensureRecordingsDir, RECORDINGS_DIR } from '@/shared/lib/recordings';

import type { ImportAudioPhase } from './types';

type PickedCopy = { localUri: string; name: string | null };

export function useImportAudioFile() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const addRecord = useRecordStore((s) => s.addRecord);
  const autoTranscribeOnSave = useSettingsStore((s) => s.autoTranscribeOnSave);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const { isProActive } = useProEntitlement();
  const maxImportMs = useMemo(
    () => getMaxRecordingMsForTier(isProActive, aiExecutionMode, privateAiProvider),
    [isProActive, aiExecutionMode, privateAiProvider],
  );
  const applyAutoTranscribe = shouldApplyAutoTranscribeOnSave(autoTranscribeOnSave, isProActive);
  const { startTranscription } = useTranscription();
  const [isImporting, setIsImporting] = useState(false);
  const [importPhase, setImportPhase] = useState<ImportAudioPhase | null>(null);

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
            Alert.alert(t('common.error'), t('importAudio.conversionError'));
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
          Alert.alert(t('common.error'), t('importAudio.importError'));
        }
      } finally {
        setIsImporting(false);
        setImportPhase(null);
      }
    },
    [t, addRecord, applyAutoTranscribe, maxImportMs, startTranscription, navigation],
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
        if (__DEV__) {
          console.warn('[importAudioFile] external uri', err);
        }
        hapticError();
        Alert.alert(t('common.error'), t('importAudio.importError'));
      }
    },
    [isImporting, t, runImportFromPickedCopy],
  );

  const importAudioFile = useCallback(async () => {
    if (isImporting) return;

    hapticMedium();

    try {
      const picked = await pickSingleFileToCachesDirectory({
        type: [
          types.audio,
          'audio/mpeg',
          'audio/mp3',
          'public.mp3',
          'audio/mp4',
          'audio/x-m4a',
          'audio/wav',
          'audio/x-wav',
        ],
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
      Alert.alert(t('common.error'), t('importAudio.importError'));
    }
  }, [isImporting, t, runImportFromPickedCopy]);

  return { importAudioFile, importAudioFromExternalUri, isImporting, importPhase };
}
