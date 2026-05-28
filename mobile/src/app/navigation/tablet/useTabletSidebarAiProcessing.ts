import { useMemo } from 'react';

import { useRecordStore } from '@/entities/record';

import {
  collectTabletSidebarAiProcessing,
  type TabletSidebarAiProcessing,
} from './collectTabletSidebarAiProcessing';

export function useTabletSidebarAiProcessing(): TabletSidebarAiProcessing {
  const records = useRecordStore((s) => s.records);

  return useMemo(() => collectTabletSidebarAiProcessing(records), [records]);
}

export type { TabletSidebarAiProcessing };
