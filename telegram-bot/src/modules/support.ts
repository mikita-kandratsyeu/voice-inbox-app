import { InlineKeyboard } from 'grammy';

import type { HandlerCtx } from '../context.js';
import {
  getCursorForPage,
  hasNextPage,
  hasPrevPage,
  paginationKey,
  recordNextCursor,
} from '../session/pagination.js';
import {
  clearFlow,
  getFlow,
  getListId,
  getListMeta,
  getPagination,
  resetPagination,
  setFlow,
  setListIds,
  setListMeta,
  setPagination,
} from '../session/store.js';
import { escapeHtml, formatIsoShort, truncate } from '../ui/format.js';
import { confirmKeyboard, paginateRow, requirePerm } from '../ui/keyboards.js';
import type { ScreenReply } from '../ui/reply.js';
import { screenTitle } from '../ui/reply.js';

const PUSH_MESSAGE_MAX = 3500;
const LIST_LIMIT = 8;

export type SupportItem = {
  id: string;
  reference: string;
  deviceId: string;
  email: string | null;
  subject: string | null;
  message: string;
  diagnostics: unknown;
  appLogs: unknown;
  status: string;
  createdAt: string;
};

type SupportStatus = 'open' | 'closed' | 'all';

function statusFromFlag(flag: string): SupportStatus {
  if (flag === 'o') return 'open';
  if (flag === 'c') return 'closed';
  return 'all';
}

function flagFromStatus(status: SupportStatus): string {
  if (status === 'open') return 'o';
  if (status === 'closed') return 'c';
  return 'a';
}

function listKey(status: SupportStatus, q?: string): string {
  return paginationKey(['support', status, q?.trim() || '']);
}

export function guessLocaleFromDiagnostics(diagnostics: unknown): 'en' | 'ru' | undefined {
  if (!diagnostics || typeof diagnostics !== 'object') return undefined;
  const locales = (diagnostics as { locales?: unknown }).locales;
  if (!Array.isArray(locales) || locales.length === 0) return undefined;
  const first = locales[0];
  if (!first || typeof first !== 'object' || !('languageCode' in first)) return undefined;
  const code = String((first as { languageCode: unknown }).languageCode).toLowerCase();
  if (code === 'ru' || code === 'en') return code;
  return undefined;
}

function supportPushNotificationCopy(locale: 'en' | 'ru' | undefined): {
  title: string;
  body: string;
} {
  if (locale === 'ru') {
    return {
      title: 'Voice Inbox AI',
      body: 'Ответ по вашему обращению в поддержку. Откройте приложение.',
    };
  }
  return {
    title: 'Voice Inbox AI',
    body: 'Reply to your support request. Open the app to read.',
  };
}

function navCtx(page: number, index: number, statusFlag: string): string {
  return `${page}:${index}:${statusFlag}`;
}

function parseNavCtx(raw: string): { page: number; index: number; statusFlag: string } | null {
  const m = raw.match(/^(\d+):(\d+):([oca])$/);
  if (!m) return null;
  return { page: parseInt(m[1]!, 10), index: parseInt(m[2]!, 10), statusFlag: m[3]! };
}

async function fetchSupportItem(h: HandlerCtx, id: string): Promise<SupportItem | null> {
  if (!h.adminApi) return null;
  const res = await h.adminApi.get<{ ok: boolean; items: SupportItem[] }>(
    `/api/admin/support?limit=1&status=all&q=${encodeURIComponent(id)}`,
  );
  if (!res.ok || !res.data.items?.[0]) return null;
  return res.data.items[0];
}

async function fetchSupportLogs(h: HandlerCtx, id: string): Promise<unknown> {
  if (!h.adminApi) return null;
  const res = await h.adminApi.get<{ ok: boolean; appLogs: unknown }>(`/api/admin/support/${id}`);
  if (!res.ok) return null;
  return res.data.appLogs;
}

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

export function supportSearchStart(h: HandlerCtx): ScreenReply {
  setFlow(h.telegramUserId, { kind: 'support_search', step: 'query', data: { status: 'all' } });
  const kb = new InlineKeyboard().text('❌ Cancel', 'su').row();
  return {
    text: [
      screenTitle('Search tickets'),
      '',
      'Send a search query (reference, email, subject, device id, or message text).',
      'Use /cancel to abort.',
    ].join('\n'),
    keyboard: kb,
  };
}

export async function supportListScreen(
  h: HandlerCtx,
  page: number,
  status: SupportStatus,
  q?: string,
): Promise<ScreenReply> {
  if (!h.adminApi) return { text: `${screenTitle('Support')}\nAPI not configured.` };

  const key = listKey(status, q);
  if (page === 0) resetPagination(h.telegramUserId, key);
  const pagination = getPagination(h.telegramUserId, key);
  const cursor = getCursorForPage(pagination, page);

  const params = new URLSearchParams({ limit: String(LIST_LIMIT), status });
  if (cursor) params.set('cursor', cursor);
  if (q) params.set('q', q);

  const res = await h.adminApi.get<{
    ok: boolean;
    items: SupportItem[];
    nextCursor: string | null;
  }>(`/api/admin/support?${params}`);
  if (!res.ok) return { text: `${screenTitle('Support')}\n❌ ${escapeHtml(res.error)}` };

  const items = res.data.items ?? [];
  setListIds(
    h.telegramUserId,
    items.map((i) => i.id),
  );
  if (q) setListMeta(h.telegramUserId, 'support:q', q);
  else setListMeta(h.telegramUserId, 'support:q', '');

  const nextCursor = res.data.nextCursor ?? null;
  setPagination(h.telegramUserId, key, recordNextCursor(pagination, page, nextCursor));

  const statusFlag = flagFromStatus(status);
  const kb = new InlineKeyboard();
  items.forEach((item, idx) => {
    const label = `${item.reference} · ${truncate(item.subject || 'no subject', 28)}`;
    kb.text(label, `su:v:${navCtx(page, idx, statusFlag)}`).row();
  });
  paginateRow(
    kb,
    hasPrevPage(page) ? `su:l:${page - 1}:${statusFlag}` : null,
    hasNextPage(pagination, page, nextCursor) ? `su:l:${page + 1}:${statusFlag}` : null,
  );
  kb.text('◀️ Support', 'su').row().text('◀️ Menu', 'm');

  const title =
    status === 'open' ? 'Open tickets' : status === 'closed' ? 'Closed tickets' : 'All tickets';
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

  const t = await fetchSupportItem(h, id);
  if (!t) return { text: `${screenTitle('Support')}\n❌ Ticket not found.` };

  const fullLogs = await fetchSupportLogs(h, id);
  const diag = truncate(JSON.stringify(t.diagnostics ?? {}), 400);
  const logs = truncate(JSON.stringify(fullLogs ?? t.appLogs ?? {}), 400);
  const nav = navCtx(page, index, statusFlag);

  const lines = [
    screenTitle(`Ticket ${t.reference}`, t.status === 'open' ? '⏳ open' : '✅ closed'),
    t.email ? `Email: ${escapeHtml(t.email)}` : 'Email: (none)',
    `Device: <code>${escapeHtml(truncate(t.deviceId, 24))}</code>`,
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
    kb.text('✅ Close', `su:xc:${nav}`).row();
    kb.text('✉️ Reply email', `su:re:${nav}`).text('🤖 AI draft', `su:ai:${nav}`).row();
    kb.text('📣 Push reply', `su:pu:${nav}`).text('🗝 Pro key', `su:pk:${nav}`).row();
  } else {
    kb.text('↩️ Reopen', `su:xo:${nav}`).row();
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
  const nav = navCtx(page, index, statusFlag);
  const kb = confirmKeyboard(`su:xs:${close ? 'c' : 'o'}:${nav}`, `su:v:${nav}`);
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

export async function supportAiDraftScreen(
  h: HandlerCtx,
  page: number,
  index: number,
  statusFlag: string,
): Promise<ScreenReply> {
  const id = getListId(h.telegramUserId, index);
  if (!id || !h.adminApi) return { text: `${screenTitle('Support')}\nTicket not found.` };

  const t = await fetchSupportItem(h, id);
  if (!t) return { text: `${screenTitle('Support')}\n❌ Ticket not found.` };

  const locale = guessLocaleFromDiagnostics(t.diagnostics);
  const res = await h.adminApi.post<{ ok: boolean; markdown?: string }>(
    '/api/admin/ai/support-reply-draft',
    {
      subject: t.subject,
      message: t.message,
      ...(locale ? { locale } : {}),
    },
  );
  if (!res.ok) {
    return { text: `${screenTitle('AI draft')}\n❌ ${escapeHtml(res.error)}` };
  }
  if (!res.data.markdown) {
    return { text: `${screenTitle('AI draft')}\n❌ Empty draft` };
  }

  const markdown = res.data.markdown.slice(0, PUSH_MESSAGE_MAX);
  const nav = navCtx(page, index, statusFlag);
  setFlow(h.telegramUserId, {
    kind: 'support_reply',
    step: 'preview',
    data: { ticketId: id, markdown, mode: 'draft', nav },
  });

  const kb = new InlineKeyboard()
    .text('✉️ Send email', `su:sem:${nav}`)
    .text('📣 Send push', `su:spm:${nav}`)
    .row()
    .text('✏️ Edit text', `su:ree:${nav}`)
    .row()
    .text('◀️ Ticket', `su:v:${nav}`);
  return {
    text: [
      screenTitle('AI draft', t.reference),
      '',
      escapeHtml(truncate(markdown, 1200)),
      '',
      '<i>Choose an action or edit before sending.</i>',
    ].join('\n'),
    keyboard: kb,
  };
}

export function supportReplyStart(
  h: HandlerCtx,
  page: number,
  index: number,
  statusFlag: string,
  mode: 'email' | 'push',
): ScreenReply {
  const id = getListId(h.telegramUserId, index);
  if (!id) return { text: `${screenTitle('Support')}\nTicket not found.` };
  const nav = navCtx(page, index, statusFlag);
  setFlow(h.telegramUserId, {
    kind: 'support_reply',
    step: 'compose',
    data: { ticketId: id, mode, nav },
  });
  const kb = new InlineKeyboard().text('❌ Cancel', `su:v:${nav}`).row();
  return {
    text: [
      screenTitle(mode === 'email' ? 'Reply by email' : 'Push reply'),
      '',
      'Send your reply text (Markdown) in the next message.',
      `Max ${PUSH_MESSAGE_MAX} characters. /cancel to abort.`,
    ].join('\n'),
    keyboard: kb,
  };
}

export function supportReplyPreview(h: HandlerCtx, nav: string, markdown: string): ScreenReply {
  const mode = (getFlow(h.telegramUserId)?.data.mode as string) || 'email';
  const kb = new InlineKeyboard()
    .text('✅ Send', `su:rsn:${nav}`)
    .text('✏️ Edit', `su:ree:${nav}`)
    .row()
    .text('❌ Cancel', `su:v:${nav}`);
  return {
    text: [
      screenTitle('Confirm reply', mode === 'push' ? 'push' : 'email'),
      '',
      escapeHtml(truncate(markdown, 1200)),
    ].join('\n'),
    keyboard: kb,
  };
}

export async function supportSendReply(
  h: HandlerCtx,
  nav: string,
  markdown: string,
): Promise<ScreenReply> {
  const parsed = parseNavCtx(nav);
  if (!parsed) return { text: `${screenTitle('Support')}\nInvalid context.` };

  const flow = getFlow(h.telegramUserId);
  const mode = (flow?.data.mode as string) || 'email';
  const ticketId = (flow?.data.ticketId as string) || getListId(h.telegramUserId, parsed.index);
  if (!ticketId || !h.adminApi) return { text: `${screenTitle('Support')}\nTicket not found.` };

  const t = await fetchSupportItem(h, ticketId);
  if (!t) return { text: `${screenTitle('Support')}\n❌ Ticket not found.` };

  if (mode === 'email') {
    if (!t.email?.trim()) {
      return { text: `${screenTitle('Support')}\n❌ Ticket has no email address.` };
    }
    const locale = guessLocaleFromDiagnostics(t.diagnostics) ?? 'auto';
    const res = await h.adminApi.post<{ ok: boolean }>('/api/admin/support/send-reply-email', {
      issueId: ticketId,
      markdown,
      locale,
    });
    if (!res.ok) return { text: `${screenTitle('Support')}\n❌ ${escapeHtml(res.error)}` };
    clearFlow(h.telegramUserId);
    return {
      text: `${screenTitle('Support')}\n✅ Reply email sent. Ticket closed.`,
      keyboard: new InlineKeyboard().text('◀️ Ticket', `su:v:${nav}`).row().text('◀️ Menu', 'm'),
    };
  }

  const locale = guessLocaleFromDiagnostics(t.diagnostics);
  const copy = supportPushNotificationCopy(locale);
  const res = await h.adminApi.post<{ ok: boolean }>('/api/admin/push/send', {
    deviceId: t.deviceId,
    type: 'policy_update',
    title: copy.title,
    body: copy.body,
    message: markdown,
  });
  if (!res.ok) return { text: `${screenTitle('Support')}\n❌ ${escapeHtml(res.error)}` };
  clearFlow(h.telegramUserId);
  return {
    text: `${screenTitle('Support')}\n✅ Push reply sent.`,
    keyboard: new InlineKeyboard().text('◀️ Ticket', `su:v:${nav}`).row().text('◀️ Menu', 'm'),
  };
}

export function supportProKeyDurationScreen(
  h: HandlerCtx,
  page: number,
  index: number,
  statusFlag: string,
): ScreenReply {
  const id = getListId(h.telegramUserId, index);
  if (!id) return { text: `${screenTitle('Support')}\nTicket not found.` };
  const nav = navCtx(page, index, statusFlag);
  const kb = new InlineKeyboard()
    .text('7 days', `su:pkd:${nav}:d7`)
    .text('1 month', `su:pkd:${nav}:m1`)
    .row()
    .text('3 months', `su:pkd:${nav}:m3`)
    .text('12 months', `su:pkd:${nav}:m12`)
    .row()
    .text('◀️ Ticket', `su:v:${nav}`);
  return {
    text: screenTitle('Send Pro key', 'Choose license duration'),
    keyboard: kb,
  };
}

export async function supportSendProKey(
  h: HandlerCtx,
  nav: string,
  durationCode: string,
): Promise<ScreenReply> {
  const parsed = parseNavCtx(nav);
  if (!parsed || !h.adminApi) return { text: `${screenTitle('Support')}\nInvalid context.` };
  const ticketId = getListId(h.telegramUserId, parsed.index);
  if (!ticketId) return { text: `${screenTitle('Support')}\nTicket not found.` };

  const body =
    durationCode === 'd7'
      ? { issueId: ticketId, durationDays: 7 }
      : durationCode === 'm1'
        ? { issueId: ticketId, durationMonths: 1 }
        : durationCode === 'm3'
          ? { issueId: ticketId, durationMonths: 3 }
          : { issueId: ticketId, durationMonths: 12 };

  const res = await h.adminApi.post<{ ok: boolean }>('/api/admin/support/send-pro-license', body);
  if (!res.ok) return { text: `${screenTitle('Support')}\n❌ ${escapeHtml(res.error)}` };
  return {
    text: `${screenTitle('Support')}\n✅ Pro key email sent.`,
    keyboard: new InlineKeyboard().text('◀️ Ticket', `su:v:${nav}`).row().text('◀️ Menu', 'm'),
  };
}

/** Handle free-text messages for support flows. */
export async function handleSupportMessage(
  h: HandlerCtx,
  text: string,
): Promise<ScreenReply | null> {
  const flow = getFlow(h.telegramUserId);
  if (!flow) return null;

  if (flow.kind === 'support_search' && flow.step === 'query') {
    const q = text.trim();
    if (!q) return { text: `${screenTitle('Search')}\nQuery cannot be empty.` };
    clearFlow(h.telegramUserId);
    const status = (flow.data.status as SupportStatus) || 'all';
    return supportListScreen(h, 0, status, q);
  }

  if (flow.kind === 'support_reply' && (flow.step === 'compose' || flow.step === 'edit')) {
    const markdown = text.trim();
    if (!markdown) return { text: `${screenTitle('Reply')}\nMessage cannot be empty.` };
    if (markdown.length > PUSH_MESSAGE_MAX) {
      return { text: `${screenTitle('Reply')}\nToo long (max ${PUSH_MESSAGE_MAX}).` };
    }
    const nav = String(flow.data.nav ?? '');
    setFlow(h.telegramUserId, {
      kind: 'support_reply',
      step: 'preview',
      data: { ...flow.data, markdown },
    });
    return supportReplyPreview(h, nav, markdown);
  }

  return null;
}

export function supportListFromCallback(
  h: HandlerCtx,
  page: number,
  statusFlag: string,
): Promise<ScreenReply> {
  const q = getListMeta(h.telegramUserId, 'support:q');
  return supportListScreen(h, page, statusFromFlag(statusFlag), q || undefined);
}
