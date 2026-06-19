import type { GraphEdgeKind, GraphLayoutMode, GraphNodeKind } from './graphTypes';

/** Serializable node stub — no VoiceRecord / TaskItem payloads. */
export type LayoutWorkerNode = {
  id: string;
  kind: GraphNodeKind;
  x: number;
  y: number;
};

export type LayoutWorkerEdge = {
  id: string;
  kind: GraphEdgeKind;
  sourceId: string;
  targetId: string;
  weight?: number;
};

export type LayoutWorkerRequest = {
  nodes: LayoutWorkerNode[];
  edges: LayoutWorkerEdge[];
  viewportWidth: number;
  viewportHeight: number;
  layoutMode: GraphLayoutMode;
  fixedPositions: Record<string, { x: number; y: number }>;
};

export type LayoutWorkerNodePosition = {
  id: string;
  x: number;
  y: number;
};

export type LayoutWorkerResponse = {
  nodes: LayoutWorkerNodePosition[];
  width: number;
  height: number;
};
