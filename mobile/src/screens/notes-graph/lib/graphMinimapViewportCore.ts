import type {
  GraphMinimapContentBounds,
  GraphMinimapFrame,
  GraphMinimapViewportRect,
} from './graphMinimapFrame';
import { GRAPH_MINIMAP_VIEWPORT_STROKE } from './graphMinimapFrame';

function viewportContainsContentBounds(
  content: GraphMinimapContentBounds | null,
  viewLeft: number,
  viewTop: number,
  viewRight: number,
  viewBottom: number,
): boolean {
  if (!content) return false;

  return (
    viewLeft <= content.minX &&
    viewTop <= content.minY &&
    viewRight >= content.maxX &&
    viewBottom >= content.maxY
  );
}

function fullMinimapViewportRect(
  canvasWidth: number,
  canvasHeight: number,
  strokeWidth = GRAPH_MINIMAP_VIEWPORT_STROKE,
): GraphMinimapViewportRect {
  const inset = strokeWidth / 2;

  return {
    x: inset,
    y: inset,
    width: Math.max(0, canvasWidth - strokeWidth),
    height: Math.max(0, canvasHeight - strokeWidth),
  };
}

export function clipMinimapViewportRect(
  rect: GraphMinimapViewportRect,
  canvasWidth: number,
  canvasHeight: number,
  strokeWidth = GRAPH_MINIMAP_VIEWPORT_STROKE,
): GraphMinimapViewportRect {
  const inset = strokeWidth / 2;
  const x1 = Math.max(inset, rect.x);
  const y1 = Math.max(inset, rect.y);
  const x2 = Math.min(canvasWidth - inset, rect.x + rect.width);
  const y2 = Math.min(canvasHeight - inset, rect.y + rect.height);

  return {
    x: x1,
    y: y1,
    width: Math.max(0, x2 - x1),
    height: Math.max(0, y2 - y1),
  };
}

function worldToMinimapPoint(
  worldX: number,
  worldY: number,
  frame: GraphMinimapFrame,
): { x: number; y: number } {
  return {
    x: frame.offsetX + (worldX - frame.minX) * frame.scale,
    y: frame.offsetY + (worldY - frame.minY) * frame.scale,
  };
}

export function computeMinimapViewportRectFromBounds(
  frame: GraphMinimapFrame,
  contentBounds: GraphMinimapContentBounds | null,
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  translateX: number,
  translateY: number,
  viewportScale: number,
): GraphMinimapViewportRect {
  const safeScale = Math.max(viewportScale, 0.001);
  const viewLeft = -translateX / safeScale;
  const viewTop = -translateY / safeScale;
  const viewRight = viewLeft + viewportWidth / safeScale;
  const viewBottom = viewTop + viewportHeight / safeScale;

  if (viewportContainsContentBounds(contentBounds, viewLeft, viewTop, viewRight, viewBottom)) {
    return fullMinimapViewportRect(canvasWidth, canvasHeight);
  }

  const frameRight = frame.minX + frame.width;
  const frameBottom = frame.minY + frame.height;

  const clippedLeft = Math.max(viewLeft, frame.minX);
  const clippedTop = Math.max(viewTop, frame.minY);
  const clippedRight = Math.min(viewRight, frameRight);
  const clippedBottom = Math.min(viewBottom, frameBottom);

  const topLeft = worldToMinimapPoint(clippedLeft, clippedTop, frame);

  return clipMinimapViewportRect(
    {
      x: topLeft.x,
      y: topLeft.y,
      width: Math.max(0, clippedRight - clippedLeft) * frame.scale,
      height: Math.max(0, clippedBottom - clippedTop) * frame.scale,
    },
    canvasWidth,
    canvasHeight,
  );
}
