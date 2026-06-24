import type { Bot, Context } from 'grammy';

import type { AppContext, HandlerCtx } from './context.js';
import { apiConfigured, resolveHandlerCtx } from './context.js';
import {
  accountPasswordStart,
  accountScreen,
  resetBotSession,
  toggleSupportAlerts,
} from './modules/account.js';
import {
  budgetAddQuick,
  budgetDeleteConfirm,
  budgetDeleteExpense,
  budgetDetailScreen,
  budgetExpenseFlowStart,
  budgetHomeScreen,
  budgetListScreen,
} from './modules/budget.js';
import {
  configAiLimitsScreen,
  configBannerToggleConfirm,
  configLandingScreen,
  configMobileBannerScreen,
  configMobileBannerToggle,
  configModelManifestScreen,
  configScreen,
} from './modules/config.js';
import { handleFlowMessage } from './modules/flow-messages.js';
import {
  inAppEventDetailScreen,
  inAppEventsHomeScreen,
  inAppEventsListScreen,
  inAppEventToggleApply,
  inAppEventToggleConfirm,
} from './modules/in-app-events.js';
import { menuScreen } from './modules/menu.js';
import {
  messagingBroadcastPreview,
  messagingBroadcastSend,
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
  proKeyDeleteApply,
  proKeyDeleteConfirm,
  proKeyDetailScreen,
  proKeyGenerateConfirm,
  proKeyGenerateScreen,
  proKeyResetApply,
  proKeyResetConfirm,
  proKeysHomeScreen,
  proKeysListScreen,
} from './modules/pro-keys.js';
import {
  releaseDetailScreen,
  releasesHomeScreen,
  releasesListScreen,
  releaseToggleConfirm,
  releaseTogglePublish,
} from './modules/releases.js';
import { securityHomeScreen, securityUsersScreen } from './modules/security.js';
import {
  supportAiDraftScreen,
  supportApplyStatus,
  supportConfirmStatus,
  supportDetailScreen,
  supportHomeScreen,
  supportListFromCallback,
  supportProKeyDurationScreen,
  supportReplyStart,
  supportSearchStart,
  supportSendProKey,
  supportSendReply,
} from './modules/support.js';
import { clearFlow, getFlow, setFlow } from './session/store.js';
import { type ScreenReply, screenTitle, sendScreen } from './ui/reply.js';

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
      const flowReply = await handleFlowMessage(h, text);
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
      if (data === 'ac:al') return send(toggleSupportAlerts(h));
      if (data === 'ac:rs') {
        resetBotSession(h.telegramUserId);
        return send(accountScreen(h));
      }

      if (data === 'o' || data === 'o:r') return send(await overviewScreen(h));

      if (data === 'cf') return send(await configScreen(h));
      if (data === 'cf:ai') return send(await configAiLimitsScreen(h));
      if (data === 'cf:bn') return send(await configMobileBannerScreen(h));
      if (data === 'cf:mn') return send(await configModelManifestScreen(h));
      if (data === 'cf:ld') return send(await configLandingScreen(h));
      const cfbnt = data.match(/^cf:bnt:([01])$/);
      if (cfbnt) return send(configBannerToggleConfirm(h, cfbnt[1] === '1'));
      const cfbtx = data.match(/^cf:btx:([01])$/);
      if (cfbtx) return send(await configMobileBannerToggle(h, cfbtx[1] === '1'));

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
      const pkxd = data.match(/^pk:xd:(\d+):(\d+):([uar])$/);
      if (pkxd)
        return send(
          await proKeyDeleteConfirm(h, parseInt(pkxd[1]!, 10), parseInt(pkxd[2]!, 10), pkxd[3]!),
        );
      const pkxr = data.match(/^pk:xr:(\d+):(\d+):([uar])$/);
      if (pkxr)
        return send(
          await proKeyResetConfirm(h, parseInt(pkxr[1]!, 10), parseInt(pkxr[2]!, 10), pkxr[3]!),
        );
      const pkxs = data.match(/^pk:xs:([dr]):(\d+):(\d+):([uar])$/);
      if (pkxs) {
        if (pkxs[1] === 'd') {
          return send(
            await proKeyDeleteApply(h, parseInt(pkxs[2]!, 10), parseInt(pkxs[3]!, 10), pkxs[4]!),
          );
        }
        return send(
          await proKeyResetApply(h, parseInt(pkxs[2]!, 10), parseInt(pkxs[3]!, 10), pkxs[4]!),
        );
      }

      if (data === 'su') return send(await supportHomeScreen(h));
      if (data === 'su:q') return send(supportSearchStart(h));
      const sul = data.match(/^su:l:(\d+):([oca])$/);
      if (sul) {
        return send(await supportListFromCallback(h, parseInt(sul[1]!, 10), sul[2]!));
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
      const sure = data.match(/^su:re:(\d+):(\d+):([oca])$/);
      if (sure)
        return send(
          supportReplyStart(h, parseInt(sure[1]!, 10), parseInt(sure[2]!, 10), sure[3]!, 'email'),
        );
      const supu = data.match(/^su:pu:(\d+):(\d+):([oca])$/);
      if (supu)
        return send(
          supportReplyStart(h, parseInt(supu[1]!, 10), parseInt(supu[2]!, 10), supu[3]!, 'push'),
        );
      const suai = data.match(/^su:ai:(\d+):(\d+):([oca])$/);
      if (suai)
        return send(
          await supportAiDraftScreen(h, parseInt(suai[1]!, 10), parseInt(suai[2]!, 10), suai[3]!),
        );
      const supk = data.match(/^su:pk:(\d+):(\d+):([oca])$/);
      if (supk)
        return send(
          supportProKeyDurationScreen(h, parseInt(supk[1]!, 10), parseInt(supk[2]!, 10), supk[3]!),
        );
      const supkd = data.match(/^su:pkd:(\d+):(\d+):([oca]):(d7|m1|m3|m12)$/);
      if (supkd) {
        const nav = `${supkd[1]}:${supkd[2]}:${supkd[3]}`;
        return send(await supportSendProKey(h, nav, supkd[4]!));
      }
      const suree = data.match(/^su:ree:(\d+):(\d+):([oca])$/);
      if (suree) {
        const flow = getFlow(h.telegramUserId);
        return send(
          supportReplyStart(
            h,
            parseInt(suree[1]!, 10),
            parseInt(suree[2]!, 10),
            suree[3]!,
            (flow?.data.mode as 'email' | 'push') || 'email',
          ),
        );
      }
      const sursn = data.match(/^su:rsn:(\d+):(\d+):([oca])$/);
      if (sursn) {
        const nav = `${sursn[1]}:${sursn[2]}:${sursn[3]}`;
        const flow = getFlow(h.telegramUserId);
        const markdown = typeof flow?.data.markdown === 'string' ? flow.data.markdown : '';
        if (!markdown) return send({ text: `${screenTitle('Support')}\nNo reply text.` });
        return send(await supportSendReply(h, nav, markdown));
      }
      const susem = data.match(/^su:sem:(\d+):(\d+):([oca])$/);
      if (susem) {
        const nav = `${susem[1]}:${susem[2]}:${susem[3]}`;
        const flow = getFlow(h.telegramUserId);
        const markdown = typeof flow?.data.markdown === 'string' ? flow.data.markdown : '';
        if (!markdown) return send({ text: `${screenTitle('Support')}\nNo draft text.` });
        const ticketId = typeof flow?.data.ticketId === 'string' ? flow.data.ticketId : '';
        setFlow(h.telegramUserId, {
          kind: 'support_reply',
          step: 'preview',
          data: { ticketId, mode: 'email', nav, markdown },
        });
        return send(await supportSendReply(h, nav, markdown));
      }
      const suspm = data.match(/^su:spm:(\d+):(\d+):([oca])$/);
      if (suspm) {
        const nav = `${suspm[1]}:${suspm[2]}:${suspm[3]}`;
        const flow = getFlow(h.telegramUserId);
        const markdown = typeof flow?.data.markdown === 'string' ? flow.data.markdown : '';
        if (!markdown) return send({ text: `${screenTitle('Support')}\nNo draft text.` });
        const ticketId = typeof flow?.data.ticketId === 'string' ? flow.data.ticketId : '';
        setFlow(h.telegramUserId, {
          kind: 'support_reply',
          step: 'preview',
          data: { ticketId, mode: 'push', nav, markdown },
        });
        return send(await supportSendReply(h, nav, markdown));
      }

      if (data === 'ms') return send(await messagingHomeScreen(h));
      if (data === 'ms:hi:0') return send(await messagingHistoryScreen(h, 0));
      const mshi = data.match(/^ms:hi:(\d+)$/);
      if (mshi) return send(await messagingHistoryScreen(h, parseInt(mshi[1]!, 10)));
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
      if (msbct) return send(messagingBroadcastPreview(h, msbct[1]!));
      const msbcx = data.match(/^ms:bcx:([a-z]{2})$/);
      if (msbcx) return send(await messagingBroadcastSend(h, msbcx[1]!));

      if (data === 'rl') return send(await releasesHomeScreen(h));
      const rll = data.match(/^rl:l:(en|ru)$/);
      if (rll) return send(await releasesListScreen(h, rll[1]!));
      const rlv = data.match(/^rl:v:(en|ru):(\d+)$/);
      if (rlv) return send(await releaseDetailScreen(h, rlv[1]!, parseInt(rlv[2]!, 10)));
      const rlxb = data.match(/^rl:xb:(en|ru):(\d+)$/);
      if (rlxb) return send(releaseToggleConfirm(h, rlxb[1]!, parseInt(rlxb[2]!, 10), true));
      const rlxp = data.match(/^rl:xp:(en|ru):(\d+)$/);
      if (rlxp) return send(releaseToggleConfirm(h, rlxp[1]!, parseInt(rlxp[2]!, 10), false));
      const rlxs = data.match(/^rl:xs:([pu]):(en|ru):(\d+)$/);
      if (rlxs) {
        return send(
          await releaseTogglePublish(h, rlxs[2]!, parseInt(rlxs[3]!, 10), rlxs[1] === 'p'),
        );
      }

      if (data === 'ev') return send(await inAppEventsHomeScreen(h));
      const evl = data.match(/^ev:l:(en|ru)$/);
      if (evl) return send(await inAppEventsListScreen(h, evl[1]!));
      const evv = data.match(/^ev:v:(en|ru):(\d+)$/);
      if (evv) return send(await inAppEventDetailScreen(h, evv[1]!, parseInt(evv[2]!, 10)));
      const evxb = data.match(/^ev:xb:(en|ru):(\d+)$/);
      if (evxb) return send(inAppEventToggleConfirm(h, evxb[1]!, parseInt(evxb[2]!, 10), true));
      const evxp = data.match(/^ev:xp:(en|ru):(\d+)$/);
      if (evxp) return send(inAppEventToggleConfirm(h, evxp[1]!, parseInt(evxp[2]!, 10), false));
      const evxs = data.match(/^ev:xs:([pu]):(en|ru):(\d+)$/);
      if (evxs) {
        return send(
          await inAppEventToggleApply(h, evxs[2]!, parseInt(evxs[3]!, 10), evxs[1] === 'p'),
        );
      }

      if (data === 'bu' || data === 'bu:r') return send(await budgetHomeScreen(h));
      if (data === 'bu:add') return send(await budgetAddQuick(h));
      if (data === 'bu:add:flow') return send(budgetExpenseFlowStart(h));
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
