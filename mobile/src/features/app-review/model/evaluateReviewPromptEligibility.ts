import { getLastReviewPromptAt, getReviewPromptCount } from '../lib/appReviewStorage';
import {
  MAX_REVIEW_PROMPTS,
  MIN_NOTES_FOR_REVIEW_PROMPT,
  REVIEW_PROMPT_COOLDOWN_MS,
} from '../lib/constants';

export type EligibilityInput = {
  recordDelta: number;
  recordCount: number;
};

export function evaluateReviewPromptEligibility(input: EligibilityInput): boolean {
  if (input.recordDelta !== 1) {
    return false;
  }

  if (input.recordCount < MIN_NOTES_FOR_REVIEW_PROMPT) {
    return false;
  }

  if (getReviewPromptCount() >= MAX_REVIEW_PROMPTS) {
    return false;
  }

  const lastAt = getLastReviewPromptAt();

  if (lastAt > 0 && Date.now() - lastAt < REVIEW_PROMPT_COOLDOWN_MS) {
    return false;
  }

  return true;
}
