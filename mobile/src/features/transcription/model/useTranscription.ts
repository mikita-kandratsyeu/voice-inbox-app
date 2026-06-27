import { useCallback, useRef } from 'react';
import { AppState } from 'react-native';

import type { TranscriptSegment, VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import {
  getActiveWhisperModelVariantId,
  useSettingsStore,
  WHISPER_KIT_STORAGE_FORMAT,
} from '@/entities/settings';
import { dispatchAutoAiAfterTranscription } from '@/features/ai-task-queue';
import { generateAndSaveEmbeddingForRecord } from '@/features/embedding-generation';
import { useProEntitlement } from '@/features/pro-license';
import { buildMeetingDialogueMarkdownFromNativeSegments } from '@/screens/recording-detail/lib/nativeMeetingDialogue';
import { ensureRecordingsDir, i18n, RECORDINGS_DIR, useNetworkStatus } from '@/shared/lib';
import { diagWarn } from '@/shared/lib/appLogger';
import { convertToWav } from '@/shared/lib/audio';
import { NitroFS } from '@/shared/lib/fs';

import { shouldUseIosWhisperKitEngine } from '../config/transcriptionEngine';
import { buildNativeTranscriptionJobId } from '../lib/buildNativeTranscriptionJobId';
import {
  getAdaptiveCheckpointInterval,
  getDevicePerformanceProfile,
} from '../lib/devicePerformanceProfile';
import { getWhisperContext, resetWhisperContext, scheduleIdleRelease } from '../lib/initWhisper';
import {
  hasNativeSpeakerSegments,
  shouldRunTranscriptionDiarization,
} from '../lib/nativeMeetingSpeakers';
import { invalidateNativeTranscriptionEngineCaches } from '../lib/nativeTranscription';
import { resolveTranscriptionChunkProfile } from '../lib/resolveTranscriptionChunkProfile';
import { transcribeAudio } from '../lib/transcribeAudio';
import { transcribeAudioIos } from '../lib/transcribeAudioIos';
import {
  getTranscriptionCheckpoint,
  removeTranscriptionCheckpoint,
  saveTranscriptionCheckpoint,
} from '../lib/transcriptionCheckpoint';
import { isTooShortForTranscription } from '../lib/transcriptionDuration';
import {
  getTranscriptionErrorCode,
  isAbortTranscriptionError,
  shouldQueueWhisperResetForError,
} from '../lib/transcriptionErrors';
import { isSameCheckpointEngine, resolveCheckpointEngine } from '../lib/transcriptionModelEngine';
import {
  cancelTranscriptionPausedNotification,
  showTranscriptionPausedNotification,
} from '../lib/transcriptionPausedNotification';
import {
  hapticTranscriptionChunk,
  hapticTranscriptionComplete,
  hapticTranscriptionFailed,
  hapticTranscriptionProcessingStart,
} from '../lib/transcriptionHaptics';
import { resolveVadPolicyForMode } from '../lib/transcriptionQualityMode';
import { validateTranscriptionStart } from '../lib/validateTranscriptionStart';
import { clearPendingBackgroundTranscriptionRecord } from './pendingBackgroundTranscriptionRecord';
import { isTranscriptionBlockedForRecord } from './transcriptionConcurrency';
import {
  beginTranscriptionJob,
  endTranscriptionJobIfCurrent,
  hasActiveTranscriptionJob,
  invalidateTranscriptionJob,
  isActiveTranscriptionJob,
} from './transcriptionJobRegistry';
import { requestTranscriptionResumePrompt } from './transcriptionResumePromptRequest';
import {
  beginTranscriptionSession,
  clearTranscriptionBackgroundCancelled,
  clearTranscriptionCheckpointSnapshot,
  endTranscriptionSession,
  getActiveTranscriptionRecordId,
  getTranscriptionCheckpointSnapshot,
  getTranscriptionRuntimeSnapshot,
  isNativeTranscriptionRunning,
  isTranscriptionBackgroundCancelled,
  persistTranscriptionCheckpointForBackground,
  registerActiveTranscription,
  rememberTranscriptionCheckpointSnapshot,
  rememberTranscriptionStopInFlight,
  rememberWhisperResetResult,
  resetTranscriptionRuntimeForRestart,
  setTranscriptionRuntimeState,
  unregisterActiveTranscription,
} from './transcriptionRuntimeRegistry';

const PROGRESS_THROTTLE_MS = 500;
const DISCARD_RESET_UI_TIMEOUT_MS = 3_000;
const pendingWhisperResetRecordIds = new Set<string>();

const createThrottledProgress = (
  recordId: string,
  jobGen: number,
  updateAiStatus: (
    id: string,
    status: 'processing',
    progress?: number,
    label?: string,
    segments?: { current: number; total: number } | null,
  ) => void,
) => {
  let lastCall = 0;

  return (current: number, total: number) => {
    if (!isActiveTranscriptionJob(recordId, jobGen)) {
      return;
    }

    const now = Date.now();
    const isComplete = current >= total;

    if (isComplete || now - lastCall >= PROGRESS_THROTTLE_MS) {
      lastCall = now;
      const percent = Math.round((current / total) * 100);
      const label = i18n.t('transcription.progress', { current, total });
      updateAiStatus(recordId, 'processing', percent, label, { current, total });
    }
  };
};

const isFileNotFoundError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    msg.includes('enoent') ||
    msg.includes('no such file') ||
    msg.includes('file not found') ||
    msg.includes('not found')
  );
};

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export type StartTranscriptionOptions = {
  /** When true, returns before loading Whisper if the recording is below MIN_TRANSCRIBE_MS. */
  enforceMinDuration?: boolean;
};

const shouldFullyResetWhisperContextBeforeStart = (record: VoiceRecord): boolean => {
  if (shouldUseIosWhisperKitEngine()) {
    return false;
  }

  const runtime = getTranscriptionRuntimeSnapshot();
  return (
    pendingWhisperResetRecordIds.has(record.id) ||
    record.aiStatus === 'error' ||
    runtime.consecutiveResetFailures > 0 ||
    runtime.nativeBusyTimeouts > 0 ||
    (runtime.recordId === record.id &&
      (runtime.state === 'stopping' || runtime.state === 'resetting'))
  );
};

const releaseTranscriptionStartGuards = (recordId: string): void => {
  invalidateTranscriptionJob(recordId);
  endTranscriptionSession(recordId);
  unregisterActiveTranscription(recordId);
};

export const useTranscription = () => {
  const updateAiStatus = useRecordStore((s) => s.updateAiStatus);
  const updateTranscript = useRecordStore((s) => s.updateTranscript);
  const updateAiExtras = useRecordStore((s) => s.updateAiExtras);
  const clearAudioPath = useRecordStore((s) => s.clearAudioPath);
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const selectedWhisperModelFormat = useSettingsStore((s) => s.selectedWhisperModelFormat);
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const setWhisperModelStatus = useSettingsStore((s) => s.setWhisperModelStatus);
  const transcriptionLanguage = useSettingsStore((s) => s.transcriptionLanguage);
  const transcriptionQualityMode = useSettingsStore((s) => s.transcriptionQualityMode);
  const autoRefreshMeetingSpeakersOnRegen = useSettingsStore(
    (s) => s.autoRefreshMeetingSpeakersOnRegen,
  );
  const transcriptionCustomWords = useSettingsStore((s) => s.transcriptionCustomWords);
  const autoAiAfterTranscription = useSettingsStore((s) => s.autoAiAfterTranscription);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const { isProActive } = useProEntitlement();
  const { isConnected } = useNetworkStatus();

  const stopRef = useRef<(() => Promise<void>) | null>(null);
  const currentRecordIdRef = useRef<string | null>(null);

  const startTranscription = useCallback(
    async (
      record: VoiceRecord,
      languageOverride?: string,
      options?: StartTranscriptionOptions,
    ): Promise<void> => {
      if (options?.enforceMinDuration && isTooShortForTranscription(record.durationMs)) {
        return;
      }

      void cancelTranscriptionPausedNotification(record.id).catch(() => {});
      const shouldResetBeforeStart =
        pendingWhisperResetRecordIds.has(record.id) ||
        record.aiStatus === 'paused' ||
        record.aiStatus === 'resumable' ||
        record.aiStatus === 'error' ||
        currentRecordIdRef.current === record.id ||
        getActiveTranscriptionRecordId() === record.id ||
        hasActiveTranscriptionJob(record.id) ||
        ((record.transcriptProgress ?? 0) > 0 && !record.transcript.trim());

      if (currentRecordIdRef.current === record.id && stopRef.current) {
        const prevStop = stopRef.current;
        stopRef.current = null;
        await prevStop().catch(() => {});
      }

      if (shouldResetBeforeStart) {
        if (!shouldUseIosWhisperKitEngine()) {
          updateAiStatus(record.id, 'loading_model', 0, i18n.t('transcription.loadingModel'), null);
        }
        try {
          await resetTranscriptionRuntimeForRestart(record.id);
          if (shouldUseIosWhisperKitEngine()) {
            await invalidateNativeTranscriptionEngineCaches();
            pendingWhisperResetRecordIds.delete(record.id);
            rememberWhisperResetResult(true);
          } else if (shouldFullyResetWhisperContextBeforeStart(record)) {
            const reset = await resetWhisperContext();
            rememberWhisperResetResult(reset);
            if (!reset) {
              pendingWhisperResetRecordIds.add(record.id);
              const canResume =
                record.aiStatus === 'paused' ||
                record.aiStatus === 'resumable' ||
                (record.transcriptProgress ?? 0) > 0;
              releaseTranscriptionStartGuards(record.id);
              if (currentRecordIdRef.current === record.id) {
                currentRecordIdRef.current = null;
              }
              updateAiStatus(
                record.id,
                canResume ? 'resumable' : 'error',
                record.transcriptProgress ?? 0,
              );
              return;
            }
            pendingWhisperResetRecordIds.delete(record.id);
          }
        } catch (err) {
          diagWarn('[transcription] restart reset failed', err);
          rememberWhisperResetResult(false);
          if (!shouldUseIosWhisperKitEngine()) {
            pendingWhisperResetRecordIds.add(record.id);
          }
          releaseTranscriptionStartGuards(record.id);
          if (currentRecordIdRef.current === record.id) {
            currentRecordIdRef.current = null;
          }
          updateAiStatus(record.id, 'error', record.transcriptProgress ?? 0);
          hapticTranscriptionFailed();
          return;
        }
      }

      const records = useRecordStore.getState().records;
      const otherRecordBusy = isTranscriptionBlockedForRecord(record.id, records);
      const nativeBusyForThisRecord =
        isNativeTranscriptionRunning() && getActiveTranscriptionRecordId() === record.id;
      const useIosWhisperKitPreflight = shouldUseIosWhisperKitEngine();
      const variantId = getActiveWhisperModelVariantId({
        modelId: selectedWhisperModel,
        weightsFormat: selectedWhisperModelFormat,
        useWhisperKit: useIosWhisperKitPreflight,
      });
      const modelStatus = whisperModelStatuses[variantId] ?? 'not_downloaded';
      const preflight = await validateTranscriptionStart({
        record,
        modelId: selectedWhisperModel,
        modelFormat: selectedWhisperModelFormat,
        modelStatus,
        appIsActive: AppState.currentState === 'active',
        transcriptionBusy:
          otherRecordBusy || (isNativeTranscriptionRunning() && !nativeBusyForThisRecord),
      });

      if (!preflight.ok) {
        if (preflight.reason === 'model_file_missing') {
          setWhisperModelStatus(
            selectedWhisperModel,
            useIosWhisperKitPreflight ? WHISPER_KIT_STORAGE_FORMAT : selectedWhisperModelFormat,
            'not_downloaded',
          );
        }
        if (preflight.reason === 'audio_file_missing') {
          await clearAudioPath(record.id).catch(() => {});
        }

        releaseTranscriptionStartGuards(record.id);
        if (currentRecordIdRef.current === record.id) {
          currentRecordIdRef.current = null;
        }

        const nextStatus =
          preflight.reason === 'model_not_downloaded' ||
          preflight.reason === 'model_missing' ||
          preflight.reason === 'transcription_busy'
            ? 'idle'
            : 'error';
        updateAiStatus(record.id, nextStatus, 0);
        return;
      }

      const normalizedAudioPath = preflight.normalizedAudioPath;
      const audioPath = record.audioPath ?? normalizedAudioPath;
      const hadTranscriptBefore = Boolean(record.transcript?.trim());

      clearTranscriptionBackgroundCancelled(record.id);

      const jobGen = beginTranscriptionJob(record.id);
      const nativeJobId = buildNativeTranscriptionJobId(record.id, jobGen);
      beginTranscriptionSession(record.id);
      registerActiveTranscription(record.id, async () => {
        if (stopRef.current) {
          await stopRef.current();
        }
      });

      const useIosWhisperKit = shouldUseIosWhisperKitEngine();
      if (!useIosWhisperKit) {
        updateAiStatus(record.id, 'loading_model', 0, i18n.t('transcription.loadingModel'), null);
      }
      currentRecordIdRef.current = record.id;

      const language = languageOverride ?? transcriptionLanguage;

      let usedContext = false;
      let transcodeWavPath: string | null = null;
      let keepCheckpointSnapshot = false;
      let completedSuccessfully = false;

      try {
        const checkpointEngine = resolveCheckpointEngine();
        let context: Awaited<ReturnType<typeof getWhisperContext>> | null = null;

        if (!useIosWhisperKit) {
          context = await getWhisperContext(selectedWhisperModel, selectedWhisperModelFormat);
          usedContext = true;
        }

        if (!isActiveTranscriptionJob(record.id, jobGen)) {
          updateAiStatus(record.id, 'idle');
          return;
        }

        if (isTranscriptionBackgroundCancelled(record.id)) {
          keepCheckpointSnapshot = true;
          updateAiStatus(record.id, 'paused');
          return;
        }

        updateAiStatus(record.id, 'processing', 0, undefined, null);
        setTranscriptionRuntimeState('transcribing', record.id);
        hapticTranscriptionProcessingStart();

        const throttledProgress = createThrottledProgress(record.id, jobGen, updateAiStatus);
        const baseChunkProfile = resolveTranscriptionChunkProfile(transcriptionQualityMode);
        const vadPolicy = resolveVadPolicyForMode(transcriptionQualityMode);
        const performanceProfile = getDevicePerformanceProfile({ respectPowerMode: true });
        const checkpointInterval = getAdaptiveCheckpointInterval(
          record.durationMs ?? 0,
          performanceProfile,
        );
        let lastCheckpointPersistAt = 0;
        let transcribeInputPath = audioPath;
        if (!normalizedAudioPath.toLowerCase().endsWith('.wav')) {
          await ensureRecordingsDir();
          const wavOut = `${RECORDINGS_DIR}/${record.id}.transcode.wav`;

          const converted = await convertToWav(normalizedAudioPath, wavOut);
          if (!converted) {
            diagWarn('[transcription] convert to wav failed', record.id);
            currentRecordIdRef.current = null;
            updateAiStatus(record.id, 'error');
            hapticTranscriptionFailed();
            return;
          }
          transcodeWavPath = converted.startsWith('file://') ? converted.slice(7) : converted;
          transcribeInputPath = transcodeWavPath;
        }

        if (
          !isActiveTranscriptionJob(record.id, jobGen) ||
          isTranscriptionBackgroundCancelled(record.id)
        ) {
          if (isTranscriptionBackgroundCancelled(record.id)) {
            keepCheckpointSnapshot = true;
            updateAiStatus(record.id, 'paused');
          }
          return;
        }

        const checkpoint =
          (await getTranscriptionCheckpoint(record.id)) ??
          getTranscriptionCheckpointSnapshot(record.id);
        const canResumeFromCheckpoint =
          checkpoint &&
          checkpoint.audioPath === normalizedAudioPath &&
          checkpoint.modelId === selectedWhisperModel &&
          checkpoint.modelFormat === selectedWhisperModelFormat &&
          checkpoint.language === language &&
          isSameCheckpointEngine(checkpoint.engine, checkpointEngine);
        const chunkProfile =
          canResumeFromCheckpoint && checkpoint ? checkpoint.chunkProfile : baseChunkProfile;
        const resume =
          canResumeFromCheckpoint && checkpoint
            ? {
                startChunkIndex: checkpoint.lastCompletedChunkIndex + 1,
                fullText: checkpoint.fullText,
                segments: checkpoint.segments,
              }
            : undefined;

        const runTranscription = async (resumePayload?: {
          startChunkIndex: number;
          fullText: string;
          segments: TranscriptSegment[];
        }) => {
          if (useIosWhisperKit) {
            const iosHandle = transcribeAudioIos({
              jobId: nativeJobId,
              audioPath: transcribeInputPath,
              durationMs: record.durationMs ?? 0,
              language,
              modelId: selectedWhisperModel,
              diarization: shouldRunTranscriptionDiarization(record, isProActive, {
                isRetranscribe: hadTranscriptBefore,
                autoRefreshSpeakers: autoRefreshMeetingSpeakersOnRegen,
              }),
              customWords: transcriptionCustomWords,
              chunkProfile,
              onProgress: throttledProgress,
              resume: resumePayload,
              onChunkCompleted: ({
                chunkIndex,
                totalChunks,
                fullText,
                segments,
                chunkProfile: activeChunkProfile,
              }) => {
                if (!isActiveTranscriptionJob(record.id, jobGen)) {
                  return;
                }
                hapticTranscriptionChunk();

                const snapshot = {
                  recordId: record.id,
                  audioPath: normalizedAudioPath,
                  modelId: selectedWhisperModel,
                  modelFormat: selectedWhisperModelFormat,
                  language,
                  chunkProfile: activeChunkProfile,
                  totalChunks,
                  lastCompletedChunkIndex: chunkIndex,
                  fullText,
                  segments,
                  engine: checkpointEngine,
                  nativeJobId,
                };
                rememberTranscriptionCheckpointSnapshot(snapshot);

                const now = Date.now();
                const shouldPersist =
                  now - lastCheckpointPersistAt >= checkpointInterval ||
                  chunkIndex + 1 >= totalChunks;
                if (!shouldPersist) {
                  return;
                }

                lastCheckpointPersistAt = now;
                saveTranscriptionCheckpoint(snapshot).catch((err) => {
                  diagWarn('[transcription] checkpoint save failed', err);
                });
              },
            });
            const { stop, promise } = iosHandle;
            stopRef.current = stop;
            registerActiveTranscription(record.id, stop);
            return promise;
          }

          if (!context) {
            throw new Error('whisper_context_missing');
          }

          const transcribeHandle = transcribeAudio({
            context,
            recycleContext: async () => {
              const reset = await resetWhisperContext();
              rememberWhisperResetResult(reset);
              if (!reset) {
                throw new Error('whisper_context_recycle_failed');
              }
              return getWhisperContext(selectedWhisperModel, selectedWhisperModelFormat);
            },
            audioPath: transcribeInputPath,
            durationMs: record.durationMs ?? 0,
            language,
            customWords: transcriptionCustomWords,
            vadPolicy,
            chunkProfile,
            contextRecycleChunks: performanceProfile.contextRecycleChunks,
            onProgress: throttledProgress,
            resume: resumePayload,
            onChunkCompleted: ({
              chunkIndex,
              totalChunks,
              fullText,
              segments,
              chunkProfile: activeChunkProfile,
            }) => {
              if (!isActiveTranscriptionJob(record.id, jobGen)) {
                return;
              }
              hapticTranscriptionChunk();

              const snapshot = {
                recordId: record.id,
                audioPath: normalizedAudioPath,
                modelId: selectedWhisperModel,
                modelFormat: selectedWhisperModelFormat,
                language,
                chunkProfile: activeChunkProfile,
                totalChunks,
                lastCompletedChunkIndex: chunkIndex,
                fullText,
                segments,
                engine: checkpointEngine,
              };
              rememberTranscriptionCheckpointSnapshot(snapshot);

              const now = Date.now();
              const shouldPersist =
                now - lastCheckpointPersistAt >= checkpointInterval ||
                chunkIndex + 1 >= totalChunks;
              if (!shouldPersist) {
                return;
              }

              lastCheckpointPersistAt = now;
              saveTranscriptionCheckpoint(snapshot).catch((err) => {
                diagWarn('[transcription] checkpoint save failed', err);
              });
            },
          });

          const { stop, promise } = transcribeHandle;
          stopRef.current = stop;
          registerActiveTranscription(record.id, stop);
          return promise;
        };

        let transcriptionResult: Awaited<ReturnType<typeof runTranscription>>;
        try {
          transcriptionResult = await runTranscription(resume);
        } catch (resumeErr) {
          if (resume) {
            await removeTranscriptionCheckpoint(record.id).catch(() => {});
            transcriptionResult = await runTranscription(undefined);
          } else {
            throw resumeErr;
          }
        }

        const { segments, fullText, skipped } = transcriptionResult;

        if (isActiveTranscriptionJob(record.id, jobGen)) {
          stopRef.current = null;
          currentRecordIdRef.current = null;
          unregisterActiveTranscription(record.id);
        }

        if (!isActiveTranscriptionJob(record.id, jobGen)) {
          return;
        }

        if (skipped) {
          await removeTranscriptionCheckpoint(record.id).catch(() => {});
          updateAiStatus(record.id, 'idle');
          return;
        }

        await updateTranscript(record.id, fullText, segments);
        hapticTranscriptionComplete();

        if (
          useIosWhisperKit &&
          record.classification === 'meeting' &&
          hasNativeSpeakerSegments(segments)
        ) {
          const shouldRefreshNativeSpeakers =
            !hadTranscriptBefore || autoRefreshMeetingSpeakersOnRegen;
          if (shouldRefreshNativeSpeakers) {
            const meetingDialogue = buildMeetingDialogueMarkdownFromNativeSegments(segments);
            await updateAiExtras(record.id, {
              meetingDialogue,
              meetingSpeakerLabels: hadTranscriptBefore ? null : undefined,
            });
          }
        }

        await removeTranscriptionCheckpoint(record.id).catch(() => {});
        await cancelTranscriptionPausedNotification(record.id).catch(() => {});
        clearTranscriptionCheckpointSnapshot(record.id);
        const recordWithTranscript = {
          ...record,
          transcript: fullText,
          transcriptSegments: segments,
        };
        generateAndSaveEmbeddingForRecord(recordWithTranscript).catch(() => {});

        void dispatchAutoAiAfterTranscription({
          record: {
            ...record,
            transcript: fullText,
            transcriptSegments: segments,
          },
          autoAiAfterTranscription,
          isProActive,
          isConnected: isConnected === true,
          aiExecutionMode,
          privateAiProvider,
        }).catch(() => {});

        completedSuccessfully = true;
      } catch (err) {
        if (!isActiveTranscriptionJob(record.id, jobGen)) {
          if (isTranscriptionBackgroundCancelled(record.id)) {
            keepCheckpointSnapshot = true;
            updateAiStatus(record.id, 'paused');
          }
          unregisterActiveTranscription(record.id);
          return;
        }

        stopRef.current = null;
        currentRecordIdRef.current = null;
        unregisterActiveTranscription(record.id);

        const pausedForBackground = isTranscriptionBackgroundCancelled(record.id);
        const errorCode = getTranscriptionErrorCode(err);
        const isCancelled = isAbortTranscriptionError(err);
        keepCheckpointSnapshot = pausedForBackground;

        if (isCancelled || pausedForBackground) {
          if (shouldQueueWhisperResetForError(err) && !shouldUseIosWhisperKitEngine()) {
            pendingWhisperResetRecordIds.add(record.id);
          }
          if (!pausedForBackground) {
            await removeTranscriptionCheckpoint(record.id).catch(() => {});
          } else {
            clearTranscriptionBackgroundCancelled(record.id);
          }
          updateAiStatus(record.id, pausedForBackground ? 'paused' : 'idle');
        } else {
          await removeTranscriptionCheckpoint(record.id).catch(() => {});
          if (errorCode === 'model_load_failed' || errorCode === 'model_missing') {
            setWhisperModelStatus(
              selectedWhisperModel,
              shouldUseIosWhisperKitEngine()
                ? WHISPER_KIT_STORAGE_FORMAT
                : selectedWhisperModelFormat,
              'not_downloaded',
            );
          }
          if (errorCode === 'audio_missing' || isFileNotFoundError(err)) {
            await clearAudioPath(record.id).catch(() => {});
          }
          if (shouldQueueWhisperResetForError(err) && !shouldUseIosWhisperKitEngine()) {
            pendingWhisperResetRecordIds.add(record.id);
          }
          diagWarn('[transcription] Failed:', errorCode, err instanceof Error ? err.message : err);
          const isModelError = errorCode === 'model_load_failed' || errorCode === 'model_missing';
          updateAiStatus(
            record.id,
            shouldUseIosWhisperKitEngine() && isModelError ? 'idle' : 'error',
            0,
          );
          hapticTranscriptionFailed();
        }
      } finally {
        if (currentRecordIdRef.current === record.id) {
          currentRecordIdRef.current = null;
        }
        const transcodePathNorm = transcodeWavPath?.startsWith('file://')
          ? transcodeWavPath.slice(7)
          : transcodeWavPath;
        if (transcodeWavPath && transcodePathNorm && transcodePathNorm !== normalizedAudioPath) {
          void NitroFS.unlink(transcodeWavPath).catch(() => {});
        }
        if (keepCheckpointSnapshot) {
          const saved = await persistTranscriptionCheckpointForBackground(record.id);
          if (saved) {
            updateAiStatus(record.id, 'resumable');
            void showTranscriptionPausedNotification({
              recordId: record.id,
              recordTitle: record.title,
              checkpointVerified: true,
            }).catch(() => {});
            requestTranscriptionResumePrompt(record.id);
          } else {
            updateAiStatus(record.id, 'idle');
          }
        } else {
          clearTranscriptionCheckpointSnapshot(record.id);
        }
        endTranscriptionJobIfCurrent(record.id, jobGen);
        endTranscriptionSession(record.id);
        unregisterActiveTranscription(record.id);
        if (usedContext) {
          scheduleIdleRelease({ reason: completedSuccessfully ? 'completed' : 'default' });
        }
      }
    },
    [
      selectedWhisperModel,
      selectedWhisperModelFormat,
      whisperModelStatuses,
      transcriptionLanguage,
      transcriptionQualityMode,
      autoRefreshMeetingSpeakersOnRegen,
      transcriptionCustomWords,
      aiExecutionMode,
      autoAiAfterTranscription,
      isProActive,
      isConnected,
      privateAiProvider,
      updateAiExtras,
      updateAiStatus,
      updateTranscript,
      clearAudioPath,
      setWhisperModelStatus,
    ],
  );

  const cancelTranscription = useCallback(
    (recordId: string): void => {
      invalidateTranscriptionJob(recordId);
      currentRecordIdRef.current = null;
      const existing = useRecordStore.getState().records.find((r) => r.id === recordId);
      const hasTranscript = Boolean(existing?.transcript?.trim());
      const nextStatus = hasTranscript ? 'done' : 'idle';
      if (stopRef.current) {
        const stop = stopRef.current;
        stopRef.current = null;
        updateAiStatus(recordId, 'cancelling', existing?.transcriptProgress ?? 0);
        setTranscriptionRuntimeState('stopping', recordId);
        const stopTask = stop();
        rememberTranscriptionStopInFlight(recordId, stopTask);
        void (async () => {
          try {
            const finished = await Promise.race([
              stopTask.then(() => true),
              wait(DISCARD_RESET_UI_TIMEOUT_MS).then(() => false),
            ]);
            if (!finished) {
              pendingWhisperResetRecordIds.add(recordId);
              void stopTask.catch(() => {});
            }
          } catch {
            pendingWhisperResetRecordIds.add(recordId);
          } finally {
            if (
              !hasActiveTranscriptionJob(recordId) &&
              getActiveTranscriptionRecordId() !== recordId
            ) {
              updateAiStatus(recordId, nextStatus, hasTranscript ? 100 : 0);
            }
          }
        })();
      } else {
        updateAiStatus(recordId, nextStatus, hasTranscript ? 100 : 0);
      }
      unregisterActiveTranscription(recordId);
      endTranscriptionSession(recordId);
      clearTranscriptionBackgroundCancelled(recordId);
      clearTranscriptionCheckpointSnapshot(recordId);
      removeTranscriptionCheckpoint(recordId).catch(() => {});
      cancelTranscriptionPausedNotification(recordId).catch(() => {});
      clearPendingBackgroundTranscriptionRecord();
    },
    [updateAiStatus],
  );

  const discardPausedTranscription = useCallback(
    async (recordId: string): Promise<void> => {
      const existing = useRecordStore.getState().records.find((r) => r.id === recordId);
      updateAiStatus(recordId, 'cancelling', existing?.transcriptProgress ?? 0);
      invalidateTranscriptionJob(recordId);
      currentRecordIdRef.current = null;
      clearTranscriptionBackgroundCancelled(recordId);
      clearTranscriptionCheckpointSnapshot(recordId);
      clearPendingBackgroundTranscriptionRecord();

      const resetTask = (async () => {
        await resetTranscriptionRuntimeForRestart(recordId);
        const reset = await resetWhisperContext();
        rememberWhisperResetResult(reset);
        if (reset) {
          pendingWhisperResetRecordIds.delete(recordId);
        } else {
          pendingWhisperResetRecordIds.add(recordId);
        }
      })();

      try {
        const finished = await Promise.race([
          resetTask.then(() => true),
          wait(DISCARD_RESET_UI_TIMEOUT_MS).then(() => false),
        ]);
        if (!finished) {
          pendingWhisperResetRecordIds.add(recordId);
          void resetTask.catch((err) => {
            diagWarn('[transcription] discard reset failed', err);
          });
        }
      } catch (err) {
        diagWarn('[transcription] discard reset failed', err);
        rememberWhisperResetResult(false);
        pendingWhisperResetRecordIds.add(recordId);
      } finally {
        unregisterActiveTranscription(recordId);
        endTranscriptionSession(recordId);
        clearTranscriptionBackgroundCancelled(recordId);
        clearTranscriptionCheckpointSnapshot(recordId);
        updateAiStatus(recordId, 'idle', 0);
        void removeTranscriptionCheckpoint(recordId).catch(() => {});
        void cancelTranscriptionPausedNotification(recordId).catch(() => {});
      }
    },
    [updateAiStatus],
  );

  return { startTranscription, cancelTranscription, discardPausedTranscription };
};
