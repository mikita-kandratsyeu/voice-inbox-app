import type { GraphEdge } from './graphTypes';

export type GraphNodeVisualState = {
  active: boolean;
  neighbor: boolean;
  dimmed: boolean;
  highlighted: boolean;
};

const neighborCache = new WeakMap<GraphEdge[], Map<string, Set<string>>>();

export function buildGraphActiveNeighborIds(activeNodeId: string, edges: GraphEdge[]): Set<string> {
  let cache = neighborCache.get(edges);

  if (!cache) {
    cache = new Map();
    for (const edge of edges) {
      if (!cache.has(edge.sourceId)) {
        cache.set(edge.sourceId, new Set());
      }
      if (!cache.has(edge.targetId)) {
        cache.set(edge.targetId, new Set());
      }
      cache.get(edge.sourceId)!.add(edge.targetId);
      cache.get(edge.targetId)!.add(edge.sourceId);
    }
    neighborCache.set(edges, cache);
  }

  return cache.get(activeNodeId) ?? new Set();
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
