import { normalizeIncomingAiModel } from '@/config/constants';

/** Keep in sync with mobile `OPENROUTER_REASONING_CAPABLE_MODEL_IDS`. */
export const OPENROUTER_REASONING_CAPABLE_MODEL_IDS = new Set<string>([
  'google/gemini-2.5-flash-lite',
  'google/gemini-3.1-flash-lite',
  'deepseek/deepseek-v4-flash',
  'deepseek/deepseek-v4-flash:nitro',
  'xiaomi/mimo-v2-flash',
  'minimax/minimax-m2.7',
  'nvidia/nemotron-3-super-120b-a12b',
]);

export const SUMMARY_REASONING_MAX_CHARS = 24_000;

export function openRouterModelSupportsReasoning(model: string): boolean {
  return OPENROUTER_REASONING_CAPABLE_MODEL_IDS.has(normalizeIncomingAiModel(model.trim()));
}

/** Low effort keeps latency/cost reasonable for summary+tasks JSON jobs. */
export function openRouterReasoningParamsForModel(model: string): { effort: 'low' } | undefined {
  return openRouterModelSupportsReasoning(model) ? { effort: 'low' } : undefined;
}

function readReasoningDetailText(item: unknown): string {
  if (!item || typeof item !== 'object') return '';
  const row = item as Record<string, unknown>;
  if (typeof row.text === 'string' && row.text.trim()) {
    return row.text.trim();
  }
  if (typeof row.summary === 'string' && row.summary.trim()) {
    return row.summary.trim();
  }
  return '';
}

export function extractOpenRouterReasoning(message: unknown): string | undefined {
  if (!message || typeof message !== 'object') {
    return undefined;
  }

  const row = message as Record<string, unknown>;
  const direct = row.reasoning;
  if (typeof direct === 'string' && direct.trim()) {
    return clampReasoningText(direct.trim());
  }

  const details = row.reasoning_details;
  if (Array.isArray(details)) {
    const parts = details.map(readReasoningDetailText).filter(Boolean);
    const joined = parts.join('\n\n').trim();
    if (joined) {
      return clampReasoningText(joined);
    }
  }

  return undefined;
}

export function clampReasoningText(text: string): string {
  if (text.length <= SUMMARY_REASONING_MAX_CHARS) {
    return text;
  }
  return `${text.slice(0, SUMMARY_REASONING_MAX_CHARS)}\n…`;
}
