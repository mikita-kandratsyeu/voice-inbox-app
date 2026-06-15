import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useRecordStore } from '@/entities/record';

import { countRecordLinkNeighbors } from '../lib/countRecordLinkNeighbors';

export function useRecordLinkNeighborCount(
  recordId: string,
  linkedRecordIds: readonly string[] | null | undefined,
): number {
  const records = useRecordStore(useShallow((s) => s.records));

  return useMemo(
    () => countRecordLinkNeighbors(recordId, linkedRecordIds, records),
    [linkedRecordIds, recordId, records],
  );
}
