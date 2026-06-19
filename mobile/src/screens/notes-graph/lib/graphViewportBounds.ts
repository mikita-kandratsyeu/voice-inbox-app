import { nodeBounds } from './graphNodeMetrics';
import type { GraphNode } from './graphTypes';

export const GRAPH_PAN_OVERSCROLL = 240;
export const GRAPH_PAN_OVERSCROLL_VIEWPORT_RATIO = 0.35;
export const GRAPH_VIEWPORT_MIN_SCALE = 0.2;
export const GRAPH_VIEWPORT_MAX_SCALE = 3.5;
export const GRAPH_WORLD_CONTENT_PADDING = 100;
/** Matches folder/tag cluster highlight padding in GraphClusterBoundaries. */
export const GRAPH_CLUSTER_BOUNDARY_PADDING = 32;

export function resolveGraphPanOverscroll(viewportWidth: number, viewportHeight: number): number {
  const viewportMin = Math.min(Math.max(viewportWidth, 1), Math.max(viewportHeight, 1));
  return Math.max(
    GRAPH_PAN_OVERSCROLL,
    Math.round(viewportMin * GRAPH_PAN_OVERSCROLL_VIEWPORT_RATIO),
  );
}

export type GraphWorldDimensions = {
  width: number;
  height: number;
  contentBounds: GraphContentBounds | null;
};

export type GraphContentBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/**
 * Maximum visual extent of edge effects beyond the edge path:
 * - Highlighted edge glow: strokeWidth 9
 * - Edge curvature can extend perpendicular to the direct line
 * Keeping it minimal for tighter world bounds
 */
const EDGE_VISUAL_MARGIN = 30;

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

  // Add minimal margin for edge effects (curvature, stroke width, glow)
  const edgeMargin = EDGE_VISUAL_MARGIN;

  minX -= edgeMargin;
  minY -= edgeMargin;
  maxX += edgeMargin;
  maxY += edgeMargin;

  return { minX, minY, maxX, maxY };
}

function expandBoundsForClusterHighlights(
  bounds: GraphContentBounds,
  padding = GRAPH_CLUSTER_BOUNDARY_PADDING,
): GraphContentBounds {
  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
  };
}

/** Looser bounds for pan clamping so the map can reach nodes across the full layout. */
export function expandPanContentBounds(
  contentBounds: GraphContentBounds,
  graphWidth: number,
  graphHeight: number,
  padding = GRAPH_WORLD_CONTENT_PADDING,
): GraphContentBounds {
  return {
    minX: Math.min(contentBounds.minX - padding, 0),
    minY: Math.min(contentBounds.minY - padding, 0),
    maxX: Math.max(contentBounds.maxX + padding, graphWidth),
    maxY: Math.max(contentBounds.maxY + padding, graphHeight),
  };
}

/**
 * World canvas starts at (0, 0). Size must cover absolute content extents, not just span,
 * otherwise folder highlights and nodes shifted right/bottom get clipped.
 */
function computeWorldExtentFromBounds(
  bounds: GraphContentBounds,
  contentPadding: number,
): { width: number; height: number } {
  const spanWidth = bounds.maxX - bounds.minX;
  const spanHeight = bounds.maxY - bounds.minY;
  const originMinX = Math.min(bounds.minX, 0);
  const originMinY = Math.min(bounds.minY, 0);

  return {
    width: Math.max(bounds.maxX + contentPadding - originMinX, spanWidth + contentPadding * 2),
    height: Math.max(bounds.maxY + contentPadding - originMinY, spanHeight + contentPadding * 2),
  };
}

export function computeWorldDimensionsForNodes(
  nodes: GraphNode[],
  graphWidth: number,
  graphHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  minScale: number,
  contentPadding = GRAPH_WORLD_CONTENT_PADDING,
): GraphWorldDimensions {
  const measuredBounds = measureGraphContentBounds(nodes);

  if (!measuredBounds) {
    const zoomFloor = computeWorldDimensions(
      graphWidth,
      graphHeight,
      viewportWidth,
      viewportHeight,
      minScale,
    );
    return {
      width: Math.max(viewportWidth, graphWidth, zoomFloor.width, 800),
      height: Math.max(viewportHeight, graphHeight, zoomFloor.height, 600),
      contentBounds: null,
    };
  }

  const bounds = expandBoundsForClusterHighlights(measuredBounds);
  const extent = computeWorldExtentFromBounds(bounds, contentPadding);
  const zoomFloor = computeWorldDimensions(
    graphWidth,
    graphHeight,
    viewportWidth,
    viewportHeight,
    minScale,
  );

  return {
    width: Math.max(extent.width, viewportWidth, graphWidth, zoomFloor.width),
    height: Math.max(extent.height, viewportHeight, graphHeight, zoomFloor.height),
    contentBounds: bounds,
  };
}

/** Tight world bounds for off-screen export capture (no pan/zoom min-world floor). */
export function computeExportWorldDimensionsForNodes(
  nodes: GraphNode[],
  graphWidth: number,
  graphHeight: number,
  contentPadding = GRAPH_WORLD_CONTENT_PADDING,
): { width: number; height: number } {
  const bounds = measureGraphContentBounds(nodes);
  if (!bounds) {
    return {
      width: Math.max(graphWidth, 1),
      height: Math.max(graphHeight, 1),
    };
  }

  const expanded = expandBoundsForClusterHighlights(bounds);
  const extent = computeWorldExtentFromBounds(expanded, contentPadding);

  return {
    width: Math.max(extent.width, graphWidth, 1),
    height: Math.max(extent.height, graphHeight, 1),
  };
}

export function clampViewportScaleValue(value: number, minScale: number, maxScale: number): number {
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
  contentMinX = 0,
  contentMinY = 0,
  contentMaxX = worldWidth,
  contentMaxY = worldHeight,
): { translateX: number; translateY: number } {
  'worklet';
  const edgeOverscroll = overscroll > 0 ? overscroll : GRAPH_PAN_OVERSCROLL;
  const safeScale = Math.max(scale, 0.001);
  const padWorld = edgeOverscroll / safeScale;

  const extraPaddingForNodes = 50 / safeScale;
  const effectivePadWorld = padWorld + extraPaddingForNodes;

  const contentWidth = Math.max(contentMaxX - contentMinX, 1);
  const contentHeight = Math.max(contentMaxY - contentMinY, 1);
  const scaledContentWidth = contentWidth * safeScale;
  const scaledContentHeight = contentHeight * safeScale;

  let nextX = translateX;
  let nextY = translateY;

  if (scaledContentWidth <= viewportWidth) {
    nextX = (viewportWidth - scaledContentWidth) / 2 - contentMinX * safeScale;
  } else {
    const maxTranslateX = -(contentMinX - effectivePadWorld) * safeScale;
    const minTranslateX = viewportWidth - (contentMaxX + effectivePadWorld) * safeScale;
    nextX = Math.min(maxTranslateX, Math.max(minTranslateX, translateX));
  }

  if (scaledContentHeight <= viewportHeight) {
    nextY = (viewportHeight - scaledContentHeight) / 2 - contentMinY * safeScale;
  } else {
    const maxTranslateY = -(contentMinY - effectivePadWorld) * safeScale;
    const minTranslateY = viewportHeight - (contentMaxY + effectivePadWorld) * safeScale;
    nextY = Math.min(maxTranslateY, Math.max(minTranslateY, translateY));
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
  contentBounds: GraphContentBounds | null = null,
): { scale: number; translateX: number; translateY: number } {
  const scale = Math.min(maxScale, Math.max(minScale, transform.scale));
  const contentMinX = contentBounds?.minX ?? 0;
  const contentMinY = contentBounds?.minY ?? 0;
  const contentMaxX = contentBounds?.maxX ?? worldWidth;
  const contentMaxY = contentBounds?.maxY ?? worldHeight;
  const { translateX, translateY } = clampViewportTranslation(
    transform.translateX,
    transform.translateY,
    scale,
    worldWidth,
    worldHeight,
    viewportWidth,
    viewportHeight,
    overscroll,
    contentMinX,
    contentMinY,
    contentMaxX,
    contentMaxY,
  );

  return { scale, translateX, translateY };
}
