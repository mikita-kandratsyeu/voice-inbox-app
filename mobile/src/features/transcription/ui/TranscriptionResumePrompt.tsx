import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState } from 'react-native';

import { useRecordStore } from '@/entities/record';

import { listTranscriptionCheckpoints } from '../lib/transcriptionCheckpoint';
import { useTranscription } from '../model/useTranscription';

export const TranscriptionResumePrompt = () => {
  const { t } = useTranslation();
  const { startTranscription, cancelTranscription } = useTranscription();
  const promptInFlightRef = useRef(false);

  const checkInterruptedTranscriptions = useCallback(async () => {
    if (promptInFlightRef.current) return;
    if (AppState.currentState !== 'active') return;

    const checkpoints = await listTranscriptionCheckpoints();
    if (checkpoints.length === 0) return;

    const records = useRecordStore.getState().records;
    const checkpoint = checkpoints.find((item) =>
      records.some((r) => r.id === item.recordId && Boolean(r.audioPath)),
    );
    if (!checkpoint) return;

    const record = records.find((r) => r.id === checkpoint.recordId);
    if (!record?.audioPath) return;

    promptInFlightRef.current = true;
    Alert.alert(
      t('transcription.resumeTitle'),
      t('transcription.resumeBody', { title: record.title }),
      [
        {
          text: t('transcription.cancelResume'),
          style: 'destructive',
          onPress: () => {
            cancelTranscription(record.id);
            promptInFlightRef.current = false;
          },
        },
        {
          text: t('transcription.continue'),
          onPress: () => {
            startTranscription(record, checkpoint.language).finally(() => {
              promptInFlightRef.current = false;
            });
          },
        },
      ],
      { cancelable: false },
    );
  }, [cancelTranscription, startTranscription, t]);

  useEffect(() => {
    checkInterruptedTranscriptions().catch(() => {
      promptInFlightRef.current = false;
    });
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        checkInterruptedTranscriptions().catch(() => {
          promptInFlightRef.current = false;
        });
      }
    });
    return () => sub.remove();
  }, [checkInterruptedTranscriptions]);

  return null;
};
