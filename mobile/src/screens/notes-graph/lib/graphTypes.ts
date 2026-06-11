import type { TaskItem, VoiceRecord } from '@/entities/record';

export type GraphNodeKind = 'record' | 'task';

export type GraphEdgeKind = 'contains' | 'similar' | 'sharedTag' | 'sameFolder';

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
};

export type GraphEdgeVisibility = {
  similar: boolean;
  sharedTag: boolean;
  sameFolder: boolean;
  contains: boolean;
};

export const GRAPH_LAYOUT_MODES = ['cluster', 'force', 'circular'] as const;

export type GraphLayoutMode = (typeof GRAPH_LAYOUT_MODES)[number];

export type GraphFilters = {
  folderId: string | null;
  tags: string[];
  showTasks: boolean;
  edgeVisibility: GraphEdgeVisibility;
  layoutMode: GraphLayoutMode;
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
};

export const DEFAULT_GRAPH_LAYOUT_MODE: GraphLayoutMode = 'cluster';

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
