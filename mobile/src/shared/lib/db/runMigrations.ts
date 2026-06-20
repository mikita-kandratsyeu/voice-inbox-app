import type { DB } from '@op-engineering/op-sqlite';

import { migrationsConfig } from './migrations';
import { isMigrationReflectedInSchema, stampMigrationJournal } from './reconcileMigrationJournal';

const MIGRATIONS_TABLE = '__drizzle_migrations';

function isIgnorableMigrationError(err: unknown, statement: string): boolean {
  const msg = String((err as { message?: string }).message ?? err).toLowerCase();
  const upper = statement.toUpperCase();

  if (upper.includes('ADD ') && msg.includes('duplicate column')) return true;
  if (upper.includes('CREATE TABLE') && msg.includes('already exists')) return true;
  if (upper.includes('CREATE INDEX') && msg.includes('already exists')) return true;
  if (upper.includes('CREATE UNIQUE INDEX') && msg.includes('already exists')) return true;
  return false;
}

async function ensureMigrationsTable(db: DB): Promise<void> {
  await db.execute(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash text NOT NULL,
      created_at numeric
    )`,
  );
}

/**
 * Runs pending Drizzle SQL migrations via op-sqlite `execute`.
 * Avoids drizzle-orm's built-in migrator, which breaks with op-sqlite 17+
 * because `executeRawAsync` no longer returns row arrays for journal reads.
 */
export async function runMigrations(db: DB, appliedThroughIdx: number): Promise<void> {
  await ensureMigrationsTable(db);

  const startIdx = appliedThroughIdx + 1;

  for (const entry of migrationsConfig.journal.entries) {
    if (entry.idx < startIdx) continue;

    if (await isMigrationReflectedInSchema(db, entry.idx)) {
      await stampMigrationJournal(db, entry.when);
      continue;
    }

    const key = `m${entry.idx.toString().padStart(4, '0')}`;
    const migrationSql = migrationsConfig.migrations[key];
    if (!migrationSql) {
      throw new Error(`Missing migration SQL for ${entry.tag}`);
    }

    const statements = migrationSql
      .split('--> statement-breakpoint')
      .map((part) => part.trim())
      .filter(Boolean);

    for (const statement of statements) {
      try {
        await db.execute(statement);
      } catch (err) {
        if (!isIgnorableMigrationError(err, statement)) {
          throw err;
        }
      }
    }

    await stampMigrationJournal(db, entry.when);
  }
}

export function getMaxMigrationIdx(): number {
  return Math.max(...migrationsConfig.journal.entries.map((entry) => entry.idx));
}
