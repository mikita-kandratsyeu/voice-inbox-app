import { storage } from '@/shared/lib/async-storage';

import { isTestflightInternalBuild } from './buildEnv';

const MMKV_KEY = 'testflight.web_api_url_override';

function isValidAbsoluteHttpUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());

    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function getStoredTestflightWebApiUrlOverride(): string {
  return (storage.getString(MMKV_KEY) ?? '').trim();
}

export function readTestflightWebApiUrlOverride(): string | null {
  if (!isTestflightInternalBuild()) {
    return null;
  }

  const raw = getStoredTestflightWebApiUrlOverride();
  if (!raw || !isValidAbsoluteHttpUrl(raw)) {
    return null;
  }

  return normalizeBaseUrl(raw);
}

export type ApplyTestflightWebApiOverrideResult = 'ok' | 'cleared' | 'invalid' | 'forbidden';

export function applyTestflightWebApiUrlOverride(raw: string): ApplyTestflightWebApiOverrideResult {
  if (!isTestflightInternalBuild()) {
    return 'forbidden';
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    storage.remove(MMKV_KEY);
    return 'cleared';
  }

  if (!isValidAbsoluteHttpUrl(trimmed)) {
    return 'invalid';
  }

  storage.set(MMKV_KEY, normalizeBaseUrl(trimmed));
  return 'ok';
}

export function subscribeTestflightWebApiUrlOverride(onStoreChange: () => void): () => void {
  const sub = storage.addOnValueChangedListener((key) => {
    if (key === MMKV_KEY) {
      onStoreChange();
    }
  });
  return () => sub.remove();
}
