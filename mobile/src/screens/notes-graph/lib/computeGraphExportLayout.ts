import { Platform } from 'react-native';

import type { GraphNode } from './graphTypes';
import {
  computeWorldDimensionsForNodes,
  GRAPH_VIEWPORT_MIN_SCALE,
  measureGraphContentBounds,
} from './graphViewportBounds';
import { computeFitTransform } from './runForceLayout';

export const GRAPH_EXPORT_MAX_DIMENSION = 2800;
/** iOS drawViewHierarchy / renderInContext is more reliable below full export resolution. */
export const GRAPH_EXPORT_VIEW_SHOT_MAX_DIMENSION_IOS = 2048;
export const GRAPH_EXPORT_MIN_DIMENSION = 720;
export const GRAPH_EXPORT_FIT_PADDING = 80;

export function getGraphExportViewShotMaxDimension(): number {
  return Platform.OS === 'ios'
    ? GRAPH_EXPORT_VIEW_SHOT_MAX_DIMENSION_IOS
    : GRAPH_EXPORT_MAX_DIMENSION;
}

export function getGraphExportViewShotCaptureOptions(): {
  format: 'png';
  quality: number;
  result: 'tmpfile';
  useRenderInContext?: boolean;
} {
  return {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    ...(Platform.OS === 'ios' ? { useRenderInContext: true } : {}),
  };
}

export type GraphExportLayout = {
  exportWidth: number;
  exportHeight: number;
  worldWidth: number;
  worldHeight: number;
  transform: { scale: number; translateX: number; translateY: number };
};

export function computeGraphExportLayout(
  nodes: GraphNode[],
  graphWidth: number,
  graphHeight: number,
  maxDimension = GRAPH_EXPORT_MAX_DIMENSION,
): GraphExportLayout | null {
  if (nodes.length === 0) return null;

  const bounds = measureGraphContentBounds(nodes);
  if (!bounds) return null;

  // measureGraphContentBounds already includes EDGE_VISUAL_MARGIN
  // Add additional padding for export frame
  const paddingExtra = GRAPH_EXPORT_FIT_PADDING * 2;
  const contentWidth = Math.max(bounds.maxX - bounds.minX + paddingExtra, 1);
  const contentHeight = Math.max(bounds.maxY - bounds.minY + paddingExtra, 1);
  const aspect = contentWidth / contentHeight;

  let exportWidth: number;
  let exportHeight: number;

  if (aspect >= 1) {
    exportWidth = Math.min(maxDimension, contentWidth + paddingExtra);
    exportHeight = Math.max(
      GRAPH_EXPORT_MIN_DIMENSION,
      Math.min(Math.round(exportWidth / aspect), maxDimension),
    );
  } else {
    exportHeight = Math.min(maxDimension, contentHeight + paddingExtra);
    exportWidth = Math.max(
      GRAPH_EXPORT_MIN_DIMENSION,
      Math.min(Math.round(exportHeight * aspect), maxDimension),
    );
  }

  const { width: worldWidth, height: worldHeight } = computeWorldDimensionsForNodes(
    nodes,
    graphWidth,
    graphHeight,
    exportWidth,
    exportHeight,
    GRAPH_VIEWPORT_MIN_SCALE,
  );

  const transform = computeFitTransform(
    nodes,
    worldWidth,
    worldHeight,
    exportWidth,
    exportHeight,
    GRAPH_EXPORT_FIT_PADDING,
  );

  return {
    exportWidth,
    exportHeight,
    worldWidth,
    worldHeight,
    transform,
  };
}
