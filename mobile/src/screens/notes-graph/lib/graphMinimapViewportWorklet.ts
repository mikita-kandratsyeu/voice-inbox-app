import type {
  GraphMinimapContentBounds,
  GraphMinimapFrame,
  GraphMinimapViewportRect,
} from './graphMinimapFrame';

/** UI-thread viewport math. Uses only literals — worklets cannot read module constants. */
export function computeMinimapViewportRectWorklet(
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
  'worklet';

  const strokeWidth = 1.5;
  const safeScale = Math.max(viewportScale, 0.001);
  const viewLeft = -translateX / safeScale;
  const viewTop = -translateY / safeScale;
  const viewRight = viewLeft + viewportWidth / safeScale;
  const viewBottom = viewTop + viewportHeight / safeScale;

  const showsAllContent =
    contentBounds != null &&
    viewLeft <= contentBounds.minX &&
    viewTop <= contentBounds.minY &&
    viewRight >= contentBounds.maxX &&
    viewBottom >= contentBounds.maxY;

  if (showsAllContent) {
    const inset = strokeWidth / 2;
    return {
      x: inset,
      y: inset,
      width: Math.max(0, canvasWidth - strokeWidth),
      height: Math.max(0, canvasHeight - strokeWidth),
    };
  }

  const frameRight = frame.minX + frame.width;
  const frameBottom = frame.minY + frame.height;

  const clippedLeft = Math.max(viewLeft, frame.minX);
  const clippedTop = Math.max(viewTop, frame.minY);
  const clippedRight = Math.min(viewRight, frameRight);
  const clippedBottom = Math.min(viewBottom, frameBottom);

  const topLeftX = frame.offsetX + (clippedLeft - frame.minX) * frame.scale;
  const topLeftY = frame.offsetY + (clippedTop - frame.minY) * frame.scale;

  const inset = strokeWidth / 2;
  const x1 = Math.max(inset, topLeftX);
  const y1 = Math.max(inset, topLeftY);
  const x2 = Math.min(
    canvasWidth - inset,
    topLeftX + Math.max(0, clippedRight - clippedLeft) * frame.scale,
  );
  const y2 = Math.min(
    canvasHeight - inset,
    topLeftY + Math.max(0, clippedBottom - clippedTop) * frame.scale,
  );

  return {
    x: x1,
    y: y1,
    width: Math.max(0, x2 - x1),
    height: Math.max(0, y2 - y1),
  };
}
