import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_TELEGRAM_BOT_USER_AGENT, getTelegramBotUserAgent } from './user-agent.js';

test('getTelegramBotUserAgent includes default prefix and version', () => {
  const prev = process.env.TELEGRAM_BOT_USER_AGENT;
  delete process.env.TELEGRAM_BOT_USER_AGENT;
  try {
    const ua = getTelegramBotUserAgent();
    assert.ok(ua.includes(DEFAULT_TELEGRAM_BOT_USER_AGENT));
    assert.match(ua, /\/0\.1\.0$/);
  } finally {
    if (prev === undefined) delete process.env.TELEGRAM_BOT_USER_AGENT;
    else process.env.TELEGRAM_BOT_USER_AGENT = prev;
  }
});

test('getTelegramBotUserAgent strips accidental version from env token', () => {
  const prev = process.env.TELEGRAM_BOT_USER_AGENT;
  process.env.TELEGRAM_BOT_USER_AGENT = 'VoiceInbox-Bot/1.0.0';
  try {
    const ua = getTelegramBotUserAgent();
    assert.ok(ua.startsWith('VoiceInbox-Bot/'));
    assert.ok(!ua.includes('1.0.0'));
  } finally {
    if (prev === undefined) delete process.env.TELEGRAM_BOT_USER_AGENT;
    else process.env.TELEGRAM_BOT_USER_AGENT = prev;
  }
});
