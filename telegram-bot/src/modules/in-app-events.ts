import { InlineKeyboard } from 'grammy';

import type { HandlerCtx } from '../context.js';
import { getListId, setListIds } from '../session/store.js';
import { escapeHtml, formatIsoShort } from '../ui/format.js';
import { confirmKeyboard, requirePerm } from '../ui/keyboards.js';
import type { ScreenReply } from '../ui/reply.js';
import { screenTitle } from '../ui/reply.js';

type InAppEventItem = {
  id: string;
  eventId: string;
  locale: string;
  title: string;
  contentType: string;
  published: boolean;
  revision: number;
  updatedAt: string;
};

export async function inAppEventsHomeScreen(h: HandlerCtx): Promise<ScreenReply> {
  const denied = h.profile ? requirePerm(h.profile, 'in_app_events') : 'Not linked.';
  if (denied) return { text: `${screenTitle('In-app Events')}\n${denied}` };
  const kb = new InlineKeyboard()
    .text('English', 'ev:l:en')
    .text('Russian', 'ev:l:ru')
    .row()
    .text('◀️ Menu', 'm');
  return {
    text: screenTitle('In-app Events', 'App Store event pages in the mobile app'),
    keyboard: kb,
  };
}

export async function inAppEventsListScreen(h: HandlerCtx, locale: string): Promise<ScreenReply> {
  if (!h.adminApi) return { text: `${screenTitle('Events')}\nAPI not configured.` };
  const res = await h.adminApi.get<{ ok: boolean; items: InAppEventItem[] }>(
    `/api/admin/in-app-events?locale=${locale}`,
  );
  if (!res.ok) return { text: `${screenTitle('Events')}\n❌ ${escapeHtml(res.error)}` };

  const items = res.data.items ?? [];
  setListIds(
    h.telegramUserId,
    items.map((i) => i.id),
  );

  const kb = new InlineKeyboard();
  items.slice(0, 12).forEach((item, idx) => {
    const st = item.published ? '✅' : '📝';
    kb.text(`${st} ${truncateTitle(item.title)}`, `ev:v:${locale}:${idx}`).row();
  });
  kb.text('◀️ Events', 'ev').row().text('◀️ Menu', 'm');

  return {
    text: `${screenTitle('Events', `Locale: ${locale}`)}\n${items.length} event(s). Edit body in web admin.`,
    keyboard: kb,
  };
}

function truncateTitle(title: string): string {
  return title.length > 30 ? `${title.slice(0, 28)}…` : title;
}

export async function inAppEventDetailScreen(
  h: HandlerCtx,
  locale: string,
  index: number,
): Promise<ScreenReply> {
  const id = getListId(h.telegramUserId, index);
  if (!id || !h.adminApi) return { text: `${screenTitle('Events')}\nNot found.` };

  const res = await h.adminApi.get<{ ok: boolean; items: InAppEventItem[] }>(
    `/api/admin/in-app-events?locale=${locale}`,
  );
  if (!res.ok) return { text: `${screenTitle('Events')}\n❌ ${escapeHtml(res.error)}` };
  const item = res.data.items?.find((i) => i.id === id);
  if (!item) return { text: `${screenTitle('Events')}\nNot found.` };

  const kb = new InlineKeyboard();
  if (item.published) {
    kb.text('Unpublish', `ev:xc:${locale}:${index}`).row();
  } else {
    kb.text('Publish', `ev:xb:${locale}:${index}`).row();
  }
  kb.text('◀️ List', `ev:l:${locale}`).row().text('◀️ Menu', 'm');

  return {
    text: [
      screenTitle(item.title, item.published ? '✅ published' : '📝 draft'),
      `Event id: <code>${escapeHtml(item.eventId)}</code>`,
      `Locale: ${escapeHtml(item.locale)}`,
      `Type: ${escapeHtml(item.contentType)}`,
      `Revision: ${item.revision}`,
      `Updated: ${formatIsoShort(item.updatedAt)}`,
      '',
      'Edit content in web admin.',
    ].join('\n'),
    keyboard: kb,
  };
}

export function inAppEventToggleConfirm(
  h: HandlerCtx,
  locale: string,
  index: number,
  publish: boolean,
): ScreenReply {
  const id = getListId(h.telegramUserId, index);
  return {
    text: `${screenTitle('Confirm')}\n${publish ? 'Publish' : 'Unpublish'} event <code>${escapeHtml((id ?? '').slice(0, 12))}…</code>?`,
    keyboard: confirmKeyboard(
      `ev:xs:${publish ? 'p' : 'u'}:${locale}:${index}`,
      `ev:v:${locale}:${index}`,
    ),
  };
}

export async function inAppEventToggleApply(
  h: HandlerCtx,
  locale: string,
  index: number,
  publish: boolean,
): Promise<ScreenReply> {
  const id = getListId(h.telegramUserId, index);
  if (!id || !h.adminApi) return { text: `${screenTitle('Events')}\nNot found.` };
  const res = await h.adminApi.patch<{ ok: boolean }>(`/api/admin/in-app-events/${id}`, {
    published: publish,
  });
  if (!res.ok) return { text: `${screenTitle('Events')}\n❌ ${escapeHtml(res.error)}` };
  return inAppEventDetailScreen(h, locale, index);
}
