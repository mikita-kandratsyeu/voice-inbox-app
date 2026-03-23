import { crash, getCrashlytics } from '@react-native-firebase/crashlytics';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  AlertTriangle,
  Bell,
  Bot,
  Download,
  FileText,
  Fingerprint,
  HardDrive,
  Info,
  Languages,
  Mic,
  Moon,
  RefreshCw,
  Settings2,
  Shield,
  Sparkles,
  Star,
  UploadCloud,
  Zap,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AppState,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SettingsStackParamList } from '@/app/navigation/types';
import { useAppLockStore } from '@/entities/app-lock';
import { useRecordStore } from '@/entities/record';
import { AI_MODELS, useSettingsStore, WHISPER_MODELS } from '@/entities/settings';
import { openAppReviewFromSettings } from '@/features/app-review';
import {
  getMonetizationMode,
  isAutomationUiLockedForPublicStore,
  useAdsAllowed,
} from '@/features/app-storefront';
import { useClaimAiBonus } from '@/features/claim-ai-bonus';
import { regenerateAllEmbeddings } from '@/features/embedding-generation';
import { openInAppBrowser } from '@/features/in-app-browser';
import { InboxBannerAd } from '@/features/inbox-banner';
import { ProLicenseKeyModal, useProEntitlement } from '@/features/pro-license';
import { exportData, importData } from '@/features/sync-data';
import { getWebsiteUrl, useColors } from '@/shared/config';
import { isCrashlyticsDebugEnabled } from '@/shared/config/buildEnv';
import { IS_IOS, useTabletContentMaxWidth } from '@/shared/lib';
import { getAiUsage } from '@/shared/lib/ai-api';
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
import { SCREEN_PADDING, SettingsRow, SettingsSection } from '@/shared/ui';

import { AiUsageCard } from './AiUsageCard';
import { AutomationComingSoonSheet, type AutomationFeatureKind } from './AutomationComingSoonSheet';
import { SettingsPlanPaywallSheet } from './SettingsPlanPaywallSheet';
import { SettingsPlanStatusCard } from './SettingsPlanStatusCard';

export const SettingsScreen = () => {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;

  const selectedAIModel = useSettingsStore((s) => s.selectedAIModel);
  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const autoTranscribeOnSave = useSettingsStore((s) => s.autoTranscribeOnSave);
  const setAutoTranscribeOnSave = useSettingsStore((s) => s.setAutoTranscribeOnSave);
  const autoAiAfterTranscription = useSettingsStore((s) => s.autoAiAfterTranscription);
  const setAutoAiAfterTranscription = useSettingsStore((s) => s.setAutoAiAfterTranscription);
  const appLanguage = useSettingsStore((s) => s.appLanguage);
  const appTheme = useSettingsStore((s) => s.appTheme);
  const isAppLockEnabled = useAppLockStore((s) => s.isEnabled);
  const records = useRecordStore((s) => s.records);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [aiUsage, setAiUsage] = useState<Awaited<ReturnType<typeof getAiUsage>>>(null);
  const [aiUsageLoading, setAiUsageLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUpdatingEmbeddings, setIsUpdatingEmbeddings] = useState(false);
  const [micStatus, setMicStatus] = useState<MicPermissionStatus | null>(null);
  const [pushStatus, setPushStatus] = useState<PushPermissionStatus | null>(null);
  const [automationSheet, setAutomationSheet] = useState<AutomationFeatureKind | null>(null);
  const [planPaywallVisible, setPlanPaywallVisible] = useState(false);
  const [internalUpgradeVisible, setInternalUpgradeVisible] = useState(false);
  const { refresh: refreshProEntitlement, isProActive: proEntitlementActive } = useProEntitlement();
  const automationLocked = isAutomationUiLockedForPublicStore(proEntitlementActive);
  const monetizationMode = getMonetizationMode();

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
    fetchAiUsage().finally(() => {
      if (!cancelled) setAiUsageLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchAiUsage]);

  const refreshPermissions = useCallback(async () => {
    const mic = await checkMicPermission();
    setMicStatus(mic);
    if (IS_IOS) {
      const push = await checkPushPermission();
      setPushStatus(push);
    }
  }, []);

  useEffect(() => {
    refreshPermissions();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshPermissions();
      }
    });
    return () => sub.remove();
  }, [refreshPermissions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchAiUsage(), refreshProEntitlement({ force: true })]);
    setRefreshing(false);
  }, [fetchAiUsage, refreshProEntitlement]);

  const aiModelName = AI_MODELS.find((m) => m.id === selectedAIModel)?.name ?? selectedAIModel;
  const whisperStatus = whisperModelStatuses[selectedWhisperModel] ?? 'not_downloaded';
  const whisperModelLabel =
    WHISPER_MODELS.find((m) => m.id === selectedWhisperModel)?.name ?? selectedWhisperModel;
  const transcriptionValue =
    whisperStatus === 'not_downloaded'
      ? t('settings.whisperModelNotSet')
      : `Whisper ${whisperModelLabel}`;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportData(records);
    } catch {
      Alert.alert(t('common.error'), t('importExport.exportError'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
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
  };

  const handleUpdateEmbeddings = useCallback(() => {
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
  }, [records, t]);

  const handleNotificationsPress = useCallback(async () => {
    if (!IS_IOS) return;

    if (pushStatus === 'denied') {
      await openAppSettings();
      return;
    }

    if (pushStatus === 'granted') return;

    // not-determined: only request permission. Registration runs automatically
    // on app load or when app becomes active (user backgrounds and returns).
    const status = await requestPushPermission();
    setPushStatus(status);
  }, [pushStatus]);

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
      return;
    }
    setPlanPaywallVisible(true);
  }, [proEntitlementActive]);

  const handleUpgradePress = useCallback(() => {
    if (monetizationMode === 'internal_license') {
      setPlanPaywallVisible(false);
      setInternalUpgradeVisible(true);
      return;
    }
    if (monetizationMode === 'iap_public') {
      Alert.alert(t('settings.planPaywall.upgrade'), t('settings.planPaywall.iapNotReady'));
    }
  }, [monetizationMode, t]);

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <View
        style={{
          backgroundColor: color.background.primary,
          borderBottomWidth: 1,
          borderBottomColor: color.border.default,
          paddingTop: insets.top + 16,
          paddingHorizontal: SCREEN_PADDING,
          paddingBottom: 12,
        }}
      >
        <Text className="text-2xl font-bold" style={{ color: color.text.primary }}>
          {t('settings.title')}
        </Text>
      </View>

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
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: 24,
            paddingBottom: insets.bottom + 28,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={color.status.processing.text}
              colors={[color.status.processing.text]}
              progressBackgroundColor={color.background.secondary}
            />
          }
        >
          <SettingsPlanStatusCard
            color={color}
            monetizationMode={monetizationMode}
            onPress={handlePlanCardPress}
          />
          <AiUsageCard
            usage={aiUsage}
            loading={aiUsageLoading}
            onClaimBonus={adsAllowed ? claim : undefined}
            claimLoading={claimLoading}
            claimError={claimError}
          />
          <SettingsSection title={t('settings.automation')}>
            <SettingsRow
              label={t('settings.autoTranscribeOnSave')}
              leftIcon={<Zap size={20} color={color.accent.transcript} strokeWidth={1.8} />}
              rightSlot={
                <View
                  className="flex-row items-center gap-2"
                  pointerEvents={automationLocked ? 'none' : 'box-none'}
                >
                  <Switch
                    disabled={automationLocked}
                    value={automationLocked ? false : autoTranscribeOnSave}
                    onValueChange={setAutoTranscribeOnSave}
                    trackColor={{
                      false: color.background.tertiary,
                      true: color.accent.primary,
                    }}
                    thumbColor={color.icon.onAccent}
                  />
                </View>
              }
              showChevron={false}
              onPress={automationLocked ? () => setAutomationSheet('autoTranscribe') : undefined}
              isFirst
            />
            <SettingsRow
              label={t('settings.autoAiAfterTranscription')}
              leftIcon={<Sparkles size={20} color={color.accent.primary} strokeWidth={1.8} />}
              rightSlot={
                <View
                  className="flex-row items-center gap-2"
                  pointerEvents={automationLocked ? 'none' : 'box-none'}
                >
                  <Switch
                    disabled={automationLocked}
                    value={automationLocked ? false : autoAiAfterTranscription}
                    onValueChange={setAutoAiAfterTranscription}
                    trackColor={{
                      false: color.background.tertiary,
                      true: color.accent.primary,
                    }}
                    thumbColor={color.icon.onAccent}
                  />
                </View>
              }
              showChevron={false}
              onPress={automationLocked ? () => setAutomationSheet('autoAi') : undefined}
              isLast
            />
          </SettingsSection>
          <SettingsSection title={t('settings.aiProcessing')}>
            <SettingsRow
              label={t('settings.aiModel')}
              value={aiModelName}
              leftIcon={<Bot size={20} color={color.accent.transcript} strokeWidth={1.8} />}
              onPress={() => navigation.navigate('AIModelPicker')}
              isFirst
            />
            <SettingsRow
              label={t('settings.transcription')}
              value={transcriptionValue}
              leftIcon={<Mic size={20} color={color.accent.cache} strokeWidth={1.8} />}
              onPress={() => navigation.navigate('WhisperModelPicker')}
            />
            <SettingsRow
              label={t('settings.aiSettings')}
              leftIcon={<Settings2 size={20} color={color.accent.transcript} strokeWidth={1.8} />}
              onPress={() => navigation.navigate('AiSettings')}
              isLast={!isEmbeddingAvailable()}
            />
            {isEmbeddingAvailable() && (
              <SettingsRow
                label={
                  isUpdatingEmbeddings
                    ? t('settings.updatingEmbeddings')
                    : t('settings.updateEmbeddings')
                }
                leftIcon={<RefreshCw size={20} color={color.accent.primary} strokeWidth={1.8} />}
                onPress={isUpdatingEmbeddings ? undefined : handleUpdateEmbeddings}
                isLast
              />
            )}
          </SettingsSection>
          <SettingsSection title={t('settings.backupRestore')}>
            <SettingsRow
              label={isExporting ? t('settings.exporting') : t('settings.export')}
              value={t('inbox.recordsCount', { count: records.length })}
              leftIcon={<UploadCloud size={20} color={color.accent.primary} strokeWidth={1.8} />}
              onPress={handleExport}
              isFirst
            />
            <SettingsRow
              label={isImporting ? t('settings.importing') : t('settings.import')}
              leftIcon={<Download size={20} color={color.accent.primary} strokeWidth={1.8} />}
              onPress={handleImport}
              isLast
            />
          </SettingsSection>
          <SettingsSection title={t('settings.appearance')}>
            <SettingsRow
              label={t('settings.appLanguage')}
              value={t(`appearance.languageOption.${appLanguage}`)}
              leftIcon={<Languages size={20} color={color.accent.primary} strokeWidth={1.8} />}
              onPress={() => navigation.navigate('Appearance')}
              isFirst
            />
            <SettingsRow
              label={t('settings.appTheme')}
              value={t(`appearance.themeOption.${appTheme}`)}
              leftIcon={<Moon size={20} color={color.accent.primary} strokeWidth={1.8} />}
              onPress={() => navigation.navigate('Appearance')}
              isLast
            />
          </SettingsSection>
          <SettingsSection title={t('settings.permissionsSection')}>
            <SettingsRow
              label={t('settings.permissionMicrophone')}
              leftIcon={<Mic size={20} color={color.accent.primary} strokeWidth={1.8} />}
              onPress={micStatus === 'granted' ? undefined : handleMicPermission}
              showChevron={micStatus !== 'granted'}
              rightSlot={
                micStatus !== null ? (
                  <View
                    className="rounded-full px-2.5 py-1"
                    style={{
                      backgroundColor:
                        micStatus === 'granted'
                          ? color.onboarding.zap.bg
                          : micStatus === 'denied'
                            ? color.status.error.bg
                            : color.background.tertiary,
                    }}
                  >
                    <Text
                      className="text-[12px] font-semibold"
                      style={{
                        color:
                          micStatus === 'granted'
                            ? color.accent.success
                            : micStatus === 'denied'
                              ? color.status.error.text
                              : color.text.secondary,
                      }}
                    >
                      {micStatus === 'granted'
                        ? t('settings.permissionGranted')
                        : micStatus === 'denied'
                          ? t('settings.permissionDenied')
                          : t('settings.permissionNotDetermined')}
                    </Text>
                  </View>
                ) : null
              }
              isFirst
              isLast={!IS_IOS}
            />
            {IS_IOS && (
              <SettingsRow
                label={t('settings.permissionNotifications')}
                leftIcon={<Bell size={20} color={color.accent.primary} strokeWidth={1.8} />}
                onPress={pushStatus === 'granted' ? undefined : handleNotificationsPress}
                showChevron={pushStatus !== 'granted'}
                rightSlot={
                  pushStatus !== null ? (
                    <View
                      className="rounded-full px-2.5 py-1"
                      style={{
                        backgroundColor:
                          pushStatus === 'granted'
                            ? color.onboarding.zap.bg
                            : pushStatus === 'denied'
                              ? color.status.error.bg
                              : color.background.tertiary,
                      }}
                    >
                      <Text
                        className="text-[12px] font-semibold"
                        style={{
                          color:
                            pushStatus === 'granted'
                              ? color.accent.success
                              : pushStatus === 'denied'
                                ? color.status.error.text
                                : color.text.secondary,
                        }}
                      >
                        {pushStatus === 'granted'
                          ? t('settings.permissionGranted')
                          : pushStatus === 'denied'
                            ? t('settings.permissionDenied')
                            : t('settings.permissionNotDetermined')}
                      </Text>
                    </View>
                  ) : null
                }
                isLast
              />
            )}
          </SettingsSection>
          <SettingsSection title={t('settings.device')}>
            <SettingsRow
              label={t('settings.appLock')}
              value={isAppLockEnabled ? t('settings.on') : t('settings.off')}
              leftIcon={<Fingerprint size={20} color={color.accent.primary} strokeWidth={1.8} />}
              onPress={() => navigation.navigate('AppLockSetup')}
              isFirst
            />
            <SettingsRow
              label={t('settings.offlineStorage')}
              leftIcon={<HardDrive size={20} color={color.accent.success} strokeWidth={1.8} />}
              onPress={() => navigation.navigate('StorageDetails')}
              isLast
            />
          </SettingsSection>

          <SettingsSection title={t('settings.privacy')}>
            <SettingsRow
              label={t('settings.termsOfService')}
              leftIcon={<FileText size={20} color={color.icon.muted} strokeWidth={1.8} />}
              onPress={() => openInAppBrowser(`${getWebsiteUrl()}/terms`)}
              isFirst
            />
            <SettingsRow
              label={t('settings.privacyPolicy')}
              leftIcon={<Shield size={20} color={color.icon.muted} strokeWidth={1.8} />}
              onPress={() => openInAppBrowser(`${getWebsiteUrl()}/privacy`)}
            />
            <SettingsRow
              label={t('settings.rateApp')}
              leftIcon={<Star size={20} color={color.icon.muted} strokeWidth={1.8} />}
              onPress={handleRateApp}
            />
            <SettingsRow
              label={t('settings.about')}
              leftIcon={<Info size={20} color={color.icon.muted} strokeWidth={1.8} />}
              onPress={() => navigation.navigate('AboutApp')}
              isLast
            />
          </SettingsSection>
          {__DEV__ && isCrashlyticsDebugEnabled() && (
            <SettingsSection title="Debug">
              <SettingsRow
                label="Test Crashlytics (native crash)"
                leftIcon={
                  <AlertTriangle size={20} color={color.status.error.text} strokeWidth={1.8} />
                }
                onPress={() => crash(getCrashlytics())}
                showChevron={false}
                isFirst
                isLast
                dangerous
              />
            </SettingsSection>
          )}
          <InboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
        <ProLicenseKeyModal
          visible={internalUpgradeVisible}
          onClose={() => setInternalUpgradeVisible(false)}
          onActivated={() => {
            setInternalUpgradeVisible(false);
            void refreshProEntitlement({ force: true });
          }}
        />
        <SettingsPlanPaywallSheet
          visible={planPaywallVisible}
          mode={monetizationMode}
          onClose={() => setPlanPaywallVisible(false)}
          onUpgradePress={handleUpgradePress}
        />
        <AutomationComingSoonSheet
          visible={automationSheet !== null}
          feature={automationSheet ?? 'autoTranscribe'}
          onClose={() => setAutomationSheet(null)}
        />
      </View>
    </View>
  );
};
