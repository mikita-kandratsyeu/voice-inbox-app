import type { FlowStep, UserSession } from './types.js';

const sessions = new Map<string, UserSession>();

export function getSession(telegramUserId: string): UserSession {
  let s = sessions.get(telegramUserId);
  if (!s) {
    s = {};
    sessions.set(telegramUserId, s);
  }
  return s;
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
