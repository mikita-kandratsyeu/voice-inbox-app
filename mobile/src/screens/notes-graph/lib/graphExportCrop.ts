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

export type CropAspectTemplateId = 'full' | '1:1' | '4:5' | '16:9' | '9:16' | 'custom';

export type CropAspectTemplate = {
  id: Exclude<CropAspectTemplateId, 'custom'>;
  ratio: [number, number] | null;
};

export const CROP_ASPECT_TEMPLATES: CropAspectTemplate[] = [
  { id: 'full', ratio: null },
  { id: '1:1', ratio: [1, 1] },
  { id: '4:5', ratio: [4, 5] },
  { id: '16:9', ratio: [16, 9] },
  { id: '9:16', ratio: [9, 16] },
];

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
    x: Math.round(layout.x + crop.x * layout.scale),
    y: Math.round(layout.y + crop.y * layout.scale),
    width: Math.round(crop.width * layout.scale),
    height: Math.round(crop.height * layout.scale),
  };
}

/** Keep crop frame inside the fitted image — avoids a dark letterbox strip inside the frame. */
export function clipDisplayCropToImageLayout(
  displayCrop: DisplayRect,
  layout: DisplayRect,
): DisplayRect {
  const imageRight = layout.x + layout.width;
  const imageBottom = layout.y + layout.height;
  const x1 = Math.max(displayCrop.x, layout.x);
  const y1 = Math.max(displayCrop.y, layout.y);
  const x2 = Math.min(displayCrop.x + displayCrop.width, imageRight);
  const y2 = Math.min(displayCrop.y + displayCrop.height, imageBottom);

  return {
    x: x1,
    y: y1,
    width: Math.max(0, x2 - x1),
    height: Math.max(0, y2 - y1),
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

export function computeCropForAspectTemplate(
  templateId: Exclude<CropAspectTemplateId, 'custom'>,
  imageSize: ImageSize,
): ImageCropRect {
  if (templateId === 'full') {
    return fullImageCrop(imageSize.width, imageSize.height);
  }

  const template = CROP_ASPECT_TEMPLATES.find((item) => item.id === templateId);
  if (!template?.ratio) {
    return fullImageCrop(imageSize.width, imageSize.height);
  }

  const [aspectWidth, aspectHeight] = template.ratio;
  const targetAspect = aspectWidth / aspectHeight;
  const imageAspect = imageSize.width / imageSize.height;

  let width: number;
  let height: number;

  if (targetAspect >= imageAspect) {
    width = imageSize.width;
    height = width / targetAspect;
  } else {
    height = imageSize.height;
    width = height * targetAspect;
  }

  return clampImageCropRect(
    {
      x: (imageSize.width - width) / 2,
      y: (imageSize.height - height) / 2,
      width,
      height,
    },
    imageSize.width,
    imageSize.height,
  );
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
