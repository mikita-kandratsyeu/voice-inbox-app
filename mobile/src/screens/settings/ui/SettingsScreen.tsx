import { useFocusEffect } from '@react-navigation/native';
import { Bug } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { ProLimitResetSuccessSheet } from '@/features/ai-limit-reset';
import { cancelGithubConnectSession } from '@/features/github-sync/lib/githubSyncConnectSession';
import { cancelGitlabConnectSession } from '@/features/gitlab-sync/lib/gitlabSyncConnectSession';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { openPlanPaywall } from '@/features/plan-paywall';
import { isInternalDebugBuild } from '@/shared/config/buildEnv';
import {
  IS_ANDROID,
  useIsTablet,
  useScrollToTopOnTabPress,
  useTabletContentMaxWidth,
} from '@/shared/lib';
import { runAfterInteractions } from '@/shared/lib/runAfterInteractions';
import { PrivateExecutionBadge, SCREEN_PADDING, SettingsRow, SettingsSection } from '@/shared/ui';

import { getSettingsIconColor } from '../lib/settingsIconColor';
import { useSettingsScreen } from '../lib/useSettingsScreen';
import { AiUsageCard } from './AiUsageCard';
import { AutoArchiveDelaySheet } from './AutoArchiveDelaySheet';
import { AutomationComingSoonSheet } from './AutomationComingSoonSheet';
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

/** Survives stack pushes that unmount Settings or reset ScrollView offset while blurred. */
let persistedSettingsScrollY = 0;

export const SettingsScreen = () => {
  const settings = useSettingsScreen();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const trackScrollRef = useRef(true);
  const latestScrollYRef = useRef(0);
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  useScrollToTopOnTabPress(scrollRef, () => {
    latestScrollYRef.current = 0;
    persistedSettingsScrollY = 0;
  });

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    latestScrollYRef.current = y;
    if (!trackScrollRef.current) {
      return;
    }
    persistedSettingsScrollY = y;
  }, []);

  useFocusEffect(
    useCallback(() => {
      trackScrollRef.current = true;
      const y = persistedSettingsScrollY;

      const restoreTask = runAfterInteractions(() => {
        if (y <= 0) {
          return;
        }
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ y, animated: false });
          latestScrollYRef.current = y;
        });
      });

      return () => {
        // Save before blur: stack push can zero-out ScrollView and emit a spurious onScroll.
        persistedSettingsScrollY = latestScrollYRef.current;
        trackScrollRef.current = false;
        restoreTask.cancel();
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        cancelGithubConnectSession();
        cancelGitlabConnectSession();
      };
    }, []),
  );

  useEffect(() => {
    const unsubscribe = settings.navigation.addListener('blur', () => {
      cancelGithubConnectSession();
      cancelGitlabConnectSession();
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
          scrollsToTop={false}
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
            storeProEntitlementActive={
              settings.proEntitlementActive
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
          <SettingsDigestSection
            color={settings.color}
            onOpenDigest={() => settings.navigation.navigate('Digest')}
            onOpenSiriShortcuts={() => settings.navigation.navigate('SiriShortcuts')}
            t={settings.t}
          />
          <SettingsAutomationSection
            color={settings.color}
            t={settings.t}
            automationLocked={settings.automationLocked}
            autoAiLocked={
              settings.privateCustomServerModeActive ? settings.automationLocked : undefined
            }
            autoTranscribeOnSave={settings.autoTranscribeOnSave}
            setAutoTranscribeOnSave={settings.setAutoTranscribeOnSave}
            autoAiAfterTranscription={settings.autoAiAfterTranscription}
            setAutoAiAfterTranscription={settings.setAutoAiAfterTranscription}
            autoArchiveEnabled={settings.autoArchiveEnabled}
            setAutoArchiveEnabled={settings.setAutoArchiveEnabled}
            autoArchiveAfterDays={settings.autoArchiveAfterDays}
            onAutoArchiveDelayPress={settings.handleAutoArchiveDelayPress}
            onLockedPress={settings.setAutomationSheet}
            showAutoAiRow={!settings.isPrivateMode || settings.privateCustomServerModeActive}
            showAutoArchiveRow={!settings.isPrivateMode}
            navigation={settings.navigation}
            showPrivateAiQueueRow={settings.privateCustomServerModeActive}
            privateAiQueueCount={settings.privateAiQueueCount}
          />
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
            recordsCount={settings.recordsCount}
            navigation={settings.navigation}
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
                leftIcon={
                  <Bug
                    size={20}
                    color={getSettingsIconColor(settings.color, 'bug')}
                    strokeWidth={1.8}
                  />
                }
                onPress={settings.openDebugScreen}
                isFirst
                isLast
              />
            </SettingsSection>
          )}
          <DeferredInboxBannerAd color={settings.color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
        <ProLimitResetSuccessSheet
          visible={settings.resetProLimitSuccessSheet != null}
          onClose={settings.dismissResetProLimitSuccessSheet}
          restoredAmount={settings.resetProLimitSuccessSheet?.reset.restoredAmount ?? 0}
          limit={settings.resetProLimitSuccessSheet?.reset.limit ?? 0}
          alreadyApplied={settings.resetProLimitSuccessSheet?.alreadyApplied ?? false}
        />
        <AutomationComingSoonSheet
          visible={settings.automationSheet !== null}
          feature={settings.automationSheet ?? 'autoTranscribe'}
          onUpgradePress={() => {
            settings.setAutomationSheet(null);
            openPlanPaywall();
          }}
          onClose={() => settings.setAutomationSheet(null)}
        />
        {!settings.isPrivateMode ? (
          <AutoArchiveDelaySheet
            visible={settings.autoArchiveDelaySheetVisible}
            selectedDays={settings.autoArchiveAfterDays}
            onSelect={settings.handleAutoArchiveDelaySelect}
            onClose={settings.handleAutoArchiveDelaySheetClose}
          />
        ) : null}
      </View>
    </View>
  );
};
