import Graph from 'graphology';
import circular from 'graphology-layout/circular';
import forceAtlas2 from 'graphology-layout-forceatlas2';

import { resolveLayoutEdgeWeight } from './graphEdgeWeight';
import { nodeDimensions } from './graphNodeMetrics';
import { graphSeededJitter } from './graphSeededOffset';
import type { GraphEdge, GraphNode } from './graphTypes';

const NODE_LAYOUT_PADDING = 24;

function nodeSize(kind: GraphNode['kind']): number {
  const { width, height } = nodeDimensions(kind);
  return Math.max(width, height) + NODE_LAYOUT_PADDING;
}

function computeGlobalLayoutMetrics(
  nodeCount: number,
  viewportWidth: number,
  viewportHeight: number,
): { width: number; height: number; spread: number } {
  const avgNodeSpan = 188;

  // Progressive spacing reduction for large graphs
  let effectiveSpan = avgNodeSpan;
  if (nodeCount > 150) {
    effectiveSpan = avgNodeSpan * 0.58; // 150+ nodes: very compact
  } else if (nodeCount > 100) {
    effectiveSpan = avgNodeSpan * 0.68; // 100-150 nodes: compact (improved from 0.65)
  } else if (nodeCount > 50) {
    effectiveSpan = avgNodeSpan * 0.82; // 50-100 nodes: comfortable (improved from 0.8)
  }

  const gridSide = Math.ceil(Math.sqrt(Math.max(nodeCount, 1))) * effectiveSpan;
  const width = Math.max(viewportWidth, gridSide);
  const height = Math.max(viewportHeight, gridSide);

  // Better spread scaling for organic layouts
  let spreadFactor: number;
  if (nodeCount > 150) {
    spreadFactor = 0.36; // Very tight for huge graphs
  } else if (nodeCount > 100) {
    spreadFactor = 0.42; // Improved from 0.4
  } else if (nodeCount > 50) {
    spreadFactor = 0.46; // Improved from 0.44
  } else {
    spreadFactor = 0.5; // Improved from 0.48 for small graphs
  }
  const spread = Math.max(width, height) * spreadFactor;

  return { width, height, spread };
}

function buildForceAtlasSettings(nodeCount: number) {
  const inferred = forceAtlas2.inferSettings(nodeCount);
  const spreadFactor = Math.sqrt(Math.max(nodeCount, 1));

  // Enhanced scaling ratio for better organic distribution
  const baseScalingRatio = Math.max(inferred.scalingRatio ?? 8, 10 + spreadFactor * 9); // Increased from 8 + 8.5
  let scalingRatio: number;
  if (nodeCount > 150) {
    scalingRatio = baseScalingRatio * 0.52; // Very tight for 150+
  } else if (nodeCount > 100) {
    scalingRatio = baseScalingRatio * 0.62; // Improved from 0.6
  } else if (nodeCount > 50) {
    scalingRatio = baseScalingRatio * 0.77; // Improved from 0.75
  } else {
    scalingRatio = baseScalingRatio;
  }

  // Progressive gravity scaling for natural clustering
  let gravity: number;
  if (nodeCount > 150) {
    gravity = 0.06; // Stronger for huge graphs
  } else if (nodeCount > 100) {
    gravity = 0.055; // Slightly increased from 0.05
  } else if (nodeCount > 64) {
    gravity = 0.045; // Slightly increased from 0.04
  } else if (nodeCount > 24) {
    gravity = 0.065; // Slightly increased from 0.06
  } else if (nodeCount > 10) {
    gravity = 0.14; // Increased from 0.12 for better cohesion
  } else {
    gravity = 0.26; // Increased from 0.24
  }

  return {
    ...inferred,
    adjustSizes: true,
    barnesHutOptimize: nodeCount > 48,
    barnesHutTheta: 0.45, // Slightly looser from default 0.5 for better accuracy
    edgeWeightInfluence: 0.75, // Increased from 0.72 - edges matter more
    gravity,
    linLogMode: false,
    scalingRatio,
    slowDown: nodeCount > 96 ? 4 : nodeCount > 48 ? 6 : 8,
    strongGravityMode: nodeCount <= 20, // Enable for small graphs
    weighted: true,
  };
}

function layoutIterations(nodeCount: number): number {
  // More iterations for better convergence, especially for large graphs
  if (nodeCount > 150) return Math.min(600, 140 + nodeCount * 3); // New tier for 150+
  if (nodeCount > 100) return Math.min(580, 120 + nodeCount * 3.5); // Increased from 520
  if (nodeCount > 48) return Math.min(780, 160 + nodeCount * 5.5); // Increased from 720 & 140
  return Math.min(1100, 200 + nodeCount * 9); // Increased from 1000, 180, 8
}

function addInitialJitter(graph: Graph, spread: number): void {
  // Stronger initial jitter for more natural organic distribution
  const jitter = Math.max(16, spread * 0.05); // Increased from 12 & 0.04
  graph.forEachNode((nodeId) => {
    const x = graph.getNodeAttribute(nodeId, 'x') as number;
    const y = graph.getNodeAttribute(nodeId, 'y') as number;
    const offset = graphSeededJitter(nodeId, jitter);
    graph.setNodeAttribute(nodeId, 'x', x + offset.x);
    graph.setNodeAttribute(nodeId, 'y', y + offset.y);
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

    const weight = resolveLayoutEdgeWeight(edge);
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
