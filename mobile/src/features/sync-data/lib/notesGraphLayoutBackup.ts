import { desc } from 'drizzle-orm';

import { isRecord, isString, notesGraphLayoutVersionTable, waitForDb } from '@/shared/lib';

export type NotesGraphLayoutBackupEntry = {
  id: string;
  layoutKey: string;
  versionNumber: number;
  createdAt: string;
  payload: string;
};

const PERSIST_VERSION = 1 as const;

function isValidLayoutPayload(raw: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.v !== PERSIST_VERSION) return false;
    const positions = parsed.positions;
    return isRecord(positions);
  } catch {
    return false;
  }
}

export async function listNotesGraphLayoutsForBackup(): Promise<NotesGraphLayoutBackupEntry[]> {
  const db = await waitForDb();
  const rows = await db
    .select()
    .from(notesGraphLayoutVersionTable)
    .orderBy(desc(notesGraphLayoutVersionTable.createdAt));

  return rows
    .filter(
      (row) =>
        isString(row.id) &&
        isString(row.layoutKey) &&
        Number.isFinite(row.versionNumber) &&
        isString(row.createdAt) &&
        isValidLayoutPayload(row.payload),
    )
    .map((row) => ({
      id: row.id,
      layoutKey: row.layoutKey,
      versionNumber: row.versionNumber,
      createdAt: row.createdAt,
      payload: row.payload,
    }));
}

export async function importNotesGraphLayoutVersionsFromBackup(
  entries: readonly NotesGraphLayoutBackupEntry[],
): Promise<number> {
  if (entries.length === 0) return 0;

  const db = await waitForDb();
  let imported = 0;

  for (const entry of entries) {
    if (!entry.id || !entry.layoutKey || !entry.createdAt) continue;
    if (!Number.isFinite(entry.versionNumber) || entry.versionNumber < 1) continue;
    if (!isValidLayoutPayload(entry.payload)) continue;

    await db
      .insert(notesGraphLayoutVersionTable)
      .values({
        id: entry.id,
        layoutKey: entry.layoutKey,
        versionNumber: entry.versionNumber,
        payload: entry.payload,
        createdAt: entry.createdAt,
      })
      .onConflictDoUpdate({
        target: notesGraphLayoutVersionTable.id,
        set: {
          layoutKey: entry.layoutKey,
          versionNumber: entry.versionNumber,
          payload: entry.payload,
          createdAt: entry.createdAt,
        },
      });

    imported += 1;
  }

  return imported;
}
