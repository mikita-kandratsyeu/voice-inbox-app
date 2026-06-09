import type { GraphEdge } from '../graphTypes';
import { resolveGraphEdgeEmphasis } from '../graphEdgeStyles';

const edge: GraphEdge = {
  id: 'similar:a|b',
  kind: 'similar',
  sourceId: 'record:a',
  targetId: 'record:b',
};

describe('resolveGraphEdgeEmphasis', () => {
  it('highlights edges connected to the active node', () => {
    expect(resolveGraphEdgeEmphasis(edge, null, 'record:a')).toBe('highlighted');
  });

  it('highlights edges between matched search nodes', () => {
    expect(resolveGraphEdgeEmphasis(edge, new Set(['record:a', 'record:b']), null)).toBe(
      'highlighted',
    );
  });

  it('dims edges outside the active search result', () => {
    expect(resolveGraphEdgeEmphasis(edge, new Set(['record:c']), null)).toBe('dimmed');
  });
});
