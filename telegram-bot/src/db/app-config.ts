import type { Pool } from 'pg';

export type AppConfigRow = { key: string; value: string };

/** All AppConfig rows sorted by key (read-only). */
export async function listAllAppConfig(pool: Pool): Promise<AppConfigRow[]> {
  const { rows } = await pool.query<AppConfigRow>(
    `SELECT key, value FROM "AppConfig" ORDER BY key ASC`,
  );
  return rows;
}

const CHUNK_LINES = 16;
const MAX_VALUE_CHARS = 100;

export function formatAppConfigChunks(rows: AppConfigRow[]): string[] {
  if (rows.length === 0) {
    return ['App configuration (read-only)\n\n(no rows in AppConfig)'];
  }
  const lines = rows.map((r) => {
    const v = r.value.replace(/\s+/g, ' ').trim();
    const short = v.length > MAX_VALUE_CHARS ? `${v.slice(0, MAX_VALUE_CHARS - 1)}…` : v;
    return `${r.key} = ${short}`;
  });
  const totalChunks = Math.max(1, Math.ceil(lines.length / CHUNK_LINES));
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += CHUNK_LINES) {
    const part = lines.slice(i, i + CHUNK_LINES);
    const partIndex = chunks.length + 1;
    const header = `App configuration (read-only)\nPart ${partIndex}/${totalChunks}\n`;
    chunks.push(`${header}\n${part.join('\n')}`);
  }
  return chunks;
}
