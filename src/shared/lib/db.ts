import { type DB, open } from '@op-engineering/op-sqlite';

let _db: DB | null = null;

export const getDB = (): DB => {
  if (!_db) {
    throw new Error('[db] Database is not initialized. Call initDB() first.');
  }

  return _db;
};

export const initDB = () => {
  _db = open({ name: 'voice-inbox.db' });

  _db.executeSync(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      transcript TEXT DEFAULT '',
      duration TEXT DEFAULT '0:00',
      createdAt TEXT DEFAULT '',
      status TEXT DEFAULT 'unread',
      isPinned INTEGER DEFAULT 0,
      tags TEXT DEFAULT '[]',
      audioPath TEXT
    )
  `);

  _db.executeSync(`
    CREATE INDEX IF NOT EXISTS idx_records_isPinned ON records (isPinned DESC)
  `);

  _db.executeSync(`
    CREATE INDEX IF NOT EXISTS idx_records_createdAt ON records (createdAt DESC)
  `);
};
