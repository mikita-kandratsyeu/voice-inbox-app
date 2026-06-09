import { InlineKeyboard } from 'grammy';

import type { HandlerCtx } from '../context.js';
import { setListIds } from '../session/store.js';
import { requirePerm } from '../ui/keyboards.js';
import { escapeHtml, formatIsoShort } from '../ui/format.js';
import type { ScreenReply } from '../ui/reply.js';
import { screenTitle } from '../ui/reply.js';

const CONSOLE_LINKS: { label: string; env: string }[] = [
  { label: 'Apple Developer', env: 'ADMIN_LINK_APPLE' },
  { label: 'Firebase', env: 'ADMIN_LINK_FIREBASE' },
  { label: 'RevenueCat', env: 'ADMIN_LINK_REVENUECAT' },
  { label: 'Vercel', env: 'ADMIN_LINK_VERCEL' },
  { label: 'Neon', env: 'ADMIN_LINK_NEON' },
  { label: 'Upstash', env: 'ADMIN_LINK_UPSTASH' },
  { label: 'OpenRouter', env: 'ADMIN_LINK_OPENROUTER' },
  { label: 'Hugging Face', env: 'ADMIN_LINK_HUGGINGFACE' },
  { label: 'GitHub', env: 'ADMIN_LINK_GITHUB' },
];

export async function operationsHomeScreen(h: HandlerCtx): Promise<ScreenReply> {
  const denied = h.profile ? requirePerm(h.profile, 'operations') : 'Not linked.';
  if (denied) return { text: `${screenTitle('Operations')}\n${denied}` };
  if (!h.adminApi) return { text: `${screenTitle('Operations')}\nAPI not configured.` };

  const [statsRes, obsRes] = await Promise.all([
    h.adminApi.get<{
      ok: boolean;
      totalOpen: number;
      openCreatedInLast7Days: number;
      avgResolutionHoursClosed: number | null;
    }>('/api/admin/support/stats'),
    h.adminApi.get<{ ok: boolean; apiErrorsToday: Record<string, number> }>('/api/admin/observability'),
  ]);

  const lines = [screenTitle('Operations', 'Metrics, audit log, exports'), ''];

  if (statsRes.ok) {
    const s = statsRes.data;
    lines.push('<b>Support stats</b>', `Open: ${s.totalOpen}`, `New (7d): ${s.openCreatedInLast7Days}`);
    if (s.avgResolutionHoursClosed != null) {
      lines.push(`Avg resolution: ${s.avgResolutionHoursClosed.toFixed(1)}h`);
    }
    lines.push('');
  }

  if (obsRes.ok) {
    lines.push('<b>API errors today</b>');
    const errs = obsRes.data.apiErrorsToday ?? {};
    const keys = Object.keys(errs);
    if (!keys.length) lines.push('(none)');
    else for (const k of keys.slice(0, 8)) lines.push(`· ${escapeHtml(k)}: ${errs[k]}`);
    lines.push('');
  }

  const kb = new InlineKeyboard()
    .text('📜 Audit log', 'op:al:0')
    .row()
    .text('🔗 Console links', 'op:ln')
    .row()
    .text('🔄 Refresh', 'op')
    .row()
    .text('◀️ Menu', 'm');
  return { text: lines.filter(Boolean).join('\n'), keyboard: kb };
}

export async function operationsAuditScreen(h: HandlerCtx, page: number): Promise<ScreenReply> {
  if (!h.adminApi) return { text: `${screenTitle('Audit')}\nAPI not configured.` };
  const res = await h.adminApi.get<{
    ok: boolean;
    items: { id: string; createdAt: string; adminLogin: string; action: string }[];
    nextCursor: string | null;
  }>(`/api/admin/audit?limit=8${page > 0 ? `&cursor=${page}` : ''}`);
  if (!res.ok) return { text: `${screenTitle('Audit')}\n❌ ${escapeHtml(res.error)}` };
  const items = res.data.items ?? [];
  setListIds(h.telegramUserId, items.map((i) => i.id));
  const lines = [screenTitle('Audit log'), ''];
  for (const a of items) {
    lines.push(`· ${formatIsoShort(a.createdAt)} ${escapeHtml(a.adminLogin)} — ${escapeHtml(a.action)}`);
  }
  const kb = new InlineKeyboard();
  if (page > 0) kb.text('◀️ Prev', `op:al:${page - 1}`);
  if (res.data.nextCursor) kb.text('Next ▶️', `op:al:${page + 1}`);
  kb.row().text('◀️ Operations', 'op').row().text('◀️ Menu', 'm');
  return { text: lines.join('\n'), keyboard: kb };
}

export function operationsLinksScreen(_h: HandlerCtx): ScreenReply {
  const lines = [screenTitle('Console links'), ''];
  for (const link of CONSOLE_LINKS) {
    const url = process.env[link.env]?.trim();
    lines.push(url ? `· <a href="${escapeHtml(url)}">${escapeHtml(link.label)}</a>` : `· ${link.label}: (not configured)`);
  }
  const kb = new InlineKeyboard().text('◀️ Operations', 'op').row().text('◀️ Menu', 'm');
  return { text: lines.join('\n'), keyboard: kb };
}
