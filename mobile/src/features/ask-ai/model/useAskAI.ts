import { useCallback, useEffect, useRef, useState } from 'react';

import { alertAiLimitExceeded } from '@/app/navigation/openPlanPaywall';
import { useRecordStore, type VoiceRecord } from '@/entities/record';
import {
  DEFAULT_LOCAL_AI_MODEL_ID,
  resolveEffectivePrivateAiProvider,
  useSettingsStore,
} from '@/entities/settings';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import {
  type AiAbortHandle,
  createAiAbortHandle,
  isAiRequestCancelled,
} from '@/shared/lib/ai-api/abort';
import { cancelCloudAiJob } from '@/shared/lib/ai-api/cancelCloudAiJob';
import { getAiWeeklyLimitExceededMessage } from '@/shared/lib/ai-api/limitUserMessage';
import type { AskPriorTurn } from '@/shared/lib/ai-core';
import { AIOrchestrator } from '@/shared/lib/ai-core';
import { releaseLocalLlmSession } from '@/shared/lib/ai-core/localLlmSession';
import { sanitizeRecordingMarksForPrompt } from '@/shared/lib/ai-core/recordingMarksForPrompt';
import type {
  AiLocalGenerationProgressEvent,
  AskAnswerKind,
  AskEvidence,
} from '@/shared/lib/ai-core/types';
import {
  abortAiGeneration,
  registerAiGeneration,
  unregisterAiGeneration,
} from '@/shared/lib/aiGenerationAbortRegistry';
import { logAnalyticsEvent } from '@/shared/lib/analytics';

import {
  askAiTranscriptFingerprint,
  clearAskAiSession,
  loadAskAiSession,
  saveAskAiSession,
} from './askAiSessionDb';

export type AskAIHistoryItem = {
  question: string;
  answer: string;
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  suggestedFollowUps?: string[];
};

export type AskAIState = {
  isLoading: boolean;
  isRestoringSession: boolean;
  error: string | null;
  question: string | null;
  answer: string | null;
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  suggestedFollowUps?: string[];
  history: AskAIHistoryItem[];
  privateAskProgress: number;
  privateAskPhase: 'loading_model' | 'processing';
};

const INITIAL_ASK_AI_STATE: AskAIState = {
  isLoading: false,
  isRestoringSession: false,
  error: null,
  question: null,
  answer: null,
  answerKind: undefined,
  items: undefined,
  evidence: undefined,
  suggestedFollowUps: undefined,
  history: [],
  privateAskProgress: 0,
  privateAskPhase: 'loading_model',
};

const askInFlightRecordIds = new Set<string>();

/** Undo history promotion from askQuestion start when the in-flight ask is cancelled. */
function applyAskCancelState(s: AskAIState, revertPromotedTurn: boolean): AskAIState {
  const idleFields = {
    isLoading: false as const,
    privateAskProgress: 0,
    privateAskPhase: 'loading_model' as const,
  };

  if (!revertPromotedTurn) {
    return { ...s, ...idleFields };
  }

  if (s.history.length > 0) {
    const restored = s.history[s.history.length - 1]!;
    return {
      ...s,
      history: s.history.slice(0, -1),
      question: restored.question,
      answer: restored.answer,
      answerKind: restored.answerKind,
      items: restored.items,
      evidence: restored.evidence,
      suggestedFollowUps: restored.suggestedFollowUps,
      error: null,
      ...idleFields,
    };
  }

  return {
    ...s,
    question: null,
    answer: null,
    answerKind: undefined,
    items: undefined,
    evidence: undefined,
    suggestedFollowUps: undefined,
    error: null,
    ...idleFields,
  };
}

export const useAskAI = (
  recordId: string,
  transcript: string,
  recordForResume?: VoiceRecord | null,
) => {
  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const aiModelRoutingMode = useSettingsStore((s) => s.aiModelRoutingMode);
  const selectedLocalAiModel = useSettingsStore((s) => s.selectedLocalAiModel);
  const localLlmModelStatuses = useSettingsStore((s) => s.localLlmModelStatuses);
  const summaryStyle = useSettingsStore((s) => s.summaryStyle);
  const taskStrictness = useSettingsStore((s) => s.taskStrictness);
  const aiOutputLanguage = useSettingsStore((s) => s.aiOutputLanguage);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateLocalLlmBudget = useSettingsStore((s) => s.privateLocalLlmBudget);
  const privateRemoteOutputBudget = useSettingsStore((s) => s.privateRemoteOutputBudget);
  const privateRemotePreferJsonObject = useSettingsStore((s) => s.privateRemotePreferJsonObject);
  const privateCapabilityTier = useSettingsStore((s) => s.privateCapabilityTier);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const privateRemoteBaseUrl = useSettingsStore((s) => s.privateRemoteBaseUrl);
  const privateRemoteApiKey = useSettingsStore((s) => s.privateRemoteApiKey);
  const privateRemoteModel = useSettingsStore((s) => s.privateRemoteModel);
  const cloudAiKvTtlSeconds = useSettingsStore((s) => s.cloudAiKvTtlSeconds);
  const effectivePrivateAiProvider = resolveEffectivePrivateAiProvider(
    privateAiProvider,
    isProActiveFromStorageSync(),
  );
  const effectiveLocalAiModelId = selectedLocalAiModel ?? DEFAULT_LOCAL_AI_MODEL_ID;
  const isLocalLlmModelDownloaded =
    selectedLocalAiModel != null &&
    (localLlmModelStatuses[selectedLocalAiModel] ?? 'not_downloaded') === 'downloaded';
  const [state, setState] = useState<AskAIState>(() => ({
    ...INITIAL_ASK_AI_STATE,
    isRestoringSession: Boolean(transcript.trim()),
  }));

  const inFlightRef = useRef(false);
  const abortHandlesRef = useRef<Map<string, AiAbortHandle>>(new Map());
  const activeCloudJobIdRef = useRef<string | null>(null);
  const transcriptFpInvalidateRef = useRef<string | null>(null);
  const loadEpochRef = useRef(0);
  const promotedTurnPendingRevertRef = useRef(false);
  const recordForResumeRef = useRef<VoiceRecord | null>(null);
  recordForResumeRef.current = recordForResume ?? null;

  const askQuestionRef = useRef<
    (record: VoiceRecord, question: string, priorTurns?: AskPriorTurn[]) => Promise<void>
  >(() => Promise.resolve());

  useEffect(() => {
    if (!transcript.trim()) return;

    const fp = askAiTranscriptFingerprint(transcript);

    if (transcriptFpInvalidateRef.current === null) {
      transcriptFpInvalidateRef.current = fp;
      return;
    }

    if (transcriptFpInvalidateRef.current === fp) return;

    transcriptFpInvalidateRef.current = fp;
    loadEpochRef.current += 1;
    setState({
      ...INITIAL_ASK_AI_STATE,
      isRestoringSession: Boolean(transcript.trim()),
    });
    void clearAskAiSession(recordId);
    useRecordStore.getState().setAskAiStatus(recordId, undefined);
  }, [recordId, transcript]);

  const syncAskSessionFromDb = useCallback(async () => {
    const trimmed = transcript.trim();
    if (!trimmed) return;

    const restored = await loadAskAiSession(recordId, transcript);
    if (!restored) return;

    setState((s) => {
      if (
        s.isLoading &&
        restored.question &&
        s.question === restored.question &&
        !restored.pendingAsk &&
        (Boolean(restored.answer?.trim()) || restored.error)
      ) {
        queueMicrotask(() => {
          const { setAskAiStatus } = useRecordStore.getState();
          if (restored.error?.trim()) setAskAiStatus(recordId, 'error');
          else setAskAiStatus(recordId, undefined);
        });
        return {
          ...s,
          history: restored.history,
          question: restored.question,
          answer: restored.answer,
          answerKind: restored.answerKind,
          items: restored.items,
          evidence: restored.evidence,
          suggestedFollowUps: restored.suggestedFollowUps,
          error: restored.error,
          isLoading: false,
          privateAskProgress: 0,
          privateAskPhase: 'loading_model',
        };
      }
      return s;
    });
  }, [recordId, transcript]);

  const askQuestion = useCallback(
    async (
      record: VoiceRecord,
      question: string,
      priorTurns: AskPriorTurn[] = [],
    ): Promise<void> => {
      if (!record.transcript || !question.trim()) return;
      if (inFlightRef.current) return;
      if (askInFlightRecordIds.has(record.id)) return;

      const requestId = `${record.id}-ask-${Date.now()}`;
      if (aiExecutionMode !== 'private_experimental') {
        activeCloudJobIdRef.current = requestId;
      }
      const trimmedQuestion = question.trim();
      const abortHandle = createAiAbortHandle();
      abortHandlesRef.current.set(record.id, abortHandle);
      registerAiGeneration(
        record.id,
        'ask',
        abortHandle,
        aiExecutionMode !== 'private_experimental' ? requestId : null,
      );
      inFlightRef.current = true;
      askInFlightRecordIds.add(record.id);

      setState((s) => {
        const didPromoteCurrentTurn = Boolean(s.question && s.answer);
        promotedTurnPendingRevertRef.current = didPromoteCurrentTurn;
        const nextHistory = didPromoteCurrentTurn
          ? [
              ...s.history,
              {
                question: s.question!,
                answer: s.answer!,
                ...(s.answerKind ? { answerKind: s.answerKind } : {}),
                ...(s.items?.length ? { items: s.items } : {}),
                ...(s.evidence?.length ? { evidence: s.evidence } : {}),
                ...(s.suggestedFollowUps?.length
                  ? { suggestedFollowUps: s.suggestedFollowUps }
                  : {}),
              },
            ]
          : s.history;
        const next: AskAIState = {
          ...s,
          history: nextHistory,
          isLoading: true,
          error: null,
          question: trimmedQuestion,
          answer: null,
          answerKind: undefined,
          items: undefined,
          evidence: undefined,
          suggestedFollowUps: undefined,
          privateAskProgress: aiExecutionMode === 'private_experimental' ? 0 : s.privateAskProgress,
          privateAskPhase:
            aiExecutionMode === 'private_experimental' &&
            effectivePrivateAiProvider === 'custom_openai'
              ? 'processing'
              : 'loading_model',
        };
        queueMicrotask(() => {
          void saveAskAiSession(record.id, record.transcript!, {
            history: next.history,
            question: next.question,
            answer: next.answer,
            answerKind: next.answerKind,
            items: next.items,
            evidence: next.evidence,
            suggestedFollowUps: next.suggestedFollowUps,
            error: next.error,
            isLoading: true,
          });
          useRecordStore.getState().setAskAiStatus(record.id, 'processing');
        });
        return next;
      });
      void logAnalyticsEvent('ai_action_started', {
        action: 'ask',
        mode: aiExecutionMode,
        tier: privateCapabilityTier,
      });

      const privateAskProgress = {
        lastDisplayedPct: -1,
        tokenEvents: 0,
        retryContinuationFloor: null as number | null,
      };
      const onLocalGenerationProgress =
        aiExecutionMode === 'private_experimental'
          ? (event: AiLocalGenerationProgressEvent) => {
              let pct = 0;
              let phase: 'loading_model' | 'processing' = 'loading_model';
              switch (event.kind) {
                case 'prepare_model_start':
                  if (privateAskProgress.tokenEvents > 0) {
                    privateAskProgress.retryContinuationFloor = privateAskProgress.lastDisplayedPct;
                  }
                  if (privateAskProgress.retryContinuationFloor != null) {
                    pct = privateAskProgress.retryContinuationFloor;
                    phase = 'processing';
                  } else {
                    pct = 2;
                    phase = 'loading_model';
                  }
                  break;
                case 'prepare_model_done':
                  phase = 'processing';
                  if (privateAskProgress.retryContinuationFloor != null) {
                    pct = Math.max(12, privateAskProgress.retryContinuationFloor);
                  } else {
                    pct = 12;
                  }
                  break;
                case 'completion_token': {
                  phase = 'processing';
                  privateAskProgress.tokenEvents += 1;
                  const genFrac = event.tokenIndex / event.nPredictBudget;
                  if (privateAskProgress.retryContinuationFloor != null) {
                    const span = 98 - privateAskProgress.retryContinuationFloor;
                    pct =
                      privateAskProgress.retryContinuationFloor +
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
              privateAskProgress.lastDisplayedPct = nextPct;
              setState((s) => ({
                ...s,
                privateAskProgress: nextPct,
                privateAskPhase: phase,
              }));
            }
          : undefined;

      const persistCancelledAsk = () => {
        setState((s) => {
          // cancelAsk already reverted UI + persistence; avoid racing it with revert=false.
          if (!s.isLoading) {
            return s;
          }
          const next = applyAskCancelState(s, promotedTurnPendingRevertRef.current);
          promotedTurnPendingRevertRef.current = false;
          queueMicrotask(() => {
            void saveAskAiSession(record.id, record.transcript!, {
              history: next.history,
              question: next.question,
              answer: next.answer,
              answerKind: next.answerKind,
              items: next.items,
              evidence: next.evidence,
              suggestedFollowUps: next.suggestedFollowUps,
              error: next.error,
              isLoading: next.isLoading,
            });
            useRecordStore.getState().setAskAiStatus(record.id, undefined);
          });
          return next;
        });
      };

      const persistOutcome = (
        patch: Partial<
          Pick<
            AskAIState,
            | 'answer'
            | 'answerKind'
            | 'items'
            | 'evidence'
            | 'suggestedFollowUps'
            | 'error'
            | 'isLoading'
          >
        >,
      ) => {
        setState((s) => {
          const next: AskAIState = {
            ...s,
            isLoading: patch.isLoading ?? s.isLoading,
            error: patch.error !== undefined ? patch.error : s.error,
            answer: patch.answer !== undefined ? patch.answer : s.answer,
            answerKind: patch.answerKind !== undefined ? patch.answerKind : s.answerKind,
            items: patch.items !== undefined ? patch.items : s.items,
            evidence: patch.evidence !== undefined ? patch.evidence : s.evidence,
            suggestedFollowUps:
              patch.suggestedFollowUps !== undefined
                ? patch.suggestedFollowUps
                : s.suggestedFollowUps,
            privateAskProgress: 0,
            privateAskPhase: 'loading_model',
          };
          if (patch.answer !== undefined && patch.answer?.trim()) {
            promotedTurnPendingRevertRef.current = false;
          }
          queueMicrotask(() => {
            void saveAskAiSession(record.id, record.transcript!, {
              history: next.history,
              question: next.question,
              answer: next.answer,
              answerKind: next.answerKind,
              items: next.items,
              evidence: next.evidence,
              suggestedFollowUps: next.suggestedFollowUps,
              error: next.error,
              isLoading: next.isLoading,
            });
            const { setAskAiStatus } = useRecordStore.getState();
            if (next.error?.trim()) setAskAiStatus(record.id, 'error');
            else setAskAiStatus(record.id, undefined);
          });
          return next;
        });
      };

      try {
        const recordingMarks = sanitizeRecordingMarksForPrompt(record.recordingMarks);

        const runResult = await AIOrchestrator.runAsk(
          {
            id: requestId,
            transcript: record.transcript,
            question: trimmedQuestion,
            ...(priorTurns.length > 0 ? { priorTurns } : {}),
            summary: record.summary ?? undefined,
            tasks: record.tasks?.map((t) => ({ text: t.text })) ?? undefined,
            ...(recordingMarks?.length ? { recordingMarks } : {}),
            onLocalGenerationProgress,
            abortSignal: abortHandle.signal,
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
            privateRemoteOutputBudget,
            privateRemotePreferJsonObject,
            privateCapabilityTier,
            privateAiProvider: effectivePrivateAiProvider,
            privateRemoteBaseUrl,
            privateRemoteApiKey,
            privateRemoteModel,
            cloudMessageTtlSeconds: cloudAiKvTtlSeconds,
          },
        );

        if (abortHandle.cancelled) {
          persistCancelledAsk();
          void logAnalyticsEvent('ai_action_cancelled', {
            action: 'ask',
            mode: aiExecutionMode,
            tier: privateCapabilityTier,
          });
          return;
        }

        if (!runResult.ok) {
          if (isAiRequestCancelled(runResult.error)) {
            persistCancelledAsk();
            void logAnalyticsEvent('ai_action_cancelled', {
              action: 'ask',
              mode: aiExecutionMode,
              tier: privateCapabilityTier,
            });
            return;
          }
          const errorMsg = runResult.limitExceeded
            ? getAiWeeklyLimitExceededMessage()
            : runResult.error;
          if (__DEV__)
            console.warn('[AI] askQuestion: runAsk failed', {
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
          persistOutcome({ isLoading: false, error: errorMsg, answer: null });
          void logAnalyticsEvent('ai_action_failed', {
            action: 'ask',
            reason: runResult.limitExceeded ? 'limit' : 'run',
            mode: runResult.mode,
            provider: runResult.provider,
            tier: privateCapabilityTier,
          });
          return;
        }

        persistOutcome({
          isLoading: false,
          error: null,
          answer: runResult.result.answer,
          answerKind: runResult.result.answerKind,
          items: runResult.result.items,
          evidence: runResult.result.evidence,
          suggestedFollowUps: runResult.result.suggestedFollowUps,
        });
        void logAnalyticsEvent('ai_action_success', {
          action: 'ask',
          mode: runResult.mode,
          provider: runResult.provider,
          tier: privateCapabilityTier,
        });
      } catch (err: unknown) {
        if (abortHandle.cancelled) {
          persistCancelledAsk();
          void logAnalyticsEvent('ai_action_cancelled', {
            action: 'ask',
            mode: aiExecutionMode,
            tier: privateCapabilityTier,
          });
          return;
        }
        if (__DEV__)
          console.warn('[AI] askQuestion: unexpected error', {
            recordId: record.id,
            error: err instanceof Error ? err.message : String(err),
          });
        persistOutcome({
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
          answer: null,
        });
        void logAnalyticsEvent('ai_action_failed', {
          action: 'ask',
          reason: 'exception',
          mode: aiExecutionMode,
          tier: privateCapabilityTier,
        });
      } finally {
        promotedTurnPendingRevertRef.current = false;
        unregisterAiGeneration(record.id, 'ask', abortHandle);
        abortHandlesRef.current.delete(record.id);
        activeCloudJobIdRef.current = null;
        inFlightRef.current = false;
        askInFlightRecordIds.delete(record.id);
      }
    },
    [
      selectedAIModel,
      aiModelRoutingMode,
      effectiveLocalAiModelId,
      isLocalLlmModelDownloaded,
      summaryStyle,
      taskStrictness,
      aiOutputLanguage,
      aiExecutionMode,
      privateLocalLlmBudget,
      privateRemoteOutputBudget,
      privateRemotePreferJsonObject,
      privateCapabilityTier,
      effectivePrivateAiProvider,
      privateRemoteBaseUrl,
      privateRemoteApiKey,
      privateRemoteModel,
      cloudAiKvTtlSeconds,
    ],
  );

  askQuestionRef.current = askQuestion;

  const cancelAsk = useCallback(() => {
    const registryAbort = abortAiGeneration(recordId, 'ask');
    abortHandlesRef.current.get(recordId)?.abort();
    abortHandlesRef.current.delete(recordId);

    const cloudJobId = registryAbort.cloudJobId ?? activeCloudJobIdRef.current;
    activeCloudJobIdRef.current = null;
    if (cloudJobId && aiExecutionMode !== 'private_experimental') {
      void cancelCloudAiJob(cloudJobId);
    }

    inFlightRef.current = false;
    askInFlightRecordIds.delete(recordId);

    setState((s) => {
      const next = applyAskCancelState(s, promotedTurnPendingRevertRef.current);
      promotedTurnPendingRevertRef.current = false;
      queueMicrotask(() => {
        const rec = useRecordStore.getState().records.find((r) => r.id === recordId);
        if (rec?.transcript?.trim()) {
          void saveAskAiSession(recordId, rec.transcript, {
            history: next.history,
            question: next.question,
            answer: next.answer,
            answerKind: next.answerKind,
            items: next.items,
            evidence: next.evidence,
            suggestedFollowUps: next.suggestedFollowUps,
            error: next.error,
            isLoading: false,
          });
        }
        useRecordStore.getState().setAskAiStatus(recordId, undefined);
      });
      return next;
    });

    if (useSettingsStore.getState().aiExecutionMode === 'private_experimental') {
      void releaseLocalLlmSession();
    }
  }, [recordId, aiExecutionMode]);

  useEffect(() => {
    const epochAtStart = loadEpochRef.current;
    let cancelled = false;
    void (async () => {
      const trimmedTranscript = transcript.trim();
      if (!trimmedTranscript) {
        setState((s) => ({
          ...s,
          isRestoringSession: false,
        }));
        return;
      }

      const restored = await loadAskAiSession(recordId, transcript);
      if (cancelled || epochAtStart !== loadEpochRef.current) return;
      if (!restored) {
        setState((s) => ({
          ...s,
          isRestoringSession: false,
        }));
        queueMicrotask(() => {
          if (cancelled || epochAtStart !== loadEpochRef.current) return;
          useRecordStore.getState().setAskAiStatus(recordId, undefined);
        });
        return;
      }

      const isPending = restored.pendingAsk === true;
      setState((s) => ({
        ...s,
        history: restored.history,
        question: restored.question,
        answer: restored.answer,
        answerKind: restored.answerKind,
        items: restored.items,
        evidence: restored.evidence,
        suggestedFollowUps: restored.suggestedFollowUps,
        error: restored.error,
        isLoading: isPending,
        isRestoringSession: false,
        privateAskProgress: 0,
        privateAskPhase: 'loading_model',
      }));

      queueMicrotask(() => {
        if (cancelled || epochAtStart !== loadEpochRef.current) return;

        const { setAskAiStatus } = useRecordStore.getState();

        if (isPending) setAskAiStatus(recordId, 'processing');
        else if (restored.error?.trim() && !restored.answer?.trim() && restored.question?.trim()) {
          setAskAiStatus(recordId, 'error');
        } else {
          setAskAiStatus(recordId, undefined);
        }
      });

      if (!isPending || !restored.question?.trim()) return;

      const rec = recordForResumeRef.current;
      if (!rec?.transcript?.trim()) return;

      queueMicrotask(() => {
        if (cancelled || epochAtStart !== loadEpochRef.current) return;
        if (askInFlightRecordIds.has(recordId)) {
          void syncAskSessionFromDb();
          return;
        }
        void askQuestionRef.current(rec, restored.question!, restored.history);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [recordId, transcript, syncAskSessionFromDb]);

  useEffect(() => {
    if (!state.isLoading) return;
    const id = setInterval(() => {
      void syncAskSessionFromDb();
    }, 900);
    return () => clearInterval(id);
  }, [state.isLoading, syncAskSessionFromDb]);

  useEffect(() => {
    const t = setTimeout(() => {
      void saveAskAiSession(recordId, transcript, {
        history: state.history,
        question: state.question,
        answer: state.answer,
        answerKind: state.answerKind,
        items: state.items,
        evidence: state.evidence,
        suggestedFollowUps: state.suggestedFollowUps,
        error: state.error,
        isLoading: state.isLoading,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [
    recordId,
    transcript,
    state.history,
    state.question,
    state.answer,
    state.answerKind,
    state.items,
    state.evidence,
    state.suggestedFollowUps,
    state.error,
    state.isLoading,
  ]);

  const reset = useCallback(() => {
    setState({
      ...INITIAL_ASK_AI_STATE,
      isRestoringSession: false,
    });
    void clearAskAiSession(recordId);
    useRecordStore.getState().setAskAiStatus(recordId, undefined);
  }, [recordId]);

  const askAnother = useCallback(() => {
    setState((s) => {
      const newHistory =
        s.question && s.answer
          ? [
              ...s.history,
              {
                question: s.question,
                answer: s.answer,
                ...(s.answerKind ? { answerKind: s.answerKind } : {}),
                ...(s.items?.length ? { items: s.items } : {}),
                ...(s.evidence?.length ? { evidence: s.evidence } : {}),
                ...(s.suggestedFollowUps?.length
                  ? { suggestedFollowUps: s.suggestedFollowUps }
                  : {}),
              },
            ]
          : s.history;
      return {
        ...s,
        question: null,
        answer: null,
        answerKind: undefined,
        items: undefined,
        evidence: undefined,
        suggestedFollowUps: undefined,
        history: newHistory,
      };
    });
  }, []);

  return { askQuestion, cancelAsk, reset, askAnother, syncAskSessionFromDb, ...state };
};
