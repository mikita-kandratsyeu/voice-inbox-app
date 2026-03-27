import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import DocumentPicker from 'react-native-document-picker';

import type { RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import {
  getMaxRecordingMsForTier,
  shouldApplyAutoTranscribeOnSave,
} from '@/features/app-storefront';
import { useProEntitlement } from '@/features/pro-license';
import { useTranscription } from '@/features/transcription';
import { generateRecordId } from '@/screens/record/lib/generateRecordId';
import { getAutoTitle } from '@/screens/record/lib/getAutoTitle';
import { hapticError, hapticMedium, hapticSuccess } from '@/shared/lib';
import { convertToWav, getAudioDurationMs } from '@/shared/lib/audio';
import { formatTime } from '@/shared/lib/date';
import { getReadableDocumentPickerFsPath, NitroFS } from '@/shared/lib/fs';
import { ensureRecordingsDir, RECORDINGS_DIR } from '@/shared/lib/recordings';

import type { ImportAudioPhase } from './types';

export function useImportAudioFile() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const addRecord = useRecordStore((s) => s.addRecord);
  const autoTranscribeOnSave = useSettingsStore((s) => s.autoTranscribeOnSave);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const { isProActive } = useProEntitlement();
  const maxImportMs = useMemo(
    () => getMaxRecordingMsForTier(isProActive, aiExecutionMode),
    [isProActive, aiExecutionMode],
  );
  const applyAutoTranscribe = shouldApplyAutoTranscribeOnSave(autoTranscribeOnSave, isProActive);
  const { startTranscription } = useTranscription();
  const [isImporting, setIsImporting] = useState(false);
  const [importPhase, setImportPhase] = useState<ImportAudioPhase | null>(null);

  const importAudioFile = useCallback(async () => {
    if (isImporting) return;

    hapticMedium();

    try {
      const [file] = await DocumentPicker.pick({
        type: [
          DocumentPicker.types.audio,
          'audio/mpeg',
          'audio/mp3',
          'public.mp3',
          'audio/mp4',
          'audio/x-m4a',
          'audio/wav',
          'audio/x-wav',
        ],
        copyTo: 'cachesDirectory',
      });

      const sourcePath = await getReadableDocumentPickerFsPath(
        file as { uri?: string; fileUri?: string; fileCopyUri?: string },
      );
      if (!sourcePath) {
        if (__DEV__) {
          const pickerFile = file as { uri?: string; fileUri?: string; fileCopyUri?: string };
          console.warn('[importAudioFile] picker path is not readable', {
            uri: pickerFile.uri,
            fileUri: pickerFile.fileUri,
            fileCopyUri: pickerFile.fileCopyUri,
          });
        }
        return;
      }

      setImportPhase('copying');
      setIsImporting(true);

      const normalizedSource = sourcePath;

      await ensureRecordingsDir();
      const recordId = generateRecordId();
      const ext = file.name?.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? '.m4a';
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
        durationMs = maxImportMs;
        if (__DEV__) {
          console.warn('[importAudioFile] Could not get duration, using max');
        }
      }

      if (durationMs > maxImportMs) {
        hapticError();
        Alert.alert(
          t('importAudio.maxDurationTitle'),
          t('importAudio.maxDurationMessage', { max: maxImportMs / (60 * 1000) }),
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
        startTranscription(record);
      }

      navigation.navigate('RecordingDetail', { record });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'DOCUMENT_PICKER_CANCELED' || code === 'E_DOCUMENT_PICKER_CANCELED') {
        return;
      }
      if (__DEV__) {
        console.warn('[importAudioFile]', err);
      }
      hapticError();
      Alert.alert(t('common.error'), t('importAudio.importError'));
    } finally {
      setIsImporting(false);
      setImportPhase(null);
    }
  }, [isImporting, t, addRecord, applyAutoTranscribe, maxImportMs, startTranscription, navigation]);

  return { importAudioFile, isImporting, importPhase };
}
