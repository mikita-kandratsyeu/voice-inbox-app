import Graph from 'graphology';
import circular from 'graphology-layout/circular';
import forceAtlas2 from 'graphology-layout-forceatlas2';

import { nodeDimensions } from './graphNodeMetrics';
import type { GraphEdge, GraphNode } from './graphTypes';
import { layoutIsolatedRecordNodes } from './layoutIsolatedNodes';

const NODE_LAYOUT_PADDING = 24;

function nodeSize(kind: GraphNode['kind']): number {
  const { width, height } = nodeDimensions(kind);
  return Math.max(width, height) + NODE_LAYOUT_PADDING;
}

function edgeWeight(kind: GraphEdge['kind']): number {
  switch (kind) {
    case 'contains':
      return 4;
    case 'similar':
      return 3;
    case 'sharedTag':
      return 2;
    case 'sameFolder':
      return 1;
    default:
      return 1.5;
  }
}

function computeGlobalLayoutMetrics(
  nodeCount: number,
  viewportWidth: number,
  viewportHeight: number,
): { width: number; height: number; spread: number } {
  const avgNodeSpan = 188;
  const gridSide = Math.ceil(Math.sqrt(Math.max(nodeCount, 1))) * avgNodeSpan;
  const width = Math.max(viewportWidth, gridSide);
  const height = Math.max(viewportHeight, gridSide);
  const spread = Math.max(width, height) * 0.48;

  return { width, height, spread };
}

function buildForceAtlasSettings(nodeCount: number) {
  const inferred = forceAtlas2.inferSettings(nodeCount);
  const spreadFactor = Math.sqrt(Math.max(nodeCount, 1));

  return {
    ...inferred,
    adjustSizes: true,
    barnesHutOptimize: nodeCount > 48,
    edgeWeightInfluence: 0.72,
    gravity: nodeCount > 64 ? 0.03 : nodeCount > 24 ? 0.06 : nodeCount > 10 ? 0.12 : 0.24,
    linLogMode: false,
    scalingRatio: Math.max(inferred.scalingRatio ?? 8, 8 + spreadFactor * 8.5),
    slowDown: nodeCount > 96 ? 4 : nodeCount > 48 ? 6 : 8,
    weighted: true,
  };
}

function layoutIterations(nodeCount: number): number {
  if (nodeCount > 100) return Math.min(520, 100 + nodeCount * 3);
  if (nodeCount > 48) return Math.min(720, 140 + nodeCount * 5);
  return Math.min(1000, 180 + nodeCount * 8);
}

function addInitialJitter(graph: Graph, spread: number): void {
  const jitter = Math.max(12, spread * 0.04);
  graph.forEachNode((nodeId) => {
    const x = graph.getNodeAttribute(nodeId, 'x') as number;
    const y = graph.getNodeAttribute(nodeId, 'y') as number;
    graph.setNodeAttribute(nodeId, 'x', x + (Math.random() - 0.5) * jitter);
    graph.setNodeAttribute(nodeId, 'y', y + (Math.random() - 0.5) * jitter);
  });
}

export function layoutNodesWithGlobalForce(
  nodes: GraphNode[],
  edges: GraphEdge[],
  layoutWidth: number,
  layoutHeight: number,
  fixedPositions?: Map<string, { x: number; y: number }>,
): GraphNode[] {
  const {
    width: resolvedWidth,
    height: resolvedHeight,
    spread,
  } = computeGlobalLayoutMetrics(nodes.length, layoutWidth, layoutHeight);

  const graph = new Graph({ type: 'undirected', multi: false, allowSelfLoops: false });
  const centerX = resolvedWidth / 2;
  const centerY = resolvedHeight / 2;

  for (const node of nodes) {
    graph.addNode(node.id, {
      kind: node.kind,
      size: nodeSize(node.kind),
      x: centerX,
      y: centerY,
    });
  }

  for (const edge of edges) {
    if (!graph.hasNode(edge.sourceId) || !graph.hasNode(edge.targetId)) continue;
    if (edge.sourceId === edge.targetId) continue;

    const weight = edgeWeight(edge.kind);
    if (graph.hasEdge(edge.sourceId, edge.targetId)) {
      const existingKey = graph.edge(edge.sourceId, edge.targetId);
      const currentWeight = graph.getEdgeAttribute(existingKey, 'weight') as number;
      graph.setEdgeAttribute(existingKey, 'weight', Math.max(currentWeight, weight));
      continue;
    }

    graph.addEdge(edge.sourceId, edge.targetId, { weight, kind: edge.kind });
  }

  if (!graph.order) return nodes;

  circular.assign(graph, { scale: spread });
  addInitialJitter(graph, spread);

  if (fixedPositions?.size) {
    graph.forEachNode((nodeId) => {
      const fixed = fixedPositions.get(nodeId);
      if (!fixed) return;
      const kind = graph.getNodeAttribute(nodeId, 'kind') as GraphNode['kind'];
      const { width, height } = nodeDimensions(kind);
      graph.setNodeAttribute(nodeId, 'x', fixed.x + width / 2);
      graph.setNodeAttribute(nodeId, 'y', fixed.y + height / 2);
      graph.setNodeAttribute(nodeId, 'fixed', true);
    });
  }

  forceAtlas2.assign(graph, {
    iterations: layoutIterations(nodes.length),
    settings: buildForceAtlasSettings(nodes.length),
  });

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  return nodes.map((node) => {
    const cx = graph.getNodeAttribute(node.id, 'x') as number;
    const cy = graph.getNodeAttribute(node.id, 'y') as number;
    const { width: nodeWidth, height: nodeHeight } = nodeDimensions(node.kind);
    const source = nodeById.get(node.id) ?? node;
    return {
      ...source,
      x: cx - nodeWidth / 2,
      y: cy - nodeHeight / 2,
    };
  });
}
