import { JOB_LOCK_KEY_PREFIX, JOB_LOCK_TTL_SECONDS } from '@/config/constants';
import { redis } from '@/lib/redis';

export function getJobLockKey(jobId: string): string {
  return `${JOB_LOCK_KEY_PREFIX}${jobId}`;
}

/** NX lock so only one worker runs LLM for a job at a time. */
export async function acquireJobLock(jobId: string): Promise<boolean> {
  return redis.setIfNotExists(getJobLockKey(jobId), '1', { ex: JOB_LOCK_TTL_SECONDS });
}

export async function releaseJobLock(jobId: string): Promise<void> {
  await redis.del(getJobLockKey(jobId));
}
