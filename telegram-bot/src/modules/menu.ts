import { InlineKeyboard } from 'grammy';

import type { HandlerCtx } from '../context.js';
import { apiConfigured } from '../context.js';
import { escapeHtml } from '../ui/format.js';
import { homeKeyboard } from '../ui/keyboards.js';
import type { ScreenReply } from '../ui/reply.js';
import { screenTitle } from '../ui/reply.js';

export function menuScreen(h: HandlerCtx): ScreenReply {
  if (!h.profile) {
    return {
      text: [
        screenTitle('Voice Inbox Admin'),
        '',
        'Your Telegram account is not linked to an admin user yet.',
        '',
        `Your Telegram user id: <code>${escapeHtml(h.telegramUserId)}</code>`,
        '',
        'Ask a superadmin to set this id on your admin account:',
        'web admin → Security → Admin users → Edit access → <b>Telegram user id</b>.',
        apiConfigured()
          ? ''
          : '\n⚠️ Bot API is not configured (WEB_ADMIN_URL + TELEGRAM_BOT_API_SECRET).',
      ].join('\n'),
      keyboard: new InlineKeyboard().text('👤 My Account', 'ac'),
    };
  }

  const p = h.profile;
  const lines = [
    screenTitle('Voice Inbox Admin', 'Mobile admin for Voice Inbox AI'),
    '',
    `Signed in as <b>${escapeHtml(p.login)}</b>${p.isSuperadmin ? ' · superadmin' : ''}`,
    `Permissions: ${p.isSuperadmin ? 'all' : p.permissions.join(', ') || '(none)'}`,
    '',
    'Choose a section:',
  ];
  if (!apiConfigured()) {
    lines.push(
      '',
      '⚠️ API client not configured — actions need WEB_ADMIN_URL + TELEGRAM_BOT_API_SECRET.',
    );
  }
  return { text: lines.join('\n'), keyboard: homeKeyboard(p) };
}
