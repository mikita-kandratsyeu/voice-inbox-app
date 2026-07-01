/** Vercel App Router worker `maxDuration` (seconds). */
export const VERCEL_WORKER_MAX_DURATION_SECONDS = 300;

/** Cloud Run primary worker budget (seconds). */
export const CLOUD_RUN_WORKER_MAX_DURATION_SECONDS = 900;

export type JobTypeForPoll =
  | 'summary'
  | 'ask'
  | 'meeting_dialogue'
  | 'translate'
  | 'digest'
  | 'auto_organize';

export type AiJobDurationEnv = {
  aiJobMaxDurationSeconds?: string;
  aiJobWorkerUrl?: string;
};

function readEnv(env: AiJobDurationEnv = process.env as AiJobDurationEnv): AiJobDurationEnv {
  return env;
}

/**
 * Max seconds for one async AI worker attempt.
 * `AI_JOB_MAX_DURATION_SECONDS` overrides; else 900 when `AI_JOB_WORKER_URL` is set.
 */
export function getAiJobMaxDurationSeconds(env: AiJobDurationEnv = readEnv()): number {
  const explicit = env.aiJobMaxDurationSeconds ?? process.env.AI_JOB_MAX_DURATION_SECONDS?.trim();
  if (explicit) {
    const parsed = Number.parseInt(explicit, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const workerUrl = env.aiJobWorkerUrl ?? process.env.AI_JOB_WORKER_URL?.trim();
  if (workerUrl) {
    return CLOUD_RUN_WORKER_MAX_DURATION_SECONDS;
  }

  return VERCEL_WORKER_MAX_DURATION_SECONDS;
}

/** In-process AI timeout — 10s below worker max for graceful errors. */
export function getAiJobProcessingTimeoutMs(env?: AiJobDurationEnv): number {
  return Math.max(1_000, (getAiJobMaxDurationSeconds(env) - 10) * 1_000);
}

/** Redis exclusive job lock TTL — slightly above worker max. */
export function getJobLockTtlSeconds(env?: AiJobDurationEnv): number {
  return getAiJobMaxDurationSeconds(env) + 30;
}

/** OpenRouter generation recovery poll budget within one worker attempt. */
export function getOpenRouterGenerationRecoveryMaxWaitMs(env?: AiJobDurationEnv): number {
  return getAiJobMaxDurationSeconds(env) > VERCEL_WORKER_MAX_DURATION_SECONDS ? 420_000 : 180_000;
}

export function formatQStashTimeout(seconds: number): `${number}s` {
  return `${seconds}s`;
}

export function getPrimaryQStashTimeoutSeconds(env?: AiJobDurationEnv): number {
  return getAiJobMaxDurationSeconds(env);
}

export function getFallbackQStashTimeoutSeconds(): number {
  return VERCEL_WORKER_MAX_DURATION_SECONDS;
}

/**
 * Absolute Unix ms deadline for mobile poll loop.
 * `summary` jobs reserve 2× budget for optional async meeting dialogue.
 */
export function calculatePollDeadlineMs(
  startedAtMs: number,
  jobType: JobTypeForPoll,
  env?: AiJobDurationEnv,
): number {
  const maxSec = getAiJobMaxDurationSeconds(env);
  const multiplier = jobType === 'summary' ? 2 : 1;
  return startedAtMs + maxSec * multiplier * 1_000;
}
