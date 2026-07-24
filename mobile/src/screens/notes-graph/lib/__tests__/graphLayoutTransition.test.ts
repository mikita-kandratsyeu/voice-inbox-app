import {
  buildLayoutTransitionMap,
  interpolateLayoutNodes,
  interpolateNodePosition,
  shouldAnimateLayoutTransition,
} from '../graphLayoutTransition';
import type { GraphNode } from '../graphTypes';

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

describe('graphLayoutTransition', () => {
  it('interpolates between old and new positions', () => {
    const oldNodes = [makeNode('a', 0, 0)];
    const newNodes = [makeNode('a', 100, 200)];
    const maps = buildLayoutTransitionMap(oldNodes, newNodes);

    expect(interpolateNodePosition('a', 0, maps.old, maps.new)).toEqual({ x: 0, y: 0 });
    expect(interpolateNodePosition('a', 0.5, maps.old, maps.new)).toEqual({ x: 50, y: 100 });
    expect(interpolateNodePosition('a', 1, maps.old, maps.new)).toEqual({ x: 100, y: 200 });
  });

  it('animates only when enough node ids overlap', () => {
    const oldNodes = [makeNode('a', 0, 0), makeNode('b', 10, 10)];
    const newNodes = [makeNode('a', 50, 50), makeNode('b', 60, 60)];

    expect(shouldAnimateLayoutTransition(oldNodes, newNodes)).toBe(true);
    expect(shouldAnimateLayoutTransition([], newNodes)).toBe(false);
    expect(
      shouldAnimateLayoutTransition(oldNodes, [makeNode('c', 0, 0), makeNode('d', 0, 0)]),
    ).toBe(false);
  });

  it('interpolates full node list for display', () => {
    const oldNodes = [makeNode('a', 0, 0)];
    const newNodes = [makeNode('a', 20, 40)];
    const maps = buildLayoutTransitionMap(oldNodes, newNodes);
    const end = interpolateLayoutNodes(newNodes, 1, maps)[0]!;

    expect(end.x).toBe(20);
    expect(end.y).toBe(40);
  });
});
