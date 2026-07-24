import {
  clipMinimapViewportRect,
  computeMinimapContentBounds,
  computeMinimapViewportRect,
  computeMinimapViewportRectFromBounds,
  computeStaticMinimapFrame,
  getMinimapCanvasSize,
  GRAPH_MINIMAP_VIEWPORT_STROKE,
  minimapToWorldPoint,
  worldToMinimapPoint,
} from '../graphMinimapFrame';
import { nodeBounds } from '../graphNodeMetrics';
import type { GraphNode } from '../graphTypes';

function recordNode(id: string, x: number, y: number): GraphNode {
  return {
    id,
    kind: 'record',
    x,
    y,
    searchText: id,
  };
}

describe('computeStaticMinimapFrame', () => {
  it('frames graph content with padding and ignores inflated world size', () => {
    const nodes = [recordNode('a', 100, 100), recordNode('b', 300, 220)];
    const frame = computeStaticMinimapFrame(nodes, 2400, 2600, 120, 120);

    const contentBottom = Math.max(...nodes.map((node) => nodeBounds(node).bottom));
    expect(frame.minY + frame.height).toBeLessThanOrEqual(contentBottom + 48 + 1);
    expect(frame.scale).toBeGreaterThan(0);
  });

  it('stays stable when viewport transform changes', () => {
    const nodes = [recordNode('a', 120, 140), recordNode('b', 420, 360)];
    const zoomedOut = computeStaticMinimapFrame(nodes, 1200, 1400, 120, 120);
    const zoomedIn = computeStaticMinimapFrame(nodes, 1200, 1400, 120, 120);

    expect(zoomedIn).toEqual(zoomedOut);
  });
});

describe('computeMinimapViewportRect', () => {
  it('moves the viewport indicator while the minimap world stays fixed', () => {
    const nodes = [recordNode('a', 120, 140), recordNode('b', 420, 360)];
    const canvas = getMinimapCanvasSize(120, 120);
    const frame = computeStaticMinimapFrame(nodes, 1200, 1400, canvas.width, canvas.height);
    const inset = GRAPH_MINIMAP_VIEWPORT_STROKE / 2;

    const centered = computeMinimapViewportRect(
      frame,
      nodes,
      canvas.width,
      canvas.height,
      390,
      700,
      -40,
      -20,
      1,
    );
    const panned = computeMinimapViewportRect(
      frame,
      nodes,
      canvas.width,
      canvas.height,
      390,
      700,
      -240,
      -180,
      1,
    );

    expect(centered.x).not.toBe(panned.x);
    expect(centered.y).not.toBe(panned.y);
    expect(panned.x).toBeGreaterThanOrEqual(inset);
    expect(panned.y).toBeGreaterThanOrEqual(inset);
    expect(panned.x + panned.width + inset).toBeLessThanOrEqual(canvas.width);
    expect(panned.y + panned.height + inset).toBeLessThanOrEqual(canvas.height);
  });

  it('clips the viewport indicator inside drawable canvas bounds', () => {
    const canvas = getMinimapCanvasSize(120, 120);
    const clipped = clipMinimapViewportRect(
      { x: -12, y: 4, width: 140, height: 90 },
      canvas.width,
      canvas.height,
    );

    expect(clipped.x).toBeGreaterThanOrEqual(GRAPH_MINIMAP_VIEWPORT_STROKE / 2);
    expect(clipped.y).toBe(4);
    expect(clipped.x + clipped.width).toBeLessThanOrEqual(canvas.width);
    expect(clipped.y + clipped.height).toBeLessThanOrEqual(canvas.height);
  });

  it('fills the minimap when the viewport shows all graph content', () => {
    const nodes = [recordNode('a', 100, 100), recordNode('b', 300, 220)];
    const canvas = getMinimapCanvasSize(120, 120);
    const frame = computeStaticMinimapFrame(nodes, 2400, 2600, canvas.width, canvas.height);
    const viewport = computeMinimapViewportRect(
      frame,
      nodes,
      canvas.width,
      canvas.height,
      390,
      800,
      0,
      0,
      0.3,
    );

    expect(viewport).toEqual({
      x: GRAPH_MINIMAP_VIEWPORT_STROKE / 2,
      y: GRAPH_MINIMAP_VIEWPORT_STROKE / 2,
      width: canvas.width - GRAPH_MINIMAP_VIEWPORT_STROKE,
      height: canvas.height - GRAPH_MINIMAP_VIEWPORT_STROKE,
    });
  });

  it('maps minimap presses only inside the framed canvas area', () => {
    const nodes = [recordNode('a', 120, 140)];
    const canvas = getMinimapCanvasSize(120, 120);
    const frame = computeStaticMinimapFrame(nodes, 1200, 1400, canvas.width, canvas.height);
    const inside = worldToMinimapPoint(180, 200, frame);
    const world = minimapToWorldPoint(inside.x, inside.y, frame, canvas.width, canvas.height);

    expect(world).not.toBeNull();
    expect(world?.x).toBeCloseTo(180, 0);
    expect(world?.y).toBeCloseTo(200, 0);
    expect(minimapToWorldPoint(-1, 2, frame, canvas.width, canvas.height)).toBeNull();
    expect(
      minimapToWorldPoint(2, canvas.height + 1, frame, canvas.width, canvas.height),
    ).toBeNull();
  });

  it('matches computeMinimapViewportRect when using precomputed bounds', () => {
    const nodes = [recordNode('a', 120, 140), recordNode('b', 420, 360)];
    const canvas = getMinimapCanvasSize(120, 120);
    const frame = computeStaticMinimapFrame(nodes, 1200, 1400, canvas.width, canvas.height);
    const bounds = computeMinimapContentBounds(nodes);

    expect(
      computeMinimapViewportRectFromBounds(
        frame,
        bounds,
        canvas.width,
        canvas.height,
        390,
        700,
        -240,
        -180,
        1,
      ),
    ).toEqual(
      computeMinimapViewportRect(
        frame,
        nodes,
        canvas.width,
        canvas.height,
        390,
        700,
        -240,
        -180,
        1,
      ),
    );
  });
});
