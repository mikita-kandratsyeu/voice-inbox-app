import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState, InteractionManager } from 'react-native';

import { useRecordStore } from '@/entities/record';

import { cancelTranscriptionPausedNotification } from '../lib/paused-notification/cancelTranscriptionPausedNotification';
import {
  getTranscriptionCheckpoint,
  listTranscriptionCheckpoints,
} from '../lib/transcriptionCheckpoint';
import {
  clearPendingBackgroundTranscriptionRecord,
  peekPendingBackgroundTranscriptionRecord,
} from '../model/pendingBackgroundTranscriptionRecord';
import {
  clearPendingTranscriptionResumePrompt,
  peekPendingTranscriptionResumeRecordId,
  subscribeTranscriptionResumePromptRequest,
} from '../model/transcriptionResumePromptRequest';
import { useTranscription } from '../model/useTranscription';

const RESUME_CHECK_AFTER_FOREGROUND_MS = 350;

async function resolveInterruptedCheckpoints(): Promise<
  Awaited<ReturnType<typeof listTranscriptionCheckpoints>>
> {
  const listed = await listTranscriptionCheckpoints();
  if (listed.length > 0) return listed;

  const pendingBackgroundId = peekPendingBackgroundTranscriptionRecord();
  if (!pendingBackgroundId) return listed;

  const direct = await getTranscriptionCheckpoint(pendingBackgroundId);
  return direct ? [direct] : listed;
}

export const TranscriptionResumePrompt = () => {
  const { t } = useTranslation();
  const { startTranscription, cancelTranscription } = useTranscription();
  const promptInFlightRef = useRef(false);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkInterruptedTranscriptions = useCallback(async () => {
    if (promptInFlightRef.current) return;
    if (AppState.currentState !== 'active') return;

    const checkpoints = await resolveInterruptedCheckpoints();
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
      if (!useRecordStore.getState().isLoaded) return;
      clearPendingTranscriptionResumePrompt();
      clearPendingBackgroundTranscriptionRecord();
      return;
    }

    const record = records.find((r) => r.id === checkpoint.recordId);
    if (!record?.audioPath) {
      if (!useRecordStore.getState().isLoaded) return;
      clearPendingTranscriptionResumePrompt();
      clearPendingBackgroundTranscriptionRecord();
      return;
    }

    void cancelTranscriptionPausedNotification(record.id);
    clearPendingTranscriptionResumePrompt();
    clearPendingBackgroundTranscriptionRecord();

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

  const scheduleResumeCheck = useCallback(
    (reason: string) => {
      if (checkTimerRef.current) {
        clearTimeout(checkTimerRef.current);
      }
      const delayMs =
        reason === 'foreground' && peekPendingBackgroundTranscriptionRecord()
          ? RESUME_CHECK_AFTER_FOREGROUND_MS
          : 0;

      checkTimerRef.current = setTimeout(() => {
        checkTimerRef.current = null;
        checkInterruptedTranscriptions().catch(() => {
          promptInFlightRef.current = false;
        });
      }, delayMs);
    },
    [checkInterruptedTranscriptions],
  );

  const recordsLoaded = useRecordStore((s) => s.isLoaded);

  useEffect(() => {
    if (!recordsLoaded) return;
    scheduleResumeCheck('recordsLoaded');
  }, [recordsLoaded, scheduleResumeCheck]);

  useEffect(() => {
    scheduleResumeCheck('mount');
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        promptInFlightRef.current = false;
      }
      if (next === 'active') {
        InteractionManager.runAfterInteractions(() => {
          scheduleResumeCheck('foreground');
        });
      }
    });
    const unsubscribeRequest = subscribeTranscriptionResumePromptRequest(() => {
      scheduleResumeCheck('notification');
    });
    return () => {
      sub.remove();
      unsubscribeRequest();
      if (checkTimerRef.current) {
        clearTimeout(checkTimerRef.current);
      }
    };
  }, [scheduleResumeCheck]);

  return null;
};
