import type { TaskItem, VoiceRecord } from '@/entities/record';

export type GraphNodeKind = 'record' | 'task';

export type GraphEdgeKind = 'contains' | 'similar' | 'sharedTag' | 'sameFolder' | 'linked';

export type GraphNodeDisplayMode = 'cards' | 'dots';

export type GraphNode = {
  id: string;
  kind: GraphNodeKind;
  x: number;
  y: number;
  /** Lowercase title or task text — precomputed during graph build for search. */
  searchText: string;
  record?: VoiceRecord;
  task?: TaskItem;
  parentRecordId?: string;
};

export type GraphEdge = {
  id: string;
  kind: GraphEdgeKind;
  sourceId: string;
  targetId: string;
  label?: string;
  /** Layout-only multiplier (e.g. similar-score strength for ForceAtlas2). */
  weight?: number;
};

export type GraphEdgeVisibility = {
  similar: boolean;
  sharedTag: boolean;
  sameFolder: boolean;
  contains: boolean;
  linked: boolean;
};

export const GRAPH_LAYOUT_MODES = ['force', 'cluster', 'circular'] as const;

export type GraphLayoutMode = (typeof GRAPH_LAYOUT_MODES)[number];

export type GraphFilters = {
  folderIds: string[];
  tags: string[];
  showTasks: boolean;
  showCompletedTasks: boolean;
  showArchived: boolean;
  edgeVisibility: GraphEdgeVisibility;
  layoutMode: GraphLayoutMode;
  nodeDisplayMode: GraphNodeDisplayMode;
};

export type GraphModel = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  recordCount: number;
};

export const DEFAULT_EDGE_VISIBILITY: GraphEdgeVisibility = {
  similar: true,
  sharedTag: true,
  sameFolder: true,
  contains: true,
  linked: true,
};

export const DEFAULT_GRAPH_LAYOUT_MODE: GraphLayoutMode = 'force';

export const DEFAULT_NODE_DISPLAY_MODE: GraphNodeDisplayMode = 'cards';

export function isGraphLayoutMode(value: string): value is GraphLayoutMode {
  return (GRAPH_LAYOUT_MODES as readonly string[]).includes(value);
}

export const RECORD_NODE_WIDTH = 164;
export const RECORD_NODE_HEIGHT = 86;
export const TASK_NODE_WIDTH = 142;
export const TASK_NODE_HEIGHT = 44;

export function recordNodeId(recordId: string): string {
  return `record:${recordId}`;
}

export function taskNodeId(recordId: string, taskId: string): string {
  return `task:${recordId}:${taskId}`;
}
