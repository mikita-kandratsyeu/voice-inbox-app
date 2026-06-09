/** Matches {@link DottedBackground} dot spacing on the notes graph canvas. */
export const GRAPH_SNAP_GRID_SPACING = 16;

export function snapToGraphGrid(value: number, spacing?: number): number {
  'worklet';
  const step = spacing ?? 16;
  return Math.round(value / step) * step;
}

export function snapGraphPointToGrid(
  x: number,
  y: number,
  spacing?: number,
): { x: number; y: number } {
  'worklet';
  const step = spacing ?? 16;
  return {
    x: snapToGraphGrid(x, step),
    y: snapToGraphGrid(y, step),
  };
}
