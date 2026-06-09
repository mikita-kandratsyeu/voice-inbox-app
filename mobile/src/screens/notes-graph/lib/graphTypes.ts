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

export type GraphFilters = {
  folderId: string | null;
  tags: string[];
  showTasks: boolean;
  edgeVisibility: GraphEdgeVisibility;
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

export const RECORD_NODE_WIDTH = 158;
export const RECORD_NODE_HEIGHT = 82;
export const TASK_NODE_WIDTH = 136;
export const TASK_NODE_HEIGHT = 42;

export function recordNodeId(recordId: string): string {
  return `record:${recordId}`;
}

export function taskNodeId(recordId: string, taskId: string): string {
  return `task:${recordId}:${taskId}`;
}
