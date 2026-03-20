import { CRASHLYTICS_DEBUG } from '@env';
import {
  didCrashOnPreviousExecution,
  getCrashlytics,
  setCrashlyticsCollectionEnabled,
  setUserId,
} from '@react-native-firebase/crashlytics';

function isCrashlyticsCollectionWanted(): boolean {
  if (!__DEV__) {
    return true;
  }

  const v = CRASHLYTICS_DEBUG?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export async function initCrashlytics(): Promise<void> {
  try {
    const crashlytics = getCrashlytics();
    await setCrashlyticsCollectionEnabled(crashlytics, isCrashlyticsCollectionWanted());
  } catch {
    if (__DEV__) console.warn('Crashlytics is not initialized');
  }
}

export async function syncCrashlyticsUserId(deviceId: string): Promise<void> {
  if (!isCrashlyticsCollectionWanted() || !deviceId.trim()) return;

  try {
    await setUserId(getCrashlytics(), deviceId);
  } catch {
    if (__DEV__) console.warn('Crashlytics user ID is not synced');
  }
}

export type CrashlyticsDiagnostics = {
  collectionEnabled: boolean;
  didCrashOnPreviousExecution: boolean;
};

export async function collectCrashlyticsDiagnostics(): Promise<CrashlyticsDiagnostics> {
  const fallback: CrashlyticsDiagnostics = {
    collectionEnabled: false,
    didCrashOnPreviousExecution: false,
  };
  try {
    const c = getCrashlytics();
    const previous = await didCrashOnPreviousExecution(c);
    return {
      collectionEnabled: c.isCrashlyticsCollectionEnabled,
      didCrashOnPreviousExecution: previous,
    };
  } catch {
    return fallback;
  }
}
