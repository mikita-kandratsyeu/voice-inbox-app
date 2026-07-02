import { DeviceInfoModule } from 'react-native-nitro-device-info';

import { getAiSettingsDiagnostics } from '@/entities/settings';
import { useSettingsStore } from '@/entities/settings/model/store';
import type { SettingsState } from '@/entities/settings/model/types';
import { getHasSeenOnboarding } from '@/features/onboarding/lib/onboardingStorage';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import { getDevicePerformanceProfile } from '@/features/transcription/lib/devicePerformanceProfile';
import { getNodeEnv, isInternalDebugBuild } from '@/shared/config/buildEnv';
import { getWebApiEnvironmentStatus } from '@/shared/config/webApiEnvironment';
import { IS_ANDROID, IS_IOS } from '@/shared/lib/platform';
import { isBoolean, isNumber, isString } from '@/shared/lib/type-guards';

function boolLabel(value: boolean): string {
  return value ? 'yes' : 'no';
}

function readDeviceInfoField(reader: () => string | number | boolean | undefined | null): string {
  try {
    const value = reader();
    if (isString(value) || isNumber(value)) {
      return String(value).trim();
    }
    if (isBoolean(value)) {
      return boolLabel(value);
    }
  } catch {
    // Ignore native module failures during diagnostics collection.
  }

  return '';
}

export type CrashlyticsSettingsSnapshot = Pick<
  SettingsState,
  | 'aiExecutionMode'
  | 'aiModelRoutingMode'
  | 'selectedAIModel'
  | 'selectedLocalAiModel'
  | 'privateAiProvider'
  | 'privateCapabilityTier'
  | 'privateRemoteBaseUrl'
  | 'privateRemoteActiveProfileId'
  | 'selectedWhisperModel'
  | 'selectedWhisperModelFormat'
  | 'iosWhisperKitEngineEnabled'
  | 'transcriptionQualityMode'
  | 'transcriptionLanguage'
  | 'transcriptionDiarizationEnabled'
  | 'autoTranscribeOnSave'
  | 'autoAiAfterTranscription'
  | 'privateAutoAiAfterTranscription'
  | 'appLanguage'
  | 'cloudAiThirdPartyConsentAccepted'
>;

export function settingsSnapshotForCrashlytics(
  settings: CrashlyticsSettingsSnapshot,
): Record<string, string | boolean | null> {
  return {
    aiExecutionMode: settings.aiExecutionMode,
    aiModelRoutingMode: settings.aiModelRoutingMode,
    selectedAIModel: settings.selectedAIModel,
    selectedLocalAiModel: settings.selectedLocalAiModel,
    privateAiProvider: settings.privateAiProvider,
    privateCapabilityTier: settings.privateCapabilityTier,
    privateRemoteConfigured:
      settings.privateRemoteBaseUrl.trim().length > 0 ||
      settings.privateRemoteActiveProfileId != null,
    selectedWhisperModel: settings.selectedWhisperModel,
    selectedWhisperModelFormat: settings.selectedWhisperModelFormat,
    iosWhisperKitEngineEnabled: settings.iosWhisperKitEngineEnabled,
    transcriptionQualityMode: settings.transcriptionQualityMode,
    transcriptionLanguage: settings.transcriptionLanguage,
    transcriptionDiarizationEnabled: settings.transcriptionDiarizationEnabled,
    autoTranscribeOnSave: settings.autoTranscribeOnSave,
    autoAiAfterTranscription: settings.autoAiAfterTranscription,
    privateAutoAiAfterTranscription: settings.privateAutoAiAfterTranscription,
    appLanguage: settings.appLanguage,
    cloudAiThirdPartyConsentAccepted: settings.cloudAiThirdPartyConsentAccepted,
  };
}

export function buildCrashlyticsAttributes(): Record<string, string> {
  const settings = useSettingsStore.getState();
  const aiSettings = getAiSettingsDiagnostics();
  const perf = getDevicePerformanceProfile({ respectPowerMode: false });

  const privateRemoteConfigured =
    settings.privateRemoteBaseUrl.trim().length > 0 ||
    settings.privateRemoteActiveProfileId != null;

  const attrs: Record<string, string> = {
    platform: IS_IOS ? 'ios' : IS_ANDROID ? 'android' : 'unknown',
    app_version: readDeviceInfoField(() => DeviceInfoModule.version),
    build_number: readDeviceInfoField(() =>
      'buildNumber' in DeviceInfoModule
        ? (DeviceInfoModule as { buildNumber?: string | number }).buildNumber
        : undefined,
    ),
    system_version: readDeviceInfoField(() => DeviceInfoModule.systemVersion),
    device_model: [DeviceInfoModule.brand, DeviceInfoModule.model].filter(Boolean).join(' ').trim(),
    device_perf_tier: perf.tier,
    is_low_ram: boolLabel(DeviceInfoModule.isLowRamDevice === true),
    web_api_env: getWebApiEnvironmentStatus(),
    node_env: getNodeEnv(),
    is_internal_build: boolLabel(isInternalDebugBuild()),
    is_pro: boolLabel(isProActiveFromStorageSync()),
    has_seen_onboarding: boolLabel(getHasSeenOnboarding()),
    app_language: settings.appLanguage,
    ai_execution_mode: settings.aiExecutionMode,
    ai_model_routing: settings.aiModelRoutingMode,
    cloud_ai_model: aiSettings.selectedOpenRouterModelId,
    ai_user_tier: aiSettings.userTier,
    private_ai_provider: settings.privateAiProvider,
    private_capability: settings.privateCapabilityTier,
    private_remote_configured: boolLabel(privateRemoteConfigured),
    whisper_model: settings.selectedWhisperModel,
    whisper_format: settings.selectedWhisperModelFormat,
    whisperkit_engine: boolLabel(IS_IOS && settings.iosWhisperKitEngineEnabled),
    transcription_quality: settings.transcriptionQualityMode,
    transcription_language: settings.transcriptionLanguage,
    transcription_diarization: boolLabel(settings.transcriptionDiarizationEnabled),
    auto_transcribe: boolLabel(settings.autoTranscribeOnSave),
    auto_ai_smart: boolLabel(settings.autoAiAfterTranscription),
    auto_ai_private: boolLabel(settings.privateAutoAiAfterTranscription),
    cloud_ai_consent: boolLabel(settings.cloudAiThirdPartyConsentAccepted),
  };

  if (settings.selectedLocalAiModel) {
    attrs.local_ai_model = settings.selectedLocalAiModel;
  }

  return attrs;
}
