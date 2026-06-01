import { alertAiLimitExceeded } from '@/app/navigation/openPlanPaywall';
import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import {
  pollAiMessage,
  postMeetingDialogueRetry,
  saveCloudSummarizePending,
} from '@/shared/lib/ai-api';
import { createAiAbortHandle, isAiGenerationCancelledError } from '@/shared/lib/ai-api/abort';
import { getAiWeeklyLimitExceededMessage } from '@/shared/lib/ai-api/limitUserMessage';
import {
  registerAiGeneration,
  unregisterAiGeneration,
} from '@/shared/lib/aiGenerationAbortRegistry';
import { toUserFacingFetchErrorMessage } from '@/shared/lib/fetch/userFacingFetchError';
import { i18n } from '@/shared/lib/i18n';
import { isNonNegativeFiniteNumber } from '@/shared/lib/type-guards';

import { clearCloudSummarizeInFlight, markCloudSummarizeInFlight } from './cloudSummarizeInFlight';

const CLOUD_MEETING_DIALOGUE_PROGRESS_START = 72;

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

export async function regenerateMeetingDialogue(
  record: VoiceRecord,
  deps: RegenerateMeetingDialogueDeps,
  options?: { signal?: AbortSignal },
): Promise<void> {
  const isProActive = isProActiveFromStorageSync();
  const settings = useSettingsStore.getState();
  if (!isProActive || settings.aiExecutionMode === 'private_experimental') {
    return;
  }
  if (record.classification !== 'meeting') {
    return;
  }
  if (!record.summary?.trim()) {
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
  await updateAiExtras(record.id, {
    meetingDialogue: null,
    meetingSpeakerLabels: null,
  });

  const startedAt = Date.now();
  setPrivateAiBatchUi(record.id, {
    privateAiBatchProgress: CLOUD_MEETING_DIALOGUE_PROGRESS_START,
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
      },
      { signal: abortHandle.signal },
    );

    if (abortHandle.cancelled) return;

    if (!postResult.ok) {
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

    await saveCloudSummarizePending({
      recordId: record.id,
      jobId,
      syncToken: postResult.data.syncToken,
      expectAsyncMeetingDialogue: true,
      expiresAtMs: Date.now() + deps.cloudAiKvTtlSeconds * 1000,
    });

    const pollResult = await pollAiMessage(jobId, postResult.data.syncToken, {
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
      await updateAiExtras(record.id, { meetingDialogue: md, meetingSpeakerLabels: null });
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
