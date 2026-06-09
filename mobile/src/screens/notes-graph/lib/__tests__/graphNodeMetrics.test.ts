import { nodeBorderAnchor, nodeBounds, nodeCenter, nodeDimensions } from '../graphNodeMetrics';
import type { GraphNode } from '../graphTypes';
import {
  RECORD_NODE_HEIGHT,
  RECORD_NODE_WIDTH,
  TASK_NODE_HEIGHT,
  TASK_NODE_WIDTH,
} from '../graphTypes';

function makeNode(kind: GraphNode['kind'], x: number, y: number): GraphNode {
  return {
    id: kind === 'record' ? 'record:a' : 'task:a:t1',
    kind,
    x,
    y,
    searchText: '',
  };
}

describe('nodeDimensions', () => {
  it('returns record card size', () => {
    expect(nodeDimensions('record')).toEqual({
      width: RECORD_NODE_WIDTH,
      height: RECORD_NODE_HEIGHT,
    });
  });

  it('returns task card size', () => {
    expect(nodeDimensions('task')).toEqual({
      width: TASK_NODE_WIDTH,
      height: TASK_NODE_HEIGHT,
    });
  });
});

describe('nodeCenter', () => {
  it('returns the geometric center of a node card', () => {
    const node = makeNode('record', 100, 200);
    expect(nodeCenter(node)).toEqual({
      x: 100 + RECORD_NODE_WIDTH / 2,
      y: 200 + RECORD_NODE_HEIGHT / 2,
    });
  });
});

describe('nodeBounds', () => {
  it('returns axis-aligned bounds', () => {
    const node = makeNode('task', 50, 60);
    expect(nodeBounds(node)).toEqual({
      left: 50,
      top: 60,
      right: 50 + TASK_NODE_WIDTH,
      bottom: 60 + TASK_NODE_HEIGHT,
    });
  });
});

describe('nodeBorderAnchor', () => {
  it('returns center when target equals node center', () => {
    const node = makeNode('record', 0, 0);
    const center = nodeCenter(node);
    expect(nodeBorderAnchor(node, center)).toEqual(center);
  });

  it('returns a point on the card border toward the target', () => {
    const node = makeNode('record', 0, 0);
    const center = nodeCenter(node);
    const anchor = nodeBorderAnchor(node, { x: 1000, y: center.y });

    expect(anchor.x).toBe(RECORD_NODE_WIDTH);
    expect(anchor.y).toBeCloseTo(center.y);
  });
});
