import type { GraphEdge, GraphNode } from '../graphTypes';
import { RECORD_NODE_WIDTH, recordNodeId } from '../graphTypes';
import { layoutIsolatedRecordNodes } from '../layoutIsolatedNodes';

function makeRecordNode(id: string, x: number, y: number): GraphNode {
  return {
    id: recordNodeId(id),
    kind: 'record',
    x,
    y,
    searchText: '',
  };
}

describe('layoutIsolatedRecordNodes', () => {
  it('returns nodes unchanged when every record has note links', () => {
    const nodes = [makeRecordNode('a', 10, 20), makeRecordNode('b', 30, 40)];
    const edges: GraphEdge[] = [
      {
        id: 'similar:a|b',
        kind: 'similar',
        sourceId: recordNodeId('a'),
        targetId: recordNodeId('b'),
      },
    ];

    expect(layoutIsolatedRecordNodes(nodes, edges)).toEqual(nodes);
  });

  it('places isolated records below linked notes in a grid', () => {
    const linked = makeRecordNode('linked', 0, 0);
    const isolatedA = makeRecordNode('iso-a', 0, 0);
    const isolatedB = makeRecordNode('iso-b', 0, 0);
    const nodes = [linked, isolatedA, isolatedB];
    const edges: GraphEdge[] = [
      {
        id: 'similar:linked|other',
        kind: 'similar',
        sourceId: recordNodeId('linked'),
        targetId: recordNodeId('other'),
      },
    ];

    const laidOut = layoutIsolatedRecordNodes(nodes, edges, 900);
    const movedA = laidOut.find((node) => node.id === recordNodeId('iso-a'))!;
    const movedB = laidOut.find((node) => node.id === recordNodeId('iso-b'))!;

    expect(linked).toEqual(laidOut.find((node) => node.id === recordNodeId('linked')));
    expect(movedA.y).toBeGreaterThan(82);
    expect(movedB.y).toBe(movedA.y);
    expect(movedB.x).toBeGreaterThan(movedA.x);
    expect(movedB.x - movedA.x).toBe(RECORD_NODE_WIDTH + 36);
  });

  it('ignores contains edges when detecting isolation', () => {
    const record = makeRecordNode('parent', 0, 0);
    const isolated = makeRecordNode('solo', 0, 0);
    const nodes = [record, isolated];
    const edges: GraphEdge[] = [
      {
        id: 'contains:task',
        kind: 'contains',
        sourceId: recordNodeId('parent'),
        targetId: 'task:parent:t1',
      },
    ];

    const laidOut = layoutIsolatedRecordNodes(nodes, edges);
    const moved = laidOut.find((node) => node.id === recordNodeId('solo'))!;

    expect(moved.y).toBeGreaterThan(82);
  });
});
