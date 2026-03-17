import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';

import type { RootStackParamList } from '@/app/navigation/types';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { useTranscription } from '@/features/transcription';
import { MAX_RECORDING_MS } from '@/screens/record/config';
import { generateRecordId } from '@/screens/record/lib/generateRecordId';
import { getAutoTitle } from '@/screens/record/lib/getAutoTitle';
import { hapticMedium, hapticSuccess } from '@/shared/lib';
import { convertToWav, getAudioDurationMs } from '@/shared/lib/audio';
import { formatTime } from '@/shared/lib/date';
import { ensureRecordingsDir, RECORDINGS_DIR } from '@/shared/lib/recordings';

export function useImportAudioFile() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const addRecord = useRecordStore((s) => s.addRecord);
  const autoTranscribeOnSave = useSettingsStore((s) => s.autoTranscribeOnSave);
  const { startTranscription } = useTranscription();
  const [isImporting, setIsImporting] = useState(false);

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

      const fileUri = (file as { uri?: string; fileUri?: string }).fileUri ?? file.uri;
      if (!fileUri) {
        return;
      }

      setIsImporting(true);

      const sourceUri = fileUri;
      const normalizedSource = sourceUri.startsWith('file://') ? sourceUri.slice(7) : sourceUri;

      await ensureRecordingsDir();
      const recordId = generateRecordId();
      const ext = file.name?.match(/\.[a-zA-Z0-9]+$/)?.[0] ?? '.m4a';
      let destPath = `${RECORDINGS_DIR}/${recordId}${ext}`;

      try {
        await RNFS.copyFile(normalizedSource, destPath);
      } catch {
        destPath = normalizedSource;
      }

      const needsConversion = !/\.wav$/i.test(ext);
      if (needsConversion) {
        const wavPath = `${RECORDINGS_DIR}/${recordId}.wav`;
        const converted = await convertToWav(destPath, wavPath);
        if (converted === null) {
          Alert.alert(t('common.error'), t('importAudio.conversionError'));
          try {
            if (destPath !== normalizedSource) await RNFS.unlink(destPath);
          } catch {
            if (__DEV__) {
              console.warn('[importAudioFile] Could not delete original file');
            }
          }
          return;
        }
        try {
          if (destPath !== normalizedSource) await RNFS.unlink(destPath);
        } catch {
          if (__DEV__) {
            console.warn('[importAudioFile] Could not delete original file');
          }
        }
        destPath = converted;
      }

      let durationMs: number | null = null;
      try {
        durationMs = await getAudioDurationMs(destPath);
      } catch {
        if (__DEV__) {
          console.warn('[importAudioFile] getAudioDurationMs failed');
        }
      }
      if (durationMs == null || durationMs <= 0) {
        durationMs = MAX_RECORDING_MS;
        if (__DEV__) {
          console.warn('[importAudioFile] Could not get duration, using max');
        }
      }

      if (durationMs > MAX_RECORDING_MS) {
        Alert.alert(
          t('importAudio.maxDurationTitle'),
          t('importAudio.maxDurationMessage', { max: 30 }),
          [{ text: t('common.ok') }],
        );
        try {
          await RNFS.unlink(destPath);
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

      if (autoTranscribeOnSave) {
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
      Alert.alert(t('common.error'), t('importAudio.importError'));
    } finally {
      setIsImporting(false);
    }
  }, [isImporting, t, addRecord, autoTranscribeOnSave, startTranscription, navigation]);

  return { importAudioFile, isImporting };
}
