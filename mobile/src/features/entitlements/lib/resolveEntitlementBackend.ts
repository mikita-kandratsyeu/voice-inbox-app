import type { EntitlementBackendKind } from '../model/types';

export function getEntitlementBackend(): EntitlementBackendKind {
  return 'license_api';
}
