import { useMemo } from 'react';

import { useRecordStore } from '@/entities/record';

import {
  buildSimilarityContext,
  MIN_HYBRID_SCORE,
  MIN_LEXICAL_ONLY_SCORE,
  rankSimilarRecords,
} from '../lib/computeRecordSimilarity';

export function useRelatedNotes(
  recordId: string,
  limit = 5,
  excludeRecordIds: readonly string[] = [],
) {
  const records = useRecordStore((s) => s.records);

  return useMemo(() => {
    const current = records.find((r) => r.id === recordId);
    if (!current) return [];

    const context = buildSimilarityContext(records);
    const minScore = context.useEmbeddings ? MIN_HYBRID_SCORE : MIN_LEXICAL_ONLY_SCORE;
    const exclude = new Set([recordId, ...excludeRecordIds]);

    return rankSimilarRecords(current, records, context, limit * 4, minScore)
      .filter((record) => !exclude.has(record.id))
      .slice(0, limit);
  }, [excludeRecordIds, limit, recordId, records]);
}
