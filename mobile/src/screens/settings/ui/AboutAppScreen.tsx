import { useNavigation } from '@react-navigation/native';
import { BookOpen, Mail, Tag } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Linking, ScrollView, Text, useColorScheme, View } from 'react-native';
import { DeviceInfoModule } from 'react-native-nitro-device-info';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOnboardingStore } from '@/features/onboarding';
import { getColors, SUPPORT_EMAIL } from '@/shared/config';
import { ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

const APP_VERSION = DeviceInfoModule.version;

export const AboutAppScreen = () => {
  const { t } = useTranslation();
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const setForceShowOnboarding = useOnboardingStore((s) => s.setForceShow);

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('about.title')} color={color} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8 items-center">
          <Image
            source={require('../../../shared/assets/app-icon.png')}
            className="mb-4 h-20 w-20 rounded-[22px]"
            resizeMode="cover"
          />
          <Text className="text-[24px] font-bold" style={{ color: color.text.primary }}>
            Voice Inbox
          </Text>
          <Text
            className="mt-3 text-center text-[14px] leading-5 px-4"
            style={{ color: color.text.secondary }}
          >
            {t('about.description')}
          </Text>
        </View>
        <SettingsSection title={t('about.app')} color={color}>
          <SettingsRow
            label={t('about.version')}
            value={APP_VERSION}
            color={color}
            leftIcon={<Tag size={18} color={color.icon.muted} strokeWidth={1.8} />}
            showChevron={false}
            isFirst
          />
          <SettingsRow
            label={t('about.showOnboarding')}
            color={color}
            leftIcon={<BookOpen size={18} color={color.icon.muted} strokeWidth={1.8} />}
            onPress={() => setForceShowOnboarding(true)}
            isLast
          />
        </SettingsSection>
        {SUPPORT_EMAIL.length > 0 && (
          <SettingsSection title={t('about.helpAndFeedback')} color={color}>
            <SettingsRow
              label={t('about.contactSupport')}
              color={color}
              leftIcon={<Mail size={18} color={color.icon.muted} strokeWidth={1.8} />}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
              isFirst
            />
          </SettingsSection>
        )}
        <Text className="mt-2 text-center text-[14px]" style={{ color: color.text.secondary }}>
          {t('about.copyright', { year: new Date().getFullYear() })}
        </Text>
      </ScrollView>
    </View>
  );
};
