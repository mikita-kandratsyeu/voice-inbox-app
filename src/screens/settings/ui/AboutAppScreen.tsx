import { useNavigation } from '@react-navigation/native';
import { Github, Mail, Mic } from 'lucide-react-native';
import React from 'react';
import { Linking, ScrollView, Text, useColorScheme, View } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getColors } from '@/shared/config';
import { ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

const APP_VERSION = DeviceInfo.getVersion();
const APP_BUILD = DeviceInfo.getBuildNumber();

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
        å
        <View className="mb-8 items-center">
          <View
            className="mb-4 h-20 w-20 items-center justify-center rounded-[22px]"
            style={{ backgroundColor: '#3b82f6' }}
          >
            <Mic size={40} color="#ffffff" strokeWidth={1.8} />
          </View>
          <Text className="text-[22px] font-bold" style={{ color: color.text.primary }}>
            Voice Inbox
          </Text>
          <Text
            className="mt-3 text-center text-[13px] leading-5 px-4"
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
          <SettingsRow label="Сборка" value={APP_BUILD} color={color} showChevron={false} />
          <SettingsRow
            label="Платформа"
            value="React Native"
            color={color}
            showChevron={false}
            isLast
          />
        </SettingsSection>
        <SettingsSection title="Разработчик" color={color}>
          <SettingsRow
            label="Mikita Kandratsyeu"
            color={color}
            leftIcon={<Mail size={18} color={color.icon.muted} strokeWidth={1.8} />}
            onPress={() => Linking.openURL('mailto:nickondr.production@gmail.com')}
            isFirst
          />
          <SettingsRow
            label="GitHub"
            color={color}
            leftIcon={<Github size={18} color={color.icon.muted} strokeWidth={1.8} />}
            onPress={() => Linking.openURL('https://github.com')}
            isLast
          />
        </SettingsSection>
        <SettingsSection title="Технологии" color={color}>
          <SettingsRow label="React Native 0.84" color={color} showChevron={false} isFirst />
          <SettingsRow label="NativeWind · Tailwind CSS" color={color} showChevron={false} />
          <SettingsRow label="SQLite · Drizzle ORM" color={color} showChevron={false} />
          <SettingsRow label="MMKV Storage" color={color} showChevron={false} />
          <SettingsRow label="Zustand" color={color} showChevron={false} />
          <SettingsRow
            label="Whisper (офлайн транскрипция)"
            color={color}
            showChevron={false}
            isLast
          />
        </SettingsSection>
        <Text className="mt-2 text-center text-[12px]" style={{ color: color.text.secondary }}>
          © {new Date().getFullYear()} Voice Inbox. Все права защищены.
        </Text>
      </ScrollView>
    </View>
  );
};
