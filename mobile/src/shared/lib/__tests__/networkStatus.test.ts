import type { NetInfoState } from '@react-native-community/netinfo';

import { resolveNetworkConnected } from '../resolveNetworkConnected';

function netInfo(partial: Partial<NetInfoState>): NetInfoState {
  return partial as NetInfoState;
}

describe('resolveNetworkConnected', () => {
  it('returns false when not connected', () => {
    expect(resolveNetworkConnected(netInfo({ isConnected: false }))).toBe(false);
  });

  it('returns null when connection state is unknown', () => {
    expect(resolveNetworkConnected(netInfo({ isConnected: null }))).toBe(null);
  });

  it('returns false when connected but internet is unreachable', () => {
    expect(
      resolveNetworkConnected(netInfo({ isConnected: true, isInternetReachable: false })),
    ).toBe(false);
  });

  it('returns true when connected and internet is reachable', () => {
    expect(resolveNetworkConnected(netInfo({ isConnected: true, isInternetReachable: true }))).toBe(
      true,
    );
  });

  it('returns null when connected but reachability is unknown', () => {
    expect(resolveNetworkConnected(netInfo({ isConnected: true, isInternetReachable: null }))).toBe(
      null,
    );
  });
});
