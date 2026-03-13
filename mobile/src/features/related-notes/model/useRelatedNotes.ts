import { useMemo } from 'react';
import { Platform } from 'react-native';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';
import {
  centeredCosineSimilarity,
  computeCentroid,
  isEmbeddingAvailable,
} from '@/shared/lib/embeddings';

const MIN_HYBRID_SCORE = 0.35;
const MIN_LEXICAL_ONLY_SCORE = 0.08;
const EMBEDDING_WEIGHT = 0.65;
const LEXICAL_WEIGHT = 0.35;

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
      const allEmbeddings = records.filter((r) => r.embedding).map((r) => r.embedding as number[]);
      const centroid = computeCentroid(allEmbeddings);

      const scored = records
        .filter((r) => r.id !== recordId && r.embedding)
        .map((record) => {
          const embeddingScore = centeredCosineSimilarity(
            current.embedding!,
            record.embedding!,
            centroid,
          );
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
      .filter(({ score }) => score > MIN_LEXICAL_ONLY_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ record }) => record);

    return scored;
  }, [recordId, records, limit]);
}
