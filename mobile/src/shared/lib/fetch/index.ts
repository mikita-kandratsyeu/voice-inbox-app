import { fetch as rnNitroFetch } from 'react-native-nitro-fetch';

import { getMobileUserAgent } from '@/shared/config/buildEnv';

export async function nitroFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers ?? undefined);

  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', getMobileUserAgent());
  }

  return rnNitroFetch(input, { ...init, headers });
}

export const fetch = nitroFetch;
