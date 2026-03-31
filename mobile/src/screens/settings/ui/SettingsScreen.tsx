import React, { useRef } from 'react';
import { RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { ProLicenseKeyModal } from '@/features/pro-license';
import { isCrashlyticsDebugEnabled, isTestflightInternalBuild } from '@/shared/config/buildEnv';
import {
  IS_ANDROID,
  useIsTablet,
  useScrollToTopOnTabPress,
  useTabletContentMaxWidth,
} from '@/shared/lib';
import { PrivateModeBadge, SCREEN_PADDING } from '@/shared/ui';

import { useSettingsScreen } from '../lib/useSettingsScreen';
import { AiUsageCard } from './AiUsageCard';
import { AutomationComingSoonSheet } from './AutomationComingSoonSheet';
import {
  SettingsAiProcessingSection,
  SettingsAppearanceSection,
  SettingsAutomationSection,
  SettingsBackupSection,
  SettingsDebugSection,
  SettingsDeviceSection,
  SettingsPermissionsSection,
  SettingsPrivacySection,
} from './sections';
import { SettingsInternalTechInfo } from './SettingsInternalTechInfo';
import { SettingsPlanPaywallSheet } from './SettingsPlanPaywallSheet';
import { SettingsPlanStatusCard } from './SettingsPlanStatusCard';

export const SettingsScreen = () => {
  const settings = useSettingsScreen();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  useScrollToTopOnTabPress(scrollRef);

  const showDebugSection = __DEV__ || isTestflightInternalBuild();
  const showCrashlyticsButton = __DEV__ && isCrashlyticsDebugEnabled();

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
          {settings.isPrivateMode && <PrivateModeBadge color={settings.color} compact />}
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
            onPress={settings.handlePlanCardPress}
          />
          {!settings.isPrivateMode && (
            <AiUsageCard
              usage={settings.aiUsage}
              loading={settings.aiUsageLoading}
              onClaimBonus={settings.adsAllowed ? settings.claim : undefined}
              claimLoading={settings.claimLoading}
              claimError={settings.claimError}
            />
          )}
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
            transcriptionValue={settings.transcriptionValue}
            embeddingAvailable={settings.embeddingAvailable}
            isUpdatingEmbeddings={settings.isUpdatingEmbeddings}
            onUpdateEmbeddings={settings.handleUpdateEmbeddings}
          />
          <SettingsBackupSection
            color={settings.color}
            t={settings.t}
            recordsCount={settings.recordsCount}
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
            micStatus={settings.micStatus}
            pushStatus={settings.pushStatus}
            onMicPress={settings.handleMicPermission}
            onNotificationsPress={settings.handleNotificationsPress}
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
          {showDebugSection && (
            <SettingsDebugSection
              color={settings.color}
              onHardReset={settings.handleHardReset}
              isHardResetting={settings.isHardResetting}
              showCrashlyticsButton={showCrashlyticsButton}
            />
          )}
          <SettingsInternalTechInfo />
          <DeferredInboxBannerAd color={settings.color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
        <ProLicenseKeyModal
          visible={settings.internalUpgradeVisible}
          onClose={() => settings.setInternalUpgradeVisible(false)}
          onActivated={() => {
            void settings.refreshProEntitlement({ force: true });
          }}
        />
        <SettingsPlanPaywallSheet
          visible={settings.planPaywallVisible}
          mode={settings.monetizationMode}
          freeAiLimit={settings.freeWeeklyLimit}
          proAiLimit={settings.proWeeklyLimit}
          onClose={() => settings.setPlanPaywallVisible(false)}
          onUpgradePress={settings.handleUpgradePress}
          onRestorePurchasesPress={settings.handleRestorePurchasesPress}
          iapBusy={settings.iapPaywallBusy}
          iapBilling={settings.iapBilling}
          selectedIapPeriod={settings.selectedIapPeriod}
          onIapBillingPeriodChange={settings.onIapBillingPeriodChange}
          iapProPriceLoading={settings.iapProPriceLoading}
        />
        {!settings.isPrivateMode && (
          <AutomationComingSoonSheet
            visible={settings.automationSheet !== null}
            feature={settings.automationSheet ?? 'autoTranscribe'}
            onUpgradePress={() => {
              settings.setAutomationSheet(null);
              settings.setPlanPaywallVisible(true);
            }}
            onClose={() => settings.setAutomationSheet(null)}
          />
        )}
      </View>
    </View>
  );
};
