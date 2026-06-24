import 'dotenv/config';

import { createServer } from 'node:http';

import { Bot, webhookCallback } from 'grammy';

import { startSupportAlerts, stopSupportAlerts } from './alerts/support-alerts.js';
import { registerIdentityMiddleware } from './auth/middleware.js';
import { registerUtilityCommands, setBotCommandMenu } from './commands.js';
import type { AppContext } from './context.js';
import { registerErrorHandler } from './context.js';
import { createPgPool } from './lib/pg-connection.js';
import { logStartupWarnings, registerRouter } from './router.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const DATABASE_URL = process.env.DATABASE_URL?.trim();
const WEBHOOK_URL = process.env.TELEGRAM_BOT_WEBHOOK_URL?.trim();
const WEBHOOK_SECRET = process.env.TELEGRAM_BOT_WEBHOOK_SECRET?.trim();
const WEBHOOK_PATH = process.env.TELEGRAM_BOT_WEBHOOK_PATH?.trim() || '/telegram-webhook';
const WEBHOOK_PORT = Number(process.env.PORT ?? process.env.TELEGRAM_BOT_WEBHOOK_PORT ?? 3001);

if (!TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN');
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const pool = createPgPool(DATABASE_URL);
const startedAt = Date.now();

const app: AppContext = { pool, startedAt };
const bot = new Bot(TOKEN);

registerErrorHandler(bot);
registerIdentityMiddleware(bot);
registerUtilityCommands(bot, { pool, startedAt });
registerRouter(bot, app);

logStartupWarnings();

async function shutdown(): Promise<void> {
  stopSupportAlerts();
  await pool.end();
}

process.once('SIGINT', () => {
  void shutdown().finally(() => process.exit(0));
});
process.once('SIGTERM', () => {
  void shutdown().finally(() => process.exit(0));
});

await setBotCommandMenu(bot).catch((e) => {
  console.warn('[setMyCommands]', e);
});

startSupportAlerts(bot, pool);

if (WEBHOOK_URL) {
  const handleUpdate = webhookCallback(bot, 'http', {
    secretToken: WEBHOOK_SECRET || undefined,
  });
  await bot.api.setWebhook(WEBHOOK_URL, {
    secret_token: WEBHOOK_SECRET || undefined,
    drop_pending_updates: true,
  });

  createServer((req, res) => {
    if (req.url === WEBHOOK_PATH && req.method === 'POST') {
      void handleUpdate(req, res);
      return;
    }
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
      return;
    }
    res.writeHead(404);
    res.end();
  }).listen(WEBHOOK_PORT, () => {
    console.warn(`Bot webhook listening on :${WEBHOOK_PORT}${WEBHOOK_PATH}`);
  });
} else {
  await bot.start({
    onStart: (me) => {
      console.warn(`Bot @${me.username} running (long polling)`);
    },
  });
}
