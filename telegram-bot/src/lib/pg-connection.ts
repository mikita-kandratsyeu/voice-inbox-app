import { URL } from 'node:url';

import pg from 'pg';

/** Encode user/password so `@`, `^`, `*` etc. in the password do not break the URL. */
export function normalizePostgresConnectionUrl(connectionString: string): string {
  const raw = connectionString.trim();
  const match = raw.match(/^(postgres(?:ql)?:\/\/)(.+)$/i);
  if (!match) return raw;

  const [, prefix, rest] = match;
  const queryIdx = rest.indexOf('?');
  const pathAndHost = queryIdx === -1 ? rest : rest.slice(0, queryIdx);
  const query = queryIdx === -1 ? '' : rest.slice(queryIdx);

  const atIdx = pathAndHost.lastIndexOf('@');
  if (atIdx === -1) return raw;

  const hostPart = pathAndHost.slice(atIdx + 1);
  const userPass = pathAndHost.slice(0, atIdx);
  const colonIdx = userPass.indexOf(':');
  if (colonIdx === -1) return raw;

  let user = userPass.slice(0, colonIdx);
  let password = userPass.slice(colonIdx + 1);
  try {
    user = decodeURIComponent(user);
    password = decodeURIComponent(password);
  } catch {
    // keep raw segments if not percent-encoded
  }

  return `${prefix}${encodeURIComponent(user)}:${encodeURIComponent(password)}@${hostPart}${query}`;
}

const SSL_MODES_NEEDING_LIBPQ_COMPAT = new Set(['require', 'prefer', 'verify-ca']);

/**
 * Managed Postgres (Supabase, Neon) often require SSL. node-pg needs libpq-compat for sslmode.
 * @see https://www.postgresql.org/docs/current/libpq-ssl.html
 */
export function normalizePgConnectionString(
  connectionString: string | undefined,
): string | undefined {
  const raw = connectionString?.trim();
  if (!raw) return raw;

  const encoded = normalizePostgresConnectionUrl(raw);

  try {
    const u = new URL(encoded);
    if (u.protocol !== 'postgresql:' && u.protocol !== 'postgres:') {
      return encoded;
    }
    if (u.hostname.endsWith('supabase.com') && !u.searchParams.has('sslmode')) {
      u.searchParams.set('sslmode', 'require');
    }
    const mode = u.searchParams.get('sslmode')?.toLowerCase() ?? '';
    if (
      SSL_MODES_NEEDING_LIBPQ_COMPAT.has(mode) &&
      u.searchParams.get('uselibpqcompat') !== 'true'
    ) {
      u.searchParams.set('uselibpqcompat', 'true');
      return u.href;
    }
    return encoded;
  } catch {
    // Non-URL strings — leave unchanged
  }

  return encoded;
}

export function createPgPool(connectionString: string): pg.Pool {
  const normalized = normalizePgConnectionString(connectionString);
  if (!normalized) {
    throw new Error('DATABASE_URL is not set');
  }

  return new pg.Pool({ connectionString: normalized });
}
