import { type DeviceMemoryTier, resolveDeviceMemoryTier } from './deviceMemoryTier';

export type { DeviceMemoryTier };

/**
 * Unified device capabilities based on memory tier.
 * Cached for app lifetime to avoid repeated checks.
 */
export type DeviceCapabilities = {
  memoryTier: DeviceMemoryTier;
  /** Character limit for comfortable markdown editing */
  markdownEditorLimit: number;
  /** Maximum dimension for graph/image exports */
  maxExportDimension: number;
  /** Maximum safe total pixels for exports */
  maxSafeExportPixels: number;
  /** Can handle large/complex operations */
  canHandleLargeOperations: boolean;
};

let cachedCapabilities: DeviceCapabilities | null = null;

/**
 * Detects and caches device capabilities based on memory tier.
 * Call this once at app startup or lazily on first use.
 *
 * @returns Device capabilities object with limits for various operations
 */
export function getDeviceCapabilities(): DeviceCapabilities {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }

  const memoryTier = resolveDeviceMemoryTier();

  let markdownEditorLimit: number;
  let maxExportDimension: number;
  let maxSafeExportPixels: number;
  let canHandleLargeOperations: boolean;

  switch (memoryTier) {
    case 'ultra':
      // Latest flagships with 8GB+ RAM
      markdownEditorLimit = 20_000;
      maxExportDimension = 8192;
      maxSafeExportPixels = 8192 * 8192;
      canHandleLargeOperations = true;
      break;

    case 'high':
      // Flagship devices from 2022+
      markdownEditorLimit = 15_000;
      maxExportDimension = 6144;
      maxSafeExportPixels = 6144 * 6144;
      canHandleLargeOperations = true;
      break;

    case 'medium':
      // Mid-range devices
      markdownEditorLimit = 8_000;
      maxExportDimension = 4096;
      maxSafeExportPixels = 4096 * 4096;
      canHandleLargeOperations = false;
      break;

    case 'low':
      // Older/budget devices
      markdownEditorLimit = 4_000;
      maxExportDimension = 2048;
      maxSafeExportPixels = 2048 * 2048;
      canHandleLargeOperations = false;
      break;
  }

  cachedCapabilities = {
    memoryTier,
    markdownEditorLimit,
    maxExportDimension,
    maxSafeExportPixels,
    canHandleLargeOperations,
  };

  return cachedCapabilities;
}

/**
 * Resets the cached capabilities. Use only for testing.
 * @internal
 */
export function resetDeviceCapabilitiesCache(): void {
  cachedCapabilities = null;
}
