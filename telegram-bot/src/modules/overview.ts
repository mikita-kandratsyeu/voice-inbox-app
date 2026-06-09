import { InlineKeyboard } from 'grammy';

import type { HandlerCtx } from '../context.js';
import { escapeHtml, formatIsoShort, statusEmoji } from '../ui/format.js';
import { requirePerm } from '../ui/keyboards.js';
import type { ScreenReply } from '../ui/reply.js';
import { screenTitle } from '../ui/reply.js';

type StatusResponse = {
  vercel: {
    ok: boolean;
    deployments?: { state: string; branch?: string; created: number }[];
    error?: string;
  };
  upstash: { ok: boolean; error?: string };
  qstash: { ok: boolean; error?: string };
  database: { ok: boolean; latencyMs?: number; error?: string };
  app: { baseUrl: string; env?: string; devicesWithPush: number };
};

type GithubResponse = {
  ok: boolean;
  commits?: { shortSha: string; message: string; author: string; date: string }[];
  error?: string;
};

export async function overviewScreen(h: HandlerCtx): Promise<ScreenReply> {
  const denied = h.profile ? requirePerm(h.profile, 'overview') : 'Not linked to an admin account.';
  if (denied) return { text: `${screenTitle('Overview')}\n${denied}` };

  if (!h.adminApi) {
    return {
      text: `${screenTitle('Overview')}\nAPI not configured.`,
      keyboard: new InlineKeyboard().text('◀️ Menu', 'm'),
    };
  }

  const [statusRes, ghRes] = await Promise.all([
    h.adminApi.get<StatusResponse>('/api/admin/status'),
    h.adminApi.get<GithubResponse>('/api/admin/github'),
  ]);

  if (!statusRes.ok) {
    return {
      text: `${screenTitle('Overview')}\n❌ ${escapeHtml(statusRes.error)}`,
      keyboard: new InlineKeyboard().text('🔄 Refresh', 'o:r').row().text('◀️ Menu', 'm'),
    };
  }

  const s = statusRes.data;
  const lines = [
    screenTitle('Overview', 'Infrastructure and app status'),
    '',
    `${statusEmoji(s.database.ok)} Postgres${s.database.latencyMs != null ? ` · ${s.database.latencyMs}ms` : ''}${s.database.error ? ` · ${escapeHtml(s.database.error)}` : ''}`,
    `${statusEmoji(s.upstash.ok)} Upstash Redis${s.upstash.error ? ` · ${escapeHtml(s.upstash.error)}` : ''}`,
    `${statusEmoji(s.qstash?.ok)} QStash${s.qstash?.error ? ` · ${escapeHtml(s.qstash.error)}` : ''}`,
    '',
    `App env: <code>${escapeHtml(String(s.app.env ?? 'unknown'))}</code>`,
    `Base URL: ${escapeHtml(s.app.baseUrl)}`,
    `Push devices: <b>${s.app.devicesWithPush}</b>`,
    '',
    `${statusEmoji(s.vercel.ok)} Vercel`,
  ];

  if (s.vercel.deployments?.length) {
    for (const d of s.vercel.deployments.slice(0, 3)) {
      lines.push(
        `  · ${escapeHtml(d.state)} ${d.branch ? `(${escapeHtml(d.branch)})` : ''} · ${formatIsoShort(new Date(d.created).toISOString())}`,
      );
    }
  } else if (s.vercel.error) {
    lines.push(`  ${escapeHtml(s.vercel.error)}`);
  }

  if (ghRes.ok && ghRes.data.ok && ghRes.data.commits?.length) {
    lines.push('', '<b>Recent commits</b>');
    for (const c of ghRes.data.commits.slice(0, 3)) {
      lines.push(
        `  · <code>${escapeHtml(c.shortSha)}</code> ${escapeHtml(c.message.slice(0, 60))}`,
      );
    }
  }

  const kb = new InlineKeyboard().text('🔄 Refresh', 'o:r').row().text('◀️ Menu', 'm');
  return { text: lines.join('\n'), keyboard: kb };
}
