/**
 * Session/direct Postgres URL for Prisma CLI, pg_dump, and pg_restore.
 * On Supabase use DIRECT_URL (pooler :5432); runtime queries use DATABASE_URL (:6543).
 */

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

export function getDirectDatabaseUrl(): string {
  const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('DIRECT_URL or DATABASE_URL is not set (see web/.env)');
  }

  return normalizePostgresConnectionUrl(url);
}
