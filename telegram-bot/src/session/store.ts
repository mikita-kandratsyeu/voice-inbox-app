import type { CursorPage } from './pagination.js';
import { freshPagination } from './pagination.js';
import type { FlowStep, UserSession } from './types.js';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

type SessionEntry = {
  session: UserSession;
  touchedAt: number;
};

const sessions = new Map<string, SessionEntry>();

function pruneExpired(): void {
  const now = Date.now();
  for (const [id, entry] of sessions) {
    if (now - entry.touchedAt > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

function touchEntry(telegramUserId: string): SessionEntry {
  pruneExpired();
  let entry = sessions.get(telegramUserId);
  if (!entry) {
    entry = { session: {}, touchedAt: Date.now() };
    sessions.set(telegramUserId, entry);
  } else {
    entry.touchedAt = Date.now();
  }
  return entry;
}

export function getSession(telegramUserId: string): UserSession {
  return touchEntry(telegramUserId).session;
}

export function clearSession(telegramUserId: string): void {
  sessions.delete(telegramUserId);
}

export function clearFlow(telegramUserId: string): void {
  const s = getSession(telegramUserId);
  delete s.flow;
  delete s.pendingConfirm;
}

export function getFlow(telegramUserId: string): FlowStep | undefined {
  return getSession(telegramUserId).flow;
}

export function setFlow(telegramUserId: string, flow: FlowStep): void {
  getSession(telegramUserId).flow = flow;
}

export function setListIds(telegramUserId: string, ids: string[]): void {
  getSession(telegramUserId).listIds = ids;
}

export function getListId(telegramUserId: string, index: number): string | null {
  const ids = getSession(telegramUserId).listIds;
  if (!ids || index < 0 || index >= ids.length) return null;
  return ids[index] ?? null;
}

export function setListMeta(telegramUserId: string, key: string, value: string): void {
  const s = getSession(telegramUserId);
  if (!s.listMeta) s.listMeta = {};
  s.listMeta[key] = value;
}

export function getListMeta(telegramUserId: string, key: string): string | undefined {
  return getSession(telegramUserId).listMeta?.[key];
}

export function getPagination(telegramUserId: string, listKey: string): CursorPage {
  const s = getSession(telegramUserId);
  if (!s.pagination) s.pagination = {};
  if (!s.pagination[listKey]) {
    s.pagination[listKey] = freshPagination();
  }
  return s.pagination[listKey]!;
}

export function setPagination(telegramUserId: string, listKey: string, page: CursorPage): void {
  const s = getSession(telegramUserId);
  if (!s.pagination) s.pagination = {};
  s.pagination[listKey] = page;
}

export function resetPagination(telegramUserId: string, listKey: string): void {
  setPagination(telegramUserId, listKey, freshPagination());
}

export function isSupportAlertsEnabled(telegramUserId: string): boolean {
  return getSession(telegramUserId).supportAlerts === true;
}

export function setSupportAlertsEnabled(telegramUserId: string, enabled: boolean): void {
  getSession(telegramUserId).supportAlerts = enabled;
}

/** For tests */
export function sessionCount(): number {
  return sessions.size;
}
