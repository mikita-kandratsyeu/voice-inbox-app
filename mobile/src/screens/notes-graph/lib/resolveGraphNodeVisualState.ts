import type { GraphEdge } from './graphTypes';

export type GraphNodeVisualState = {
  active: boolean;
  neighbor: boolean;
  dimmed: boolean;
  highlighted: boolean;
};

export function buildGraphActiveNeighborIds(activeNodeId: string, edges: GraphEdge[]): Set<string> {
  const neighbors = new Set<string>();
  for (const edge of edges) {
    if (edge.sourceId === activeNodeId) {
      neighbors.add(edge.targetId);
    }
    if (edge.targetId === activeNodeId) {
      neighbors.add(edge.sourceId);
    }
  }
  return neighbors;
}

export function resolveGraphNodeVisualState(
  nodeId: string,
  activeNodeId: string | null,
  neighborIds: ReadonlySet<string>,
  matchedNodeIds: ReadonlySet<string> | null,
): GraphNodeVisualState {
  if (activeNodeId) {
    const active = nodeId === activeNodeId;
    const neighbor = neighborIds.has(nodeId);
    return {
      active,
      neighbor,
      dimmed: !active && !neighbor,
      highlighted: active || neighbor,
    };
  }

  if (matchedNodeIds && matchedNodeIds.size > 0) {
    const inSearch = matchedNodeIds.has(nodeId);
    return {
      active: false,
      neighbor: false,
      dimmed: !inSearch,
      highlighted: inSearch,
    };
  }

  return {
    active: false,
    neighbor: false,
    dimmed: false,
    highlighted: false,
  };
}

export function graphNodeStackOrder(state: GraphNodeVisualState): number {
  if (state.active) return 5;
  if (state.neighbor) return 3;
  return 0;
}
