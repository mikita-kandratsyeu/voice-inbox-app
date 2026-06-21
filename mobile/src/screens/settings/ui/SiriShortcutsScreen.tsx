import { CheckSquare, Command, Mic, Smartphone, SquarePen } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { useSettingsStackBack } from '@/app/navigation/useSettingsStackBack';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { SCREEN_PADDING, ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

import { getSettingsIconColor } from '../lib';

type ShortcutRow = {
  key: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  value: string;
};

function InfoCard({ color }: { color: Colors }) {
  const { t } = useTranslation();

  return (
    <View
      className="mb-7 rounded-2xl p-4"
      style={{
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.card,
      }}
    >
      <View className="mb-3 flex-row items-center gap-2">
        <Command size={18} color={color.accent.primary} strokeWidth={1.8} />
        <Text
          className="text-[16px] font-semibold leading-[21px]"
          style={{ color: color.text.primary }}
        >
          {t('settings.siriShortcuts.aboutTitle')}
        </Text>
      </View>
      <Text className="text-[14px] leading-5" style={{ color: color.text.secondary }}>
        {t('settings.siriShortcuts.aboutDescription')}
      </Text>
    </View>
  );
}

function TipsCard({ color }: { color: Colors }) {
  const { t } = useTranslation();
  const tips = [
    t('settings.siriShortcuts.tips.askSiri'),
    t('settings.siriShortcuts.tips.shortcutsApp'),
    t('settings.siriShortcuts.tips.homeScreen'),
  ];

  return (
    <View
      className="mb-7 rounded-2xl p-4"
      style={{
        borderWidth: 1,
        borderColor: color.border.default,
        backgroundColor: color.background.card,
      }}
    >
      <View className="mb-3 flex-row items-center gap-2">
        <Smartphone size={18} color={color.accent.transcript} strokeWidth={1.8} />
        <Text
          className="text-[16px] font-semibold leading-[21px]"
          style={{ color: color.text.primary }}
        >
          {t('settings.siriShortcuts.howToUseTitle')}
        </Text>
      </View>
      {tips.map((tip) => (
        <View key={tip} className="mb-2 flex-row gap-2">
          <Text className="text-[14px] leading-5" style={{ color: color.accent.primary }}>
            •
          </Text>
          <Text className="flex-1 text-[14px] leading-5" style={{ color: color.text.secondary }}>
            {tip}
          </Text>
        </View>
      ))}
    </View>
  );
}

export const SiriShortcutsScreen = () => {
  const handleBack = useSettingsStackBack();
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const isTablet = useIsTablet();

  const shortcuts = useMemo<ShortcutRow[]>(
    () => [
      {
        key: 'startRecording',
        icon: <Mic size={20} color={getSettingsIconColor(color, 'mic')} strokeWidth={1.8} />,
        title: t('settings.siriShortcuts.shortcuts.startRecording.title'),
        subtitle: t('settings.siriShortcuts.shortcuts.startRecording.subtitle'),
        value: t('settings.siriShortcuts.shortcuts.startRecording.value'),
      },
      {
        key: 'newTextNote',
        icon: <SquarePen size={20} color={color.accent.cache} strokeWidth={1.8} />,
        title: t('settings.siriShortcuts.shortcuts.newTextNote.title'),
        subtitle: t('settings.siriShortcuts.shortcuts.newTextNote.subtitle'),
        value: t('settings.siriShortcuts.shortcuts.newTextNote.value'),
      },
      {
        key: 'allTasks',
        icon: <CheckSquare size={20} color={color.accent.success} strokeWidth={1.8} />,
        title: t('settings.siriShortcuts.shortcuts.allTasks.title'),
        subtitle: t('settings.siriShortcuts.shortcuts.allTasks.subtitle'),
        value: t('settings.siriShortcuts.shortcuts.allTasks.value'),
      },
    ],
    [color, t],
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('settings.siriShortcuts.title')} onBack={handleBack} />
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
            paddingTop: 16,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
          }}
          showsVerticalScrollIndicator={false}
        >
          <InfoCard color={color} />

          <SettingsSection title={t('settings.siriShortcuts.availableTitle')}>
            {shortcuts.map((shortcut, index) => (
              <SettingsRow
                key={shortcut.key}
                label={shortcut.title}
                subtitle={shortcut.subtitle}
                value={shortcut.value}
                leftIcon={shortcut.icon}
                showChevron={false}
                isFirst={index === 0}
                isLast={index === shortcuts.length - 1}
              />
            ))}
          </SettingsSection>

          <TipsCard color={color} />
          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
      </View>
    </View>
  );
};
