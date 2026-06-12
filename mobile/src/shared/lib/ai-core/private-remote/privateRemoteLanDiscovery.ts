import { listPrivateRemoteModels } from '../privateRemoteProvider';
import {
  PRIVATE_REMOTE_LAN_PROBE_TIMEOUT_MS,
  PRIVATE_REMOTE_LAN_SCAN_CONCURRENCY,
} from './privateRemoteConstants';
import {
  buildPrivateRemoteLanProbeTargets,
  type PrivateRemoteLanProbeTarget,
  type PrivateRemoteLanServerKind,
} from './privateRemoteLanDiscoveryTargets';

export type {
  PrivateRemoteLanDiscoveryUnavailableReason,
  PrivateRemoteLanProbeTarget,
  PrivateRemoteLanServerKind,
} from './privateRemoteLanDiscoveryTargets';
export {
  buildPrivateRemoteLanProbeTargets,
  deriveIpv4ScanHosts,
  isLocalNetworkNetInfo,
  isPrivateOrLinkLocalIpv4,
  readDeviceLanIpv4,
  resolvePrivateRemoteLanDiscoveryUnavailableReason,
} from './privateRemoteLanDiscoveryTargets';

export type DiscoveredPrivateRemoteServer = {
  baseUrl: string;
  kind: PrivateRemoteLanServerKind;
  modelCount: number;
  sampleModels: string[];
};

export type PrivateRemoteLanDiscoveryProgress = {
  scanned: number;
  total: number;
  currentTarget?: string;
};

function buildBaseUrl(host: string, port: number): string {
  return `http://${host}:${port}`;
}

function sortDiscoveredServers(
  servers: DiscoveredPrivateRemoteServer[],
): DiscoveredPrivateRemoteServer[] {
  const kindOrder: Record<PrivateRemoteLanServerKind, number> = {
    ollama: 0,
    lm_studio: 1,
  };
  return [...servers].sort((left, right) => {
    const kindDiff = kindOrder[left.kind] - kindOrder[right.kind];
    if (kindDiff !== 0) return kindDiff;
    return left.baseUrl.localeCompare(right.baseUrl);
  });
}

async function probeLanTarget(
  target: PrivateRemoteLanProbeTarget,
  apiKey: string,
  signal?: AbortSignal,
): Promise<DiscoveredPrivateRemoteServer | null> {
  if (signal?.aborted) return null;

  const baseUrl = buildBaseUrl(target.host, target.port);
  const result = await listPrivateRemoteModels(
    { privateRemoteBaseUrl: baseUrl, privateRemoteApiKey: apiKey },
    { timeoutMs: PRIVATE_REMOTE_LAN_PROBE_TIMEOUT_MS },
  );

  if (signal?.aborted || !result.ok || result.models.length === 0) {
    return null;
  }

  return {
    baseUrl,
    kind: target.kind,
    modelCount: result.models.length,
    sampleModels: result.models.slice(0, 3),
  };
}

export async function discoverPrivateRemoteServersOnLan(params: {
  deviceIp: string | null;
  apiKey?: string;
  signal?: AbortSignal;
  onProgress?: (progress: PrivateRemoteLanDiscoveryProgress) => void;
}): Promise<DiscoveredPrivateRemoteServer[]> {
  const targets = buildPrivateRemoteLanProbeTargets(params.deviceIp);
  const total = targets.length;
  const apiKey = params.apiKey ?? '';
  const foundByUrl = new Map<string, DiscoveredPrivateRemoteServer>();
  let scanned = 0;

  params.onProgress?.({ scanned: 0, total });

  let nextIndex = 0;
  const workerCount = Math.min(PRIVATE_REMOTE_LAN_SCAN_CONCURRENCY, targets.length);

  const runWorker = async () => {
    while (true) {
      if (params.signal?.aborted) return;
      const index = nextIndex;
      nextIndex += 1;
      if (index >= targets.length) return;

      const target = targets[index];
      const currentTarget = buildBaseUrl(target.host, target.port);
      params.onProgress?.({ scanned, total, currentTarget });
      const discovered = await probeLanTarget(target, apiKey, params.signal);
      scanned += 1;
      params.onProgress?.({ scanned, total, currentTarget });

      if (!discovered || params.signal?.aborted) continue;
      if (!foundByUrl.has(discovered.baseUrl)) {
        foundByUrl.set(discovered.baseUrl, discovered);
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return sortDiscoveredServers([...foundByUrl.values()]);
}
