import { InlineKeyboard } from 'grammy';

import type { HandlerCtx } from '../context.js';
import { requirePerm } from '../ui/keyboards.js';
import { escapeHtml } from '../ui/format.js';
import type { ScreenReply } from '../ui/reply.js';
import { screenTitle } from '../ui/reply.js';

export async function configScreen(h: HandlerCtx): Promise<ScreenReply> {
  const denied = h.profile ? requirePerm(h.profile, 'config') : 'Not linked.';
  if (denied) return { text: `${screenTitle('Config')}\n${denied}` };
  if (!h.adminApi) return { text: `${screenTitle('Config')}\nAPI not configured.` };

  const res = await h.adminApi.get<{
    ok: boolean;
    values: Record<string, string>;
    effective?: Record<string, string>;
  }>('/api/admin/app-config');
  if (!res.ok) return { text: `${screenTitle('Config')}\n❌ ${escapeHtml(res.error)}` };

  const lines = [screenTitle('App configuration', 'AI limits and bonus settings'), ''];
  for (const [k, v] of Object.entries(res.data.values ?? {})) {
    lines.push(`<b>${escapeHtml(k)}</b>: <code>${escapeHtml(v)}</code>`);
  }
  lines.push('', 'Full editing: use web admin Config tab.');

  const kb = new InlineKeyboard()
    .text('🗝 Pro Keys', 'pk')
    .row()
    .text('🔄 Refresh', 'cf:r')
    .row()
    .text('◀️ Menu', 'm');
  return { text: lines.join('\n'), keyboard: kb };
}
