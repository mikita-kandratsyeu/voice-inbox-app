import { IOS_DOCUMENT_PATH, IOS_LIBRARY_PATH, open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import { migrate } from 'drizzle-orm/op-sqlite/migrator';

import { NitroFS } from '@/shared/lib/fs';

import { IS_IOS } from '../platform';
import { migrationsConfig } from './migrations';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle> | null = null;
const DB_NAME = 'voice-inbox.db';

async function migrateIosSqliteFromLibraryToDocumentsIfNeeded(): Promise<void> {
  if (!IS_IOS || !IOS_DOCUMENT_PATH || !IOS_LIBRARY_PATH) return;

  const docBase = String(IOS_DOCUMENT_PATH).replace(/\/$/, '');
  const libBase = String(IOS_LIBRARY_PATH).replace(/\/$/, '');
  const newPath = `${docBase}/${DB_NAME}`;
  const oldPath = `${libBase}/${DB_NAME}`;

  const newExists = await NitroFS.exists(newPath);
  const oldExists = await NitroFS.exists(oldPath);
  if (newExists || !oldExists) return;

  try {
    await NitroFS.copyFile(oldPath, newPath);
  } catch (err) {
    if (__DEV__) console.warn('[db] Failed to copy voice-inbox.db Library → Documents', err);
  }
}

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export const getDB = (): Database => {
  if (!_db) {
    throw new Error('[db] Database is not initialized. Call initDB() first.');
  }

  return _db as Database;
};

export const initDB = async (): Promise<void> => {
  if (IS_IOS && IOS_DOCUMENT_PATH) {
    await migrateIosSqliteFromLibraryToDocumentsIfNeeded();
  }

  const openParams: { name: string; location?: string } = { name: DB_NAME };
  if (IS_IOS && IOS_DOCUMENT_PATH) {
    openParams.location = `${IOS_DOCUMENT_PATH}/`;
  }

  const sqlite = open(openParams);
  const db = drizzle(sqlite, { schema });

  await migrate(db, migrationsConfig);

  _db = db;
};
