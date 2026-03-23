import { fetch as nitroFetch } from 'react-native-nitro-fetch';

import { getMobileUserAgent } from '@/shared/config/buildEnv';

export async function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers ?? undefined);
  const MOBILE_USER_AGENT = getMobileUserAgent();

  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', MOBILE_USER_AGENT);
  }

  return nitroFetch(input, { ...init, headers });
}
