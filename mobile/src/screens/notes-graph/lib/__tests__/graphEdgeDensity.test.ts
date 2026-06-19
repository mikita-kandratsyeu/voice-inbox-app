import {
  adjustEdgeCurvatureForDensity,
  computeEdgeDensity,
  type EdgeDensityInfo,
} from '../graphEdgeDensity';
import type { GraphEdge, GraphNode } from '../graphTypes';

function makeNode(id: string, x: number, y: number): GraphNode {
  return {
    id,
    kind: 'record',
    x,
    y,
    searchText: id,
    record: {
      id,
      title: id,
      transcript: '',
      duration: '0:00',
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'read',
    },
  };
}

function makeEdge(id: string, sourceId: string, targetId: string): GraphEdge {
  return {
    id,
    sourceId,
    targetId,
    kind: 'linked',
  };
}

describe('graphEdgeDensity', () => {
  it('marks dense graphs and lowers base opacity', () => {
    const nodes = [
      makeNode('a', 0, 0),
      makeNode('b', 40, 0),
      makeNode('c', 80, 0),
      makeNode('d', 120, 0),
    ];
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const edges = [
      makeEdge('e1', 'a', 'b'),
      makeEdge('e2', 'b', 'c'),
      makeEdge('e3', 'c', 'd'),
      makeEdge('e4', 'a', 'c'),
      makeEdge('e5', 'b', 'd'),
      makeEdge('e6', 'a', 'd'),
    ];

    const density = computeEdgeDensity(edges, nodeById);

    expect(density.isHighDensity).toBe(true);
    expect(density.baseOpacity).toBeLessThan(1);
  });

  it('increases curvature only for dense graphs', () => {
    const sparse: EdgeDensityInfo = {
      totalEdges: 4,
      maxDensity: 1,
      isHighDensity: false,
      baseOpacity: 1,
    };
    const dense: EdgeDensityInfo = {
      totalEdges: 120,
      maxDensity: 8,
      isHighDensity: true,
      baseOpacity: 0.4,
    };

    expect(adjustEdgeCurvatureForDensity(0.2, sparse)).toBe(0.2);
    expect(adjustEdgeCurvatureForDensity(0.2, dense)).toBeGreaterThan(0.2);
  });
});
