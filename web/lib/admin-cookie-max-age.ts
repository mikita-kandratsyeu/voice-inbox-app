/** Align cookie max-age with ADMIN_JWT_EXPIRES_IN (jose setExpirationTime). */
export function getAdminCookieMaxAgeSeconds(): number {
  const raw = process.env.ADMIN_JWT_EXPIRES_IN?.trim() || '24h';
  const m = /^(\d+)([dhms])$/i.exec(raw);
  if (!m) return 60 * 60 * 24;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 1) return 60 * 60 * 24;
  const u = m[2].toLowerCase();
  if (u === 'd') return n * 86400;
  if (u === 'h') return n * 3600;
  if (u === 'm') return n * 60;
  return n;
}
