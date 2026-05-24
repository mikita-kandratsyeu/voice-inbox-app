import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Product token for Vercel WAF bypass (User-Agent Contains …). Not a secret. */
export const DEFAULT_TELEGRAM_BOT_USER_AGENT = 'VoiceInbox-Bot';

const SEMVER_TAIL_RE = /^\d+(\.\d+){0,3}$/;

function botUserAgentPrefixFromEnv(raw: string): string {
  const t = raw.trim();
  if (!t) return DEFAULT_TELEGRAM_BOT_USER_AGENT;

  const parts = t.split('/');
  if (parts.length >= 2) {
    const last = parts[parts.length - 1] ?? '';
    if (SEMVER_TAIL_RE.test(last)) {
      const head = parts.slice(0, -1).join('/');
      return head.length > 0 ? head : DEFAULT_TELEGRAM_BOT_USER_AGENT;
    }
  }

  return t;
}

function readPackageVersion(): string | null {
  try {
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    const v = typeof pkg.version === 'string' ? pkg.version.trim() : '';
    return v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

/** Full User-Agent sent on admin API requests (WAF allowlist uses the prefix token). */
export function getTelegramBotUserAgent(): string {
  const prefix = botUserAgentPrefixFromEnv(process.env.TELEGRAM_BOT_USER_AGENT?.trim() ?? '');
  const ver = readPackageVersion();
  return ver ? `${prefix}/${ver}` : prefix;
}
