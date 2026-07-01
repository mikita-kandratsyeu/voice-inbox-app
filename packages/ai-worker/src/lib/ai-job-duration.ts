export {
  CLOUD_RUN_WORKER_MAX_DURATION_SECONDS,
  VERCEL_WORKER_MAX_DURATION_SECONDS,
  calculatePollDeadlineMs,
  getAiJobMaxDurationSeconds,
  getAiJobProcessingTimeoutMs,
  getFallbackQStashTimeoutSeconds,
  getJobLockTtlSeconds,
  getOpenRouterGenerationRecoveryMaxWaitMs,
  getPrimaryQStashTimeoutSeconds,
} from '@voice-inbox/ai-job-core';
