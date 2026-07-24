import { DEFAULT_TELEGRAM_BOT_USER_AGENT, getTelegramBotUserAgent } from './user-agent.js';

describe('getTelegramBotUserAgent', () => {
  const original = process.env.TELEGRAM_BOT_USER_AGENT;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.TELEGRAM_BOT_USER_AGENT;
    } else {
      process.env.TELEGRAM_BOT_USER_AGENT = original;
    }
  });

  it('includes default prefix and version', () => {
    delete process.env.TELEGRAM_BOT_USER_AGENT;

    const ua = getTelegramBotUserAgent();
    expect(ua).toContain(DEFAULT_TELEGRAM_BOT_USER_AGENT);
    expect(ua).toMatch(/\/0\.1\.0$/);
  });

  it('strips accidental version from env token', () => {
    process.env.TELEGRAM_BOT_USER_AGENT = 'VoiceInbox-Bot/1.0.0';

    const ua = getTelegramBotUserAgent();
    expect(ua.startsWith('VoiceInbox-Bot/')).toBe(true);
    expect(ua.includes('1.0.0')).toBe(false);
  });
});
