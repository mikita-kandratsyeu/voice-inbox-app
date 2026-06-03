import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, Crown } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  Switch,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { openPlanPaywall } from '@/app/navigation/openPlanPaywall';
import type { SettingsStackParamList } from '@/app/navigation/types';
import type {
  AiOutputLanguage,
  PrivateAiProvider,
  PrivateLocalLlmBudget,
  PrivateRemoteOutputBudget,
  SummaryStyle,
  TaskStrictness,
} from '@/entities/settings';
import { useSettingsStore } from '@/entities/settings';
import { type CloudAiKvTtlSeconds } from '@/entities/settings/lib/cloudAiKvTtl';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { useProEntitlement } from '@/features/pro-license';
import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import {
  type PrivateRemoteConnectionFailureReason,
  testPrivateRemoteConnection,
} from '@/shared/lib/ai-core/privateRemoteProvider';
import {
  getCachesDirectoryPath,
  getReadableDocumentPickerFsPath,
  NitroFS,
  pickSingleFileToCachesDirectory,
} from '@/shared/lib/fs';
import {
  AppBottomSheetModal,
  ScreenHeader,
  SettingsRow,
  SettingsSection,
  SheetFooterButtons,
  useBottomSheetContentPadding,
} from '@/shared/ui';

import { AutomationComingSoonSheet } from './AutomationComingSoonSheet';
import { CloudAiKvTtlSlider } from './CloudAiKvTtlSlider';
import { PrivateRemoteModelList } from './PrivateRemoteModelList';
import { PrivateRemoteSavedConnectionsList } from './PrivateRemoteSavedConnectionsList';

const SUMMARY_STYLES: SummaryStyle[] = ['brief', 'standard', 'detailed'];
const TASK_STRICTNESS_OPTIONS: TaskStrictness[] = ['strict', 'balanced', 'soft'];
const OUTPUT_LANGUAGES: AiOutputLanguage[] = ['same', 'ru', 'en'];
const PRIVATE_LOCAL_LLM_BUDGETS: PrivateLocalLlmBudget[] = ['efficient', 'balanced', 'expanded'];
const PRIVATE_REMOTE_OUTPUT_BUDGETS: PrivateRemoteOutputBudget[] = [
  'efficient',
  'balanced',
  'expanded',
  'unlimited',
];
const PRIVATE_AI_PROVIDERS: PrivateAiProvider[] = ['local', 'custom_openai'];
const PRIVATE_QUICK_TEMPLATES = [
  {
    id: 'ollama',
    baseUrl: 'http://127.0.0.1:11434',
    model: 'qwen2.5:7b-instruct',
  },
  {
    id: 'lm_studio',
    baseUrl: 'http://127.0.0.1:1234',
    model: 'openai/gpt-oss-20b',
  },
  {
    id: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5.5',
  },
  {
    id: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-v4-pro',
  },
  {
    id: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'google/gemini-3.1-flash-lite',
  },
  {
    id: 'google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-3.5-flash',
  },
] as const;

const PRIVATE_REMOTE_PROFILES_EXPORT_VERSION = 1 as const;

type ExportableRemoteProfile = {
  name: string;
  baseUrl: string;
  model: string;
};

type PrivateRemoteProfilesExportPayload = {
  version: typeof PRIVATE_REMOTE_PROFILES_EXPORT_VERSION;
  exportedAt: string;
  profiles: ExportableRemoteProfile[];
};

function toFsPath(uri: string): string {
  return uri.startsWith('file://') ? uri.slice(7) : uri;
}

function validatePrivateBaseUrl(baseUrl: string): string | null {
  const trimmed = baseUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'invalid_protocol';
    }
    if (!parsed.hostname.trim()) {
      return 'missing_host';
    }
    return null;
  } catch {
    return 'invalid_format';
  }
}

type PickerRowProps<T extends string | number> = {
  options: readonly T[];
  selected: T;
  onSelect: (value: T) => void;
  labelKey: (value: T) => string;
  color: Colors;
};

function PickerSection<T extends string | number>({
  options,
  selected,
  onSelect,
  labelKey,
  color,
}: PickerRowProps<T>) {
  return (
    <View
      className="overflow-hidden rounded-2xl"
      style={{ backgroundColor: color.background.card }}
    >
      {options.map((opt, index) => {
        const isSelected = opt === selected;
        const isLast = index === options.length - 1;
        const rowKey = typeof opt === 'number' ? `n-${opt}` : opt;
        return (
          <TouchableOpacity
            key={rowKey}
            onPress={() => onSelect(opt)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={labelKey(opt)}
            accessibilityState={{ selected: isSelected }}
            className="flex-row items-center justify-between px-4 py-3.5"
            style={
              !isLast
                ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
                : undefined
            }
          >
            <Text className="text-[16px]" style={{ color: color.text.primary }}>
              {labelKey(opt)}
            </Text>
            {isSelected ? (
              <View
                className="h-6 w-6 rounded-full items-center justify-center"
                style={{ backgroundColor: color.accent.primary }}
              >
                <Check size={14} color="#ffffff" strokeWidth={2.5} />
              </View>
            ) : (
              <View
                className="h-6 w-6 rounded-full"
                style={{ borderWidth: 2, borderColor: color.border.default }}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export const AiSettingsScreen = () => {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const route = useRoute<RouteProp<SettingsStackParamList, 'AiSettings'>>();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const isTablet = useIsTablet();

  const summaryStyle = useSettingsStore((s) => s.summaryStyle);
  const setSummaryStyle = useSettingsStore((s) => s.setSummaryStyle);
  const taskStrictness = useSettingsStore((s) => s.taskStrictness);
  const setTaskStrictness = useSettingsStore((s) => s.setTaskStrictness);
  const aiOutputLanguage = useSettingsStore((s) => s.aiOutputLanguage);
  const setAiOutputLanguage = useSettingsStore((s) => s.setAiOutputLanguage);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateLocalLlmBudget = useSettingsStore((s) => s.privateLocalLlmBudget);
  const setPrivateLocalLlmBudget = useSettingsStore((s) => s.setPrivateLocalLlmBudget);
  const privateRemoteOutputBudget = useSettingsStore((s) => s.privateRemoteOutputBudget);
  const setPrivateRemoteOutputBudget = useSettingsStore((s) => s.setPrivateRemoteOutputBudget);
  const privateRemotePreferJsonObject = useSettingsStore((s) => s.privateRemotePreferJsonObject);
  const setPrivateRemotePreferJsonObject = useSettingsStore(
    (s) => s.setPrivateRemotePreferJsonObject,
  );
  const [remoteModelListNonce, setRemoteModelListNonce] = React.useState(0);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const setPrivateAiProvider = useSettingsStore((s) => s.setPrivateAiProvider);
  const privateRemoteBaseUrl = useSettingsStore((s) => s.privateRemoteBaseUrl);
  const setPrivateRemoteBaseUrl = useSettingsStore((s) => s.setPrivateRemoteBaseUrl);
  const privateRemoteApiKey = useSettingsStore((s) => s.privateRemoteApiKey);
  const setPrivateRemoteApiKey = useSettingsStore((s) => s.setPrivateRemoteApiKey);
  const privateRemoteModel = useSettingsStore((s) => s.privateRemoteModel);
  const setPrivateRemoteModel = useSettingsStore((s) => s.setPrivateRemoteModel);
  const privateRemoteLastSuccessfulBaseUrl = useSettingsStore(
    (s) => s.privateRemoteLastSuccessfulBaseUrl,
  );
  const privateRemoteLastSuccessfulApiKey = useSettingsStore(
    (s) => s.privateRemoteLastSuccessfulApiKey,
  );
  const privateRemoteLastSuccessfulModel = useSettingsStore(
    (s) => s.privateRemoteLastSuccessfulModel,
  );
  const setPrivateRemoteLastSuccessfulConfig = useSettingsStore(
    (s) => s.setPrivateRemoteLastSuccessfulConfig,
  );
  const privateRemoteProfiles = useSettingsStore((s) => s.privateRemoteProfiles);
  const privateRemoteActiveProfileId = useSettingsStore((s) => s.privateRemoteActiveProfileId);
  const upsertPrivateRemoteProfile = useSettingsStore((s) => s.upsertPrivateRemoteProfile);
  const setPrivateRemoteActiveProfile = useSettingsStore((s) => s.setPrivateRemoteActiveProfile);
  const removePrivateRemoteProfile = useSettingsStore((s) => s.removePrivateRemoteProfile);
  const cloudAiKvTtlSeconds = useSettingsStore((s) => s.cloudAiKvTtlSeconds);
  const setCloudAiKvTtlSeconds = useSettingsStore((s) => s.setCloudAiKvTtlSeconds);
  const showSummaryReasoningInNotes = useSettingsStore((s) => s.showSummaryReasoningInNotes);
  const setShowSummaryReasoningInNotes = useSettingsStore((s) => s.setShowSummaryReasoningInNotes);
  const autoRefreshMeetingSpeakersOnRegen = useSettingsStore(
    (s) => s.autoRefreshMeetingSpeakersOnRegen,
  );
  const setAutoRefreshMeetingSpeakersOnRegen = useSettingsStore(
    (s) => s.setAutoRefreshMeetingSpeakersOnRegen,
  );
  const { isProActive } = useProEntitlement();
  const isPrivateMode = aiExecutionMode === 'private_experimental';
  const customProviderLocked = !isProActive;
  const showMeetingSpeakerSettings = isProActive && !isPrivateMode;
  const [privateServerProSheet, setPrivateServerProSheet] = React.useState(false);
  const [isTestingConnection, setIsTestingConnection] = React.useState(false);
  const [isAutoTestingProviderConnection, setIsAutoTestingProviderConnection] =
    React.useState(false);
  const [isExportingProfiles, setIsExportingProfiles] = React.useState(false);
  const [isImportingProfiles, setIsImportingProfiles] = React.useState(false);
  const [lastConnectionCheckOk, setLastConnectionCheckOk] = React.useState<boolean | null>(null);
  const [lastConnectionFailureReason, setLastConnectionFailureReason] =
    React.useState<PrivateRemoteConnectionFailureReason | null>(null);
  const didRunInitialProviderCheckRef = React.useRef(false);
  const didTouchRemoteConfigRef = React.useRef(false);
  const [remoteConfigSheetVisible, setRemoteConfigSheetVisible] = React.useState(false);
  const [previousProfileBeforeCreateId, setPreviousProfileBeforeCreateId] = React.useState<
    string | null
  >(null);
  const sheetContentPadding = useBottomSheetContentPadding(16);

  React.useEffect(() => {
    if (customProviderLocked && privateAiProvider === 'custom_openai') {
      setPrivateAiProvider('local');
    }
  }, [customProviderLocked, privateAiProvider, setPrivateAiProvider]);

  React.useEffect(() => {
    if (privateAiProvider !== 'custom_openai') return;
    if (didTouchRemoteConfigRef.current) return;
    const isCreatingNewConnection =
      privateRemoteActiveProfileId == null && privateRemoteProfiles.length > 0;
    if (isCreatingNewConnection) return;
    const needsBaseUrl = privateRemoteBaseUrl.trim().length === 0;
    const needsModel = privateRemoteModel.trim().length === 0;
    const hasLastSuccess =
      privateRemoteLastSuccessfulBaseUrl.trim().length > 0 &&
      privateRemoteLastSuccessfulModel.trim().length > 0;
    if (!hasLastSuccess || (!needsBaseUrl && !needsModel)) return;

    setPrivateRemoteBaseUrl(privateRemoteLastSuccessfulBaseUrl);
    setPrivateRemoteModel(privateRemoteLastSuccessfulModel);
    if (
      privateRemoteApiKey.trim().length === 0 &&
      privateRemoteLastSuccessfulApiKey.trim().length > 0
    ) {
      setPrivateRemoteApiKey(privateRemoteLastSuccessfulApiKey);
    }
  }, [
    privateAiProvider,
    privateRemoteBaseUrl,
    privateRemoteModel,
    privateRemoteApiKey,
    privateRemoteActiveProfileId,
    privateRemoteProfiles.length,
    privateRemoteLastSuccessfulBaseUrl,
    privateRemoteLastSuccessfulApiKey,
    privateRemoteLastSuccessfulModel,
    setPrivateRemoteBaseUrl,
    setPrivateRemoteModel,
    setPrivateRemoteApiKey,
  ]);

  const cloudRetentionLabel = (sec: CloudAiKvTtlSeconds) =>
    t(`aiSettings.smartModeCloudRetention.m${sec}`);
  const baseUrlValidationError = React.useMemo(
    () => validatePrivateBaseUrl(privateRemoteBaseUrl),
    [privateRemoteBaseUrl],
  );
  const hasSavedRemoteConfig =
    privateRemoteLastSuccessfulBaseUrl.trim().length > 0 &&
    privateRemoteLastSuccessfulModel.trim().length > 0;
  const connectionCheckInProgress = isTestingConnection || isAutoTestingProviderConnection;
  const remoteConnectionStatusLabel = connectionCheckInProgress
    ? t('aiSettings.privateProvider.connectionStatus.checking')
    : lastConnectionCheckOk == null
      ? hasSavedRemoteConfig
        ? t('aiSettings.privateProvider.connectionStatus.connected')
        : t('aiSettings.privateProvider.connectionStatus.disconnected')
      : lastConnectionCheckOk
        ? t('aiSettings.privateProvider.connectionStatus.connected')
        : lastConnectionFailureReason === 'auth_failed'
          ? t('aiSettings.privateProvider.connectionStatus.authFailed')
          : lastConnectionFailureReason === 'model_not_found'
            ? t('aiSettings.privateProvider.connectionStatus.modelNotFound')
            : lastConnectionFailureReason === 'server_unreachable'
              ? t('aiSettings.privateProvider.connectionStatus.serverUnavailable')
              : t('aiSettings.privateProvider.connectionStatus.invalidResponse');
  const remoteConnectionStatusColor = connectionCheckInProgress
    ? color.text.muted
    : lastConnectionCheckOk === true
      ? color.accent.aiData
      : color.accent.delete;
  const isRemoteModelFilled = privateRemoteModel.trim().length > 0;
  const canTestConnection =
    baseUrlValidationError == null && isRemoteModelFilled && !isTestingConnection;
  const isCreatingNewConnection = privateRemoteActiveProfileId == null;
  const hasSavedProfiles = privateRemoteProfiles.length > 0;
  const switchToCreateConnectionMode = React.useCallback(() => {
    didTouchRemoteConfigRef.current = false;
    setPreviousProfileBeforeCreateId(privateRemoteActiveProfileId);
    setPrivateRemoteActiveProfile(null);
    setPrivateRemoteBaseUrl('');
    setPrivateRemoteApiKey('');
    setPrivateRemoteModel('');
  }, [
    privateRemoteActiveProfileId,
    setPrivateRemoteActiveProfile,
    setPrivateRemoteApiKey,
    setPrivateRemoteBaseUrl,
    setPrivateRemoteModel,
  ]);
  const switchToSavedConnectionMode = React.useCallback(() => {
    didTouchRemoteConfigRef.current = false;
    const restoreProfileId = previousProfileBeforeCreateId ?? privateRemoteProfiles[0]?.id ?? null;
    if (restoreProfileId) {
      setPrivateRemoteActiveProfile(restoreProfileId);
    }
    setPreviousProfileBeforeCreateId(null);
  }, [previousProfileBeforeCreateId, privateRemoteProfiles, setPrivateRemoteActiveProfile]);
  const openRemoteConfigSheet = React.useCallback(() => {
    didTouchRemoteConfigRef.current = false;
    if (privateRemoteProfiles.length > 0) {
      // Keep default state predictable on open: edit saved connection if any exist.
      const defaultProfileId = privateRemoteActiveProfileId ?? privateRemoteProfiles[0]?.id ?? null;
      if (defaultProfileId) {
        setPrivateRemoteActiveProfile(defaultProfileId);
      }
      setPreviousProfileBeforeCreateId(null);
    } else {
      setPrivateRemoteActiveProfile(null);
      setPreviousProfileBeforeCreateId(null);
      setPrivateRemoteBaseUrl('');
      setPrivateRemoteApiKey('');
      setPrivateRemoteModel('');
    }
    setRemoteModelListNonce((n) => n + 1);
    setRemoteConfigSheetVisible(true);
  }, [
    privateRemoteProfiles,
    privateRemoteActiveProfileId,
    setPrivateRemoteActiveProfile,
    setPrivateRemoteApiKey,
    setPrivateRemoteBaseUrl,
    setPrivateRemoteModel,
  ]);
  const buildRemoteProfileName = React.useCallback(
    (baseUrl: string, model: string) => {
      const base = baseUrl.trim().toLowerCase();
      const provider = base.includes(':11434')
        ? t('aiSettings.privateProvider.templates.ollama')
        : base.includes(':1234')
          ? t('aiSettings.privateProvider.templates.lm_studio')
          : base.includes('api.openai.com')
            ? t('aiSettings.privateProvider.templates.openai')
            : base.includes('api.deepseek.com') || base.includes('deepseek.com')
              ? t('aiSettings.privateProvider.templates.deepseek')
              : base.includes('openrouter.ai')
                ? t('aiSettings.privateProvider.templates.openrouter')
                : base.includes('generativelanguage.googleapis.com')
                  ? t('aiSettings.privateProvider.templates.google')
                  : t('settings.privateRemoteProviderCustom');
      const trimmedModel = model.trim();
      return trimmedModel.length > 0 ? `${provider} · ${trimmedModel}` : provider;
    },
    [t],
  );
  const getConnectionFailureMessage = React.useCallback(
    (
      reason: PrivateRemoteConnectionFailureReason,
      model: string,
      models?: string[],
      fallbackError?: string,
    ) => {
      switch (reason) {
        case 'server_unreachable':
          return t('aiSettings.privateProvider.healthCheck.serverUnavailable');
        case 'auth_failed':
          return t('aiSettings.privateProvider.healthCheck.authFailed');
        case 'model_not_found': {
          const preview = (models ?? []).slice(0, 3).join(', ');
          return t('aiSettings.privateProvider.healthCheck.modelNotFound', {
            model,
            modelsPreview: preview || '—',
          });
        }
        case 'invalid_response':
          return fallbackError || t('aiSettings.privateProvider.healthCheck.invalidResponse');
        default:
          return fallbackError || t('aiSettings.privateProvider.connectionFailMessage');
      }
    },
    [t],
  );
  const remoteConfigPrimaryLabel = isCreatingNewConnection
    ? t('aiSettings.privateProvider.testAndSaveConnection')
    : t('aiSettings.privateProvider.testAndUpdateConnection');
  const handleTestAndSaveRemoteConnection = React.useCallback(async () => {
    if (!canTestConnection || isTestingConnection) return;
    setIsTestingConnection(true);
    try {
      const result = await testPrivateRemoteConnection({
        privateRemoteBaseUrl,
        privateRemoteApiKey,
        privateRemoteModel,
      });
      setLastConnectionCheckOk(result.ok);
      setLastConnectionFailureReason(result.ok ? null : result.reason);
      if (result.ok) {
        const profileId = privateRemoteActiveProfileId ?? `remote-${Date.now()}`;
        const profileName = buildRemoteProfileName(privateRemoteBaseUrl, privateRemoteModel);
        setPrivateRemoteLastSuccessfulConfig({
          baseUrl: privateRemoteBaseUrl,
          apiKey: privateRemoteApiKey,
          model: privateRemoteModel,
        });
        upsertPrivateRemoteProfile({
          id: profileId,
          name: profileName,
          baseUrl: privateRemoteBaseUrl,
          apiKey: privateRemoteApiKey,
          model: privateRemoteModel,
          updatedAt: Date.now(),
        });
        setRemoteConfigSheetVisible(false);
        Alert.alert(
          t('aiSettings.privateProvider.connectionOkTitle'),
          t('aiSettings.privateProvider.connectionOkMessage'),
        );
        return;
      }
      const message = getConnectionFailureMessage(
        result.reason,
        privateRemoteModel.trim(),
        result.models,
        result.error,
      );
      Alert.alert(t('aiSettings.privateProvider.connectionFailTitle'), message);
    } finally {
      setIsTestingConnection(false);
    }
  }, [
    buildRemoteProfileName,
    canTestConnection,
    getConnectionFailureMessage,
    isTestingConnection,
    privateRemoteActiveProfileId,
    privateRemoteApiKey,
    privateRemoteBaseUrl,
    privateRemoteModel,
    setPrivateRemoteLastSuccessfulConfig,
    t,
    upsertPrivateRemoteProfile,
  ]);
  const runRemoteConnectionCheck = React.useCallback(
    async (
      config: { baseUrl: string; apiKey: string; model: string },
      showFailureAlert = false,
    ) => {
      const isConfigReady =
        validatePrivateBaseUrl(config.baseUrl) == null && config.model.trim().length > 0;
      if (!isConfigReady) return;

      setIsAutoTestingProviderConnection(true);
      try {
        const result = await testPrivateRemoteConnection({
          privateRemoteBaseUrl: config.baseUrl,
          privateRemoteApiKey: config.apiKey,
          privateRemoteModel: config.model,
        });
        setLastConnectionCheckOk(result.ok);
        setLastConnectionFailureReason(result.ok ? null : result.reason);
        if (showFailureAlert && !result.ok) {
          const message = getConnectionFailureMessage(
            result.reason,
            config.model.trim(),
            result.models,
            result.error,
          );
          Alert.alert(t('aiSettings.privateProvider.connectionFailTitle'), message);
        }
      } finally {
        setIsAutoTestingProviderConnection(false);
      }
    },
    [getConnectionFailureMessage, t],
  );
  const exportRemoteProfiles = React.useCallback(async () => {
    if (privateRemoteProfiles.length === 0) {
      Alert.alert(
        t('aiSettings.privateProvider.exportEmptyTitle'),
        t('aiSettings.privateProvider.savedConnectionsEmpty'),
      );
      return;
    }

    setIsExportingProfiles(true);
    const cacheDir = getCachesDirectoryPath();
    const timestamp = Date.now();
    const filePath = `${cacheDir}/voice-inbox-remote-profiles-${timestamp}.json`;
    try {
      const payload: PrivateRemoteProfilesExportPayload = {
        version: PRIVATE_REMOTE_PROFILES_EXPORT_VERSION,
        exportedAt: new Date(timestamp).toISOString(),
        profiles: privateRemoteProfiles.map((profile) => ({
          name: profile.name,
          baseUrl: profile.baseUrl,
          model: profile.model,
        })),
      };
      await NitroFS.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
      await Share.share({
        url: `file://${filePath}`,
        title: t('aiSettings.privateProvider.exportTitle'),
      });
    } catch {
      Alert.alert(
        t('aiSettings.privateProvider.exportFailedTitle'),
        t('aiSettings.privateProvider.exportFailedMessage'),
      );
    } finally {
      setIsExportingProfiles(false);
      try {
        const exists = await NitroFS.exists(filePath);
        if (exists) await NitroFS.unlink(filePath);
      } catch {
        // ignore temp cleanup failures
      }
    }
  }, [privateRemoteProfiles, t]);
  const importRemoteProfiles = React.useCallback(async () => {
    setIsImportingProfiles(true);
    let pickedFsPath: string | null = null;
    try {
      const picked = await pickSingleFileToCachesDirectory();
      if (picked.kind === 'canceled') return;
      if (picked.kind === 'failed') {
        Alert.alert(
          t('aiSettings.privateProvider.importFailedTitle'),
          t('aiSettings.privateProvider.importFailedMessage'),
        );
        return;
      }
      const fileLike = {
        uri: picked.localUri,
        fileUri: picked.localUri,
        fileCopyUri: picked.localUri,
      };
      const fsPath = await getReadableDocumentPickerFsPath(fileLike);
      if (!fsPath) {
        Alert.alert(
          t('aiSettings.privateProvider.importInvalidTitle'),
          t('aiSettings.privateProvider.importInvalidMessage'),
        );
        return;
      }
      pickedFsPath = fsPath;
      const raw = await NitroFS.readFile(fsPath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<PrivateRemoteProfilesExportPayload>;
      const profilesRaw = Array.isArray(parsed?.profiles) ? parsed.profiles : [];
      const validProfiles = profilesRaw
        .map((profile) => ({
          name: typeof profile?.name === 'string' ? profile.name.trim() : '',
          baseUrl: typeof profile?.baseUrl === 'string' ? profile.baseUrl.trim() : '',
          model: typeof profile?.model === 'string' ? profile.model.trim() : '',
        }))
        .filter((profile) => profile.baseUrl.length > 0 && profile.model.length > 0);

      if (validProfiles.length === 0) {
        Alert.alert(
          t('aiSettings.privateProvider.importInvalidTitle'),
          t('aiSettings.privateProvider.importInvalidMessage'),
        );
        return;
      }

      const existingBySignature = new Map(
        privateRemoteProfiles.map((profile) => [
          `${profile.baseUrl.trim().toLowerCase()}|${profile.model.trim().toLowerCase()}`,
          profile,
        ]),
      );

      let importedCount = 0;
      for (const profile of validProfiles) {
        const signature = `${profile.baseUrl.toLowerCase()}|${profile.model.toLowerCase()}`;
        const existing = existingBySignature.get(signature);
        const id = existing?.id ?? `remote-import-${Date.now()}-${importedCount}`;
        const name =
          profile.name.length > 0
            ? profile.name
            : buildRemoteProfileName(profile.baseUrl, profile.model);
        upsertPrivateRemoteProfile({
          id,
          name,
          baseUrl: profile.baseUrl,
          model: profile.model,
          apiKey: existing?.apiKey ?? '',
          updatedAt: Date.now(),
        });
        importedCount += 1;
      }

      Alert.alert(
        t('aiSettings.privateProvider.importSuccessTitle'),
        t('aiSettings.privateProvider.importSuccessMessage', { count: importedCount }),
      );
    } catch {
      Alert.alert(
        t('aiSettings.privateProvider.importFailedTitle'),
        t('aiSettings.privateProvider.importFailedMessage'),
      );
    } finally {
      setIsImportingProfiles(false);
      if (pickedFsPath) {
        try {
          const normalized = toFsPath(pickedFsPath);
          const exists = await NitroFS.exists(normalized);
          if (exists) await NitroFS.unlink(normalized);
        } catch {
          // ignore temp cleanup failures
        }
      }
    }
  }, [buildRemoteProfileName, privateRemoteProfiles, t, upsertPrivateRemoteProfile]);
  const handlePrivateProviderSelect = React.useCallback(
    async (provider: PrivateAiProvider) => {
      setPrivateAiProvider(provider);
      if (provider !== 'custom_openai') return;

      const baseUrlCandidate =
        privateRemoteBaseUrl.trim().length > 0
          ? privateRemoteBaseUrl
          : privateRemoteLastSuccessfulBaseUrl;
      const modelCandidate =
        privateRemoteModel.trim().length > 0
          ? privateRemoteModel
          : privateRemoteLastSuccessfulModel;
      const apiKeyCandidate =
        privateRemoteApiKey.trim().length > 0
          ? privateRemoteApiKey
          : privateRemoteLastSuccessfulApiKey;
      await runRemoteConnectionCheck(
        {
          baseUrl: baseUrlCandidate,
          apiKey: apiKeyCandidate,
          model: modelCandidate,
        },
        false,
      );
    },
    [
      privateRemoteBaseUrl,
      privateRemoteModel,
      privateRemoteApiKey,
      privateRemoteLastSuccessfulBaseUrl,
      privateRemoteLastSuccessfulApiKey,
      privateRemoteLastSuccessfulModel,
      setPrivateAiProvider,
      runRemoteConnectionCheck,
    ],
  );

  React.useEffect(() => {
    if (!route.params?.focusPrivateServer) return;

    navigation.setParams({ focusPrivateServer: undefined });

    if (!isPrivateMode) return;

    if (customProviderLocked) {
      setPrivateServerProSheet(true);
      return;
    }

    if (privateAiProvider !== 'custom_openai') {
      void handlePrivateProviderSelect('custom_openai');
    }
  }, [
    route.params?.focusPrivateServer,
    navigation,
    isPrivateMode,
    customProviderLocked,
    privateAiProvider,
    handlePrivateProviderSelect,
  ]);

  React.useEffect(() => {
    if (didRunInitialProviderCheckRef.current) return;
    if (privateAiProvider !== 'custom_openai') return;
    didRunInitialProviderCheckRef.current = true;

    const baseUrlCandidate =
      privateRemoteBaseUrl.trim().length > 0
        ? privateRemoteBaseUrl
        : privateRemoteLastSuccessfulBaseUrl;
    const modelCandidate =
      privateRemoteModel.trim().length > 0 ? privateRemoteModel : privateRemoteLastSuccessfulModel;
    const apiKeyCandidate =
      privateRemoteApiKey.trim().length > 0
        ? privateRemoteApiKey
        : privateRemoteLastSuccessfulApiKey;

    void runRemoteConnectionCheck({
      baseUrl: baseUrlCandidate,
      apiKey: apiKeyCandidate,
      model: modelCandidate,
    });
  }, [
    privateAiProvider,
    privateRemoteBaseUrl,
    privateRemoteApiKey,
    privateRemoteModel,
    privateRemoteLastSuccessfulBaseUrl,
    privateRemoteLastSuccessfulApiKey,
    privateRemoteLastSuccessfulModel,
    runRemoteConnectionCheck,
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('aiSettings.title')} onBack={() => navigation.goBack()} />
      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="mb-4 text-[14px] leading-5" style={{ color: color.text.secondary }}>
            {t('aiSettings.description')}
          </Text>
          {isPrivateMode && (
            <>
              <View className="mb-7">
                <View className="mb-2.5 flex-row items-center gap-1 px-1">
                  <Text
                    className="text-xs font-semibold uppercase tracking-widest"
                    style={{ color: color.text.secondary }}
                  >
                    {t('aiSettings.privateProvider.title')}
                  </Text>
                  {customProviderLocked ? (
                    <View className="flex-row items-center gap-1">
                      <Crown size={14} color={color.accent.primary} strokeWidth={2} />
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: color.accent.primary }}
                      >
                        {t('common.pro')}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  className="mb-2 px-1 text-[13px] leading-5"
                  style={{ color: color.text.muted }}
                >
                  {t('aiSettings.privateProvider.description')}
                </Text>
                <TouchableOpacity
                  activeOpacity={customProviderLocked ? 0.85 : 1}
                  disabled={!customProviderLocked}
                  onPress={() => setPrivateServerProSheet(true)}
                  accessibilityRole={customProviderLocked ? 'button' : undefined}
                  accessibilityHint={
                    customProviderLocked ? t('aiSettings.privateProvider.proOnlyHint') : undefined
                  }
                >
                  <View
                    className="flex-row rounded-xl p-1"
                    style={{
                      backgroundColor: color.background.tertiary,
                      opacity: customProviderLocked ? 0.7 : 1,
                    }}
                    pointerEvents={customProviderLocked ? 'none' : 'auto'}
                  >
                    {PRIVATE_AI_PROVIDERS.map((provider) => {
                      const isSelected = privateAiProvider === provider;
                      return (
                        <TouchableOpacity
                          key={provider}
                          onPress={() => {
                            if (isSelected) return;
                            void handlePrivateProviderSelect(provider);
                          }}
                          activeOpacity={0.8}
                          className="flex-1 items-center justify-center rounded-lg px-2 py-3"
                          style={{
                            minHeight: 44,
                            backgroundColor: isSelected ? color.background.card : 'transparent',
                            borderWidth: isSelected ? 1 : 0,
                            borderColor: isSelected ? color.accent.primary : 'transparent',
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={t(`aiSettings.privateProvider.${provider}`)}
                          accessibilityState={{ selected: isSelected }}
                        >
                          <Text
                            className="text-center text-[14px] font-medium"
                            numberOfLines={2}
                            style={{
                              color: isSelected ? color.accent.primary : color.text.secondary,
                            }}
                          >
                            {t(`aiSettings.privateProvider.${provider}`)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </TouchableOpacity>
              </View>
              {privateAiProvider === 'custom_openai' ? (
                <View className="mb-7">
                  <Text
                    className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: color.text.secondary }}
                  >
                    {t('aiSettings.privateProvider.serverConfig')}
                  </Text>
                  <Text
                    className="mb-2 px-1 text-[13px] leading-5"
                    style={{ color: color.text.muted }}
                  >
                    {t('aiSettings.privateProvider.serverConfigHint')}
                  </Text>
                  <View
                    className="overflow-hidden rounded-2xl"
                    style={{
                      borderWidth: 1,
                      borderColor: color.border.default,
                    }}
                  >
                    <SettingsRow
                      label={
                        hasSavedRemoteConfig
                          ? remoteConnectionStatusLabel
                          : t('aiSettings.privateProvider.notConfiguredTitle')
                      }
                      labelClassName={hasSavedRemoteConfig ? 'font-semibold' : undefined}
                      subtitle={
                        hasSavedRemoteConfig
                          ? `${privateRemoteLastSuccessfulBaseUrl}\n${t(
                              'aiSettings.privateProvider.savedModelLabel',
                              {
                                model: privateRemoteLastSuccessfulModel,
                              },
                            )}`
                          : t('aiSettings.privateProvider.notConfiguredHint')
                      }
                      leftIcon={
                        <View
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: remoteConnectionStatusColor }}
                        />
                      }
                      rightSlot={
                        connectionCheckInProgress ? (
                          <View className="h-[26px] w-[26px] items-center justify-center">
                            <ActivityIndicator size="small" color={color.text.muted} />
                          </View>
                        ) : undefined
                      }
                      onPress={openRemoteConfigSheet}
                      showChevron={!connectionCheckInProgress}
                      isFirst
                      isLast
                    />
                  </View>
                </View>
              ) : null}
              {privateAiProvider === 'custom_openai' ? (
                <View className="mb-7">
                  <Text
                    className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: color.text.secondary }}
                  >
                    {t('aiSettings.privateRemoteGeneration.title')}
                  </Text>
                  <Text
                    className="mb-2 px-1 text-[13px] leading-5"
                    style={{ color: color.text.muted }}
                  >
                    {t('aiSettings.privateRemoteGeneration.hint')}
                  </Text>
                  <View
                    className="mb-3 overflow-hidden rounded-2xl"
                    style={{ borderWidth: 1, borderColor: color.border.default }}
                  >
                    <PickerSection
                      options={PRIVATE_REMOTE_OUTPUT_BUDGETS}
                      selected={privateRemoteOutputBudget}
                      onSelect={setPrivateRemoteOutputBudget}
                      labelKey={(v) => t(`aiSettings.privateRemoteGeneration.${v}`)}
                      color={color}
                    />
                  </View>
                  <View
                    className="overflow-hidden rounded-2xl"
                    style={{ borderWidth: 1, borderColor: color.border.default }}
                  >
                    <SettingsRow
                      label={t('aiSettings.privateRemoteGeneration.jsonObjectLabel')}
                      subtitle={t('aiSettings.privateRemoteGeneration.jsonObjectHint')}
                      rightSlot={
                        <Switch
                          value={privateRemotePreferJsonObject}
                          onValueChange={setPrivateRemotePreferJsonObject}
                          accessibilityLabel={t(
                            'aiSettings.privateRemoteGeneration.jsonObjectA11y',
                          )}
                          trackColor={{
                            false: color.background.tertiary,
                            true: color.accent.primary,
                          }}
                          thumbColor={color.icon.onAccent}
                        />
                      }
                      showChevron={false}
                      isFirst
                      isLast
                    />
                  </View>
                </View>
              ) : null}
              {privateAiProvider === 'local' ? (
                <View className="mb-7">
                  <Text
                    className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-widest"
                    style={{ color: color.text.secondary }}
                  >
                    {t('aiSettings.privateLocalGeneration')}
                  </Text>
                  <Text
                    className="mb-2 px-1 text-[13px] leading-5"
                    style={{ color: color.text.muted }}
                  >
                    {t('aiSettings.privateLocalGenerationHint')}
                  </Text>
                  <View
                    className="overflow-hidden rounded-2xl"
                    style={{ borderWidth: 1, borderColor: color.border.default }}
                  >
                    <PickerSection
                      options={PRIVATE_LOCAL_LLM_BUDGETS}
                      selected={privateLocalLlmBudget}
                      onSelect={setPrivateLocalLlmBudget}
                      labelKey={(v) => t(`aiSettings.privateLocalGeneration.${v}`)}
                      color={color}
                    />
                  </View>
                </View>
              ) : null}
            </>
          )}
          {!isPrivateMode && (
            <View className="mb-7">
              <Text
                className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-widest"
                style={{ color: color.text.secondary }}
              >
                {t('aiSettings.smartModeCloudRetention.title')}
              </Text>
              <Text className="mb-2 px-1 text-[13px] leading-5" style={{ color: color.text.muted }}>
                {t('aiSettings.smartModeCloudRetention.description')}
              </Text>
              <View
                className="overflow-hidden rounded-2xl"
                style={{ borderWidth: 1, borderColor: color.border.default }}
              >
                <CloudAiKvTtlSlider
                  valueSeconds={cloudAiKvTtlSeconds}
                  onChangeSeconds={setCloudAiKvTtlSeconds}
                  fullLabel={cloudRetentionLabel}
                  tickLabel={(sec) => t(`aiSettings.smartModeCloudRetention.tick${sec}`)}
                  sliderAccessibilityLabel={t('aiSettings.smartModeCloudRetention.sliderA11yLabel')}
                  color={color}
                />
              </View>
            </View>
          )}
          {!isPrivateMode || privateAiProvider === 'custom_openai' ? (
            <SettingsSection title={t('aiSettings.showSummaryReasoning.title')}>
              <SettingsRow
                label={t('aiSettings.showSummaryReasoning.label')}
                subtitle={t('aiSettings.showSummaryReasoning.subtitle')}
                rightSlot={
                  <Switch
                    value={showSummaryReasoningInNotes}
                    onValueChange={setShowSummaryReasoningInNotes}
                    accessibilityLabel={t('aiSettings.showSummaryReasoning.a11y')}
                    trackColor={{
                      false: color.background.tertiary,
                      true: color.accent.primary,
                    }}
                    thumbColor={color.icon.onAccent}
                  />
                }
                showChevron={false}
                isFirst
                isLast
              />
            </SettingsSection>
          ) : null}
          {showMeetingSpeakerSettings ? (
            <SettingsSection title={t('aiSettings.autoRefreshMeetingSpeakers.title')}>
              <SettingsRow
                label={t('aiSettings.autoRefreshMeetingSpeakers.label')}
                subtitle={t('aiSettings.autoRefreshMeetingSpeakers.subtitle')}
                rightSlot={
                  <Switch
                    value={autoRefreshMeetingSpeakersOnRegen}
                    onValueChange={setAutoRefreshMeetingSpeakersOnRegen}
                    accessibilityLabel={t('aiSettings.autoRefreshMeetingSpeakers.a11y')}
                    trackColor={{
                      false: color.background.tertiary,
                      true: color.accent.primary,
                    }}
                    thumbColor={color.icon.onAccent}
                  />
                }
                showChevron={false}
                isFirst
                isLast
              />
            </SettingsSection>
          ) : null}
          <SettingsSection title={t('aiSettings.summaryStyle')}>
            <PickerSection
              options={SUMMARY_STYLES}
              selected={summaryStyle}
              onSelect={setSummaryStyle}
              labelKey={(v) => t(`aiSettings.summaryStyle.${v}`)}
              color={color}
            />
          </SettingsSection>
          <SettingsSection title={t('aiSettings.taskStrictness')}>
            <PickerSection
              options={TASK_STRICTNESS_OPTIONS}
              selected={taskStrictness}
              onSelect={setTaskStrictness}
              labelKey={(v) => t(`aiSettings.taskStrictness.${v}`)}
              color={color}
            />
          </SettingsSection>
          <SettingsSection title={t('aiSettings.outputLanguage')}>
            <PickerSection
              options={OUTPUT_LANGUAGES}
              selected={aiOutputLanguage}
              onSelect={setAiOutputLanguage}
              labelKey={(v) => t(`aiSettings.outputLanguage.${v}`)}
              color={color}
            />
          </SettingsSection>
          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
      </View>
      <AutomationComingSoonSheet
        visible={privateServerProSheet}
        feature="privateCustomServer"
        onUpgradePress={() => {
          setPrivateServerProSheet(false);
          openPlanPaywall();
        }}
        onClose={() => setPrivateServerProSheet(false)}
      />
      <AppBottomSheetModal
        visible={remoteConfigSheetVisible}
        onClose={() => setRemoteConfigSheetVisible(false)}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            ...sheetContentPadding,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: color.text.primary,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {t('aiSettings.privateProvider.serverConfig')}
          </Text>
          <Text
            style={{
              fontSize: 14,
              lineHeight: 20,
              color: color.text.secondary,
              textAlign: 'center',
              marginBottom: 20,
              paddingHorizontal: 4,
            }}
          >
            {t('aiSettings.privateProvider.serverConfigHint')}
          </Text>
          <Text className="mb-3 text-[13px] font-semibold" style={{ color: color.text.secondary }}>
            {t('aiSettings.privateProvider.quickTemplates')}
          </Text>
          <View className="mb-6 flex-row flex-wrap gap-2">
            {PRIVATE_QUICK_TEMPLATES.map((template) => (
              <TouchableOpacity
                key={template.id}
                onPress={() => {
                  didTouchRemoteConfigRef.current = false;
                  setPrivateRemoteBaseUrl(template.baseUrl);
                  setPrivateRemoteModel(template.model);
                }}
                className="rounded-lg border px-3 py-2"
                style={{ borderColor: color.border.default }}
              >
                <Text style={{ color: color.text.primary }}>
                  {t(`aiSettings.privateProvider.templates.${template.id}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View className="mb-6">
            <View className="mb-3">
              <Text className="text-[13px] font-semibold" style={{ color: color.text.secondary }}>
                {t('aiSettings.privateProvider.savedConnections')}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={switchToSavedConnectionMode}
                disabled={!hasSavedProfiles}
                activeOpacity={0.85}
                className="min-h-[44px] min-w-0 flex-1 justify-center rounded-xl border-2 px-3.5 py-3"
                style={{
                  borderColor: !isCreatingNewConnection
                    ? color.accent.primary
                    : color.border.default,
                  backgroundColor: color.background.tertiary,
                  opacity: hasSavedProfiles ? 1 : 0.45,
                }}
              >
                <Text
                  className="text-center text-[15px] font-semibold leading-5"
                  style={{
                    color: !isCreatingNewConnection ? color.accent.primary : color.text.primary,
                  }}
                  numberOfLines={2}
                >
                  {t('aiSettings.privateProvider.editConfig')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={switchToCreateConnectionMode}
                activeOpacity={0.85}
                className="min-h-[44px] min-w-0 flex-1 justify-center rounded-xl border-2 px-3.5 py-3"
                style={{
                  borderColor: isCreatingNewConnection
                    ? color.accent.primary
                    : color.border.default,
                  backgroundColor: color.background.tertiary,
                }}
              >
                <Text
                  className="text-center text-[15px] font-semibold leading-5"
                  style={{
                    color: isCreatingNewConnection ? color.accent.primary : color.text.primary,
                  }}
                  numberOfLines={2}
                >
                  {t('aiSettings.privateProvider.newConnectionSwitch')}
                </Text>
              </TouchableOpacity>
            </View>
            <Text className="mb-3 mt-3 text-[13px] leading-5" style={{ color: color.text.muted }}>
              {isCreatingNewConnection
                ? t('aiSettings.privateProvider.newConnectionHint')
                : t('aiSettings.privateProvider.editConnectionHint')}
            </Text>
            {!hasSavedProfiles ? (
              <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
                {t('aiSettings.privateProvider.savedConnectionsEmpty')}
              </Text>
            ) : (
              <PrivateRemoteSavedConnectionsList
                profiles={privateRemoteProfiles}
                activeProfileId={privateRemoteActiveProfileId}
                onSelectProfile={setPrivateRemoteActiveProfile}
                onDeleteProfile={removePrivateRemoteProfile}
                color={color}
                disabled={isCreatingNewConnection}
              />
            )}
          </View>
          <View className="mb-8 flex-row gap-3">
            <TouchableOpacity
              onPress={() => {
                void exportRemoteProfiles();
              }}
              disabled={isExportingProfiles || privateRemoteProfiles.length === 0}
              className="min-h-[44px] min-w-0 flex-1 flex-row items-center justify-center rounded-xl border px-3 py-2.5"
              style={{
                borderColor: color.border.default,
                opacity: isExportingProfiles || privateRemoteProfiles.length === 0 ? 0.5 : 1,
              }}
            >
              {isExportingProfiles ? (
                <ActivityIndicator size="small" color={color.text.muted} />
              ) : (
                <Text className="text-[13px] font-semibold" style={{ color: color.text.primary }}>
                  {t('aiSettings.privateProvider.exportProfiles')}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                void importRemoteProfiles();
              }}
              disabled={isImportingProfiles}
              className="min-h-[44px] min-w-0 flex-1 flex-row items-center justify-center rounded-xl border px-3 py-2.5"
              style={{
                borderColor: color.border.default,
                opacity: isImportingProfiles ? 0.5 : 1,
              }}
            >
              {isImportingProfiles ? (
                <ActivityIndicator size="small" color={color.text.muted} />
              ) : (
                <Text className="text-[13px] font-semibold" style={{ color: color.text.primary }}>
                  {t('aiSettings.privateProvider.importProfiles')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          <View className="mb-6">
            <Text
              className="mb-2 text-[13px] font-semibold"
              style={{ color: color.text.secondary }}
            >
              {t('aiSettings.privateProvider.baseUrl')}
            </Text>
            <BottomSheetTextInput
              value={privateRemoteBaseUrl}
              onChangeText={(value) => {
                didTouchRemoteConfigRef.current = true;
                setPrivateRemoteBaseUrl(value);
                setRemoteModelListNonce((n) => n + 1);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder={t('aiSettings.privateProvider.baseUrlPlaceholder')}
              placeholderTextColor={color.text.muted}
              className="min-h-[48px] rounded-xl border px-4 py-3 text-[15px]"
              style={{
                borderColor:
                  baseUrlValidationError != null ? color.accent.delete : color.border.default,
                color: color.text.primary,
                backgroundColor: color.background.secondary,
              }}
            />
            {baseUrlValidationError != null ? (
              <Text className="mt-2 text-[13px] leading-5" style={{ color: color.accent.delete }}>
                {t(`aiSettings.privateProvider.baseUrlError.${baseUrlValidationError}`)}
              </Text>
            ) : null}
          </View>
          <View className="mb-6">
            <Text
              className="mb-2 text-[13px] font-semibold"
              style={{ color: color.text.secondary }}
            >
              {t('aiSettings.privateProvider.model')}
            </Text>
            <BottomSheetTextInput
              value={privateRemoteModel}
              onChangeText={(value) => {
                didTouchRemoteConfigRef.current = true;
                setPrivateRemoteModel(value);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={t('aiSettings.privateProvider.modelPlaceholder')}
              placeholderTextColor={color.text.muted}
              className="min-h-[48px] rounded-xl border px-4 py-3 text-[15px]"
              style={{
                borderColor: color.border.default,
                color: color.text.primary,
                backgroundColor: color.background.secondary,
              }}
            />
            <View className="mt-4">
              <PrivateRemoteModelList
                baseUrl={privateRemoteBaseUrl}
                apiKey={privateRemoteApiKey}
                selectedModel={privateRemoteModel}
                onSelectModel={(modelId) => {
                  didTouchRemoteConfigRef.current = true;
                  setPrivateRemoteModel(modelId);
                }}
                color={color}
                refreshNonce={remoteModelListNonce}
              />
            </View>
          </View>
          <View className="mb-4">
            <Text
              className="mb-2 text-[13px] font-semibold"
              style={{ color: color.text.secondary }}
            >
              {t('aiSettings.privateProvider.apiKey')}
            </Text>
            <BottomSheetTextInput
              value={privateRemoteApiKey}
              onChangeText={setPrivateRemoteApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="none"
              importantForAutofill="no"
              secureTextEntry
              placeholder={t('aiSettings.privateProvider.apiKeyPlaceholder')}
              placeholderTextColor={color.text.muted}
              className="min-h-[48px] rounded-xl border px-4 py-3 text-[15px]"
              style={{
                borderColor: color.border.default,
                color: color.text.primary,
                backgroundColor: color.background.secondary,
              }}
            />
          </View>
          <SheetFooterButtons
            className="mt-6 w-full"
            color={color}
            primaryLabel={remoteConfigPrimaryLabel}
            onPrimaryPress={() => {
              void handleTestAndSaveRemoteConnection();
            }}
            primaryDisabled={!canTestConnection}
            primaryLoading={isTestingConnection}
            primaryBackgroundColor={color.accent.aiData}
          />
        </BottomSheetScrollView>
      </AppBottomSheetModal>
    </View>
  );
};
