import { URL } from 'node:url';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { isDevelopmentAppEnv } from '@/lib/app-env';
import { normalizePostgresConnectionUrl } from '@/lib/direct-database-url';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
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

function createPrismaClient(): PrismaClient {
  const connectionString = normalizePgConnectionString(process.env.DATABASE_URL);

  // Create or reuse pg.Pool for this instance
  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      max: poolMax(connectionString), // Small pool optimized for serverless
      connectionTimeoutMillis: 10_000, // 10s connection timeout
      idleTimeoutMillis: 30_000, // Close idle connections after 30s
      allowExitOnIdle: true, // Allow process to exit when all clients idle (serverless-friendly)
    });

  if (isDevelopmentAppEnv()) {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: isDevelopmentAppEnv() ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (isDevelopmentAppEnv()) {
  globalForPrisma.prisma = prisma;
}
