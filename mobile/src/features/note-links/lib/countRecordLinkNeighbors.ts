import type { VoiceRecord } from '@/entities/record';

import { buildBacklinkRecordIds } from './buildBacklinksForRecord';

type LinkSource = Pick<VoiceRecord, 'id' | 'linkedRecordIds'>;

/** Unique outgoing + incoming manual links for a note (for inbox card meta). */
export function countRecordLinkNeighbors(
  recordId: string,
  linkedRecordIds: readonly string[] | null | undefined,
  records: readonly LinkSource[],
): number {
  const neighbors = new Set<string>();

  for (const id of linkedRecordIds ?? []) {
    if (id && id !== recordId) {
      neighbors.add(id);
    }
  }

  for (const id of buildBacklinkRecordIds(recordId, records)) {
    neighbors.add(id);
  }

  return neighbors.size;
}
