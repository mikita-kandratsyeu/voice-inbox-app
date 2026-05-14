/** Must match `TELEGRAM_ADMIN_USER_IDS_KEY` in `web/lib/telegram-admin-whitelist.ts`. */
export const TELEGRAM_ADMIN_USER_IDS_KEY = 'TELEGRAM_ADMIN_USER_IDS' as const;

const TELEGRAM_ID_RE = /^\d+$/;

export function parseTelegramAdminUserIdsFromJson(raw: string | null | undefined): Set<string> {
  if (raw == null || !String(raw).trim()) {
    return new Set();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw).trim()) as unknown;
  } catch {
    return new Set();
  }
  if (!Array.isArray(parsed)) {
    return new Set();
  }
  const out = new Set<string>();
  for (const el of parsed) {
    if (typeof el !== 'string') continue;
    const t = el.trim();
    if (t.length === 0 || !TELEGRAM_ID_RE.test(t)) continue;
    out.add(t);
  }
  return out;
}
