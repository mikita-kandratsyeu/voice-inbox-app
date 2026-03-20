import { MOBILE_USER_AGENT } from '@env';
import NetInfo from '@react-native-community/netinfo';
import * as RNLocalize from 'react-native-localize';
import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { collectCrashlyticsDiagnostics } from '@/shared/lib/crashlytics';
import { getOrCreateDeviceId } from '@/shared/lib/device-id';
import { IS_ANDROID, IS_IOS } from '@/shared/lib/platform';
import { isNumber, isString } from '@/shared/lib/type-guards';

function safeNum(n: unknown): number | null {
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

export type SupportDiagnosticsPayload = Record<string, unknown>;

export async function collectSupportDiagnostics(): Promise<SupportDiagnosticsPayload> {
  const deviceId = await getOrCreateDeviceId();
  const crashlytics = await collectCrashlyticsDiagnostics();
  const net = await NetInfo.fetch();
  const locales = RNLocalize.getLocales();

  let freeDiskBytes: number | null = null;
  try {
    freeDiskBytes = safeNum(DeviceInfoModule.getFreeDiskStorage());
  } catch {
    freeDiskBytes = null;
  }

  const d = DeviceInfoModule;
  const buildRaw =
    'buildNumber' in d ? (d as { buildNumber?: string | number }).buildNumber : undefined;
  const buildNumber = isString(buildRaw) || isNumber(buildRaw) ? String(buildRaw) : '';

  return {
    deviceId,
    crashlytics,
    platform: IS_IOS ? 'ios' : IS_ANDROID ? 'android' : 'unknown',
    appVersion: String(d.version ?? ''),
    buildNumber,
    systemName: d.systemName ?? '',
    systemVersion: d.systemVersion ?? '',
    brand: d.brand ?? '',
    model: d.model ?? '',
    deviceYearClass: safeNum(d.deviceYearClass),
    isLowRamDevice: typeof d.isLowRamDevice === 'boolean' ? d.isLowRamDevice : null,
    totalMemoryBytes: safeNum(d.totalMemory),
    freeDiskBytes,
    isTablet: typeof d.isTablet === 'boolean' ? d.isTablet : null,
    networkType: net.type,
    isConnected: net.isConnected,
    locales: locales.map((l) => ({
      languageTag: l.languageTag,
      languageCode: l.languageCode,
      countryCode: l.countryCode,
    })),
    timeZone: RNLocalize.getTimeZone(),
    userAgent: isString(MOBILE_USER_AGENT) ? MOBILE_USER_AGENT : '',
    collectedAt: new Date().toISOString(),
  };
}
