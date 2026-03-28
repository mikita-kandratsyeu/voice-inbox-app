import type { AiProcessingResult } from '@/shared/lib/ai-api/aiApi';

import { LocalAiError } from './localAiErrors';
import { parseJsonObjectWithFallbacks } from './localAiJson';
import { sanitizeSummaryPayload } from './localAiSummarySanitize';

export type SummaryBuildOutcome =
  | { ok: true; result: AiProcessingResult }
  | { ok: false; reason: 'parse_failed' | 'empty_summary' };

export function tryBuildSummaryFromModelRaw(raw: string): SummaryBuildOutcome {
  try {
    const record = parseJsonObjectWithFallbacks(raw);
    try {
      return { ok: true, result: sanitizeSummaryPayload(record) };
    } catch (e) {
      if (e instanceof LocalAiError && e.code === 'empty_summary') {
        return { ok: false, reason: 'empty_summary' };
      }
      throw e;
    }
  } catch (e) {
    if (e instanceof LocalAiError && e.code === 'parse_failed') {
      return { ok: false, reason: 'parse_failed' };
    }
    throw e;
  }
}

/**
 * Full summary pipeline: JSON extraction + field sanitization.
 * @throws LocalAiError
 */
export function parseLocalSummaryResponse(raw: string): AiProcessingResult {
  const outcome = tryBuildSummaryFromModelRaw(raw);
  if (!outcome.ok) {
    throw new LocalAiError(
      outcome.reason === 'parse_failed' ? 'parse_failed' : 'empty_summary',
      outcome.reason === 'parse_failed'
        ? 'Invalid local summary response'
        : 'Local summary is empty',
    );
  }
  return outcome.result;
}
