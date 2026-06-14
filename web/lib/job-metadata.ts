import { redis as kv } from '@/lib/redis';
import { MESSAGE_TTL_SECONDS } from '@/config/constants';
import type { JobType } from './job-types';

const JOB_METADATA_PREFIX = 'job_meta:';

type JobMetadata = {
  jobId: string;
  jobType: JobType;
  startedAt: number; // Unix timestamp in milliseconds
  deviceId?: string;
};

function getJobMetadataKey(jobId: string): string {
  return `${JOB_METADATA_PREFIX}${jobId}`;
}

/**
 * Saves job metadata for polling hint calculation.
 * Expires with same TTL as the job message.
 */
export async function saveJobMetadata(
  jobId: string,
  jobType: JobType,
  deviceId?: string,
  ttlSeconds: number = MESSAGE_TTL_SECONDS,
): Promise<void> {
  const metadata: JobMetadata = {
    jobId,
    jobType,
    startedAt: Date.now(),
    deviceId,
  };

  await kv.set(getJobMetadataKey(jobId), JSON.stringify(metadata), {
    ex: ttlSeconds,
  });
}

/**
 * Retrieves job metadata for polling hint calculation.
 * Returns null if metadata not found or expired.
 */
export async function getJobMetadata(jobId: string): Promise<JobMetadata | null> {
  const raw = await kv.get(getJobMetadataKey(jobId));

  if (!raw) {
    return null;
  }

  try {
    if (typeof raw === 'object' && raw !== null) {
      return raw as JobMetadata;
    }
    return JSON.parse(raw as string) as JobMetadata;
  } catch {
    return null;
  }
}

/**
 * Deletes job metadata after job completion.
 */
export async function deleteJobMetadata(jobId: string): Promise<void> {
  await kv.del(getJobMetadataKey(jobId));
}
