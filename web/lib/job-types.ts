import type { AiOperation } from './ai-operation';

// Re-export operation mappings for convenience
export { aiOperationToLedgerOperation, isUsageConsumingOperation } from './operation-mappings';

/**
 * Job type definitions for adaptive polling hint calculation.
 * Must match mobile client's PollJobType enum.
 *
 * These are simplified categories used for polling optimization,
 * distinct from the more granular AiOperation types.
 */
export const JOB_TYPES = [
  'summary',
  'ask',
  'meeting_dialogue',
  'translate',
  'digest',
  'auto_organize',
] as const;

export type JobType = (typeof JOB_TYPES)[number];

/**
 * Maps AI operations to job types for polling hint calculation.
 * Multiple operations can map to the same job type if they have similar characteristics.
 */
export const OPERATION_TO_JOB_TYPE: Record<AiOperation, JobType> = {
  transcript_summarize: 'summary',
  transcript_ask: 'ask',
  inbox_ask: 'ask',
  digest: 'digest',
  translate: 'translate',
  folder_auto_organize: 'auto_organize',
  meeting_dialogue: 'meeting_dialogue',
  meeting_dialogue_retry: 'meeting_dialogue',
};

/**
 * Typical completion times for different job types (milliseconds).
 * Based on production metrics and job complexity.
 * Used for progress estimation when real-time progress is not available.
 */
export const TYPICAL_COMPLETION_MS: Record<JobType, number> = {
  ask: 10_000, // Quick Q&A: ~10 seconds
  translate: 15_000, // Translation: ~15 seconds
  summary: 30_000, // Standard summary: ~30 seconds
  auto_organize: 45_000, // Folder organization: ~45 seconds
  meeting_dialogue: 90_000, // Long meetings: ~90 seconds
  digest: 120_000, // Heavy digests: ~2 minutes
};

/**
 * Recommended base polling intervals by job type (milliseconds).
 * Matches mobile client's adaptive polling strategy.
 * Actual intervals are adjusted based on progress and server hints.
 */
export const BASE_POLL_INTERVALS: Record<JobType, number> = {
  ask: 800,
  translate: 1_000,
  summary: 1_500,
  auto_organize: 2_000,
  meeting_dialogue: 3_000,
  digest: 4_000,
};

/**
 * Converts AI operation to job type for polling purposes.
 *
 * @param operation - AI operation type
 * @returns Corresponding job type for polling hints
 *
 * @example
 * operationToJobType('transcript_summarize') // => 'summary'
 * operationToJobType('meeting_dialogue_retry') // => 'meeting_dialogue'
 */
export function operationToJobType(operation: AiOperation): JobType {
  return OPERATION_TO_JOB_TYPE[operation];
}

/**
 * Infers job type from operation string (fallback for untyped contexts).
 * Prefer using operationToJobType with typed AiOperation when possible.
 *
 * @param operation - Operation string
 * @returns Inferred job type, defaults to 'summary' if unknown
 */
export function inferJobType(operation: string): JobType {
  const normalized = operation.toLowerCase().trim();

  if (normalized.includes('ask')) return 'ask';
  if (normalized.includes('translate')) return 'translate';
  if (normalized.includes('meeting') || normalized.includes('dialogue')) return 'meeting_dialogue';
  if (normalized.includes('digest')) return 'digest';
  if (normalized.includes('organize')) return 'auto_organize';

  return 'summary'; // Default fallback
}
