import {
  AI_BONUS_AMOUNT,
  AI_BONUS_COOLDOWN_KEY_PREFIX,
  AI_BONUS_COOLDOWN_SECONDS,
  FREE_WEEKLY_LIMIT,
  PRO_WEEKLY_LIMIT,
} from '@/config/constants';
import { writeAdminAudit } from '@/lib/admin-audit';
import { getAdminSession } from '@/lib/admin-session';
import {
  BONUS_APP_CONFIG_KEYS,
  getAiWeeklyLimits,
  getBonusConfig,
  invalidateAppConfigCache,
  WEEKLY_LIMIT_APP_CONFIG_KEYS,
} from '@/lib/app-config';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

const DEFAULT_VALUES: Record<string, string> = {
  [BONUS_APP_CONFIG_KEYS.AI_BONUS_AMOUNT]: String(AI_BONUS_AMOUNT),
  [BONUS_APP_CONFIG_KEYS.AI_BONUS_COOLDOWN_SECONDS]: String(AI_BONUS_COOLDOWN_SECONDS),
  [BONUS_APP_CONFIG_KEYS.AI_BONUS_COOLDOWN_KEY_PREFIX]: AI_BONUS_COOLDOWN_KEY_PREFIX,
  [WEEKLY_LIMIT_APP_CONFIG_KEYS.AI_WEEKLY_LIMIT_FREE]: String(FREE_WEEKLY_LIMIT),
  [WEEKLY_LIMIT_APP_CONFIG_KEYS.AI_WEEKLY_LIMIT_PRO]: String(PRO_WEEKLY_LIMIT),
};

const ALL_KEYS = [
  ...Object.values(BONUS_APP_CONFIG_KEYS),
  ...Object.values(WEEKLY_LIMIT_APP_CONFIG_KEYS),
];

type PutBody = Partial<{
  AI_BONUS_AMOUNT: string | number;
  AI_BONUS_COOLDOWN_SECONDS: string | number;
  AI_BONUS_COOLDOWN_KEY_PREFIX: string;
  AI_WEEKLY_LIMIT_FREE: string | number;
  AI_WEEKLY_LIMIT_PRO: string | number;
}>;

export async function GET(): Promise<NextResponse> {
  const [effectiveBonus, weeklyLimits] = await Promise.all([getBonusConfig(), getAiWeeklyLimits()]);

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({
      ok: true,
      editable: false,
      hint: 'Set DATABASE_URL to persist and edit config in the database.',
      values: { ...DEFAULT_VALUES },
      effective: {
        ...effectiveBonus,
        freeWeeklyLimit: weeklyLimits.freeWeeklyLimit,
        proWeeklyLimit: weeklyLimits.proWeeklyLimit,
      },
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
      effective: {
        ...(await getBonusConfig()),
        ...(await getAiWeeklyLimits()),
      },
    });
  } catch (e) {
    console.error('[admin/app-config GET]', e);
    return NextResponse.json(
      {
        ok: false,
        error: 'Database error',
        values: { ...DEFAULT_VALUES },
        effective: {
          ...effectiveBonus,
          ...weeklyLimits,
        },
      },
      { status: 503 },
    );
  }
}

const LIMIT_MIN = 1;
const LIMIT_MAX = 500;

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

  const amountRaw = body.AI_BONUS_AMOUNT;
  const cooldownRaw = body.AI_BONUS_COOLDOWN_SECONDS;
  const prefixRaw = body.AI_BONUS_COOLDOWN_KEY_PREFIX;
  const freeLimitRaw = body.AI_WEEKLY_LIMIT_FREE;
  const proLimitRaw = body.AI_WEEKLY_LIMIT_PRO;

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

  if (freeLimitRaw !== undefined) {
    const n =
      typeof freeLimitRaw === 'number' ? freeLimitRaw : parseInt(String(freeLimitRaw).trim(), 10);
    if (!Number.isFinite(n) || n < LIMIT_MIN || n > LIMIT_MAX) {
      return NextResponse.json(
        {
          ok: false,
          error: `AI_WEEKLY_LIMIT_FREE must be an integer between ${LIMIT_MIN} and ${LIMIT_MAX}`,
        },
        { status: 400 },
      );
    }
    updates.push({ key: WEEKLY_LIMIT_APP_CONFIG_KEYS.AI_WEEKLY_LIMIT_FREE, value: String(n) });
  }

  if (proLimitRaw !== undefined) {
    const n =
      typeof proLimitRaw === 'number' ? proLimitRaw : parseInt(String(proLimitRaw).trim(), 10);
    if (!Number.isFinite(n) || n < LIMIT_MIN || n > LIMIT_MAX) {
      return NextResponse.json(
        {
          ok: false,
          error: `AI_WEEKLY_LIMIT_PRO must be an integer between ${LIMIT_MIN} and ${LIMIT_MAX}`,
        },
        { status: 400 },
      );
    }
    updates.push({ key: WEEKLY_LIMIT_APP_CONFIG_KEYS.AI_WEEKLY_LIMIT_PRO, value: String(n) });
  }

  if (freeLimitRaw !== undefined || proLimitRaw !== undefined) {
    const cur = await getAiWeeklyLimits();
    let nextFree = cur.freeWeeklyLimit;
    let nextPro = cur.proWeeklyLimit;
    if (freeLimitRaw !== undefined) {
      const n =
        typeof freeLimitRaw === 'number' ? freeLimitRaw : parseInt(String(freeLimitRaw).trim(), 10);
      nextFree = n;
    }
    if (proLimitRaw !== undefined) {
      const n =
        typeof proLimitRaw === 'number' ? proLimitRaw : parseInt(String(proLimitRaw).trim(), 10);
      nextPro = n;
    }
    if (nextPro < nextFree) {
      return NextResponse.json(
        { ok: false, error: 'AI_WEEKLY_LIMIT_PRO must be >= AI_WEEKLY_LIMIT_FREE' },
        { status: 400 },
      );
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ ok: false, error: 'No fields to update' }, { status: 400 });
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

  invalidateAppConfigCache();

  const [effectiveBonus, weeklyLimits] = await Promise.all([getBonusConfig(), getAiWeeklyLimits()]);
  const rows = await prisma.appConfig.findMany({ where: { key: { in: ALL_KEYS } } });
  const fromDb = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;
  const values = { ...DEFAULT_VALUES, ...fromDb };

  await writeAdminAudit(admin, 'app_config.update', {
    keys: updates.map((u) => u.key),
  });

  return NextResponse.json({
    ok: true,
    values,
    effective: {
      ...effectiveBonus,
      ...weeklyLimits,
    },
  });
}
