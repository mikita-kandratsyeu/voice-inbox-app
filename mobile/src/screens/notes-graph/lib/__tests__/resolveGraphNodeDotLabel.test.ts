import type { GraphNode } from '../graphTypes';
import { resolveGraphNodeDotLabel } from '../resolveGraphNodeDotLabel';

function makeNode(overrides: Partial<GraphNode>): GraphNode {
  return {
    id: 'record:a',
    kind: 'record',
    x: 0,
    y: 0,
    searchText: '',
    ...overrides,
  };
}

describe('resolveGraphNodeDotLabel', () => {
  it('returns trimmed record title', () => {
    expect(
      resolveGraphNodeDotLabel(
        makeNode({
          record: { id: 'a', title: '  Weekly review  ' } as GraphNode['record'],
        }),
      ),
    ).toBe('Weekly review');
  });

  it('returns trimmed task text', () => {
    expect(
      resolveGraphNodeDotLabel(
        makeNode({
          kind: 'task',
          task: { id: 't1', text: '  Buy milk  ' } as GraphNode['task'],
        }),
      ),
    ).toBe('Buy milk');
  });

  it('returns null for blank labels', () => {
    expect(
      resolveGraphNodeDotLabel(
        makeNode({
          record: { id: 'a', title: '   ' } as GraphNode['record'],
        }),
      ),
    ).toBeNull();
  });
});
