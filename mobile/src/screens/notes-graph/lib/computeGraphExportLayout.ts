import type { GraphNode } from './graphTypes';
import {
  computeWorldDimensionsForNodes,
  GRAPH_VIEWPORT_MIN_SCALE,
  measureGraphContentBounds,
} from './graphViewportBounds';
import { computeFitTransform } from './runForceLayout';

export const GRAPH_EXPORT_MAX_DIMENSION = 2800;
export const GRAPH_EXPORT_MIN_DIMENSION = 720;
export const GRAPH_EXPORT_FIT_PADDING = 48;

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

  const contentWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const contentHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const aspect = contentWidth / contentHeight;

  let exportWidth: number;
  let exportHeight: number;

  if (aspect >= 1) {
    exportWidth = maxDimension;
    exportHeight = Math.max(GRAPH_EXPORT_MIN_DIMENSION, Math.round(maxDimension / aspect));
  } else {
    exportHeight = maxDimension;
    exportWidth = Math.max(GRAPH_EXPORT_MIN_DIMENSION, Math.round(maxDimension * aspect));
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
