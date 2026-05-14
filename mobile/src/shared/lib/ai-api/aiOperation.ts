/**
 * Keep in sync with `web/config/constants.ts` (`HEADER_AI_OPERATION`) and
 * `web/lib/ai-operation.ts` (`AI_OPERATIONS`).
 */
export const HEADER_AI_OPERATION = 'x-voice-inbox-ai-operation';

export const AI_OPERATIONS = [
  'transcript_summarize',
  'transcript_ask',
  'digest',
  'translate',
  'folder_auto_organize',
] as const;

export type AiOperation = (typeof AI_OPERATIONS)[number];

export function headersForAiOperation(operation: AiOperation): Record<string, string> {
  return { [HEADER_AI_OPERATION]: operation };
}
