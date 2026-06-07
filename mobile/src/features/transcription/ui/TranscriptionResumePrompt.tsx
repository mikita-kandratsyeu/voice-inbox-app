import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState } from 'react-native';

import { useRecordStore } from '@/entities/record';
import runAfterInteractions from '@/shared/lib/runAfterInteractions';

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
import { getTranscriptionCheckpointSnapshot } from '../model/transcriptionRuntimeRegistry';
import { useTranscription } from '../model/useTranscription';

const RESUME_CHECK_AFTER_FOREGROUND_MS = 400;
const RESUME_CHECK_PENDING_ABORT_MS = 800;

async function resolveInterruptedCheckpoints(): Promise<
  Awaited<ReturnType<typeof listTranscriptionCheckpoints>>
> {
  const listed = await listTranscriptionCheckpoints();
  if (listed.length > 0) return listed;

  const pendingBackgroundId = peekPendingBackgroundTranscriptionRecord();
  if (!pendingBackgroundId) return listed;

  const direct =
    (await getTranscriptionCheckpoint(pendingBackgroundId)) ??
    getTranscriptionCheckpointSnapshot(pendingBackgroundId);
  return direct ? [direct] : listed;
}

export const TranscriptionResumePrompt = () => {
  const { t } = useTranslation();
  const { startTranscription, discardPausedTranscription } = useTranscription();
  const promptInFlightRef = useRef(false);
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAbortRetriesRef = useRef(0);
  const scheduleResumeCheckRef = useRef<(reason: string) => void>(() => {});

  const checkInterruptedTranscriptions = useCallback(async () => {
    if (promptInFlightRef.current) return;
    if (AppState.currentState !== 'active') return;

    const checkpoints = await resolveInterruptedCheckpoints();
    const pendingBackgroundId = peekPendingBackgroundTranscriptionRecord();
    if (checkpoints.length === 0) {
      if (pendingBackgroundId && pendingAbortRetriesRef.current < 5) {
        pendingAbortRetriesRef.current += 1;
        scheduleResumeCheckRef.current('pendingAbort');
      }
      return;
    }
    pendingAbortRetriesRef.current = 0;

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

    clearPendingTranscriptionResumePrompt();
    clearPendingBackgroundTranscriptionRecord();
    useRecordStore.getState().updateAiStatus(checkpoint.recordId, 'resumable');

    promptInFlightRef.current = true;
    Alert.alert(
      t('transcription.resumeTitle'),
      t('transcription.resumeBody', { title: record.title }),
      [
        {
          text: t('transcription.cancelResume'),
          style: 'destructive',
          onPress: () => {
            discardPausedTranscription(record.id).finally(() => {
              promptInFlightRef.current = false;
            });
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
  }, [discardPausedTranscription, startTranscription, t]);

  const scheduleResumeCheck = useCallback(
    (reason: string) => {
      if (checkTimerRef.current) {
        clearTimeout(checkTimerRef.current);
      }
      const delayMs =
        reason === 'pendingAbort'
          ? RESUME_CHECK_PENDING_ABORT_MS
          : reason === 'foreground' && peekPendingBackgroundTranscriptionRecord()
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

  scheduleResumeCheckRef.current = scheduleResumeCheck;

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
        pendingAbortRetriesRef.current = 0;
      }
      if (next === 'active') {
        runAfterInteractions(() => {
          scheduleResumeCheck('foreground');
        });
      }
    });
    const unsubscribeRequest = subscribeTranscriptionResumePromptRequest(() => {
      scheduleResumeCheck('resumeRequest');
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
