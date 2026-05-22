import { clampReasoningText } from '@/lib/openrouter-reasoning';

/** Plain-text CoT from DeepSeek `reasoning_content` (human-readable, not encrypted). */
export function extractDeepSeekReasoning(message: unknown): string | undefined {
  if (!message || typeof message !== 'object') {
    return undefined;
  }

  const row = message as Record<string, unknown>;
  const direct = row.reasoning_content;
  if (typeof direct === 'string' && direct.trim()) {
    return clampReasoningText(direct.trim());
  }

  return undefined;
}
