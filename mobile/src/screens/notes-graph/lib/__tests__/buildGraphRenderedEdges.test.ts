import { buildGraphRenderedEdges, computeGraphVisibleWorldRect } from '../buildGraphRenderedEdges';
import type { GraphEdge, GraphNode } from '../graphTypes';

function makeNode(id: string, x: number, y: number): GraphNode {
  return {
    id,
    kind: 'record',
    x,
    y,
    searchText: id,
    record: undefined,
  };
}

function makeEdge(id: string, sourceId: string, targetId: string): GraphEdge {
  return {
    id,
    kind: 'similar',
    sourceId,
    targetId,
  };
}

describe('buildGraphRenderedEdges', () => {
  it('builds sorted edge paths for connected nodes', () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 200, 0)];
    const edges = [makeEdge('e1', 'a', 'b')];

    const rendered = buildGraphRenderedEdges(nodes, edges, null, null, null);

    expect(rendered).toHaveLength(1);
    expect(rendered[0]?.path.startsWith('M ')).toBe(true);
    expect(rendered[0]?.emphasis).toBe('default');
  });

  it('culls edges outside the visible viewport', () => {
    const nodes = [
      makeNode('near-a', 100, 100),
      makeNode('near-b', 180, 100),
      makeNode('far-a', 5000, 5000),
      makeNode('far-b', 5200, 5000),
    ];
    const edges = [makeEdge('near', 'near-a', 'near-b'), makeEdge('far', 'far-a', 'far-b')];

    const rendered = buildGraphRenderedEdges(nodes, edges, null, null, {
      translateX: 0,
      translateY: 0,
      scale: 1,
      viewportWidth: 400,
      viewportHeight: 800,
    });

    expect(rendered.map((item) => item.edge.id)).toEqual(['near']);
  });
});

describe('computeGraphVisibleWorldRect', () => {
  it('expands cull rect by at least one viewport in world space', () => {
    const rect = computeGraphVisibleWorldRect({
      translateX: -200,
      translateY: -100,
      scale: 2,
      viewportWidth: 400,
      viewportHeight: 800,
    });

    expect(rect.left).toBe(-300);
    expect(rect.top).toBe(-350);
    expect(rect.right).toBe(700);
    expect(rect.bottom).toBe(850);
  });
});
