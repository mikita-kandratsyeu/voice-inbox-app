import { OpenRouter } from '@openrouter/sdk';

const openRouterClient = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  httpReferer: 'https://voice-inbox.online',
  xTitle: 'Voice Inbox',
});

export { openRouterClient };
