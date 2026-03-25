import React from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { ProLicenseKeyModal } from '@/features/pro-license';
import { isCrashlyticsDebugEnabled } from '@/shared/config/buildEnv';
import { useTabletContentMaxWidth } from '@/shared/lib';
import { SCREEN_PADDING } from '@/shared/ui';

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
  const insets = useSafeAreaInsets();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;

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
        <Text className="text-2xl font-bold" style={{ color: settings.color.text.primary }}>
          {settings.t('settings.title')}
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
            paddingTop: 44,
            paddingBottom: insets.bottom + 28,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={settings.refreshing}
              onRefresh={settings.onRefresh}
              tintColor={settings.color.status.processing.text}
              colors={[settings.color.status.processing.text]}
              progressBackgroundColor={settings.color.background.secondary}
              progressViewOffset={Platform.OS === 'android' ? 12 : undefined}
            />
          }
        >
          <SettingsPlanStatusCard
            color={settings.color}
            monetizationMode={settings.monetizationMode}
            aiLimit={settings.proWeeklyLimit}
            onPress={settings.handlePlanCardPress}
          />
          <AiUsageCard
            usage={settings.aiUsage}
            loading={settings.aiUsageLoading}
            onClaimBonus={settings.adsAllowed ? settings.claim : undefined}
            claimLoading={settings.claimLoading}
            claimError={settings.claimError}
          />
          <SettingsAutomationSection
            color={settings.color}
            t={settings.t}
            automationLocked={settings.automationLocked}
            autoTranscribeOnSave={settings.autoTranscribeOnSave}
            setAutoTranscribeOnSave={settings.setAutoTranscribeOnSave}
            autoAiAfterTranscription={settings.autoAiAfterTranscription}
            setAutoAiAfterTranscription={settings.setAutoAiAfterTranscription}
            onLockedPress={settings.setAutomationSheet}
          />
          <SettingsAiProcessingSection
            color={settings.color}
            t={settings.t}
            navigation={settings.navigation}
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
          {__DEV__ && isCrashlyticsDebugEnabled() && (
            <SettingsDebugSection color={settings.color} />
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
        />
        <AutomationComingSoonSheet
          visible={settings.automationSheet !== null}
          feature={settings.automationSheet ?? 'autoTranscribe'}
          onClose={() => settings.setAutomationSheet(null)}
        />
      </View>
    </View>
  );
};
