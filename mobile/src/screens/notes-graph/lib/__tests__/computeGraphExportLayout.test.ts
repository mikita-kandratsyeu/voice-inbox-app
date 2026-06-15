jest.mock('@/shared/lib/deviceCapabilities', () => ({
  getDeviceCapabilities: () => ({
    memoryTier: 'ultra',
    maxExportDimension: 8192,
    maxSafeExportPixels: 8192 * 8192,
    canHandleLargeOperations: true,
    markdownEditorLimit: 20_000,
    llmGpuLayers: 99,
    llmBatchSize: 2048,
    llmUbatchSize: 1024,
  }),
}));

import { computeGraphExportLayout, GRAPH_EXPORT_MAX_DIMENSION } from '../computeGraphExportLayout';
import type { GraphNode } from '../graphTypes';
import { GRAPH_VIEWPORT_MIN_SCALE } from '../graphViewportBounds';

function recordNode(id: string, x: number, y: number): GraphNode {
  return {
    id,
    kind: 'record',
    x,
    y,
    searchText: id,
    record: { id, title: id } as GraphNode['record'],
  };
}

describe('computeGraphExportLayout', () => {
  it('returns null for empty graph', () => {
    expect(computeGraphExportLayout([], 1000, 800)).toBeNull();
  });

  it('sizes wide exports from content bounds capped by device max dimension', () => {
    const nodes = [recordNode('a', 40, 60), recordNode('b', 1800, 120), recordNode('c', 900, 500)];

    const layout = computeGraphExportLayout(nodes, 2000, 1200);
    expect(layout).not.toBeNull();
    expect(layout!.exportWidth).toBeLessThanOrEqual(GRAPH_EXPORT_MAX_DIMENSION);
    expect(layout!.exportWidth).toBeGreaterThan(2000);
    expect(layout!.exportHeight).toBeGreaterThan(0);
    expect(layout!.transform.scale).toBeLessThanOrEqual(1.2);
    expect(layout!.deviceMemoryTier).toBe('ultra');
  });

  it('uses tall aspect when content is vertical', () => {
    const nodes = [recordNode('a', 100, 80), recordNode('b', 140, 2200)];

    const layout = computeGraphExportLayout(nodes, 1200, 2400);
    expect(layout).not.toBeNull();
    expect(layout!.exportHeight).toBeLessThanOrEqual(GRAPH_EXPORT_MAX_DIMENSION);
    expect(layout!.exportHeight).toBeGreaterThan(2000);
    expect(layout!.exportWidth).toBeLessThan(layout!.exportHeight);
  });

  it('keeps export world near content instead of pan zoom floor on large graphs', () => {
    const nodes = Array.from({ length: 200 }, (_, index) =>
      recordNode(`n${index}`, 100 + (index % 20) * 180, 80 + Math.floor(index / 20) * 160),
    );

    const layout = computeGraphExportLayout(nodes, 4000, 3200);
    expect(layout).not.toBeNull();

    const panFloor = Math.ceil(layout!.exportWidth / GRAPH_VIEWPORT_MIN_SCALE);
    expect(layout!.worldWidth).toBeLessThan(panFloor * 0.5);
    expect(layout!.worldHeight).toBeLessThan(panFloor * 0.5);
  });
});
