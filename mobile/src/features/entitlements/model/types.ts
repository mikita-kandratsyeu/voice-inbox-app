export type EntitlementBackendKind = 'license_api' | 'revenuecat_stub';

export type EntitlementPortSnapshot = {
  backend: EntitlementBackendKind;
  isProActive: boolean;
};
