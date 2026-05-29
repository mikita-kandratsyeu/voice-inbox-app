import { NativeModules } from 'react-native';

import { getWebApiUrl } from '@/shared/config/runtimeConfig';

const DEBUG_SESSION_ID = '6213d8';
const INGEST_PATH = '/ingest/cb565f8e-d2b1-4f34-9f79-1680a8f9250a';
const INGEST_PORT = 7924;

let cachedIngestUrl: string | null = null;
let loggedIngestTarget = false;

const resolveMetroHost = (): string => {
  const sourceCode = NativeModules.SourceCode as { scriptURL?: string } | undefined;
  const scriptURL = sourceCode?.scriptURL;
  const match = scriptURL?.match(/^https?:\/\/([^:/]+)/);
  const host = match?.[1];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return host;
  }
  return '127.0.0.1';
};

const resolveLanHostFromUrl = (url: string): string | null => {
  const match = url.match(/^https?:\/\/([^:/]+)/);
  const host = match?.[1];
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }
  return host;
};

const resolveDebugIngestHost = (): string => {
  const metroHost = resolveMetroHost();
  if (metroHost !== '127.0.0.1') {
    return metroHost;
  }
  const apiHost = resolveLanHostFromUrl(getWebApiUrl());
  if (apiHost) {
    return apiHost;
  }
  return metroHost;
};

const resolveDebugIngestUrl = (): string => {
  if (cachedIngestUrl) {
    return cachedIngestUrl;
  }
  const host = resolveDebugIngestHost();
  cachedIngestUrl = `http://${host}:${INGEST_PORT}${INGEST_PATH}`;
  return cachedIngestUrl;
};

/** Dev-only logs for Cursor debug mode (simulator + physical device via Metro host IP). */
export function agentDebugLog(
  location: string,
  message: string,
  data?: Record<string, unknown>,
  hypothesisId?: string,
): void {
  if (!__DEV__) {
    return;
  }

  if (!loggedIngestTarget) {
    loggedIngestTarget = true;
    const sourceCode = NativeModules.SourceCode as { scriptURL?: string } | undefined;
    console.warn('[agent-debug] ingest', resolveDebugIngestUrl(), 'scriptURL', sourceCode?.scriptURL);
  }

  const payload = {
    sessionId: DEBUG_SESSION_ID,
    location,
    message,
    data,
    hypothesisId,
    timestamp: Date.now(),
  };

  // #region agent log
  console.warn(`[agent-debug ${hypothesisId ?? '-'}] ${message}`, data ?? '');
  fetch(resolveDebugIngestUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': DEBUG_SESSION_ID,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
}
