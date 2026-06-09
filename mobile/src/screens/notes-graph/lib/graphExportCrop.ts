export type ImageSize = { width: number; height: number };

export type ImageCropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DisplayRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const MIN_GRAPH_EXPORT_CROP_SIZE = 64;
export const GRAPH_EXPORT_CROP_CAPTURE_MAX_DIMENSION = 2800;

export type CropResizeHandle =
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight'
  | 'top'
  | 'right'
  | 'bottom'
  | 'left';

export function computeContainLayout(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number,
): DisplayRect & { scale: number } {
  if (imageWidth <= 0 || imageHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { x: 0, y: 0, width: 0, height: 0, scale: 1 };
  }

  const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
    scale,
  };
}

export function fullImageCrop(imageWidth: number, imageHeight: number): ImageCropRect {
  return { x: 0, y: 0, width: imageWidth, height: imageHeight };
}

export function clampImageCropRect(
  rect: ImageCropRect,
  imageWidth: number,
  imageHeight: number,
  minSize = MIN_GRAPH_EXPORT_CROP_SIZE,
): ImageCropRect {
  const width = Math.max(minSize, Math.min(rect.width, imageWidth));
  const height = Math.max(minSize, Math.min(rect.height, imageHeight));
  const x = Math.max(0, Math.min(rect.x, imageWidth - width));
  const y = Math.max(0, Math.min(rect.y, imageHeight - height));

  return { x, y, width, height };
}

export function imageCropToDisplayRect(
  crop: ImageCropRect,
  layout: DisplayRect & { scale: number },
): DisplayRect {
  return {
    x: layout.x + crop.x * layout.scale,
    y: layout.y + crop.y * layout.scale,
    width: crop.width * layout.scale,
    height: crop.height * layout.scale,
  };
}

export function displayDeltaToImageDelta(
  dx: number,
  dy: number,
  scale: number,
): { dx: number; dy: number } {
  if (scale <= 0) {
    return { dx: 0, dy: 0 };
  }

  return { dx: dx / scale, dy: dy / scale };
}

export function resizeImageCropFromHandle(
  start: ImageCropRect,
  handle: CropResizeHandle,
  delta: { dx: number; dy: number },
  imageWidth: number,
  imageHeight: number,
): ImageCropRect {
  let { x, y, width, height } = start;
  const { dx, dy } = delta;

  switch (handle) {
    case 'topLeft':
      x += dx;
      y += dy;
      width -= dx;
      height -= dy;
      break;
    case 'topRight':
      y += dy;
      width += dx;
      height -= dy;
      break;
    case 'bottomLeft':
      x += dx;
      width -= dx;
      height += dy;
      break;
    case 'bottomRight':
      width += dx;
      height += dy;
      break;
    case 'top':
      y += dy;
      height -= dy;
      break;
    case 'right':
      width += dx;
      break;
    case 'bottom':
      height += dy;
      break;
    case 'left':
      x += dx;
      width -= dx;
      break;
  }

  if (width < 0) {
    x += width;
    width = -width;
  }
  if (height < 0) {
    y += height;
    height = -height;
  }

  return clampImageCropRect({ x, y, width, height }, imageWidth, imageHeight);
}

export type CropCaptureLayout = {
  shotWidth: number;
  shotHeight: number;
  imageWidth: number;
  imageHeight: number;
  offsetX: number;
  offsetY: number;
};

/** Scale crop capture down so ViewShot stays within iOS drawViewHierarchy limits. */
export function computeCropCaptureLayout(
  crop: ImageCropRect,
  imageSize: ImageSize,
  maxDimension = GRAPH_EXPORT_CROP_CAPTURE_MAX_DIMENSION,
): CropCaptureLayout {
  const cropMax = Math.max(crop.width, crop.height, 1);
  const scale = cropMax > maxDimension ? maxDimension / cropMax : 1;

  return {
    shotWidth: Math.max(1, Math.round(crop.width * scale)),
    shotHeight: Math.max(1, Math.round(crop.height * scale)),
    imageWidth: imageSize.width * scale,
    imageHeight: imageSize.height * scale,
    offsetX: -crop.x * scale,
    offsetY: -crop.y * scale,
  };
}

export function formatImageCropSize(crop: ImageCropRect): string {
  return `${Math.round(crop.width)} × ${Math.round(crop.height)}`;
}

export function isFullImageCrop(
  crop: ImageCropRect,
  imageWidth: number,
  imageHeight: number,
): boolean {
  const epsilon = 2;

  return (
    crop.x <= epsilon &&
    crop.y <= epsilon &&
    crop.width >= imageWidth - epsilon &&
    crop.height >= imageHeight - epsilon
  );
}
