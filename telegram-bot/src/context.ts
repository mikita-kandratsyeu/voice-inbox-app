import type { Bot, Context } from 'grammy';
import type { Pool } from 'pg';

import { AdminApiClient, createAdminApiClient } from './api/client.js';
import { loadAdminProfile } from './auth/access.js';
import { userIdFromCtx } from './auth/middleware.js';
import type { AdminProfile } from './types.js';

export type AppContext = {
  pool: Pool;
  startedAt: number;
};

export type HandlerCtx = Context & {
  telegramUserId: string;
  profile: AdminProfile | null;
  /** Web admin HTTP client — never assign to `api` (Grammy Telegram API). */
  adminApi: AdminApiClient | null;
};

export async function resolveHandlerCtx(
  ctx: Context,
  app: AppContext,
): Promise<HandlerCtx | null> {
  const telegramUserId = userIdFromCtx(ctx);
  if (!telegramUserId) return null;
  const profile = await loadAdminProfile(app.pool, telegramUserId);
  const adminApi = profile ? createAdminApiClient(telegramUserId) : null;
  return Object.assign(ctx, { telegramUserId, profile, adminApi });
}

export function apiConfigured(): boolean {
  return Boolean(process.env.WEB_ADMIN_URL?.trim() && process.env.TELEGRAM_BOT_API_SECRET?.trim());
}

export function registerErrorHandler(bot: Bot<Context>): void {
  bot.catch((err) => {
    console.error('[grammy]', err);
  });
}
