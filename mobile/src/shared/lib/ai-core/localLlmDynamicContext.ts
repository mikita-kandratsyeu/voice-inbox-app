import type { LocalAiModelId } from '@/entities/settings';

import { getLocalLlmNCtx } from './localLlmModelProfiles';

/**
 * Task types that influence optimal context window size.
 */
export type LlmTaskType = 'ask' | 'summary' | 'meeting_dialogue';

/**
 * Calculates optimal context window size based on task and input length.
 * Dynamically sizes context to reduce RAM usage for short inputs.
 *
 * @param taskType - Type of AI task being performed
 * @param transcriptLength - Character length of input transcript
 * @param modelId - Model identifier for max context lookup
 * @returns Optimal n_ctx value (power of 2 for efficiency)
 */
export function getOptimalNCtx(
  taskType: LlmTaskType,
  transcriptLength: number,
  modelId: LocalAiModelId,
): number {
  const maxNCtx = getLocalLlmNCtx(modelId);

  // Estimate input tokens (conservative: ~3 chars per token for mixed text)
  const estimatedInputTokens = Math.ceil(transcriptLength / 3);

  // Reserve tokens for output based on task complexity
  const outputTokenReserve = getOutputTokenReserve(taskType);

  // Add overhead for chat template, system prompt, and safety margin
  const overheadTokens = 1024;

  const requiredTokens = estimatedInputTokens + outputTokenReserve + overheadTokens;

  // Find optimal power-of-2 context size (llama.cpp prefers these)
  const minNCtx = getMinNCtxForTask(taskType);
  let optimalNCtx = minNCtx;

  while (optimalNCtx < requiredTokens && optimalNCtx < maxNCtx) {
    optimalNCtx *= 2;
  }

  return Math.min(optimalNCtx, maxNCtx);
}

/**
 * Returns output token budget based on task complexity.
 */
function getOutputTokenReserve(taskType: LlmTaskType): number {
  switch (taskType) {
    case 'ask':
      return 600; // Quick answers
    case 'summary':
      return 2048; // Structured summaries with tasks/tags
    case 'meeting_dialogue':
      return 3072; // Detailed meeting transcripts
  }
}

/**
 * Returns minimum context window for task type (power of 2).
 */
function getMinNCtxForTask(taskType: LlmTaskType): number {
  switch (taskType) {
    case 'ask':
      return 2048; // Minimum for ask responses
    case 'summary':
      return 4096; // Minimum for structured output
    case 'meeting_dialogue':
      return 8192; // Minimum for dialogue generation
  }
}

/**
 * Estimates RAM usage for a given context size with q4_0 KV cache.
 * Useful for logging and debugging.
 *
 * @param nCtx - Context window size
 * @returns Estimated RAM in MB
 */
export function estimateKvCacheRamMb(nCtx: number): number {
  // q4_0 KV cache: ~16-20 MB per 1K tokens (depends on model architecture)
  // Using 18 MB as average for 1B-2B models
  return Math.ceil((nCtx / 1024) * 18);
}
