import { open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import { migrate } from 'drizzle-orm/op-sqlite/migrator';

import { migrationsConfig } from './migrations';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle> | null = null;

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export const getDB = (): Database => {
  if (!_db) {
    throw new Error('[db] Database is not initialized. Call initDB() first.');
  }

  return _db as Database;
};

export const initDB = async (): Promise<void> => {
  const sqlite = open({ name: 'voice-inbox.db' });
  const db = drizzle(sqlite, { schema });

  await migrate(db, migrationsConfig);

  _db = db;
};
