import { InlineKeyboard } from 'grammy';

import type { HandlerCtx } from '../context.js';
import { getListId, setListIds } from '../session/store.js';
import { escapeHtml, formatIsoShort } from '../ui/format.js';
import { paginateRow, requirePerm } from '../ui/keyboards.js';
import type { ScreenReply } from '../ui/reply.js';
import { screenTitle } from '../ui/reply.js';

const HISTORY_PAGE_SIZE = 8;

type BroadcastItem = {
  id: string;
  createdAt: string;
  kind: string;
  notifyType: string;
  sent: number;
  failed: number;
  total: number;
  title?: string | null;
};

const PUSH_TYPES = [
  { id: 'policy_update', label: 'Policy update', cb: 'pu' },
  { id: 'limit_warning', label: 'Limit warning', cb: 'lw' },
  { id: 'limit_exceeded', label: 'Limit exceeded', cb: 'le' },
  { id: 'ai_complete', label: 'AI complete', cb: 'ac' },
] as const;

const DEVICE_PAGE_SIZE = 6;

const PUSH_CB_TO_ID: Record<string, string> = Object.fromEntries(
  PUSH_TYPES.map((t) => [t.cb, t.id]),
);

const BROADCAST_COPY: Record<
  string,
  { en: { title: string; body: string }; ru: { title: string; body: string } }
> = {
  policy_update: {
    en: { title: 'Voice Inbox update', body: 'Please review the latest policy update in the app.' },
    ru: {
      title: 'Обновление Voice Inbox',
      body: 'Ознакомьтесь с обновлением политики в приложении.',
    },
  },
  limit_warning: {
    en: { title: 'Voice Inbox', body: 'You are approaching your weekly AI limit.' },
    ru: { title: 'Voice Inbox', body: 'Вы приближаетесь к недельному лимиту AI.' },
  },
  limit_exceeded: {
    en: { title: 'Voice Inbox', body: 'Your weekly AI limit has been reached.' },
    ru: { title: 'Voice Inbox', body: 'Достигнут недельный лимит AI.' },
  },
  ai_complete: {
    en: { title: 'Voice Inbox', body: 'Your AI task has finished processing.' },
    ru: { title: 'Voice Inbox', body: 'Обработка AI завершена.' },
  },
};

function deviceButtonLabel(deviceId: string): string {
  return deviceId.length > 10 ? `${deviceId.slice(0, 8)}…` : deviceId;
}

export async function messagingHomeScreen(h: HandlerCtx): Promise<ScreenReply> {
  const denied = h.profile ? requirePerm(h.profile, 'messaging') : 'Not linked.';
  if (denied) return { text: `${screenTitle('Push')}\n${denied}` };
  const kb = new InlineKeyboard()
    .text('📱 Single device', 'ms:one')
    .text('📣 Broadcast', 'ms:bc')
    .row()
    .text('📜 History', 'ms:hi:0')
    .row()
    .text('◀️ Menu', 'm');
  return {
    text: screenTitle('Push & Broadcast', 'Notifications to registered devices'),
    keyboard: kb,
  };
}

export async function messagingHistoryScreen(h: HandlerCtx, page: number): Promise<ScreenReply> {
  if (!h.adminApi) return { text: `${screenTitle('Push')}\nAPI not configured.` };
  const res = await h.adminApi.get<{ ok: boolean; items: BroadcastItem[] }>(
    `/api/admin/broadcast-history?limit=40`,
  );
  if (!res.ok) return { text: `${screenTitle('Push')}\n❌ ${escapeHtml(res.error)}` };

  const all = res.data.items ?? [];
  const slice = all.slice(page * HISTORY_PAGE_SIZE, (page + 1) * HISTORY_PAGE_SIZE);
  const lines = [screenTitle('Push history', `Page ${page + 1}`), ''];
  for (const b of slice) {
    lines.push(
      `· ${formatIsoShort(b.createdAt)} ${escapeHtml(b.notifyType)} — ✅${b.sent} ❌${b.failed} / ${b.total}`,
    );
  }
  if (!slice.length) lines.push('(no entries)');

  const kb = new InlineKeyboard();
  if (page > 0) kb.text('◀️ Prev', `ms:hi:${page - 1}`);
  if ((page + 1) * HISTORY_PAGE_SIZE < all.length) kb.text('Next ▶️', `ms:hi:${page + 1}`);
  kb.row().text('◀️ Push', 'ms').row().text('◀️ Menu', 'm');
  return { text: lines.join('\n'), keyboard: kb };
}

export function messagingBroadcastTypeScreen(_h: HandlerCtx): ScreenReply {
  const kb = new InlineKeyboard();
  for (const t of PUSH_TYPES) {
    kb.text(t.label, `ms:bct:${t.cb}`).row();
  }
  kb.text('◀️ Push', 'ms');
  return {
    text: screenTitle('Broadcast', 'Choose notification type'),
    keyboard: kb,
  };
}

export function messagingBroadcastPreview(h: HandlerCtx, typeCb: string): ScreenReply {
  const notifyType = PUSH_CB_TO_ID[typeCb] ?? typeCb;
  const copy = BROADCAST_COPY[notifyType] ?? BROADCAST_COPY.policy_update!;
  const kb = new InlineKeyboard()
    .text('✅ Send broadcast', `ms:bcx:${typeCb}`)
    .row()
    .text('❌ Cancel', 'ms:bc');
  return {
    text: [
      screenTitle('Confirm broadcast', notifyType),
      '',
      '<b>EN</b>',
      `${escapeHtml(copy.en.title)} — ${escapeHtml(copy.en.body)}`,
      '',
      '<b>RU</b>',
      `${escapeHtml(copy.ru.title)} — ${escapeHtml(copy.ru.body)}`,
      '',
      'This will notify <b>all</b> registered devices.',
    ].join('\n'),
    keyboard: kb,
  };
}

export async function messagingSingleDeviceListScreen(
  h: HandlerCtx,
  page: number,
): Promise<ScreenReply> {
  if (!h.adminApi) return { text: `${screenTitle('Single device')}\nAPI not configured.` };
  const res = await h.adminApi.get<{ deviceIds: string[] }>('/api/admin/devices');
  if (!res.ok) return { text: `${screenTitle('Single device')}\n❌ ${escapeHtml(res.error)}` };

  const all = res.data.deviceIds ?? [];
  setListIds(h.telegramUserId, all);

  if (!all.length) {
    return {
      text: screenTitle('Single device', 'No devices with push tokens'),
      keyboard: new InlineKeyboard().text('◀️ Push', 'ms').row().text('◀️ Menu', 'm'),
    };
  }

  const slice = all.slice(page * DEVICE_PAGE_SIZE, (page + 1) * DEVICE_PAGE_SIZE);
  const kb = new InlineKeyboard();
  slice.forEach((_id, idx) => {
    const globalIdx = page * DEVICE_PAGE_SIZE + idx;
    const label = deviceButtonLabel(getListId(h.telegramUserId, globalIdx) ?? '?');
    kb.text(label, `ms:dv:${page}:${globalIdx}`).row();
  });
  paginateRow(
    kb,
    page > 0 ? `ms:dl:${page - 1}` : null,
    (page + 1) * DEVICE_PAGE_SIZE < all.length ? `ms:dl:${page + 1}` : null,
  );
  kb.text('◀️ Push', 'ms').row().text('◀️ Menu', 'm');

  return {
    text: [
      screenTitle('Single device', `${all.length} device(s) with push`),
      '',
      'Tap a device, then choose notification type.',
    ].join('\n'),
    keyboard: kb,
  };
}

export function messagingSingleDeviceTypeScreen(
  h: HandlerCtx,
  deviceIndex: number,
  listPage = Math.floor(deviceIndex / DEVICE_PAGE_SIZE),
): ScreenReply {
  const deviceId = getListId(h.telegramUserId, deviceIndex);
  if (!deviceId) {
    return { text: `${screenTitle('Single device')}\nDevice not found.` };
  }

  const kb = new InlineKeyboard();
  for (const t of PUSH_TYPES) {
    kb.text(t.label, `ms:st:${deviceIndex}:${t.cb}`).row();
  }
  kb.text('◀️ Devices', `ms:dl:${listPage}`).row().text('◀️ Push', 'ms');

  return {
    text: [
      screenTitle('Push to device', escapeHtml(deviceButtonLabel(deviceId))),
      '',
      'Choose notification type:',
    ].join('\n'),
    keyboard: kb,
  };
}

export async function messagingSingleDeviceSend(
  h: HandlerCtx,
  deviceIndex: number,
  typeCb: string,
): Promise<ScreenReply> {
  const deviceId = getListId(h.telegramUserId, deviceIndex);
  const notifyType = PUSH_CB_TO_ID[typeCb];
  if (!deviceId || !notifyType) {
    return { text: `${screenTitle('Single device')}\nInvalid device or type.` };
  }
  if (!h.adminApi) return { text: `${screenTitle('Single device')}\nAPI not configured.` };

  const res = await h.adminApi.post<{ ok: boolean }>('/api/admin/push/send', {
    deviceId,
    type: notifyType,
    title: 'Voice Inbox',
    body: 'You have a new notification.',
  });

  if (!res.ok) {
    return {
      text: `${screenTitle('Push failed')}\n❌ ${escapeHtml(res.error)}`,
      keyboard: new InlineKeyboard()
        .text('◀️ Retry', `ms:dv:${Math.floor(deviceIndex / DEVICE_PAGE_SIZE)}:${deviceIndex}`)
        .row()
        .text('◀️ Push', 'ms'),
    };
  }

  return {
    text: [
      screenTitle('Push sent', '✅'),
      `Device: <code>${escapeHtml(deviceButtonLabel(deviceId))}</code>`,
      `Type: ${escapeHtml(notifyType)}`,
    ].join('\n'),
    keyboard: new InlineKeyboard().text('◀️ Push', 'ms').row().text('◀️ Menu', 'm'),
  };
}

export async function messagingBroadcastSend(h: HandlerCtx, typeCb: string): Promise<ScreenReply> {
  const notifyType = PUSH_CB_TO_ID[typeCb] ?? typeCb;
  if (!h.adminApi) return { text: `${screenTitle('Broadcast')}\nAPI not configured.` };
  const copy = BROADCAST_COPY[notifyType] ?? BROADCAST_COPY.policy_update!;
  const res = await h.adminApi.post<{ ok: boolean; sent: number; failed: number; total: number }>(
    '/api/admin/broadcast',
    {
      type: notifyType,
      i18n: { en: copy.en, ru: copy.ru },
    },
  );
  if (!res.ok) return { text: `${screenTitle('Broadcast')}\n❌ ${escapeHtml(res.error)}` };
  const d = res.data;
  return {
    text: [
      screenTitle('Broadcast sent'),
      `Type: ${escapeHtml(notifyType)}`,
      `Sent: ✅ ${d.sent}`,
      `Failed: ❌ ${d.failed}`,
      `Total: ${d.total}`,
    ].join('\n'),
    keyboard: new InlineKeyboard().text('◀️ Push', 'ms').row().text('◀️ Menu', 'm'),
  };
}
