import {
  computeMapDoubleTapTransform,
  computeMapPanTransform,
  computeMapPinchTransform,
} from '../graphCanvasGestures';

describe('computeMapPinchTransform', () => {
  it('pans when the focal moves without scaling', () => {
    const result = computeMapPinchTransform(1, 0, 0, 200, 300, 1, 260, 340);

    expect(result.scale).toBe(1);
    expect(result.translateX).toBe(120);
    expect(result.translateY).toBe(80);
  });

  it('zooms around the gesture focal point', () => {
    const result = computeMapPinchTransform(1, 0, 0, 200, 300, 2, 200, 300);

    expect(result.scale).toBe(2);
    expect(result.translateX).toBe(-200);
    expect(result.translateY).toBe(-300);
  });

  it('combines focal pan and zoom like map apps', () => {
    const result = computeMapPinchTransform(1, 10, 20, 100, 120, 1.5, 130, 150);

    expect(result.scale).toBe(1.5);
    const worldFocalX = (100 - 10) / 1;
    const worldFocalY = (120 - 20) / 1;
    const expectedX = 130 - worldFocalX * 1.5 + (130 - 100);
    const expectedY = 150 - worldFocalY * 1.5 + (150 - 120);
    expect(result.translateX).toBeCloseTo(expectedX, 5);
    expect(result.translateY).toBeCloseTo(expectedY, 5);
  });
});

describe('computeMapPanTransform', () => {
  it('adds finger translation to the saved viewport offset', () => {
    expect(computeMapPanTransform(40, -12, 18, 6)).toEqual({
      translateX: 58,
      translateY: -6,
    });
  });
});

describe('computeMapDoubleTapTransform', () => {
  it('zooms in around the tapped point', () => {
    const result = computeMapDoubleTapTransform(1, 0, 0, 180, 220, 1.35);

    expect(result.scale).toBe(1.35);
    expect(result.translateX).toBeCloseTo(-63, 5);
    expect(result.translateY).toBeCloseTo(-77, 5);
  });
});
