import { OpenRouter } from '@openrouter/sdk';

const MAX_CLIENT_USER_AGENT_LEN = 512;

export function normalizeClientUserAgent(ua: string | null | undefined): string | undefined {
  if (typeof ua !== 'string') {
    return undefined;
  }

  const t = ua.trim();

  if (!t) {
    return undefined;
  }

  return t.length > MAX_CLIENT_USER_AGENT_LEN ? t.slice(0, MAX_CLIENT_USER_AGENT_LEN) : t;
}

export function createOpenRouterClient(clientUserAgent?: string | null): OpenRouter {
  const userAgent = normalizeClientUserAgent(clientUserAgent);

  return new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
    httpReferer: process.env.NEXT_PUBLIC_BASE_URL,
    appTitle: 'Voice Inbox AI',
    ...(userAgent ? { userAgent } : {}),
  });
}
