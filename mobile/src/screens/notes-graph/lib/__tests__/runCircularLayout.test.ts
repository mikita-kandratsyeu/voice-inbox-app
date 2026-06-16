import type { VoiceRecord } from '@/entities/record';

import { nodeCenter, nodeDimensions } from '../graphNodeMetrics';
import { graphNodeSearchText } from '../graphNodeSearchText';
import type { GraphNode } from '../graphTypes';
import { recordNodeId } from '../graphTypes';
import { layoutNodesInCircle } from '../runCircularLayout';

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

describe('layoutNodesInCircle', () => {
  it('places multiple nodes on a ring with similar radius', () => {
    const nodes = Array.from({ length: 8 }, (_, index) =>
      makeRecordNode(makeRecord(`note-${index}`, `Note ${index}`)),
    );

    const laidOut = layoutNodesInCircle(nodes, 900, 700);
    const centers = laidOut.map((node) => nodeCenter(node));
    const centroidX = centers.reduce((sum, point) => sum + point.x, 0) / centers.length;
    const centroidY = centers.reduce((sum, point) => sum + point.y, 0) / centers.length;
    const radii = centers.map((point) => Math.hypot(point.x - centroidX, point.y - centroidY));

    const avgRadius = radii.reduce((sum, radius) => sum + radius, 0) / radii.length;
    const maxDeviation = Math.max(...radii.map((radius) => Math.abs(radius - avgRadius)));

    expect(maxDeviation).toBeLessThan(avgRadius * 0.12);
  });

  it('keeps a large ring inside the viewport bounds', () => {
    const nodes = Array.from({ length: 36 }, (_, index) =>
      makeRecordNode(makeRecord(`note-${index}`, `Note ${index}`)),
    );
    const width = 1200;
    const height = 900;
    const laidOut = layoutNodesInCircle(nodes, width, height);

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of laidOut) {
      const { width: nodeWidth, height: nodeHeight } = nodeDimensions(node.kind);
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + nodeWidth);
      maxY = Math.max(maxY, node.y + nodeHeight);
    }

    expect(minX).toBeGreaterThanOrEqual(0);
    expect(minY).toBeGreaterThanOrEqual(0);
    expect(maxX).toBeLessThanOrEqual(width);
    expect(maxY).toBeLessThanOrEqual(height);
  });

  it('centers a single node in the viewport', () => {
    const node = makeRecordNode(makeRecord('solo', 'Solo'));
    const width = 900;
    const height = 700;

    const [laidOut] = layoutNodesInCircle([node], width, height);
    const { width: nodeWidth, height: nodeHeight } = nodeDimensions(node.kind);

    expect(laidOut?.x).toBe(width / 2 - nodeWidth / 2);
    expect(laidOut?.y).toBe(height / 2 - nodeHeight / 2);
  });

  it('keeps pinned node coordinates', () => {
    const nodes = [
      makeRecordNode(makeRecord('a', 'Alpha')),
      makeRecordNode(makeRecord('b', 'Beta')),
      makeRecordNode(makeRecord('c', 'Gamma')),
    ];
    const pinned = new Map([[recordNodeId('b'), { x: 420, y: 280 }]]);

    const laidOut = layoutNodesInCircle(nodes, 900, 700, pinned);
    const pinnedNode = laidOut.find((node) => node.id === recordNodeId('b'));

    expect(pinnedNode?.x).toBe(420);
    expect(pinnedNode?.y).toBe(280);
  });
});
