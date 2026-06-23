import { useCallback, useEffect, useRef, useState } from 'react';

import { alertAiLimitExceeded } from '@/app/navigation/openPlanPaywall';
import { recordRepository, useRecordStore } from '@/entities/record';
import {
  DEFAULT_LOCAL_AI_MODEL_ID,
  resolveEffectivePrivateAiProvider,
  useSettingsStore,
} from '@/entities/settings';
import { enrichInboxAskEvidence } from '@/features/inbox-ask/lib/enrichInboxAskEvidence';
import {
  countInboxAskCorpusRecords,
  type InboxAskRetrievalScope,
  prepareInboxAskQueryEmbedding,
  retrieveNotesForInboxAsk,
} from '@/features/inbox-ask-retrieval';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import { createAiAbortHandle, isAiRequestCancelled } from '@/shared/lib/ai-api/abort';
import { cancelCloudAiJob } from '@/shared/lib/ai-api/cancelCloudAiJob';
import { getAiWeeklyLimitExceededMessage } from '@/shared/lib/ai-api/limitUserMessage';
import type { AskPriorTurn } from '@/shared/lib/ai-core';
import { AIOrchestrator } from '@/shared/lib/ai-core';
import { INBOX_ASK_MAX_PAYLOAD_CHARS } from '@/shared/lib/ai-core/corpusNotesForPrompt';
import { mapLocalError } from '@/shared/lib/ai-core/local-provider/localAiMapError';
import type { AskAnswerKind, AskEvidence } from '@/shared/lib/ai-core/types';
import {
  abortAiGeneration,
  registerAiGeneration,
  unregisterAiGeneration,
} from '@/shared/lib/aiGenerationAbortRegistry';
import { logAnalyticsEvent } from '@/shared/lib/analytics';
import { diagWarn } from '@/shared/lib/appLogger';
import { i18n } from '@/shared/lib/i18n';

import {
  buildInboxAskSessionKey,
  clearInboxAskSession,
  inboxAskCorpusFingerprint,
  type InboxAskSessionPersistInput,
  loadInboxAskSession,
  saveInboxAskSession,
} from './inboxAskSessionDb';

export type InboxAskHistoryItem = {
  question: string;
  answer: string;
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  interpretations?: string[];
  suggestedFollowUps?: string[];
};

export type InboxAskPhase = 'idle' | 'retrieving' | 'generating';

export type InboxAskState = {
  isLoading: boolean;
  isRestoringSession: boolean;
  phase: InboxAskPhase;
  error: string | null;
  question: string | null;
  answer: string | null;
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  interpretations?: string[];
  suggestedFollowUps?: string[];
  history: InboxAskHistoryItem[];
  notesUsed: number;
  notesTotal: number;
  notesDropped: number;
  lastUsedNotes: Array<{ recordId: string; title: string }>;
};

const INITIAL_STATE: InboxAskState = {
  isLoading: false,
  isRestoringSession: true,
  phase: 'idle',
  error: null,
  question: null,
  answer: null,
  history: [],
  notesUsed: 0,
  notesTotal: 0,
  notesDropped: 0,
  lastUsedNotes: [],
};

const INBOX_ASK_GENERATION_KEY = 'inbox-ask';

const inboxAskInFlightSessions = new Set<string>();

/** Undo history promotion from askQuestion start when the in-flight ask is cancelled. */
function applyInboxAskCancelState(s: InboxAskState, revertPromotedTurn: boolean): InboxAskState {
  const idleFields = {
    isLoading: false as const,
    phase: 'idle' as const,
    error: null,
  };

  if (!revertPromotedTurn) {
    return {
      ...s,
      ...idleFields,
      question: null,
      answer: null,
      answerKind: undefined,
      items: undefined,
      evidence: undefined,
      interpretations: undefined,
      suggestedFollowUps: undefined,
    };
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
      interpretations: restored.interpretations,
      suggestedFollowUps: restored.suggestedFollowUps,
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
    interpretations: undefined,
    suggestedFollowUps: undefined,
    ...idleFields,
  };
}

function trimPriorTurns(history: InboxAskHistoryItem[]): AskPriorTurn[] {
  return history.slice(-6).map((turn) => ({
    question: turn.question.slice(0, 800),
    answer: turn.answer.slice(0, 2000),
  }));
}

function toPersistInput(state: InboxAskState): InboxAskSessionPersistInput {
  return {
    history: state.history,
    question: state.question,
    answer: state.answer,
    answerKind: state.answerKind,
    items: state.items,
    evidence: state.evidence,
    interpretations: state.interpretations,
    suggestedFollowUps: state.suggestedFollowUps,
    error: state.error,
    isLoading: state.isLoading,
    lastUsedNotes: state.lastUsedNotes,
    notesUsed: state.notesUsed,
    notesTotal: state.notesTotal,
    notesDropped: state.notesDropped,
  };
}

export function useInboxAsk(scope?: InboxAskRetrievalScope) {
  const sessionKey = buildInboxAskSessionKey(scope);
  const records = useRecordStore((s) => s.records);
  const [state, setState] = useState<InboxAskState>(INITIAL_STATE);
  const embeddingsRef = useRef<Map<string, number[]>>(new Map());
  const abortHandlesRef = useRef(new Map<string, ReturnType<typeof createAiAbortHandle>>());
  const inFlightRef = useRef(false);
  const lastCorpusFpRef = useRef('0');
  const loadEpochRef = useRef(0);
  const askQuestionRef = useRef<(question: string) => void>(() => {});
  const promotedTurnPendingRevertRef = useRef(false);

  const resolveCorpusTotal = useCallback(
    () => countInboxAskCorpusRecords(records, scope),
    [records, scope],
  );

  useEffect(() => {
    const total = resolveCorpusTotal();
    setState((prev) => {
      if (prev.isLoading) return prev;
      if (prev.question && prev.answer) return prev;
      return { ...prev, notesTotal: total };
    });
  }, [resolveCorpusTotal]);

  const persistSnapshot = useCallback(
    (next: InboxAskState, corpusFp?: string) => {
      const fp = corpusFp ?? lastCorpusFpRef.current;
      if (corpusFp) lastCorpusFpRef.current = corpusFp;
      void saveInboxAskSession(sessionKey, fp, toPersistInput(next));
    },
    [sessionKey],
  );

  const syncInboxAskSessionFromDb = useCallback(async () => {
    const restored = await loadInboxAskSession(sessionKey);
    if (!restored) return;

    setState((s) => {
      if (
        s.isLoading &&
        restored.question &&
        s.question === restored.question &&
        !restored.pendingAsk &&
        (Boolean(restored.answer?.trim()) || restored.error)
      ) {
        return {
          ...s,
          history: restored.history,
          question: restored.question,
          answer: restored.answer,
          answerKind: restored.answerKind,
          items: restored.items,
          evidence: restored.evidence,
          interpretations: restored.interpretations,
          suggestedFollowUps: restored.suggestedFollowUps,
          error: restored.error,
          isLoading: false,
          phase: 'idle',
          notesUsed: restored.notesUsed ?? s.notesUsed,
          notesTotal: restored.notesTotal ?? s.notesTotal,
          notesDropped: restored.notesDropped ?? s.notesDropped,
          lastUsedNotes: restored.lastUsedNotes ?? s.lastUsedNotes,
        };
      }
      return s;
    });
  }, [sessionKey]);

  useEffect(() => {
    const epochAtStart = loadEpochRef.current;
    let cancelled = false;

    void (async () => {
      const restored = await loadInboxAskSession(sessionKey);
      if (cancelled || epochAtStart !== loadEpochRef.current) return;

      if (restored) {
        if (restored.corpusFp) lastCorpusFpRef.current = restored.corpusFp;

        const isPending = restored.pendingAsk === true;
        setState({
          isLoading: isPending,
          isRestoringSession: false,
          phase: isPending ? 'generating' : 'idle',
          error: restored.error,
          question: restored.question,
          answer: restored.answer,
          answerKind: restored.answerKind,
          items: restored.items,
          evidence: restored.evidence,
          interpretations: restored.interpretations,
          suggestedFollowUps: restored.suggestedFollowUps,
          history: restored.history,
          notesUsed: restored.notesUsed ?? 0,
          notesTotal: restored.notesTotal ?? resolveCorpusTotal(),
          notesDropped: restored.notesDropped ?? 0,
          lastUsedNotes: restored.lastUsedNotes ?? [],
        });

        if (!isPending || !restored.question?.trim()) return;

        queueMicrotask(() => {
          if (cancelled || epochAtStart !== loadEpochRef.current) return;
          if (inboxAskInFlightSessions.has(sessionKey)) {
            void syncInboxAskSessionFromDb();
            return;
          }
          void askQuestionRef.current(restored.question!.trim());
        });
        return;
      }

      setState((prev) => ({
        ...prev,
        isRestoringSession: false,
        notesTotal: resolveCorpusTotal(),
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionKey, syncInboxAskSessionFromDb, resolveCorpusTotal]);

  useEffect(() => {
    void recordRepository.getEmbeddingsForActiveRecords().then((map) => {
      embeddingsRef.current = map;
    });
  }, []);

  useEffect(() => {
    if (!state.isLoading) return;
    const id = setInterval(() => {
      void syncInboxAskSessionFromDb();
    }, 900);
    return () => clearInterval(id);
  }, [state.isLoading, syncInboxAskSessionFromDb]);

  useEffect(() => {
    if (state.isRestoringSession) return;
    const t = setTimeout(() => {
      persistSnapshot(state);
    }, 400);
    return () => clearTimeout(t);
  }, [
    persistSnapshot,
    state,
    state.answer,
    state.answerKind,
    state.error,
    state.evidence,
    state.history,
    state.interpretations,
    state.isLoading,
    state.isRestoringSession,
    state.items,
    state.lastUsedNotes,
    state.notesDropped,
    state.notesTotal,
    state.notesUsed,
    state.question,
    state.suggestedFollowUps,
  ]);

  const askQuestion = useCallback(
    async (questionText: string) => {
      const trimmedQuestion = questionText.trim();
      if (!trimmedQuestion) return;
      if (inFlightRef.current) return;
      if (inboxAskInFlightSessions.has(sessionKey)) return;

      const settings = useSettingsStore.getState();
      const effectivePrivateAiProvider = resolveEffectivePrivateAiProvider(
        settings.privateAiProvider,
        isProActiveFromStorageSync(),
      );

      const records = useRecordStore.getState().records;
      const requestId = `inbox-ask-${Date.now()}`;
      const abortHandle = createAiAbortHandle();
      abortHandlesRef.current.set(INBOX_ASK_GENERATION_KEY, abortHandle);
      registerAiGeneration(
        INBOX_ASK_GENERATION_KEY,
        'ask',
        abortHandle,
        settings.aiExecutionMode !== 'private_experimental' ? requestId : null,
      );
      inFlightRef.current = true;
      inboxAskInFlightSessions.add(sessionKey);

      let priorHistory: InboxAskHistoryItem[] = [];
      setState((prev) => {
        priorHistory = [...prev.history];
        const didPromoteCurrentTurn = Boolean(prev.question && prev.answer);
        promotedTurnPendingRevertRef.current = didPromoteCurrentTurn;
        if (didPromoteCurrentTurn) {
          priorHistory.push({
            question: prev.question!,
            answer: prev.answer!,
            answerKind: prev.answerKind,
            items: prev.items,
            evidence: prev.evidence,
            interpretations: prev.interpretations,
            suggestedFollowUps: prev.suggestedFollowUps,
          });
        }
        return {
          ...prev,
          isLoading: true,
          phase: 'retrieving',
          error: null,
          question: trimmedQuestion,
          answer: null,
          answerKind: undefined,
          items: undefined,
          evidence: undefined,
          interpretations: undefined,
          suggestedFollowUps: undefined,
          history: priorHistory,
        };
      });

      void logAnalyticsEvent('inbox_ask_started', { sessionKey });

      let corpusFp = lastCorpusFpRef.current;

      const persistCancelledAsk = () => {
        setState((s) => {
          if (!s.isLoading) {
            return s;
          }
          const next = applyInboxAskCancelState(s, promotedTurnPendingRevertRef.current);
          promotedTurnPendingRevertRef.current = false;
          queueMicrotask(() => {
            persistSnapshot(next);
          });
          return next;
        });
      };

      try {
        const queryEmbedding = await prepareInboxAskQueryEmbedding(trimmedQuestion);
        embeddingsRef.current = await recordRepository.getEmbeddingsForActiveRecords();
        const retrieval = retrieveNotesForInboxAsk({
          question: trimmedQuestion,
          records,
          embeddingsById: embeddingsRef.current,
          queryEmbedding,
          scope,
        });

        if (retrieval.notes.length === 0) {
          setState((prev) => {
            const next = {
              ...prev,
              isLoading: false,
              phase: 'idle' as const,
              error: i18n.t('inboxAsk.noRelevantNotes'),
              answer: null,
            };
            persistSnapshot(next);
            return next;
          });
          return;
        }

        corpusFp = inboxAskCorpusFingerprint(retrieval.notes);
        const lastUsedNotes = retrieval.notes.map((note) => ({
          recordId: note.recordId,
          title: note.title,
        }));

        setState((prev) => ({
          ...prev,
          phase: 'generating',
          notesUsed: retrieval.notes.length,
          notesTotal: retrieval.totalCorpusCount,
          notesDropped: retrieval.droppedCount,
          lastUsedNotes,
        }));

        void logAnalyticsEvent('inbox_ask_notes_retrieved', {
          notesUsed: retrieval.notes.length,
          notesTotal: retrieval.totalCorpusCount,
          retrievalMode: retrieval.retrievalMode,
        });

        const runResult = await AIOrchestrator.runInboxAsk(
          {
            id: requestId,
            question: trimmedQuestion,
            corpusNotes: retrieval.notes,
            priorTurns: trimPriorTurns(priorHistory),
            abortSignal: abortHandle.signal,
          },
          {
            selectedAIModel: settings.selectedAIModel,
            aiModelRoutingMode: settings.aiModelRoutingMode,
            selectedLocalAiModel: settings.selectedLocalAiModel ?? DEFAULT_LOCAL_AI_MODEL_ID,
            isLocalLlmModelDownloaded: false,
            summaryStyle: settings.summaryStyle,
            taskStrictness: settings.taskStrictness,
            aiOutputLanguage: settings.aiOutputLanguage,
            aiExecutionMode: settings.aiExecutionMode,
            privateLocalLlmBudget: settings.privateLocalLlmBudget,
            privateRemoteOutputBudget: settings.privateRemoteOutputBudget,
            privateRemotePreferJsonObject: settings.privateRemotePreferJsonObject,
            privateCapabilityTier: settings.privateCapabilityTier,
            privateAiProvider: effectivePrivateAiProvider,
            privateRemoteBaseUrl: settings.privateRemoteBaseUrl,
            privateRemoteApiKey: settings.privateRemoteApiKey,
            privateRemoteModel: settings.privateRemoteModel,
            cloudMessageTtlSeconds: settings.cloudAiKvTtlSeconds,
          },
        );

        if (abortHandle.cancelled) {
          persistCancelledAsk();
          return;
        }

        if (!runResult.ok) {
          const errorMsg = runResult.limitExceeded
            ? getAiWeeklyLimitExceededMessage()
            : runResult.error;
          if (runResult.limitExceeded) alertAiLimitExceeded(errorMsg);
          if (isAiRequestCancelled(errorMsg)) {
            void logAnalyticsEvent('ai_action_cancelled', {
              action: 'inbox_ask',
              mode: settings.aiExecutionMode,
              tier: settings.privateCapabilityTier,
            });
            persistCancelledAsk();
            return;
          }
          void logAnalyticsEvent('ai_action_failed', {
            action: 'inbox_ask',
            mode: runResult.mode ?? settings.aiExecutionMode,
            provider: runResult.provider,
            tier: settings.privateCapabilityTier,
          });
          setState((prev) => {
            const next = { ...prev, isLoading: false, phase: 'idle' as const, error: errorMsg };
            persistSnapshot(next, corpusFp);
            return next;
          });
          return;
        }

        promotedTurnPendingRevertRef.current = false;

        const enrichedEvidence = enrichInboxAskEvidence(runResult.result.evidence, lastUsedNotes);

        setState((prev) => {
          const next: InboxAskState = {
            ...prev,
            isLoading: false,
            phase: 'idle',
            error: null,
            answer: runResult.result.answer,
            answerKind: runResult.result.answerKind,
            items: runResult.result.items,
            evidence: enrichedEvidence,
            interpretations: runResult.result.interpretations,
            suggestedFollowUps: runResult.result.suggestedFollowUps,
          };
          persistSnapshot(next, corpusFp);
          return next;
        });

        void logAnalyticsEvent('ai_action_success', {
          action: 'inbox_ask',
          mode: runResult.mode,
          provider: runResult.provider,
          tier: settings.privateCapabilityTier,
          notes_used: retrieval.notes.length,
        });
      } catch (err) {
        if (abortHandle.cancelled) {
          void logAnalyticsEvent('ai_action_cancelled', {
            action: 'inbox_ask',
            mode: settings.aiExecutionMode,
            tier: settings.privateCapabilityTier,
          });
          persistCancelledAsk();
          return;
        }
        if (err instanceof Error && isAiRequestCancelled(err.message)) {
          void logAnalyticsEvent('ai_action_cancelled', {
            action: 'inbox_ask',
            mode: settings.aiExecutionMode,
            tier: settings.privateCapabilityTier,
          });
          persistCancelledAsk();
          return;
        }
        diagWarn('[AI] useInboxAsk askQuestion failed', err);
        void logAnalyticsEvent('ai_action_failed', {
          action: 'inbox_ask',
          mode: settings.aiExecutionMode,
          tier: settings.privateCapabilityTier,
        });
        setState((prev) => {
          const next = {
            ...prev,
            isLoading: false,
            phase: 'idle' as const,
            error: mapLocalError(err),
          };
          persistSnapshot(next, corpusFp);
          return next;
        });
      } finally {
        inFlightRef.current = false;
        inboxAskInFlightSessions.delete(sessionKey);
        unregisterAiGeneration(INBOX_ASK_GENERATION_KEY, 'ask', abortHandle);
        abortHandlesRef.current.delete(INBOX_ASK_GENERATION_KEY);
      }
    },
    [persistSnapshot, scope, sessionKey],
  );

  useEffect(() => {
    askQuestionRef.current = (question: string) => {
      void askQuestion(question);
    };
  }, [askQuestion]);

  const cancelAsk = useCallback(() => {
    const settings = useSettingsStore.getState();
    const { cloudJobId } = abortAiGeneration(INBOX_ASK_GENERATION_KEY, 'ask');
    abortHandlesRef.current.get(INBOX_ASK_GENERATION_KEY)?.abort();
    abortHandlesRef.current.delete(INBOX_ASK_GENERATION_KEY);
    if (cloudJobId) {
      void cancelCloudAiJob(cloudJobId);
    }
    inFlightRef.current = false;
    inboxAskInFlightSessions.delete(sessionKey);

    setState((s) => {
      const next = applyInboxAskCancelState(s, promotedTurnPendingRevertRef.current);
      promotedTurnPendingRevertRef.current = false;
      queueMicrotask(() => {
        persistSnapshot(next);
      });
      return next;
    });
    void logAnalyticsEvent('ai_action_cancelled', {
      action: 'inbox_ask',
      mode: settings.aiExecutionMode,
      tier: settings.privateCapabilityTier,
    });
  }, [persistSnapshot, sessionKey]);

  const reset = useCallback(async () => {
    loadEpochRef.current += 1;
    await clearInboxAskSession(sessionKey);
    lastCorpusFpRef.current = '0';
    setState({
      ...INITIAL_STATE,
      isRestoringSession: false,
      notesTotal: resolveCorpusTotal(),
    });
  }, [sessionKey, resolveCorpusTotal]);

  return {
    ...state,
    askQuestion,
    cancelAsk,
    reset,
    syncInboxAskSessionFromDb,
    maxPayloadChars: INBOX_ASK_MAX_PAYLOAD_CHARS,
  };
}
