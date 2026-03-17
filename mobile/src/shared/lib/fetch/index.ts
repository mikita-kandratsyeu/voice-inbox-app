import { MOBILE_USER_AGENT as ENV_USER_AGENT } from '@env';
import { fetch as nitroFetch } from 'react-native-nitro-fetch';

export async function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers ?? undefined);
  const MOBILE_USER_AGENT = ENV_USER_AGENT as string;

  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', MOBILE_USER_AGENT);
  }

  return nitroFetch(input, { ...init, headers });
}
