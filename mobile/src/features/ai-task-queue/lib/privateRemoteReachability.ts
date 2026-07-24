import {
  hydratePrivateRemoteWorkingConfig,
  resolvePrivateRemoteConnectionConfig,
} from '@/entities/settings';
import { testPrivateRemoteConnection } from '@/shared/lib/ai-core/privateRemoteProvider';

const REACHABILITY_CACHE_MS = 45_000;

let cachedReachable: boolean | null = null;
let cachedAtMs = 0;
let inFlightCheck: Promise<boolean> | null = null;

export function invalidatePrivateRemoteReachabilityCache(): void {
  cachedReachable = null;
  cachedAtMs = 0;
}

export async function isPrivateRemoteServerReachable(options?: {
  forceRefresh?: boolean;
}): Promise<boolean> {
  const forceRefresh = options?.forceRefresh === true;
  const now = Date.now();

  if (!forceRefresh && cachedReachable != null && now - cachedAtMs < REACHABILITY_CACHE_MS) {
    return cachedReachable;
  }

  if (!forceRefresh && inFlightCheck) {
    return inFlightCheck;
  }

  inFlightCheck = (async () => {
    hydratePrivateRemoteWorkingConfig();
    const config = resolvePrivateRemoteConnectionConfig();
    if (!config.privateRemoteBaseUrl.trim() || !config.privateRemoteModel.trim()) {
      cachedReachable = false;
      cachedAtMs = Date.now();
      return false;
    }
    const result = await testPrivateRemoteConnection(config);
    cachedReachable = result.ok;
    cachedAtMs = Date.now();
    return result.ok;
  })();

  try {
    return await inFlightCheck;
  } finally {
    inFlightCheck = null;
  }
}
