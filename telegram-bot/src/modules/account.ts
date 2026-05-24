import { InlineKeyboard } from 'grammy';

import type { HandlerCtx } from '../context.js';
import { apiConfigured } from '../context.js';
import { clearFlow, clearSession, getFlow, setFlow } from '../session/store.js';
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

const PASSWORD_MIN = 10;

export function accountPasswordStart(h: HandlerCtx): ScreenReply {
  if (!h.profile) {
    return { text: `${screenTitle('Change password')}\nLink an admin account first.` };
  }
  if (!h.adminApi) {
    return { text: `${screenTitle('Change password')}\nAPI not configured.` };
  }

  setFlow(h.telegramUserId, { kind: 'admin_password', step: 'current', data: {} });
  const kb = new InlineKeyboard().text('❌ Cancel', 'ac').row();
  return {
    text: [
      screenTitle('Change password'),
      '',
      'Send your <b>current</b> admin password in the next message.',
      'Use /cancel to abort.',
    ].join('\n'),
    keyboard: kb,
  };
}

/** Returns a screen reply when handling a password-change flow message. */
export async function handleAccountPasswordMessage(
  h: HandlerCtx,
  text: string,
): Promise<ScreenReply | null> {
  const flow = getFlow(h.telegramUserId);
  if (!flow || flow.kind !== 'admin_password') return null;

  if (!h.profile || !h.adminApi) {
    clearFlow(h.telegramUserId);
    return { text: `${screenTitle('Change password')}\nNot available.` };
  }

  const password = text.trim();
  if (!password) {
    return {
      text: `${screenTitle('Change password')}\nPassword cannot be empty. Try again or /cancel.`,
    };
  }

  if (flow.step === 'current') {
    setFlow(h.telegramUserId, {
      kind: 'admin_password',
      step: 'new',
      data: { current: password },
    });
    const kb = new InlineKeyboard().text('❌ Cancel', 'ac').row();
    return {
      text: `${screenTitle('Change password')}\nSend your <b>new</b> password (min ${PASSWORD_MIN} characters).`,
      keyboard: kb,
    };
  }

  if (flow.step === 'new') {
    const current = flow.data.current;
    if (typeof current !== 'string' || !current) {
      clearFlow(h.telegramUserId);
      return accountPasswordStart(h);
    }
    if (password.length < PASSWORD_MIN) {
      return {
        text: `${screenTitle('Change password')}\nNew password must be at least ${PASSWORD_MIN} characters.`,
      };
    }

    const res = await h.adminApi.patch<{ ok: boolean; error?: string }>('/api/admin/users/me', {
      currentPassword: current,
      newPassword: password,
    });
    clearFlow(h.telegramUserId);

    if (!res.ok) {
      const err =
        res.status === 401
          ? 'Current password incorrect.'
          : escapeHtml(res.error || 'Update failed');
      return { text: `${screenTitle('Change password')}\n❌ ${err}` };
    }

    return {
      text: `${screenTitle('Change password')}\n✅ Password updated. Use it on next web login.`,
    };
  }

  clearFlow(h.telegramUserId);
  return null;
}
