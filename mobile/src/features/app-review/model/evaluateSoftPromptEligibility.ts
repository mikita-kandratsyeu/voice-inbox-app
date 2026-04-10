import {
  getLastSoftPromptAt,
  getSoftPromptCount,
} from '../lib/appReviewStorage';
import {
  MAX_SOFT_PROMPTS,
  MIN_NOTES_FOR_SOFT_PROMPT,
  SOFT_PROMPT_COOLDOWN_MS,
} from '../lib/constants';

export type EligibilityInput = {
  recordDelta: number;
  recordCount: number;
};

export function evaluateSoftPromptEligibility(input: EligibilityInput): boolean {
  if (input.recordDelta !== 1) {
    return false;
  }

  if (input.recordCount < MIN_NOTES_FOR_SOFT_PROMPT) {
    return false;
  }

  if (getSoftPromptCount() >= MAX_SOFT_PROMPTS) {
    return false;
  }

  const lastAt = getLastSoftPromptAt();

  if (lastAt > 0 && Date.now() - lastAt < SOFT_PROMPT_COOLDOWN_MS) {
    return false;
  }

  return true;
}
