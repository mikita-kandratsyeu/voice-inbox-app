import {
  buildPrivateRemoteLanProbeTargets,
  deriveIpv4ScanHosts,
  isPrivateOrLinkLocalIpv4,
} from '../privateRemoteLanDiscoveryTargets';

describe('privateRemoteLanDiscovery', () => {
  it('detects private and link-local IPv4 ranges', () => {
    expect(isPrivateOrLinkLocalIpv4('192.168.1.42')).toBe(true);
    expect(isPrivateOrLinkLocalIpv4('10.0.0.5')).toBe(true);
    expect(isPrivateOrLinkLocalIpv4('172.16.3.4')).toBe(true);
    expect(isPrivateOrLinkLocalIpv4('169.254.10.2')).toBe(true);
    expect(isPrivateOrLinkLocalIpv4('8.8.8.8')).toBe(false);
    expect(isPrivateOrLinkLocalIpv4('not-an-ip')).toBe(false);
  });

  it('derives a /24 host list from device IP', () => {
    const hosts = deriveIpv4ScanHosts('192.168.0.42');
    expect(hosts).toHaveLength(254);
    expect(hosts?.[0]).toBe('192.168.0.1');
    expect(hosts?.[253]).toBe('192.168.0.254');
  });

  it('builds localhost and subnet probe targets', () => {
    const targets = buildPrivateRemoteLanProbeTargets('192.168.0.42');
    expect(targets.some((target) => target.host === '127.0.0.1' && target.port === 11434)).toBe(
      true,
    );
    expect(targets.some((target) => target.host === '192.168.0.10' && target.port === 1234)).toBe(
      true,
    );
    expect(targets.length).toBe((254 + 2) * 2);
  });

  it('falls back to localhost probes when device IP is missing', () => {
    const targets = buildPrivateRemoteLanProbeTargets(null);
    expect(targets).toEqual([
      { host: '127.0.0.1', port: 11434, kind: 'ollama' },
      { host: '127.0.0.1', port: 1234, kind: 'lm_studio' },
      { host: 'localhost', port: 11434, kind: 'ollama' },
      { host: 'localhost', port: 1234, kind: 'lm_studio' },
    ]);
  });
});
