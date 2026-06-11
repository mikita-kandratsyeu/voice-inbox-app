import { type DeviceMemoryTier, resolveDeviceMemoryTier } from '@/shared/lib/deviceMemoryTier';

export type { DeviceMemoryTier };

export type DeviceCapabilities = {
  memoryTier: DeviceMemoryTier;
  maxExportDimension: number;
  maxSafeExportPixels: number;
  canHandleLargeExport: boolean;
};

let cachedCapabilities: DeviceCapabilities | null = null;

/**
 * Detects device capabilities for graph export.
 * Results are cached for the app lifetime.
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  const memoryTier = resolveDeviceMemoryTier();

  let maxExportDimension: number;
  let maxSafeExportPixels: number;
  let canHandleLargeExport: boolean;

  switch (memoryTier) {
    case 'ultra':
      // High-end devices: full GPU texture limit
      maxExportDimension = 8192;
      maxSafeExportPixels = 8192 * 8192;
      canHandleLargeExport = true;
      break;

    case 'high':
      // Modern devices: can handle large exports but not maximum
      maxExportDimension = 6144;
      maxSafeExportPixels = 6144 * 6144;
      canHandleLargeExport = true;
      break;

    case 'medium':
      // Mid-range devices: conservative limits
      maxExportDimension = 4096;
      maxSafeExportPixels = 4096 * 4096;
      canHandleLargeExport = false;
      break;

    case 'low':
      // Older/budget devices: safe limits to avoid crashes
      maxExportDimension = 2048;
      maxSafeExportPixels = 2048 * 2048;
      canHandleLargeExport = false;
      break;
  }

  cachedCapabilities = {
    memoryTier,
    maxExportDimension,
    maxSafeExportPixels,
    canHandleLargeExport,
  };

  return cachedCapabilities;
}

/**
 * Validates if the requested export dimensions are safe for this device.
 */
export function canDeviceHandleExportSize(width: number, height: number): boolean {
  const capabilities = detectDeviceCapabilities();
  const totalPixels = width * height;

  return (
    width <= capabilities.maxExportDimension &&
    height <= capabilities.maxExportDimension &&
    totalPixels <= capabilities.maxSafeExportPixels
  );
}

/**
 * Adjusts export dimensions to fit device capabilities while preserving aspect ratio.
 */
export function adjustExportDimensionsForDevice(
  requestedWidth: number,
  requestedHeight: number,
): { width: number; height: number; wasAdjusted: boolean } {
  const capabilities = detectDeviceCapabilities();

  // Check if already within limits
  if (canDeviceHandleExportSize(requestedWidth, requestedHeight)) {
    return { width: requestedWidth, height: requestedHeight, wasAdjusted: false };
  }

  // Scale down to fit device limits while preserving aspect ratio
  const aspect = requestedWidth / requestedHeight;
  let width = requestedWidth;
  let height = requestedHeight;

  // First, ensure neither dimension exceeds max
  if (width > capabilities.maxExportDimension) {
    width = capabilities.maxExportDimension;
    height = Math.round(width / aspect);
  }

  if (height > capabilities.maxExportDimension) {
    height = capabilities.maxExportDimension;
    width = Math.round(height * aspect);
  }

  // Then ensure total pixels don't exceed limit
  const totalPixels = width * height;
  if (totalPixels > capabilities.maxSafeExportPixels) {
    const scale = Math.sqrt(capabilities.maxSafeExportPixels / totalPixels);
    width = Math.floor(width * scale);
    height = Math.floor(height * scale);
  }

  return { width, height, wasAdjusted: true };
}
