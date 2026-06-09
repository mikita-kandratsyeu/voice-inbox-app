import { layoutNodesByClusters } from './graphClusterLayout';
import { nodeDimensions } from './graphNodeMetrics';
import type { GraphEdge, GraphNode, GraphLayoutMode } from './graphTypes';
import { DEFAULT_GRAPH_LAYOUT_MODE } from './graphTypes';
import type { GraphViewportInsets } from './graphViewportInsets';
import { layoutIsolatedRecordNodes } from './layoutIsolatedNodes';
import { layoutNodesInCircle } from './runCircularLayout';
import { layoutNodesWithGlobalForce } from './runGlobalForceLayout';

const GRAPH_BOUNDS_PADDING = 80;

function computeLayoutMetrics(
  nodeCount: number,
  viewportWidth: number,
  viewportHeight: number,
): { width: number; height: number } {
  const avgNodeSpan = 188;
  const aspect = viewportWidth / Math.max(viewportHeight, 1);
  const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(nodeCount, 1) * aspect)));
  const rows = Math.max(1, Math.ceil(nodeCount / cols));

  return {
    width: Math.max(viewportWidth, cols * avgNodeSpan),
    height: Math.max(viewportHeight, rows * avgNodeSpan),
  };
}

function resolveNodeOverlaps(nodes: GraphNode[], gap = 22, maxPasses?: number): GraphNode[] {
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
  layoutMode: GraphLayoutMode = DEFAULT_GRAPH_LAYOUT_MODE,
): LayoutResult {
  if (nodes.length === 0) {
    return { nodes: [], width: viewportWidth, height: viewportHeight };
  }

  const isCircular = layoutMode === 'circular';
  const { width: layoutWidth, height: layoutHeight } = isCircular
    ? { width: viewportWidth, height: viewportHeight }
    : computeLayoutMetrics(nodes.length, viewportWidth, viewportHeight);
  const boundsFloorWidth = isCircular ? viewportWidth : layoutWidth;
  const boundsFloorHeight = isCircular ? viewportHeight : layoutHeight;

  let layoutNodes: GraphNode[];
  if (layoutMode === 'force') {
    layoutNodes = layoutNodesWithGlobalForce(
      nodes,
      edges,
      layoutWidth,
      layoutHeight,
      fixedPositions,
    );
  } else if (isCircular) {
    layoutNodes = layoutNodesInCircle(nodes, viewportWidth, viewportHeight, fixedPositions);
  } else {
    layoutNodes = layoutNodesByClusters(nodes, edges, layoutWidth, layoutHeight, fixedPositions);
  }

  if (layoutMode !== 'circular') {
    layoutNodes = resolveNodeOverlaps(layoutNodes);
    layoutNodes = layoutIsolatedRecordNodes(layoutNodes, edges, layoutWidth);
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of layoutNodes) {
    const { width: nodeWidth, height: nodeHeight } = nodeDimensions(node.kind);
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + nodeWidth);
    maxY = Math.max(maxY, node.y + nodeHeight);
  }

  let graphWidth = Math.max(maxX - minX + GRAPH_BOUNDS_PADDING * 2, boundsFloorWidth);
  let graphHeight = Math.max(maxY - minY + GRAPH_BOUNDS_PADDING * 2, boundsFloorHeight);
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

    graphWidth = Math.max(maxX - minX + GRAPH_BOUNDS_PADDING * 2, boundsFloorWidth);
    graphHeight = Math.max(maxY - minY + GRAPH_BOUNDS_PADDING * 2, boundsFloorHeight);
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
  insets: GraphViewportInsets = {},
): { scale: number; translateX: number; translateY: number } {
  const top = insets.top ?? 0;
  const bottom = insets.bottom ?? 0;
  const left = insets.left ?? 0;
  const right = insets.right ?? 0;

  const { width, height } = nodeDimensions(node.kind);
  const centerX = node.x + width / 2;
  const centerY = node.y + height / 2;
  const visibleCenterX = left + (viewportWidth - left - right) / 2;
  const visibleCenterY = top + (viewportHeight - top - bottom) / 2;

  return {
    scale,
    translateX: visibleCenterX - centerX * scale,
    translateY: visibleCenterY - centerY * scale,
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
