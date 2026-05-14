import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import { prisma } from '@/lib/prisma';
import {
  getTelegramAdminUserIds,
  isValidTelegramUserIdString,
  parseTelegramAdminUserIdsFromJson,
  TELEGRAM_ADMIN_USER_IDS_KEY,
} from '@/lib/telegram-admin-whitelist';
import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({
      ok: true,
      editable: false,
      hint: 'Set DATABASE_URL to persist Telegram admin whitelist.',
      ids: [] as string[],
    });
  }

  try {
    const ids = await getTelegramAdminUserIds();
    return NextResponse.json({ ok: true, editable: true, ids });
  } catch (e) {
    console.error('[admin/telegram-whitelist GET]', e);
    return NextResponse.json({ ok: false, error: 'Database error' }, { status: 503 });
  }
}

type PutBody = { ids?: unknown };

export async function PUT(request: Request): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'DATABASE_URL is not configured' },
      { status: 503 },
    );
  }

  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const rawIds = body.ids;
  if (!Array.isArray(rawIds)) {
    return NextResponse.json(
      { ok: false, error: 'ids must be an array of strings' },
      { status: 400 },
    );
  }

  const normalized: string[] = [];
  for (const x of rawIds) {
    if (typeof x !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Each id must be a string of digits (Telegram user id)' },
        { status: 400 },
      );
    }
    if (!isValidTelegramUserIdString(x)) {
      return NextResponse.json(
        { ok: false, error: `Invalid Telegram user id: ${JSON.stringify(x)}` },
        { status: 400 },
      );
    }
    normalized.push(x.trim());
  }

  const uniqueSorted = [...new Set(normalized)].sort((a, b) =>
    a.length !== b.length ? a.length - b.length : a.localeCompare(b),
  );
  const jsonValue = JSON.stringify(uniqueSorted);

  try {
    await prisma.appConfig.upsert({
      where: { key: TELEGRAM_ADMIN_USER_IDS_KEY },
      create: { key: TELEGRAM_ADMIN_USER_IDS_KEY, value: jsonValue },
      update: { value: jsonValue },
    });
  } catch (e) {
    console.error('[admin/telegram-whitelist PUT]', e);
    return NextResponse.json({ ok: false, error: 'Failed to save' }, { status: 503 });
  }

  await writeAdminAudit(admin, 'telegram_whitelist.update', {
    count: uniqueSorted.length,
  });

  const ids = parseTelegramAdminUserIdsFromJson(jsonValue);
  return NextResponse.json({ ok: true, ids });
}
