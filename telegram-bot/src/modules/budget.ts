import { InlineKeyboard } from 'grammy';

import type { HandlerCtx } from '../context.js';
import { getListId, setListIds } from '../session/store.js';
import { requirePerm } from '../ui/keyboards.js';
import { escapeHtml, formatCents, formatIsoShort } from '../ui/format.js';
import type { ScreenReply } from '../ui/reply.js';
import { screenTitle } from '../ui/reply.js';

type ExpenseItem = {
  id: string;
  spentAt: string;
  category: string;
  description: string;
  amountCents: number;
  currency: string;
};

export async function budgetHomeScreen(h: HandlerCtx): Promise<ScreenReply> {
  const denied = h.profile ? requirePerm(h.profile, 'budget') : 'Not linked.';
  if (denied) return { text: `${screenTitle('Budget')}\n${denied}` };
  if (!h.adminApi) return { text: `${screenTitle('Budget')}\nAPI not configured.` };

  const res = await h.adminApi.get<{
    ok: boolean;
    items: ExpenseItem[];
    totals: Record<string, number>;
  }>('/api/admin/budget');
  if (!res.ok) return { text: `${screenTitle('Budget')}\n❌ ${escapeHtml(res.error)}` };

  const lines = [screenTitle('Budget', 'Expense ledger'), '', '<b>Totals</b>'];
  for (const [cur, cents] of Object.entries(res.data.totals ?? {})) {
    lines.push(`· ${formatCents(cents, cur)}`);
  }
  lines.push('', '<b>Recent expenses</b>');
  const recent = (res.data.items ?? []).slice(0, 5);
  setListIds(h.telegramUserId, (res.data.items ?? []).map((i) => i.id));
  for (const e of recent) {
    lines.push(
      `· ${formatIsoShort(e.spentAt)} ${escapeHtml(e.category)} — ${formatCents(e.amountCents, e.currency)}`,
    );
  }
  if (!recent.length) lines.push('(none)');

  const kb = new InlineKeyboard()
    .text('➕ Add expense', 'bu:add')
    .row()
    .text('📋 All expenses', 'bu:l:0')
    .row()
    .text('🔄 Refresh', 'bu')
    .row()
    .text('◀️ Menu', 'm');
  return { text: lines.join('\n'), keyboard: kb };
}

export async function budgetListScreen(h: HandlerCtx, page: number): Promise<ScreenReply> {
  if (!h.adminApi) return { text: `${screenTitle('Budget')}\nAPI not configured.` };
  const res = await h.adminApi.get<{ ok: boolean; items: ExpenseItem[] }>('/api/admin/budget');
  if (!res.ok) return { text: `${screenTitle('Budget')}\n❌ ${escapeHtml(res.error)}` };
  const all = res.data.items ?? [];
  const pageSize = 8;
  const slice = all.slice(page * pageSize, (page + 1) * pageSize);
  setListIds(h.telegramUserId, all.map((i) => i.id));

  const kb = new InlineKeyboard();
  slice.forEach((e, idx) => {
    kb.text(`${e.category} · ${formatCents(e.amountCents, e.currency)}`, `bu:v:${page}:${idx}`).row();
  });
  if (page > 0) kb.text('◀️ Prev', `bu:l:${page - 1}`);
  if ((page + 1) * pageSize < all.length) kb.text('Next ▶️', `bu:l:${page + 1}`);
  kb.row().text('◀️ Budget', 'bu').row().text('◀️ Menu', 'm');

  return {
    text: `${screenTitle('Expenses', `Page ${page + 1}`)}`,
    keyboard: kb,
  };
}

export async function budgetAddQuick(h: HandlerCtx): Promise<ScreenReply> {
  if (!h.adminApi) return { text: `${screenTitle('Budget')}\nAPI not configured.` };
  const res = await h.adminApi.post<{ ok: boolean; item: ExpenseItem }>('/api/admin/budget', {
    description: 'Telegram bot expense',
    category: 'misc',
    amount: '10.00',
    currency: 'USD',
  });
  if (!res.ok) return { text: `${screenTitle('Budget')}\n❌ ${escapeHtml(res.error)}` };
  return budgetHomeScreen(h);
}

export async function budgetDeleteExpense(h: HandlerCtx, page: number, index: number): Promise<ScreenReply> {
  const id = getListId(h.telegramUserId, index);
  if (!id || !h.adminApi) return { text: `${screenTitle('Budget')}\nNot found.` };
  const res = await h.adminApi.delete<{ ok: boolean }>(`/api/admin/budget/${id}`);
  if (!res.ok) return { text: `${screenTitle('Budget')}\n❌ ${escapeHtml(res.error)}` };
  return budgetListScreen(h, page);
}
