import type { AiExecutionContext } from '../types';
import { TRANSCRIPT_CHAR_LIMIT_BY_TIER, TRUNCATION_MARKER } from './localAiConstants';

export function getLocalReferenceDateIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${y}-${m}-${day}`;
}

export function getTranscriptCharLimit(tier: AiExecutionContext['privateCapabilityTier']): number {
  return TRANSCRIPT_CHAR_LIMIT_BY_TIER[tier];
}

/**
 * If over `limit`, keeps a prefix and suffix separated by a fixed marker.
 * Deterministic: same input always yields the same output.
 */
export function truncateTranscriptSmart(transcript: string, limit: number): string {
  if (transcript.length <= limit) {
    return transcript;
  }
  const marker = TRUNCATION_MARKER;
  if (limit <= marker.length + 1) {
    return transcript.slice(0, limit);
  }
  const innerBudget = limit - marker.length;
  const headChars = Math.floor(innerBudget * 0.55);
  const tailChars = innerBudget - headChars;
  return transcript.slice(0, headChars) + marker + transcript.slice(transcript.length - tailChars);
}

export function prepareTranscriptForLocalLlm(
  transcript: string,
  tier: AiExecutionContext['privateCapabilityTier'],
): string {
  const limit = getTranscriptCharLimit(tier);
  return truncateTranscriptSmart(transcript, limit);
}
