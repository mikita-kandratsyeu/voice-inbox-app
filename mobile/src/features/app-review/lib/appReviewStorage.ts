import { storage } from '@/shared/lib/async-storage';

const KEYS = {
  SOFT_PROMPT_COUNT: 'appReview.softPromptCount',
  LAST_SOFT_PROMPT_AT: 'appReview.lastSoftPromptAt',
} as const;

export function getSoftPromptCount(): number {
  return storage.getNumber(KEYS.SOFT_PROMPT_COUNT) ?? 0;
}

export function getLastSoftPromptAt(): number {
  return storage.getNumber(KEYS.LAST_SOFT_PROMPT_AT) ?? 0;
}

export function markSoftPromptPresented(): void {
  const n = getSoftPromptCount();
  storage.set(KEYS.SOFT_PROMPT_COUNT, n + 1);
  storage.set(KEYS.LAST_SOFT_PROMPT_AT, Date.now());
}
