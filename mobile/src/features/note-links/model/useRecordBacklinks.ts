import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useRecordStore } from '@/entities/record';

import { buildBacklinkRecordIds } from '../lib/buildBacklinksForRecord';

export function useRecordBacklinks(recordId: string): string[] {
  const records = useRecordStore(useShallow((s) => s.records));

  return useMemo(() => buildBacklinkRecordIds(recordId, records), [recordId, records]);
}
