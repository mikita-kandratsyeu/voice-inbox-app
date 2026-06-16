import { nodeBounds } from './graphNodeMetrics';
import type { GraphNode } from './graphTypes';

export const GRAPH_PAN_OVERSCROLL = 160;
export const GRAPH_PAN_OVERSCROLL_VIEWPORT_RATIO = 0.22;
export const GRAPH_VIEWPORT_MIN_SCALE = 0.225;
export const GRAPH_VIEWPORT_MAX_SCALE = 3;
export const GRAPH_WORLD_CONTENT_PADDING = 120;

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
 * - For large graphs with many edges, curved paths can extend further
 * We add generous margin to ensure all edges are captured in exports
 */
const EDGE_VISUAL_MARGIN = 48;

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

  // Add margin for edge effects (curvature, stroke width, glow)
  // For large graphs with many edges, increase margin to ensure all curved edges are captured
  const edgeMargin = nodes.length > 100 ? EDGE_VISUAL_MARGIN * 1.5 : EDGE_VISUAL_MARGIN;

  minX -= edgeMargin;
  minY -= edgeMargin;
  maxX += edgeMargin;
  maxY += edgeMargin;

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
): GraphWorldDimensions {
  const bounds = measureGraphContentBounds(nodes);
  let layoutWidth = graphWidth;
  let layoutHeight = graphHeight;

  if (bounds) {
    const spanWidth = bounds.maxX - bounds.minX;
    const spanHeight = bounds.maxY - bounds.minY;
    layoutWidth = Math.max(
      layoutWidth,
      spanWidth + contentPadding * 2,
      bounds.maxX + contentPadding,
    );
    layoutHeight = Math.max(
      layoutHeight,
      spanHeight + contentPadding * 2,
      bounds.maxY + contentPadding,
    );
  }

  const dimensions = computeWorldDimensions(
    layoutWidth,
    layoutHeight,
    viewportWidth,
    viewportHeight,
    minScale,
  );

  return {
    ...dimensions,
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

  const spanWidth = bounds.maxX - bounds.minX + contentPadding;
  const spanHeight = bounds.maxY - bounds.minY + contentPadding;

  return {
    width: Math.max(spanWidth, graphWidth, 1),
    height: Math.max(spanHeight, graphHeight, 1),
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

  const contentWidth = Math.max(contentMaxX - contentMinX, 1);
  const contentHeight = Math.max(contentMaxY - contentMinY, 1);
  const scaledContentWidth = contentWidth * safeScale;
  const scaledContentHeight = contentHeight * safeScale;

  let nextX = translateX;
  let nextY = translateY;

  if (scaledContentWidth <= viewportWidth) {
    nextX = (viewportWidth - scaledContentWidth) / 2 - contentMinX * safeScale;
  } else {
    const maxTranslateX = -(contentMinX - padWorld) * safeScale;
    const minTranslateX = viewportWidth - (contentMaxX + padWorld) * safeScale;
    nextX = Math.min(maxTranslateX, Math.max(minTranslateX, translateX));
  }

  if (scaledContentHeight <= viewportHeight) {
    nextY = (viewportHeight - scaledContentHeight) / 2 - contentMinY * safeScale;
  } else {
    const maxTranslateY = -(contentMinY - padWorld) * safeScale;
    const minTranslateY = viewportHeight - (contentMaxY + padWorld) * safeScale;
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
