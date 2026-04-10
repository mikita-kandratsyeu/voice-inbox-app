import { storage } from '@/shared/lib/async-storage';

const KEYS = {
  REVIEW_PROMPT_COUNT: 'appReview.reviewPromptCount',
  LAST_REVIEW_PROMPT_AT: 'appReview.lastReviewPromptAt',
} as const;

export function getReviewPromptCount(): number {
  return storage.getNumber(KEYS.REVIEW_PROMPT_COUNT) ?? 0;
}

export function getLastReviewPromptAt(): number {
  return storage.getNumber(KEYS.LAST_REVIEW_PROMPT_AT) ?? 0;
}

export function markReviewPromptPresented(): void {
  const n = getReviewPromptCount();

  storage.set(KEYS.REVIEW_PROMPT_COUNT, n + 1);
  storage.set(KEYS.LAST_REVIEW_PROMPT_AT, Date.now());
}
