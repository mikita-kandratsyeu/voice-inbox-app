import { InlineKeyboard } from 'grammy';

import type { HandlerCtx } from '../context.js';
import { getListId, setListIds } from '../session/store.js';
import { escapeHtml, formatIsoShort } from '../ui/format.js';
import { confirmKeyboard, requirePerm } from '../ui/keyboards.js';
import type { ScreenReply } from '../ui/reply.js';
import { screenTitle } from '../ui/reply.js';

type ReleaseItem = {
  id: string;
  locale: string;
  slug: string;
  title: string;
  version: string | null;
  published: boolean;
  publishedAt: string | null;
};

export async function releasesHomeScreen(h: HandlerCtx): Promise<ScreenReply> {
  const denied = h.profile ? requirePerm(h.profile, 'releases') : 'Not linked.';
  if (denied) return { text: `${screenTitle('Releases')}\n${denied}` };
  const kb = new InlineKeyboard()
    .text('English', 'rl:l:en')
    .text('Russian', 'rl:l:ru')
    .row()
    .text('◀️ Menu', 'm');
  return { text: screenTitle('Releases', 'Landing changelog posts'), keyboard: kb };
}

export async function releasesListScreen(h: HandlerCtx, locale: string): Promise<ScreenReply> {
  if (!h.adminApi) return { text: `${screenTitle('Releases')}\nAPI not configured.` };
  const res = await h.adminApi.get<{ ok: boolean; items: ReleaseItem[] }>(
    `/api/admin/releases?locale=${locale}`,
  );
  if (!res.ok) return { text: `${screenTitle('Releases')}\n❌ ${escapeHtml(res.error)}` };
  const items = res.data.items ?? [];
  setListIds(
    h.telegramUserId,
    items.map((i) => i.id),
  );
  const kb = new InlineKeyboard();
  items.slice(0, 10).forEach((item, idx) => {
    const st = item.published ? '✅' : '📝';
    kb.text(`${st} ${item.title.slice(0, 30)}`, `rl:v:${locale}:${idx}`).row();
  });
  kb.text('◀️ Releases', 'rl').row().text('◀️ Menu', 'm');
  return {
    text: `${screenTitle('Releases', `Locale: ${locale}`)}\n${items.length} post(s).`,
    keyboard: kb,
  };
}

export async function releaseDetailScreen(
  h: HandlerCtx,
  locale: string,
  index: number,
): Promise<ScreenReply> {
  const id = getListId(h.telegramUserId, index);
  if (!id || !h.adminApi) return { text: `${screenTitle('Releases')}\nNot found.` };

  const res = await h.adminApi.get<{ ok: boolean; items: ReleaseItem[] }>(
    `/api/admin/releases?locale=${locale}`,
  );
  if (!res.ok) return { text: `${screenTitle('Releases')}\n❌ ${escapeHtml(res.error)}` };
  const item = res.data.items?.find((i) => i.id === id);
  if (!item) return { text: `${screenTitle('Releases')}\nNot found.` };

  const kb = new InlineKeyboard();
  if (item.published) {
    kb.text('Unpublish', `rl:xp:${locale}:${index}`).row();
  } else {
    kb.text('Publish', `rl:xb:${locale}:${index}`).row();
  }
  kb.text('◀️ List', `rl:l:${locale}`).row().text('◀️ Menu', 'm');

  return {
    text: [
      screenTitle(item.title, item.published ? '✅ published' : '📝 draft'),
      `Slug: ${escapeHtml(item.slug)}`,
      item.version ? `Version: ${escapeHtml(item.version)}` : null,
      item.publishedAt ? `Published: ${formatIsoShort(item.publishedAt)}` : null,
      '',
      'Edit body in web admin for long content.',
    ]
      .filter(Boolean)
      .join('\n'),
    keyboard: kb,
  };
}

export function releaseToggleConfirm(
  h: HandlerCtx,
  locale: string,
  index: number,
  publish: boolean,
): ScreenReply {
  return {
    text: `${screenTitle('Confirm')}\n${publish ? 'Publish' : 'Unpublish'} this release?`,
    keyboard: confirmKeyboard(
      `rl:xs:${publish ? 'p' : 'u'}:${locale}:${index}`,
      `rl:v:${locale}:${index}`,
    ),
  };
}

export async function releaseTogglePublish(
  h: HandlerCtx,
  locale: string,
  index: number,
  publish: boolean,
): Promise<ScreenReply> {
  const id = getListId(h.telegramUserId, index);
  if (!id || !h.adminApi) return { text: `${screenTitle('Releases')}\nNot found.` };
  const res = await h.adminApi.patch<{ ok: boolean }>(`/api/admin/releases/${id}`, {
    published: publish,
    ...(publish ? { publishedAt: new Date().toISOString() } : { publishedAt: null }),
  });
  if (!res.ok) return { text: `${screenTitle('Releases')}\n❌ ${escapeHtml(res.error)}` };
  return releaseDetailScreen(h, locale, index);
}
