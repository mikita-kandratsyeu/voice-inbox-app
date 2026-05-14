import type { Bot, Context } from 'grammy';
import type { Pool } from 'pg';

export async function setBotCommandMenu(bot: Bot<Context>): Promise<void> {
  await bot.api.setMyCommands(
    [
      { command: 'start', description: 'Welcome' },
      { command: 'help', description: 'Command list' },
      { command: 'me', description: 'Your Telegram user id' },
      { command: 'ping', description: 'DB connectivity' },
      { command: 'whitelist', description: 'Cached whitelist size' },
      { command: 'admin', description: 'Dashboard, support, audit, config' },
    ],
    { scope: { type: 'default' } },
  );
}

type Deps = {
  pool: Pool;
  getAllowedIds: () => Promise<Set<string>>;
  startedAt: number;
};

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function registerAdminCommands(bot: Bot<Context>, deps: Deps): void {
  const { pool, getAllowedIds, startedAt } = deps;

  bot.command('start', async (ctx) => {
    await ctx.reply(
      [
        'Voice Inbox admin bot.',
        '',
        'Use /help. /admin — overview, support queue, stats, audit log, app config, broadcasts. /me — your Telegram id for the web whitelist.',
      ].join('\n'),
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      [
        'Commands:',
        '/me — your Telegram user id (for Security → Telegram admin bot on the web)',
        '/ping — database round-trip time',
        '/whitelist — number of ids in the whitelist (same cache as access checks)',
        '/admin — dashboard, support, audit log, app config, broadcasts',
        '/help — this message',
      ].join('\n'),
    );
  });

  bot.command('me', async (ctx) => {
    const u = ctx.from;
    if (!u) {
      await ctx.reply('No user in this update.');
      return;
    }
    const lines = [
      `Telegram user id: ${u.id}`,
      u.username ? `Username: @${u.username}` : 'Username: (none)',
      u.first_name ? `Name: ${u.first_name}${u.last_name ? ` ${u.last_name}` : ''}` : null,
    ].filter(Boolean) as string[];
    await ctx.reply(lines.join('\n'));
  });

  bot.command('ping', async (ctx) => {
    const t0 = Date.now();
    try {
      await pool.query('SELECT 1');
      const ms = Date.now() - t0;
      await ctx.reply(`pong · db ok · ${ms}ms · uptime ${formatUptime(Date.now() - startedAt)}`);
    } catch (e) {
      console.error('[ping]', e);
      await ctx.reply('Database error (see server logs).');
    }
  });

  bot.command('whitelist', async (ctx) => {
    try {
      const ids = await getAllowedIds();
      await ctx.reply(`Whitelist: ${ids.size} id(s). (Cached; same TTL as access checks.)`);
    } catch (e) {
      console.error('[whitelist cmd]', e);
      await ctx.reply('Failed to read whitelist.');
    }
  });
}
