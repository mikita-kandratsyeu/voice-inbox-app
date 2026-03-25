import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BookOpen, Globe, Mail, Tag } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { DeviceInfoModule } from 'react-native-nitro-device-info';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SettingsStackParamList } from '@/app/navigation/types';
import { getStoreListingUrl, openStoreListing } from '@/features/app-review';
import { getStorefrontCountryCode } from '@/features/app-storefront';
import { openInAppBrowser } from '@/features/in-app-browser';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { useOnboardingStore } from '@/features/onboarding';
import { getWebsiteUrl, useColors } from '@/shared/config';
import { isTestflightInternalBuild } from '@/shared/config/buildEnv';
import { IS_ANDROID, IS_IOS, useTabletContentMaxWidth } from '@/shared/lib';
import { ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

const VERSION_DISPLAY = DeviceInfoModule.version;

const storeListingUrl = getStoreListingUrl();

export const AboutAppScreen = () => {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const setForceShowOnboarding = useOnboardingStore((s) => s.setForceShow);
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const [storefrontRegion, setStorefrontRegion] = useState<string | null>(null);

  useEffect(() => {
    void getStorefrontCountryCode().then(setStorefrontRegion);
  }, []);

  let distributionMarketLabel: string | null = null;

  if (IS_IOS) {
    distributionMarketLabel = t('about.marketAppStore');
  } else if (IS_ANDROID) {
    distributionMarketLabel = t('about.marketGooglePlay');
  }

  const storefrontRegionTrimmed = storefrontRegion?.trim() ?? '';
  const distributionFooterText =
    distributionMarketLabel != null
      ? storefrontRegionTrimmed.length > 0
        ? t('about.distributionMarketWithRegion', {
            market: distributionMarketLabel,
            region: storefrontRegionTrimmed,
          })
        : t('about.distributionMarket', { market: distributionMarketLabel })
      : null;

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
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
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-8 items-center">
            <View
              accessibilityLabel={t('about.title')}
              accessibilityRole="image"
              className="mb-4 h-20 w-20 overflow-hidden rounded-[22px]"
            >
              <Image
                source={require('@/shared/assets/app-icon.png')}
                className="h-full w-full"
                resizeMode="cover"
              />
            </View>
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
              onPress={
                storeListingUrl
                  ? () => {
                      void openStoreListing();
                    }
                  : undefined
              }
              isFirst
            />
            {getWebsiteUrl().length > 0 && (
              <SettingsRow
                label={t('about.website')}
                leftIcon={<Globe size={18} color={color.icon.muted} strokeWidth={1.8} />}
                onPress={() => openInAppBrowser(getWebsiteUrl())}
              />
            )}
            <SettingsRow
              label={t('about.showOnboarding')}
              leftIcon={<BookOpen size={18} color={color.icon.muted} strokeWidth={1.8} />}
              onPress={() => setForceShowOnboarding(true)}
              isLast
            />
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
                  {t('about.badgeOpenRouter')}
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
          <Text className="mt-2 text-center text-[14px]" style={{ color: color.text.secondary }}>
            {t('about.copyright', { year: new Date().getFullYear() })}
          </Text>
          {(__DEV__ || isTestflightInternalBuild()) && distributionFooterText != null && (
            <Text
              className="mt-2 text-center text-xs leading-4"
              style={{ color: color.text.secondary }}
            >
              {distributionFooterText}
            </Text>
          )}
          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
      </View>
    </View>
  );
};
