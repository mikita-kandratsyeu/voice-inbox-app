import {
  getAnalytics,
  logEvent,
  setAnalyticsCollectionEnabled,
  setUserId,
} from '@react-native-firebase/analytics';

import { isAnalyticsDebugEnabled } from '@/shared/config/buildEnv';

export function isAnalyticsCollectionWanted(): boolean {
  if (!__DEV__) {
    return true;
  }

  return isAnalyticsDebugEnabled();
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
    await logEvent(getAnalytics(), 'screen_view', {
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch {
    if (__DEV__) console.warn('Analytics screen view failed');
  }
}

export async function logAnalyticsEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): Promise<void> {
  if (!isAnalyticsCollectionWanted() || !name.trim()) return;

  try {
    await logEvent(getAnalytics(), name, params);
  } catch {
    if (__DEV__) console.warn('Analytics event failed', name);
  }
}
