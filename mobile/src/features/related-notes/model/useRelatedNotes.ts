import { useMemo } from 'react';

import type { VoiceRecord } from '@/entities/record';
import { useRecordStore } from '@/entities/record';

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

export function useRelatedNotes(recordId: string, limit = 5): VoiceRecord[] {
  const records = useRecordStore((s) => s.records);

  return useMemo(() => {
    const current = records.find((r) => r.id === recordId);
    if (!current) return [];

    const tagsA = new Set((current.tags ?? []).map((t) => t.toLowerCase()));
    const keyPhrasesA = current.keyPhrases ?? [];

    const scored = records
      .filter((r) => r.id !== recordId)
      .map((record) => {
        const tagsB = new Set((record.tags ?? []).map((t) => t.toLowerCase()));
        const keyPhrasesB = record.keyPhrases ?? [];

        const tagScore = jaccardSimilarity(tagsA, tagsB);
        const phraseScore =
          keyPhrasesA.length > 0 || keyPhrasesB.length > 0
            ? phraseOverlap(keyPhrasesA, keyPhrasesB)
            : 0;

        const weight = keyPhrasesA.length > 0 || keyPhrasesB.length > 0 ? 0.6 : 1;
        const score = weight * tagScore + (1 - weight) * (phraseScore || tagScore);

        return { record, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ record }) => record);

    return scored;
  }, [recordId, records, limit]);
}
