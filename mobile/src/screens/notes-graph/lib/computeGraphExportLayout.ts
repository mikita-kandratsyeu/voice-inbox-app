import { getDeviceCapabilities } from '@/shared/lib/deviceCapabilities';
import { IS_IOS } from '@/shared/lib/platform';
import runAfterInteractions from '@/shared/lib/runAfterInteractions';

import type { GraphNode } from './graphTypes';
import {
  computeExportWorldDimensionsForNodes,
  measureGraphContentBounds,
} from './graphViewportBounds';
import { computeFitTransform } from './runForceLayout';

function waitAnimationFrames(frameCount: number): Promise<void> {
  return new Promise((resolve) => {
    const tick = (remaining: number) => {
      if (remaining <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(() => tick(remaining - 1));
    };
    tick(frameCount);
  });
}

/**
 * Maximum texture size supported by most modern mobile GPUs.
 * 8192x8192 is the typical hardware limit on iOS/Android.
 * Note: Very large exports may fail on older devices with limited memory.
 */
export const GRAPH_EXPORT_MAX_DIMENSION = 8192;
/** iOS drawViewHierarchy / renderInContext maximum safe dimension. */
export const GRAPH_EXPORT_VIEW_SHOT_MAX_DIMENSION_IOS = 8192;
export const GRAPH_EXPORT_MIN_DIMENSION = 720;
export const GRAPH_EXPORT_FIT_PADDING = 120;

export function getGraphExportViewShotMaxDimension(): number {
  return getDeviceCapabilities().maxExportDimension;
}

/** Lets the off-screen export tree paint native nodes and SVG edges before ViewShot. Skia layers are not captured. */
export async function waitForGraphExportCaptureReady(edgeCount: number): Promise<void> {
  await waitAnimationFrames(3);
  await new Promise<void>((resolve) => {
    runAfterInteractions(() => resolve());
  });

  if (edgeCount > 150) {
    const delayMs = Math.min(600, 80 + Math.round(edgeCount * 0.75));
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await waitAnimationFrames(1);
  }
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
    ...(IS_IOS ? { useRenderInContext: true } : {}),
  };
}

export type GraphExportLayout = {
  exportWidth: number;
  exportHeight: number;
  worldWidth: number;
  worldHeight: number;
  transform: { scale: number; translateX: number; translateY: number };
  wasScaledDown?: boolean;
  deviceMemoryTier?: string;
};

export function computeGraphExportLayout(
  nodes: GraphNode[],
  graphWidth: number,
  graphHeight: number,
  maxDimension?: number,
): GraphExportLayout | null {
  if (nodes.length === 0) return null;

  const bounds = measureGraphContentBounds(nodes);
  if (!bounds) return null;

  // Detect device capabilities dynamically
  const capabilities = getDeviceCapabilities();
  const deviceMaxDimension = maxDimension ?? capabilities.maxExportDimension;

  // measureGraphContentBounds already includes EDGE_VISUAL_MARGIN
  // Add additional padding for export frame
  // For large graphs (>50 nodes), increase padding to ensure curved edges are fully captured
  const basePadding = GRAPH_EXPORT_FIT_PADDING * 2;
  const extraPaddingForLargeGraphs = nodes.length > 50 ? Math.min(nodes.length * 0.5, 100) : 0;
  const paddingExtra = basePadding + extraPaddingForLargeGraphs;

  const contentWidth = Math.max(bounds.maxX - bounds.minX + paddingExtra, 1);
  const contentHeight = Math.max(bounds.maxY - bounds.minY + paddingExtra, 1);
  const aspect = contentWidth / contentHeight;

  let exportWidth: number;
  let exportHeight: number;

  if (aspect >= 1) {
    exportWidth = Math.min(deviceMaxDimension, contentWidth + paddingExtra);
    exportHeight = Math.max(
      GRAPH_EXPORT_MIN_DIMENSION,
      Math.min(Math.round(exportWidth / aspect), deviceMaxDimension),
    );
  } else {
    exportHeight = Math.min(deviceMaxDimension, contentHeight + paddingExtra);
    exportWidth = Math.max(
      GRAPH_EXPORT_MIN_DIMENSION,
      Math.min(Math.round(exportHeight * aspect), deviceMaxDimension),
    );
  }

  // Verify total pixels are within device limits
  const totalPixels = exportWidth * exportHeight;
  let wasScaledDown = false;

  if (totalPixels > capabilities.maxSafeExportPixels) {
    const scale = Math.sqrt(capabilities.maxSafeExportPixels / totalPixels);
    exportWidth = Math.floor(exportWidth * scale);
    exportHeight = Math.floor(exportHeight * scale);
    wasScaledDown = true;
  }

  const { width: worldWidth, height: worldHeight } = computeExportWorldDimensionsForNodes(
    nodes,
    graphWidth,
    graphHeight,
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
    wasScaledDown,
    deviceMemoryTier: capabilities.memoryTier,
  };
}
