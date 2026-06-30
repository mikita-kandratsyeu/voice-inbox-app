import type { GraphEdgeKind, GraphNodeKind } from './graphTypes';

export type Graph3DLayoutWorkerNode = {
  id: string;
  kind: GraphNodeKind;
  x: number;
  y: number;
  parentRecordId?: string;
  folderId?: string | null;
  tags?: string[];
};

export type Graph3DLayoutWorkerEdge = {
  id: string;
  kind: GraphEdgeKind;
  sourceId: string;
  targetId: string;
};

export type Graph3DLayoutWorkerRequest = {
  nodes: Graph3DLayoutWorkerNode[];
  edges: Graph3DLayoutWorkerEdge[];
};

export type Graph3DLayoutWorkerResponse = {
  nodePoints: number[];
  nodeKinds: number[];
};
