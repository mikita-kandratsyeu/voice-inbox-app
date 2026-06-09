import type { Context } from 'grammy';
import type { InlineKeyboard } from 'grammy';

import { escapeHtml } from './format.js';

const TG_TEXT_MAX = 3800;

export type ScreenReply = {
  text: string;
  keyboard?: InlineKeyboard;
};

export async function sendScreen(
  ctx: Context,
  screen: ScreenReply,
  opts?: { edit?: boolean },
): Promise<void> {
  const text =
    screen.text.length > TG_TEXT_MAX ? `${screen.text.slice(0, TG_TEXT_MAX - 1)}…` : screen.text;
  const extra = {
    parse_mode: 'HTML' as const,
    reply_markup: screen.keyboard,
    link_preview_options: { is_disabled: true },
  };
  if (opts?.edit && ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, extra);
      return;
    } catch {
      /* fall through */
    }
  }
  await ctx.reply(text, extra);
}

export function screenTitle(title: string, description?: string): string {
  const head = `<b>${escapeHtml(title)}</b>`;
  if (!description?.trim()) return head;
  return `${head}\n${escapeHtml(description)}`;
}

export function errScreen(message: string): ScreenReply {
  return { text: `${screenTitle('Error')}\n❌ ${escapeHtml(message)}` };
}
