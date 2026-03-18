import { IOS_DOCUMENT_PATH, open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import { migrate } from 'drizzle-orm/op-sqlite/migrator';

import { IS_IOS } from '../platform';
import { migrationsConfig } from './migrations';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle> | null = null;
const DB_NAME = 'voice-inbox.db';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export const getDB = (): Database => {
  if (!_db) {
    throw new Error('[db] Database is not initialized. Call initDB() first.');
  }

  return _db as Database;
};

export const initDB = async (): Promise<void> => {
  const openParams: { name: string; location?: string } = { name: DB_NAME };
  if (IS_IOS && IOS_DOCUMENT_PATH) {
    openParams.location = `${IOS_DOCUMENT_PATH}/`;
  }

  const sqlite = open(openParams);
  const db = drizzle(sqlite, { schema });

  await migrate(db, migrationsConfig);

  _db = db;
};
