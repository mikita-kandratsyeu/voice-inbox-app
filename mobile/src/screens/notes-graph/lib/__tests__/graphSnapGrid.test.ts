import { GRAPH_SNAP_GRID_SPACING, snapGraphPointToGrid, snapToGraphGrid } from '../graphSnapGrid';

describe('graphSnapGrid', () => {
  it('snaps scalar coordinates to the nearest grid line', () => {
    expect(snapToGraphGrid(0)).toBe(0);
    expect(snapToGraphGrid(7)).toBe(0);
    expect(snapToGraphGrid(9)).toBe(GRAPH_SNAP_GRID_SPACING);
    expect(snapToGraphGrid(25)).toBe(GRAPH_SNAP_GRID_SPACING * 2);
    expect(snapToGraphGrid(-9)).toBe(-GRAPH_SNAP_GRID_SPACING);
  });

  it('snaps x/y pairs together', () => {
    expect(snapGraphPointToGrid(41, 83)).toEqual({
      x: 48,
      y: 80,
    });
  });
});
