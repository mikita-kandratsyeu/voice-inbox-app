import type { NetInfoState } from '@react-native-community/netinfo';

export type PrivateRemoteLanServerKind = 'ollama' | 'lm_studio';

export type PrivateRemoteLanProbeTarget = {
  host: string;
  port: number;
  kind: PrivateRemoteLanServerKind;
};

export type PrivateRemoteLanDiscoveryUnavailableReason = 'not_on_local_network';

export const PRIVATE_REMOTE_LAN_SCAN_PORTS: ReadonlyArray<{
  port: number;
  kind: PrivateRemoteLanServerKind;
}> = [
  { port: 11434, kind: 'ollama' },
  { port: 1234, kind: 'lm_studio' },
];

const LOCALHOST_HOSTS = ['127.0.0.1', 'localhost'] as const;

export function isLocalNetworkNetInfo(state: NetInfoState): boolean {
  if (!state.isConnected) return false;
  return state.type === 'wifi' || state.type === 'ethernet';
}

export function readDeviceLanIpv4(state: NetInfoState): string | null {
  const details = state.details;
  if (!details || !('ipAddress' in details)) return null;
  const ipAddress = details.ipAddress;
  if (typeof ipAddress !== 'string') return null;
  const trimmed = ipAddress.trim();
  return isPrivateOrLinkLocalIpv4(trimmed) ? trimmed : null;
}

export function isPrivateOrLinkLocalIpv4(ip: string): boolean {
  const parts = ip.split('.').map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

export function deriveIpv4ScanHosts(deviceIp: string): string[] | null {
  const parts = deviceIp.split('.');
  if (parts.length !== 4) return null;
  if (!parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255)) {
    return null;
  }
  const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
  const hosts: string[] = [];
  for (let host = 1; host <= 254; host += 1) {
    hosts.push(`${prefix}.${host}`);
  }
  return hosts;
}

export function buildPrivateRemoteLanProbeTargets(
  deviceIp: string | null,
): PrivateRemoteLanProbeTarget[] {
  const hosts = new Set<string>(LOCALHOST_HOSTS);
  if (deviceIp) {
    const subnetHosts = deriveIpv4ScanHosts(deviceIp);
    if (subnetHosts) {
      for (const host of subnetHosts) {
        hosts.add(host);
      }
    }
  }

  const targets: PrivateRemoteLanProbeTarget[] = [];
  for (const host of hosts) {
    for (const { port, kind } of PRIVATE_REMOTE_LAN_SCAN_PORTS) {
      targets.push({ host, port, kind });
    }
  }
  return targets;
}

export function resolvePrivateRemoteLanDiscoveryUnavailableReason(
  state: NetInfoState,
): PrivateRemoteLanDiscoveryUnavailableReason | null {
  if (!isLocalNetworkNetInfo(state)) {
    return 'not_on_local_network';
  }
  return null;
}
