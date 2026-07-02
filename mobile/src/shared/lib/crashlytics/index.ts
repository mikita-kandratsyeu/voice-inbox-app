import {
  didCrashOnPreviousExecution,
  getCrashlytics,
  log,
  recordError,
  setAttributes,
  setCrashlyticsCollectionEnabled,
  setUserId,
} from '@react-native-firebase/crashlytics';

import { isCrashlyticsDebugEnabled } from '@/shared/config/buildEnv';
import { diagWarn } from '@/shared/lib/appLogger';

import { buildCrashlyticsAttributes } from './buildCrashlyticsAttributes';

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

export async function syncCrashlyticsContext(): Promise<void> {
  if (!isCrashlyticsCollectionWanted()) return;

  try {
    await setAttributes(getCrashlytics(), buildCrashlyticsAttributes());
  } catch {
    diagWarn('Crashlytics context is not synced');
  }
}

export function logCrashlyticsBreadcrumb(message: string): void {
  const trimmed = message.trim();
  if (!isCrashlyticsCollectionWanted() || !trimmed) return;

  try {
    log(getCrashlytics(), trimmed);
  } catch {
    diagWarn('Crashlytics breadcrumb failed');
  }
}

export function recordCrashlyticsNonFatalError(error: unknown, name?: string): void {
  if (!isCrashlyticsCollectionWanted()) return;

  try {
    const err = error instanceof Error ? error : new Error(String(error));
    recordError(getCrashlytics(), err, name?.trim() || undefined);
  } catch {
    diagWarn('Crashlytics non-fatal error failed');
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
