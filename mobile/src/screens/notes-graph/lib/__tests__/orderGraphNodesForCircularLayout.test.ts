import { graphNodeSearchText } from '../graphNodeSearchText';
import type { GraphEdge, GraphNode } from '../graphTypes';
import { recordNodeId } from '../graphTypes';
import { orderGraphNodesForCircularLayout } from '../orderGraphNodesForCircularLayout';

function makeRecordNode(id: string, title: string): GraphNode {
  return {
    id: recordNodeId(id),
    kind: 'record',
    x: 0,
    y: 0,
    searchText: title.toLowerCase(),
    record: {
      id,
      title,
      transcript: '',
      duration: '0:00',
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'read',
    },
  };
}

describe('orderGraphNodesForCircularLayout', () => {
  it('keeps connected records adjacent on the ring', () => {
    const nodes = [
      makeRecordNode('a', 'A'),
      makeRecordNode('b', 'B'),
      makeRecordNode('c', 'C'),
      makeRecordNode('d', 'D'),
    ];
    const edges: GraphEdge[] = [
      {
        id: 'linked:a|b',
        kind: 'linked',
        sourceId: recordNodeId('a'),
        targetId: recordNodeId('b'),
      },
      {
        id: 'linked:c|d',
        kind: 'linked',
        sourceId: recordNodeId('c'),
        targetId: recordNodeId('d'),
      },
    ];

    const ordered = orderGraphNodesForCircularLayout(nodes, edges);
    const ids = ordered.map((node) => node.id);

    expect(Math.abs(ids.indexOf(recordNodeId('a')) - ids.indexOf(recordNodeId('b')))).toBe(1);
    expect(Math.abs(ids.indexOf(recordNodeId('c')) - ids.indexOf(recordNodeId('d')))).toBe(1);
  });

  it('places tasks immediately after their parent record', () => {
    const parent = makeRecordNode('a', 'A');
    const task: GraphNode = {
      id: 'task:a:t1',
      kind: 'task',
      x: 0,
      y: 0,
      searchText: graphNodeSearchText({
        kind: 'task',
        task: { id: 't1', text: 'Todo', isDone: false },
      }),
      task: { id: 't1', text: 'Todo', isDone: false },
      parentRecordId: 'a',
    };

    const ordered = orderGraphNodesForCircularLayout([parent, task], []);
    expect(ordered.map((node) => node.id)).toEqual([recordNodeId('a'), 'task:a:t1']);
  });
});
