import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState } from 'react-native';

import { useRecordStore } from '@/entities/record';

import { cancelTranscriptionPausedNotification } from '../lib/paused-notification/cancelTranscriptionPausedNotification';
import { listTranscriptionCheckpoints } from '../lib/transcriptionCheckpoint';
import { useTranscription } from '../model/useTranscription';
import {
  clearPendingTranscriptionResumePrompt,
  peekPendingTranscriptionResumeRecordId,
  subscribeTranscriptionResumePromptRequest,
} from '../model/transcriptionResumePromptRequest';

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
    const preferredRecordId = peekPendingTranscriptionResumeRecordId();

    const checkpoint =
      (preferredRecordId
        ? checkpoints.find((item) => item.recordId === preferredRecordId)
        : undefined) ??
      checkpoints.find((item) =>
        records.some((r) => r.id === item.recordId && Boolean(r.audioPath)),
      );

    if (!checkpoint) {
      clearPendingTranscriptionResumePrompt();
      return;
    }

    const record = records.find((r) => r.id === checkpoint.recordId);
    if (!record?.audioPath) {
      clearPendingTranscriptionResumePrompt();
      return;
    }

    void cancelTranscriptionPausedNotification(record.id);
    clearPendingTranscriptionResumePrompt();

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
    const unsubscribeRequest = subscribeTranscriptionResumePromptRequest(() => {
      checkInterruptedTranscriptions().catch(() => {
        promptInFlightRef.current = false;
      });
    });
    return () => {
      sub.remove();
      unsubscribeRequest();
    };
  }, [checkInterruptedTranscriptions]);

  return null;
};
