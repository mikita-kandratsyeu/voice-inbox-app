import {
  clampImageCropRect,
  clipDisplayCropToImageLayout,
  computeContainLayout,
  computeCropCaptureLayout,
  computeCropForAspectTemplate,
  formatImageCropSize,
  fullImageCrop,
  GRAPH_EXPORT_CROP_CAPTURE_MAX_DIMENSION,
  imageCropToDisplayRect,
  isFullImageCrop,
  resizeImageCropFromHandle,
} from '../graphExportCrop';

describe('graphExportCrop', () => {
  it('computes contain layout centered in the preview box', () => {
    const layout = computeContainLayout(800, 400, 300, 300);

    expect(layout.scale).toBeCloseTo(0.375);
    expect(layout.width).toBeCloseTo(300);
    expect(layout.height).toBeCloseTo(150);
    expect(layout.x).toBeCloseTo(0);
    expect(layout.y).toBeCloseTo(75);
  });

  it('maps image crop coordinates to display coordinates', () => {
    const layout = computeContainLayout(1000, 500, 500, 500);
    const display = imageCropToDisplayRect({ x: 100, y: 50, width: 400, height: 200 }, layout);

    expect(display.x).toBeCloseTo(layout.x + 100 * layout.scale);
    expect(display.y).toBeCloseTo(layout.y + 50 * layout.scale);
    expect(display.width).toBeCloseTo(400 * layout.scale);
    expect(display.height).toBeCloseTo(200 * layout.scale);
  });

  it('clamps crop inside image bounds', () => {
    const crop = clampImageCropRect({ x: 900, y: 450, width: 200, height: 100 }, 1000, 500, 64);

    expect(crop).toEqual({ x: 800, y: 400, width: 200, height: 100 });
  });

  it('detects full-image crop', () => {
    expect(isFullImageCrop(fullImageCrop(1200, 800), 1200, 800)).toBe(true);
    expect(isFullImageCrop({ x: 0, y: 0, width: 1000, height: 800 }, 1200, 800)).toBe(false);
  });

  it('resizes crop from each handle', () => {
    const start = { x: 100, y: 80, width: 400, height: 300 };

    expect(resizeImageCropFromHandle(start, 'bottomRight', { dx: 50, dy: 40 }, 1000, 800)).toEqual({
      x: 100,
      y: 80,
      width: 450,
      height: 340,
    });

    expect(resizeImageCropFromHandle(start, 'topLeft', { dx: 20, dy: 10 }, 1000, 800)).toEqual({
      x: 120,
      y: 90,
      width: 380,
      height: 290,
    });
  });

  it('formats crop size label', () => {
    expect(formatImageCropSize({ x: 0, y: 0, width: 1280.4, height: 720.6 })).toBe('1280 × 721');
  });

  it('clips display crop to fitted image bounds', () => {
    const layout = computeContainLayout(2800, 2556, 360, 380);
    const overshoot = {
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height + 6,
    };

    const clipped = clipDisplayCropToImageLayout(overshoot, layout);

    expect(clipped.height).toBe(layout.height);
    expect(clipped.y + clipped.height).toBeLessThanOrEqual(layout.y + layout.height + 0.5);
  });

  it('centers square crop inside landscape image', () => {
    const crop = computeCropForAspectTemplate('1:1', { width: 2800, height: 2000 });

    expect(crop.width).toBe(2000);
    expect(crop.height).toBe(2000);
    expect(crop.x).toBe(400);
    expect(crop.y).toBe(0);
  });

  it('scales crop capture down for large crops', () => {
    const layout = computeCropCaptureLayout(
      { x: 0, y: 0, width: 5600, height: 5112 },
      { width: 5600, height: 5112 },
    );

    expect(Math.max(layout.shotWidth, layout.shotHeight)).toBeLessThanOrEqual(
      GRAPH_EXPORT_CROP_CAPTURE_MAX_DIMENSION,
    );
  });
});
