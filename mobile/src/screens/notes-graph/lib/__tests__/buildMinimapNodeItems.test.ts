import { buildMinimapNodeItems } from '../buildMinimapNodeItems';
import { computeStaticMinimapFrame } from '../graphMinimapFrame';
import type { GraphNode } from '../graphTypes';

function recordNode(id: string, x: number, y: number): GraphNode {
  return {
    id,
    kind: 'record',
    x,
    y,
    searchText: id,
  };
}

describe('buildMinimapNodeItems', () => {
  it('maps node bounds into minimap coordinates', () => {
    const nodes = [recordNode('a', 100, 120), recordNode('b', 280, 260)];
    const frame = computeStaticMinimapFrame(nodes, 1200, 1400, 118, 118);
    const items = buildMinimapNodeItems(nodes, frame);

    expect(items).toHaveLength(2);
    expect(items[0]?.width).toBeGreaterThanOrEqual(3);
    expect(items[0]?.height).toBeGreaterThanOrEqual(3);
  });
});
