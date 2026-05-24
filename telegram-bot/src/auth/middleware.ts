import type { Bot, Context } from 'grammy';

export function userIdFromCtx(ctx: { from?: { id: number } | null }): string | null {
  const id = ctx.from?.id;
  if (id == null || !Number.isFinite(id)) return null;
  return String(id);
}

/** Ignore updates without a Telegram user id. */
export function registerIdentityMiddleware(bot: Bot<Context>): void {
  bot.use(async (ctx, next) => {
    if (!userIdFromCtx(ctx)) return;
    await next();
  });
}
