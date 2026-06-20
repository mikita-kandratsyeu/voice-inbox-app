import type { DB } from '@op-engineering/op-sqlite';

type JournalEntry = {
  idx: number;
  when: number;
  tag: string;
};

const MIGRATIONS_TABLE = '__drizzle_migrations';

async function tableExists(db: DB, table: string): Promise<boolean> {
  const result = await db.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [
    table,
  ]);
  return result.rows.length > 0;
}

async function columnExists(db: DB, table: string, column: string): Promise<boolean> {
  const result = await db.execute(`PRAGMA table_info(\`${table}\`)`);
  return result.rows.some((row) => String(row.name) === column);
}

/** Returns true when the on-disk schema already reflects this migration. */
export async function isMigrationReflectedInSchema(db: DB, idx: number): Promise<boolean> {
  switch (idx) {
    case 0:
      return tableExists(db, 'records');
    case 1:
      return columnExists(db, 'records', 'durationMs');
    case 2:
      return true;
    case 3:
      return columnExists(db, 'records', 'classification');
    case 4:
      return columnExists(db, 'records', 'translatedTranscript');
    case 5:
      return columnExists(db, 'records', 'embedding');
    case 6:
      return tableExists(db, 'folders');
    case 7:
      return columnExists(db, 'records', 'readAt');
    case 8:
      return tableExists(db, 'record_ask_ai');
    case 9:
      return columnExists(db, 'records', 'deletedAt');
    case 10:
      return columnExists(db, 'records', 'recordingMarks');
    case 11:
      return columnExists(db, 'records', 'meetingDialogue');
    case 12:
      return columnExists(db, 'records', 'summaryReasoning');
    case 13:
      return columnExists(db, 'records', 'summaryAiModel');
    case 14:
      return columnExists(db, 'records', 'summaryTokensPrompt');
    case 15:
      return columnExists(db, 'records', 'summaryGenerationMs');
    case 16:
      return tableExists(db, 'cloud_ai_pending');
    case 17:
      return columnExists(db, 'records', 'meetingSpeakerLabels');
    case 18:
      return columnExists(db, 'records', 'summaryAiModelLabel');
    case 19:
      return columnExists(db, 'records', 'meetingSummaryTemplate');
    case 20:
      return tableExists(db, 'notes_graph_layout_version');
    case 21:
      return columnExists(db, 'notes_graph_layout_version', 'name');
    case 22:
      return tableExists(db, 'private_ai_task_queue');
    case 23:
      return columnExists(db, 'records', 'linkedRecordIds');
    case 24:
      return tableExists(db, 'record_published_share');
    case 25:
      return columnExists(db, 'records', 'summaryAiModelMode');
    default:
      return false;
  }
}

export async function getLatestRecordedMigrationWhen(db: DB): Promise<number | null> {
  if (!(await tableExists(db, MIGRATIONS_TABLE))) {
    return null;
  }

  const result = await db.execute(
    `SELECT created_at FROM ${MIGRATIONS_TABLE} ORDER BY created_at DESC LIMIT 1`,
  );
  const raw = result.rows[0]?.created_at;
  if (raw == null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function stampMigrationJournal(db: DB, when: number): Promise<void> {
  const latestWhen = await getLatestRecordedMigrationWhen(db);
  if (latestWhen != null && latestWhen >= when) return;

  await db.execute(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash text NOT NULL,
      created_at numeric
    )`,
  );

  await db.execute(`INSERT INTO ${MIGRATIONS_TABLE} (hash, created_at) VALUES (?, ?)`, ['', when]);
}

/**
 * Detect how far the on-disk schema has progressed and stamp the journal when it
 * lags behind (e.g. iOS Library→Documents copy or legacy installs).
 */
export async function reconcileMigrationJournal(
  db: DB,
  entries: readonly JournalEntry[],
): Promise<{ stampedWhen: number | null; highestIdx: number | null }> {
  let highestIdx: number | null = null;

  for (const entry of entries) {
    if (await isMigrationReflectedInSchema(db, entry.idx)) {
      highestIdx = entry.idx;
    } else {
      break;
    }
  }

  if (highestIdx == null) {
    return { stampedWhen: null, highestIdx: null };
  }

  const targetEntry = entries.find((e) => e.idx === highestIdx);
  if (!targetEntry) {
    return { stampedWhen: null, highestIdx: null };
  }

  await stampMigrationJournal(db, targetEntry.when);
  const latestWhen = await getLatestRecordedMigrationWhen(db);

  return { stampedWhen: latestWhen, highestIdx };
}
