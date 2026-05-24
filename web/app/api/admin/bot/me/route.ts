import { NextResponse } from 'next/server';

import {
  getAdminAccessProfileForTelegramUser,
  readTelegramUserIdHeader,
  verifyAdminBotApiSecret,
} from '@/lib/admin-bot-auth';

/** Bot-only: resolve linked admin account for a Telegram user id. */
export async function GET(request: Request): Promise<NextResponse> {
  if (!verifyAdminBotApiSecret(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const telegramUserId = readTelegramUserIdHeader(request);
  if (!telegramUserId) {
    return NextResponse.json({ ok: false, error: 'Missing Telegram user id' }, { status: 400 });
  }

  const profile = await getAdminAccessProfileForTelegramUser(telegramUserId);

  return NextResponse.json({
    ok: true,
    telegramUserId,
    linked: profile !== null,
    admin: profile
      ? {
          id: profile.adminId,
          login: profile.login,
          isSuperadmin: profile.isSuperadmin,
          permissions: profile.permissions,
        }
      : null,
  });
}
