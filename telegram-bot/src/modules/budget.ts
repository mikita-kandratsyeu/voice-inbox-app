import { InlineKeyboard } from 'grammy';

import type { HandlerCtx } from '../context.js';
import { clearFlow, getFlow, getListId, setFlow, setListIds } from '../session/store.js';
import { escapeHtml, formatCents, formatIsoShort } from '../ui/format.js';
import { confirmKeyboard, requirePerm } from '../ui/keyboards.js';
import type { ScreenReply } from '../ui/reply.js';
import { screenTitle } from '../ui/reply.js';

const BUDGET_PAGE_SIZE = 8;

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
  setListIds(
    h.telegramUserId,
    (res.data.items ?? []).map((i) => i.id),
  );
  for (const e of recent) {
    lines.push(
      `· ${formatIsoShort(e.spentAt)} ${escapeHtml(e.category)} — ${formatCents(e.amountCents, e.currency)}`,
    );
  }
  if (!recent.length) lines.push('(none)');

  const kb = new InlineKeyboard()
    .text('➕ Quick $10', 'bu:add')
    .text('➕ Custom', 'bu:add:flow')
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
  const slice = all.slice(page * BUDGET_PAGE_SIZE, (page + 1) * BUDGET_PAGE_SIZE);
  setListIds(
    h.telegramUserId,
    slice.map((i) => i.id),
  );

  const kb = new InlineKeyboard();
  slice.forEach((e, idx) => {
    kb.text(
      `${e.category} · ${formatCents(e.amountCents, e.currency)}`,
      `bu:v:${page}:${idx}`,
    ).row();
  });
  if (page > 0) kb.text('◀️ Prev', `bu:l:${page - 1}`);
  if ((page + 1) * BUDGET_PAGE_SIZE < all.length) kb.text('Next ▶️', `bu:l:${page + 1}`);
  kb.row().text('◀️ Budget', 'bu').row().text('◀️ Menu', 'm');

  return {
    text: `${screenTitle('Expenses', `Page ${page + 1}`)}`,
    keyboard: kb,
  };
}

export async function budgetDetailScreen(
  h: HandlerCtx,
  page: number,
  index: number,
): Promise<ScreenReply> {
  const id = getListId(h.telegramUserId, index);
  if (!id || !h.adminApi) return { text: `${screenTitle('Budget')}\nExpense not found.` };

  const res = await h.adminApi.get<{ ok: boolean; items: ExpenseItem[] }>('/api/admin/budget');
  if (!res.ok) return { text: `${screenTitle('Budget')}\n❌ ${escapeHtml(res.error)}` };
  const item = (res.data.items ?? []).find((e) => e.id === id);
  if (!item) return { text: `${screenTitle('Budget')}\nExpense not found.` };

  const lines = [
    screenTitle('Expense', escapeHtml(item.category)),
    `Date: ${formatIsoShort(item.spentAt)}`,
    `Amount: ${formatCents(item.amountCents, item.currency)}`,
    item.description ? `Description: ${escapeHtml(item.description)}` : null,
    `Id: <code>${escapeHtml(item.id)}</code>`,
  ].filter(Boolean) as string[];

  const kb = new InlineKeyboard()
    .text('🗑 Delete', `bu:xd:${page}:${index}`)
    .row()
    .text('◀️ List', `bu:l:${page}`)
    .row()
    .text('◀️ Menu', 'm');

  return { text: lines.join('\n'), keyboard: kb };
}

export function budgetDeleteConfirm(h: HandlerCtx, page: number, index: number): ScreenReply {
  const id = getListId(h.telegramUserId, index);
  const label = id ? `<code>${escapeHtml(id.slice(0, 12))}…</code>` : 'this expense';
  return {
    text: `${screenTitle('Confirm')}\nDelete ${label}?`,
    keyboard: confirmKeyboard(`bu:xs:${page}:${index}`, `bu:v:${page}:${index}`),
  };
}

export function budgetExpenseFlowStart(h: HandlerCtx): ScreenReply {
  setFlow(h.telegramUserId, { kind: 'budget_expense', step: 'amount', data: {} });
  const kb = new InlineKeyboard().text('❌ Cancel', 'bu').row();
  return {
    text: [
      screenTitle('Add expense'),
      '',
      'Send the amount in USD (e.g. <code>25.50</code>).',
      '/cancel to abort.',
    ].join('\n'),
    keyboard: kb,
  };
}

export async function handleBudgetExpenseMessage(
  h: HandlerCtx,
  text: string,
): Promise<ScreenReply | null> {
  const flow = getFlow(h.telegramUserId);
  if (!flow || flow.kind !== 'budget_expense') return null;
  if (!h.adminApi) {
    clearFlow(h.telegramUserId);
    return { text: `${screenTitle('Budget')}\nAPI not configured.` };
  }

  const value = text.trim();
  if (!value) return { text: `${screenTitle('Add expense')}\nValue cannot be empty.` };

  if (flow.step === 'amount') {
    if (!/^\d+(\.\d{1,2})?$/.test(value)) {
      return { text: `${screenTitle('Add expense')}\nInvalid amount. Use format like 12.50` };
    }
    setFlow(h.telegramUserId, {
      kind: 'budget_expense',
      step: 'category',
      data: { amount: value },
    });
    return {
      text: `${screenTitle('Add expense')}\nSend category (e.g. hosting, ai, misc).`,
    };
  }

  if (flow.step === 'category') {
    const amount = flow.data.amount;
    if (typeof amount !== 'string') {
      clearFlow(h.telegramUserId);
      return budgetExpenseFlowStart(h);
    }
    setFlow(h.telegramUserId, {
      kind: 'budget_expense',
      step: 'description',
      data: { amount, category: value.slice(0, 64) },
    });
    return {
      text: `${screenTitle('Add expense')}\nSend description (optional text).`,
    };
  }

  if (flow.step === 'description') {
    const amount = flow.data.amount;
    const category = flow.data.category;
    if (typeof amount !== 'string' || typeof category !== 'string') {
      clearFlow(h.telegramUserId);
      return budgetExpenseFlowStart(h);
    }
    const res = await h.adminApi.post<{ ok: boolean }>('/api/admin/budget', {
      description: value.slice(0, 500) || 'Telegram bot expense',
      category,
      amount,
      currency: 'USD',
    });
    clearFlow(h.telegramUserId);
    if (!res.ok) return { text: `${screenTitle('Budget')}\n❌ ${escapeHtml(res.error)}` };
    return budgetHomeScreen(h);
  }

  clearFlow(h.telegramUserId);
  return null;
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

export async function budgetDeleteExpense(
  h: HandlerCtx,
  page: number,
  index: number,
): Promise<ScreenReply> {
  const id = getListId(h.telegramUserId, index);
  if (!id || !h.adminApi) return { text: `${screenTitle('Budget')}\nNot found.` };
  const res = await h.adminApi.delete<{ ok: boolean }>(`/api/admin/budget/${id}`);
  if (!res.ok) return { text: `${screenTitle('Budget')}\n❌ ${escapeHtml(res.error)}` };
  return budgetListScreen(h, page);
}
