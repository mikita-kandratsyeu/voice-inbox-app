import 'dotenv/config';

import { Bot } from 'grammy';
import pg from 'pg';

import {
  parseTelegramAdminUserIdsFromJson,
  TELEGRAM_ADMIN_USER_IDS_KEY,
} from './whitelist.js';
import { registerAdminPanel } from './admin-panel.js';
import { registerAdminCommands, setBotCommandMenu } from './commands.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const DATABASE_URL = process.env.DATABASE_URL?.trim();

/** Default 10 minutes; override with TELEGRAM_WHITELIST_CACHE_SECONDS (min 60, max 86400). */
const CACHE_TTL_MS = (() => {
  const raw = process.env.TELEGRAM_WHITELIST_CACHE_SECONDS?.trim();
  if (!raw) return 10 * 60 * 1000;
  const sec = parseInt(raw, 10);
  if (!Number.isFinite(sec)) return 10 * 60 * 1000;
  const clamped = Math.min(86400, Math.max(60, sec));
  return clamped * 1000;
})();

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

let cache: { ids: Set<string>; loadedAt: number } | null = null;

async function getAllowedIds(): Promise<Set<string>> {
  const now = Date.now();
  if (cache && now - cache.loadedAt < CACHE_TTL_MS) {
    return cache.ids;
  }
  const result = await pool.query<{ value: string | null }>(
    'SELECT value FROM "AppConfig" WHERE key = $1 LIMIT 1',
    [TELEGRAM_ADMIN_USER_IDS_KEY],
  );
  const raw = result.rows[0]?.value ?? null;
  const ids = parseTelegramAdminUserIdsFromJson(raw);
  cache = { ids, loadedAt: now };
  return ids;
}

function userId(ctx: { from?: { id: number } | null }): string | null {
  const id = ctx.from?.id;
  if (id == null || !Number.isFinite(id)) return null;
  return String(id);
}

const bot = new Bot(TOKEN);

bot.use(async (ctx, next) => {
  const id = userId(ctx);
  if (!id) {
    return;
  }
  try {
    const allowed = await getAllowedIds();
    if (!allowed.has(id)) {
      if (ctx.chat?.type === 'private') {
        await ctx.reply('Access denied.');
      }
      return;
    }
  } catch (e) {
    console.error('[whitelist]', e);
    if (ctx.chat?.type === 'private') {
      await ctx.reply('Temporary error. Try again later.');
    }
    return;
  }
  await next();
});

registerAdminCommands(bot, { pool, getAllowedIds, startedAt });
registerAdminPanel(bot, { pool, getAllowedIds });

async function shutdown(): Promise<void> {
  await pool.end();
}

process.once('SIGINT', () => {
  void shutdown().finally(() => process.exit(0));
});
process.once('SIGTERM', () => {
  void shutdown().finally(() => process.exit(0));
});

bot.catch((err) => {
  console.error('[grammy]', err);
});

await setBotCommandMenu(bot).catch((e) => {
  console.warn('[setMyCommands]', e);
});

await bot.start({
  onStart: (me) => {
    console.log(`Bot @${me.username} running (long polling)`);
  },
});
