import type { DB } from '@op-engineering/op-sqlite';

type RawQueryResult = {
  rawRows?: unknown[][];
};

/**
 * op-sqlite 17 returns `{ rawRows, columnNames }` from executeRaw, while drizzle-orm
 * 0.45 expects `executeRawAsync` to return `unknown[][]` for SELECT field mapping.
 */
export function patchOpSqliteForDrizzleCompat(db: DB): DB {
  const executeRawAsync = db.executeRawAsync?.bind(db);
  if (!executeRawAsync) return db;

  db.executeRawAsync = async (query, params) => {
    const result = await executeRawAsync(query, params);
    if (Array.isArray(result)) {
      return result;
    }
    const rawRows = (result as RawQueryResult | null)?.rawRows;
    return Array.isArray(rawRows) ? rawRows : [];
  };

  return db;
}
