import type { MeetingDialogueLoadStatus, VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { useSettingsStore } from '@/entities/settings';
import { applyAiSummaryResult } from '@/features/ai-processing/lib/applyAiSummaryResult';
import { markUnreadAfterSummaryRegenerationIfNeeded } from '@/features/ai-processing/lib/markUnreadAfterSummaryRegeneration';
import { generateAndSaveEmbeddingForRecord } from '@/features/embedding-generation';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import type { AiProcessingResult, ServerMeetingDialogueStatus } from '@/shared/lib/ai-api';
import {
  clearCloudSummarizePending,
  type CloudSummarizePendingJob,
  fetchAiMessageOnce,
  resumePollAiMessage,
} from '@/shared/lib/ai-api';
import { toUserFacingFetchErrorMessage } from '@/shared/lib/fetch/userFacingFetchError';
import { i18n } from '@/shared/lib/i18n';

import { isCloudSummarizeInFlight } from './cloudSummarizeInFlight';

function resolveMeetingDialogueUiStatus(
  meetingDialogueMarkdown: string | undefined,
  pollStatus?: ServerMeetingDialogueStatus,
): MeetingDialogueLoadStatus {
  if (pollStatus === 'failed') return 'failed';
  if (meetingDialogueMarkdown?.trim()) return 'done';
  if (pollStatus === 'processing') return 'processing';
  return 'idle';
}

function shouldSkipResume(record: VoiceRecord | undefined): boolean {
  if (!record?.transcript?.trim()) return true;
  if (isCloudSummarizeInFlight(record.id)) return true;
  const hasSummary = Boolean(record.summary?.trim());
  const mdPending = record.meetingDialogueStatus === 'processing';
  return hasSummary && !mdPending;
}

async function applyPollSuccess(
  record: VoiceRecord,
  result: AiProcessingResult,
  meetingDialogueStatus: ServerMeetingDialogueStatus | undefined,
  expectAsyncMeetingDialogue: boolean,
  wasSummaryRegeneration: boolean,
): Promise<void> {
  const settings = useSettingsStore.getState();
  const isProActive = isProActiveFromStorageSync();
  const {
    setSummaryStatus,
    setTasksStatus,
    setSummaryError,
    setTasksError,
    setMeetingDialogueStatus,
    setMeetingDialogueError,
    updateSummary,
    updateTasks,
    updateTags,
    updateAiExtras,
    renameRecord,
  } = useRecordStore.getState();

  const recordIsMeeting = (record.classification ?? 'other') === 'meeting';
  const includeMeetingSpeakerBreakdown =
    expectAsyncMeetingDialogue && isProActive && recordIsMeeting;

  const getLatestRecord = (id: string) =>
    useRecordStore.getState().records.find((r) => r.id === id);

  const summaryAlreadyOnDevice =
    getLatestRecord(record.id)?.summaryStatus === 'done' &&
    Boolean(getLatestRecord(record.id)?.summary?.trim());

  if (!summaryAlreadyOnDevice) {
    await applyAiSummaryResult({
      record,
      result,
      isProActive,
      recordIsMeeting,
      includeMeetingSpeakerBreakdown,
      aiExecutionMode: settings.aiExecutionMode,
      effectiveLocalAiModelId: settings.selectedLocalAiModel ?? 'default',
      generationStartedAt: Date.now(),
      updateSummary,
      updateTasks,
      updateTags,
      updateAiExtras,
      renameRecord,
      getLatestRecord,
    });
  } else if (includeMeetingSpeakerBreakdown && result.meetingDialogueMarkdown?.trim()) {
    await updateAiExtras(record.id, {
      meetingDialogue: result.meetingDialogueMarkdown.trim(),
    });
  }

  if (includeMeetingSpeakerBreakdown) {
    if (meetingDialogueStatus === 'skipped') {
      setMeetingDialogueStatus(record.id, 'idle');
      setMeetingDialogueError(record.id, undefined);
    } else {
      const mdUiStatus = resolveMeetingDialogueUiStatus(
        result.meetingDialogueMarkdown,
        meetingDialogueStatus,
      );
      setMeetingDialogueStatus(record.id, mdUiStatus);
      if (mdUiStatus === 'failed') {
        setMeetingDialogueError(record.id, i18n.t('recordingDetail.meetingDialogueFailedDesc'));
      } else {
        setMeetingDialogueError(record.id, undefined);
      }
    }
  }

  setSummaryStatus(record.id, 'done');
  setTasksStatus(record.id, 'done');
  setSummaryError(record.id, undefined);
  setTasksError(record.id, undefined);

  const latest = getLatestRecord(record.id);
  await generateAndSaveEmbeddingForRecord({
    ...record,
    summary: latest?.summary ?? result.summary,
    keyPhrases: latest?.keyPhrases ?? result.keyPhrases ?? [],
  });

  markUnreadAfterSummaryRegenerationIfNeeded(record.id, wasSummaryRegeneration);
}

function applyResumeFailure(recordId: string, errorMsg: string, partialSummary: boolean): void {
  const {
    setSummaryStatus,
    setTasksStatus,
    setSummaryError,
    setTasksError,
    setMeetingDialogueStatus,
    setMeetingDialogueError,
  } = useRecordStore.getState();

  if (partialSummary) {
    setMeetingDialogueStatus(recordId, 'failed');
    setMeetingDialogueError(recordId, i18n.t('recordingDetail.meetingDialogueFailedDesc'));
    return;
  }

  setSummaryStatus(recordId, 'error');
  setTasksStatus(recordId, 'error');
  setSummaryError(recordId, errorMsg);
  setTasksError(recordId, errorMsg);
}

export async function resumeCloudSummarizeJob(pending: CloudSummarizePendingJob): Promise<void> {
  if (useSettingsStore.getState().aiExecutionMode === 'private_experimental') {
    await clearCloudSummarizePending(pending.recordId);
    return;
  }

  const record = useRecordStore.getState().records.find((r) => r.id === pending.recordId);
  if (shouldSkipResume(record)) {
    await clearCloudSummarizePending(pending.recordId);
    return;
  }

  if (!record) {
    return;
  }

  const partialSummary = Boolean(record.summary?.trim());
  const {
    setSummaryStatus,
    setTasksStatus,
    setSummaryError,
    setTasksError,
    setMeetingDialogueStatus,
    updateSummary,
    updateTasks,
    updateTags,
    updateAiExtras,
    renameRecord,
  } = useRecordStore.getState();

  if (!partialSummary) {
    setSummaryStatus(record.id, 'processing');
    setTasksStatus(record.id, 'processing');
    setSummaryError(record.id, undefined);
    setTasksError(record.id, undefined);
  } else if (pending.expectAsyncMeetingDialogue) {
    setMeetingDialogueStatus(record.id, 'processing');
  }

  const once = await fetchAiMessageOnce(pending.jobId, pending.syncToken);
  if (once.ok && once.state.kind === 'error') {
    applyResumeFailure(record.id, once.state.error, partialSummary);
    await clearCloudSummarizePending(pending.recordId);
    return;
  }
  if (!once.ok && 'notFound' in once && once.notFound) {
    await clearCloudSummarizePending(pending.recordId);
    return;
  }

  const isProActive = isProActiveFromStorageSync();
  const recordIsMeeting = (record.classification ?? 'other') === 'meeting';
  const includeMeetingSpeakerBreakdown =
    pending.expectAsyncMeetingDialogue && isProActive && recordIsMeeting;

  const onSummaryReady =
    includeMeetingSpeakerBreakdown && !partialSummary
      ? async (partial: AiProcessingResult) => {
          await applyAiSummaryResult({
            record,
            result: partial,
            skipMeetingDialogue: true,
            isProActive,
            recordIsMeeting,
            includeMeetingSpeakerBreakdown: true,
            aiExecutionMode: useSettingsStore.getState().aiExecutionMode,
            effectiveLocalAiModelId: useSettingsStore.getState().selectedLocalAiModel ?? 'default',
            generationStartedAt: Date.now(),
            updateSummary,
            updateTasks,
            updateTags,
            updateAiExtras,
            renameRecord,
            getLatestRecord: (id) => useRecordStore.getState().records.find((r) => r.id === id),
          });
          setMeetingDialogueStatus(record.id, 'processing');
        }
      : undefined;

  let pollResult: Awaited<ReturnType<typeof resumePollAiMessage>>;
  if (once.ok && once.state.kind === 'done' && once.state.meetingDialogueStatus !== 'processing') {
    pollResult = {
      ok: true,
      result: once.state.result,
      meetingDialogueStatus: once.state.meetingDialogueStatus,
    };
  } else {
    pollResult = await resumePollAiMessage(pending.jobId, pending.syncToken, {
      expectAsyncMeetingDialogue: pending.expectAsyncMeetingDialogue,
      expiresAtMs: pending.expiresAtMs,
      onSummaryReady,
    });
  }

  if (pollResult.ok) {
    await applyPollSuccess(
      record,
      pollResult.result,
      pollResult.meetingDialogueStatus,
      pending.expectAsyncMeetingDialogue,
      partialSummary,
    );
    await clearCloudSummarizePending(pending.recordId);
    return;
  }

  if (pollResult.error === 'AI result expired') {
    await clearCloudSummarizePending(pending.recordId);
    return;
  }

  if (pollResult.error === 'Timeout waiting for AI result') {
    if (!partialSummary) {
      setSummaryStatus(record.id, 'processing');
      setTasksStatus(record.id, 'processing');
    }
    return;
  }

  applyResumeFailure(record.id, toUserFacingFetchErrorMessage(pollResult.error), partialSummary);
}
