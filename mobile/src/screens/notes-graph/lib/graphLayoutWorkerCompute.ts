import type { LayoutWorkerRequest, LayoutWorkerResponse } from './graphLayoutWorkerTypes';
import type { GraphEdge, GraphNode } from './graphTypes';
import { runForceLayout } from './runForceLayout';

function toGraphNodes(request: LayoutWorkerRequest): GraphNode[] {
  return request.nodes.map((node) => ({
    id: node.id,
    kind: node.kind,
    x: node.x,
    y: node.y,
    searchText: '',
  }));
}

function toGraphEdges(request: LayoutWorkerRequest): GraphEdge[] {
  return request.edges.map((edge) => ({
    id: edge.id,
    kind: edge.kind,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    weight: edge.weight,
  }));
}

/** Pure layout step — safe on main thread (Jest) and inside a worklet runtime. */
export function computeLayoutWorkerResponse(request: LayoutWorkerRequest): LayoutWorkerResponse {
  const fixedPositions = new Map(Object.entries(request.fixedPositions));
  const result = runForceLayout(
    toGraphNodes(request),
    toGraphEdges(request),
    request.viewportWidth,
    request.viewportHeight,
    fixedPositions,
    request.layoutMode,
  );

  return {
    nodes: result.nodes.map((node) => ({ id: node.id, x: node.x, y: node.y })),
    width: result.width,
    height: result.height,
  };
}
