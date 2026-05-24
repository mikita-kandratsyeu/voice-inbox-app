import { InlineKeyboard } from 'grammy';

import { hasPermission, MENU_SECTIONS, type AdminPermission } from '../auth/permissions.js';
import type { AdminProfile } from '../types.js';

export function navRow(backCb: string, refreshCb?: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  kb.text('◀️ Back', backCb);
  if (refreshCb) kb.text('🔄 Refresh', refreshCb);
  return kb;
}

export function homeKeyboard(profile: AdminProfile): InlineKeyboard {
  const kb = new InlineKeyboard();
  const seen = new Set<string>();
  for (const section of MENU_SECTIONS) {
    if (!hasPermission(profile, section.permission)) continue;
    if (seen.has(section.cb)) continue;
    seen.add(section.cb);
    kb.text(`${section.emoji} ${section.label}`, section.cb).row();
  }
  kb.text('👤 My Account', 'ac').row();
  return kb;
}

export function confirmKeyboard(confirmCb: string, cancelCb: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Confirm', confirmCb)
    .text('❌ Cancel', cancelCb);
}

export function paginateRow(
  kb: InlineKeyboard,
  prevCb: string | null,
  nextCb: string | null,
): InlineKeyboard {
  if (prevCb) kb.text('◀️ Prev', prevCb);
  if (nextCb) kb.text('Next ▶️', nextCb);
  if (prevCb || nextCb) kb.row();
  return kb;
}

export function requirePerm(
  profile: AdminProfile,
  permission: AdminPermission,
): string | null {
  if (hasPermission(profile, permission)) return null;
  return `You need the <b>${permission}</b> permission.`;
}
