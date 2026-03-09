import { useNavigation } from '@react-navigation/native';
import { Mail } from 'lucide-react-native';
import React from 'react';
import { Image, Linking, ScrollView, Text, useColorScheme, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getColors, SUPPORT_EMAIL } from '@/shared/config';
import { ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

const APP_VERSION = DeviceInfo.getVersion();

export const AboutAppScreen = () => {
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title="О приложении" color={color} onBack={() => navigation.goBack()} />

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
            Offline-first приложение для голосовых заметок. Захватывайте идеи голосом, получайте
            транскрипты, саммари и задачи с помощью ИИ.
          </Text>
        </View>
        <SettingsSection title="Приложение" color={color}>
          <SettingsRow
            label="Версия"
            value={APP_VERSION}
            color={color}
            showChevron={false}
            isFirst
          />
        </SettingsSection>
        {SUPPORT_EMAIL.length > 0 && (
          <SettingsSection title="Помощь и обратная связь" color={color}>
            <SettingsRow
              label="Написать в поддержку"
              color={color}
              leftIcon={<Mail size={18} color={color.icon.muted} strokeWidth={1.8} />}
              onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
              isFirst
            />
          </SettingsSection>
        )}
        <SettingsSection title="Технологии" color={color}>
          <SettingsRow label="React Native" color={color} showChevron={false} isFirst />
          <SettingsRow label="NativeWind" color={color} showChevron={false} />
          <SettingsRow label="SQLite" color={color} showChevron={false} />
          <SettingsRow label="MMKV Storage" color={color} showChevron={false} />
          <SettingsRow label="Zustand" color={color} showChevron={false} />
          <SettingsRow
            label="Whisper (офлайн транскрипция)"
            color={color}
            showChevron={false}
            isLast
          />
        </SettingsSection>
        <Text className="mt-2 text-center text-[14px]" style={{ color: color.text.secondary }}>
          © {new Date().getFullYear()} Voice Inbox. Все права защищены.
        </Text>
      </ScrollView>
    </View>
  );
};
