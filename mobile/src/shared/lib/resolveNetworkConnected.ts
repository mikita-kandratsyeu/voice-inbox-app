import type { NetInfoState } from '@react-native-community/netinfo';

/** Maps NetInfo state to app connectivity: true/false when known, null when uncertain. */
export function resolveNetworkConnected(state: NetInfoState): boolean | null {
  if (state.isConnected === false) {
    return false;
  }
  if (state.isConnected !== true) {
    return null;
  }
  if (state.isInternetReachable === false) {
    return false;
  }
  if (state.isInternetReachable === true) {
    return true;
  }
  return null;
}
