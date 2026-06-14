import {
  type DeviceMemoryTier,
  getDeviceCapabilities as getSharedCapabilities,
} from '@/shared/lib/deviceCapabilities';

export type { DeviceMemoryTier };

/**
 * Graph-specific device capabilities view.
 * Uses shared device capabilities under the hood.
 */
export type DeviceCapabilities = {
  memoryTier: DeviceMemoryTier;
  maxExportDimension: number;
  maxSafeExportPixels: number;
  canHandleLargeExport: boolean;
};

/**
 * Detects device capabilities for graph export.
 * Delegates to shared capabilities system for consistency.
 *
 * @deprecated Use getDeviceCapabilities from @/shared/lib/deviceCapabilities for new code
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
  const shared = getSharedCapabilities();

  return {
    memoryTier: shared.memoryTier,
    maxExportDimension: shared.maxExportDimension,
    maxSafeExportPixels: shared.maxSafeExportPixels,
    canHandleLargeExport: shared.canHandleLargeOperations,
  };
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
