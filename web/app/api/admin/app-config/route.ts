import {
  AI_BONUS_AMOUNT,
  AI_BONUS_COOLDOWN_KEY_PREFIX,
  AI_BONUS_COOLDOWN_SECONDS,
} from '@/config/constants';
import { BONUS_APP_CONFIG_KEYS, getBonusConfig } from '@/lib/app-config';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

const DEFAULT_VALUES: Record<string, string> = {
  [BONUS_APP_CONFIG_KEYS.AI_BONUS_AMOUNT]: String(AI_BONUS_AMOUNT),
  [BONUS_APP_CONFIG_KEYS.AI_BONUS_COOLDOWN_SECONDS]: String(AI_BONUS_COOLDOWN_SECONDS),
  [BONUS_APP_CONFIG_KEYS.AI_BONUS_COOLDOWN_KEY_PREFIX]: AI_BONUS_COOLDOWN_KEY_PREFIX,
};

const ALL_KEYS = Object.values(BONUS_APP_CONFIG_KEYS);

type PutBody = Partial<{
  AI_BONUS_AMOUNT: string | number;
  AI_BONUS_COOLDOWN_SECONDS: string | number;
  AI_BONUS_COOLDOWN_KEY_PREFIX: string;
}>;

export async function GET(): Promise<NextResponse> {
  const effective = await getBonusConfig();

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({
      ok: true,
      editable: false,
      hint: 'Set DATABASE_URL to persist and edit config in the database.',
      values: { ...DEFAULT_VALUES },
      effective,
    });
  }

  try {
    const rows = await prisma.appConfig.findMany({
      where: { key: { in: ALL_KEYS } },
    });
    const fromDb = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;
    const values = { ...DEFAULT_VALUES, ...fromDb };
    return NextResponse.json({
      ok: true,
      editable: true,
      values,
      effective,
    });
  } catch (e) {
    console.error('[admin/app-config GET]', e);
    return NextResponse.json(
      { ok: false, error: 'Database error', values: { ...DEFAULT_VALUES }, effective },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      { ok: false, error: 'DATABASE_URL is not configured' },
      { status: 503 },
    );
  }

  let body: PutBody;
  try {
    body = (await request.json()) as PutBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const amountRaw = body.AI_BONUS_AMOUNT;
  const cooldownRaw = body.AI_BONUS_COOLDOWN_SECONDS;
  const prefixRaw = body.AI_BONUS_COOLDOWN_KEY_PREFIX;

  if (amountRaw === undefined && cooldownRaw === undefined && prefixRaw === undefined) {
    return NextResponse.json({ ok: false, error: 'No fields to update' }, { status: 400 });
  }

  const updates: Array<{ key: string; value: string }> = [];

  if (amountRaw !== undefined) {
    const n = typeof amountRaw === 'number' ? amountRaw : parseInt(String(amountRaw).trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > 1_000_000) {
      return NextResponse.json(
        { ok: false, error: 'AI_BONUS_AMOUNT must be an integer between 1 and 1000000' },
        { status: 400 },
      );
    }
    updates.push({ key: BONUS_APP_CONFIG_KEYS.AI_BONUS_AMOUNT, value: String(n) });
  }

  if (cooldownRaw !== undefined) {
    const n =
      typeof cooldownRaw === 'number' ? cooldownRaw : parseInt(String(cooldownRaw).trim(), 10);
    if (!Number.isFinite(n) || n < 60 || n > 86400 * 7) {
      return NextResponse.json(
        {
          ok: false,
          error: 'AI_BONUS_COOLDOWN_SECONDS must be between 60 and 604800 (7 days)',
        },
        { status: 400 },
      );
    }
    updates.push({ key: BONUS_APP_CONFIG_KEYS.AI_BONUS_COOLDOWN_SECONDS, value: String(n) });
  }

  if (prefixRaw !== undefined) {
    const p = String(prefixRaw).trim();
    if (!p || p.length > 128) {
      return NextResponse.json(
        { ok: false, error: 'AI_BONUS_COOLDOWN_KEY_PREFIX must be 1–128 characters' },
        { status: 400 },
      );
    }
    if (!/^[a-zA-Z0-9_:.-]+$/.test(p)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'AI_BONUS_COOLDOWN_KEY_PREFIX: use only letters, digits, underscore, colon, dot, hyphen',
        },
        { status: 400 },
      );
    }
    updates.push({ key: BONUS_APP_CONFIG_KEYS.AI_BONUS_COOLDOWN_KEY_PREFIX, value: p });
  }

  try {
    await prisma.$transaction(
      updates.map(({ key, value }) =>
        prisma.appConfig.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        }),
      ),
    );
  } catch (e) {
    console.error('[admin/app-config PUT]', e);
    return NextResponse.json({ ok: false, error: 'Failed to save' }, { status: 503 });
  }

  const effective = await getBonusConfig();
  const rows = await prisma.appConfig.findMany({ where: { key: { in: ALL_KEYS } } });
  const fromDb = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;
  const values = { ...DEFAULT_VALUES, ...fromDb };

  return NextResponse.json({ ok: true, values, effective });
}
