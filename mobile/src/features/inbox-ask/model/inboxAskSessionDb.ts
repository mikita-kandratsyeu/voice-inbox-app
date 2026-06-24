import dayjs from 'dayjs';
import { eq } from 'drizzle-orm';

import { getDB, inboxAskAiTable, isRecord, isString } from '@/shared/lib';
import type { AskAnswerKind, AskEvidence, CorpusNoteForPrompt } from '@/shared/lib/ai-core/types';

type InboxAskTurn = {
  question: string;
  answer: string;
  mode?: 'inbox' | 'general';
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  interpretations?: string[];
  suggestedFollowUps?: string[];
};

const PERSIST_VERSION = 1 as const;
const MAX_HISTORY_ITEMS = 25;

const saveInboxAskSessionChains = new Map<string, Promise<void>>();

function enqueueSaveInboxAskSession(sessionKey: string, run: () => Promise<void>): Promise<void> {
  const prev = saveInboxAskSessionChains.get(sessionKey) ?? Promise.resolve();
  const next = prev.then(run, run);
  saveInboxAskSessionChains.set(sessionKey, next);
  return next.finally(() => {
    if (saveInboxAskSessionChains.get(sessionKey) === next) {
      saveInboxAskSessionChains.delete(sessionKey);
    }
  });
}

export function buildInboxAskSessionKey(scope?: {
  folderId?: string | null;
  fromIso?: string;
  toIso?: string;
}): string {
  if (!scope?.folderId && !scope?.fromIso && !scope?.toIso) return 'default';
  return [scope.folderId ?? '', scope.fromIso ?? '', scope.toIso ?? ''].join('|');
}

export function inboxAskCorpusFingerprint(notes: CorpusNoteForPrompt[]): string {
  if (!notes.length) return '0';
  const payload = notes
    .map((note) => `${note.recordId}:${note.title.length}`)
    .sort()
    .join(';');
  let hash = 5381;
  for (let i = 0; i < payload.length; i += 1) {
    hash = Math.imul(hash, 33) ^ payload.charCodeAt(i);
  }
  return `${notes.length}:${(hash >>> 0).toString(16)}`;
}

type PersistedPayloadV1 = {
  v: typeof PERSIST_VERSION;
  corpusFp: string;
  history: InboxAskTurn[];
  question: string | null;
  answer: string | null;
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  interpretations?: string[];
  suggestedFollowUps?: string[];
  error: string | null;
  pendingAsk?: boolean;
  lastUsedNotes?: Array<{ recordId: string; title: string }>;
  notesUsed?: number;
  notesTotal?: number;
  notesDropped?: number;
  answerMode?: 'inbox' | 'general' | null;
};

export type InboxAskSessionPersistInput = {
  history: InboxAskTurn[];
  question: string | null;
  answer: string | null;
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  interpretations?: string[];
  suggestedFollowUps?: string[];
  error: string | null;
  isLoading: boolean;
  lastUsedNotes?: Array<{ recordId: string; title: string }>;
  notesUsed?: number;
  notesTotal?: number;
  notesDropped?: number;
  answerMode?: 'inbox' | 'general' | null;
};

function computePendingAsk(snapshot: InboxAskSessionPersistInput): boolean {
  return (
    snapshot.isLoading &&
    Boolean(snapshot.question?.trim()) &&
    !(snapshot.answer && snapshot.answer.trim()) &&
    !(snapshot.error && snapshot.error.trim())
  );
}

function isHistoryItem(x: unknown): x is InboxAskTurn {
  if (!isRecord(x) || !isString(x.question) || !isString(x.answer)) return false;
  const mode = x.mode;
  return mode === undefined || mode === 'inbox' || mode === 'general';
}

function parsePayload(raw: string | null | undefined): PersistedPayloadV1 | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.v !== PERSIST_VERSION) return null;
    const history = Array.isArray(parsed.history)
      ? parsed.history
          .filter(isHistoryItem)
          .map((turn) => ({
            ...turn,
            mode: (turn.mode === 'general' ? 'general' : 'inbox') as 'inbox' | 'general',
          }))
          .slice(-MAX_HISTORY_ITEMS)
      : [];
    return {
      v: PERSIST_VERSION,
      corpusFp: isString(parsed.corpusFp) ? parsed.corpusFp : '0',
      history,
      question: isString(parsed.question) ? parsed.question : null,
      answer: isString(parsed.answer) ? parsed.answer : null,
      answerKind:
        parsed.answerKind === 'plain' ||
        parsed.answerKind === 'list' ||
        parsed.answerKind === 'tasks' ||
        parsed.answerKind === 'decisions'
          ? parsed.answerKind
          : undefined,
      items: Array.isArray(parsed.items)
        ? parsed.items.filter((item): item is string => isString(item))
        : undefined,
      evidence: Array.isArray(parsed.evidence) ? (parsed.evidence as AskEvidence[]) : undefined,
      interpretations: Array.isArray(parsed.interpretations)
        ? parsed.interpretations.filter((item): item is string => isString(item))
        : undefined,
      suggestedFollowUps: Array.isArray(parsed.suggestedFollowUps)
        ? parsed.suggestedFollowUps.filter((item): item is string => isString(item))
        : undefined,
      error: isString(parsed.error) ? parsed.error : null,
      pendingAsk: parsed.pendingAsk === true,
      lastUsedNotes: Array.isArray(parsed.lastUsedNotes)
        ? parsed.lastUsedNotes
            .filter(
              (item): item is { recordId: string; title: string } =>
                isRecord(item) && isString(item.recordId) && isString(item.title),
            )
            .slice(0, 8)
        : undefined,
      notesUsed: typeof parsed.notesUsed === 'number' ? parsed.notesUsed : undefined,
      notesTotal: typeof parsed.notesTotal === 'number' ? parsed.notesTotal : undefined,
      notesDropped: typeof parsed.notesDropped === 'number' ? parsed.notesDropped : undefined,
      answerMode:
        parsed.answerMode === 'general' || parsed.answerMode === 'inbox' ? parsed.answerMode : null,
    };
  } catch {
    return null;
  }
}

export async function loadInboxAskSession(sessionKey: string): Promise<PersistedPayloadV1 | null> {
  const db = getDB();
  const rows = await db
    .select()
    .from(inboxAskAiTable)
    .where(eq(inboxAskAiTable.sessionKey, sessionKey))
    .limit(1);
  return parsePayload(rows[0]?.payload);
}

export async function saveInboxAskSession(
  sessionKey: string,
  corpusFp: string,
  snapshot: InboxAskSessionPersistInput,
): Promise<void> {
  const pendingAsk = computePendingAsk(snapshot);

  return enqueueSaveInboxAskSession(sessionKey, async () => {
    const db = getDB();
    const payload: PersistedPayloadV1 = {
      v: PERSIST_VERSION,
      corpusFp,
      history: snapshot.history,
      question: snapshot.question,
      answer: snapshot.answer,
      ...(snapshot.answerKind ? { answerKind: snapshot.answerKind } : {}),
      ...(snapshot.items?.length ? { items: snapshot.items } : {}),
      ...(snapshot.evidence?.length ? { evidence: snapshot.evidence } : {}),
      ...(snapshot.interpretations?.length ? { interpretations: snapshot.interpretations } : {}),
      ...(snapshot.suggestedFollowUps?.length
        ? { suggestedFollowUps: snapshot.suggestedFollowUps }
        : {}),
      error: snapshot.error,
      ...(pendingAsk ? { pendingAsk: true } : {}),
      ...(snapshot.lastUsedNotes?.length ? { lastUsedNotes: snapshot.lastUsedNotes } : {}),
      ...(typeof snapshot.notesUsed === 'number' ? { notesUsed: snapshot.notesUsed } : {}),
      ...(typeof snapshot.notesTotal === 'number' ? { notesTotal: snapshot.notesTotal } : {}),
      ...(typeof snapshot.notesDropped === 'number' ? { notesDropped: snapshot.notesDropped } : {}),
      ...(snapshot.answerMode ? { answerMode: snapshot.answerMode } : {}),
    };
    await db
      .insert(inboxAskAiTable)
      .values({
        sessionKey,
        payload: JSON.stringify(payload),
        updatedAt: dayjs().toISOString(),
      })
      .onConflictDoUpdate({
        target: inboxAskAiTable.sessionKey,
        set: {
          payload: JSON.stringify(payload),
          updatedAt: dayjs().toISOString(),
        },
      });
  });
}

export async function clearInboxAskSession(sessionKey: string): Promise<void> {
  const db = getDB();
  await db.delete(inboxAskAiTable).where(eq(inboxAskAiTable.sessionKey, sessionKey));
}

export type { InboxAskTurn, PersistedPayloadV1 };
