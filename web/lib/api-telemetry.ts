import { Redis } from '@upstash/redis';

function normalizeApiPath(pathname: string): string {
  return pathname
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
    .replace(/\/c[a-z0-9]{20,}/gi, '/:id');
}

const DAY_TTL_SECONDS = 3 * 24 * 3600;

export async function recordApiError(pathname: string, status: number): Promise<void> {
  if (status < 400) return;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return;
  }

  const day = new Date().toISOString().slice(0, 10);
  const key = `admin:api_err:${day}`;
  const field = `${status} ${normalizeApiPath(pathname)}`;

  try {
    const client = new Redis({ url, token });
    await client.hincrby(key, field, 1);
    await client.expire(key, DAY_TTL_SECONDS);
  } catch (err) {
    console.error('[recordApiError] error', err);
  }
}

export async function getTodayApiErrorStats(): Promise<{
  day: string;
  totalErrors: number;
  topRoutes: { key: string; count: number }[];
} | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  const day = new Date().toISOString().slice(0, 10);
  const key = `admin:api_err:${day}`;
  try {
    const client = new Redis({ url, token });
    const all = await client.hgetall<Record<string, string>>(key);
    if (!all || Object.keys(all).length === 0) {
      return { day, totalErrors: 0, topRoutes: [] };
    }
    const entries = Object.entries(all).map(([k, v]) => ({
      key: k,
      count: parseInt(String(v), 10) || 0,
    }));
    const totalErrors = entries.reduce((s, e) => s + e.count, 0);
    entries.sort((a, b) => b.count - a.count);
    return { day, totalErrors, topRoutes: entries.slice(0, 5) };
  } catch {
    return null;
  }
}
