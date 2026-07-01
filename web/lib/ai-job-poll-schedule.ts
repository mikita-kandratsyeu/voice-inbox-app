import { buildAsyncJobPollSchedule, type AsyncJobPollSchedule } from '@/lib/ai-poll-deadline';
import { saveJobMetadata } from '@/lib/job-metadata';
import type { JobType } from '@/lib/job-types';

export type ScheduleAsyncJobPollParams = {
  jobId: string;
  jobType: JobType;
  deviceId?: string;
  ttlSeconds: number;
  startedAtMs?: number;
  expectAsyncMeetingDialogue?: boolean;
  workerPasses?: number;
};

/** Persists poll deadline in job metadata and returns fields for the HTTP accepted response. */
export async function scheduleAsyncJobPoll(
  params: ScheduleAsyncJobPollParams,
): Promise<AsyncJobPollSchedule> {
  const schedule = buildAsyncJobPollSchedule({
    startedAtMs: params.startedAtMs,
    expectAsyncMeetingDialogue: params.expectAsyncMeetingDialogue,
    workerPasses: params.workerPasses,
  });

  await saveJobMetadata(
    params.jobId,
    params.jobType,
    params.deviceId,
    params.ttlSeconds,
    schedule.pollExpiresAtMs,
    schedule.startedAtMs,
  );

  return schedule;
}
