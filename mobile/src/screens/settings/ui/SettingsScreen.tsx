import { useFocusEffect } from '@react-navigation/native';
import { Bug } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { ProLimitResetSuccessSheet } from '@/features/ai-limit-reset';
import { cancelGithubConnectSession } from '@/features/github-sync/lib/githubSyncConnectSession';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { openPlanPaywall } from '@/features/plan-paywall';
import { isInternalDebugBuild } from '@/shared/config/buildEnv';
import {
  IS_ANDROID,
  useIsTablet,
  useScrollToTopOnTabPress,
  useTabletContentMaxWidth,
} from '@/shared/lib';
import { PrivateExecutionBadge, SCREEN_PADDING, SettingsRow, SettingsSection } from '@/shared/ui';

import { useSettingsScreen } from '../lib/useSettingsScreen';
import { AiUsageCard } from './AiUsageCard';
import { AutoArchiveDelaySheet } from './AutoArchiveDelaySheet';
import { AutomationComingSoonSheet } from './AutomationComingSoonSheet';
import { BackupEncryptionNoticeSheet } from './BackupEncryptionNoticeSheet';
import { BackupPasswordSheet } from './BackupPasswordSheet';
import {
  SettingsAiProcessingSection,
  SettingsAppearanceSection,
  SettingsAutomationSection,
  SettingsBackupSection,
  SettingsDeviceSection,
  SettingsDigestSection,
  SettingsPermissionsSection,
  SettingsPrivacySection,
} from './sections';
import { SettingsPlanStatusCard } from './SettingsPlanStatusCard';

export const SettingsScreen = () => {
  const settings = useSettingsScreen();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const scrollOffsetRef = useRef(0);
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  useScrollToTopOnTabPress(scrollRef);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  useFocusEffect(
    useCallback(() => {
      const y = scrollOffsetRef.current;
      if (y <= 0) {
        return;
      }
      const frame = requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y, animated: false });
      });
      return () => cancelAnimationFrame(frame);
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        cancelGithubConnectSession();
      };
    }, []),
  );

  useEffect(() => {
    const unsubscribe = settings.navigation.addListener('blur', () => {
      cancelGithubConnectSession();
    });
    return unsubscribe;
  }, [settings.navigation]);

  const showDebugEntry = isInternalDebugBuild();

  return (
    <View style={{ flex: 1, backgroundColor: settings.color.background.secondary }}>
      <View
        style={{
          backgroundColor: settings.color.background.primary,
          borderBottomWidth: 1,
          borderBottomColor: settings.color.border.default,
          paddingTop: insets.top + 16,
          paddingHorizontal: SCREEN_PADDING,
          paddingBottom: 12,
        }}
      >
        <View className="flex-row items-center gap-2">
          <Text className="text-2xl font-bold" style={{ color: settings.color.text.primary }}>
            {settings.t('settings.title')}
          </Text>
          {settings.isPrivateMode ? <PrivateExecutionBadge color={settings.color} compact /> : null}
        </View>
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
          ref={scrollRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_PADDING,
            paddingTop: 16,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={settings.refreshing}
              onRefresh={settings.onRefresh}
              tintColor={settings.color.status.processing.text}
              colors={[settings.color.status.processing.text]}
              progressBackgroundColor={settings.color.background.secondary}
              progressViewOffset={IS_ANDROID ? 12 : undefined}
            />
          }
        >
          <SettingsPlanStatusCard
            color={settings.color}
            monetizationMode={settings.monetizationMode}
            storeProEntitlementActive={
              settings.proEntitlementActive && settings.monetizationMode === 'iap_public'
                ? (settings.planCardStoreProActive ?? undefined)
                : undefined
            }
            onPress={settings.handlePlanCardPress}
          />
          {!settings.isPrivateMode && (
            <AiUsageCard
              usage={settings.aiUsage}
              loading={settings.aiUsageLoading}
              onClaimBonus={settings.adsAllowed ? settings.claim : undefined}
              onResetProLimit={settings.canResetProLimit ? settings.resetProLimit : undefined}
              onOpenDetails={() => settings.navigation.navigate('AiUsageDashboard')}
              claimLoading={settings.claimLoading}
              claimError={settings.claimError}
              resetLoading={settings.resetProLimitLoading}
              resetError={settings.resetProLimitError}
              resetPriceLabel={settings.resetProLimitPriceLabel}
            />
          )}
          {settings.digestAiEnabled ? (
            <SettingsDigestSection
              color={settings.color}
              onOpenDigest={() => settings.navigation.navigate('Digest')}
              onOpenSiriShortcuts={() => settings.navigation.navigate('SiriShortcuts')}
              t={settings.t}
            />
          ) : null}
          {!settings.isPrivateMode && (
            <SettingsAutomationSection
              color={settings.color}
              t={settings.t}
              automationLocked={settings.automationLocked}
              autoTranscribeOnSave={settings.autoTranscribeOnSave}
              setAutoTranscribeOnSave={settings.setAutoTranscribeOnSave}
              autoAiAfterTranscription={settings.autoAiAfterTranscription}
              setAutoAiAfterTranscription={settings.setAutoAiAfterTranscription}
              autoArchiveEnabled={settings.autoArchiveEnabled}
              setAutoArchiveEnabled={settings.setAutoArchiveEnabled}
              autoArchiveAfterDays={settings.autoArchiveAfterDays}
              onAutoArchiveDelayPress={settings.handleAutoArchiveDelayPress}
              onLockedPress={settings.setAutomationSheet}
            />
          )}
          <SettingsAiProcessingSection
            color={settings.color}
            t={settings.t}
            navigation={settings.navigation}
            privateAiModeValue={settings.privateAiModeValue}
            aiModelName={settings.aiModelName}
            aiModelLockedByPrivateRemote={settings.aiModelLockedByPrivateRemote}
            transcriptionValue={settings.transcriptionValue}
            embeddingAvailable={settings.embeddingAvailable}
            isUpdatingEmbeddings={settings.isUpdatingEmbeddings}
            onUpdateEmbeddings={settings.handleUpdateEmbeddings}
          />
          <SettingsBackupSection
            color={settings.color}
            t={settings.t}
            language={settings.appLanguage}
            recordsCount={settings.recordsCount}
            encryptBackup={settings.backupEncryptEnabled}
            onEncryptBackupChange={settings.handleEncryptBackupChange}
            isExporting={settings.isExporting}
            isImporting={settings.isImporting}
            onExport={settings.handleExport}
            onImport={settings.handleImport}
          />
          <SettingsAppearanceSection
            color={settings.color}
            t={settings.t}
            navigation={settings.navigation}
            appLanguage={settings.appLanguage}
            appTheme={settings.appTheme}
            isPrivateMode={settings.isPrivateMode}
          />
          <SettingsPermissionsSection
            color={settings.color}
            t={settings.t}
            navigation={settings.navigation}
            micStatus={settings.micStatus}
            onMicPress={settings.handleMicPermission}
          />
          <SettingsDeviceSection
            color={settings.color}
            t={settings.t}
            navigation={settings.navigation}
            isAppLockEnabled={settings.isAppLockEnabled}
          />
          <SettingsPrivacySection
            color={settings.color}
            t={settings.t}
            navigation={settings.navigation}
            onRateApp={settings.handleRateApp}
          />
          {showDebugEntry && (
            <SettingsSection title={settings.t('settings.debugScreen.title')}>
              <SettingsRow
                label={settings.t('settings.debugScreen.entryRow')}
                leftIcon={<Bug size={20} color={settings.color.icon.muted} strokeWidth={1.8} />}
                onPress={settings.openDebugScreen}
                isFirst
                isLast
              />
            </SettingsSection>
          )}
          <DeferredInboxBannerAd color={settings.color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
        <BackupEncryptionNoticeSheet
          visible={settings.backupNoticeSheetVisible}
          onClose={settings.handleBackupNoticeClose}
          onAcknowledge={settings.handleBackupNoticeAcknowledge}
        />
        <BackupPasswordSheet
          visible={settings.backupPasswordSheetVisible}
          mode={settings.backupPasswordSheetMode}
          busy={settings.isExporting || settings.isImporting}
          onClose={settings.handleBackupPasswordSheetClose}
          onSubmit={(password) => void settings.handleBackupPasswordSubmit(password)}
        />
        <ProLimitResetSuccessSheet
          visible={settings.resetProLimitSuccessSheet != null}
          onClose={settings.dismissResetProLimitSuccessSheet}
          restoredAmount={settings.resetProLimitSuccessSheet?.reset.restoredAmount ?? 0}
          limit={settings.resetProLimitSuccessSheet?.reset.limit ?? 0}
          alreadyApplied={settings.resetProLimitSuccessSheet?.alreadyApplied ?? false}
        />
        {!settings.isPrivateMode && (
          <>
            <AutomationComingSoonSheet
              visible={settings.automationSheet !== null}
              feature={settings.automationSheet ?? 'autoTranscribe'}
              onUpgradePress={() => {
                settings.setAutomationSheet(null);
                openPlanPaywall();
              }}
              onClose={() => settings.setAutomationSheet(null)}
            />
            <AutoArchiveDelaySheet
              visible={settings.autoArchiveDelaySheetVisible}
              selectedDays={settings.autoArchiveAfterDays}
              onSelect={settings.handleAutoArchiveDelaySelect}
              onClose={settings.handleAutoArchiveDelaySheetClose}
            />
          </>
        )}
      </View>
    </View>
  );
};
