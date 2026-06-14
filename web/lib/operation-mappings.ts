import type { AiOperation } from './ai-operation';
import type { AiUsageOperation } from './ai-usage-ledger';

/**
 * Maps AiOperation to AiUsageOperation for ledger tracking.
 *
 * Note: AiUsageOperation uses 'auto_organize' instead of 'folder_auto_organize'
 * for historical database compatibility.
 *
 * @param operation - AI operation from job payload or API header
 * @returns Corresponding ledger operation for usage tracking
 *
 * @example
 * aiOperationToLedgerOperation('folder_auto_organize') // => 'auto_organize'
 * aiOperationToLedgerOperation('transcript_summarize') // => 'transcript_summarize'
 */
export function aiOperationToLedgerOperation(operation: AiOperation): AiUsageOperation {
  // Special case: folder_auto_organize → auto_organize (historical naming)
  if (operation === 'folder_auto_organize') {
    return 'auto_organize';
  }

  // meeting_dialogue_retry is tracked as meeting_dialogue in ledger
  if (operation === 'meeting_dialogue_retry') {
    return 'meeting_dialogue';
  }

  // All other operations map 1:1
  return operation as AiUsageOperation;
}

/**
 * Determines if an operation consumes AI usage credits.
 * Used to decide whether to check/increment AI rate limits.
 *
 * @param operation - AI operation
 * @returns true if operation should count toward usage limits
 */
export function isUsageConsumingOperation(operation: AiOperation): boolean {
  // All current operations consume usage except internal retry
  // (retry is just a continuation of the original operation)
  return operation !== 'meeting_dialogue_retry';
}
