import { eq, inArray } from 'drizzle-orm';

import type { ShareBriefTemplate } from '@/features/share-record';
import { getDB, recordPublishedShareTable } from '@/shared/lib';

import type { PublishedNoteState } from '../model/types';

function normalizeTemplate(raw: string): ShareBriefTemplate {
  if (
    raw === 'noteBrief' ||
    raw === 'emailBrief' ||
    raw === 'meetingBrief' ||
    raw === 'meetingSpeakerTurns'
  ) {
    return raw;
  }
  return 'noteBrief';
}

function mapRow(row: typeof recordPublishedShareTable.$inferSelect): PublishedNoteState {
  return {
    recordId: row.recordId,
    shareToken: row.shareToken,
    shareUrl: row.shareUrl,
    template: normalizeTemplate(row.template),
    contentHash: row.contentHash,
    publishedAt: row.publishedAt,
    expiresAt: row.expiresAt ?? null,
    updatedAt: row.updatedAt,
  };
}

export async function getPublishedNoteState(recordId: string): Promise<PublishedNoteState | null> {
  const db = getDB();
  const rows = await db
    .select()
    .from(recordPublishedShareTable)
    .where(eq(recordPublishedShareTable.recordId, recordId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt && Date.parse(row.expiresAt) <= Date.now()) {
    await db.delete(recordPublishedShareTable).where(eq(recordPublishedShareTable.recordId, recordId));
    return null;
  }
  return mapRow(row);
}

export async function getPublishedNoteMap(recordIds: string[]): Promise<Map<string, PublishedNoteState>> {
  const ids = Array.from(new Set(recordIds.filter(Boolean)));
  if (ids.length === 0) return new Map();
  const db = getDB();
  const rows = await db
    .select()
    .from(recordPublishedShareTable)
    .where(inArray(recordPublishedShareTable.recordId, ids));
  const out = new Map<string, PublishedNoteState>();
  for (const row of rows) {
    if (row.expiresAt && Date.parse(row.expiresAt) <= Date.now()) continue;
    out.set(row.recordId, mapRow(row));
  }
  return out;
}

export async function upsertPublishedNoteState(state: PublishedNoteState): Promise<void> {
  const db = getDB();
  await db
    .insert(recordPublishedShareTable)
    .values({
      recordId: state.recordId,
      shareToken: state.shareToken,
      shareUrl: state.shareUrl,
      template: state.template,
      contentHash: state.contentHash,
      publishedAt: state.publishedAt,
      expiresAt: state.expiresAt,
      updatedAt: state.updatedAt,
    })
    .onConflictDoUpdate({
      target: recordPublishedShareTable.recordId,
      set: {
        shareToken: state.shareToken,
        shareUrl: state.shareUrl,
        template: state.template,
        contentHash: state.contentHash,
        publishedAt: state.publishedAt,
        expiresAt: state.expiresAt,
        updatedAt: state.updatedAt,
      },
    });
}

export async function deletePublishedNoteStateByRecordId(recordId: string): Promise<void> {
  const db = getDB();
  await db.delete(recordPublishedShareTable).where(eq(recordPublishedShareTable.recordId, recordId));
}

export async function deletePublishedNoteStateByRecordIds(recordIds: string[]): Promise<void> {
  const ids = Array.from(new Set(recordIds.filter(Boolean)));
  if (ids.length === 0) return;
  const db = getDB();
  await db.delete(recordPublishedShareTable).where(inArray(recordPublishedShareTable.recordId, ids));
}

export async function deletePublishedNoteStateByToken(token: string): Promise<void> {
  const normalized = token.trim();
  if (!normalized) return;
  const db = getDB();
  await db.delete(recordPublishedShareTable).where(eq(recordPublishedShareTable.shareToken, normalized));
}
