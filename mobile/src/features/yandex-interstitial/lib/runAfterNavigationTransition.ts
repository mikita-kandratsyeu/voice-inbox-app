import { INTERSTITIAL_AFTER_NAVIGATION_DELAY_MS } from '../model/constants';

export function runAfterNavigationTransition(fn: () => void): void {
  setTimeout(fn, INTERSTITIAL_AFTER_NAVIGATION_DELAY_MS);
}
