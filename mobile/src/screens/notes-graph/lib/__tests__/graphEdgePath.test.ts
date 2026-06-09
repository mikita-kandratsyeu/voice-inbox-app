import {
  buildParallelEdgeBendLayout,
  computeEdgeCurvature,
  computeQuadraticEdgePath,
} from '../graphEdgePath';
import type { GraphEdge } from '../graphTypes';

describe('graphEdgePath', () => {
  it('spreads curvature for parallel edges on the same node pair', () => {
    const edges: GraphEdge[] = [
      {
        id: 'folder:a|b',
        kind: 'sameFolder',
        sourceId: 'record:a',
        targetId: 'record:b',
      },
      {
        id: 'tag:work:record:a|record:b',
        kind: 'sharedTag',
        sourceId: 'record:a',
        targetId: 'record:b',
      },
      {
        id: 'similar:a|b',
        kind: 'similar',
        sourceId: 'record:a',
        targetId: 'record:b',
      },
    ];

    const layout = buildParallelEdgeBendLayout(edges);
    const curvatures = edges.map((edge) => {
      const bend = layout.get(edge.id)!;
      return computeEdgeCurvature(200, edge.id, bend);
    });

    expect(layout.get('folder:a|b')).toEqual({ index: 0, total: 3 });
    expect(new Set(curvatures).size).toBe(3);
    expect(curvatures.some((value) => value > 0)).toBe(true);
    expect(curvatures.some((value) => value < 0)).toBe(true);
  });

  it('builds a curved path when distance is non-zero', () => {
    const path = computeQuadraticEdgePath({ x: 0, y: 0 }, { x: 100, y: 0 }, 24);
    expect(path.startsWith('M 0 0 Q')).toBe(true);
    expect(path.endsWith('100 0')).toBe(true);
  });
});
