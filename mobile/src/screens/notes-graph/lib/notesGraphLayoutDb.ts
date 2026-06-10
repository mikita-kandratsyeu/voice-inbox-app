import dayjs from 'dayjs';
import { and, desc, eq, lt, sql } from 'drizzle-orm';

import { isRecord, isString, notesGraphLayoutVersionTable, waitForDb } from '@/shared/lib';

export type NotesGraphNodePosition = { x: number; y: number };

export type NotesGraphLayoutVersionEntry = {
  id: string;
  layoutKey: string;
  versionNumber: number;
  createdAt: string;
  nodeCount: number;
  name: string | null;
};

const PERSIST_VERSION = 1 as const;
const MAX_VERSIONS_PER_LAYOUT = 50;

type PersistedPayloadV1 = {
  v: typeof PERSIST_VERSION;
  positions: Record<string, NotesGraphNodePosition>;
};

function isPosition(value: unknown): value is NotesGraphNodePosition {
  return (
    isRecord(value) &&
    typeof value.x === 'number' &&
    Number.isFinite(value.x) &&
    typeof value.y === 'number' &&
    Number.isFinite(value.y)
  );
}

function parsePayload(raw: string): Record<string, NotesGraphNodePosition> | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.v !== PERSIST_VERSION) return null;
    const positions = parsed.positions;
    if (!isRecord(positions)) return null;

    const out: Record<string, NotesGraphNodePosition> = {};
    for (const [nodeId, pos] of Object.entries(positions)) {
      if (!isString(nodeId) || !isPosition(pos)) continue;
      out[nodeId] = { x: pos.x, y: pos.y };
    }
    return out;
  } catch {
    return null;
  }
}

function serializePayload(positions: Record<string, NotesGraphNodePosition>): string {
  const payload: PersistedPayloadV1 = {
    v: PERSIST_VERSION,
    positions,
  };
  return JSON.stringify(payload);
}

function positionsFromMap(
  positions: Map<string, NotesGraphNodePosition>,
): Record<string, NotesGraphNodePosition> {
  const out: Record<string, NotesGraphNodePosition> = {};
  for (const [nodeId, pos] of positions.entries()) {
    out[nodeId] = { x: pos.x, y: pos.y };
  }
  return out;
}

export function serializeNotesGraphPositions(
  positions: Map<string, NotesGraphNodePosition>,
): string {
  const entries = [...positions.entries()].sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries.map(([id, pos]) => [id, { x: pos.x, y: pos.y }]));
}

export function deserializeNotesGraphPositions(
  serialized: string,
): Record<string, NotesGraphNodePosition> {
  if (!serialized) return {};

  const entries = JSON.parse(serialized) as [string, NotesGraphNodePosition][];
  const out: Record<string, NotesGraphNodePosition> = {};
  for (const [id, pos] of entries) {
    out[id] = { x: pos.x, y: pos.y };
  }
  return out;
}

export async function getLatestNotesGraphLayoutVersion(
  layoutKey: string,
): Promise<
  (NotesGraphLayoutVersionEntry & { positions: Record<string, NotesGraphNodePosition> }) | null
> {
  const db = await waitForDb();
  const rows = await db
    .select()
    .from(notesGraphLayoutVersionTable)
    .where(eq(notesGraphLayoutVersionTable.layoutKey, layoutKey))
    .orderBy(desc(notesGraphLayoutVersionTable.versionNumber))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const positions = parsePayload(row.payload);
  if (!positions) return null;

  return {
    id: row.id,
    layoutKey: row.layoutKey,
    versionNumber: row.versionNumber,
    createdAt: row.createdAt,
    nodeCount: Object.keys(positions).length,
    name: row.name ?? null,
    positions,
  };
}

const MAX_ALL_LAYOUT_HISTORY = 200;

export async function listAllNotesGraphLayoutHistory(
  limit = MAX_ALL_LAYOUT_HISTORY,
): Promise<NotesGraphLayoutVersionEntry[]> {
  const db = await waitForDb();
  const rows = await db
    .select()
    .from(notesGraphLayoutVersionTable)
    .orderBy(desc(notesGraphLayoutVersionTable.createdAt))
    .limit(limit);

  return rows
    .map((row) => {
      const positions = parsePayload(row.payload);
      if (!positions) return null;
      return {
        id: row.id,
        layoutKey: row.layoutKey,
        versionNumber: row.versionNumber,
        createdAt: row.createdAt,
        nodeCount: Object.keys(positions).length,
        name: row.name ?? null,
      };
    })
    .filter((entry): entry is NotesGraphLayoutVersionEntry => entry != null);
}

export async function listNotesGraphLayoutHistory(
  layoutKey: string,
  limit = MAX_VERSIONS_PER_LAYOUT,
): Promise<NotesGraphLayoutVersionEntry[]> {
  const db = await waitForDb();
  const rows = await db
    .select()
    .from(notesGraphLayoutVersionTable)
    .where(eq(notesGraphLayoutVersionTable.layoutKey, layoutKey))
    .orderBy(desc(notesGraphLayoutVersionTable.versionNumber))
    .limit(limit);

  return rows
    .map((row) => {
      const positions = parsePayload(row.payload);
      if (!positions) return null;
      return {
        id: row.id,
        layoutKey: row.layoutKey,
        versionNumber: row.versionNumber,
        createdAt: row.createdAt,
        nodeCount: Object.keys(positions).length,
        name: row.name ?? null,
      };
    })
    .filter((entry): entry is NotesGraphLayoutVersionEntry => entry != null);
}

export async function getNotesGraphLayoutVersionPositions(
  versionId: string,
): Promise<Record<string, NotesGraphNodePosition> | null> {
  const db = await waitForDb();
  const rows = await db
    .select()
    .from(notesGraphLayoutVersionTable)
    .where(eq(notesGraphLayoutVersionTable.id, versionId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return parsePayload(row.payload);
}

export async function saveNotesGraphLayoutVersion(
  layoutKey: string,
  positions: Map<string, NotesGraphNodePosition>,
  name?: string | null,
): Promise<NotesGraphLayoutVersionEntry> {
  const db = await waitForDb();
  const record = positionsFromMap(positions);
  const createdAt = dayjs().toISOString();

  const maxRow = await db
    .select({ versionNumber: notesGraphLayoutVersionTable.versionNumber })
    .from(notesGraphLayoutVersionTable)
    .where(eq(notesGraphLayoutVersionTable.layoutKey, layoutKey))
    .orderBy(desc(notesGraphLayoutVersionTable.versionNumber))
    .limit(1);

  const nextVersion = (maxRow[0]?.versionNumber ?? 0) + 1;
  const id = `nglv_${layoutKey.slice(0, 24)}_${nextVersion}_${Date.now()}`;

  const resolvedName = name?.trim() || null;

  await db.insert(notesGraphLayoutVersionTable).values({
    id,
    layoutKey,
    versionNumber: nextVersion,
    payload: serializePayload(record),
    createdAt,
    name: resolvedName,
  });

  if (nextVersion > MAX_VERSIONS_PER_LAYOUT) {
    const cutoff = nextVersion - MAX_VERSIONS_PER_LAYOUT;
    await db
      .delete(notesGraphLayoutVersionTable)
      .where(
        and(
          eq(notesGraphLayoutVersionTable.layoutKey, layoutKey),
          lt(notesGraphLayoutVersionTable.versionNumber, cutoff + 1),
        ),
      );
  }

  return {
    id,
    layoutKey,
    versionNumber: nextVersion,
    createdAt,
    nodeCount: Object.keys(record).length,
    name: resolvedName,
  };
}

export async function deleteNotesGraphLayoutVersionById(versionId: string): Promise<boolean> {
  const db = await waitForDb();
  const rows = await db
    .select({ id: notesGraphLayoutVersionTable.id })
    .from(notesGraphLayoutVersionTable)
    .where(eq(notesGraphLayoutVersionTable.id, versionId))
    .limit(1);

  if (!rows[0]) return false;

  await db
    .delete(notesGraphLayoutVersionTable)
    .where(eq(notesGraphLayoutVersionTable.id, versionId));

  return true;
}

export async function deleteNotesGraphLayoutVersion(
  layoutKey: string,
  versionId: string,
): Promise<boolean> {
  const db = await waitForDb();
  const rows = await db
    .select({ id: notesGraphLayoutVersionTable.id })
    .from(notesGraphLayoutVersionTable)
    .where(
      and(
        eq(notesGraphLayoutVersionTable.layoutKey, layoutKey),
        eq(notesGraphLayoutVersionTable.id, versionId),
      ),
    )
    .limit(1);

  if (!rows[0]) return false;

  return deleteNotesGraphLayoutVersionById(versionId);
}

export async function countNotesGraphLayoutHistory(layoutKey: string): Promise<number> {
  const db = await waitForDb();
  const rows = await db
    .select({ count: sql<number>`count(*)` })
    .from(notesGraphLayoutVersionTable)
    .where(eq(notesGraphLayoutVersionTable.layoutKey, layoutKey));
  return rows[0]?.count ?? 0;
}
