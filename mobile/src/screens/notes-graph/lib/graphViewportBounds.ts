import { nodeBounds } from './graphNodeMetrics';
import type { GraphNode } from './graphTypes';

export const GRAPH_PAN_OVERSCROLL = 40;
export const GRAPH_VIEWPORT_MIN_SCALE = 0.3;
export const GRAPH_VIEWPORT_MAX_SCALE = 3;
export const GRAPH_WORLD_CONTENT_PADDING = 80;

export type GraphContentBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export function measureGraphContentBounds(nodes: GraphNode[]): GraphContentBounds | null {
  if (nodes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const bounds = nodeBounds(node);
    minX = Math.min(minX, bounds.left);
    minY = Math.min(minY, bounds.top);
    maxX = Math.max(maxX, bounds.right);
    maxY = Math.max(maxY, bounds.bottom);
  }

  return { minX, minY, maxX, maxY };
}

export function computeWorldDimensionsForNodes(
  nodes: GraphNode[],
  graphWidth: number,
  graphHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  minScale: number,
  contentPadding = GRAPH_WORLD_CONTENT_PADDING,
): { width: number; height: number } {
  const bounds = measureGraphContentBounds(nodes);
  let contentWidth = graphWidth;
  let contentHeight = graphHeight;

  if (bounds) {
    contentWidth = Math.max(bounds.maxX + contentPadding, graphWidth);
    contentHeight = Math.max(bounds.maxY + contentPadding, graphHeight);

    if (bounds.minX < 0) {
      contentWidth = Math.max(contentWidth, bounds.maxX - bounds.minX + contentPadding);
    }
    if (bounds.minY < 0) {
      contentHeight = Math.max(contentHeight, bounds.maxY - bounds.minY + contentPadding);
    }
  }

  return computeWorldDimensions(
    contentWidth,
    contentHeight,
    viewportWidth,
    viewportHeight,
    minScale,
  );
}

export function clampViewportScaleValue(
  value: number,
  minScale: number,
  maxScale: number,
): number {
  'worklet';
  return Math.min(maxScale, Math.max(minScale, value));
}

export function computeWorldDimensions(
  graphWidth: number,
  graphHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  minScale: number,
): { width: number; height: number } {
  const minWorldWidth = Math.ceil(viewportWidth / Math.max(minScale, 0.001));
  const minWorldHeight = Math.ceil(viewportHeight / Math.max(minScale, 0.001));

  return {
    width: Math.max(graphWidth, viewportWidth, minWorldWidth),
    height: Math.max(graphHeight, viewportHeight, minWorldHeight),
  };
}

export function clampViewportTranslation(
  translateX: number,
  translateY: number,
  scale: number,
  worldWidth: number,
  worldHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  overscroll: number,
): { translateX: number; translateY: number } {
  'worklet';
  const edgeOverscroll = overscroll > 0 ? overscroll : 40;
  const scaledWorldWidth = worldWidth * scale;
  const scaledWorldHeight = worldHeight * scale;

  let nextX = translateX;
  let nextY = translateY;

  if (scaledWorldWidth <= viewportWidth) {
    nextX = (viewportWidth - scaledWorldWidth) / 2;
  } else {
    const minX = viewportWidth - scaledWorldWidth - edgeOverscroll;
    const maxX = edgeOverscroll;
    nextX = Math.min(maxX, Math.max(minX, translateX));
  }

  if (scaledWorldHeight <= viewportHeight) {
    nextY = (viewportHeight - scaledWorldHeight) / 2;
  } else {
    const minY = viewportHeight - scaledWorldHeight - edgeOverscroll;
    const maxY = edgeOverscroll;
    nextY = Math.min(maxY, Math.max(minY, translateY));
  }

  return { translateX: nextX, translateY: nextY };
}

export function clampViewportTransform(
  transform: { scale: number; translateX: number; translateY: number },
  worldWidth: number,
  worldHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  minScale: number,
  maxScale: number,
  overscroll: number = GRAPH_PAN_OVERSCROLL,
): { scale: number; translateX: number; translateY: number } {
  const scale = Math.min(maxScale, Math.max(minScale, transform.scale));
  const { translateX, translateY } = clampViewportTranslation(
    transform.translateX,
    transform.translateY,
    scale,
    worldWidth,
    worldHeight,
    viewportWidth,
    viewportHeight,
    overscroll,
  );

  return { scale, translateX, translateY };
}
