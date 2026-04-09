import dayjs from 'dayjs';
import { eq } from 'drizzle-orm';

import { getDB, isRecord, isString, recordAskAiTable } from '@/shared/lib';

type AskTurn = { question: string; answer: string };

const PERSIST_VERSION = 1 as const;
const MAX_HISTORY_ITEMS = 25;

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

  return value.every(isHistoryItem) ? value : null;
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
    error,
    pendingAsk,
  };
}

export type RestoredAskAiSession = {
  history: AskTurn[];
  question: string | null;
  answer: string | null;
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

export async function saveAskAiSession(
  recordId: string,
  transcript: string,
  snapshot: AskAiSessionPersistInput,
): Promise<void> {
  const trimmed = transcript.trim();
  if (!trimmed) return;

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
    error: snapshot.error,
    ...(pendingAsk ? { pendingAsk: true } : {}),
  };

  const updatedAt = dayjs().toISOString();
  const payloadJson = JSON.stringify(payload);
  await db.delete(recordAskAiTable).where(eq(recordAskAiTable.recordId, recordId));
  await db.insert(recordAskAiTable).values({
    recordId,
    payload: payloadJson,
    updatedAt,
  });
}

export async function clearAskAiSession(recordId: string): Promise<void> {
  const db = getDB();
  await db.delete(recordAskAiTable).where(eq(recordAskAiTable.recordId, recordId));
}
