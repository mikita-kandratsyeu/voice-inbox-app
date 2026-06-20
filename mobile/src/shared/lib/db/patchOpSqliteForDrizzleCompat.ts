import type { DB, Scalar } from '@op-engineering/op-sqlite';

type ExecuteRawAsync = (query: string, params?: Scalar[]) => Promise<unknown[][]>;

type DrizzleCompatDB = DB & {
  executeRawAsync: ExecuteRawAsync;
};

/**
 * op-sqlite 17 returns `{ rawRows, columnNames }` from executeRaw, while drizzle-orm
 * 0.45 expects `executeRawAsync` to return `unknown[][]` for SELECT field mapping.
 */
export function patchOpSqliteForDrizzleCompat(db: DB): DB {
  const patched = db as DrizzleCompatDB;

  patched.executeRawAsync = async (query, params) => {
    const result = await db.executeRaw(query, params);
    const rawRows = result?.rawRows;
    return Array.isArray(rawRows) ? rawRows : [];
  };

  return db;
}
