import Graph from 'graphology';
import circular from 'graphology-layout/circular';
import forceAtlas2 from 'graphology-layout-forceatlas2';

import { nodeDimensions } from './graphNodeMetrics';
import type { GraphEdge, GraphNode } from './graphTypes';
import { layoutIsolatedRecordNodes } from './layoutIsolatedNodes';

const NODE_LAYOUT_PADDING = 16;
const GRAPH_BOUNDS_PADDING = 80;

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

function computeLayoutMetrics(
  nodeCount: number,
  viewportWidth: number,
  viewportHeight: number,
): { width: number; height: number; spread: number } {
  const avgNodeSpan = 196;
  const gridSide = Math.ceil(Math.sqrt(Math.max(nodeCount, 1))) * avgNodeSpan;
  const width = Math.max(viewportWidth, gridSide);
  const height = Math.max(viewportHeight, gridSide);
  const spread = Math.max(width, height) * 0.42;

  return { width, height, spread };
}

function buildForceAtlasSettings(nodeCount: number) {
  const inferred = forceAtlas2.inferSettings(nodeCount);
  const spreadFactor = Math.sqrt(Math.max(nodeCount, 1));

  return {
    ...inferred,
    adjustSizes: true,
    barnesHutOptimize: nodeCount > 48,
    edgeWeightInfluence: 0.85,
    gravity: nodeCount > 64 ? 0.04 : nodeCount > 24 ? 0.08 : nodeCount > 10 ? 0.15 : 0.3,
    linLogMode: false,
    scalingRatio: Math.max(inferred.scalingRatio ?? 8, 6 + spreadFactor * 7),
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

function resolveNodeOverlaps(nodes: GraphNode[], gap = 14, maxPasses?: number): GraphNode[] {
  if (nodes.length < 2) return nodes;

  const passes = maxPasses ?? (nodes.length > 80 ? 20 : nodes.length > 40 ? 36 : 64);
  const layoutNodes = nodes.map((node) => ({ ...node }));

  for (let pass = 0; pass < passes; pass++) {
    let moved = false;

    for (let i = 0; i < layoutNodes.length; i++) {
      for (let j = i + 1; j < layoutNodes.length; j++) {
        const a = layoutNodes[i]!;
        const b = layoutNodes[j]!;
        const aDim = nodeDimensions(a.kind);
        const bDim = nodeDimensions(b.kind);

        const aCenterX = a.x + aDim.width / 2;
        const aCenterY = a.y + aDim.height / 2;
        const bCenterX = b.x + bDim.width / 2;
        const bCenterY = b.y + bDim.height / 2;

        const minDistX = (aDim.width + bDim.width) / 2 + gap;
        const minDistY = (aDim.height + bDim.height) / 2 + gap;
        const dx = bCenterX - aCenterX;
        const dy = bCenterY - aCenterY;
        const overlapX = minDistX - Math.abs(dx);
        const overlapY = minDistY - Math.abs(dy);

        if (overlapX <= 0 || overlapY <= 0) continue;

        let pushX = 0;
        let pushY = 0;

        if (overlapX < overlapY) {
          pushX = (Math.sign(dx) || 1) * (overlapX / 2 + 0.5);
        } else {
          pushY = (Math.sign(dy) || 1) * (overlapY / 2 + 0.5);
        }

        a.x -= pushX;
        a.y -= pushY;
        b.x += pushX;
        b.y += pushY;
        moved = true;
      }
    }

    if (!moved) break;
  }

  return layoutNodes;
}

export type LayoutResult = {
  nodes: GraphNode[];
  width: number;
  height: number;
};

export function runForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  viewportWidth: number,
  viewportHeight: number,
  fixedPositions?: Map<string, { x: number; y: number }>,
): LayoutResult {
  if (nodes.length === 0) {
    return { nodes: [], width: viewportWidth, height: viewportHeight };
  }

  const {
    width: layoutWidth,
    height: layoutHeight,
    spread,
  } = computeLayoutMetrics(nodes.length, viewportWidth, viewportHeight);

  const graph = new Graph({ type: 'undirected', multi: false, allowSelfLoops: false });
  const centerX = layoutWidth / 2;
  const centerY = layoutHeight / 2;

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

  if (!graph.order) {
    return { nodes, width: layoutWidth, height: layoutHeight };
  }

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

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  let layoutNodes: GraphNode[] = nodes.map((node) => {
    const cx = graph.getNodeAttribute(node.id, 'x') as number;
    const cy = graph.getNodeAttribute(node.id, 'y') as number;
    const { width: nodeWidth, height: nodeHeight } = nodeDimensions(node.kind);
    const x = cx - nodeWidth / 2;
    const y = cy - nodeHeight / 2;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + nodeWidth);
    maxY = Math.max(maxY, y + nodeHeight);
    const source = nodeById.get(node.id) ?? node;
    return { ...source, x, y };
  });

  layoutNodes = resolveNodeOverlaps(layoutNodes);
  layoutNodes = layoutIsolatedRecordNodes(layoutNodes, edges);

  minX = Infinity;
  minY = Infinity;
  maxX = -Infinity;
  maxY = -Infinity;

  for (const node of layoutNodes) {
    const { width: nodeWidth, height: nodeHeight } = nodeDimensions(node.kind);
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + nodeWidth);
    maxY = Math.max(maxY, node.y + nodeHeight);
  }

  let graphWidth = Math.max(maxX - minX + GRAPH_BOUNDS_PADDING * 2, layoutWidth);
  let graphHeight = Math.max(maxY - minY + GRAPH_BOUNDS_PADDING * 2, layoutHeight);
  const offsetX = GRAPH_BOUNDS_PADDING - minX;
  const offsetY = GRAPH_BOUNDS_PADDING - minY;

  let normalizedNodes = layoutNodes.map((node) => ({
    ...node,
    x: node.x + offsetX,
    y: node.y + offsetY,
  }));

  if (fixedPositions?.size) {
    normalizedNodes = normalizedNodes.map((node) => {
      const fixed = fixedPositions.get(node.id);
      return fixed ? { ...node, x: fixed.x, y: fixed.y } : node;
    });

    minX = Infinity;
    minY = Infinity;
    maxX = -Infinity;
    maxY = -Infinity;

    for (const node of normalizedNodes) {
      const { width: nodeWidth, height: nodeHeight } = nodeDimensions(node.kind);
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + nodeWidth);
      maxY = Math.max(maxY, node.y + nodeHeight);
    }

    graphWidth = Math.max(maxX - minX + GRAPH_BOUNDS_PADDING * 2, layoutWidth);
    graphHeight = Math.max(maxY - minY + GRAPH_BOUNDS_PADDING * 2, layoutHeight);
  }

  return {
    nodes: normalizedNodes,
    width: graphWidth,
    height: graphHeight,
  };
}

export function computeFitTransform(
  nodes: GraphNode[],
  graphWidth: number,
  graphHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  padding = 48,
): { scale: number; translateX: number; translateY: number } {
  if (nodes.length === 0) {
    return { scale: 1, translateX: 0, translateY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const { width, height } = nodeDimensions(node.kind);
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + width);
    maxY = Math.max(maxY, node.y + height);
  }

  const contentWidth = Math.max(maxX - minX, 1);
  const contentHeight = Math.max(maxY - minY, 1);
  const scaleX = (viewportWidth - padding * 2) / contentWidth;
  const scaleY = (viewportHeight - padding * 2) / contentHeight;
  const scale = Math.min(scaleX, scaleY, 1.2);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return {
    scale,
    translateX: viewportWidth / 2 - centerX * scale,
    translateY: viewportHeight / 2 - centerY * scale,
  };
}

export function computeFocusTransform(
  node: GraphNode,
  viewportWidth: number,
  viewportHeight: number,
  scale = 1.1,
): { scale: number; translateX: number; translateY: number } {
  const { width, height } = nodeDimensions(node.kind);
  const centerX = node.x + width / 2;
  const centerY = node.y + height / 2;
  return {
    scale,
    translateX: viewportWidth / 2 - centerX * scale,
    translateY: viewportHeight / 2 - centerY * scale,
  };
}

/** Minimum center distance between two laid-out nodes — for tests. */
export function minNodeCenterDistance(nodes: GraphNode[]): number {
  if (nodes.length < 2) return Infinity;

  let minDistance = Infinity;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]!;
      const b = nodes[j]!;
      const aDim = nodeDimensions(a.kind);
      const bDim = nodeDimensions(b.kind);
      const ax = a.x + aDim.width / 2;
      const ay = a.y + aDim.height / 2;
      const bx = b.x + bDim.width / 2;
      const by = b.y + bDim.height / 2;
      minDistance = Math.min(minDistance, Math.hypot(ax - bx, ay - by));
    }
  }

  return minDistance;
}
