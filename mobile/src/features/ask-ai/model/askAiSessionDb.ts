import dayjs from 'dayjs';
import { eq } from 'drizzle-orm';

import { getDB, isRecord, isString, recordAskAiTable } from '@/shared/lib';
import type { AskAnswerKind, AskEvidence } from '@/shared/lib/ai-core/types';

type AskTurn = {
  question: string;
  answer: string;
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  interpretations?: string[];
  suggestedFollowUps?: string[];
};

const PERSIST_VERSION = 1 as const;
const MAX_HISTORY_ITEMS = 25;

/** Serialize writes per record so concurrent delete+insert cannot hit UNIQUE on recordId. */
const saveAskAiSessionChains = new Map<string, Promise<void>>();

function enqueueSaveAskAiSession(recordId: string, run: () => Promise<void>): Promise<void> {
  const prev = saveAskAiSessionChains.get(recordId) ?? Promise.resolve();
  const next = prev.then(run, run);
  saveAskAiSessionChains.set(recordId, next);
  return next.finally(() => {
    if (saveAskAiSessionChains.get(recordId) === next) {
      saveAskAiSessionChains.delete(recordId);
    }
  });
}

export function askAiTranscriptFingerprint(transcript: string): string {
  if (!transcript) {
    return '0';
  }

  let h = 5381;
  for (let i = 0; i < transcript.length; i += 1) {
    h = Math.imul(h, 33) ^ transcript.charCodeAt(i);
  }

  return `${transcript.length}:${(h >>> 0).toString(16)}`;
}

type PersistedPayloadV1 = {
  v: typeof PERSIST_VERSION;
  transcriptFp: string;
  history: AskTurn[];
  question: string | null;
  answer: string | null;
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  interpretations?: string[];
  suggestedFollowUps?: string[];
  error: string | null;
  pendingAsk?: boolean;
};

function isHistoryItem(x: unknown): x is AskTurn {
  if (!isRecord(x)) {
    return false;
  }

  const o = x;

  return isString(o.question) && isString(o.answer);
}

function parseAskAnswerKind(value: unknown): AskAnswerKind | undefined {
  return value === 'plain' || value === 'list' || value === 'tasks' || value === 'decisions'
    ? value
    : undefined;
}

function parseStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((item): item is string => isString(item) && item.trim().length > 0);
  return out.length ? out : undefined;
}

function parseEvidence(value: unknown): AskEvidence[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out: AskEvidence[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const quote = isString(item.quote) ? item.quote.trim() : '';
    if (!quote) continue;
    out.push({
      quote,
      ...(isString(item.source) ? { source: item.source as AskEvidence['source'] } : {}),
      ...(typeof item.offsetMs === 'number' && Number.isFinite(item.offsetMs)
        ? { offsetMs: Math.max(0, Math.round(item.offsetMs)) }
        : item.offsetMs === null
          ? { offsetMs: null }
          : {}),
      ...(isString(item.label) && item.label.trim() ? { label: item.label.trim() } : {}),
    });
  }
  return out.length ? out : undefined;
}

function parseSuggestedFollowUps(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((item): item is string => isString(item) && item.trim().length > 0);
  return out.length ? out : undefined;
}

function readNullableStringField(value: unknown): string | null | false {
  if (value === undefined || value === null) {
    return null;
  }

  if (isString(value)) {
    return value;
  }

  return false;
}

function parseHistoryField(value: unknown): AskTurn[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (!value.every(isHistoryItem)) return null;
  return value.map((item) => ({
    question: item.question,
    answer: item.answer,
    ...(parseAskAnswerKind(item.answerKind)
      ? { answerKind: parseAskAnswerKind(item.answerKind) }
      : {}),
    ...(parseStringArray(item.items) ? { items: parseStringArray(item.items) } : {}),
    ...(parseEvidence(item.evidence) ? { evidence: parseEvidence(item.evidence) } : {}),
    ...(parseStringArray(item.interpretations)
      ? { interpretations: parseStringArray(item.interpretations) }
      : {}),
    ...(parseSuggestedFollowUps(item.suggestedFollowUps)
      ? { suggestedFollowUps: parseSuggestedFollowUps(item.suggestedFollowUps) }
      : {}),
  }));
}

function parsePayload(raw: string): PersistedPayloadV1 | null {
  let root: unknown;
  try {
    root = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  if (!isRecord(root)) {
    return null;
  }

  const o = root;

  if (o.v !== PERSIST_VERSION) {
    return null;
  }

  if (!isString(o.transcriptFp)) {
    return null;
  }

  const history = parseHistoryField(o.history);
  if (history === null) {
    return null;
  }

  const question = readNullableStringField(o.question);
  const answer = readNullableStringField(o.answer);
  const error = readNullableStringField(o.error);

  if (question === false || answer === false || error === false) {
    return null;
  }

  const pendingAsk = o.pendingAsk === true;

  return {
    v: PERSIST_VERSION,
    transcriptFp: o.transcriptFp,
    history,
    question,
    answer,
    ...(parseAskAnswerKind(o.answerKind) ? { answerKind: parseAskAnswerKind(o.answerKind) } : {}),
    ...(parseStringArray(o.items) ? { items: parseStringArray(o.items) } : {}),
    ...(parseEvidence(o.evidence) ? { evidence: parseEvidence(o.evidence) } : {}),
    ...(parseStringArray(o.interpretations)
      ? { interpretations: parseStringArray(o.interpretations) }
      : {}),
    ...(parseSuggestedFollowUps(o.suggestedFollowUps)
      ? { suggestedFollowUps: parseSuggestedFollowUps(o.suggestedFollowUps) }
      : {}),
    error,
    pendingAsk,
  };
}

export type RestoredAskAiSession = {
  history: AskTurn[];
  question: string | null;
  answer: string | null;
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  interpretations?: string[];
  suggestedFollowUps?: string[];
  error: string | null;
  pendingAsk: boolean;
};

export async function loadAskAiSession(
  recordId: string,
  transcript: string,
): Promise<RestoredAskAiSession | null> {
  if (!transcript.trim()) return null;

  const fp = askAiTranscriptFingerprint(transcript);
  const db = getDB();
  const rows = await db
    .select()
    .from(recordAskAiTable)
    .where(eq(recordAskAiTable.recordId, recordId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  const parsed = parsePayload(row.payload);
  if (!parsed || parsed.transcriptFp !== fp) return null;

  return {
    history: parsed.history,
    question: parsed.question,
    answer: parsed.answer,
    answerKind: parsed.answerKind,
    items: parsed.items,
    evidence: parsed.evidence,
    interpretations: parsed.interpretations,
    suggestedFollowUps: parsed.suggestedFollowUps,
    error: parsed.error,
    pendingAsk: parsed.pendingAsk ?? false,
  };
}

export async function loadAskAiInboxStatusesByRecordId(
  transcriptByRecordId: Map<string, string>,
): Promise<Map<string, 'processing' | 'error'>> {
  const out = new Map<string, 'processing' | 'error'>();
  if (transcriptByRecordId.size === 0) return out;

  const db = getDB();
  const rows = await db.select().from(recordAskAiTable);
  const fpByTranscript = new Map<string, string>();
  const fpFor = (transcript: string) => {
    let fp = fpByTranscript.get(transcript);
    if (!fp) {
      fp = askAiTranscriptFingerprint(transcript);
      fpByTranscript.set(transcript, fp);
    }

    return fp;
  };

  for (const row of rows) {
    const transcript = transcriptByRecordId.get(row.recordId);
    if (!transcript?.trim()) continue;

    const parsed = parsePayload(row.payload);
    if (!parsed || parsed.transcriptFp !== fpFor(transcript)) continue;

    if (parsed.pendingAsk) {
      out.set(row.recordId, 'processing');
      continue;
    }

    if (
      parsed.question?.trim() &&
      (parsed.error?.trim() ?? '') !== '' &&
      !(parsed.answer && parsed.answer.trim())
    ) {
      out.set(row.recordId, 'error');
    }
  }

  return out;
}

function capHistory(items: AskTurn[]): AskTurn[] {
  if (items.length <= MAX_HISTORY_ITEMS) return items;
  return items.slice(-MAX_HISTORY_ITEMS);
}

export type AskAiSessionPersistInput = {
  history: AskTurn[];
  question: string | null;
  answer: string | null;
  answerKind?: AskAnswerKind;
  items?: string[];
  evidence?: AskEvidence[];
  interpretations?: string[];
  suggestedFollowUps?: string[];
  error: string | null;
  isLoading: boolean;
};

function computePendingAsk(snapshot: AskAiSessionPersistInput): boolean {
  return (
    snapshot.isLoading &&
    Boolean(snapshot.question?.trim()) &&
    !(snapshot.answer && snapshot.answer.trim()) &&
    !snapshot.error
  );
}

export function saveAskAiSession(
  recordId: string,
  transcript: string,
  snapshot: AskAiSessionPersistInput,
): Promise<void> {
  const trimmed = transcript.trim();
  if (!trimmed) return Promise.resolve();

  return enqueueSaveAskAiSession(recordId, async () => {
    const pendingAsk = computePendingAsk(snapshot);

    const hasContent =
      snapshot.history.length > 0 ||
      (snapshot.question && snapshot.question.trim()) ||
      (snapshot.answer && snapshot.answer.trim()) ||
      (snapshot.error && snapshot.error.trim()) ||
      pendingAsk;

    const db = getDB();

    if (!hasContent) {
      await db.delete(recordAskAiTable).where(eq(recordAskAiTable.recordId, recordId));
      return;
    }

    const payload: PersistedPayloadV1 = {
      v: PERSIST_VERSION,
      transcriptFp: askAiTranscriptFingerprint(transcript),
      history: capHistory(snapshot.history),
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
    };

    const updatedAt = dayjs().toISOString();
    const payloadJson = JSON.stringify(payload);
    await db
      .insert(recordAskAiTable)
      .values({
        recordId,
        payload: payloadJson,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: recordAskAiTable.recordId,
        set: {
          payload: payloadJson,
          updatedAt,
        },
      });
  });
}

export async function clearAskAiSession(recordId: string): Promise<void> {
  const db = getDB();
  await db.delete(recordAskAiTable).where(eq(recordAskAiTable.recordId, recordId));
}
