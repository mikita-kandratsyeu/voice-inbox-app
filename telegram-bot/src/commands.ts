import type { Bot, Context } from 'grammy';
import type { Pool } from 'pg';

export async function setBotCommandMenu(bot: Bot<Context>): Promise<void> {
  await bot.api.setMyCommands(
    [
      { command: 'menu', description: 'Main menu' },
      { command: 'help', description: 'Help' },
      { command: 'whoami', description: 'My account & permissions' },
      { command: 'status', description: 'Quick overview' },
      { command: 'cancel', description: 'Cancel current flow' },
    ],
    { scope: { type: 'default' } },
  );
}

type Deps = {
  pool: Pool;
  startedAt: number;
};

export function registerUtilityCommands(bot: Bot<Context>, deps: Deps): void {
  const { pool, startedAt } = deps;

  bot.command('ping', async (ctx) => {
    const t0 = Date.now();
    try {
      await pool.query('SELECT 1');
      const ms = Date.now() - t0;
      const uptime = formatUptime(Date.now() - startedAt);
      await ctx.reply(`pong · db ok · ${ms}ms · uptime ${uptime}`);
    } catch (e) {
      console.error('[ping]', e);
      await ctx.reply('Database error (see server logs).');
    }
  });
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
