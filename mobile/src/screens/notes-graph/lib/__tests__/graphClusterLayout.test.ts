import type { VoiceRecord } from '@/entities/record';

import { buildGraphClusters, layoutNodesByClusters } from '../graphClusterLayout';
import { graphNodeSearchText } from '../graphNodeSearchText';
import type { GraphEdge, GraphNode } from '../graphTypes';
import { recordNodeId } from '../graphTypes';
import { minNodeCenterDistance } from '../runForceLayout';

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

    expect(centerDistance).toBeGreaterThan(180);
    expect(minNodeCenterDistance(laidOut)).toBeGreaterThan(48);
  });

  it('uses the full viewport width on landscape tablets', () => {
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

    expect(maxX - minX).toBeGreaterThan(900);
  });
});
