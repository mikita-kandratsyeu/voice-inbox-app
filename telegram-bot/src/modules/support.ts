import { InlineKeyboard } from 'grammy';

import type { HandlerCtx } from '../context.js';
import { getListId, setListIds } from '../session/store.js';
import { requirePerm, paginateRow } from '../ui/keyboards.js';
import { escapeHtml, formatIsoShort, truncate } from '../ui/format.js';
import type { ScreenReply } from '../ui/reply.js';
import { screenTitle } from '../ui/reply.js';

type SupportItem = {
  id: string;
  reference: string;
  email: string | null;
  subject: string | null;
  message: string;
  diagnostics: unknown;
  appLogs: unknown;
  status: string;
  createdAt: string;
};

export async function supportHomeScreen(h: HandlerCtx): Promise<ScreenReply> {
  const denied = h.profile ? requirePerm(h.profile, 'support') : 'Not linked.';
  if (denied) return { text: `${screenTitle('Support')}\n${denied}` };
  const kb = new InlineKeyboard()
    .text('Open', 'su:l:0:o')
    .text('Closed', 'su:l:0:c')
    .text('All', 'su:l:0:a')
    .row()
    .text('🔍 Search', 'su:q')
    .row()
    .text('◀️ Menu', 'm');
  return {
    text: screenTitle('Support', 'Tickets from the mobile app'),
    keyboard: kb,
  };
}

export async function supportListScreen(
  h: HandlerCtx,
  page: number,
  status: 'open' | 'closed' | 'all',
  q?: string,
): Promise<ScreenReply> {
  if (!h.adminApi) return { text: `${screenTitle('Support')}\nAPI not configured.` };
  const params = new URLSearchParams({ limit: '8', status });
  if (q) params.set('q', q);
  const res = await h.adminApi.get<{ ok: boolean; items: SupportItem[]; nextCursor: string | null }>(
    `/api/admin/support?${params}`,
  );
  if (!res.ok) return { text: `${screenTitle('Support')}\n❌ ${escapeHtml(res.error)}` };

  const items = res.data.items ?? [];
  setListIds(h.telegramUserId, items.map((i) => i.id));

  const kb = new InlineKeyboard();
  items.forEach((item, idx) => {
    const label = `${item.reference} · ${truncate(item.subject || 'no subject', 28)}`;
    kb.text(label, `su:v:${page}:${idx}:${status[0]}`).row();
  });
  const hasMore = Boolean(res.data.nextCursor);
  paginateRow(kb, page > 0 ? `su:l:${page - 1}:${status[0]}` : null, hasMore ? `su:l:${page + 1}:${status[0]}` : null);
  kb.text('◀️ Support', 'su').row().text('◀️ Menu', 'm');

  const title = status === 'open' ? 'Open tickets' : status === 'closed' ? 'Closed tickets' : 'All tickets';
  return {
    text: `${screenTitle('Support', title)}${q ? `\nSearch: ${escapeHtml(q)}` : ''}\n\nTap a ticket for details.`,
    keyboard: kb,
  };
}

export async function supportDetailScreen(
  h: HandlerCtx,
  page: number,
  index: number,
  statusFlag: string,
): Promise<ScreenReply> {
  const id = getListId(h.telegramUserId, index);
  if (!id || !h.adminApi) return { text: `${screenTitle('Support')}\nTicket not found.` };

  const res = await h.adminApi.get<{ ok: boolean; items: SupportItem[] }>(
    `/api/admin/support?limit=1&status=all&q=${encodeURIComponent(id)}`,
  );
  if (!res.ok || !res.data.items?.[0]) {
    return { text: `${screenTitle('Support')}\n❌ Ticket not found.` };
  }
  const t = res.data.items[0];
  const diag = truncate(JSON.stringify(t.diagnostics ?? {}), 400);
  const logs = truncate(JSON.stringify(t.appLogs ?? {}), 400);

  const lines = [
    screenTitle(`Ticket ${t.reference}`, t.status === 'open' ? '⏳ open' : '✅ closed'),
    t.email ? `Email: ${escapeHtml(t.email)}` : 'Email: (none)',
    t.subject ? `Subject: ${escapeHtml(truncate(t.subject, 120))}` : null,
    `Created: ${formatIsoShort(t.createdAt)}`,
    '',
    '<b>Message</b>',
    escapeHtml(truncate(t.message, 600)),
    '',
    '<b>Diagnostics (preview)</b>',
    `<code>${escapeHtml(diag)}</code>`,
    '',
    '<b>App logs (preview)</b>',
    `<code>${escapeHtml(logs)}</code>`,
  ].filter(Boolean) as string[];

  const kb = new InlineKeyboard();
  if (t.status === 'open') {
    kb.text('✅ Close', `su:xc:${page}:${index}:${statusFlag}`).row();
    kb.text('✉️ Reply email', `su:re:${t.id}`).text('🤖 AI draft', `su:ai:${t.id}`).row();
    kb.text('📣 Push reply', `su:pu:${t.id}`).text('🗝 Pro key', `su:pk:${t.id}`).row();
  } else {
    kb.text('↩️ Reopen', `su:xo:${page}:${index}:${statusFlag}`).row();
  }
  kb.text('◀️ List', `su:l:${page}:${statusFlag}`).row().text('◀️ Menu', 'm');

  return { text: lines.join('\n'), keyboard: kb };
}

export async function supportConfirmStatus(
  h: HandlerCtx,
  close: boolean,
  page: number,
  index: number,
  statusFlag: string,
): Promise<ScreenReply> {
  const id = getListId(h.telegramUserId, index);
  if (!id) return { text: `${screenTitle('Support')}\nTicket not found.` };
  const kb = new InlineKeyboard()
    .text('✅ Confirm', `su:xs:${close ? 'c' : 'o'}:${page}:${index}:${statusFlag}`)
    .text('❌ Cancel', `su:v:${page}:${index}:${statusFlag}`);
  return {
    text: `${screenTitle('Confirm')}\n${close ? 'Close' : 'Reopen'} ticket <code>${escapeHtml(id.slice(0, 12))}…</code>?`,
    keyboard: kb,
  };
}

export async function supportApplyStatus(
  h: HandlerCtx,
  close: boolean,
  page: number,
  index: number,
  statusFlag: string,
): Promise<ScreenReply> {
  const id = getListId(h.telegramUserId, index);
  if (!id || !h.adminApi) return { text: `${screenTitle('Support')}\nTicket not found.` };
  const res = await h.adminApi.patch<{ ok: boolean }>('/api/admin/support', {
    id,
    status: close ? 'closed' : 'open',
  });
  if (!res.ok) return { text: `${screenTitle('Support')}\n❌ ${escapeHtml(res.error)}` };
  return supportDetailScreen(h, page, index, statusFlag);
}
