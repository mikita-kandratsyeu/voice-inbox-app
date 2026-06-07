import {
  didCrashOnPreviousExecution,
  getCrashlytics,
  setCrashlyticsCollectionEnabled,
  setUserId,
} from '@react-native-firebase/crashlytics';

import { isCrashlyticsDebugEnabled } from '@/shared/config/buildEnv';
import { diagWarn } from '@/shared/lib/appLogger';

function isCrashlyticsCollectionWanted(): boolean {
  if (!__DEV__) {
    return true;
  }

  return isCrashlyticsDebugEnabled();
}

export async function initCrashlytics(): Promise<void> {
  try {
    const crashlytics = getCrashlytics();
    await setCrashlyticsCollectionEnabled(crashlytics, isCrashlyticsCollectionWanted());
  } catch {
    diagWarn('Crashlytics is not initialized');
  }
}

export async function syncCrashlyticsUserId(deviceId: string): Promise<void> {
  if (!isCrashlyticsCollectionWanted() || !deviceId.trim()) return;

  try {
    await setUserId(getCrashlytics(), deviceId);
  } catch {
    diagWarn('Crashlytics user ID is not synced');
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
