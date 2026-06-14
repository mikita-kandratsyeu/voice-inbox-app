import type { NitroRequest as NitroRequestNative } from 'react-native-nitro-fetch';
import {
  fetch as rnNitroFetch,
  NitroFetch,
  Response as NitroResponseImpl,
} from 'react-native-nitro-fetch';

type NitroHeader = { key: string; value: string };
type NitroRequestMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

import { getMobileUserAgent } from '@/shared/config/buildEnv';

export type NitroFetchInit = RequestInit & { timeoutMs?: number };

let nitroClient: ReturnType<typeof NitroFetch.createClient> | undefined;

function ensureNitroClient(): ReturnType<typeof NitroFetch.createClient> {
  if (!nitroClient) {
    nitroClient = NitroFetch.createClient();
  }
  return nitroClient;
}

function headersToNitroPairs(headers: Headers): NitroHeader[] {
  const pairs: NitroHeader[] = [];
  headers.forEach((value, key) => pairs.push({ key, value }));
  return pairs;
}

function createAbortError(): Error {
  const err = new Error('The operation was aborted.');
  err.name = 'AbortError';
  return err;
}

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function resolveMethod(input: RequestInfo | URL, init?: NitroFetchInit): NitroRequestMethod {
  const method =
    init?.method ?? (typeof input !== 'string' && !(input instanceof URL) ? input.method : 'GET');
  return (method ?? 'GET').toUpperCase() as NitroRequestMethod;
}

function bodySupportsNativeTimeout(body: BodyInit | null | undefined): boolean {
  return body == null || typeof body === 'string';
}

async function fetchWithAbortTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const { signal: userSignal, ...rest } = init;

  const onUserAbort = () => controller.abort();
  if (userSignal) {
    if (userSignal.aborted) {
      clearTimeout(timeoutId);
      throw createAbortError();
    }
    userSignal.addEventListener('abort', onUserAbort, { once: true });
  }

  try {
    return await rnNitroFetch(input, { ...rest, signal: controller.signal });
  } catch (e) {
    if (controller.signal.aborted) {
      throw createAbortError();
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
    userSignal?.removeEventListener('abort', onUserAbort);
  }
}

/** Native URLSession timeout; `AbortSignal.timeout` alone does not extend it on iOS. */
async function nitroFetchWithNativeTimeout(
  input: RequestInfo | URL,
  init: NitroFetchInit,
): Promise<Response> {
  const signal = init.signal ?? undefined;
  if (signal?.aborted) {
    throw createAbortError();
  }

  const url = resolveUrl(input);
  const method = resolveMethod(input, init);
  const headers = headersToNitroPairs(init.headers as Headers);
  const bodyString = typeof init.body === 'string' ? init.body : undefined;

  const req: NitroRequestNative = {
    url,
    method,
    headers: headers.length > 0 ? headers : undefined,
    bodyString,
    timeoutMs: init.timeoutMs,
    followRedirects: true,
  };

  const requestId = signal ? String(Math.random()) : undefined;
  if (requestId) req.requestId = requestId;

  const client = ensureNitroClient();
  let abortListener: (() => void) | undefined;
  if (signal && requestId) {
    abortListener = () => {
      try {
        client.cancelRequest(requestId);
      } catch {
        // Client may already be torn down.
      }
    };
    signal.addEventListener('abort', abortListener, { once: true });
  }

  try {
    const res = await client.request(req);
    if (signal?.aborted) {
      throw createAbortError();
    }
    return new NitroResponseImpl({
      url: res.url,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      redirected: res.redirected,
      headers: res.headers,
      bodyBytes: res.bodyBytes as unknown as ArrayBuffer | undefined,
      bodyString: res.bodyString,
    }) as unknown as Response;
  } catch (e) {
    if (signal?.aborted) {
      throw createAbortError();
    }
    throw e;
  } finally {
    if (signal && abortListener) {
      signal.removeEventListener('abort', abortListener);
    }
  }
}

export async function nitroFetch(
  input: RequestInfo | URL,
  init?: NitroFetchInit,
): Promise<Response> {
  const headers = new Headers(init?.headers ?? undefined);

  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', getMobileUserAgent());
  }

  const { timeoutMs, ...rest } = init ?? {};
  const mergedInit = { ...rest, headers };

  if (timeoutMs != null && timeoutMs > 0) {
    if (bodySupportsNativeTimeout(mergedInit.body)) {
      return nitroFetchWithNativeTimeout(input, { ...mergedInit, timeoutMs });
    }
    return fetchWithAbortTimeout(input, mergedInit, timeoutMs);
  }

  return rnNitroFetch(input, mergedInit);
}

export const fetch = nitroFetch;
