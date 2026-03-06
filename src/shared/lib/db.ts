import { type DB, open } from '@op-engineering/op-sqlite';

let _db: DB | null = null;

export const getDB = (): DB => {
  if (!_db) {
    throw new Error('[db] Database is not initialized. Call initDB() first.');
  }

  return _db;
};

const SCHEMA_VERSION = 3;

export const initDB = () => {
  _db = open({ name: 'voice-inbox.db' });

  let currentVersion = 0;

  try {
    const versionResult = _db.executeSync(
      "SELECT value FROM meta WHERE key = 'schema_version' LIMIT 1",
    );
    currentVersion =
      Number((versionResult.rows?.[0] as { value?: string } | undefined)?.value ?? 0) || 0;
  } catch {
    currentVersion = 0;
  }

  if (currentVersion < SCHEMA_VERSION) {
    _db.executeSync('DROP TABLE IF EXISTS records');
    _db.executeSync('DROP TABLE IF EXISTS meta');
  }

  _db.executeSync(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  _db.executeSync(`INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)`, [
    String(SCHEMA_VERSION),
  ]);

  _db.executeSync(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      transcript TEXT DEFAULT '',
      transcriptSegments TEXT DEFAULT '[]',
      summary TEXT DEFAULT '',
      tasks TEXT DEFAULT '[]',
      duration TEXT DEFAULT '0:00',
      createdAt TEXT DEFAULT '',
      relativeTime TEXT DEFAULT '',
      status TEXT DEFAULT 'unread',
      aiStatus TEXT DEFAULT 'idle',
      transcriptProgress INTEGER DEFAULT 0,
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
