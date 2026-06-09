import type { VoiceRecord } from '@/entities/record';

import type { GraphFilters } from './graphTypes';
import { warmNotesGraphLayoutWithFilters } from './notesGraphLayoutCache';
import { prefetchNotesGraphScreenBody } from './prefetchNotesGraphScreenBody';

/** Prefetch JS bundle + start layout build while the map screen loader is visible. */
export function beginNotesGraphScreenWarm(
  records: VoiceRecord[],
  filters: GraphFilters,
  windowWidth: number,
  windowHeight: number,
  simplifyOverride: boolean | null = null,
): void {
  void prefetchNotesGraphScreenBody();

  if (records.length === 0) return;

  setTimeout(() => {
    warmNotesGraphLayoutWithFilters(
      records,
      filters,
      simplifyOverride,
      windowWidth,
      windowHeight,
    );
  }, 0);
}
