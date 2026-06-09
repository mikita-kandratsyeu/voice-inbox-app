import type { VoiceRecord } from '@/entities/record';

import { graphNodeSearchText } from '../graphNodeSearchText';
import type { GraphEdge, GraphNode } from '../graphTypes';
import { recordNodeId } from '../graphTypes';
import { computeFocusTransform, minNodeCenterDistance, runForceLayout } from '../runForceLayout';

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

describe('runForceLayout', () => {
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

    const result = runForceLayout(nodes, edges, 400, 700);

    expect(result.nodes).toHaveLength(2);
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);

    expect(minNodeCenterDistance(result.nodes)).toBeGreaterThan(48);
  });

  it('spreads many weakly connected notes instead of collapsing to one point', () => {
    const nodes = Array.from({ length: 36 }, (_, index) =>
      makeRecordNode(makeRecord(`note-${index}`, `Note ${index}`)),
    );
    const edges: GraphEdge[] = [
      {
        id: 'similar:note-0|note-1',
        kind: 'similar',
        sourceId: recordNodeId('note-0'),
        targetId: recordNodeId('note-1'),
      },
      {
        id: 'similar:note-2|note-3',
        kind: 'similar',
        sourceId: recordNodeId('note-2'),
        targetId: recordNodeId('note-3'),
      },
    ];

    const result = runForceLayout(nodes, edges, 390, 700);

    expect(result.nodes).toHaveLength(36);
    expect(result.width).toBeGreaterThan(390);
    expect(result.height).toBeGreaterThan(700);
    expect(minNodeCenterDistance(result.nodes)).toBeGreaterThan(48);
  });

  it('keeps user-pinned node coordinates after relayout', () => {
    const a = makeRecord('a', 'Alpha');
    const b = makeRecord('b', 'Beta');
    const c = makeRecord('c', 'Gamma');
    const nodes = [makeRecordNode(a), makeRecordNode(b), makeRecordNode(c)];
    const edges: GraphEdge[] = [
      {
        id: 'similar:a|b',
        kind: 'similar',
        sourceId: recordNodeId('a'),
        targetId: recordNodeId('b'),
      },
      {
        id: 'similar:b|c',
        kind: 'similar',
        sourceId: recordNodeId('b'),
        targetId: recordNodeId('c'),
      },
    ];

    const pinned = new Map([[recordNodeId('b'), { x: 420, y: 280 }]]);
    const result = runForceLayout(nodes, edges, 400, 700, pinned);
    const pinnedNode = result.nodes.find((node) => node.id === recordNodeId('b'));

    expect(pinnedNode?.x).toBe(420);
    expect(pinnedNode?.y).toBe(280);
  });
});

describe('computeFocusTransform', () => {
  it('centers node in visible viewport when bottom inset is provided', () => {
    const node = makeRecordNode(makeRecord('a', 'Alpha'));
    node.x = 100;
    node.y = 200;

    const fullCenter = computeFocusTransform(node, 400, 800, 1, {});
    const obstructed = computeFocusTransform(node, 400, 800, 1, { bottom: 200, top: 12 });

    expect(obstructed.translateY).toBeLessThan(fullCenter.translateY);
    expect(obstructed.translateX).toBe(fullCenter.translateX);
  });
});
