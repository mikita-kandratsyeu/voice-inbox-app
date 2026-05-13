import { storage } from '@/shared/lib/async-storage';

import { getWebApiSecret, isTestflightInternalBuild } from './buildEnv';

const MMKV_KEY = 'testflight.web_api_url_override';
const MMKV_SECRET_KEY = 'testflight.web_api_secret_override';

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

export function getStoredTestflightWebApiSecretOverride(): string {
  return (storage.getString(MMKV_SECRET_KEY) ?? '').trim();
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

/** Resolved secret for API token requests: manual override (internal) or embedded env. */
export function resolveWebApiSecretForRequest(): string {
  if (!isTestflightInternalBuild()) {
    return getWebApiSecret();
  }
  const raw = getStoredTestflightWebApiSecretOverride();
  if (raw.length > 0) {
    return raw;
  }
  return getWebApiSecret();
}

export function readTestflightWebApiSecretOverride(): string | null {
  if (!isTestflightInternalBuild()) {
    return null;
  }
  const raw = getStoredTestflightWebApiSecretOverride();
  return raw.length > 0 ? raw : null;
}

export type ApplyTestflightWebApiOverrideResult = 'ok' | 'cleared' | 'invalid' | 'forbidden';

export type ApplyTestflightWebApiSecretOverrideResult = 'ok' | 'cleared' | 'forbidden';

export function applyTestflightWebApiSecretOverride(
  raw: string,
): ApplyTestflightWebApiSecretOverrideResult {
  if (!isTestflightInternalBuild()) {
    return 'forbidden';
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    storage.remove(MMKV_SECRET_KEY);
    return 'cleared';
  }

  storage.set(MMKV_SECRET_KEY, trimmed);
  return 'ok';
}

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
    if (key === MMKV_KEY || key === MMKV_SECRET_KEY) {
      onStoreChange();
    }
  });
  return () => sub.remove();
}
