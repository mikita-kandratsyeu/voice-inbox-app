import type { RouteProp } from '@react-navigation/native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState } from 'react-native';

import { navigationRef } from '@/app/navigation/navigationRef';
import type { SettingsStackParamList } from '@/app/navigation/types';
import { useAppLockStore } from '@/entities/app-lock';
import { useFolderStore } from '@/entities/folder';
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
import { openAppReviewFromSettings } from '@/features/app-review';
import {
  getMonetizationMode,
  isAutomationUiLockedForPublicStore,
  useAdsAllowed,
} from '@/features/app-storefront';
import { useClaimAiBonus } from '@/features/claim-ai-bonus';
import { regenerateAllEmbeddings } from '@/features/embedding-generation';
import { openStoreSubscriptionManagement } from '@/features/entitlements';
import { openInAppBrowser } from '@/features/in-app-browser';
import { openPlanPaywall } from '@/features/plan-paywall';
import { isStoreProEntitlementActiveNow, useProEntitlement } from '@/features/pro-license';
import {
  exportData,
  IMPORT_ERROR_WRONG_BACKUP_PASSWORD,
  importData,
  type ImportResult,
} from '@/features/sync-data';
import { useAppTheme, useColors } from '@/shared/config';
import { getAiUsage } from '@/shared/lib/ai-api';
import { fetchProAccountPortalUrl } from '@/shared/lib/ai-api/proLicenseApi';
import { subscribeAiUsageRefresh } from '@/shared/lib/aiUsageRefresh';
import { logAnalyticsEvent } from '@/shared/lib/analytics';
import {
  getBackupEncryptExportEnabled,
  getBackupEncryptionNoticeAcknowledged,
  setBackupEncryptExportEnabled,
  setBackupEncryptionNoticeAcknowledged,
} from '@/shared/lib/backupExportPrefs';
import { isEmbeddingAvailable } from '@/shared/lib/embeddings';
import { getCachesDirectoryPath, NitroFS } from '@/shared/lib/fs';
import {
  checkMicPermission,
  type MicPermissionStatus,
  openAppSettings,
  requestMicPermission,
} from '@/shared/lib/permissions';
import { getWhisperLabel } from '@/shared/lib/whisper';

import type { AutomationFeatureKind } from '../ui/AutomationComingSoonSheet';
import type { BackupPasswordSheetMode } from '../ui/BackupPasswordSheet';

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
  const appLanguage = useSettingsStore((s) => s.appLanguage);
  const appTheme = useSettingsStore((s) => s.appTheme);
  const resolvedColorScheme = useAppTheme();
  const isAppLockEnabled = useAppLockStore((s) => s.isEnabled);
  const recordsCount = useRecordStore((s) => s.records.length);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupEncryptEnabled, setBackupEncryptEnabledState] = useState(
    getBackupEncryptExportEnabled,
  );
  const [backupNoticeSheetVisible, setBackupNoticeSheetVisible] = useState(false);
  const [backupPasswordSheetVisible, setBackupPasswordSheetVisible] = useState(false);
  const [backupPasswordSheetMode, setBackupPasswordSheetMode] =
    useState<BackupPasswordSheetMode>('export');
  const [pendingImportZipPath, setPendingImportZipPath] = useState<string | null>(null);
  const pendingEnableEncryptAfterNoticeRef = useRef(false);
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
  const monetizationMode = getMonetizationMode();

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
      void fetchAiUsage().finally(() => {
        if (!cancelled) setAiUsageLoading(false);
      });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
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
      await Promise.all([fetchAiUsage(), refreshProEntitlement({ force: true })]);
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

  const releasePendingImportZip = useCallback(async (zipPath: string | null) => {
    if (!zipPath) return;
    const cache = getCachesDirectoryPath();
    if (!zipPath.startsWith(cache)) return;
    try {
      const exists = await NitroFS.exists(zipPath);
      if (exists) {
        await NitroFS.unlink(zipPath);
      }
    } catch {
      if (__DEV__) {
        console.warn('[releasePendingImportZip] failed', zipPath);
      }
    }
  }, []);

  const processImportResult = useCallback(
    (result: ImportResult) => {
      if (!result.success) {
        if ('needsPassword' in result) {
          setPendingImportZipPath(result.zipFsPath);
          setBackupPasswordSheetMode('import');
          setBackupPasswordSheetVisible(true);
          return;
        }
        if (result.error === 'cancelled') {
          void releasePendingImportZip(pendingImportZipPath);
          setPendingImportZipPath(null);
          return;
        }
        if (result.error === IMPORT_ERROR_WRONG_BACKUP_PASSWORD) {
          Alert.alert(t('common.error'), t('importExport.wrongBackupPassword'));
          return;
        }
        Alert.alert(t('common.error'), result.error);
        void releasePendingImportZip(pendingImportZipPath);
        setPendingImportZipPath(null);
        return;
      }
      void releasePendingImportZip(pendingImportZipPath);
      setPendingImportZipPath(null);
      navigation.navigate('ImportRecords', {
        records: result.records,
        folders: result.folders,
        legacyFolders: result.legacyFolders,
      });
    },
    [navigation, pendingImportZipPath, releasePendingImportZip, t],
  );

  const runExport = useCallback(
    async (password?: string) => {
      try {
        setIsExporting(true);
        const records = useRecordStore.getState().records;
        const folderStore = useFolderStore.getState();
        if (!folderStore.isLoaded) {
          await folderStore.load();
        }
        const folders = useFolderStore.getState().folders;
        await exportData(records, folders, password ? { password } : undefined);
      } catch {
        Alert.alert(t('common.error'), t('importExport.exportError'));
      } finally {
        setIsExporting(false);
      }
    },
    [t],
  );

  const handleEncryptBackupChange = useCallback((value: boolean) => {
    if (!value) {
      setBackupEncryptEnabledState(false);
      setBackupEncryptExportEnabled(false);
      return;
    }
    if (!getBackupEncryptionNoticeAcknowledged()) {
      pendingEnableEncryptAfterNoticeRef.current = true;
      setBackupNoticeSheetVisible(true);
      return;
    }
    setBackupEncryptEnabledState(true);
    setBackupEncryptExportEnabled(true);
  }, []);

  const handleBackupNoticeAcknowledge = useCallback(() => {
    setBackupEncryptionNoticeAcknowledged();
    setBackupNoticeSheetVisible(false);
    if (pendingEnableEncryptAfterNoticeRef.current) {
      pendingEnableEncryptAfterNoticeRef.current = false;
      setBackupEncryptEnabledState(true);
      setBackupEncryptExportEnabled(true);
    }
  }, []);

  const handleBackupNoticeClose = useCallback(() => {
    pendingEnableEncryptAfterNoticeRef.current = false;
    setBackupNoticeSheetVisible(false);
  }, []);

  const handleBackupPasswordSheetClose = useCallback(() => {
    setBackupPasswordSheetVisible(false);
    if (backupPasswordSheetMode === 'import' && pendingImportZipPath) {
      void releasePendingImportZip(pendingImportZipPath);
      setPendingImportZipPath(null);
    }
  }, [backupPasswordSheetMode, pendingImportZipPath, releasePendingImportZip]);

  const handleBackupPasswordSubmit = useCallback(
    async (password: string) => {
      if (backupPasswordSheetMode === 'export') {
        setBackupPasswordSheetVisible(false);
        await runExport(password);
        return;
      }
      const zipPath = pendingImportZipPath;
      if (!zipPath) {
        setBackupPasswordSheetVisible(false);
        return;
      }
      try {
        setIsImporting(true);
        const result = await importData({ zipFsPath: zipPath, password });
        if (result.success) {
          setBackupPasswordSheetVisible(false);
        }
        processImportResult(result);
      } catch {
        Alert.alert(t('common.error'), t('importExport.importError'));
      } finally {
        setIsImporting(false);
      }
    },
    [backupPasswordSheetMode, pendingImportZipPath, processImportResult, runExport, t],
  );

  const handleExport = useCallback(() => {
    if (backupEncryptEnabled) {
      setBackupPasswordSheetMode('export');
      setBackupPasswordSheetVisible(true);
      return;
    }
    void runExport();
  }, [backupEncryptEnabled, runExport]);

  const handleImport = useCallback(async () => {
    setPendingImportZipPath(null);
    try {
      setIsImporting(true);
      const result = await importData();
      processImportResult(result);
    } catch {
      Alert.alert(t('common.error'), t('importExport.importError'));
    } finally {
      setIsImporting(false);
    }
  }, [processImportResult, t]);

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
    openPlanPaywall();
  }, [i18n.language, monetizationMode, proEntitlementActive, resolvedColorScheme, t]);

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
    monetizationMode,
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
    isPrivateMode,
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
    backupEncryptEnabled,
    handleEncryptBackupChange,
    backupNoticeSheetVisible,
    handleBackupNoticeAcknowledge,
    handleBackupNoticeClose,
    backupPasswordSheetVisible,
    backupPasswordSheetMode,
    handleBackupPasswordSheetClose,
    handleBackupPasswordSubmit,
    isExporting,
    isImporting,
    handleExport,
    handleImport,
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
