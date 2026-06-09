import type { VoiceRecord } from '@/entities/record';

import { graphNodeSearchText } from '../graphNodeSearchText';
import type { GraphEdge, GraphNode } from '../graphTypes';
import { recordNodeId } from '../graphTypes';
import { layoutNodesWithGlobalForce } from '../runGlobalForceLayout';

function makeRecord(id: string, title: string): VoiceRecord {
  return {
    id,
    title,
    transcript: '',
    duration: '0:00',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'read',
  };
}

function makeRecordNode(record: VoiceRecord): GraphNode {
  return {
    id: recordNodeId(record.id),
    kind: 'record',
    x: 0,
    y: 0,
    searchText: graphNodeSearchText({ kind: 'record', record }),
    record,
  };
}

function minNodeCenterDistance(nodes: GraphNode[]): number {
  let min = Infinity;
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i]!;
      const b = nodes[j]!;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      min = Math.min(min, distance);
    }
  }
  return min;
}

describe('layoutNodesWithGlobalForce', () => {
  it('returns original nodes when the graph is empty', () => {
    expect(layoutNodesWithGlobalForce([], [], 400, 700)).toEqual([]);
  });

  it('assigns distinct positions to connected notes', () => {
    const a = makeRecord('a', 'Alpha');
    const b = makeRecord('b', 'Beta');
    const nodes = [makeRecordNode(a), makeRecordNode(b)];
    const edges: GraphEdge[] = [
      {
        id: 'similar:a|b',
        kind: 'similar',
        sourceId: recordNodeId('a'),
        targetId: recordNodeId('b'),
      },
    ];

    const result = layoutNodesWithGlobalForce(nodes, edges, 400, 700);

    expect(result).toHaveLength(2);
    expect(minNodeCenterDistance(result)).toBeGreaterThan(40);
  });

  it('lays out many weakly connected notes without collapsing', () => {
    const nodes = Array.from({ length: 20 }, (_, index) =>
      makeRecordNode(makeRecord(`note-${index}`, `Note ${index}`)),
    );

    const result = layoutNodesWithGlobalForce(nodes, [], 390, 700);

    expect(result).toHaveLength(20);
    expect(minNodeCenterDistance(result)).toBeGreaterThan(30);
  });

  it('keeps pinned node coordinates', () => {
    const nodes = [
      makeRecordNode(makeRecord('a', 'Alpha')),
      makeRecordNode(makeRecord('b', 'Beta')),
      makeRecordNode(makeRecord('c', 'Gamma')),
    ];
    const edges: GraphEdge[] = [
      {
        id: 'similar:a|b',
        kind: 'similar',
        sourceId: recordNodeId('a'),
        targetId: recordNodeId('b'),
      },
    ];
    const pinned = new Map([[recordNodeId('b'), { x: 420, y: 280 }]]);

    const result = layoutNodesWithGlobalForce(nodes, edges, 900, 700, pinned);
    const pinnedNode = result.find((node) => node.id === recordNodeId('b'));

    expect(pinnedNode?.x).toBe(420);
    expect(pinnedNode?.y).toBe(280);
  });

  it('ignores invalid edges and merges duplicate edge weights', () => {
    const nodes = [
      makeRecordNode(makeRecord('a', 'Alpha')),
      makeRecordNode(makeRecord('b', 'Beta')),
    ];
    const edges: GraphEdge[] = [
      {
        id: 'sharedTag:a|b',
        kind: 'sharedTag',
        sourceId: recordNodeId('a'),
        targetId: recordNodeId('b'),
      },
      {
        id: 'similar:a|b',
        kind: 'similar',
        sourceId: recordNodeId('a'),
        targetId: recordNodeId('b'),
      },
      {
        id: 'self:a',
        kind: 'similar',
        sourceId: recordNodeId('a'),
        targetId: recordNodeId('a'),
      },
      {
        id: 'missing:c',
        kind: 'similar',
        sourceId: recordNodeId('a'),
        targetId: recordNodeId('missing'),
      },
    ];

    const result = layoutNodesWithGlobalForce(nodes, edges, 500, 700);

    expect(result).toHaveLength(2);
    expect(minNodeCenterDistance(result)).toBeGreaterThan(30);
  });
});
