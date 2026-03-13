import { useMemo } from 'react';
import { Platform } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import { cosineSimilarity, isEmbeddingAvailable } from '@/shared/lib/embeddings';

const MIN_HYBRID_SCORE = 0.45;
const EMBEDDING_WEIGHT = 0.5;
const LEXICAL_WEIGHT = 0.5;

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

function getLexicalScore(current: VoiceRecord, record: VoiceRecord): number {
  const tagsA = new Set((current.tags ?? []).map((t) => t.toLowerCase()));
  const keyPhrasesA = current.keyPhrases ?? [];
  const tagsB = new Set((record.tags ?? []).map((t) => t.toLowerCase()));
  const keyPhrasesB = record.keyPhrases ?? [];

  const tagScore = jaccardSimilarity(tagsA, tagsB);
  const phraseScore =
    keyPhrasesA.length > 0 || keyPhrasesB.length > 0 ? phraseOverlap(keyPhrasesA, keyPhrasesB) : 0;

  const summaryScore =
    current.summary && record.summary ? textOverlap(current.summary, record.summary, 800) : 0;
  const transcriptScore =
    current.transcript && record.transcript
      ? textOverlap(current.transcript, record.transcript)
      : 0;
  const titleScore =
    current.title && record.title ? textOverlap(current.title, record.title, 100) : 0;

  const lexicalScore = summaryScore * 0.35 + transcriptScore * 0.4 + titleScore * 0.25;
  const tagPhraseScore =
    keyPhrasesA.length > 0 || keyPhrasesB.length > 0
      ? 0.6 * tagScore + 0.4 * phraseScore
      : tagScore;

  return tagPhraseScore > 0 || lexicalScore > 0 ? Math.max(tagPhraseScore, lexicalScore) : 0;
}

export function useRelatedNotes(recordId: string, limit = 5): VoiceRecord[] {
  const records = useRecordStore((s) => s.records);

  return useMemo(() => {
    const current = records.find((r) => r.id === recordId);
    if (!current) return [];

    const useEmbeddings =
      Platform.OS === 'ios' &&
      isEmbeddingAvailable() &&
      current.embedding &&
      records.some((r) => r.id !== recordId && r.embedding);

    if (useEmbeddings) {
      const scored = records
        .filter((r) => r.id !== recordId && r.embedding)
        .map((record) => {
          const embeddingScore = cosineSimilarity(current.embedding!, record.embedding!);
          const lexicalScore = getLexicalScore(current, record);
          const hybridScore = EMBEDDING_WEIGHT * embeddingScore + LEXICAL_WEIGHT * lexicalScore;
          return { record, score: hybridScore };
        })
        .filter(({ score }) => score >= MIN_HYBRID_SCORE)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ record }) => record);

      return scored;
    }

    const scored = records
      .filter((r) => r.id !== recordId)
      .map((record) => {
        const score = getLexicalScore(current, record);
        return { record, score };
      })
      .filter(({ score }) => score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ record }) => record);

    return scored;
  }, [recordId, records, limit]);
}
