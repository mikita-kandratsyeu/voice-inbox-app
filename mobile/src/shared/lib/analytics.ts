import { ANALYTICS_DEBUG } from '@env';
import {
  getAnalytics,
  logScreenView,
  setAnalyticsCollectionEnabled,
  setUserId,
} from '@react-native-firebase/analytics';

function isAnalyticsCollectionWanted(): boolean {
  if (!__DEV__) {
    return true;
  }

  const v = ANALYTICS_DEBUG?.trim().toLowerCase();

  return v === '1' || v === 'true' || v === 'yes';
}

export async function initAnalytics(): Promise<void> {
  try {
    const analytics = getAnalytics();
    await setAnalyticsCollectionEnabled(analytics, isAnalyticsCollectionWanted());
  } catch {
    if (__DEV__) console.warn('Analytics is not initialized');
  }
}

export async function syncAnalyticsUserId(deviceId: string): Promise<void> {
  if (!isAnalyticsCollectionWanted() || !deviceId.trim()) return;

  try {
    await setUserId(getAnalytics(), deviceId);
  } catch {
    if (__DEV__) console.warn('Analytics user ID is not synced');
  }
}

export async function logAnalyticsScreenView(screenName: string): Promise<void> {
  if (!isAnalyticsCollectionWanted() || !screenName.trim()) return;

  try {
    await logScreenView(getAnalytics(), {
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch {
    if (__DEV__) console.warn('Analytics screen view failed');
  }
}
