import { buildGraph3DLayout } from '../buildGraph3DLayout';
import type { GraphNode } from '../graphTypes';

function makeNode(id: string, x: number, y: number, kind: GraphNode['kind'] = 'record'): GraphNode {
  return {
    id,
    kind,
    x,
    y,
    searchText: id,
  };
}

function makeFolderRecordNode(id: string, folderId: string, index: number): GraphNode {
  return {
    ...makeNode(id, (index % 12) * 80, Math.floor(index / 12) * 80),
    record: {
      createdAt: '2026-01-01T00:00:00.000Z',
      duration: '0:01',
      folderId,
      id,
      status: 'read',
      tags: [],
      title: id,
      transcript: id,
    },
  };
}

function pointAt(nodePoints: number[], index: number): { x: number; y: number; z: number } {
  const offset = index * 3;
  return {
    x: nodePoints[offset],
    y: nodePoints[offset + 1],
    z: nodePoints[offset + 2],
  };
}

describe('buildGraph3DLayout', () => {
  it('produces stable normalized coordinates for the same graph', () => {
    const nodes = [makeNode('record:a', 0, 0), makeNode('record:b', 120, 40)];
    const first = buildGraph3DLayout(nodes, []);
    const second = buildGraph3DLayout(nodes, []);

    expect(first.nodePoints).toEqual(second.nodePoints);
  });

  it('spreads nodes into 3D volume instead of a flat plane', () => {
    const nodes = [
      makeNode('record:a', 0, 0),
      makeNode('record:b', 100, 0),
      makeNode('record:c', 0, 100),
      makeNode('record:d', 100, 100),
    ];
    const { nodePoints } = buildGraph3DLayout(nodes, []);
    const zValues = [nodePoints[2], nodePoints[5], nodePoints[8], nodePoints[11]];
    const zSpread = Math.max(...zValues) - Math.min(...zValues);

    expect(zSpread).toBeGreaterThan(0.08);
  });

  it('places tasks above their parent record in 3D space', () => {
    const nodes = [makeNode('record:a', 0, 0), makeNode('task:a:1', 20, 20, 'task')];
    const { nodePoints } = buildGraph3DLayout(nodes, [
      {
        id: 'edge-1',
        kind: 'contains',
        sourceId: 'record:a',
        targetId: 'task:a:1',
      },
    ]);

    expect(nodePoints[5]).toBeGreaterThan(nodePoints[2]);
  });

  it('separates large graphs into readable folder clusters', () => {
    const nodes = Array.from({ length: 120 }, (_, index) =>
      makeFolderRecordNode(`record:${index}`, `folder-${index % 12}`, index),
    );

    const { nodePoints } = buildGraph3DLayout(nodes, []);
    const centers = new Map<string, { x: number; y: number; z: number; count: number }>();

    for (let index = 0; index < nodes.length; index += 1) {
      const folderId = nodes[index].record!.folderId!;
      const point = pointAt(nodePoints, index);
      const center = centers.get(folderId) ?? { x: 0, y: 0, z: 0, count: 0 };
      center.x += point.x;
      center.y += point.y;
      center.z += point.z;
      center.count += 1;
      centers.set(folderId, center);
    }

    const normalizedCenters = [...centers.values()].map((center) => ({
      x: center.x / center.count,
      y: center.y / center.count,
      z: center.z / center.count,
    }));

    let nearestClusterDistance = Number.POSITIVE_INFINITY;

    for (let left = 0; left < normalizedCenters.length; left += 1) {
      for (let right = left + 1; right < normalizedCenters.length; right += 1) {
        const dx = normalizedCenters[left].x - normalizedCenters[right].x;
        const dy = normalizedCenters[left].y - normalizedCenters[right].y;
        const dz = normalizedCenters[left].z - normalizedCenters[right].z;
        nearestClusterDistance = Math.min(nearestClusterDistance, Math.hypot(dx, dy, dz));
      }
    }

    expect(nearestClusterDistance).toBeGreaterThan(0.16);
  });

  it('uses a wider 3D envelope for large graphs', () => {
    const nodes = Array.from({ length: 100 }, (_, index) =>
      makeFolderRecordNode(`record:${index}`, `folder-${index % 10}`, index),
    );

    const { nodePoints } = buildGraph3DLayout(nodes, []);
    let maxRadius = 0;

    for (let index = 0; index < nodes.length; index += 1) {
      const point = pointAt(nodePoints, index);
      maxRadius = Math.max(maxRadius, Math.hypot(point.x, point.y, point.z));
    }

    expect(maxRadius).toBeGreaterThan(1);
  });
});
