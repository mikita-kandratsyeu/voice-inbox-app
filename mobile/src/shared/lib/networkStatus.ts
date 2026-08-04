import NetInfo from '@react-native-community/netinfo';

import { resolveNetworkConnected } from './resolveNetworkConnected';

/** Returns true only when the device appears to have internet access. */
export async function fetchIsDeviceOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return resolveNetworkConnected(state) === true;
}

export { resolveNetworkConnected } from './resolveNetworkConnected';
