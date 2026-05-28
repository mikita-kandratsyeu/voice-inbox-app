import { AsyncLocalStorage } from 'node:async_hooks';

export type AiJobRunContext = {
  jobId: string;
  messageTtlSeconds: number;
};

/** Set in QStash/`after()` workers so OpenRouter recovery can key pending generations by job id. */
export const aiJobRunContext = new AsyncLocalStorage<AiJobRunContext>();

export function getAiJobRunContext(): AiJobRunContext | undefined {
  return aiJobRunContext.getStore();
}
