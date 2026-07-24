import type { VoiceRecord } from '@/entities/record';

import { buildGraphClusters, layoutNodesByClusters } from '../graphClusterLayout';
import { nodeCenter } from '../graphNodeMetrics';
import { graphNodeSearchText } from '../graphNodeSearchText';
import type { GraphEdge, GraphNode } from '../graphTypes';
import { recordNodeId, taskNodeId } from '../graphTypes';
import { minNodeCenterDistance, runForceLayout } from '../runForceLayout';

function makeRecord(id: string, title: string, extras: Partial<VoiceRecord> = {}): VoiceRecord {
  return {
    id,
    title,
    transcript: '',
    duration: '0:00',
    createdAt: '2026-01-01T00:00:00.000Z',
    status: 'read',
    ...extras,
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

function makeTaskNode(recordId: string, taskId: string, text: string): GraphNode {
  return {
    id: taskNodeId(recordId, taskId),
    kind: 'task',
    x: 0,
    y: 0,
    searchText: text.toLowerCase(),
    parentRecordId: recordId,
    task: { id: taskId, text, isDone: false },
  };
}

function clusterCenter(nodes: GraphNode[], folderId: string): { x: number; y: number } {
  const clusterNodes = nodes.filter((node) => node.record?.folderId === folderId);
  const xs = clusterNodes.map((node) => nodeCenter(node).x);
  const ys = clusterNodes.map((node) => nodeCenter(node).y);
  return {
    x: xs.reduce((sum, value) => sum + value, 0) / xs.length,
    y: ys.reduce((sum, value) => sum + value, 0) / ys.length,
  };
}

describe('buildGraphClusters', () => {
  it('groups records in the same folder into one cluster', () => {
    const nodes = [
      makeRecordNode(makeRecord('a', 'A', { folderId: 'f1' })),
      makeRecordNode(makeRecord('b', 'B', { folderId: 'f1' })),
      makeRecordNode(makeRecord('c', 'C', { folderId: 'f2' })),
    ];

    const clusters = buildGraphClusters(nodes, []);

    expect(clusters).toHaveLength(2);
    expect(clusters.find((cluster) => cluster.id === 'folder:f1')?.nodeIds).toHaveLength(2);
    expect(clusters.find((cluster) => cluster.id === 'folder:f2')?.nodeIds).toHaveLength(1);
  });

  it('groups tag-only records by primary tag', () => {
    const nodes = [
      makeRecordNode(makeRecord('a', 'A', { tags: ['Work', 'Home'] })),
      makeRecordNode(makeRecord('b', 'B', { tags: ['home', 'urgent'] })),
      makeRecordNode(makeRecord('c', 'C', { tags: ['Personal'] })),
    ];

    const clusters = buildGraphClusters(nodes, []);

    expect(clusters.find((cluster) => cluster.id === 'tag:home')?.nodeIds).toHaveLength(2);
    expect(clusters.find((cluster) => cluster.id === 'tag:personal')?.nodeIds).toHaveLength(1);
  });
});

describe('layoutNodesByClusters', () => {
  it('places folder clusters far apart on the grid', () => {
    const nodes = [
      makeRecordNode(makeRecord('a', 'A', { folderId: 'f1' })),
      makeRecordNode(makeRecord('b', 'B', { folderId: 'f1' })),
      makeRecordNode(makeRecord('c', 'C', { folderId: 'f2' })),
      makeRecordNode(makeRecord('d', 'D', { folderId: 'f2' })),
    ];
    const edges: GraphEdge[] = [
      {
        id: 'folder:a|b',
        kind: 'sameFolder',
        sourceId: recordNodeId('a'),
        targetId: recordNodeId('b'),
      },
      {
        id: 'folder:c|d',
        kind: 'sameFolder',
        sourceId: recordNodeId('c'),
        targetId: recordNodeId('d'),
      },
    ];

    const laidOut = layoutNodesByClusters(nodes, edges, 900, 700);
    const folderOne = laidOut.filter((node) => node.record?.folderId === 'f1');
    const folderTwo = laidOut.filter((node) => node.record?.folderId === 'f2');
    const centerDistance = Math.hypot(
      (folderOne[0]!.x + folderOne[1]!.x) / 2 - (folderTwo[0]!.x + folderTwo[1]!.x) / 2,
      (folderOne[0]!.y + folderOne[1]!.y) / 2 - (folderTwo[0]!.y + folderTwo[1]!.y) / 2,
    );

    expect(centerDistance).toBeGreaterThan(100);
    expect(minNodeCenterDistance(laidOut)).toBeGreaterThan(48);
  });

  it('keeps nodes in the same folder cluster reasonably close', () => {
    const nodes = [
      makeRecordNode(makeRecord('a', 'A', { folderId: 'f1' })),
      makeRecordNode(makeRecord('b', 'B', { folderId: 'f1' })),
      makeRecordNode(makeRecord('c', 'C', { folderId: 'f1' })),
    ];
    const edges: GraphEdge[] = [
      {
        id: 'folder:a|b',
        kind: 'sameFolder',
        sourceId: recordNodeId('a'),
        targetId: recordNodeId('b'),
      },
      {
        id: 'folder:b|c',
        kind: 'sameFolder',
        sourceId: recordNodeId('b'),
        targetId: recordNodeId('c'),
      },
    ];

    const laidOut = layoutNodesByClusters(nodes, edges, 900, 700);
    const centers = laidOut.map((node) => nodeCenter(node));
    const maxDistance = centers.reduce((max, center, index) => {
      for (let other = index + 1; other < centers.length; other++) {
        const peer = centers[other]!;
        max = Math.max(max, Math.hypot(center.x - peer.x, center.y - peer.y));
      }
      return max;
    }, 0);

    expect(maxDistance).toBeLessThan(420);
  });

  it('uses vertical space on portrait viewports', () => {
    const nodes = Array.from({ length: 9 }, (_, index) =>
      makeRecordNode(makeRecord(`note-${index}`, `Note ${index}`, { folderId: `f-${index}` })),
    );
    const edges: GraphEdge[] = Array.from({ length: 8 }, (_, index) => ({
      id: `similar:${index}`,
      kind: 'similar' as const,
      sourceId: recordNodeId(`note-${index}`),
      targetId: recordNodeId(`note-${index + 1}`),
      weight: 1,
    }));

    const laidOut = layoutNodesByClusters(nodes, edges, 390, 844);
    let minY = Infinity;
    let maxY = -Infinity;

    for (const node of laidOut) {
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y + 86);
    }

    expect(maxY - minY).toBeGreaterThan(220);
  });

  it('does not over-stretch clusters across the viewport on landscape tablets', () => {
    const nodes = Array.from({ length: 8 }, (_, index) =>
      makeRecordNode(makeRecord(`note-${index}`, `Note ${index}`, { folderId: `f-${index}` })),
    );

    const laidOut = layoutNodesByClusters(nodes, [], 1200, 700);
    let minX = Infinity;
    let maxX = -Infinity;

    for (const node of laidOut) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x + 158);
    }

    expect(maxX - minX).toBeLessThan(1100);
    expect(maxX - minX).toBeGreaterThan(500);
  });

  it('places connected folder clusters closer than unrelated ones', () => {
    const nodes = [
      makeRecordNode(makeRecord('a', 'A', { folderId: 'f1' })),
      makeRecordNode(makeRecord('b', 'B', { folderId: 'f2' })),
      makeRecordNode(makeRecord('c', 'C', { folderId: 'f3' })),
    ];
    const edges: GraphEdge[] = [
      {
        id: 'similar:a|b',
        kind: 'similar',
        sourceId: recordNodeId('a'),
        targetId: recordNodeId('b'),
        weight: 1,
      },
    ];

    const laidOut = layoutNodesByClusters(nodes, edges, 1200, 800);
    const f1 = clusterCenter(laidOut, 'f1');
    const f2 = clusterCenter(laidOut, 'f2');
    const f3 = clusterCenter(laidOut, 'f3');
    const connectedDistance = Math.hypot(f1.x - f2.x, f1.y - f2.y);
    const unrelatedDistance = Math.hypot(f1.x - f3.x, f1.y - f3.y);

    expect(connectedDistance).toBeLessThan(unrelatedDistance);
  });

  it('keeps tasks near their parent record inside a folder cluster', () => {
    const record = makeRecord('a', 'Parent note', {
      folderId: 'f1',
      tasks: [
        { id: 't1', text: 'Task one', isDone: false },
        { id: 't2', text: 'Task two', isDone: false },
      ],
    });
    const nodes = [
      makeRecordNode(record),
      makeTaskNode('a', 't1', 'Task one'),
      makeTaskNode('a', 't2', 'Task two'),
    ];
    const edges: GraphEdge[] = [
      {
        id: `contains:${taskNodeId('a', 't1')}`,
        kind: 'contains',
        sourceId: recordNodeId('a'),
        targetId: taskNodeId('a', 't1'),
      },
      {
        id: `contains:${taskNodeId('a', 't2')}`,
        kind: 'contains',
        sourceId: recordNodeId('a'),
        targetId: taskNodeId('a', 't2'),
      },
    ];

    const { nodes: laidOut } = runForceLayout(nodes, edges, 900, 700, undefined, 'cluster');
    const parent = laidOut.find((node) => node.kind === 'record')!;
    const parentCenter = nodeCenter(parent);

    for (const taskId of ['t1', 't2'] as const) {
      const task = laidOut.find((node) => node.id === taskNodeId('a', taskId))!;
      const taskCenter = nodeCenter(task);
      const distance = Math.hypot(taskCenter.x - parentCenter.x, taskCenter.y - parentCenter.y);
      expect(distance).toBeLessThan(180);
    }
  });
});
