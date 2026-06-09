import { GRAPH_DRAG_RECONCILE_MIN_MS } from '../graphDragReconcile';

describe('graphDragReconcile', () => {
  it('exposes a minimum reconcile delay for drag updates', () => {
    expect(GRAPH_DRAG_RECONCILE_MIN_MS).toBeGreaterThan(0);
    expect(GRAPH_DRAG_RECONCILE_MIN_MS).toBe(220);
  });
});
