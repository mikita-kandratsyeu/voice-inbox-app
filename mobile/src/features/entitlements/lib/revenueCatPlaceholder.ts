export const REVENUECAT_INTEGRATION_ENABLED = false;

export async function initRevenueCatWhenReady(): Promise<void> {
  if (!REVENUECAT_INTEGRATION_ENABLED) {
    return;
  }
  //FIXME: await Purchases.configure({ apiKey: '...' });
}
