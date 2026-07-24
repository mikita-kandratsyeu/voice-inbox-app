import dayjs from 'dayjs';

import type { RecordListItem, VoiceRecord } from '@/entities/record';
import {
  type CorpusNoteCandidate,
  packCorpusNotesForPrompt,
  type PackCorpusNotesResult,
} from '@/shared/lib/ai-core/corpusNotesForPrompt';
import type { CorpusNoteForPrompt } from '@/shared/lib/ai-core/types';
import {
  centeredCosineSimilarity,
  computeCentroid,
  generateEmbedding,
  getEmbeddingLanguage,
  isEmbeddingAvailable,
  prepareEmbeddingModel,
} from '@/shared/lib/embeddings';

export const INBOX_ASK_RETRIEVAL_TOP_K = 20;
export const SEMANTIC_SCORE_WEIGHT = 0.4;
export const LEXICAL_SCORE_WEIGHT = 0.6;
export const MIN_HYBRID_SCORE = 0.1;
export const MIN_SEMANTIC_SCORE_WITHOUT_LEXICAL = 0.3;

const STOPWORDS = new Set([
  'в',
  'и',
  'на',
  'с',
  'у',
  'о',
  'к',
  'по',
  'для',
  'из',
  'от',
  'до',
  'за',
  'при',
  'не',
  'the',
  'a',
  'an',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'is',
  'it',
]);

const RELEVANCE = {
  title: 5,
  summary: 4,
  transcript: 3,
  tags: 2,
  tasks: 1,
  keyPhrases: 2,
} as const;

export type InboxAskRetrievalScope = {
  folderId?: string | null;
  fromIso?: string;
  toIso?: string;
  /** When false (default), archived notes are excluded from the corpus. */
  includeArchived?: boolean;
};

type ScoredRecord = {
  record: VoiceRecord | RecordListItem;
  score: number;
};

export type InboxAskRetrievalMode = 'hybrid' | 'lexical';

export type InboxAskRetrievalResult = {
  candidates: CorpusNoteCandidate[];
  packResult: PackCorpusNotesResult;
  retrievalMode: InboxAskRetrievalMode;
  totalCorpusCount: number;
  notes: CorpusNoteForPrompt[];
  totalChars: number;
  droppedCount: number;
};

function buildRetrievalSearchText(record: VoiceRecord | RecordListItem): string {
  const parts = [
    record.title ?? '',
    record.summary ?? '',
    'transcript' in record ? (record.transcript ?? '') : '',
    ...(record.tags ?? []),
    ...(record.keyPhrases ?? []),
    ...(record.tasks ?? []).map((task) => task.text),
  ];
  return parts.join(' ').toLowerCase();
}

export function getInboxAskQueryWords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 2 && !STOPWORDS.has(word));
}

function matchesQueryWords(text: string, words: string[]): boolean {
  if (words.length === 0) return false;
  return words.every((word) => text.includes(word));
}

function getLexicalScore(
  record: VoiceRecord | RecordListItem,
  query: string,
  searchText: string,
): number {
  const q = query.toLowerCase();
  let score = 0;

  if (record.title.toLowerCase().includes(q)) score += RELEVANCE.title;
  if (record.summary?.toLowerCase().includes(q)) score += RELEVANCE.summary;
  if ('transcript' in record && record.transcript?.toLowerCase().includes(q)) {
    score += RELEVANCE.transcript;
  }
  if (record.tags?.some((tag) => tag.toLowerCase().includes(q))) score += RELEVANCE.tags;
  if (record.keyPhrases?.some((phrase) => phrase.toLowerCase().includes(q))) {
    score += RELEVANCE.keyPhrases;
  }
  if (record.tasks?.some((task) => task.text.toLowerCase().includes(q))) score += RELEVANCE.tasks;

  if (score > 0) return score;

  const words = getInboxAskQueryWords(query);
  for (const word of words) {
    if (searchText.includes(word)) score += 2;
  }
  return score;
}

function matchesLexicalQuery(
  record: VoiceRecord | RecordListItem,
  query: string,
  searchText: string,
): boolean {
  const words = getInboxAskQueryWords(query);
  if (words.length > 0 && matchesQueryWords(searchText, words)) return true;
  const q = query.toLowerCase();
  return (
    record.title.toLowerCase().includes(q) ||
    !!record.summary?.toLowerCase().includes(q) ||
    !!('transcript' in record && record.transcript?.toLowerCase().includes(q)) ||
    !!record.tags?.some((tag) => tag.toLowerCase().includes(q)) ||
    !!record.keyPhrases?.some((phrase) => phrase.toLowerCase().includes(q)) ||
    !!record.tasks?.some((task) => task.text.toLowerCase().includes(q))
  );
}

export function filterInboxAskCorpusRecords(
  records: Array<VoiceRecord | RecordListItem>,
  scope?: InboxAskRetrievalScope,
): Array<VoiceRecord | RecordListItem> {
  return records.filter((record) => {
    if (!scope?.includeArchived && record.status === 'archived') return false;
    if (scope?.folderId) {
      if ((record.folderId ?? null) !== scope.folderId) return false;
    }
    if (scope?.fromIso && dayjs(record.createdAt).isBefore(dayjs(scope.fromIso))) return false;
    if (scope?.toIso && dayjs(record.createdAt).isAfter(dayjs(scope.toIso))) return false;
    return true;
  });
}

export function countInboxAskCorpusRecords(
  records: Array<VoiceRecord | RecordListItem>,
  scope?: InboxAskRetrievalScope,
): number {
  return filterInboxAskCorpusRecords(records, scope).length;
}

function toCorpusCandidate(
  record: VoiceRecord | RecordListItem,
  score: number,
): CorpusNoteCandidate {
  return {
    recordId: record.id,
    score,
    title: record.title,
    summary: record.summary,
    keyPhrases: record.keyPhrases,
    tasks: record.tasks,
    transcript: 'transcript' in record ? record.transcript : undefined,
    createdAt: record.createdAt,
  };
}

function hasInboxAskPackableContent(record: VoiceRecord | RecordListItem): boolean {
  if (record.summary?.trim()) return true;
  if ('transcript' in record && record.transcript?.trim()) return true;
  if (record.keyPhrases?.some((phrase) => phrase.trim())) return true;
  if (record.tasks?.some((task) => task.text.trim())) return true;
  return false;
}

export function countInboxAskSearchableRecords(
  records: Array<VoiceRecord | RecordListItem>,
  scope?: InboxAskRetrievalScope,
): number {
  return filterInboxAskCorpusRecords(records, scope).filter(hasInboxAskPackableContent).length;
}

function rankLexicalOnly(
  records: Array<VoiceRecord | RecordListItem>,
  query: string,
): ScoredRecord[] {
  const searchTextById = new Map(
    records.map((record) => [record.id, buildRetrievalSearchText(record)]),
  );

  return records
    .filter((record) =>
      matchesLexicalQuery(
        record,
        query,
        searchTextById.get(record.id) ?? buildRetrievalSearchText(record),
      ),
    )
    .map((record) => ({
      record,
      score: getLexicalScore(
        record,
        query,
        searchTextById.get(record.id) ?? buildRetrievalSearchText(record),
      ),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return dayjs(b.record.createdAt).valueOf() - dayjs(a.record.createdAt).valueOf();
    });
}

function rankHybrid(
  records: Array<VoiceRecord | RecordListItem>,
  query: string,
  queryEmbedding: number[],
  embeddingCentroid: number[],
  embeddingsById: Map<string, number[]>,
): ScoredRecord[] {
  const maxLexical =
    RELEVANCE.title +
    RELEVANCE.summary +
    RELEVANCE.transcript +
    RELEVANCE.tags +
    RELEVANCE.tasks +
    RELEVANCE.keyPhrases;

  return records
    .map((record) => {
      const searchText = buildRetrievalSearchText(record);
      const lexicalRaw = getLexicalScore(record, query, searchText);
      const lexicalNorm = Math.min(lexicalRaw / maxLexical, 1);
      const embedding = embeddingsById.get(record.id);
      const semanticScore = embedding
        ? centeredCosineSimilarity(queryEmbedding, embedding, embeddingCentroid)
        : 0;
      const hybridScore =
        SEMANTIC_SCORE_WEIGHT * semanticScore + LEXICAL_SCORE_WEIGHT * lexicalNorm;
      return { record, score: hybridScore, lexicalRaw, semanticScore };
    })
    .filter(({ score, lexicalRaw, semanticScore }) => {
      if (lexicalRaw > 0) return score >= MIN_HYBRID_SCORE;
      return semanticScore >= MIN_SEMANTIC_SCORE_WITHOUT_LEXICAL;
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return dayjs(b.record.createdAt).valueOf() - dayjs(a.record.createdAt).valueOf();
    })
    .map(({ record, score }) => ({ record, score }));
}

export function canUseInboxAskQueryEmbedding(question: string): boolean {
  const trimmed = question.trim();
  const words = getInboxAskQueryWords(trimmed);
  if (trimmed.length < 3 || words.length === 0) return false;
  if (words.length >= 2) return true;
  return words[0]!.length >= 4;
}

export async function prepareInboxAskQueryEmbedding(question: string): Promise<number[] | null> {
  const trimmed = question.trim();
  if (!isEmbeddingAvailable() || !canUseInboxAskQueryEmbedding(trimmed)) {
    return null;
  }

  const lang = getEmbeddingLanguage();
  await prepareEmbeddingModel(lang);
  return generateEmbedding(trimmed, lang);
}

export function retrieveNotesForInboxAsk(params: {
  question: string;
  records: Array<VoiceRecord | RecordListItem>;
  embeddingsById: Map<string, number[]>;
  queryEmbedding?: number[] | null;
  scope?: InboxAskRetrievalScope;
}): InboxAskRetrievalResult {
  const corpus = filterInboxAskCorpusRecords(params.records, params.scope);
  const query = params.question.trim();

  const embeddings = corpus
    .map((record) => params.embeddingsById.get(record.id))
    .filter((embedding): embedding is number[] => Boolean(embedding));

  const canUseHybrid =
    Boolean(params.queryEmbedding?.length) &&
    embeddings.length > 0 &&
    corpus.some((record) => params.embeddingsById.has(record.id));

  let ranked: ScoredRecord[];
  let retrievalMode: InboxAskRetrievalMode;

  if (canUseHybrid && params.queryEmbedding) {
    retrievalMode = 'hybrid';
    ranked = rankHybrid(
      corpus,
      query,
      params.queryEmbedding,
      computeCentroid(embeddings),
      params.embeddingsById,
    );
  } else {
    retrievalMode = 'lexical';
    ranked = rankLexicalOnly(corpus, query);
  }

  const topCandidates = ranked
    .slice(0, INBOX_ASK_RETRIEVAL_TOP_K)
    .map(({ record, score }) => toCorpusCandidate(record, score));

  const packResult = packCorpusNotesForPrompt(topCandidates, {
    queryTerms: getInboxAskQueryWords(query),
  });

  return {
    candidates: topCandidates,
    packResult,
    retrievalMode,
    totalCorpusCount: corpus.length,
    notes: packResult.notes,
    totalChars: packResult.totalChars,
    droppedCount: packResult.droppedCount,
  };
}
