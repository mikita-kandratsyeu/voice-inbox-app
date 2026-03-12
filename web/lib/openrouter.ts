import { OpenRouter } from '@openrouter/sdk';

const openRouterClient = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  httpReferer: process.env.NEXT_PUBLIC_BASE_URL,
  xTitle: 'Voice Inbox AI',
});

export { openRouterClient };
