import { URL } from 'node:url';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { isDevelopmentAppEnv } from '@/lib/app-env';
import { normalizePostgresConnectionUrl } from '@/lib/direct-database-url';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Modes that trigger pg’s “use uselibpqcompat” warning until pg v9 semantics land. */
const SSL_MODES_NEEDING_LIBPQ_COMPAT = new Set(['require', 'prefer', 'verify-ca']);

/**
 * Managed Postgres (Supabase, Neon) often use `?sslmode=require`. node-pg warns unless libpq-compat is explicit.
 * @see https://www.postgresql.org/docs/current/libpq-ssl.html
 */
function normalizePgConnectionString(connectionString: string | undefined): string | undefined {
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
    // Non-URL strings (e.g. prisma+postgres://) — leave unchanged
  }

  return encoded;
}

/**
 * Determine optimal pool size for serverless environments.
 *
 * Serverless constraints:
 * - Each instance handles 1 request at a time
 * - Many instances can run concurrently (100+)
 * - Small pool per instance × many instances = reasonable total
 *
 * Pool size strategy:
 * - PgBouncer/pooler: 1 connection (pooler handles multiplexing)
 * - Direct connection: 2-3 connections (1 for query, 1-2 for transactions)
 * - Avoid large pools (10+) that multiply across instances
 */
function poolMax(connectionString: string | undefined): number {
  const raw = connectionString?.trim();
  if (!raw) return 3; // Conservative default for serverless

  try {
    const u = new URL(raw);

    // PgBouncer or connection pooler - use minimal pool
    if (u.searchParams.get('pgbouncer') === 'true') return 1;

    // Explicit connection_limit from provider (Supabase, Neon)
    const limit = u.searchParams.get('connection_limit');
    if (limit) return Math.max(1, Number.parseInt(limit, 10) || 1);

    // Managed Postgres providers with built-in pooling
    if (u.hostname.includes('supabase.com')) return 1;
    if (u.hostname.includes('neon.tech')) return 1;
  } catch {
    // Invalid URL - use safe default
  }

  // Direct connection without pooler - keep small for serverless
  return 3;
}

function pgPoolConfig(connectionString: string) {
  return {
    connectionString,
    max: poolMax(connectionString),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    allowExitOnIdle: true,
  };
}

function createPrismaClient(): PrismaClient {
  const connectionString = normalizePgConnectionString(process.env.DATABASE_URL);
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  // Pass connection config (not a Pool instance). Turbopack can bundle pg twice,
  // breaking `instanceof Pool` in @prisma/adapter-pg and causing localhost ECONNREFUSED.
  const adapter = new PrismaPg(pgPoolConfig(connectionString));
  return new PrismaClient({
    adapter,
    log: isDevelopmentAppEnv() ? ['error', 'warn'] : ['error'],
  });
}

let prismaSingleton: PrismaClient | undefined;

function getOrCreatePrismaClient(): PrismaClient {
  if (prismaSingleton) return prismaSingleton;
  if (globalForPrisma.prisma) {
    prismaSingleton = globalForPrisma.prisma;
    return prismaSingleton;
  }
  prismaSingleton = createPrismaClient();
  if (isDevelopmentAppEnv()) {
    globalForPrisma.prisma = prismaSingleton;
  }
  return prismaSingleton;
}

/** Lazy Prisma client — does not connect until first query (Cloud Run worker safe). */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getOrCreatePrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
