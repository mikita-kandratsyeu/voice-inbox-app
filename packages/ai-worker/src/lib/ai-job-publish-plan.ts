import { BASE_URL_OR_FALLBACK } from '@/config/constants';
import {
  getAiJobWorkerFallbackUrl as getCoreFallbackUrl,
  getAiJobWorkerPrimaryUrl as getCorePrimaryUrl,
  getAiJobWorkerUrl as getCoreWorkerUrl,
  resolveAiJobPublishPlan as resolveCorePublishPlan,
  type AiJobPublishPlan,
  type AiJobPublishTarget,
} from '@voice-inbox/ai-job-core';

export type { AiJobPublishPlan, AiJobPublishTarget };

function coreEnv() {
  return {
    baseUrlOrFallback: BASE_URL_OR_FALLBACK,
    aiJobWorkerUrl: process.env.AI_JOB_WORKER_URL,
    aiJobWorkerFallbackUrl: process.env.AI_JOB_WORKER_FALLBACK_URL,
    aiJobMaxDurationSeconds: process.env.AI_JOB_MAX_DURATION_SECONDS,
  };
}

export function getAiJobWorkerPrimaryUrl(): string | null {
  return getCorePrimaryUrl(coreEnv());
}

export function getAiJobWorkerFallbackUrl(): string {
  return getCoreFallbackUrl(coreEnv());
}

export function getAiJobWorkerUrl(): string {
  return getCoreWorkerUrl(coreEnv());
}

export function resolveAiJobPublishPlan(): AiJobPublishPlan {
  return resolveCorePublishPlan(coreEnv());
}
