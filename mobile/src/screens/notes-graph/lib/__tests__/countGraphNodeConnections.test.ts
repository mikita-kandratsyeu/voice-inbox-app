import {
  buildGraphNodeConnectionCounts,
  countGraphNodeConnections,
} from '../countGraphNodeConnections';
import type { GraphEdge } from '../graphTypes';

const edges: GraphEdge[] = [
  { id: 'e1', kind: 'linked', sourceId: 'record:a', targetId: 'record:b' },
  { id: 'e2', kind: 'similar', sourceId: 'record:a', targetId: 'record:c' },
  { id: 'e3', kind: 'contains', sourceId: 'record:a', targetId: 'task:a:1' },
];

describe('countGraphNodeConnections', () => {
  it('counts edges touching a node', () => {
    expect(countGraphNodeConnections('record:a', edges)).toBe(3);
    expect(countGraphNodeConnections('record:b', edges)).toBe(1);
    expect(countGraphNodeConnections('record:z', edges)).toBe(0);
  });
});

describe('buildGraphNodeConnectionCounts', () => {
  it('builds a lookup map for all touched nodes', () => {
    expect(buildGraphNodeConnectionCounts(edges)).toEqual(
      new Map([
        ['record:a', 3],
        ['record:b', 1],
        ['record:c', 1],
        ['task:a:1', 1],
      ]),
    );
  });
});
