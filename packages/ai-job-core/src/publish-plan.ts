import {
  getAiJobMaxDurationSeconds,
  getFallbackQStashTimeoutSeconds,
  type AiJobDurationEnv,
} from './duration';

export type AiJobPublishTarget = {
  url: string;
  timeoutSeconds: number;
  failureCallback?: string;
};

export type AiJobPublishPlan = {
  primary: AiJobPublishTarget | null;
  fallback: AiJobPublishTarget;
  useCloudRunPrimary: boolean;
};

export type AiJobPublishEnv = {
  aiJobWorkerUrl?: string;
  aiJobWorkerFallbackUrl?: string;
  baseUrlOrFallback?: string;
  aiJobMaxDurationSeconds?: string;
};

function normalizeWorkerUrl(url: string): string {
  return url.trim().replace(/\/$/, '');
}

export function getAiJobWorkerPrimaryUrl(
  env: AiJobPublishEnv = process.env as AiJobPublishEnv,
): string | null {
  const configured = env.aiJobWorkerUrl ?? process.env.AI_JOB_WORKER_URL?.trim();
  if (configured) {
    return normalizeWorkerUrl(configured);
  }
  return null;
}

export function getAiJobWorkerFallbackUrl(
  env: AiJobPublishEnv = process.env as AiJobPublishEnv,
): string {
  const configured = env.aiJobWorkerFallbackUrl ?? process.env.AI_JOB_WORKER_FALLBACK_URL?.trim();
  if (configured) {
    return normalizeWorkerUrl(configured);
  }
  const base = (
    env.baseUrlOrFallback ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    'http://localhost:3000'
  ).replace(/\/$/, '');
  return `${base}/api/internal/ai/worker`;
}

export function getAiJobWorkerUrl(env?: AiJobPublishEnv): string {
  return getAiJobWorkerPrimaryUrl(env) ?? getAiJobWorkerFallbackUrl(env);
}

export function resolveAiJobPublishPlan(env?: AiJobPublishEnv): AiJobPublishPlan {
  const durationEnv: AiJobDurationEnv = {
    aiJobMaxDurationSeconds: env?.aiJobMaxDurationSeconds,
    aiJobWorkerUrl: env?.aiJobWorkerUrl ?? process.env.AI_JOB_WORKER_URL,
  };
  const primaryUrl = getAiJobWorkerPrimaryUrl(env);
  const fallbackUrl = getAiJobWorkerFallbackUrl(env);

  const fallback: AiJobPublishTarget = {
    url: fallbackUrl,
    timeoutSeconds: getFallbackQStashTimeoutSeconds(),
  };

  if (!primaryUrl) {
    return {
      primary: null,
      fallback,
      useCloudRunPrimary: false,
    };
  }

  return {
    primary: {
      url: primaryUrl,
      timeoutSeconds: getAiJobMaxDurationSeconds(durationEnv),
      failureCallback: fallbackUrl,
    },
    fallback,
    useCloudRunPrimary: true,
  };
}
