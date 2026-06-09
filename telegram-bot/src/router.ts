import type { Bot, Context } from 'grammy';

import type { AppContext, HandlerCtx } from './context.js';
import { apiConfigured, resolveHandlerCtx } from './context.js';
import {
  accountPasswordStart,
  accountScreen,
  handleAccountPasswordMessage,
  resetBotSession,
} from './modules/account.js';
import {
  budgetAddQuick,
  budgetDeleteConfirm,
  budgetDeleteExpense,
  budgetDetailScreen,
  budgetHomeScreen,
  budgetListScreen,
} from './modules/budget.js';
import { configScreen } from './modules/config.js';
import { menuScreen } from './modules/menu.js';
import {
  messagingBroadcastConfirm,
  messagingBroadcastTypeScreen,
  messagingHistoryScreen,
  messagingHomeScreen,
  messagingSingleDeviceListScreen,
  messagingSingleDeviceSend,
  messagingSingleDeviceTypeScreen,
} from './modules/messaging.js';
import {
  operationsAuditScreen,
  operationsHomeScreen,
  operationsLinksScreen,
} from './modules/operations.js';
import { overviewScreen } from './modules/overview.js';
import {
  proKeyDetailScreen,
  proKeyGenerateConfirm,
  proKeyGenerateScreen,
  proKeysHomeScreen,
  proKeysListScreen,
} from './modules/pro-keys.js';
import {
  releaseDetailScreen,
  releasesHomeScreen,
  releasesListScreen,
  releaseTogglePublish,
} from './modules/releases.js';
import { securityHomeScreen, securityUsersScreen } from './modules/security.js';
import {
  supportApplyStatus,
  supportConfirmStatus,
  supportDetailScreen,
  supportHomeScreen,
  supportListScreen,
} from './modules/support.js';
import { clearFlow } from './session/store.js';
import { type ScreenReply, sendScreen } from './ui/reply.js';

async function withHandler(
  ctx: Context,
  app: AppContext,
  fn: (h: HandlerCtx) => Promise<void>,
): Promise<void> {
  const h = await resolveHandlerCtx(ctx, app);
  if (!h) return;
  try {
    await fn(h);
  } catch (e) {
    console.error('[router]', e);
    await sendScreen(ctx, {
      text: '<b>Error</b>\nSomething went wrong. Try /menu or /cancel.',
    });
  }
}

export function registerRouter(bot: Bot<Context>, app: AppContext): void {
  bot.command(['menu', 'start'], async (ctx) => {
    await withHandler(ctx, app, async (h) => {
      clearFlow(h.telegramUserId);
      await sendScreen(ctx, menuScreen(h));
    });
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      [
        '<b>Voice Inbox Admin Bot</b>',
        '',
        '/menu — main menu',
        '/status — quick overview',
        '/whoami — your permissions',
        '/cancel — cancel current flow',
        '/help — this message',
      ].join('\n'),
      { parse_mode: 'HTML' },
    );
  });

  bot.command('whoami', async (ctx) => {
    await withHandler(ctx, app, async (h) => {
      await sendScreen(ctx, accountScreen(h));
    });
  });

  bot.command('status', async (ctx) => {
    await withHandler(ctx, app, async (h) => {
      if (!h.profile) {
        await sendScreen(ctx, menuScreen(h));
        return;
      }
      await sendScreen(ctx, await overviewScreen(h));
    });
  });

  bot.command('cancel', async (ctx) => {
    await withHandler(ctx, app, async (h) => {
      clearFlow(h.telegramUserId);
      await ctx.reply('Cancelled.', { parse_mode: 'HTML' });
      await sendScreen(ctx, menuScreen(h));
    });
  });

  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;
    await withHandler(ctx, app, async (h) => {
      const flowReply = await handleAccountPasswordMessage(h, text);
      if (!flowReply) return;
      await sendScreen(ctx, flowReply);
    });
  });

  bot.callbackQuery(/.*/, async (ctx) => {
    const data = ctx.callbackQuery.data;
    await ctx.answerCallbackQuery();
    await withHandler(ctx, app, async (h) => {
      const edit = Boolean(ctx.callbackQuery.message);
      const send = async (screen: ScreenReply) => {
        await sendScreen(ctx, screen, { edit });
      };

      if (data === 'm') return send(menuScreen(h));
      if (data === 'ac') {
        clearFlow(h.telegramUserId);
        return send(accountScreen(h));
      }
      if (data === 'ac:pw') return send(accountPasswordStart(h));
      if (data === 'ac:rs') {
        resetBotSession(h.telegramUserId);
        return send(accountScreen(h));
      }

      if (data === 'o' || data === 'o:r') return send(await overviewScreen(h));

      if (data === 'cf' || data === 'cf:r') return send(await configScreen(h));
      if (data === 'pk') return send(await proKeysHomeScreen(h));
      if (data === 'pk:g') return send(proKeyGenerateScreen(h));

      const pkg = data.match(/^pk:gd:(\d+)$/);
      if (pkg) return send(await proKeyGenerateConfirm(h, 'days', parseInt(pkg[1]!, 10)));
      const pkm = data.match(/^pk:gm:(\d+)$/);
      if (pkm) return send(await proKeyGenerateConfirm(h, 'months', parseInt(pkm[1]!, 10)));

      const pkl = data.match(/^pk:l:(\d+):([uar])$/);
      if (pkl) {
        const filter = pkl[2] === 'u' ? 'unused' : pkl[2] === 'r' ? 'redeemed' : 'all';
        return send(await proKeysListScreen(h, parseInt(pkl[1]!, 10), filter));
      }
      const pkv = data.match(/^pk:v:(\d+):(\d+):([uar])$/);
      if (pkv)
        return send(
          await proKeyDetailScreen(h, parseInt(pkv[1]!, 10), parseInt(pkv[2]!, 10), pkv[3]!),
        );

      if (data === 'su') return send(await supportHomeScreen(h));
      const sul = data.match(/^su:l:(\d+):([oca])$/);
      if (sul) {
        const st = sul[2] === 'o' ? 'open' : sul[2] === 'c' ? 'closed' : 'all';
        return send(await supportListScreen(h, parseInt(sul[1]!, 10), st));
      }
      const suv = data.match(/^su:v:(\d+):(\d+):([oca])$/);
      if (suv)
        return send(
          await supportDetailScreen(h, parseInt(suv[1]!, 10), parseInt(suv[2]!, 10), suv[3]!),
        );
      const suxc = data.match(/^su:xc:(\d+):(\d+):([oca])$/);
      if (suxc)
        return send(
          await supportConfirmStatus(
            h,
            true,
            parseInt(suxc[1]!, 10),
            parseInt(suxc[2]!, 10),
            suxc[3]!,
          ),
        );
      const suxo = data.match(/^su:xo:(\d+):(\d+):([oca])$/);
      if (suxo)
        return send(
          await supportConfirmStatus(
            h,
            false,
            parseInt(suxo[1]!, 10),
            parseInt(suxo[2]!, 10),
            suxo[3]!,
          ),
        );
      const suxs = data.match(/^su:xs:([co]):(\d+):(\d+):([oca])$/);
      if (suxs) {
        return send(
          await supportApplyStatus(
            h,
            suxs[1] === 'c',
            parseInt(suxs[2]!, 10),
            parseInt(suxs[3]!, 10),
            suxs[4]!,
          ),
        );
      }

      if (data === 'ms') return send(await messagingHomeScreen(h));
      if (data === 'ms:hi:0') return send(await messagingHistoryScreen(h, 0));
      if (data === 'ms:one') return send(await messagingSingleDeviceListScreen(h, 0));
      if (data === 'ms:bc') return send(messagingBroadcastTypeScreen(h));
      const msdl = data.match(/^ms:dl:(\d+)$/);
      if (msdl) return send(await messagingSingleDeviceListScreen(h, parseInt(msdl[1]!, 10)));
      const msdv = data.match(/^ms:dv:(\d+):(\d+)$/);
      if (msdv) {
        return send(
          messagingSingleDeviceTypeScreen(h, parseInt(msdv[2]!, 10), parseInt(msdv[1]!, 10)),
        );
      }
      const msst = data.match(/^ms:st:(\d+):([a-z]{2})$/);
      if (msst) {
        return send(await messagingSingleDeviceSend(h, parseInt(msst[1]!, 10), msst[2]!));
      }
      const msbct = data.match(/^ms:bct:([a-z]{2})$/);
      if (msbct) return send(await messagingBroadcastConfirm(h, msbct[1]!));

      if (data === 'rl') return send(await releasesHomeScreen(h));
      const rll = data.match(/^rl:l:(en|ru)$/);
      if (rll) return send(await releasesListScreen(h, rll[1]!));
      const rlv = data.match(/^rl:v:(en|ru):(\d+)$/);
      if (rlv) return send(await releaseDetailScreen(h, rlv[1]!, parseInt(rlv[2]!, 10)));
      const rlxb = data.match(/^rl:xb:(en|ru):(\d+)$/);
      if (rlxb) return send(await releaseTogglePublish(h, rlxb[1]!, parseInt(rlxb[2]!, 10), true));
      const rlxp = data.match(/^rl:xp:(en|ru):(\d+)$/);
      if (rlxp) return send(await releaseTogglePublish(h, rlxp[1]!, parseInt(rlxp[2]!, 10), false));

      if (data === 'bu' || data === 'bu:r') return send(await budgetHomeScreen(h));
      if (data === 'bu:add') return send(await budgetAddQuick(h));
      const bul = data.match(/^bu:l:(\d+)$/);
      if (bul) return send(await budgetListScreen(h, parseInt(bul[1]!, 10)));
      const buv = data.match(/^bu:v:(\d+):(\d+)$/);
      if (buv)
        return send(await budgetDetailScreen(h, parseInt(buv[1]!, 10), parseInt(buv[2]!, 10)));
      const buxd = data.match(/^bu:xd:(\d+):(\d+)$/);
      if (buxd) return send(budgetDeleteConfirm(h, parseInt(buxd[1]!, 10), parseInt(buxd[2]!, 10)));
      const buxs = data.match(/^bu:xs:(\d+):(\d+)$/);
      if (buxs) {
        return send(await budgetDeleteExpense(h, parseInt(buxs[1]!, 10), parseInt(buxs[2]!, 10)));
      }

      if (data === 'op' || data === 'op:r') return send(await operationsHomeScreen(h));
      if (data === 'op:ln') return send(operationsLinksScreen(h));
      const opal = data.match(/^op:al:(\d+)$/);
      if (opal) return send(await operationsAuditScreen(h, parseInt(opal[1]!, 10)));

      if (data === 'sc' || data === 'sc:r') return send(await securityHomeScreen(h));
      if (data === 'sc:us') return send(await securityUsersScreen(h));

      console.warn('[router] unknown callback', data);
    });
  });

  bot.command('admin', async (ctx) => {
    await withHandler(ctx, app, async (h) => {
      await sendScreen(ctx, menuScreen(h));
    });
  });
}

export function logStartupWarnings(): void {
  if (!apiConfigured()) {
    console.warn(
      '[startup] WEB_ADMIN_URL and TELEGRAM_BOT_API_SECRET are required for full bot features.',
    );
  }
}
