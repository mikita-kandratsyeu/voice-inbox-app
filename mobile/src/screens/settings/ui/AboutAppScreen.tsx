import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { BookOpen, Globe, Mail, Tag } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { DeviceInfoModule } from 'react-native-nitro-device-info';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { SettingsStackParamList } from '@/app/navigation/types';
import { useSettingsStore } from '@/entities/settings';
import { getStoreListingUrl, openStoreListing } from '@/features/app-review';
import { openInAppBrowser } from '@/features/in-app-browser';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { useOnboardingStore } from '@/features/onboarding';
import {
  isRevenueCatStoreBillingConfigured,
  isStoreProEntitlementActiveNow,
  ProLicenseKeyModal,
  useProEntitlement,
} from '@/features/pro-license';
import { getWebsiteUrl, useColors } from '@/shared/config';
import { getProLicenseKeyActivationEnabled } from '@/shared/config/runtimeConfig';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

const VERSION_DISPLAY = DeviceInfoModule.version;

const storeListingUrl = getStoreListingUrl();

const LICENSE_KEY_EGG_TAPS = 8;
const LICENSE_KEY_EGG_RESET_MS = 1400;
const DIAGNOSTIC_LOGS_EGG_TAPS = 8;
const DIAGNOSTIC_LOGS_EGG_RESET_MS = 1400;
const DIAGNOSTIC_LOGS_STORE_DELAY_MS = 500;

export const AboutAppScreen = () => {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { isProActive, refresh: refreshProEntitlement } = useProEntitlement();

  const setForceShowOnboarding = useOnboardingStore((s) => s.setForceShow);
  const [proLicenseModalVisible, setProLicenseModalVisible] = useState(false);

  const eggTapRef = useRef({ count: 0, timer: null as ReturnType<typeof setTimeout> | null });
  const diagnosticLogsTapRef = useRef({
    count: 0,
    resetTimer: null as ReturnType<typeof setTimeout> | null,
    storeTimer: null as ReturnType<typeof setTimeout> | null,
  });

  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const isTablet = useIsTablet();

  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const isPrivateMode = aiExecutionMode === 'private_experimental';

  const handleAppIconPress = useCallback(() => {
    if (!getProLicenseKeyActivationEnabled() || isProActive) {
      return;
    }

    const st = eggTapRef.current;

    if (st.timer != null) {
      clearTimeout(st.timer);
    }

    st.count += 1;
    st.timer = setTimeout(() => {
      st.count = 0;
      st.timer = null;
    }, LICENSE_KEY_EGG_RESET_MS);

    if (st.count < LICENSE_KEY_EGG_TAPS) {
      return;
    }

    st.count = 0;

    if (st.timer != null) {
      clearTimeout(st.timer);
      st.timer = null;
    }

    void (async () => {
      const isStoreProEntitlementActive = await isStoreProEntitlementActiveNow();
      const isRevenueCatStoreBilling = isRevenueCatStoreBillingConfigured();

      if (isRevenueCatStoreBilling && isStoreProEntitlementActive) {
        return;
      }

      setProLicenseModalVisible(true);
    })();
  }, [isProActive]);

  const handleVersionPress = useCallback(() => {
    const st = diagnosticLogsTapRef.current;

    if (st.resetTimer != null) {
      clearTimeout(st.resetTimer);
    }
    if (st.storeTimer != null) {
      clearTimeout(st.storeTimer);
    }

    st.count += 1;
    st.resetTimer = setTimeout(() => {
      st.count = 0;
      st.resetTimer = null;
      st.storeTimer = null;
    }, DIAGNOSTIC_LOGS_EGG_RESET_MS);

    if (storeListingUrl) {
      st.storeTimer = setTimeout(() => {
        void openStoreListing();
      }, DIAGNOSTIC_LOGS_STORE_DELAY_MS);
    }

    if (st.count < DIAGNOSTIC_LOGS_EGG_TAPS) {
      return;
    }

    st.count = 0;

    if (st.resetTimer != null) {
      clearTimeout(st.resetTimer);
      st.resetTimer = null;
    }
    if (st.storeTimer != null) {
      clearTimeout(st.storeTimer);
      st.storeTimer = null;
    }

    navigation.navigate('DiagnosticLogs');
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ProLicenseKeyModal
        visible={proLicenseModalVisible}
        onClose={() => setProLicenseModalVisible(false)}
        onActivated={() => {
          void refreshProEntitlement({ force: true });
        }}
      />
      <ScreenHeader title={t('about.title')} onBack={() => navigation.goBack()} />
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
            paddingTop: 24,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-8 items-center">
            <Pressable
              accessibilityLabel={t('about.title')}
              accessibilityRole="image"
              onPress={handleAppIconPress}
              className="mb-4 h-20 w-20 overflow-hidden rounded-[22px]"
            >
              <Image
                source={require('@/shared/assets/app-icon.png')}
                className="h-full w-full"
                resizeMode="cover"
              />
            </Pressable>
            <Text className="text-[24px] font-bold" style={{ color: color.text.primary }}>
              Voice Inbox AI
            </Text>
            <Text
              className="mt-3 text-center text-[14px] leading-5 px-4"
              style={{ color: color.text.secondary }}
            >
              {t('about.description')}
            </Text>
          </View>
          <SettingsSection title={t('about.app')}>
            <SettingsRow
              label={t('about.version')}
              value={VERSION_DISPLAY}
              leftIcon={<Tag size={18} color={color.icon.muted} strokeWidth={1.8} />}
              showChevron={Boolean(storeListingUrl)}
              onPress={handleVersionPress}
              isFirst
            />
            {getWebsiteUrl().length > 0 && (
              <SettingsRow
                label={t('about.website')}
                leftIcon={<Globe size={18} color={color.icon.muted} strokeWidth={1.8} />}
                onPress={() => openInAppBrowser(getWebsiteUrl())}
              />
            )}
            {!isPrivateMode && (
              <SettingsRow
                label={t('about.showOnboarding')}
                leftIcon={<BookOpen size={18} color={color.icon.muted} strokeWidth={1.8} />}
                onPress={() => setForceShowOnboarding(true)}
                isLast
              />
            )}
          </SettingsSection>
          <View className="mb-6">
            <Text
              className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest"
              style={{ color: color.text.secondary }}
            >
              {t('about.poweredBy')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              <View
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: color.background.tertiary }}
              >
                <Text className="text-xs font-medium" style={{ color: color.text.secondary }}>
                  {t('about.badgeReactNative')}
                </Text>
              </View>
              <View
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: color.background.tertiary }}
              >
                <Text className="text-xs font-medium" style={{ color: color.text.secondary }}>
                  {t('about.badgeWhisper')}
                </Text>
              </View>
              <View
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: color.background.tertiary }}
              >
                <Text className="text-xs font-medium" style={{ color: color.text.secondary }}>
                  {t('about.badgeAi')}
                </Text>
              </View>
              <View
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: color.background.tertiary }}
              >
                <Text className="text-xs font-medium" style={{ color: color.text.secondary }}>
                  {t('about.badgeOpenRouter')}
                </Text>
              </View>
              {__DEV__ && (
                <View
                  className="rounded-full px-3 py-1.5"
                  style={{ backgroundColor: color.background.tertiary }}
                >
                  <Text className="text-xs font-medium" style={{ color: color.text.secondary }}>
                    __DEV__
                  </Text>
                </View>
              )}
            </View>
          </View>
          <SettingsSection title={t('about.helpAndFeedback')}>
            <SettingsRow
              label={t('about.contactSupport')}
              leftIcon={<Mail size={18} color={color.icon.muted} strokeWidth={1.8} />}
              onPress={() => navigation.navigate('Support')}
              isFirst
              isLast
            />
          </SettingsSection>
          <Text className="text-center text-[14px]" style={{ color: color.text.secondary }}>
            {t('about.copyright', { year: dayjs().year() })}
          </Text>
          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
      </View>
    </View>
  );
};
