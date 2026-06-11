import { PrismaClient } from '@/generated/prisma';
import { Pool } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var pgPoolGlobal: Pool | undefined;
}

/**
 * PostgreSQL connection pool for direct queries when needed.
 */
function createPgPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  return new Pool({
    connectionString,
    max: 20, // Maximum pool size
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return error after 10 seconds if connection cannot be established
    allowExitOnIdle: process.env.NODE_ENV === 'production',
  });
}

export const pgPool =
  process.env.NODE_ENV === 'production' ? createPgPool() : (globalThis.pgPoolGlobal ??= createPgPool());

/**
 * Prisma Client singleton with connection pooling.
 */
function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  return client;
}

export const prisma =
  process.env.NODE_ENV === 'production'
    ? createPrismaClient()
    : (globalThis.prismaGlobal ??= createPrismaClient());

/**
 * Gracefully disconnect database connections on shutdown.
 */
async function disconnectDb(): Promise<void> {
  console.log('Disconnecting from database...');

  try {
    await prisma.$disconnect();
    await pgPool.end();
    console.log('Database connections closed successfully');
  } catch (error) {
    console.error('Error disconnecting from database:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV === 'production') {
  process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received');
    await disconnectDb();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT signal received');
    await disconnectDb();
    process.exit(0);
  });
}

/**
 * Execute a database query with timeout.
 */
export async function queryWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs = 30000,
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Database query timeout (${timeoutMs}ms)`)), timeoutMs),
  );

  return Promise.race([queryFn(), timeoutPromise]);
}

/**
 * Health check for database connection.
 */
export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latencyMs: number }> {
  const start = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    return { healthy: true, latencyMs };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { healthy: false, latencyMs: Date.now() - start };
  }
}
