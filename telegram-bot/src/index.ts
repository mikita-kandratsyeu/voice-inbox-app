import 'dotenv/config';

import { Bot } from 'grammy';
import pg from 'pg';

import { registerIdentityMiddleware } from './auth/middleware.js';
import { registerUtilityCommands, setBotCommandMenu } from './commands.js';
import type { AppContext } from './context.js';
import { registerErrorHandler } from './context.js';
import { logStartupWarnings, registerRouter } from './router.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const DATABASE_URL = process.env.DATABASE_URL?.trim();

if (!TOKEN) {
  console.error('Missing TELEGRAM_BOT_TOKEN');
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });
const startedAt = Date.now();

const app: AppContext = { pool, startedAt };
const bot = new Bot(TOKEN);

registerErrorHandler(bot);
registerIdentityMiddleware(bot);
registerUtilityCommands(bot, { pool, startedAt });
registerRouter(bot, app);

logStartupWarnings();

async function shutdown(): Promise<void> {
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

await bot.start({
  onStart: (me) => {
    console.warn(`Bot @${me.username} running (long polling)`);
  },
});
