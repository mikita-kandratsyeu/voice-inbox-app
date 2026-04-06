import NetInfo from '@react-native-community/netinfo';
import dayjs from 'dayjs';
import * as RNLocalize from 'react-native-localize';
import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { getAiSettingsDiagnostics } from '@/entities/settings';
import { getMobileUserAgent } from '@/shared/config/buildEnv';
import { collectCrashlyticsDiagnostics } from '@/shared/lib/crashlytics';
import { getOrCreateDeviceId } from '@/shared/lib/device-id';
import { IS_ANDROID, IS_IOS } from '@/shared/lib/platform';
import { isBoolean, isNumber, isString } from '@/shared/lib/type-guards';

function safeNum(n: unknown): number | null {
  return isNumber(n) && Number.isFinite(n) ? n : null;
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

  const userAgent = getMobileUserAgent();
  const aiSettings = getAiSettingsDiagnostics();
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
    aiSettings: aiSettings,
    deviceYearClass: safeNum(d.deviceYearClass),
    isLowRamDevice: isBoolean(d.isLowRamDevice) ? d.isLowRamDevice : null,
    totalMemoryBytes: safeNum(d.totalMemory),
    freeDiskBytes,
    isTablet: isBoolean(d.isTablet) ? d.isTablet : null,
    networkType: net.type,
    isConnected: net.isConnected,
    locales: locales.map((l) => ({
      languageTag: l.languageTag,
      languageCode: l.languageCode,
      countryCode: l.countryCode,
    })),
    timeZone: RNLocalize.getTimeZone(),
    userAgent: isString(userAgent) ? userAgent : '',
    collectedAt: dayjs().toISOString(),
  };
}
