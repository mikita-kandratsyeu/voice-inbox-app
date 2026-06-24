import type { Bot } from 'grammy';
import type { Pool } from 'pg';

import { createAdminApiClient } from '../api/client.js';
import { isSupportAlertsEnabled } from '../session/store.js';
import { escapeHtml, truncate } from '../ui/format.js';

const POLL_MS = 2 * 60 * 1000;

let lastSeenTicketId: string | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

type SupportTicket = {
  id: string;
  reference: string;
  subject: string | null;
  message: string;
  status: string;
};

async function fetchLatestOpenTicket(telegramUserId: string): Promise<SupportTicket | null> {
  const client = createAdminApiClient(telegramUserId);
  if (!client) return null;
  const res = await client.get<{ ok: boolean; items: SupportTicket[] }>(
    '/api/admin/support?limit=1&status=open',
  );
  if (!res.ok || !res.data.items?.[0]) return null;
  return res.data.items[0];
}

async function loadAlertRecipients(pool: Pool): Promise<string[]> {
  const { rows } = await pool.query<{
    telegramUserId: string;
    isSuperadmin: boolean;
    permissions: string[];
  }>(
    `SELECT "telegramUserId", "isSuperadmin", permissions
     FROM "AdminUser"
     WHERE "telegramUserId" IS NOT NULL`,
  );
  return rows
    .filter(
      (r) =>
        r.telegramUserId &&
        (r.isSuperadmin || (Array.isArray(r.permissions) && r.permissions.includes('support'))),
    )
    .map((r) => r.telegramUserId);
}

export function startSupportAlerts(bot: Bot, pool: Pool): void {
  if (process.env.TELEGRAM_BOT_SUPPORT_ALERTS === 'false') return;

  const poll = async () => {
    try {
      const recipients = await loadAlertRecipients(pool);
      const enabledRecipients = recipients.filter((id) => isSupportAlertsEnabled(id));
      if (!enabledRecipients.length) return;

      const probeId = enabledRecipients[0]!;
      const ticket = await fetchLatestOpenTicket(probeId);
      if (!ticket || ticket.status !== 'open') return;
      if (ticket.id === lastSeenTicketId) return;

      lastSeenTicketId = ticket.id;
      const subject = truncate(ticket.subject || ticket.message, 80);
      const text = [
        '<b>New support ticket</b>',
        `${escapeHtml(ticket.reference)} — ${escapeHtml(subject)}`,
        '',
        'Open Support in the bot to triage.',
      ].join('\n');

      for (const telegramUserId of enabledRecipients) {
        try {
          await bot.api.sendMessage(telegramUserId, text, {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🎫 View tickets', callback_data: 'su:l:0:o' }],
                [{ text: '◀️ Menu', callback_data: 'm' }],
              ],
            },
          });
        } catch (e) {
          console.warn('[support-alerts] send failed', telegramUserId, e);
        }
      }
    } catch (e) {
      console.warn('[support-alerts] poll failed', e);
    }
  };

  void poll();
  pollTimer = setInterval(() => void poll(), POLL_MS);
}

export function stopSupportAlerts(): void {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

/** For tests */
export function resetSupportAlertState(): void {
  lastSeenTicketId = null;
}
