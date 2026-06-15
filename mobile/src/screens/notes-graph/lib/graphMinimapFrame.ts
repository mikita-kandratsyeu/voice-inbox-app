import { nodeBounds } from './graphNodeMetrics';
import { computeMinimapViewportRectFromBounds } from './graphMinimapViewportCore';
import type { GraphNode } from './graphTypes';

export const GRAPH_MINIMAP_FRAME_PADDING = 48;
export const GRAPH_MINIMAP_BORDER_WIDTH = 1;
export const GRAPH_MINIMAP_VIEWPORT_STROKE = 1.5;

export function getMinimapCanvasSize(
  minimapWidth: number,
  minimapHeight: number,
  borderWidth = GRAPH_MINIMAP_BORDER_WIDTH,
): { width: number; height: number } {
  const trim = borderWidth * 2;

  return {
    width: Math.max(1, minimapWidth - trim),
    height: Math.max(1, minimapHeight - trim),
  };
}

export type GraphMinimapFrame = {
  minX: number;
  minY: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  scale: number;
};

export type GraphMinimapViewportRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type GraphMinimapContentBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function fitBoundsToMinimap(
  minX: number,
  minY: number,
  frameWidth: number,
  frameHeight: number,
  minimapWidth: number,
  minimapHeight: number,
): GraphMinimapFrame {
  const scaleX = minimapWidth / frameWidth;
  const scaleY = minimapHeight / frameHeight;
  // Fill the minimap (crop overflow) — avoids side letterboxing on map-style previews.
  const scale = Math.max(scaleX, scaleY);
  const contentWidth = frameWidth * scale;
  const contentHeight = frameHeight * scale;

  return {
    minX,
    minY,
    width: frameWidth,
    height: frameHeight,
    offsetX: (minimapWidth - contentWidth) / 2,
    offsetY: (minimapHeight - contentHeight) / 2,
    scale,
  };
}

export function computeMinimapContentBounds(nodes: GraphNode[]): GraphMinimapContentBounds | null {
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

  if (!Number.isFinite(minX)) {
    return null;
  }

  return { minX, minY, maxX, maxY };
}

/** Static minimap world — derived from graph content, not from the live viewport. */
export function computeStaticMinimapFrame(
  nodes: GraphNode[],
  worldWidth: number,
  worldHeight: number,
  minimapWidth: number,
  minimapHeight: number,
  padding = GRAPH_MINIMAP_FRAME_PADDING,
): GraphMinimapFrame {
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

  if (!Number.isFinite(minX)) {
    return fitBoundsToMinimap(0, 0, worldWidth, worldHeight, minimapWidth, minimapHeight);
  }

  const frameMinX = Math.max(0, minX - padding);
  const frameMinY = Math.max(0, minY - padding);
  const frameMaxX = Math.min(worldWidth, maxX + padding);
  const frameMaxY = Math.min(worldHeight, maxY + padding);
  const frameWidth = Math.max(frameMaxX - frameMinX, 1);
  const frameHeight = Math.max(frameMaxY - frameMinY, 1);

  return fitBoundsToMinimap(
    frameMinX,
    frameMinY,
    frameWidth,
    frameHeight,
    minimapWidth,
    minimapHeight,
  );
}

export { clipMinimapViewportRect, computeMinimapViewportRectFromBounds } from './graphMinimapViewportCore';

export function computeMinimapViewportRect(
  frame: GraphMinimapFrame,
  nodes: GraphNode[],
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  translateX: number,
  translateY: number,
  viewportScale: number,
): GraphMinimapViewportRect {
  return computeMinimapViewportRectFromBounds(
    frame,
    computeMinimapContentBounds(nodes),
    canvasWidth,
    canvasHeight,
    viewportWidth,
    viewportHeight,
    translateX,
    translateY,
    viewportScale,
  );
}

export function worldToMinimapPoint(
  worldX: number,
  worldY: number,
  frame: GraphMinimapFrame,
): { x: number; y: number } {
  return {
    x: frame.offsetX + (worldX - frame.minX) * frame.scale,
    y: frame.offsetY + (worldY - frame.minY) * frame.scale,
  };
}

export function minimapToWorldPoint(
  minimapX: number,
  minimapY: number,
  frame: GraphMinimapFrame,
  minimapWidth: number,
  minimapHeight: number,
): { x: number; y: number } | null {
  if (minimapX < 0 || minimapY < 0 || minimapX > minimapWidth || minimapY > minimapHeight) {
    return null;
  }

  return {
    x: frame.minX + (minimapX - frame.offsetX) / frame.scale,
    y: frame.minY + (minimapY - frame.offsetY) / frame.scale,
  };
}
