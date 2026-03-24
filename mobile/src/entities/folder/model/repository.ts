import { asc, eq } from 'drizzle-orm';

import { foldersTable, getDB, recordsTable } from '@/shared/lib';

import type { Folder } from './types';

const toFolder = (row: {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sortOrder: number | null;
  createdAt: string;
}): Folder => ({
  id: row.id,
  name: row.name,
  color: row.color ?? '#6b7280',
  icon: row.icon ?? '📁',
  sortOrder: row.sortOrder ?? 0,
  createdAt: row.createdAt,
});

export const folderRepository = {
  getAll: async (): Promise<Folder[]> => {
    const db = getDB();
    const rows = await db
      .select()
      .from(foldersTable)
      .orderBy(asc(foldersTable.sortOrder), asc(foldersTable.createdAt));
    return rows.map(toFolder);
  },

  insert: async (folder: Folder): Promise<void> => {
    const db = getDB();
    await db
      .insert(foldersTable)
      .values({
        id: folder.id,
        name: folder.name,
        color: folder.color,
        icon: folder.icon,
        sortOrder: folder.sortOrder,
        createdAt: folder.createdAt,
      })
      .onConflictDoNothing();
  },

  update: async (
    id: string,
    data: Partial<Pick<Folder, 'name' | 'color' | 'icon' | 'sortOrder'>>,
  ): Promise<void> => {
    const db = getDB();
    await db.update(foldersTable).set(data).where(eq(foldersTable.id, id));
  },

  remove: async (id: string): Promise<void> => {
    const db = getDB();
    await db.update(recordsTable).set({ folderId: null }).where(eq(recordsTable.folderId, id));
    await db.delete(foldersTable).where(eq(foldersTable.id, id));
  },

  updateRecordFolder: async (recordId: string, folderId: string | null): Promise<void> => {
    const db = getDB();
    await db.update(recordsTable).set({ folderId }).where(eq(recordsTable.id, recordId));
  },
};
