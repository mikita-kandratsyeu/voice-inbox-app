import {
  AI_WORKER_MAX_DURATION_SEC,
  SUMMARIZE_MEETING_DIALOGUE_INLINE_MAX_TRANSCRIPT_CHARS,
} from '@/config/constants';

export type AsyncJobPollSchedule = {
  startedAtMs: number;
  pollExpiresAtMs: number;
  pollExpiresAt: string;
};

export function expectsAsyncMeetingDialoguePass(params: {
  pseudoDiarizationEligible: boolean;
  transcriptChars: number;
}): boolean {
  return (
    params.pseudoDiarizationEligible &&
    params.transcriptChars > SUMMARIZE_MEETING_DIALOGUE_INLINE_MAX_TRANSCRIPT_CHARS
  );
}

export function workerPassesForPollDeadline(params: {
  expectAsyncMeetingDialogue?: boolean;
  workerPasses?: number;
}): number {
  if (params.workerPasses != null && params.workerPasses > 0) {
    return params.workerPasses;
  }
  return params.expectAsyncMeetingDialogue ? 2 : 1;
}

export function computePollExpiresAtMs(params: {
  startedAtMs?: number;
  expectAsyncMeetingDialogue?: boolean;
  workerPasses?: number;
}): number {
  const startedAtMs = params.startedAtMs ?? Date.now();
  const passes = workerPassesForPollDeadline(params);
  return startedAtMs + passes * AI_WORKER_MAX_DURATION_SEC * 1000;
}

export function formatPollExpiresAt(ms: number): string {
  return new Date(ms).toISOString();
}

export function buildAsyncJobPollSchedule(params: {
  startedAtMs?: number;
  expectAsyncMeetingDialogue?: boolean;
  workerPasses?: number;
}): AsyncJobPollSchedule {
  const startedAtMs = params.startedAtMs ?? Date.now();
  const pollExpiresAtMs = computePollExpiresAtMs({ ...params, startedAtMs });
  return {
    startedAtMs,
    pollExpiresAtMs,
    pollExpiresAt: formatPollExpiresAt(pollExpiresAtMs),
  };
}
