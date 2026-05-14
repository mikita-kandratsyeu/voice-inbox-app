import { InlineKeyboard } from 'grammy';
import type { Bot, Context } from 'grammy';
import type { Pool } from 'pg';

import {
  AUDIT_PAGE_SIZE,
  formatAuditDetail,
  formatAuditListLine,
  getAuditEntryById,
  listAuditLogPageWithExtra,
  type AuditRow,
} from './db/audit-log.js';
import { formatAppConfigChunks, listAllAppConfig } from './db/app-config.js';
import { BROADCAST_PAGE_SIZE, formatBroadcastLine, listBroadcastHistoryPage } from './db/broadcast.js';
import { getDashboardSnapshot } from './db/dashboard.js';
import {
  formatProKeyDetail,
  formatProKeyLine,
  getProLicenseKeyById,
  listProLicenseKeysPage,
  PRO_KEYS_PAGE_SIZE,
} from './db/pro-licenses.js';
import {
  countOpenSupportIssues,
  formatSupportReference,
  getSupportIssueById,
  getSupportStats,
  listOpenSupportIssues,
  setSupportIssueStatus,
  SUPPORT_PAGE_SIZE,
  type SupportIssueRow,
} from './db/support.js';

const TG_TEXT_MAX = 3800;

type PanelDeps = { pool: Pool; getAllowedIds: () => Promise<Set<string>> };

function auditIdentity(): { adminId: string; adminLogin: string } {
  const login = process.env.TELEGRAM_BOT_AUDIT_LOGIN?.trim() || 'telegram-bot';
  const id = process.env.TELEGRAM_BOT_AUDIT_ID?.trim() || login;
  return { adminId: id, adminLogin: login };
}

function truncateBlock(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function parseWebAdminUrl(): URL | null {
  const raw = process.env.WEB_ADMIN_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u;
  } catch {
    return null;
  }
}

/** Telegram Mini App / `web_app` buttons require HTTPS. */
function parseWebAdminMiniAppUrl(browser: URL | null): URL | null {
  const rawMini = process.env.WEB_ADMIN_MINI_APP_URL?.trim();
  if (rawMini) {
    try {
      const u = new URL(rawMini);
      if (u.protocol === 'https:') return u;
    } catch {
      /* fall through */
    }
  }
  if (browser?.protocol === 'https:') return browser;
  return null;
}

function appendWebAdminRow(kb: InlineKeyboard): void {
  const browser = parseWebAdminUrl();
  const mini = parseWebAdminMiniAppUrl(browser);
  if (mini) kb.row().webApp('Web admin (Mini App)', mini.toString());
}

function issueButtonLabel(row: SupportIssueRow): string {
  const ref = formatSupportReference(row.referenceNumber, row.id);
  const sub = (row.subject || '').replace(/\s+/g, ' ').trim() || 'no subject';
  let line = `${ref} · ${sub}`;
  if (line.length > 62) line = `${line.slice(0, 61)}…`;
  return line;
}

function homeKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text('Refresh overview', 'a:d')
    .row()
    .text('Support — queue', 'a:sq:0')
    .text('Support — stats', 'a:ss')
    .row()
    .text('Audit log', 'a:al:0')
    .text('App config', 'a:cfg:0')
    .row()
    .text('Broadcasts', 'a:bc:0')
    .row()
    .text('Pro keys', 'a:pk:0');
  appendWebAdminRow(kb);
  return kb;
}

async function buildHomeText(pool: Pool, getAllowedIds: () => Promise<Set<string>>): Promise<string> {
  const [dash, wl] = await Promise.all([getDashboardSnapshot(pool), getAllowedIds()]);
  return [
    'Voice Inbox — admin (Telegram)',
    '',
    'Live from Postgres (except whitelist: same cache as gate, TTL in .env).',
    '',
    `Open support: ${dash.openSupport}`,
    `Unissued Pro keys: ${dash.unconsumedProKeys}`,
    `Broadcast history rows: ${dash.recentBroadcasts}`,
    `Whitelist ids (cached): ${wl.size}`,
    '',
    'Tip: use the buttons below. Audit log and App config are read-only.',
  ].join('\n');
}

function detailKeyboard(row: SupportIssueRow, listPage: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (row.status === 'open') {
    kb.text('Close ticket', `a:sc:${row.id}:${listPage}`).row();
  } else {
    kb.text('Reopen ticket', `a:sr:${row.id}:${listPage}`).row();
  }
  kb.text('Back to queue', `a:sq:${listPage}`).row().text('Home', 'a:m');
  return kb;
}

function formatDetail(row: SupportIssueRow): string {
  const ref = formatSupportReference(row.referenceNumber, row.id);
  const lines = [
    `${ref} · ${row.status}`,
    `Device: ${row.deviceId}`,
    row.email ? `Email: ${row.email}` : 'Email: (none)',
    row.subject ? `Subject: ${truncateBlock(row.subject, 200)}` : 'Subject: (none)',
    `Created: ${row.createdAt.toISOString()}`,
    row.closedAt ? `Closed: ${row.closedAt.toISOString()}` : null,
    '',
    'Message:',
    truncateBlock(row.message, TG_TEXT_MAX - 400),
  ].filter((x) => x != null) as string[];
  return lines.join('\n');
}

async function listKeyboard(pool: Pool, page: number): Promise<{ text: string; markup: InlineKeyboard }> {
  const [rows, totalOpen] = await Promise.all([
    listOpenSupportIssues(pool, page),
    countOpenSupportIssues(pool),
  ]);
  const kb = new InlineKeyboard();
  for (const row of rows) {
    kb.text(issueButtonLabel(row), `a:sv:${row.id}:${page}`).row();
  }
  if (page > 0) kb.text('Prev', `a:sq:${page - 1}`);
  const hasMore = (page + 1) * SUPPORT_PAGE_SIZE < totalOpen;
  if (hasMore) kb.text('Next', `a:sq:${page + 1}`);
  if (page > 0 || hasMore) kb.row();
  kb.text('Home', 'a:m');
  const from = page * SUPPORT_PAGE_SIZE + 1;
  const to = page * SUPPORT_PAGE_SIZE + rows.length;
  const text =
    rows.length === 0
      ? 'Support — no open tickets.'
      : `Support — open tickets (${totalOpen}). Showing ${from}-${to}:\nTap a row for details.`;
  return { text, markup: kb };
}

type ParsedCb =
  | { k: 'home' }
  | { k: 'dash' }
  | { k: 'stats' }
  | { k: 'list'; page: number }
  | { k: 'view'; id: string; listPage: number }
  | { k: 'close'; id: string; listPage: number }
  | { k: 'reopen'; id: string; listPage: number }
  | { k: 'audit_list'; page: number }
  | { k: 'audit_view'; id: string; listPage: number }
  | { k: 'cfg'; chunk: number }
  | { k: 'bc'; page: number }
  | { k: 'pro_list'; page: number }
  | { k: 'pro_view'; id: string; listPage: number };

function parseAdminCallback(data: string): ParsedCb | null {
  if (data === 'a:m') return { k: 'home' };
  if (data === 'a:d') return { k: 'dash' };
  if (data === 'a:ss') return { k: 'stats' };
  const list = data.match(/^a:sq:(\d+)$/);
  if (list) {
    const page = parseInt(list[1]!, 10);
    return { k: 'list', page: Number.isFinite(page) && page >= 0 ? page : 0 };
  }
  const view = data.match(/^a:sv:([a-z0-9]{20,36}):(\d+)$/i);
  if (view) {
    const listPage = parseInt(view[2]!, 10);
    return {
      k: 'view',
      id: view[1]!,
      listPage: Number.isFinite(listPage) && listPage >= 0 ? listPage : 0,
    };
  }
  const close = data.match(/^a:sc:([a-z0-9]{20,36}):(\d+)$/i);
  if (close) {
    const listPage = parseInt(close[2]!, 10);
    return {
      k: 'close',
      id: close[1]!,
      listPage: Number.isFinite(listPage) && listPage >= 0 ? listPage : 0,
    };
  }
  const reopen = data.match(/^a:sr:([a-z0-9]{20,36}):(\d+)$/i);
  if (reopen) {
    const listPage = parseInt(reopen[2]!, 10);
    return {
      k: 'reopen',
      id: reopen[1]!,
      listPage: Number.isFinite(listPage) && listPage >= 0 ? listPage : 0,
    };
  }
  const al = data.match(/^a:al:(\d+)$/);
  if (al) {
    const page = parseInt(al[1]!, 10);
    return { k: 'audit_list', page: Number.isFinite(page) && page >= 0 ? page : 0 };
  }
  const ax = data.match(/^a:ax:([a-z0-9]{20,36}):(\d+)$/i);
  if (ax) {
    const listPage = parseInt(ax[2]!, 10);
    return {
      k: 'audit_view',
      id: ax[1]!,
      listPage: Number.isFinite(listPage) && listPage >= 0 ? listPage : 0,
    };
  }
  const cfg = data.match(/^a:cfg:(\d+)$/);
  if (cfg) {
    const chunk = parseInt(cfg[1]!, 10);
    return { k: 'cfg', chunk: Number.isFinite(chunk) && chunk >= 0 ? chunk : 0 };
  }
  const bc = data.match(/^a:bc:(\d+)$/);
  if (bc) {
    const page = parseInt(bc[1]!, 10);
    return { k: 'bc', page: Number.isFinite(page) && page >= 0 ? page : 0 };
  }
  const pk = data.match(/^a:pk:(\d+)$/);
  if (pk) {
    const page = parseInt(pk[1]!, 10);
    return { k: 'pro_list', page: Number.isFinite(page) && page >= 0 ? page : 0 };
  }
  const px = data.match(/^a:px:([a-z0-9]{20,36}):(\d+)$/i);
  if (px) {
    const listPage = parseInt(px[2]!, 10);
    return {
      k: 'pro_view',
      id: px[1]!,
      listPage: Number.isFinite(listPage) && listPage >= 0 ? listPage : 0,
    };
  }
  return null;
}

function auditListKeyboard(rows: AuditRow[], page: number, hasMore: boolean): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const r of rows) {
    const label = formatAuditListLine(r, 58);
    kb.text(label, `a:ax:${r.id}:${page}`).row();
  }
  if (page > 0) kb.text('Prev', `a:al:${page - 1}`);
  if (hasMore) kb.text('Next', `a:al:${page + 1}`);
  if (page > 0 || hasMore) kb.row();
  kb.text('Home', 'a:m');
  return kb;
}

function auditDetailKeyboard(listPage: number): InlineKeyboard {
  return new InlineKeyboard().text('Back to audit log', `a:al:${listPage}`).row().text('Home', 'a:m');
}

function cfgKeyboard(chunk: number, totalChunks: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (chunk > 0) kb.text('Prev part', `a:cfg:${chunk - 1}`);
  if (chunk + 1 < totalChunks) kb.text('Next part', `a:cfg:${chunk + 1}`);
  if (chunk > 0 || chunk + 1 < totalChunks) kb.row();
  kb.text('Home', 'a:m');
  return kb;
}

function bcKeyboard(page: number, hasMore: boolean): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (page > 0) kb.text('Prev', `a:bc:${page - 1}`);
  if (hasMore) kb.text('Next', `a:bc:${page + 1}`);
  if (page > 0 || hasMore) kb.row();
  kb.text('Home', 'a:m');
  return kb;
}

function proKeysListKeyboard(
  rows: { id: string }[],
  page: number,
  hasMore: boolean,
): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const r of rows) {
    kb.text(`Open · ${r.id.slice(0, 8)}…`, `a:px:${r.id}:${page}`).row();
  }
  if (page > 0) kb.text('Prev', `a:pk:${page - 1}`);
  if (hasMore) kb.text('Next', `a:pk:${page + 1}`);
  if (page > 0 || hasMore) kb.row();
  kb.text('Home', 'a:m');
  appendWebAdminRow(kb);
  return kb;
}

function proKeyDetailKeyboard(listPage: number): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text('Back to Pro keys', `a:pk:${listPage}`)
    .row()
    .text('Home', 'a:m');
  appendWebAdminRow(kb);
  return kb;
}

export function registerAdminPanel(bot: Bot<Context>, deps: PanelDeps): void {
  const { pool, getAllowedIds } = deps;

  bot.command('admin', async (ctx) => {
    const text = await buildHomeText(pool, getAllowedIds);
    await ctx.reply(text, { reply_markup: homeKeyboard() });
  });

  bot.callbackQuery(/^a:/, async (ctx) => {
    const data = ctx.callbackQuery.data;
    const parsed = parseAdminCallback(data);
    if (!parsed) {
      await ctx.answerCallbackQuery({ text: 'Unknown action', show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();

    const homeKb = homeKeyboard();

    try {
      switch (parsed.k) {
        case 'home':
        case 'dash': {
          const text = await buildHomeText(pool, getAllowedIds);
          await ctx.editMessageText(text, { reply_markup: homeKb });
          break;
        }
        case 'stats': {
          const s = await getSupportStats(pool);
          const text = [
            'Support — stats',
            '',
            `Open (all): ${s.totalOpen}`,
            `Open created in last 7 days: ${s.openCreatedInLast7Days}`,
            `Open created in last 30 days: ${s.openCreatedInLast30Days}`,
          ].join('\n');
          await ctx.editMessageText(text, { reply_markup: homeKb });
          break;
        }
        case 'list': {
          const { text, markup } = await listKeyboard(pool, parsed.page);
          await ctx.editMessageText(text, { reply_markup: markup });
          break;
        }
        case 'view': {
          const row = await getSupportIssueById(pool, parsed.id);
          if (!row) {
            await ctx.editMessageText('Ticket not found.', { reply_markup: homeKb });
            break;
          }
          await ctx.editMessageText(formatDetail(row), {
            reply_markup: detailKeyboard(row, parsed.listPage),
          });
          break;
        }
        case 'close': {
          const r = await setSupportIssueStatus(pool, parsed.id, 'closed', auditIdentity());
          if (!r.ok) {
            await ctx.editMessageText(`Could not close: ${r.reason}`, { reply_markup: homeKb });
            break;
          }
          const row = await getSupportIssueById(pool, parsed.id);
          if (row) {
            await ctx.editMessageText(`Closed.\n\n${formatDetail(row)}`, {
              reply_markup: detailKeyboard(row, parsed.listPage),
            });
          } else {
            await ctx.editMessageText('Closed.', { reply_markup: homeKb });
          }
          break;
        }
        case 'reopen': {
          const r = await setSupportIssueStatus(pool, parsed.id, 'open', auditIdentity());
          if (!r.ok) {
            await ctx.editMessageText(`Could not reopen: ${r.reason}`, { reply_markup: homeKb });
            break;
          }
          const row = await getSupportIssueById(pool, parsed.id);
          if (row) {
            await ctx.editMessageText(`Reopened.\n\n${formatDetail(row)}`, {
              reply_markup: detailKeyboard(row, parsed.listPage),
            });
          } else {
            await ctx.editMessageText('Reopened.', { reply_markup: homeKb });
          }
          break;
        }
        case 'audit_list': {
          const raw = await listAuditLogPageWithExtra(pool, parsed.page);
          const hasMore = raw.length > AUDIT_PAGE_SIZE;
          const rows = hasMore ? raw.slice(0, AUDIT_PAGE_SIZE) : raw;
          const head = ['Audit log (newest first)', `Page ${parsed.page + 1}`, ''].join('\n');
          const text =
            rows.length === 0
              ? `${head}\n(no entries)`
              : `${head}\nTap a line for full metadata.`;
          const kb = auditListKeyboard(rows, parsed.page, hasMore);
          await ctx.editMessageText(text, { reply_markup: kb });
          break;
        }
        case 'audit_view': {
          const row = await getAuditEntryById(pool, parsed.id);
          if (!row) {
            await ctx.editMessageText('Audit entry not found.', { reply_markup: homeKb });
            break;
          }
          const body = formatAuditDetail(row, TG_TEXT_MAX - 50);
          await ctx.editMessageText(body, {
            reply_markup: auditDetailKeyboard(parsed.listPage),
          });
          break;
        }
        case 'cfg': {
          const rows = await listAllAppConfig(pool);
          const chunks = formatAppConfigChunks(rows);
          const chunk = chunks[parsed.chunk] ?? chunks[0];
          if (!chunk) {
            await ctx.editMessageText('App config: empty.', { reply_markup: homeKb });
            break;
          }
          const idx = Math.min(parsed.chunk, chunks.length - 1);
          const kb = cfgKeyboard(idx, chunks.length);
          await ctx.editMessageText(chunks[idx]!, { reply_markup: kb });
          break;
        }
        case 'bc': {
          const raw = await listBroadcastHistoryPage(pool, parsed.page);
          const hasMore = raw.length > BROADCAST_PAGE_SIZE;
          const rows = hasMore ? raw.slice(0, BROADCAST_PAGE_SIZE) : raw;
          const lines = rows.map((r) => formatBroadcastLine(r, 120));
          const head = ['Broadcast history (newest first)', `Page ${parsed.page + 1}`, ''].join('\n');
          const text =
            rows.length === 0
              ? `${head}\n(no rows)`
              : `${head}\n${lines.join('\n')}`;
          await ctx.editMessageText(truncateBlock(text, TG_TEXT_MAX), {
            reply_markup: bcKeyboard(parsed.page, hasMore),
          });
          break;
        }
        case 'pro_list': {
          const raw = await listProLicenseKeysPage(pool, parsed.page);
          const hasMore = raw.length > PRO_KEYS_PAGE_SIZE;
          const rows = hasMore ? raw.slice(0, PRO_KEYS_PAGE_SIZE) : raw;
          const head = [
            'Pro license keys (read-only, newest first)',
            `Page ${parsed.page + 1}`,
            'Lines show hash prefix only (not redeemable keys).',
            '',
          ].join('\n');
          const lines = rows.map((r) => formatProKeyLine(r, 200));
          const text =
            rows.length === 0
              ? `${head}\n(no rows)`
              : `${head}${lines.join('\n')}`;
          await ctx.editMessageText(truncateBlock(text, TG_TEXT_MAX), {
            reply_markup: proKeysListKeyboard(rows, parsed.page, hasMore),
          });
          break;
        }
        case 'pro_view': {
          const row = await getProLicenseKeyById(pool, parsed.id);
          if (!row) {
            await ctx.editMessageText('Pro key not found.', { reply_markup: homeKb });
            break;
          }
          await ctx.editMessageText(formatProKeyDetail(row, TG_TEXT_MAX), {
            reply_markup: proKeyDetailKeyboard(parsed.listPage),
          });
          break;
        }
        default:
          break;
      }
    } catch (e) {
      console.error('[admin-panel]', e);
      try {
        await ctx.editMessageText('Something went wrong. Try /admin again.', {
          reply_markup: homeKb,
        });
      } catch {
        await ctx.reply('Something went wrong. Try /admin again.', { reply_markup: homeKb });
      }
    }
  });
}
