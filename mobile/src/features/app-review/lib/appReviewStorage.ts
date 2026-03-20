import { storage } from '@/shared/lib/async-storage';

const KEYS = {
  SOFT_PROMPT_COUNT: 'appReview.softPromptCount',
  LAST_SOFT_PROMPT_AT: 'appReview.lastSoftPromptAt',
  NEVER_ASK: 'appReview.neverAsk',
} as const;

export function getNeverAskAppReview(): boolean {
  return storage.getBoolean(KEYS.NEVER_ASK) ?? false;
}

export function setNeverAskAppReview(): void {
  storage.set(KEYS.NEVER_ASK, true);
}

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
