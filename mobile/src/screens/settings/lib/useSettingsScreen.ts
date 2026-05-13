import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState } from 'react-native';

import { navigationRef } from '@/app/navigation/navigationRef';
import type { SettingsStackParamList } from '@/app/navigation/types';
import { useAppLockStore } from '@/entities/app-lock';
import { useFolderStore } from '@/entities/folder';
import { useRecordStore } from '@/entities/record';
import type { AutoArchiveAfterDays } from '@/entities/settings';
import {
  getWhisperModelVariantId,
  LOCAL_AI_MODELS,
  syncPrivateCapabilityTier,
  USER_FACING_AI_MODELS,
  useSettingsStore,
} from '@/entities/settings';
import { openAppReviewFromSettings } from '@/features/app-review';
import {
  getMonetizationMode,
  isAutomationUiLockedForPublicStore,
  useAdsAllowed,
} from '@/features/app-storefront';
import { useClaimAiBonus } from '@/features/claim-ai-bonus';
import { regenerateAllEmbeddings } from '@/features/embedding-generation';
import type { IapBillingOptions, IapBillingPeriod } from '@/features/entitlements';
import {
  getProBillingPriceOptions,
  openStoreSubscriptionManagement,
  purchaseProPackageForPeriod,
  resolveDefaultIapBillingPeriod,
  restoreProPurchases,
} from '@/features/entitlements';
import { openInAppBrowser } from '@/features/in-app-browser';
import { isStoreProEntitlementActiveNow, useProEntitlement } from '@/features/pro-license';
import { isProActiveFromStorageSync } from '@/features/pro-license/lib/proEntitlementStorage';
import { exportData, importData } from '@/features/sync-data';
import { FREE_WEEKLY_LIMIT, useAppTheme, useColors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import { getAiUsage, getAiWeeklyLimits } from '@/shared/lib/ai-api';
import { fetchProAccountPortalUrl } from '@/shared/lib/ai-api/proLicenseApi';
import { logAnalyticsEvent } from '@/shared/lib/analytics';
import { isEmbeddingAvailable } from '@/shared/lib/embeddings';
import {
  checkMicPermission,
  type MicPermissionStatus,
  openAppSettings,
  requestMicPermission,
} from '@/shared/lib/permissions';
import {
  checkPushPermission,
  type PushPermissionStatus,
  requestPushPermission,
} from '@/shared/lib/push';
import { getWhisperLabel } from '@/shared/lib/whisper';

import type { AutomationFeatureKind } from '../ui/AutomationComingSoonSheet';

const RESET_IAP_BILLING: IapBillingOptions = {
  annual: null,
  monthly: null,
  annualComparedToMonthlyYearPriceString: null,
  savePercentVsMonthly: null,
};

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
  const appLanguage = useSettingsStore((s) => s.appLanguage);
  const appTheme = useSettingsStore((s) => s.appTheme);
  const resolvedColorScheme = useAppTheme();
  const isAppLockEnabled = useAppLockStore((s) => s.isEnabled);
  const recordsCount = useRecordStore((s) => s.records.length);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [aiUsage, setAiUsage] = useState<Awaited<ReturnType<typeof getAiUsage>>>(null);
  const [aiUsageLoading, setAiUsageLoading] = useState(true);
  const [proWeeklyLimit, setProWeeklyLimit] = useState<number>(75);
  const [freeWeeklyLimit, setFreeWeeklyLimit] = useState<number>(FREE_WEEKLY_LIMIT);
  const [refreshing, setRefreshing] = useState(false);
  const [isUpdatingEmbeddings, setIsUpdatingEmbeddings] = useState(false);
  const [micStatus, setMicStatus] = useState<MicPermissionStatus | null>(null);
  const [pushStatus, setPushStatus] = useState<PushPermissionStatus | null>(null);
  const [automationSheet, setAutomationSheet] = useState<AutomationFeatureKind | null>(null);
  const [autoArchiveDelaySheetVisible, setAutoArchiveDelaySheetVisible] = useState(false);
  const [planPaywallVisible, setPlanPaywallVisibleState] = useState(false);
  const [iapPaywallBusy, setIapPaywallBusy] = useState(false);
  const [iapBilling, setIapBilling] = useState<IapBillingOptions>(RESET_IAP_BILLING);
  const [selectedIapPeriod, setSelectedIapPeriod] = useState<IapBillingPeriod>('annual');
  const [iapProPriceLoading, setIapProPriceLoading] = useState(false);

  const {
    refresh: refreshProEntitlement,
    isProActive: proEntitlementActive,
    expiresAtMs,
  } = useProEntitlement();
  const automationLocked = isAutomationUiLockedForPublicStore(proEntitlementActive);
  const monetizationMode = getMonetizationMode();

  const setPlanPaywallVisible = useCallback((visible: boolean) => {
    if (visible && getMonetizationMode() === 'iap_public') {
      setIapProPriceLoading(true);
      setIapBilling(RESET_IAP_BILLING);
    }
    setPlanPaywallVisibleState(visible);
  }, []);

  const [planCardStoreProActive, setPlanCardStoreProActive] = useState<boolean | null>(null);

  useEffect(() => {
    if (!proEntitlementActive || monetizationMode !== 'iap_public') {
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
  }, [proEntitlementActive, monetizationMode, expiresAtMs]);

  useLayoutEffect(() => {
    if (!planPaywallVisible || monetizationMode !== 'iap_public') {
      return;
    }

    let cancelled = false;

    void getProBillingPriceOptions().then((opts) => {
      if (!cancelled) {
        setIapBilling(opts);
        setSelectedIapPeriod(resolveDefaultIapBillingPeriod(opts));
      }
      setIapProPriceLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [planPaywallVisible, monetizationMode, i18n.language]);

  useFocusEffect(
    useCallback(() => {
      void logAnalyticsEvent('settings_opened');
    }, []),
  );

  const fetchAiUsage = useCallback(async () => {
    const data = await getAiUsage();

    setAiUsage(data ?? null);

    return data;
  }, []);

  const fetchProWeeklyLimit = useCallback(async (options?: { force?: boolean }) => {
    const limits = await getAiWeeklyLimits({ force: options?.force === true });
    if (limits?.proWeeklyLimit && limits.proWeeklyLimit > 0) {
      setProWeeklyLimit(limits.proWeeklyLimit);
    }
    if (limits?.freeWeeklyLimit && limits.freeWeeklyLimit > 0) {
      setFreeWeeklyLimit(limits.freeWeeklyLimit);
    }
    return limits;
  }, []);

  const onBonusSuccess = useCallback(
    (usageAfterClaim: NonNullable<Awaited<ReturnType<typeof getAiUsage>>>) => {
      void fetchAiUsage();
      const count = usageAfterClaim.bonusAmount ?? 5;
      Alert.alert(t('common.done'), t('settings.aiUsage.claimBonusSuccess', { count }));
    },
    [fetchAiUsage, t],
  );

  const handleRateApp = useCallback(() => {
    void openAppReviewFromSettings();
  }, []);

  const { adsAllowed } = useAdsAllowed();
  const { claim, loading: claimLoading, error: claimError } = useClaimAiBonus(onBonusSuccess);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      Promise.all([fetchAiUsage(), fetchProWeeklyLimit()]).finally(() => {
        if (!cancelled) setAiUsageLoading(false);
      });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fetchAiUsage, fetchProWeeklyLimit]);

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
    void fetchProWeeklyLimit({ force: true });
  }, [proEntitlementActive, expiresAtMs, fetchAiUsage, fetchProWeeklyLimit]);

  const refreshPermissions = useCallback(async () => {
    const mic = await checkMicPermission();
    setMicStatus(mic);
    if (IS_IOS) {
      const push = await checkPushPermission();
      setPushStatus(push);
    }
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
      await Promise.all([fetchAiUsage(), refreshProEntitlement({ force: true })]);
      await fetchProWeeklyLimit({ force: true });
    } finally {
      setRefreshing(false);
    }
  }, [fetchAiUsage, fetchProWeeklyLimit, refreshProEntitlement]);

  const userFacing = USER_FACING_AI_MODELS.find((m) => m.id === selectedAIModel);
  const localModel =
    selectedLocalAiModel != null
      ? LOCAL_AI_MODELS.find((m) => m.id === selectedLocalAiModel)
      : undefined;
  const localLlmDownloaded =
    selectedLocalAiModel != null &&
    (localLlmModelStatuses[selectedLocalAiModel] ?? 'not_downloaded') === 'downloaded';
  const aiModelBaseName =
    aiExecutionMode === 'private_experimental'
      ? localLlmDownloaded
        ? (localModel?.name ?? selectedLocalAiModel ?? '')
        : t('settings.whisperModelNotSet')
      : aiModelRoutingMode === 'auto'
        ? t('aiModels.autoRecommendedLabel')
        : (userFacing?.name ?? selectedAIModel);
  const isPrivateMode = aiExecutionMode === 'private_experimental';
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

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      const records = useRecordStore.getState().records;
      const folderStore = useFolderStore.getState();
      if (!folderStore.isLoaded) {
        await folderStore.load();
      }
      const folders = useFolderStore.getState().folders;
      await exportData(records, folders);
    } catch {
      Alert.alert(t('common.error'), t('importExport.exportError'));
    } finally {
      setIsExporting(false);
    }
  }, [t]);

  const handleImport = useCallback(async () => {
    try {
      setIsImporting(true);
      const result = await importData();
      if (!result.success) {
        if (result.error !== 'cancelled') {
          Alert.alert(t('common.error'), result.error);
        }
        return;
      }
      navigation.navigate('ImportRecords', { records: result.records });
    } catch {
      Alert.alert(t('common.error'), t('importExport.importError'));
    } finally {
      setIsImporting(false);
    }
  }, [navigation, t]);

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

  const handleNotificationsPress = useCallback(async () => {
    if (!IS_IOS) return;
    if (pushStatus === 'denied') {
      await openAppSettings();
      return;
    }
    if (pushStatus === 'granted') return;
    const status = await requestPushPermission();
    setPushStatus(status);
  }, [pushStatus]);

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
        if (monetizationMode === 'iap_public') {
          const storeEntitlementActive = await isStoreProEntitlementActiveNow();

          if (storeEntitlementActive) {
            const ok = await openStoreSubscriptionManagement();

            if (!ok) {
              Alert.alert(t('common.error'), t('settings.subscriptionManagementOpenError'));
            }

            return;
          }
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
    setPlanPaywallVisible(true);
  }, [
    i18n.language,
    monetizationMode,
    proEntitlementActive,
    resolvedColorScheme,
    setPlanPaywallVisible,
    t,
  ]);

  useEffect(() => {
    if (!route.params?.openPlanPaywall) {
      return;
    }

    setPlanPaywallVisible(true);
    navigation.setParams({ openPlanPaywall: false });
  }, [navigation, route.params?.openPlanPaywall, setPlanPaywallVisible]);

  const handleUpgradePress = useCallback(() => {
    if (monetizationMode === 'iap_public') {
      setIapPaywallBusy(true);
      void (async () => {
        try {
          const result = await purchaseProPackageForPeriod(selectedIapPeriod);
          if (result.ok) {
            setPlanPaywallVisible(false);
            void refreshProEntitlement({ force: true });
            return;
          }
          if (result.cancelled) {
            return;
          }
          const body =
            result.message === 'no_package'
              ? t('settings.planPaywall.purchaseErrorNoPackage')
              : result.message === 'iap_unavailable'
                ? t('settings.planPaywall.purchaseErrorUnavailable')
                : t('settings.planPaywall.purchaseError');
          Alert.alert(t('common.error'), body);
        } finally {
          setIapPaywallBusy(false);
        }
      })();
    }
  }, [monetizationMode, refreshProEntitlement, selectedIapPeriod, setPlanPaywallVisible, t]);

  const onIapBillingPeriodChange = useCallback((period: IapBillingPeriod) => {
    setSelectedIapPeriod(period);
  }, []);

  const handleRestorePurchasesPress = useCallback(() => {
    if (monetizationMode !== 'iap_public') {
      return;
    }

    setIapPaywallBusy(true);
    void (async () => {
      try {
        const result = await restoreProPurchases();
        if (result.ok) {
          await refreshProEntitlement({ force: true });
          if (result.entitlementActive || isProActiveFromStorageSync()) {
            setPlanPaywallVisible(false);
            Alert.alert(t('common.done'), t('settings.planPaywall.restoreSuccess'));
            return;
          }
          Alert.alert(t('common.done'), t('settings.planPaywall.restoreNothingFound'));
          return;
        }
        const restoreErrBody =
          result.message === 'iap_unavailable'
            ? t('settings.planPaywall.purchaseErrorUnavailable')
            : t('settings.planPaywall.restoreError');
        Alert.alert(t('common.error'), restoreErrBody);
      } finally {
        setIapPaywallBusy(false);
      }
    })();
  }, [monetizationMode, refreshProEntitlement, setPlanPaywallVisible, t]);

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
    monetizationMode,
    planCardStoreProActive,
    proWeeklyLimit,
    freeWeeklyLimit,
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
    isPrivateMode,
    automationLocked,
    autoTranscribeOnSave,
    setAutoTranscribeOnSave,
    autoAiAfterTranscription,
    setAutoAiAfterTranscription,
    autoArchiveEnabled,
    setAutoArchiveEnabled,
    autoArchiveAfterDays,
    handleAutoArchiveDelayPress,
    autoArchiveDelaySheetVisible,
    handleAutoArchiveDelaySheetClose,
    handleAutoArchiveDelaySelect,
    setAutomationSheet,
    aiModelName: aiModelBaseName,
    privateAiModeValue,
    transcriptionValue,
    embeddingAvailable: isEmbeddingAvailable(),
    isUpdatingEmbeddings,
    handleUpdateEmbeddings,
    recordsCount,
    isExporting,
    isImporting,
    handleExport,
    handleImport,
    appLanguage,
    appTheme,
    micStatus,
    pushStatus,
    handleMicPermission,
    handleNotificationsPress,
    isAppLockEnabled,
    handleRateApp,
    planPaywallVisible,
    setPlanPaywallVisible,
    automationSheet,
    handleUpgradePress,
    handleRestorePurchasesPress,
    iapPaywallBusy,
    iapBilling,
    selectedIapPeriod,
    onIapBillingPeriodChange,
    iapProPriceLoading,
    openDebugScreen,
  };
}
