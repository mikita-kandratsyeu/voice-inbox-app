import { URL } from 'node:url';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
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

function poolMax(connectionString: string | undefined): number {
  const raw = connectionString?.trim();
  if (!raw) return 10;
  try {
    const u = new URL(raw);
    if (u.searchParams.get('pgbouncer') === 'true') return 1;
    const limit = u.searchParams.get('connection_limit');
    if (limit) return Math.max(1, Number.parseInt(limit, 10) || 1);
  } catch {
    // leave default
  }
  return 10;
}

function createPrismaClient(): PrismaClient {
  const connectionString = normalizePgConnectionString(process.env.DATABASE_URL);
  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      max: poolMax(connectionString),
      connectionTimeoutMillis: 5000,
    });
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.pgPool = pool;
  }
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
