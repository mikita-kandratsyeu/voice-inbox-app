import { isRetryableOpenRouterTransportError } from '@/lib/ai-model-fallback';
import { isRetryableDeepSeekTransportError } from '@/lib/deepseek';
import { isOpenRouterRecoverableTransportError } from '@/lib/openrouter-recovery';

/** Errors where QStash should retry the worker (transport / infra), not terminal app logic failures. */
export function isRetryableAiJobError(err: unknown): boolean {
  if (
    isOpenRouterRecoverableTransportError(err) ||
    isRetryableOpenRouterTransportError(err) ||
    isRetryableDeepSeekTransportError(err)
  ) {
    return true;
  }

  if (!(err instanceof Error)) return false;

  const msg = err.message;
  if (msg.includes('Job payload missing or operation mismatch')) return true;
  if (/OpenRouter chat failed \((408|429|502|503|524)\)/.test(msg)) return true;
  if (/OpenRouter stream error/i.test(msg)) return true;

  return false;
}
