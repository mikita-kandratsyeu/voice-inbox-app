import { InlineKeyboard } from 'grammy';

import type { HandlerCtx } from '../context.js';
import { getListId, setListIds } from '../session/store.js';
import { escapeHtml, formatIsoShort } from '../ui/format.js';
import { paginateRow, requirePerm } from '../ui/keyboards.js';
import type { ScreenReply } from '../ui/reply.js';
import { screenTitle } from '../ui/reply.js';

/** Matches GET /api/admin/pro-licenses items (enrichProLicenseRows). */
type ProKeyItem = {
  id: string;
  durationMonths: number;
  durationDays: number | null;
  createdAt: string;
  issuedToEmail: string | null;
  adminNotes: string | null;
  consumed: boolean;
  consumedAt: string | null;
  nominalGrantEndsAt: string | null;
  deviceProExpiresAt: string | null;
  deviceProActive: boolean;
  devicePrefix: string | null;
};

function proKeyStatusLabel(item: ProKeyItem): string {
  if (!item.consumed) return 'unused';
  return item.deviceProActive ? 'active' : 'redeemed';
}

function formatDuration(item: ProKeyItem): string {
  if (item.durationDays != null && item.durationDays > 0) {
    return `${item.durationDays}d`;
  }
  return `${item.durationMonths}mo`;
}

export async function proKeysHomeScreen(h: HandlerCtx): Promise<ScreenReply> {
  const denied = h.profile ? requirePerm(h.profile, 'config') : 'Not linked.';
  if (denied) return { text: `${screenTitle('Pro Keys')}\n${denied}` };
  const kb = new InlineKeyboard()
    .text('Unused', 'pk:l:0:u')
    .text('Redeemed', 'pk:l:0:r')
    .text('All', 'pk:l:0:a')
    .row()
    .text('➕ Generate', 'pk:g')
    .row()
    .text('◀️ Menu', 'm');
  return { text: screenTitle('Pro Keys', 'License keys for Pro access'), keyboard: kb };
}

export async function proKeysListScreen(
  h: HandlerCtx,
  page: number,
  filter: 'unused' | 'redeemed' | 'all',
): Promise<ScreenReply> {
  if (!h.adminApi) return { text: `${screenTitle('Pro Keys')}\nAPI not configured.` };
  const status = filter === 'all' ? 'all' : filter === 'unused' ? 'unused' : 'redeemed';
  const res = await h.adminApi.get<{
    ok: boolean;
    items: ProKeyItem[];
    pagination: { page: number; totalPages: number };
  }>(`/api/admin/pro-licenses?status=${status}&page=${page + 1}&pageSize=8`);
  if (!res.ok) return { text: `${screenTitle('Pro Keys')}\n❌ ${escapeHtml(res.error)}` };

  const items = res.data.items ?? [];
  setListIds(
    h.telegramUserId,
    items.map((i) => i.id),
  );
  const kb = new InlineKeyboard();
  items.forEach((item, idx) => {
    const st = proKeyStatusLabel(item);
    kb.text(`${st} · ${item.id.slice(0, 8)}…`, `pk:v:${page}:${idx}:${filter[0]}`).row();
  });
  const totalPages = res.data.pagination?.totalPages ?? 1;
  paginateRow(
    kb,
    page > 0 ? `pk:l:${page - 1}:${filter[0]}` : null,
    page + 1 < totalPages ? `pk:l:${page + 1}:${filter[0]}` : null,
  );
  kb.text('◀️ Pro Keys', 'pk').row().text('◀️ Menu', 'm');
  return {
    text: `${screenTitle('Pro Keys', `Filter: ${status}`)}\nTap a key for actions.`,
    keyboard: kb,
  };
}

export async function proKeyDetailScreen(
  h: HandlerCtx,
  page: number,
  index: number,
  filterFlag: string,
): Promise<ScreenReply> {
  const id = getListId(h.telegramUserId, index);
  if (!id || !h.adminApi) return { text: `${screenTitle('Pro Keys')}\nNot found.` };

  const res = await h.adminApi.get<{ ok: boolean; items: ProKeyItem[] }>(
    `/api/admin/pro-licenses?status=all&page=1&pageSize=100`,
  );
  if (!res.ok) return { text: `${screenTitle('Pro Keys')}\n❌ ${escapeHtml(res.error)}` };
  const item = res.data.items?.find((i) => i.id === id);
  if (!item) return { text: `${screenTitle('Pro Keys')}\nNot found.` };

  const st = proKeyStatusLabel(item);
  const lines = [
    screenTitle('Pro Key', st),
    `Id: <code>${escapeHtml(item.id)}</code>`,
    `Duration: ${escapeHtml(formatDuration(item))}`,
    `Created: ${formatIsoShort(item.createdAt)}`,
    item.issuedToEmail ? `Email: ${escapeHtml(item.issuedToEmail)}` : null,
    item.devicePrefix ? `Device: <code>${escapeHtml(item.devicePrefix)}</code>` : 'Device: (none)',
    item.consumedAt ? `Redeemed: ${formatIsoShort(item.consumedAt)}` : null,
    item.nominalGrantEndsAt ? `Grant ends: ${formatIsoShort(item.nominalGrantEndsAt)}` : null,
    item.deviceProExpiresAt ? `Pro until: ${formatIsoShort(item.deviceProExpiresAt)}` : null,
    item.deviceProActive ? 'Device Pro: ✅ active' : item.consumed ? 'Device Pro: inactive' : null,
    item.adminNotes ? `Note: ${escapeHtml(item.adminNotes)}` : null,
  ].filter(Boolean) as string[];

  const kb = new InlineKeyboard();
  if (!item.consumed) {
    kb.text('🗑 Delete', `pk:xd:${page}:${index}:${filterFlag}`).row();
  } else {
    kb.text('↩️ Reset redemption', `pk:xr:${page}:${index}:${filterFlag}`).row();
  }
  kb.text('◀️ List', `pk:l:${page}:${filterFlag}`).row().text('◀️ Menu', 'm');
  return { text: lines.join('\n'), keyboard: kb };
}

export function proKeyGenerateScreen(_h: HandlerCtx): ScreenReply {
  const kb = new InlineKeyboard()
    .text('7 days', 'pk:gd:7')
    .text('1 month', 'pk:gm:1')
    .row()
    .text('3 months', 'pk:gm:3')
    .text('12 months', 'pk:gm:12')
    .row()
    .text('◀️ Pro Keys', 'pk');
  return {
    text: screenTitle('Generate Pro Key', 'Choose duration'),
    keyboard: kb,
  };
}

export async function proKeyGenerateConfirm(
  h: HandlerCtx,
  kind: 'days' | 'months',
  value: number,
): Promise<ScreenReply> {
  if (!h.adminApi) return { text: `${screenTitle('Pro Keys')}\nAPI not configured.` };
  const body = kind === 'days' ? { durationDays: value } : { durationMonths: value };
  const res = await h.adminApi.post<{ ok: boolean; plainKey?: string; hint?: string }>(
    '/api/admin/pro-licenses',
    body,
  );
  if (!res.ok) return { text: `${screenTitle('Pro Keys')}\n❌ ${escapeHtml(res.error)}` };
  const key = res.data.plainKey ?? '(unknown)';
  return {
    text: [
      screenTitle('Pro Key created'),
      '',
      `Key (shown once): <code>${escapeHtml(key)}</code>`,
      res.data.hint ? escapeHtml(res.data.hint) : '',
      '',
      'Store it securely — it will not be shown again.',
    ].join('\n'),
    keyboard: new InlineKeyboard().text('◀️ Pro Keys', 'pk').row().text('◀️ Menu', 'm'),
  };
}
