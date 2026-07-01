import {
  CLOUD_RUN_WORKER_MAX_DURATION_SECONDS,
  VERCEL_WORKER_MAX_DURATION_SECONDS,
  calculatePollDeadlineMs,
  formatQStashTimeout,
  getAiJobMaxDurationSeconds,
  getAiJobProcessingTimeoutMs,
  getFallbackQStashTimeoutSeconds,
  getJobLockTtlSeconds,
  getOpenRouterGenerationRecoveryMaxWaitMs,
  getPrimaryQStashTimeoutSeconds,
} from '@voice-inbox/ai-job-core';

export {
  CLOUD_RUN_WORKER_MAX_DURATION_SECONDS,
  VERCEL_WORKER_MAX_DURATION_SECONDS,
  calculatePollDeadlineMs,
  formatQStashTimeout,
  getAiJobMaxDurationSeconds,
  getAiJobProcessingTimeoutMs,
  getFallbackQStashTimeoutSeconds,
  getJobLockTtlSeconds,
  getOpenRouterGenerationRecoveryMaxWaitMs,
  getPrimaryQStashTimeoutSeconds,
};
