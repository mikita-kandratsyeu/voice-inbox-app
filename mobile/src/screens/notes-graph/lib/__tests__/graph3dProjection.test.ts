import {
  buildProjectedGraph3D,
  computeFitCameraDistance,
  computeGraphCenter,
  DEFAULT_GRAPH_3D_CAMERA,
  deriveGraphPoint3D,
  projectPoint3D,
} from '../graph3dProjection';
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

describe('graph3dProjection', () => {
  const nodes = [
    makeNode('record:a', 0, 0),
    makeNode('record:b', 100, 0),
    makeNode('task:a:1', 50, 80, 'task'),
  ];

  it('derives stable z coordinates for the same node id', () => {
    const center = computeGraphCenter(nodes);
    const extent = 100;
    const first = deriveGraphPoint3D(nodes[0], center, extent);
    const second = deriveGraphPoint3D(nodes[0], center, extent);

    expect(first).toEqual(second);
    expect(first.z).toBeGreaterThanOrEqual(-0.4);
    expect(first.z).toBeLessThanOrEqual(0.4);
  });

  it('lifts task nodes above record nodes on average', () => {
    const center = computeGraphCenter(nodes);
    const extent = 100;
    const record = deriveGraphPoint3D(nodes[0], center, extent);
    const task = deriveGraphPoint3D(nodes[2], center, extent);

    expect(task.z).toBeGreaterThan(record.z);
  });

  it('projects farther points with smaller screen scale', () => {
    const viewport = { width: 400, height: 800 };
    const near = projectPoint3D({ x: 0, y: 0, z: 0 }, DEFAULT_GRAPH_3D_CAMERA, viewport);
    const far = projectPoint3D(
      { x: 0, y: 0, z: 0 },
      { ...DEFAULT_GRAPH_3D_CAMERA, distance: DEFAULT_GRAPH_3D_CAMERA.distance + 2 },
      viewport,
    );

    expect(far.scale).toBeLessThan(near.scale);
  });

  it('sorts projected nodes and edges by depth', () => {
    const viewport = { width: 400, height: 800 };
    const { projectedNodes, projectedEdges } = buildProjectedGraph3D(
      nodes,
      [
        {
          id: 'edge-1',
          kind: 'linked',
          sourceId: 'record:a',
          targetId: 'record:b',
        },
      ],
      DEFAULT_GRAPH_3D_CAMERA,
      viewport,
    );

    expect(projectedNodes.length).toBe(3);
    expect(projectedEdges.length).toBe(1);

    for (let index = 1; index < projectedNodes.length; index += 1) {
      expect(projectedNodes[index].depth).toBeGreaterThanOrEqual(projectedNodes[index - 1].depth);
    }

    const sourceNode = projectedNodes.find((entry) => entry.node.id === 'record:a');
    expect(sourceNode).toBeDefined();
    expect(projectedEdges[0].x1).toBeCloseTo(sourceNode!.screenX, 1);
  });

  it('changes projected x when yaw changes', () => {
    const viewport = { width: 400, height: 800 };
    const point = { x: 1, y: 0, z: 0.2 };
    const left = projectPoint3D(point, { yaw: 0, pitch: 0, distance: 3 }, viewport);
    const right = projectPoint3D(point, { yaw: Math.PI / 2, pitch: 0, distance: 3 }, viewport);

    expect(left.x).not.toBeCloseTo(right.x, 0);
  });

  it('computes a fit distance that keeps the graph inside the viewport', () => {
    const distance = computeFitCameraDistance(nodes, [], {
      width: 400,
      height: 800,
    });

    expect(distance).toBeGreaterThanOrEqual(0.35);
    expect(distance).toBeLessThanOrEqual(10);
  });
});
