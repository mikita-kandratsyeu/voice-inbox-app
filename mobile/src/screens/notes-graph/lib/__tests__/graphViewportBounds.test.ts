import {
  clampViewportTranslation,
  computeWorldDimensions,
  GRAPH_PAN_OVERSCROLL,
} from '../graphViewportBounds';

describe('computeWorldDimensions', () => {
  it('is at least viewport size and supports minimum zoom', () => {
    const world = computeWorldDimensions(600, 400, 390, 700, 0.3);
    expect(world.width).toBeGreaterThanOrEqual(390);
    expect(world.height).toBeGreaterThanOrEqual(700);
    expect(world.width).toBeGreaterThanOrEqual(Math.ceil(390 / 0.3));
    expect(world.height).toBeGreaterThanOrEqual(Math.ceil(700 / 0.3));
  });

  it('keeps larger graph layout dimensions when they exceed zoom floor', () => {
    const world = computeWorldDimensions(2400, 3000, 390, 700, 0.3);
    expect(world.width).toBe(2400);
    expect(world.height).toBe(3000);
  });
});

describe('clampViewportTranslation', () => {
  const world = { width: 1200, height: 900 };
  const viewport = { width: 400, height: 600 };

  it('centers world when it is smaller than the viewport', () => {
    const result = clampViewportTranslation(
      0,
      0,
      0.25,
      world.width,
      world.height,
      viewport.width,
      viewport.height,
      GRAPH_PAN_OVERSCROLL,
    );
    expect(result.translateX).toBe((viewport.width - world.width * 0.25) / 2);
    expect(result.translateY).toBe((viewport.height - world.height * 0.25) / 2);
  });

  it('limits panning beyond canvas edges with small overscroll', () => {
    const scale = 1;
    const minX = viewport.width - world.width * scale - GRAPH_PAN_OVERSCROLL;
    const minY = viewport.height - world.height * scale - GRAPH_PAN_OVERSCROLL;

    const tooFarLeft = clampViewportTranslation(
      -900,
      0,
      scale,
      world.width,
      world.height,
      viewport.width,
      viewport.height,
      GRAPH_PAN_OVERSCROLL,
    );
    expect(tooFarLeft.translateX).toBe(minX);

    const tooFarTop = clampViewportTranslation(
      0,
      -900,
      scale,
      world.width,
      world.height,
      viewport.width,
      viewport.height,
      GRAPH_PAN_OVERSCROLL,
    );
    expect(tooFarTop.translateY).toBe(minY);

    const tooFarRight = clampViewportTranslation(
      500,
      0,
      scale,
      world.width,
      world.height,
      viewport.width,
      viewport.height,
      GRAPH_PAN_OVERSCROLL,
    );
    expect(tooFarRight.translateX).toBe(GRAPH_PAN_OVERSCROLL);

    const tooFarBottom = clampViewportTranslation(
      0,
      500,
      scale,
      world.width,
      world.height,
      viewport.width,
      viewport.height,
      GRAPH_PAN_OVERSCROLL,
    );
    expect(tooFarBottom.translateY).toBe(GRAPH_PAN_OVERSCROLL);
  });
});
