import { buildLayoutWorkerRequest, mergeLayoutWorkerResponse } from '../graphLayoutWorkerPayload';
import type { GraphEdge, GraphNode } from '../graphTypes';
import { recordNodeId } from '../graphTypes';

function makeNode(id: string, x: number, y: number): GraphNode {
  return {
    id,
    kind: 'record',
    x,
    y,
    searchText: id,
    record: {
      id: id.replace('record:', ''),
      title: id,
      transcript: '',
      duration: '0:00',
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'read',
    },
  };
}

describe('graphLayoutWorkerPayload', () => {
  it('round-trips positions through worker request/response merge', () => {
    const nodes = [makeNode(recordNodeId('a'), 0, 0), makeNode(recordNodeId('b'), 10, 20)];
    const edges: GraphEdge[] = [];
    const fixed = new Map([['record:a', { x: 5, y: 5 }]]);

    const request = buildLayoutWorkerRequest(nodes, edges, 390, 800, 'force', fixed);

    expect(request.nodes).toHaveLength(2);
    expect(request.fixedPositions).toEqual({ 'record:a': { x: 5, y: 5 } });
    expect(request.nodes[0]).toEqual({
      id: recordNodeId('a'),
      kind: 'record',
      x: 0,
      y: 0,
    });

    const merged = mergeLayoutWorkerResponse(nodes, {
      nodes: [
        { id: recordNodeId('a'), x: 100, y: 200 },
        { id: recordNodeId('b'), x: 300, y: 400 },
      ],
      width: 900,
      height: 700,
    });

    expect(merged[0]?.x).toBe(100);
    expect(merged[0]?.record?.title).toBe(recordNodeId('a'));
    expect(merged[1]?.y).toBe(400);
  });
});
