import type { VoiceRecord } from '@/entities/record';
import {
  centeredCosineSimilarity,
  computeCentroid,
  isEmbeddingAvailable,
} from '@/shared/lib/embeddings';
import { IS_IOS } from '@/shared/lib/platform';

export const MIN_HYBRID_SCORE = 0.35;
export const MIN_LEXICAL_ONLY_SCORE = 0.08;
export const EMBEDDING_WEIGHT = 0.65;
export const LEXICAL_WEIGHT = 0.35;

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function phraseOverlap(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a.map((s) => s.toLowerCase().trim()));
  const setB = new Set(b.map((s) => s.toLowerCase().trim()));
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const maxSize = Math.max(setA.size, setB.size, 1);
  return intersection / maxSize;
}

function textOverlap(textA: string, textB: string, maxChars = 1500): number {
  if (!textA.trim() || !textB.trim()) return 0;
  const a = tokenize(textA.slice(0, maxChars));
  const b = tokenize(textB.slice(0, maxChars));
  return jaccardSimilarity(a, b);
}

export function getLexicalScore(current: VoiceRecord, record: VoiceRecord): number {
  const tagsA = new Set((current.tags ?? []).map((t) => t.toLowerCase()));
  const keyPhrasesA = current.keyPhrases ?? [];
  const tagsB = new Set((record.tags ?? []).map((t) => t.toLowerCase()));
  const keyPhrasesB = record.keyPhrases ?? [];

  const tagScore = jaccardSimilarity(tagsA, tagsB);
  const phraseScore =
    keyPhrasesA.length > 0 || keyPhrasesB.length > 0 ? phraseOverlap(keyPhrasesA, keyPhrasesB) : 0;

  const titleScore =
    current.title && record.title ? textOverlap(current.title, record.title, 100) : 0;
  const summaryScore =
    current.summary && record.summary ? textOverlap(current.summary, record.summary, 800) : 0;
  const transcriptScore =
    current.transcript && record.transcript
      ? textOverlap(current.transcript, record.transcript)
      : 0;

  const textScore = titleScore * 0.35 + summaryScore * 0.45 + transcriptScore * 0.2;

  const hasTagsOrPhrases =
    tagsA.size > 0 || tagsB.size > 0 || keyPhrasesA.length > 0 || keyPhrasesB.length > 0;
  const tagPhraseScore = hasTagsOrPhrases ? tagScore * 0.5 + phraseScore * 0.5 : 0;

  if (hasTagsOrPhrases && tagPhraseScore > 0) {
    return tagPhraseScore * 0.5 + textScore * 0.5;
  }
  return textScore;
}

export type SimilarityContext = {
  useEmbeddings: boolean;
  centroid: number[] | null;
};

export function buildSimilarityContext(records: VoiceRecord[]): SimilarityContext {
  const useEmbeddings =
    IS_IOS &&
    isEmbeddingAvailable() &&
    records.some((r) => r.embedding) &&
    records.filter((r) => r.embedding).length >= 2;

  const centroid = useEmbeddings
    ? computeCentroid(records.filter((r) => r.embedding).map((r) => r.embedding as number[]))
    : null;

  return { useEmbeddings, centroid };
}

export function computeRecordSimilarity(
  current: VoiceRecord,
  other: VoiceRecord,
  context: SimilarityContext,
): number {
  if (current.id === other.id) return 0;

  if (context.useEmbeddings && context.centroid && current.embedding && other.embedding) {
    const embeddingScore = centeredCosineSimilarity(
      current.embedding,
      other.embedding,
      context.centroid,
    );
    const lexicalScore = getLexicalScore(current, other);
    return EMBEDDING_WEIGHT * embeddingScore + LEXICAL_WEIGHT * lexicalScore;
  }

  return getLexicalScore(current, other);
}

export function recordsShareTag(a: VoiceRecord, b: VoiceRecord): boolean {
  const tagsA = new Set((a.tags ?? []).map((t) => t.toLowerCase()));
  for (const tag of b.tags ?? []) {
    if (tagsA.has(tag.toLowerCase())) return true;
  }
  return false;
}

export function shouldPrefilterSimilarityPair(a: VoiceRecord, b: VoiceRecord): boolean {
  if (a.folderId && b.folderId && a.folderId === b.folderId) return true;
  if (recordsShareTag(a, b)) return true;
  if (a.embedding && b.embedding) return true;
  return getLexicalScore(a, b) > MIN_LEXICAL_ONLY_SCORE * 0.5;
}

export function rankSimilarRecords(
  current: VoiceRecord,
  records: VoiceRecord[],
  context: SimilarityContext,
  limit: number,
  minScore: number,
): VoiceRecord[] {
  return records
    .filter((r) => r.id !== current.id)
    .map((record) => ({
      record,
      score: computeRecordSimilarity(current, record, context),
    }))
    .filter(({ score }) => score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ record }) => record);
}
