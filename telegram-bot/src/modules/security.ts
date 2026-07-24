import { InlineKeyboard } from 'grammy';

import type { HandlerCtx } from '../context.js';
import { setListIds } from '../session/store.js';
import { escapeHtml } from '../ui/format.js';
import { requirePerm } from '../ui/keyboards.js';
import type { ScreenReply } from '../ui/reply.js';
import { screenTitle } from '../ui/reply.js';

type AdminUserItem = {
  id: string;
  login: string;
  isSuperadmin: boolean;
  permissions: string[];
  telegramUserId: string | null;
  isCurrent?: boolean;
};

export async function securityHomeScreen(h: HandlerCtx): Promise<ScreenReply> {
  const denied = h.profile ? requirePerm(h.profile, 'security') : 'Not linked.';
  if (denied) return { text: `${screenTitle('Security')}\n${denied}` };
  if (!h.adminApi) return { text: `${screenTitle('Security')}\nAPI not configured.` };

  const policyRes = await h.adminApi.get<{
    ok: boolean;
    ipAllowlistEnabled: boolean;
    ipAllowlistCount: number;
    adminLoginRateLimit: { windowSeconds: number; maxAttempts: number };
    sessionCookieMaxAgeSeconds: number;
    cookieHttpOnly: boolean;
    cookieSameSite: string;
    cookieSecureInProduction: boolean;
  }>('/api/admin/access-policy');

  const lines = [screenTitle('Security', 'Access policy and admin accounts'), ''];
  if (policyRes.ok) {
    const p = policyRes.data;
    lines.push(
      '<b>Access policy</b>',
      `IP allowlist: ${p.ipAllowlistEnabled ? `✅ ${p.ipAllowlistCount} entries` : 'off'}`,
      `Login rate limit: ${p.adminLoginRateLimit.maxAttempts} / ${p.adminLoginRateLimit.windowSeconds}s`,
      `Session max age: ${p.sessionCookieMaxAgeSeconds}s`,
      `Cookie HttpOnly: ${p.cookieHttpOnly ? '✅' : '❌'}`,
      `Cookie SameSite: ${escapeHtml(p.cookieSameSite)}`,
      '',
    );
  }

  const kb = new InlineKeyboard()
    .text('👥 Admin accounts', 'sc:us')
    .row()
    .text('🔄 Refresh', 'sc')
    .row()
    .text('◀️ Menu', 'm');
  return { text: lines.join('\n'), keyboard: kb };
}

export async function securityUsersScreen(h: HandlerCtx): Promise<ScreenReply> {
  if (!h.adminApi) return { text: `${screenTitle('Admins')}\nAPI not configured.` };
  const res = await h.adminApi.get<{ ok: boolean; items: AdminUserItem[] }>('/api/admin/users');
  if (!res.ok) return { text: `${screenTitle('Admins')}\n❌ ${escapeHtml(res.error)}` };
  const items = res.data.items ?? [];
  setListIds(
    h.telegramUserId,
    items.map((i) => i.id),
  );
  const lines = [screenTitle('Admin accounts'), ''];
  items.forEach((u, i) => {
    lines.push(
      `${i + 1}. <b>${escapeHtml(u.login)}</b>${u.isSuperadmin ? ' · superadmin' : ''}${u.isCurrent ? ' (you)' : ''}`,
      u.telegramUserId
        ? `   TG: <code>${escapeHtml(u.telegramUserId)}</code>`
        : '   TG: (not linked)',
    );
  });
  const kb = new InlineKeyboard().text('◀️ Security', 'sc').row().text('◀️ Menu', 'm');
  return { text: lines.join('\n'), keyboard: kb };
}
