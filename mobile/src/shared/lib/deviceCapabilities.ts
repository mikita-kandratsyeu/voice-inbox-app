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
  /** Number of GPU layers for LLM inference (0 = CPU only) */
  llmGpuLayers: number;
  /** Optimal batch size for LLM prefill phase */
  llmBatchSize: number;
  /** Optimal micro-batch size for LLM decode phase */
  llmUbatchSize: number;
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

  // iOS always uses Metal GPU acceleration
  // Android uses GPU based on device tier for stability
  let markdownEditorLimit: number;
  let maxExportDimension: number;
  let maxSafeExportPixels: number;
  let canHandleLargeOperations: boolean;
  let llmGpuLayers: number;
  let llmBatchSize: number;
  let llmUbatchSize: number;

  switch (memoryTier) {
    case 'ultra':
      // Latest flagships with 8GB+ RAM
      markdownEditorLimit = 20_000;
      maxExportDimension = 6144;
      maxSafeExportPixels = 6144 * 6144;
      canHandleLargeOperations = true;
      llmGpuLayers = 99; // Full offload to GPU/Metal
      llmBatchSize = 2048;
      llmUbatchSize = 1024;
      break;

    case 'high':
      // Flagship devices from 2022+
      markdownEditorLimit = 15_000;
      maxExportDimension = 4096;
      maxSafeExportPixels = 4096 * 4096;
      canHandleLargeOperations = true;
      llmGpuLayers = 66; // ⅔ layers on GPU
      llmBatchSize = 1536;
      llmUbatchSize = 768;
      break;

    case 'medium':
      // Mid-range devices
      markdownEditorLimit = 8_000;
      maxExportDimension = 4096;
      maxSafeExportPixels = 4096 * 4096;
      canHandleLargeOperations = false;
      llmGpuLayers = 33; // ⅓ layers on GPU (hybrid)
      llmBatchSize = 1024;
      llmUbatchSize = 512;
      break;

    case 'low':
      // Older/budget devices
      markdownEditorLimit = 4_000;
      maxExportDimension = 2048;
      maxSafeExportPixels = 2048 * 2048;
      canHandleLargeOperations = false;
      llmGpuLayers = 0; // CPU only for stability
      llmBatchSize = 512;
      llmUbatchSize = 256;
      break;
  }

  cachedCapabilities = {
    memoryTier,
    markdownEditorLimit,
    maxExportDimension,
    maxSafeExportPixels,
    canHandleLargeOperations,
    llmGpuLayers,
    llmBatchSize,
    llmUbatchSize,
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
