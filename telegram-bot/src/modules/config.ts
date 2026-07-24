import { InlineKeyboard } from 'grammy';

import type { HandlerCtx } from '../context.js';
import { escapeHtml, formatIsoShort, truncate } from '../ui/format.js';
import { confirmKeyboard, requirePerm } from '../ui/keyboards.js';
import type { ScreenReply } from '../ui/reply.js';
import { screenTitle } from '../ui/reply.js';

type MobileBannerConfig = {
  id: string;
  enabled: boolean;
  ctaUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  platforms: string[];
  dismissible: boolean;
  locales: Record<string, { title: string; body: string; ctaLabel: string | null }>;
};

type MobileBannerManifest = {
  schemaVersion: number;
  revision: number;
  banner: MobileBannerConfig | null;
};

function webAdminUrl(path: string): string | null {
  const base = process.env.WEB_ADMIN_URL?.trim().replace(/^=+/, '').replace(/\/$/, '');
  if (!base) return null;
  return `${base}${path}`;
}

export async function configScreen(h: HandlerCtx): Promise<ScreenReply> {
  const denied = h.profile ? requirePerm(h.profile, 'config') : 'Not linked.';
  if (denied) return { text: `${screenTitle('Config')}\n${denied}` };

  const kb = new InlineKeyboard()
    .text('🤖 AI limits', 'cf:ai')
    .text('📱 Mobile banner', 'cf:bn')
    .row()
    .text('🧠 Model manifest', 'cf:mn')
    .text('🌐 Landing', 'cf:ld')
    .row()
    .text('🗝 Pro Keys', 'pk')
    .row()
    .text('◀️ Menu', 'm');

  return {
    text: screenTitle('Configuration', 'App settings — quick view & actions'),
    keyboard: kb,
  };
}

export async function configAiLimitsScreen(h: HandlerCtx): Promise<ScreenReply> {
  if (!h.adminApi) return { text: `${screenTitle('AI limits')}\nAPI not configured.` };
  const res = await h.adminApi.get<{
    ok: boolean;
    values: Record<string, string>;
  }>('/api/admin/app-config');
  if (!res.ok) return { text: `${screenTitle('AI limits')}\n❌ ${escapeHtml(res.error)}` };

  const lines = [screenTitle('AI limits'), ''];
  for (const [k, v] of Object.entries(res.data.values ?? {})) {
    if (k.startsWith('AI_')) lines.push(`<b>${escapeHtml(k)}</b>: <code>${escapeHtml(v)}</code>`);
  }
  lines.push('', 'Full editing: web admin → Config → AI limits.');

  const kb = new InlineKeyboard().text('◀️ Config', 'cf').row().text('◀️ Menu', 'm');
  return { text: lines.join('\n'), keyboard: kb };
}

export async function configMobileBannerScreen(h: HandlerCtx): Promise<ScreenReply> {
  if (!h.adminApi) return { text: `${screenTitle('Mobile banner')}\nAPI not configured.` };
  const res = await h.adminApi.get<{
    ok: boolean;
    editable: boolean;
    manifest: MobileBannerManifest;
    hasStoredCopy: boolean;
    hint?: string;
  }>('/api/admin/mobile-banner');
  if (!res.ok) return { text: `${screenTitle('Mobile banner')}\n❌ ${escapeHtml(res.error)}` };

  const m = res.data.manifest;
  const b = m.banner;
  const lines = [
    screenTitle('Mobile banner', `rev ${m.revision}`),
    res.data.hint ? escapeHtml(res.data.hint) : null,
    '',
    b
      ? [
          `Status: ${b.enabled ? '✅ enabled' : '⏸ disabled'}`,
          `Id: <code>${escapeHtml(b.id)}</code>`,
          `Platforms: ${escapeHtml(b.platforms.join(', ') || 'none')}`,
          b.startsAt ? `Starts: ${formatIsoShort(b.startsAt)}` : 'Starts: (none)',
          b.endsAt ? `Ends: ${formatIsoShort(b.endsAt)}` : 'Ends: (none)',
          `Dismissible: ${b.dismissible ? 'yes' : 'no'}`,
          '',
          '<b>EN</b>',
          escapeHtml(truncate(b.locales.en?.title ?? '', 60)),
          '',
          '<b>RU</b>',
          escapeHtml(truncate(b.locales.ru?.title ?? '', 60)),
        ].join('\n')
      : 'No banner configured.',
  ].filter(Boolean) as string[];

  const kb = new InlineKeyboard();
  if (b && res.data.editable) {
    kb.text(b.enabled ? '⏸ Disable' : '✅ Enable', `cf:bnt:${b.enabled ? '0' : '1'}`).row();
  }
  const editUrl = webAdminUrl('/admin?tab=config');
  if (editUrl) kb.url('🌐 Web editor', editUrl).row();
  kb.text('🔄 Refresh', 'cf:bn').row().text('◀️ Config', 'cf').row().text('◀️ Menu', 'm');

  return { text: lines.join('\n'), keyboard: kb };
}

export async function configMobileBannerToggle(
  h: HandlerCtx,
  enable: boolean,
): Promise<ScreenReply> {
  if (!h.adminApi) return { text: `${screenTitle('Mobile banner')}\nAPI not configured.` };
  const current = await h.adminApi.get<{
    ok: boolean;
    manifest: MobileBannerManifest;
  }>('/api/admin/mobile-banner');
  if (!current.ok)
    return { text: `${screenTitle('Mobile banner')}\n❌ ${escapeHtml(current.error)}` };

  const banner = current.data.manifest.banner;
  if (!banner) {
    return {
      text: `${screenTitle('Mobile banner')}\nNo banner to toggle — create one in web admin.`,
    };
  }

  const res = await h.adminApi.put<{ ok: boolean }>('/api/admin/mobile-banner', {
    banner: { ...banner, enabled: enable },
  });
  if (!res.ok) return { text: `${screenTitle('Mobile banner')}\n❌ ${escapeHtml(res.error)}` };
  return configMobileBannerScreen(h);
}

export async function configModelManifestScreen(h: HandlerCtx): Promise<ScreenReply> {
  if (!h.adminApi) return { text: `${screenTitle('Model manifest')}\nAPI not configured.` };
  const res = await h.adminApi.get<{
    ok: boolean;
    jsonText: string;
    hasStoredCopy: boolean;
    hint?: string;
  }>('/api/admin/mobile-model-manifest');
  if (!res.ok) return { text: `${screenTitle('Model manifest')}\n❌ ${escapeHtml(res.error)}` };

  let summary = 'Invalid JSON';
  try {
    const parsed = JSON.parse(res.data.jsonText) as {
      revision?: number;
      artifacts?: unknown[];
    };
    summary = `revision ${parsed.revision ?? '?'}, ${parsed.artifacts?.length ?? 0} artifact(s)`;
  } catch {
    summary = 'parse error';
  }

  const lines = [
    screenTitle('Mobile model manifest', summary),
    res.data.hint ? escapeHtml(res.data.hint) : null,
    res.data.hasStoredCopy ? 'Stored copy: ✅ yes' : 'Stored copy: default preview',
    '',
    'JSON editing is available in web admin only.',
  ].filter(Boolean) as string[];

  const kb = new InlineKeyboard();
  const editUrl = webAdminUrl('/admin?tab=config');
  if (editUrl) kb.url('🌐 Web editor', editUrl).row();
  kb.text('🔄 Refresh', 'cf:mn').row().text('◀️ Config', 'cf').row().text('◀️ Menu', 'm');
  return { text: lines.join('\n'), keyboard: kb };
}

export async function configLandingScreen(h: HandlerCtx): Promise<ScreenReply> {
  if (!h.adminApi) return { text: `${screenTitle('Landing')}\nAPI not configured.` };
  const res = await h.adminApi.get<{
    ok: boolean;
    config?: { enabled?: boolean; entries?: unknown[] };
    hasStoredCopy?: boolean;
  }>('/api/admin/landing-social-proof');
  if (!res.ok) return { text: `${screenTitle('Landing')}\n❌ ${escapeHtml(res.error)}` };

  const cfg = res.data.config;
  const lines = [
    screenTitle('Landing social proof'),
    cfg && typeof cfg.enabled === 'boolean' ? `Enabled: ${cfg.enabled ? 'yes' : 'no'}` : null,
    cfg && Array.isArray(cfg.entries) ? `Entries: ${cfg.entries.length}` : null,
    res.data.hasStoredCopy ? 'Stored copy: ✅ yes' : 'Stored copy: default',
    '',
    'Edit in web admin → Config → Landing.',
  ].filter(Boolean) as string[];

  const kb = new InlineKeyboard().text('◀️ Config', 'cf').row().text('◀️ Menu', 'm');
  return { text: lines.join('\n'), keyboard: kb };
}

export function configBannerToggleConfirm(h: HandlerCtx, enable: boolean): ScreenReply {
  return {
    text: `${screenTitle('Confirm')}\n${enable ? 'Enable' : 'Disable'} mobile banner?`,
    keyboard: confirmKeyboard(`cf:btx:${enable ? '1' : '0'}`, 'cf:bn'),
  };
}
