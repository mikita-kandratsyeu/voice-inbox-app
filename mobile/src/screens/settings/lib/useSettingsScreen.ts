import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState } from 'react-native';

import { navigationRef } from '@/app/navigation/navigationRef';
import type { SettingsStackParamList } from '@/app/navigation/types';
import { useAppLockStore } from '@/entities/app-lock';
import { useRecordStore } from '@/entities/record';
import type { AutoArchiveAfterDays } from '@/entities/settings';
import {
  findCloudAiModelCatalogEntry,
  getWhisperModelVariantId,
  isDigestAiEnabled,
  isPrivateCustomServerMode,
  LOCAL_AI_MODELS,
  syncPrivateCapabilityTier,
  useSettingsStore,
} from '@/entities/settings';
import { type ProLimitResetSuccess, useResetProAiLimit } from '@/features/ai-limit-reset';
import { usePrivateAiTaskQueueCount } from '@/features/ai-task-queue';
import { openAppReviewFromSettings } from '@/features/app-review';
import { isAutomationUiLockedForPublicStore, useAdsAllowed } from '@/features/app-storefront';
import { useClaimAiBonus } from '@/features/claim-ai-bonus';
import { regenerateAllEmbeddings } from '@/features/embedding-generation';
import {
  getRevenueCatIntegrationEnabled,
  openStoreSubscriptionManagement,
} from '@/features/entitlements';
import { openInAppBrowser } from '@/features/in-app-browser';
import { openPlanPaywall } from '@/features/plan-paywall';
import { isStoreProEntitlementActiveNow, useProEntitlement } from '@/features/pro-license';
import { useAppTheme, useColors } from '@/shared/config';
import { getAiUsage } from '@/shared/lib/ai-api';
import { fetchProAccountPortalUrl } from '@/shared/lib/ai-api/proLicenseApi';
import { isProResetEligible } from '@/shared/lib/aiUsageProReset';
import { subscribeAiUsageRefresh } from '@/shared/lib/aiUsageRefresh';
import { logAnalyticsEvent } from '@/shared/lib/analytics';
import { isEmbeddingAvailable } from '@/shared/lib/embeddings';
import {
  checkMicPermission,
  type MicPermissionStatus,
  openAppSettings,
  requestMicPermission,
} from '@/shared/lib/permissions';
import { getWhisperLabel } from '@/shared/lib/whisper';

import type { AutomationFeatureKind } from '../ui/AutomationComingSoonSheet';

export function useSettingsScreen() {
  const { t, i18n } = useTranslation();
  const color = useColors();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const route = useRoute<RouteProp<SettingsStackParamList, 'Settings'>>();

  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const aiModelRoutingMode = useSettingsStore((s) => s.aiModelRoutingMode);
  const selectedLocalAiModel = useSettingsStore((s) => s.selectedLocalAiModel);
  const localLlmModelStatuses = useSettingsStore((s) => s.localLlmModelStatuses);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateAiProvider = useSettingsStore((s) => s.privateAiProvider);
  const privateRemoteModel = useSettingsStore((s) => s.privateRemoteModel);
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const selectedWhisperModelFormat = useSettingsStore((s) => s.selectedWhisperModelFormat);
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const autoTranscribeOnSave = useSettingsStore((s) => s.autoTranscribeOnSave);
  const setAutoTranscribeOnSave = useSettingsStore((s) => s.setAutoTranscribeOnSave);
  const autoAiAfterTranscription = useSettingsStore((s) => s.autoAiAfterTranscription);
  const setAutoAiAfterTranscription = useSettingsStore((s) => s.setAutoAiAfterTranscription);
  const autoArchiveEnabled = useSettingsStore((s) => s.autoArchiveEnabled);
  const setAutoArchiveEnabled = useSettingsStore((s) => s.setAutoArchiveEnabled);
  const autoArchiveAfterDays = useSettingsStore((s) => s.autoArchiveAfterDays);
  const setAutoArchiveAfterDays = useSettingsStore((s) => s.setAutoArchiveAfterDays);
  const shakeToRecordEnabled = useSettingsStore((s) => s.shakeToRecordEnabled);
  const setShakeToRecordEnabled = useSettingsStore((s) => s.setShakeToRecordEnabled);
  const appLanguage = useSettingsStore((s) => s.appLanguage);
  const appTheme = useSettingsStore((s) => s.appTheme);
  const resolvedColorScheme = useAppTheme();
  const isAppLockEnabled = useAppLockStore((s) => s.isEnabled);
  const recordsCount = useRecordStore((s) => s.records.length);

  const [aiUsage, setAiUsage] = useState<Awaited<ReturnType<typeof getAiUsage>>>(null);
  const [aiUsageLoading, setAiUsageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUpdatingEmbeddings, setIsUpdatingEmbeddings] = useState(false);
  const [micStatus, setMicStatus] = useState<MicPermissionStatus | null>(null);
  const [automationSheet, setAutomationSheet] = useState<AutomationFeatureKind | null>(null);
  const [autoArchiveDelaySheetVisible, setAutoArchiveDelaySheetVisible] = useState(false);
  const {
    refresh: refreshProEntitlement,
    isProActive: proEntitlementActive,
    expiresAtMs,
  } = useProEntitlement();
  const automationLocked = isAutomationUiLockedForPublicStore(proEntitlementActive);
  const privateAiQueueCount = usePrivateAiTaskQueueCount();

  const [planCardStoreProActive, setPlanCardStoreProActive] = useState<boolean | null>(null);

  useEffect(() => {
    if (!proEntitlementActive) {
      setPlanCardStoreProActive(null);
      return;
    }

    let cancelled = false;
    setPlanCardStoreProActive(null);

    void isStoreProEntitlementActiveNow().then((active) => {
      if (!cancelled) {
        setPlanCardStoreProActive(active);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [proEntitlementActive, expiresAtMs]);

  useFocusEffect(
    useCallback(() => {
      void logAnalyticsEvent('settings_opened');
    }, []),
  );

  const fetchAiUsageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchAiUsageRef = useRef<number>(0);
  const FETCH_AI_USAGE_DEBOUNCE_MS = 500;

  const fetchAiUsage = useCallback(async (force = false) => {
    if (fetchAiUsageTimerRef.current) {
      clearTimeout(fetchAiUsageTimerRef.current);
    }

    const now = Date.now();
    if (!force && now - lastFetchAiUsageRef.current < FETCH_AI_USAGE_DEBOUNCE_MS) {
      return new Promise<Awaited<ReturnType<typeof getAiUsage>>>((resolve) => {
        fetchAiUsageTimerRef.current = setTimeout(() => {
          void getAiUsage().then((data) => {
            setAiUsage(data ?? null);
            lastFetchAiUsageRef.current = Date.now();
            resolve(data);
          });
        }, FETCH_AI_USAGE_DEBOUNCE_MS);
      });
    }

    lastFetchAiUsageRef.current = now;
    const data = await getAiUsage();
    setAiUsage(data ?? null);
    return data;
  }, []);

  const onBonusSuccess = useCallback(
    (usageAfterClaim: NonNullable<Awaited<ReturnType<typeof getAiUsage>>>) => {
      void fetchAiUsage(true);
      const count = usageAfterClaim.bonusAmount ?? 5;
      Alert.alert(
        t('settings.aiUsage.claimBonusSuccessTitle'),
        t('settings.aiUsage.claimBonusSuccess', { count }),
      );
    },
    [fetchAiUsage, t],
  );

  const [resetProLimitSuccessSheet, setResetProLimitSuccessSheet] =
    useState<ProLimitResetSuccess | null>(null);

  const dismissResetProLimitSuccessSheet = useCallback(() => {
    setResetProLimitSuccessSheet(null);
  }, []);

  const onResetProLimitSuccess = useCallback(
    (result: ProLimitResetSuccess) => {
      void fetchAiUsage(true);
      setResetProLimitSuccessSheet(result);
    },
    [fetchAiUsage],
  );

  const handleRateApp = useCallback(() => {
    void openAppReviewFromSettings();
  }, []);

  const { adsAllowed } = useAdsAllowed();
  const { claim, loading: claimLoading, error: claimError } = useClaimAiBonus(onBonusSuccess);
  const {
    resetLimit,
    loading: resetProLimitLoading,
    error: resetProLimitError,
    product: resetProLimitProduct,
  } = useResetProAiLimit(onResetProLimitSuccess);

  const canResetProLimit =
    proEntitlementActive &&
    getRevenueCatIntegrationEnabled() &&
    aiUsage != null &&
    isProResetEligible(aiUsage);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      void fetchAiUsage().finally(() => {
        if (!cancelled) setAiUsageLoading(false);
      });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (fetchAiUsageTimerRef.current) {
        clearTimeout(fetchAiUsageTimerRef.current);
      }
    };
  }, [fetchAiUsage]);

  useEffect(() => {
    return subscribeAiUsageRefresh(() => {
      void fetchAiUsage();
    });
  }, [fetchAiUsage]);

  const prevProSnapshotRef = useRef<{ isProActive: boolean; expiresAtMs: number | null } | null>(
    null,
  );
  useEffect(() => {
    const prev = prevProSnapshotRef.current;
    const next = { isProActive: proEntitlementActive, expiresAtMs };
    prevProSnapshotRef.current = next;

    if (!prev) return;

    const proTierChanged = prev.isProActive !== proEntitlementActive;
    const expiresChanged = prev.expiresAtMs !== expiresAtMs;
    const shouldRefresh = proTierChanged || (proEntitlementActive && expiresChanged);

    if (!shouldRefresh) return;

    void fetchAiUsage();
  }, [proEntitlementActive, expiresAtMs, fetchAiUsage]);

  const refreshPermissions = useCallback(async () => {
    const mic = await checkMicPermission();
    setMicStatus(mic);
  }, []);

  useEffect(() => {
    syncPrivateCapabilityTier();
    const timer = setTimeout(() => {
      refreshPermissions();
    }, 0);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncPrivateCapabilityTier();
        refreshPermissions();
      }
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [refreshPermissions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchAiUsage(true), refreshProEntitlement({ force: true })]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchAiUsage, refreshProEntitlement]);

  const userFacing = findCloudAiModelCatalogEntry(selectedAIModel);
  const localModel =
    selectedLocalAiModel != null
      ? LOCAL_AI_MODELS.find((m) => m.id === selectedLocalAiModel)
      : undefined;
  const localLlmDownloaded =
    selectedLocalAiModel != null &&
    (localLlmModelStatuses[selectedLocalAiModel] ?? 'not_downloaded') === 'downloaded';
  const privateCustomServerModeActive = isPrivateCustomServerMode(
    aiExecutionMode,
    privateAiProvider,
  );
  const aiModelBaseName =
    aiExecutionMode === 'private_experimental'
      ? privateCustomServerModeActive
        ? privateRemoteModel.trim() || t('settings.whisperModelNotSet')
        : localLlmDownloaded
          ? (localModel?.name ?? selectedLocalAiModel ?? '')
          : t('settings.whisperModelNotSet')
      : aiModelRoutingMode === 'auto'
        ? t('aiModels.autoRecommendedLabel')
        : (userFacing?.name ?? selectedAIModel);
  const aiModelLockedByPrivateRemote = privateCustomServerModeActive;
  const isPrivateMode = aiExecutionMode === 'private_experimental';
  const digestAiEnabled = isDigestAiEnabled(aiExecutionMode, privateAiProvider);
  const whisperVariantId = getWhisperModelVariantId(
    selectedWhisperModel,
    selectedWhisperModelFormat,
  );
  const whisperStatus = whisperModelStatuses[whisperVariantId] ?? 'not_downloaded';

  const transcriptionValue =
    whisperStatus === 'not_downloaded' || whisperStatus === 'downloading'
      ? t('settings.whisperModelNotSet')
      : getWhisperLabel(selectedWhisperModel);
  const privateAiModeValue = t(`aiSettings.executionMode.${aiExecutionMode}`);

  const handleUpdateEmbeddings = useCallback(() => {
    const records = useRecordStore.getState().records;
    const recordsWithContent = records.filter(
      (r) =>
        (r.summary && r.summary.length > 0) ||
        (r.transcript && r.transcript.length > 0) ||
        (r.title && r.title.length > 0),
    );
    if (recordsWithContent.length === 0) {
      Alert.alert(t('common.done'), t('settings.updateEmbeddingsNoRecords'));
      return;
    }
    Alert.alert(
      t('settings.updateEmbeddingsTitle'),
      t('settings.updateEmbeddingsMessage', { count: recordsWithContent.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.updateEmbeddings'),
          onPress: async () => {
            try {
              setIsUpdatingEmbeddings(true);
              const result = await regenerateAllEmbeddings(recordsWithContent);
              const msg =
                result.failed > 0
                  ? t('settings.updateEmbeddingsPartial', {
                      updated: result.updated,
                      skipped: result.skipped,
                      failed: result.failed,
                    })
                  : t('settings.updateEmbeddingsSuccess', {
                      updated: result.updated,
                      skipped: result.skipped,
                    });
              Alert.alert(t('common.done'), msg);
            } catch {
              Alert.alert(t('common.error'), t('settings.updateEmbeddingsError'));
            } finally {
              setIsUpdatingEmbeddings(false);
            }
          },
        },
      ],
    );
  }, [t]);

  const handleAutoArchiveDelayPress = useCallback(() => {
    setAutoArchiveDelaySheetVisible(true);
  }, []);

  const handleAutoArchiveDelaySheetClose = useCallback(() => {
    setAutoArchiveDelaySheetVisible(false);
  }, []);

  const handleAutoArchiveDelaySelect = useCallback(
    (days: AutoArchiveAfterDays) => {
      setAutoArchiveAfterDays(days);
      setAutoArchiveDelaySheetVisible(false);
    },
    [setAutoArchiveAfterDays],
  );

  const handleMicPermission = useCallback(async () => {
    if (micStatus === 'denied') {
      await openAppSettings();
      return;
    }
    const granted = await requestMicPermission({
      title: t('permissions.micTitle'),
      message: t('permissions.micMessage'),
      buttonPositive: t('permissions.allow'),
      buttonNegative: t('permissions.deny'),
    });
    setMicStatus(granted ? 'granted' : 'denied');
  }, [micStatus, t]);

  const handlePlanCardPress = useCallback(() => {
    if (proEntitlementActive) {
      void (async () => {
        const storeEntitlementActive = await isStoreProEntitlementActiveNow();

        if (storeEntitlementActive) {
          const ok = await openStoreSubscriptionManagement();

          if (!ok) {
            Alert.alert(t('common.error'), t('settings.subscriptionManagementOpenError'));
          }

          return;
        }

        const locale = i18n.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
        const portalUrl = await fetchProAccountPortalUrl(locale);

        if (portalUrl) {
          await openInAppBrowser(portalUrl, resolvedColorScheme);

          return;
        }

        Alert.alert(t('common.error'), t('settings.planStatus.proDetailsPortalError'));
      })();
      return;
    }
    openPlanPaywall();
  }, [i18n.language, proEntitlementActive, resolvedColorScheme, t]);

  useEffect(() => {
    if (!route.params?.openPlanPaywall) {
      return;
    }

    openPlanPaywall();
    navigation.setParams({ openPlanPaywall: false });
  }, [navigation, route.params?.openPlanPaywall]);

  const openDebugScreen = useCallback(() => {
    if (!navigationRef.isReady()) {
      return;
    }
    navigationRef.navigate('Debug');
  }, []);

  return {
    t,
    color,
    navigation,
    planCardStoreProActive,
    proEntitlementActive,
    refreshProEntitlement,
    refreshing,
    onRefresh,
    handlePlanCardPress,
    aiUsage,
    aiUsageLoading,
    adsAllowed,
    claim,
    claimLoading,
    claimError,
    canResetProLimit,
    resetProLimit: resetLimit,
    resetProLimitLoading,
    resetProLimitError,
    resetProLimitPriceLabel: resetProLimitProduct?.priceString ?? null,
    resetProLimitSuccessSheet,
    dismissResetProLimitSuccessSheet,
    isPrivateMode,
    privateCustomServerModeActive,
    privateAiQueueCount,
    digestAiEnabled,
    automationLocked,
    autoTranscribeOnSave,
    setAutoTranscribeOnSave,
    autoAiAfterTranscription,
    setAutoAiAfterTranscription,
    autoArchiveEnabled,
    setAutoArchiveEnabled,
    autoArchiveAfterDays,
    handleAutoArchiveDelayPress,
    shakeToRecordEnabled,
    setShakeToRecordEnabled,
    autoArchiveDelaySheetVisible,
    handleAutoArchiveDelaySheetClose,
    handleAutoArchiveDelaySelect,
    setAutomationSheet,
    aiModelName: aiModelBaseName,
    aiModelLockedByPrivateRemote,
    privateAiModeValue,
    transcriptionValue,
    embeddingAvailable: isEmbeddingAvailable(),
    isUpdatingEmbeddings,
    handleUpdateEmbeddings,
    recordsCount,
    appLanguage,
    appTheme,
    micStatus,
    handleMicPermission,
    isAppLockEnabled,
    handleRateApp,
    automationSheet,
    openDebugScreen,
  };
}
