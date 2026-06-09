import type { VoiceRecord } from '@/entities/record';

import { countFilteredGraphRecords } from './buildGraphModel';
import type { GraphFilters } from './graphTypes';

function buildRecordsRevision(records: VoiceRecord[]): string {
  if (records.length === 0) return '0';
  return `${records.length}:${records
    .map((record) => record.id)
    .sort()
    .join(',')}`;
}

/** Stable DB key for saved layouts (filters + library revision, no viewport). */
export function buildNotesGraphPersistKey(
  records: VoiceRecord[],
  filters: GraphFilters,
  simplifyOverride: boolean | null,
): string {
  const filteredCount = countFilteredGraphRecords(records, filters);
  const tagKey = filters.tags.slice().sort().join('|');
  const edgeKey = Object.entries(filters.edgeVisibility)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, visible]) => `${kind}:${visible ? 1 : 0}`)
    .join(',');
  return [
    buildRecordsRevision(records),
    filters.folderId ?? '',
    tagKey,
    filters.showTasks ? 1 : 0,
    edgeKey,
    filters.layoutMode,
    simplifyOverride === null ? 'auto' : simplifyOverride ? 1 : 0,
    filteredCount,
  ].join(';');
}
