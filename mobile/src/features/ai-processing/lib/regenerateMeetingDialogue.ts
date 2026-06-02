import { alertAiLimitExceeded } from '@/app/navigation/openPlanPaywall';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { DEFAULT_LOCAL_AI_MODEL_ID, useSettingsStore } from '@/entities/settings';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import { pruneSpeakerLabelsForDialogue } from '@/screens/recording-detail/lib/meetingSpeakerLabels';
import {
  pollAiMessage,
  postMeetingDialogueRetry,
  saveCloudSummarizePending,
} from '@/shared/lib/ai-api';
import { createAiAbortHandle, isAiGenerationCancelledError } from '@/shared/lib/ai-api/abort';
import { getAiWeeklyLimitExceededMessage } from '@/shared/lib/ai-api/limitUserMessage';
import { runLocalMeetingDialogue } from '@/shared/lib/ai-core/local-provider/localAiMeetingDialogue';
import { runPrivateRemoteMeetingDialogue } from '@/shared/lib/ai-core/privateRemoteProvider';
import type { AiExecutionContext } from '@/shared/lib/ai-core/types';
import {
  registerAiGeneration,
  unregisterAiGeneration,
} from '@/shared/lib/aiGenerationAbortRegistry';
import { toUserFacingFetchErrorMessage } from '@/shared/lib/fetch/userFacingFetchError';
import { i18n } from '@/shared/lib/i18n';
import { isNonNegativeFiniteNumber } from '@/shared/lib/type-guards';

import { clearCloudSummarizeInFlight, markCloudSummarizeInFlight } from './cloudSummarizeInFlight';

const MEETING_DIALOGUE_PROGRESS_START = 72;

function buildPrivateAiContext(settings: ReturnType<typeof useSettingsStore.getState>): {
  ctx: AiExecutionContext;
  isLocalLlmModelDownloaded: boolean;
} {
  const effectiveLocalAiModelId = settings.selectedLocalAiModel ?? DEFAULT_LOCAL_AI_MODEL_ID;
  const effectivePrivateAiProvider =
    isProActiveFromStorageSync() && settings.privateAiProvider === 'custom_openai'
      ? 'custom_openai'
      : 'local';
  const isLocalLlmModelDownloaded =
    settings.selectedLocalAiModel != null &&
    (settings.localLlmModelStatuses[effectiveLocalAiModelId] ?? 'not_downloaded') === 'downloaded';

  return {
    isLocalLlmModelDownloaded,
    ctx: {
      selectedAIModel: settings.selectedAIModel,
      aiModelRoutingMode: settings.aiModelRoutingMode,
      selectedLocalAiModel: effectiveLocalAiModelId,
      isLocalLlmModelDownloaded,
      summaryStyle: settings.summaryStyle,
      taskStrictness: settings.taskStrictness,
      aiOutputLanguage: settings.aiOutputLanguage,
      aiExecutionMode: 'private_experimental',
      privateLocalLlmBudget: settings.privateLocalLlmBudget,
      privateCapabilityTier: settings.privateCapabilityTier,
      privateAiProvider: effectivePrivateAiProvider,
      privateRemoteBaseUrl: settings.privateRemoteBaseUrl,
      privateRemoteApiKey: settings.privateRemoteApiKey,
      privateRemoteModel: settings.privateRemoteModel,
      cloudMessageTtlSeconds: settings.cloudAiKvTtlSeconds,
    },
  };
}

export type RegenerateMeetingDialogueDeps = {
  selectedAIModel: string;
  cloudAiKvTtlSeconds: number;
  setPrivateAiBatchUi: (
    id: string,
    patch: {
      privateAiBatchProgress?: number;
      privateAiBatchPhase?: 'loading_model' | 'processing';
      privateAiBatchProgressLabel?: string;
      privateAiBatchStartedAt?: number;
    },
  ) => void;
  clearPrivateAiBatchUi: (id: string) => void;
};

async function regeneratePrivateMeetingDialogue(
  record: VoiceRecord,
  deps: RegenerateMeetingDialogueDeps,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const settings = useSettingsStore.getState();
  const { ctx, isLocalLlmModelDownloaded } = buildPrivateAiContext(settings);

  const usesCustomRemoteProvider = ctx.privateAiProvider === 'custom_openai';

  if (!usesCustomRemoteProvider && !isLocalLlmModelDownloaded) {
    useRecordStore
      .getState()
      .setMeetingDialogueError(record.id, i18n.t('ai.privateModeModelNotDownloaded'));
    useRecordStore.getState().setMeetingDialogueStatus(record.id, 'failed');
    return;
  }

  const { setMeetingDialogueStatus, setMeetingDialogueError, updateAiExtras, setPrivateAiBatchUi } =
    useRecordStore.getState();

  const abortHandle = createAiAbortHandle();
  if (options?.signal) {
    if (options.signal.aborted) {
      abortHandle.abort();
    } else {
      options.signal.addEventListener('abort', () => abortHandle.abort(), { once: true });
    }
  }

  registerAiGeneration(record.id, 'summary', abortHandle, null);

  setMeetingDialogueStatus(record.id, 'processing');
  setMeetingDialogueError(record.id, undefined);
  await updateAiExtras(record.id, { meetingDialogue: null });

  const startedAt = Date.now();
  setPrivateAiBatchUi(record.id, {
    privateAiBatchProgress: MEETING_DIALOGUE_PROGRESS_START,
    privateAiBatchPhase: 'loading_model',
    privateAiBatchProgressLabel: i18n.t('recordingDetail.meetingDialogueProgressStepLabel'),
    privateAiBatchStartedAt: startedAt,
  });

  const transcriptSegments =
    (record.transcriptSegments?.length ?? 0) > 0
      ? record.transcriptSegments!.map((s) => ({
          ...(isNonNegativeFiniteNumber(s.startMs) ? { startMs: s.startMs } : {}),
          ...(isNonNegativeFiniteNumber(s.endMs) ? { endMs: s.endMs } : {}),
          text: s.text,
        }))
      : undefined;

  try {
    if (usesCustomRemoteProvider) {
      const dialogueResult = await runPrivateRemoteMeetingDialogue(
        {
          transcript: record.transcript ?? '',
          ...(transcriptSegments?.length ? { transcriptSegments } : {}),
          phase1: {
            suggestedTitle: record.title?.trim() || 'Meeting',
            summary: record.summary!.trim(),
            keyPhrases: record.keyPhrases,
          },
          abortSignal: abortHandle.signal,
        },
        ctx,
      );

      if (abortHandle.cancelled) return;

      if (!dialogueResult.ok) {
        setMeetingDialogueStatus(record.id, 'failed');
        setMeetingDialogueError(record.id, dialogueResult.error);
        return;
      }

      const md = dialogueResult.meetingDialogueMarkdown.trim();
      if (md) {
        const keptLabels = pruneSpeakerLabelsForDialogue(record.meetingSpeakerLabels, md);
        await updateAiExtras(record.id, {
          meetingDialogue: md,
          meetingSpeakerLabels: keptLabels ?? null,
        });
        setMeetingDialogueStatus(record.id, 'done');
        setMeetingDialogueError(record.id, undefined);
      } else {
        setMeetingDialogueStatus(record.id, 'idle');
        setMeetingDialogueError(record.id, undefined);
      }
      return;
    }

    const dialogueResult = await runLocalMeetingDialogue(
      {
        transcript: record.transcript ?? '',
        transcriptSegments,
        phase1: {
          suggestedTitle: record.title?.trim() || 'Meeting',
          summary: record.summary!.trim(),
          keyPhrases: record.keyPhrases,
        },
        abortSignal: abortHandle.signal,
        onLocalGenerationProgress: (event) => {
          if (abortHandle.cancelled) return;
          let pct = MEETING_DIALOGUE_PROGRESS_START;
          let phase: 'loading_model' | 'processing' = 'loading_model';
          if (event.kind === 'prepare_model_done') {
            phase = 'processing';
            pct = Math.max(MEETING_DIALOGUE_PROGRESS_START + 4, pct);
          } else if (event.kind === 'completion_token') {
            phase = 'processing';
            const span = 98 - MEETING_DIALOGUE_PROGRESS_START;
            const genFrac = event.tokenIndex / event.nPredictBudget;
            pct = MEETING_DIALOGUE_PROGRESS_START + Math.min(span, Math.floor(genFrac * span));
          }
          deps.setPrivateAiBatchUi(record.id, {
            privateAiBatchProgress: Math.min(98, pct),
            privateAiBatchPhase: phase,
            privateAiBatchProgressLabel: i18n.t('recordingDetail.meetingDialogueProgressStepLabel'),
          });
        },
      },
      ctx,
    );

    if (abortHandle.cancelled) return;

    if (!dialogueResult.ok) {
      setMeetingDialogueStatus(record.id, 'failed');
      setMeetingDialogueError(record.id, dialogueResult.error);
      return;
    }

    const md = dialogueResult.meetingDialogueMarkdown.trim();
    if (md) {
      const keptLabels = pruneSpeakerLabelsForDialogue(record.meetingSpeakerLabels, md);
      await updateAiExtras(record.id, {
        meetingDialogue: md,
        meetingSpeakerLabels: keptLabels ?? null,
      });
      setMeetingDialogueStatus(record.id, 'done');
      setMeetingDialogueError(record.id, undefined);
    } else {
      setMeetingDialogueStatus(record.id, 'idle');
      setMeetingDialogueError(record.id, undefined);
    }
  } finally {
    deps.clearPrivateAiBatchUi(record.id);
    unregisterAiGeneration(record.id, 'summary', abortHandle);
  }
}

export async function regenerateMeetingDialogue(
  record: VoiceRecord,
  deps: RegenerateMeetingDialogueDeps,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const isProActive = isProActiveFromStorageSync();
  const settings = useSettingsStore.getState();
  if (!isProActive) {
    return;
  }
  if (record.classification !== 'meeting') {
    return;
  }
  if (!record.summary?.trim()) {
    return;
  }

  if (settings.aiExecutionMode === 'private_experimental') {
    await regeneratePrivateMeetingDialogue(record, deps, options);
    return;
  }

  const jobId = record.cloudAiJobId?.trim();
  if (!jobId) {
    return;
  }

  const {
    setMeetingDialogueStatus,
    setMeetingDialogueError,
    updateAiExtras,
    setPrivateAiBatchUi,
    clearPrivateAiBatchUi,
  } = useRecordStore.getState();

  const abortHandle = createAiAbortHandle();
  if (options?.signal) {
    if (options.signal.aborted) {
      abortHandle.abort();
    } else {
      options.signal.addEventListener('abort', () => abortHandle.abort(), { once: true });
    }
  }

  markCloudSummarizeInFlight(record.id);
  registerAiGeneration(record.id, 'summary', abortHandle, jobId);

  setMeetingDialogueStatus(record.id, 'processing');
  setMeetingDialogueError(record.id, undefined);
  await updateAiExtras(record.id, { meetingDialogue: null });

  const startedAt = Date.now();
  setPrivateAiBatchUi(record.id, {
    privateAiBatchProgress: MEETING_DIALOGUE_PROGRESS_START,
    privateAiBatchPhase: 'processing',
    privateAiBatchProgressLabel: i18n.t('recordingDetail.meetingDialogueProgressStepLabel'),
    privateAiBatchStartedAt: startedAt,
  });

  const transcriptSegments =
    (record.transcriptSegments?.length ?? 0) > 0
      ? record.transcriptSegments!.map((s) => ({
          ...(isNonNegativeFiniteNumber(s.startMs) ? { startMs: s.startMs } : {}),
          ...(isNonNegativeFiniteNumber(s.endMs) ? { endMs: s.endMs } : {}),
          text: s.text,
        }))
      : undefined;

  try {
    const postResult = await postMeetingDialogueRetry(
      jobId,
      {
        transcript: record.transcript,
        ...(transcriptSegments?.length ? { transcriptSegments } : {}),
        model: deps.selectedAIModel,
        options: { processingPreset: 'meeting', outputLanguage: settings.aiOutputLanguage },
        messageTtlSeconds: deps.cloudAiKvTtlSeconds,
        phase1: {
          suggestedTitle: record.title?.trim() || 'Meeting',
          summary: record.summary!.trim(),
          ...(record.keyPhrases?.length ? { keyPhrases: record.keyPhrases } : {}),
        },
      },
      { signal: abortHandle.signal },
    );

    if (abortHandle.cancelled) return;

    const alreadyProcessingOnServer =
      !postResult.ok &&
      !postResult.limitExceeded &&
      /already processing/i.test(postResult.error ?? '');

    if (!postResult.ok && !alreadyProcessingOnServer) {
      const errorMsg = postResult.limitExceeded
        ? getAiWeeklyLimitExceededMessage()
        : toUserFacingFetchErrorMessage(postResult.error);
      if (postResult.limitExceeded) {
        alertAiLimitExceeded(errorMsg);
      }
      setMeetingDialogueStatus(record.id, 'failed');
      setMeetingDialogueError(record.id, errorMsg);
      return;
    }

    const syncToken = postResult.ok ? postResult.data.syncToken : undefined;

    await saveCloudSummarizePending({
      recordId: record.id,
      jobId,
      syncToken,
      expectAsyncMeetingDialogue: true,
      expiresAtMs: Date.now() + deps.cloudAiKvTtlSeconds * 1000,
    });

    const pollResult = await pollAiMessage(jobId, syncToken, {
      signal: abortHandle.signal,
      expectAsyncMeetingDialogue: true,
    });

    if (abortHandle.cancelled) return;

    if (!pollResult.ok) {
      if (isAiGenerationCancelledError(pollResult.error)) return;
      setMeetingDialogueStatus(record.id, 'failed');
      setMeetingDialogueError(
        record.id,
        pollResult.error?.trim() || i18n.t('recordingDetail.meetingDialogueFailedDesc'),
      );
      return;
    }

    const md = pollResult.result.meetingDialogueMarkdown?.trim();
    if (md) {
      const keptLabels = pruneSpeakerLabelsForDialogue(record.meetingSpeakerLabels, md);
      await updateAiExtras(record.id, {
        meetingDialogue: md,
        meetingSpeakerLabels: keptLabels ?? null,
      });
      setMeetingDialogueStatus(record.id, 'done');
      setMeetingDialogueError(record.id, undefined);
    } else if (pollResult.meetingDialogueStatus === 'failed') {
      setMeetingDialogueStatus(record.id, 'failed');
      setMeetingDialogueError(record.id, i18n.t('recordingDetail.meetingDialogueFailedDesc'));
    } else {
      setMeetingDialogueStatus(record.id, 'idle');
    }
  } finally {
    clearPrivateAiBatchUi(record.id);
    clearCloudSummarizeInFlight(record.id);
    unregisterAiGeneration(record.id, 'summary', abortHandle);
  }
}
