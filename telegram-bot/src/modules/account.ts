import { InlineKeyboard } from 'grammy';

import type { HandlerCtx } from '../context.js';
import { apiConfigured } from '../context.js';
import { clearSession } from '../session/store.js';
import { hasPermission } from '../auth/permissions.js';
import { escapeHtml } from '../ui/format.js';
import type { ScreenReply } from '../ui/reply.js';
import { screenTitle } from '../ui/reply.js';

export function accountScreen(h: HandlerCtx): ScreenReply {
  const u = h.from;
  const lines = [
    screenTitle('My Account'),
    '',
    `Telegram user id: <code>${escapeHtml(h.telegramUserId)}</code>`,
    u?.username ? `Username: @${escapeHtml(u.username)}` : null,
  ].filter(Boolean) as string[];

  if (!h.profile) {
    lines.push('', '⚠️ No linked admin account.');
    lines.push(
      'A superadmin must set your Telegram user id on your admin row:',
      'Security → Admin users → Edit access.',
    );
  } else {
    const p = h.profile;
    lines.push(
      '',
      `Admin login: <b>${escapeHtml(p.login)}</b>`,
      `Superadmin: ${p.isSuperadmin ? '✅ yes' : 'no'}`,
      `Permissions: ${p.isSuperadmin ? 'all tabs' : p.permissions.join(', ') || '(none)'}`,
    );
  }

  if (!apiConfigured()) {
    lines.push('', '⚠️ WEB_ADMIN_URL + TELEGRAM_BOT_API_SECRET not set.');
  }

  const kb = new InlineKeyboard();
  if (h.profile && (h.profile.isSuperadmin || hasPermission(h.profile, 'security'))) {
    kb.text('🔐 Change password', 'ac:pw').row();
  }
  kb.text('🔄 Reset bot session', 'ac:rs').row().text('◀️ Menu', 'm');

  return { text: lines.join('\n'), keyboard: kb };
}

export function resetBotSession(telegramUserId: string): void {
  clearSession(telegramUserId);
}
