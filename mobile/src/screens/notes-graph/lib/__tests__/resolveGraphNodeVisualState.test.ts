import type { GraphEdge } from '../graphTypes';
import {
  buildGraphActiveNeighborIds,
  graphNodeStackOrder,
  resolveGraphNodeVisualState,
} from '../resolveGraphNodeVisualState';

const edges: GraphEdge[] = [
  { id: 'e1', kind: 'linked', sourceId: 'record:a', targetId: 'record:b' },
  { id: 'e2', kind: 'similar', sourceId: 'record:a', targetId: 'record:c' },
  { id: 'e3', kind: 'contains', sourceId: 'record:a', targetId: 'task:a:1' },
];

describe('buildGraphActiveNeighborIds', () => {
  it('returns nodes directly connected to the active node', () => {
    expect(buildGraphActiveNeighborIds('record:a', edges)).toEqual(
      new Set(['record:b', 'record:c', 'task:a:1']),
    );
  });
});

describe('resolveGraphNodeVisualState', () => {
  const neighbors = buildGraphActiveNeighborIds('record:a', edges);

  it('keeps active node and neighbors bright, dims the rest', () => {
    expect(resolveGraphNodeVisualState('record:a', 'record:a', neighbors, null)).toEqual({
      active: true,
      neighbor: false,
      dimmed: false,
      highlighted: true,
    });
    expect(resolveGraphNodeVisualState('record:b', 'record:a', neighbors, null)).toEqual({
      active: false,
      neighbor: true,
      dimmed: false,
      highlighted: true,
    });
    expect(resolveGraphNodeVisualState('record:z', 'record:a', neighbors, null)).toEqual({
      active: false,
      neighbor: false,
      dimmed: true,
      highlighted: false,
    });
  });

  it('falls back to search highlighting when nothing is active', () => {
    const matched = new Set(['record:b', 'record:c']);
    expect(resolveGraphNodeVisualState('record:b', null, new Set(), matched)).toEqual({
      active: false,
      neighbor: false,
      dimmed: false,
      highlighted: true,
    });
    expect(resolveGraphNodeVisualState('record:z', null, new Set(), matched)).toEqual({
      active: false,
      neighbor: false,
      dimmed: true,
      highlighted: false,
    });
  });
});

describe('graphNodeStackOrder', () => {
  it('raises active and neighbor nodes above the rest', () => {
    expect(
      graphNodeStackOrder({ active: true, neighbor: false, dimmed: false, highlighted: true }),
    ).toBeGreaterThan(
      graphNodeStackOrder({ active: false, neighbor: true, dimmed: false, highlighted: true }),
    );
    expect(
      graphNodeStackOrder({ active: false, neighbor: true, dimmed: false, highlighted: true }),
    ).toBeGreaterThan(
      graphNodeStackOrder({ active: false, neighbor: false, dimmed: true, highlighted: false }),
    );
  });
});
