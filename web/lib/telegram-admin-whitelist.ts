import { prisma } from '@/lib/prisma';

export const TELEGRAM_ADMIN_USER_IDS_KEY = 'TELEGRAM_ADMIN_USER_IDS' as const;

const TELEGRAM_ID_RE = /^\d+$/;

export function isValidTelegramUserIdString(id: string): boolean {
  const t = id.trim();
  return t.length > 0 && TELEGRAM_ID_RE.test(t);
}

/** Parse stored JSON array; only string digits are accepted (no JSON numbers — precision). */
export function parseTelegramAdminUserIdsFromJson(raw: string | null | undefined): string[] {
  if (raw == null || !String(raw).trim()) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw).trim()) as unknown;
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  const out: string[] = [];
  for (const el of parsed) {
    if (typeof el !== 'string') continue;
    if (!isValidTelegramUserIdString(el)) continue;
    out.push(el.trim());
  }
  return [...new Set(out)].sort((a, b) =>
    a.length !== b.length ? a.length - b.length : a.localeCompare(b),
  );
}

export async function getTelegramAdminUserIds(): Promise<string[]> {
  if (!process.env.DATABASE_URL?.trim()) {
    return [];
  }
  try {
    const row = await prisma.appConfig.findUnique({
      where: { key: TELEGRAM_ADMIN_USER_IDS_KEY },
    });
    return parseTelegramAdminUserIdsFromJson(row?.value ?? null);
  } catch (e) {
    console.error('[getTelegramAdminUserIds]', e);
    return [];
  }
}
