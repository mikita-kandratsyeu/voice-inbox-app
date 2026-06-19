import type { VoiceRecord } from '@/entities/record';

import { AsyncLayoutComputer } from './asyncLayoutComputation';
import { buildNotesGraphLayout, type NotesGraphLayoutResult } from './buildNotesGraphLayout';
import { countFilteredGraphRecords } from './buildGraphModel';
import {
  DEFAULT_EDGE_VISIBILITY,
  DEFAULT_GRAPH_LAYOUT_MODE,
  DEFAULT_NODE_DISPLAY_MODE,
  type GraphFilters,
} from './graphTypes';

export const DEFAULT_NOTES_GRAPH_FILTERS: GraphFilters = {
  folderIds: [],
  tags: [],
  showTasks: true,
  showCompletedTasks: true,
  showArchived: false,
  edgeVisibility: { ...DEFAULT_EDGE_VISIBILITY },
  layoutMode: DEFAULT_GRAPH_LAYOUT_MODE,
  nodeDisplayMode: DEFAULT_NODE_DISPLAY_MODE,
};

function buildRecordsRevision(records: VoiceRecord[]): string {
  if (records.length === 0) return '0';
  return `${records.length}:${records
    .map((record) => record.id)
    .sort()
    .join(',')}`;
}

export function buildNotesGraphLayoutCacheKey(
  records: VoiceRecord[],
  filters: GraphFilters,
  simplifyOverride: boolean | null,
  windowWidth: number,
  windowHeight: number,
): string {
  const filteredCount = countFilteredGraphRecords(records, filters);
  const folderKey = filters.folderIds.slice().sort().join('|');
  const tagKey = filters.tags.slice().sort().join('|');
  const edgeKey = Object.entries(filters.edgeVisibility)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, visible]) => `${kind}:${visible ? 1 : 0}`)
    .join(',');
  return [
    buildRecordsRevision(records),
    folderKey,
    tagKey,
    filters.showTasks ? 1 : 0,
    filters.showCompletedTasks ? 1 : 0,
    filters.showArchived ? 1 : 0,
    edgeKey,
    simplifyOverride === null ? 'auto' : simplifyOverride ? 1 : 0,
    filters.layoutMode,
    Math.round(windowWidth),
    Math.round(windowHeight),
    filteredCount,
  ].join(';');
}

let cachedEntry: { key: string; result: NotesGraphLayoutResult } | null = null;
let pendingBuild: { key: string; promise: Promise<NotesGraphLayoutResult> } | null = null;
let warmDebounceId: ReturnType<typeof setTimeout> | null = null;
let cacheGeneration = 0;
const layoutComputer = new AsyncLayoutComputer();

export function clearNotesGraphLayoutCache(): void {
  cacheGeneration += 1;
  layoutComputer.cancel();
  cachedEntry = null;
  pendingBuild = null;
  if (warmDebounceId) {
    clearTimeout(warmDebounceId);
    warmDebounceId = null;
  }
}

export function getCachedNotesGraphLayout(key: string): NotesGraphLayoutResult | null {
  return cachedEntry?.key === key ? cachedEntry.result : null;
}

export function buildAndCacheNotesGraphLayout(
  records: VoiceRecord[],
  filters: GraphFilters,
  filteredRecordCount: number,
  simplifyOverride: boolean | null,
  windowWidth: number,
  windowHeight: number,
): NotesGraphLayoutResult {
  const key = buildNotesGraphLayoutCacheKey(
    records,
    filters,
    simplifyOverride,
    windowWidth,
    windowHeight,
  );
  const cached = getCachedNotesGraphLayout(key);
  if (cached) return cached;

  const result = buildNotesGraphLayout(
    records,
    filters,
    filteredRecordCount,
    simplifyOverride,
    windowWidth,
    windowHeight,
  );
  cachedEntry = { key, result };
  return result;
}

export async function buildAndCacheNotesGraphLayoutAsync(
  records: VoiceRecord[],
  filters: GraphFilters,
  filteredRecordCount: number,
  simplifyOverride: boolean | null,
  windowWidth: number,
  windowHeight: number,
): Promise<NotesGraphLayoutResult> {
  const key = buildNotesGraphLayoutCacheKey(
    records,
    filters,
    simplifyOverride,
    windowWidth,
    windowHeight,
  );
  const cached = getCachedNotesGraphLayout(key);
  if (cached) return cached;

  if (pendingBuild?.key === key) {
    return pendingBuild.promise;
  }

  const generation = cacheGeneration;
  const promise = layoutComputer
    .compute(
      records,
      filters,
      filteredRecordCount,
      simplifyOverride,
      windowWidth,
      windowHeight,
    )
    .then((result) => {
      if (generation === cacheGeneration) {
        cachedEntry = { key, result };
      }
      if (pendingBuild?.key === key) {
        pendingBuild = null;
      }
      return result;
    })
    .catch((error) => {
      if (pendingBuild?.key === key) {
        pendingBuild = null;
      }
      throw error;
    });

  pendingBuild = { key, promise };
  return promise;
}

function scheduleNotesGraphLayoutWarm(
  records: VoiceRecord[],
  filters: GraphFilters,
  simplifyOverride: boolean | null,
  windowWidth: number,
  windowHeight: number,
): void {
  const filteredRecordCount = countFilteredGraphRecords(records, filters);
  const key = buildNotesGraphLayoutCacheKey(
    records,
    filters,
    simplifyOverride,
    windowWidth,
    windowHeight,
  );

  if (cachedEntry?.key === key || pendingBuild?.key === key) return;

  setTimeout(() => {
    void buildAndCacheNotesGraphLayoutAsync(
      records,
      filters,
      filteredRecordCount,
      simplifyOverride,
      windowWidth,
      windowHeight,
    );
  }, 0);
}

export function warmNotesGraphLayoutWithFilters(
  records: VoiceRecord[],
  filters: GraphFilters,
  simplifyOverride: boolean | null,
  windowWidth: number,
  windowHeight: number,
): void {
  scheduleNotesGraphLayoutWarm(records, filters, simplifyOverride, windowWidth, windowHeight);
}

export function warmNotesGraphLayoutImmediate(
  records: VoiceRecord[],
  windowWidth: number,
  windowHeight: number,
): void {
  scheduleNotesGraphLayoutWarm(
    records,
    DEFAULT_NOTES_GRAPH_FILTERS,
    null,
    windowWidth,
    windowHeight,
  );
}

export function warmNotesGraphLayoutDebounced(
  records: VoiceRecord[],
  windowWidth: number,
  windowHeight: number,
  delayMs = 400,
): void {
  if (warmDebounceId) clearTimeout(warmDebounceId);
  warmDebounceId = setTimeout(() => {
    warmDebounceId = null;
    scheduleNotesGraphLayoutWarm(
      records,
      DEFAULT_NOTES_GRAPH_FILTERS,
      null,
      windowWidth,
      windowHeight,
    );
  }, delayMs);
}

export async function awaitPendingNotesGraphLayout(
  key: string,
): Promise<NotesGraphLayoutResult | null> {
  if (cachedEntry?.key === key) return cachedEntry.result;
  if (pendingBuild?.key === key) return pendingBuild.promise;
  return null;
}
