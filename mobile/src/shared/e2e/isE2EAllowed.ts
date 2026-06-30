import { isInternalDebugBuild } from '@/shared/config/buildEnv';

/** E2E hooks are only available in dev or internal TestFlight builds. */
export function isE2EAllowed(): boolean {
  return isInternalDebugBuild();
}
