import { useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { alertAiLimitExceeded } from '@/app/navigation/openPlanPaywall';
import type { MeetingDialogueLoadStatus, VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { DEFAULT_LOCAL_AI_MODEL_ID, useSettingsStore } from '@/entities/settings';
import {
  applyAiSummaryResult,
  existingTaskTextsForRecord,
} from '@/features/ai-processing/lib/applyAiSummaryResult';
import {
  clearCloudSummarizeInFlight,
  isCloudSummarizeInFlight,
  markCloudSummarizeInFlight,
} from '@/features/ai-processing/lib/cloudSummarizeInFlight';
import { markUnreadAfterSummaryRegenerationIfNeeded } from '@/features/ai-processing/lib/markUnreadAfterSummaryRegeneration';
import { generateAndSaveEmbeddingForRecord } from '@/features/embedding-generation';
import { useProEntitlement } from '@/features/pro-license';
import type { AiProcessingResult } from '@/shared/lib/ai-api';
import {
  AI_POLL_TIMEOUT_ERROR,
  clearCloudSummarizePending,
  finalizeAiMessageAfterPollTimeout,
  getCloudSummarizePending,
} from '@/shared/lib/ai-api';
import {
  type AiAbortHandle,
  createAiAbortHandle,
  isAbortLikeError,
  isAiGenerationCancelledError,
} from '@/shared/lib/ai-api/abort';
import { cancelCloudAiJob } from '@/shared/lib/ai-api/cancelCloudAiJob';
import { getAiWeeklyLimitExceededMessage } from '@/shared/lib/ai-api/limitUserMessage';
import { AIOrchestrator } from '@/shared/lib/ai-core';
import { TASK_EXTRACTION_HINT_MAX_CHARS } from '@/shared/lib/ai-core/local-provider/localAiConstants';
import { releaseLocalLlmSession } from '@/shared/lib/ai-core/localLlmSession';
import { sanitizeRecordingMarksForPrompt } from '@/shared/lib/ai-core/recordingMarksForPrompt';
import type { AiLocalGenerationProgressEvent } from '@/shared/lib/ai-core/types';
import {
  abortAiGeneration,
  registerAiGeneration,
  unregisterAiGeneration,
} from '@/shared/lib/aiGenerationAbortRegistry';
import { logAnalyticsEvent } from '@/shared/lib/analytics';
import {
  toUserFacingFetchErrorFromUnknown,
  toUserFacingFetchErrorMessage,
} from '@/shared/lib/fetch/userFacingFetchError';
import { i18n } from '@/shared/lib/i18n';
import { isNonNegativeFiniteNumber } from '@/shared/lib/type-guards';

/** Cloud faux progress after summarize phase-1 completes and meeting dialogue poll continues. */
const CLOUD_MEETING_DIALOGUE_PROGRESS_START = 8;

function normalizeTaskExtractionHint(raw?: string): string | undefined {
  const t = (raw ?? '').split('\0').join('').trim();

  if (!t) return undefined;

  return t.length > TASK_EXTRACTION_HINT_MAX_CHARS ? t.slice(0, TASK_EXTRACTION_HINT_MAX_CHARS) : t;
}

export const useAiProcessing = () => {
  const {
    setSummaryStatus,
    setTasksStatus,
    setSummaryError,
    setTasksError,
    setMeetingDialogueStatus,
    setMeetingDialogueError,
    setPrivateAiBatchUi,
    clearPrivateAiBatchUi,
    updateSummary,
    updateTasks,
    updateTags,
    updateAiExtras,
    renameRecord,
  } = useRecordStore(
    useShallow((s) => ({
      setSummaryStatus: s.setSummaryStatus,
      setTasksStatus: s.setTasksStatus,
      setSummaryError: s.setSummaryError,
      setTasksError: s.setTasksError,
      setMeetingDialogueStatus: s.setMeetingDialogueStatus,
      setMeetingDialogueError: s.setMeetingDialogueError,
      setPrivateAiBatchUi: s.setPrivateAiBatchUi,
      clearPrivateAiBatchUi: s.clearPrivateAiBatchUi,
      updateSummary: s.updateSummary,
      updateTasks: s.updateTasks,
      updateTags: s.updateTags,
      updateAiExtras: s.updateAiExtras,
      renameRecord: s.renameRecord,
    })),
  );

  const {
    selectedAIModel,
    aiModelRoutingMode,
    selectedLocalAiModel,
    localLlmModelStatuses,
    summaryStyle,
    taskStrictness,
    aiOutputLanguage,
    aiExecutionMode,
    privateLocalLlmBudget,
    privateCapabilityTier,
    cloudAiKvTtlSeconds,
  } = useSettingsStore(
    useShallow((s) => ({
      selectedAIModel: s.selectedAIModel,
      aiModelRoutingMode: s.aiModelRoutingMode,
      selectedLocalAiModel: s.selectedLocalAiModel,
      localLlmModelStatuses: s.localLlmModelStatuses,
      summaryStyle: s.summaryStyle,
      taskStrictness: s.taskStrictness,
      aiOutputLanguage: s.aiOutputLanguage,
      aiExecutionMode: s.aiExecutionMode,
      privateLocalLlmBudget: s.privateLocalLlmBudget,
      privateCapabilityTier: s.privateCapabilityTier,
      cloudAiKvTtlSeconds: s.cloudAiKvTtlSeconds,
    })),
  );

  const effectiveLocalAiModelId = selectedLocalAiModel ?? DEFAULT_LOCAL_AI_MODEL_ID;
  const isLocalLlmModelDownloaded =
    selectedLocalAiModel != null &&
    (localLlmModelStatuses[selectedLocalAiModel] ?? 'not_downloaded') === 'downloaded';

  const inFlightRef = useRef<Set<string>>(new Set());
  /** Bumped on cancel or new run so stale `finally` blocks do not clear a newer generation. */
  const runGenerationRef = useRef<Map<string, number>>(new Map());
  const abortHandlesRef = useRef<Map<string, AiAbortHandle>>(new Map());
  /** Cloud summarize/ask job id for server cancel (`{recordId}-ai-{ts}`). */
  const activeCloudJobIdRef = useRef<Map<string, string>>(new Map());
  const { isProActive } = useProEntitlement();

  const resolveMeetingDialogueUiStatus = useCallback(
    (
      includeMeetingSpeakerBreakdown: boolean,
      meetingDialogueMarkdown: string | undefined,
      pollStatus?: 'processing' | 'done' | 'failed' | 'skipped',
    ): MeetingDialogueLoadStatus => {
      if (!includeMeetingSpeakerBreakdown) return 'idle';
      if (pollStatus === 'failed') return 'failed';
      if (meetingDialogueMarkdown?.trim()) return 'done';
      return 'idle';
    },
    [],
  );

  const applyCancelledUiState = useCallback(
    (recordId: string) => {
      clearPrivateAiBatchUi(recordId);
      const latest = useRecordStore.getState().records.find((r) => r.id === recordId);
      const hadSummary = Boolean(latest?.summary?.trim());
      const hadTasks = (latest?.tasks?.length ?? 0) > 0;
      const hadMeetingDialogue = Boolean(latest?.meetingDialogue?.trim());

      setSummaryStatus(recordId, hadSummary ? 'done' : 'idle');
      setTasksStatus(recordId, hadTasks ? 'done' : 'idle');
      setSummaryError(recordId, undefined);
      setTasksError(recordId, undefined);
      setMeetingDialogueStatus(recordId, hadMeetingDialogue ? 'done' : 'idle');
      setMeetingDialogueError(recordId, undefined);
    },
    [
      clearPrivateAiBatchUi,
      setMeetingDialogueError,
      setMeetingDialogueStatus,
      setSummaryError,
      setSummaryStatus,
      setTasksError,
      setTasksStatus,
    ],
  );

  const isSummaryAlreadyApplied = useCallback((recordId: string): boolean => {
    const latest = useRecordStore.getState().records.find((r) => r.id === recordId);
    return latest?.summaryStatus === 'done' && Boolean(latest?.summary?.trim());
  }, []);

  const applyMeetingDialogueFailure = useCallback(
    (recordId: string, errorMsg: string) => {
      setMeetingDialogueStatus(recordId, 'failed');
      setMeetingDialogueError(recordId, errorMsg);
    },
    [setMeetingDialogueError, setMeetingDialogueStatus],
  );

  const cancelAiGeneration = useCallback(
    (recordId: string) => {
      const registryAbort = abortAiGeneration(recordId, 'summary');
      const refHandle = abortHandlesRef.current.get(recordId);
      refHandle?.abort();
      abortHandlesRef.current.delete(recordId);

      runGenerationRef.current.set(recordId, (runGenerationRef.current.get(recordId) ?? 0) + 1);
      inFlightRef.current.delete(`${recordId}-ai`);
      applyCancelledUiState(recordId);

      const refCloudJobId = activeCloudJobIdRef.current.get(recordId);
      activeCloudJobIdRef.current.delete(recordId);
      const cloudJobId = registryAbort.cloudJobId ?? refCloudJobId ?? null;
      clearCloudSummarizeInFlight(recordId);
      void clearCloudSummarizePending(recordId);
      if (cloudJobId && useSettingsStore.getState().aiExecutionMode !== 'private_experimental') {
        void cancelCloudAiJob(cloudJobId);
      }

      if (useSettingsStore.getState().aiExecutionMode === 'private_experimental') {
        void releaseLocalLlmSession();
      }
    },
    [applyCancelledUiState],
  );

  const processRecord = useCallback(
    async (record: VoiceRecord, aiRunOptions?: { taskExtractionHint?: string }): Promise<void> => {
      const baseId = `${record.id}-ai`;
      const hasTranscript = Boolean(record.transcript?.trim());

      if (!hasTranscript) {
        return;
      }

      if (inFlightRef.current.has(baseId) || isCloudSummarizeInFlight(record.id)) {
        return;
      }

      const wasSummaryRegeneration = Boolean(record.summary?.trim());

      markCloudSummarizeInFlight(record.id);

      setSummaryStatus(record.id, 'processing');
      setTasksStatus(record.id, 'processing');
      setSummaryError(record.id, undefined);
      setTasksError(record.id, undefined);

      await updateAiExtras(record.id, {
        summaryAiModel: null,
        summaryTokensPrompt: null,
        summaryTokensCompletion: null,
        summaryReasoning: null,
        summaryGenerationMs: null,
      });

      const isPrivateAi = aiExecutionMode === 'private_experimental';
      setPrivateAiBatchUi(record.id, {
        privateAiBatchProgress: isPrivateAi ? 0 : 5,
        privateAiBatchPhase: isPrivateAi ? 'loading_model' : 'processing',
      });

      const runGeneration = (runGenerationRef.current.get(record.id) ?? 0) + 1;
      runGenerationRef.current.set(record.id, runGeneration);

      const abortHandle = createAiAbortHandle();
      abortHandlesRef.current.set(record.id, abortHandle);

      const generationStartedAt = Date.now();
      let cloudProgressTimer: ReturnType<typeof setInterval> | null = null;
      let cloudDisplayedPct = 5;
      if (!isPrivateAi) {
        cloudProgressTimer = setInterval(() => {
          if (abortHandle.cancelled) return;
          cloudDisplayedPct = Math.min(92, cloudDisplayedPct + 2 + Math.floor(Math.random() * 5));
          setPrivateAiBatchUi(record.id, {
            privateAiBatchProgress: cloudDisplayedPct,
            privateAiBatchPhase: 'processing',
          });
        }, 2000);
      }

      const requestId = `${baseId}-${Date.now()}`;
      if (aiExecutionMode !== 'private_experimental') {
        activeCloudJobIdRef.current.set(record.id, requestId);
      }
      registerAiGeneration(
        record.id,
        'summary',
        abortHandle,
        aiExecutionMode !== 'private_experimental' ? requestId : null,
      );
      inFlightRef.current.add(baseId);
      void logAnalyticsEvent('ai_action_started', {
        action: 'summary_tasks',
        mode: aiExecutionMode,
        tier: privateCapabilityTier,
      });

      let includeMeetingSpeakerBreakdown = false;

      try {
        const snapshot = useRecordStore.getState().records.find((r) => r.id === record.id);
        const existingTaskTexts = existingTaskTextsForRecord(
          (id) => useRecordStore.getState().records.find((r) => r.id === id),
          record.id,
        );
        const taskExtractionHint = normalizeTaskExtractionHint(aiRunOptions?.taskExtractionHint);
        const recordingMarks = sanitizeRecordingMarksForPrompt(
          snapshot?.recordingMarks ?? record.recordingMarks,
        );
        const recordIsMeeting = (snapshot?.classification ?? record.classification) === 'meeting';
        includeMeetingSpeakerBreakdown =
          isProActive && recordIsMeeting && aiExecutionMode !== 'private_experimental';

        if (includeMeetingSpeakerBreakdown) {
          setMeetingDialogueStatus(record.id, 'idle');
          setMeetingDialogueError(record.id, undefined);
          await updateAiExtras(record.id, { meetingDialogue: null });
        }

        const getLatestRecord = (id: string) =>
          useRecordStore.getState().records.find((r) => r.id === id);

        const applyResultParams = {
          record,
          isProActive,
          recordIsMeeting,
          includeMeetingSpeakerBreakdown,
          aiExecutionMode,
          effectiveLocalAiModelId,
          generationStartedAt,
          updateSummary,
          updateTasks,
          updateTags,
          updateAiExtras,
          renameRecord,
          getLatestRecord,
        };

        const onCloudSummaryReady = includeMeetingSpeakerBreakdown
          ? async (partial: AiProcessingResult) => {
              if (abortHandle.cancelled) return;
              if (runGenerationRef.current.get(record.id) !== runGeneration) return;

              await applyAiSummaryResult({
                ...applyResultParams,
                result: partial,
                skipMeetingDialogue: true,
              });
              markUnreadAfterSummaryRegenerationIfNeeded(record.id, wasSummaryRegeneration);
              setMeetingDialogueStatus(record.id, 'processing');
              setMeetingDialogueError(record.id, undefined);

              cloudDisplayedPct = CLOUD_MEETING_DIALOGUE_PROGRESS_START;
              privateBatchProgress.lastDisplayedPct = CLOUD_MEETING_DIALOGUE_PROGRESS_START;
              privateBatchProgress.retryContinuationFloor = CLOUD_MEETING_DIALOGUE_PROGRESS_START;
              privateBatchProgress.tokenEvents = 0;
              setPrivateAiBatchUi(record.id, {
                privateAiBatchProgress: CLOUD_MEETING_DIALOGUE_PROGRESS_START,
                privateAiBatchPhase: 'processing',
                privateAiBatchProgressLabel: i18n.t(
                  'recordingDetail.meetingDialogueProgressStepLabel',
                ),
              });
            }
          : undefined;

        const transcriptSegmentsForCloud =
          includeMeetingSpeakerBreakdown && (snapshot?.transcriptSegments?.length ?? 0) > 0
            ? snapshot!.transcriptSegments!.map((s) => ({
                ...(isNonNegativeFiniteNumber(s.startMs) ? { startMs: s.startMs } : {}),
                ...(isNonNegativeFiniteNumber(s.endMs) ? { endMs: s.endMs } : {}),
                text: s.text,
              }))
            : undefined;

        const privateBatchProgress = {
          lastDisplayedPct: -1,
          tokenEvents: 0,
          retryContinuationFloor: null as number | null,
        };
        const onLocalGenerationProgress =
          aiExecutionMode === 'private_experimental'
            ? (event: AiLocalGenerationProgressEvent) => {
                if (abortHandle.cancelled) return;
                let pct = 0;
                let phase: 'loading_model' | 'processing' = 'loading_model';
                switch (event.kind) {
                  case 'prepare_model_start':
                    if (privateBatchProgress.tokenEvents > 0) {
                      privateBatchProgress.retryContinuationFloor =
                        privateBatchProgress.lastDisplayedPct;
                    }
                    if (privateBatchProgress.retryContinuationFloor != null) {
                      pct = privateBatchProgress.retryContinuationFloor;
                      phase = 'processing';
                    } else {
                      pct = 2;
                      phase = 'loading_model';
                    }
                    break;
                  case 'prepare_model_done':
                    phase = 'processing';
                    if (privateBatchProgress.retryContinuationFloor != null) {
                      pct = Math.max(12, privateBatchProgress.retryContinuationFloor);
                    } else {
                      pct = 12;
                    }
                    break;
                  case 'completion_token': {
                    phase = 'processing';
                    privateBatchProgress.tokenEvents += 1;
                    const genFrac = event.tokenIndex / event.nPredictBudget;
                    if (privateBatchProgress.retryContinuationFloor != null) {
                      const span = 98 - privateBatchProgress.retryContinuationFloor;
                      pct =
                        privateBatchProgress.retryContinuationFloor +
                        Math.min(span, Math.floor(genFrac * span));
                    } else {
                      pct = 12 + Math.min(82, Math.floor(genFrac * 82));
                    }
                    break;
                  }
                  default:
                    return;
                }
                const nextPct = Math.min(98, pct);
                privateBatchProgress.lastDisplayedPct = nextPct;
                setPrivateAiBatchUi(record.id, {
                  privateAiBatchProgress: nextPct,
                  privateAiBatchPhase: phase,
                });
              }
            : undefined;

        const runResult = await AIOrchestrator.runSummaryTasks(
          {
            id: requestId,
            transcript: record.transcript,
            ...(includeMeetingSpeakerBreakdown ? { processingPreset: 'meeting' as const } : {}),
            existingTaskTexts,
            ...(taskExtractionHint ? { taskExtractionHint } : {}),
            ...(transcriptSegmentsForCloud?.length
              ? { transcriptSegments: transcriptSegmentsForCloud }
              : {}),
            ...(recordingMarks?.length ? { recordingMarks } : {}),
            onLocalGenerationProgress,
            abortSignal: abortHandle.signal,
            ...(includeMeetingSpeakerBreakdown
              ? {
                  expectAsyncMeetingDialogue: true,
                  onCloudSummaryReady,
                }
              : {}),
          },
          {
            selectedAIModel,
            aiModelRoutingMode,
            selectedLocalAiModel: effectiveLocalAiModelId,
            isLocalLlmModelDownloaded,
            summaryStyle,
            taskStrictness,
            aiOutputLanguage,
            aiExecutionMode,
            privateLocalLlmBudget,
            privateCapabilityTier,
            cloudMessageTtlSeconds: cloudAiKvTtlSeconds,
          },
        );

        if (abortHandle.cancelled || runGenerationRef.current.get(record.id) !== runGeneration) {
          if (abortHandle.cancelled) {
            applyCancelledUiState(record.id);
            void logAnalyticsEvent('ai_action_cancelled', {
              action: 'summary_tasks',
              mode: aiExecutionMode,
              tier: privateCapabilityTier,
            });
          }
          return;
        }

        if (!runResult.ok) {
          if (isAiGenerationCancelledError(runResult.error)) {
            applyCancelledUiState(record.id);
            void clearCloudSummarizePending(record.id);
            void logAnalyticsEvent('ai_action_cancelled', {
              action: 'summary_tasks',
              mode: aiExecutionMode,
              tier: privateCapabilityTier,
            });
            return;
          }
          if (runResult.error === AI_POLL_TIMEOUT_ERROR) {
            const pending = await getCloudSummarizePending(record.id);
            const finalized = await finalizeAiMessageAfterPollTimeout(
              pending?.jobId ?? requestId,
              pending?.syncToken,
              { expectAsyncMeetingDialogue: includeMeetingSpeakerBreakdown },
            );
            if (finalized.ok) {
              // Race: worker finished just after poll budget expired.
              setPrivateAiBatchUi(record.id, {
                privateAiBatchProgress: 98,
                privateAiBatchPhase: 'processing',
              });
              const { summary, keyPhrases, meetingDialogueMarkdown } = finalized.result;
              const summaryAlreadyOnDevice = isSummaryAlreadyApplied(record.id);
              if (!summaryAlreadyOnDevice) {
                await applyAiSummaryResult({
                  record,
                  result: finalized.result,
                  isProActive,
                  recordIsMeeting,
                  includeMeetingSpeakerBreakdown,
                  aiExecutionMode,
                  effectiveLocalAiModelId,
                  generationStartedAt,
                  updateSummary,
                  updateTasks,
                  updateTags,
                  updateAiExtras,
                  renameRecord,
                  getLatestRecord: (id) =>
                    useRecordStore.getState().records.find((r) => r.id === id),
                });
              } else if (
                includeMeetingSpeakerBreakdown &&
                meetingDialogueMarkdown?.trim()
              ) {
                await updateAiExtras(record.id, {
                  meetingDialogue: meetingDialogueMarkdown.trim(),
                });
              }
              setSummaryStatus(record.id, 'done');
              setTasksStatus(record.id, 'done');
              setSummaryError(record.id, undefined);
              setTasksError(record.id, undefined);
              if (includeMeetingSpeakerBreakdown) {
                const mdUiStatus = resolveMeetingDialogueUiStatus(
                  includeMeetingSpeakerBreakdown,
                  meetingDialogueMarkdown,
                  finalized.meetingDialogueStatus,
                );
                setMeetingDialogueStatus(record.id, mdUiStatus);
                setMeetingDialogueError(record.id, undefined);
              }
              await generateAndSaveEmbeddingForRecord({
                ...record,
                summary: summary ?? record.summary,
                keyPhrases: keyPhrases ?? record.keyPhrases ?? [],
              });
              markUnreadAfterSummaryRegenerationIfNeeded(record.id, wasSummaryRegeneration);
              void clearCloudSummarizePending(record.id);
              return;
            }
            if (finalized.error === 'AI result expired') {
              void clearCloudSummarizePending(record.id);
              setSummaryStatus(record.id, 'idle');
              setTasksStatus(record.id, 'idle');
              return;
            }
            void clearCloudSummarizePending(record.id);
            const timeoutMsg = toUserFacingFetchErrorMessage(finalized.error);
            if (
              includeMeetingSpeakerBreakdown &&
              isSummaryAlreadyApplied(record.id)
            ) {
              applyMeetingDialogueFailure(record.id, timeoutMsg);
              return;
            }
            setSummaryStatus(record.id, 'error');
            setTasksStatus(record.id, 'error');
            setSummaryError(record.id, timeoutMsg);
            setTasksError(record.id, timeoutMsg);
            return;
          }
          void clearCloudSummarizePending(record.id);
          const errorMsg = runResult.limitExceeded
            ? getAiWeeklyLimitExceededMessage()
            : toUserFacingFetchErrorMessage(runResult.error ?? '');
          if (__DEV__)
            console.warn('[AI] processRecord: runSummaryTasks failed', {
              recordId: record.id,
              error: errorMsg,
              limitExceeded: runResult.limitExceeded,
              provider: runResult.provider,
              mode: runResult.mode,
              tier: privateCapabilityTier,
            });
          if (runResult.limitExceeded) {
            alertAiLimitExceeded(errorMsg);
          }
          if (
            includeMeetingSpeakerBreakdown &&
            isSummaryAlreadyApplied(record.id) &&
            !runResult.limitExceeded
          ) {
            applyMeetingDialogueFailure(
              record.id,
              i18n.t('recordingDetail.meetingDialogueFailedDesc'),
            );
            void logAnalyticsEvent('ai_action_failed', {
              action: 'summary_tasks',
              reason: 'meeting_dialogue',
              mode: runResult.mode,
              provider: runResult.provider,
              tier: privateCapabilityTier,
            });
            return;
          }
          setSummaryStatus(record.id, 'error');
          setTasksStatus(record.id, 'error');
          setSummaryError(record.id, errorMsg);
          setTasksError(record.id, errorMsg);
          if (includeMeetingSpeakerBreakdown) {
            setMeetingDialogueStatus(record.id, 'idle');
            setMeetingDialogueError(record.id, undefined);
          }
          void logAnalyticsEvent('ai_action_failed', {
            action: 'summary_tasks',
            reason: runResult.limitExceeded ? 'limit' : 'run',
            mode: runResult.mode,
            provider: runResult.provider,
            tier: privateCapabilityTier,
          });
          return;
        }

        if (abortHandle.cancelled || runGenerationRef.current.get(record.id) !== runGeneration) {
          return;
        }

        setPrivateAiBatchUi(record.id, {
          privateAiBatchProgress: 98,
          privateAiBatchPhase: 'processing',
        });

        const { summary, keyPhrases, meetingDialogueMarkdown } = runResult.result;
        const summaryAlreadyOnDevice = isSummaryAlreadyApplied(record.id);

        if (!summaryAlreadyOnDevice) {
          await applyAiSummaryResult({
            ...applyResultParams,
            result: runResult.result,
          });
        } else if (includeMeetingSpeakerBreakdown && meetingDialogueMarkdown?.trim()) {
          await updateAiExtras(record.id, {
            meetingDialogue: meetingDialogueMarkdown.trim(),
          });
        }

        if (includeMeetingSpeakerBreakdown) {
          if (runResult.meetingDialogueStatus === 'skipped') {
            setMeetingDialogueStatus(record.id, 'idle');
            setMeetingDialogueError(record.id, undefined);
          } else {
            const mdUiStatus = resolveMeetingDialogueUiStatus(
              true,
              meetingDialogueMarkdown,
              runResult.meetingDialogueStatus,
            );
            setMeetingDialogueStatus(record.id, mdUiStatus);
            if (mdUiStatus === 'failed') {
              setMeetingDialogueError(
                record.id,
                i18n.t('recordingDetail.meetingDialogueFailedDesc'),
              );
            } else {
              setMeetingDialogueError(record.id, undefined);
            }
          }
        }

        inFlightRef.current.delete(baseId);

        void clearCloudSummarizePending(record.id);

        const latestAfterApply = getLatestRecord(record.id);
        await generateAndSaveEmbeddingForRecord({
          ...record,
          summary: latestAfterApply?.summary ?? summary,
          keyPhrases: latestAfterApply?.keyPhrases ?? keyPhrases ?? [],
        });
        markUnreadAfterSummaryRegenerationIfNeeded(record.id, wasSummaryRegeneration);
        void logAnalyticsEvent('ai_action_success', {
          action: 'summary_tasks',
          mode: runResult.mode,
          provider: runResult.provider,
          tier: privateCapabilityTier,
        });
      } catch (err) {
        if (abortHandle.cancelled || isAbortLikeError(err)) {
          applyCancelledUiState(record.id);
          void logAnalyticsEvent('ai_action_cancelled', {
            action: 'summary_tasks',
            mode: aiExecutionMode,
            tier: privateCapabilityTier,
          });
          return;
        }
        if (__DEV__)
          console.warn('[AI] processRecord: unexpected error', {
            recordId: record.id,
            error: err instanceof Error ? err.message : String(err),
          });
        const errorMsg = toUserFacingFetchErrorFromUnknown(err);
        if (includeMeetingSpeakerBreakdown && isSummaryAlreadyApplied(record.id)) {
          applyMeetingDialogueFailure(
            record.id,
            i18n.t('recordingDetail.meetingDialogueFailedDesc'),
          );
        } else {
          setSummaryStatus(record.id, 'error');
          setTasksStatus(record.id, 'error');
          setSummaryError(record.id, errorMsg);
          setTasksError(record.id, errorMsg);
        }
        void logAnalyticsEvent('ai_action_failed', {
          action: 'summary_tasks',
          reason: 'exception',
          mode: aiExecutionMode,
          tier: privateCapabilityTier,
        });
      } finally {
        if (cloudProgressTimer) {
          clearInterval(cloudProgressTimer);
        }
        clearPrivateAiBatchUi(record.id);
        if (runGenerationRef.current.get(record.id) === runGeneration) {
          inFlightRef.current.delete(baseId);
          clearCloudSummarizeInFlight(record.id);
          unregisterAiGeneration(record.id, 'summary', abortHandle);
          if (abortHandlesRef.current.get(record.id) === abortHandle) {
            abortHandlesRef.current.delete(record.id);
          }
          activeCloudJobIdRef.current.delete(record.id);
        }
      }
    },
    [
      aiExecutionMode,
      clearPrivateAiBatchUi,
      selectedAIModel,
      aiModelRoutingMode,
      effectiveLocalAiModelId,
      isLocalLlmModelDownloaded,
      summaryStyle,
      taskStrictness,
      aiOutputLanguage,
      privateLocalLlmBudget,
      privateCapabilityTier,
      cloudAiKvTtlSeconds,
      applyCancelledUiState,
      setPrivateAiBatchUi,
      setSummaryStatus,
      setTasksStatus,
      setSummaryError,
      setTasksError,
      setMeetingDialogueStatus,
      setMeetingDialogueError,
      applyMeetingDialogueFailure,
      isSummaryAlreadyApplied,
      resolveMeetingDialogueUiStatus,
      updateSummary,
      updateTasks,
      updateTags,
      updateAiExtras,
      renameRecord,
      isProActive,
    ],
  );

  const generateSummary = useCallback(
    (record: VoiceRecord): Promise<void> => processRecord(record),
    [processRecord],
  );

  const extractTasks = useCallback(
    (record: VoiceRecord, options?: { taskExtractionHint?: string }): Promise<void> =>
      processRecord(record, options),
    [processRecord],
  );

  return { generateSummary, extractTasks, processRecord, cancelAiGeneration };
};
