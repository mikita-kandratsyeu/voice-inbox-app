import { useMemo } from 'react';

import { useRecordStore } from '@/entities/record';

import {
  buildSimilarityContext,
  MIN_HYBRID_SCORE,
  MIN_LEXICAL_ONLY_SCORE,
  rankSimilarRecords,
} from '../lib/computeRecordSimilarity';

export function useRelatedNotes(recordId: string, limit = 5) {
  const records = useRecordStore((s) => s.records);

  return useMemo(() => {
    const current = records.find((r) => r.id === recordId);
    if (!current) return [];

    const context = buildSimilarityContext(records);
    const minScore = context.useEmbeddings ? MIN_HYBRID_SCORE : MIN_LEXICAL_ONLY_SCORE;

    return rankSimilarRecords(current, records, context, limit, minScore);
  }, [recordId, records, limit]);
}
