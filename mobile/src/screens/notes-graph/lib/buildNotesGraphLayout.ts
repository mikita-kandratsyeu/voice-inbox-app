import type { VoiceRecord } from '@/entities/record';

import { computeLayoutAsync } from './asyncLayoutComputation';
import { buildGraphModel } from './buildGraphModel';
import { buildGraphSearchIndex, type GraphSearchIndexEntry } from './graphSearch';
import { clearStaleSessionPositions, getSessionNodePositions } from './graphSessionLayout';
import { resolveGraphFilters } from './graphSimplifyMode';
import type { GraphEdge, GraphFilters, GraphModel, GraphNode } from './graphTypes';
import { type LayoutResult, runForceLayout } from './runForceLayout';

export type NotesGraphLayoutResult = {
  layoutNodes: GraphNode[];
  layoutEdges: GraphEdge[];
  graphSize: { width: number; height: number };
  recordCount: number;
  searchIndex: GraphSearchIndexEntry[];
};

export function buildNotesGraphLayoutFromModel(
  model: GraphModel,
  layout: LayoutResult,
): NotesGraphLayoutResult {
  return {
    layoutNodes: layout.nodes,
    layoutEdges: model.edges,
    graphSize: { width: layout.width, height: layout.height },
    recordCount: model.recordCount,
    searchIndex: buildGraphSearchIndex(layout.nodes),
  };
}

function buildNotesGraphLayoutSync(
  records: VoiceRecord[],
  filters: GraphFilters,
  filteredRecordCount: number,
  simplifyOverride: boolean | null,
  windowWidth: number,
  windowHeight: number,
): NotesGraphLayoutResult {
  const effective = resolveGraphFilters(filters, filteredRecordCount, simplifyOverride);
  const model = buildGraphModel(records, effective);
  const validIds = new Set(model.nodes.map((node) => node.id));
  clearStaleSessionPositions(validIds);
  const sessionPositions = getSessionNodePositions();
  const layoutViewportWidth = Math.max(windowWidth, 390);
  const layoutViewportHeight = Math.max(windowHeight * 0.72, 640);
  const layout = runForceLayout(
    model.nodes,
    model.edges,
    layoutViewportWidth,
    layoutViewportHeight,
    sessionPositions,
    effective.layoutMode,
  );

  return buildNotesGraphLayoutFromModel(model, layout);
}

export function buildNotesGraphLayout(
  records: VoiceRecord[],
  filters: GraphFilters,
  filteredRecordCount: number,
  simplifyOverride: boolean | null,
  windowWidth: number,
  windowHeight: number,
): NotesGraphLayoutResult {
  return buildNotesGraphLayoutSync(
    records,
    filters,
    filteredRecordCount,
    simplifyOverride,
    windowWidth,
    windowHeight,
  );
}

export function buildNotesGraphLayoutAsync(
  records: VoiceRecord[],
  filters: GraphFilters,
  filteredRecordCount: number,
  simplifyOverride: boolean | null,
  windowWidth: number,
  windowHeight: number,
): Promise<NotesGraphLayoutResult> {
  return computeLayoutAsync(
    records,
    filters,
    filteredRecordCount,
    simplifyOverride,
    windowWidth,
    windowHeight,
  );
}
