import { useNavigation } from '@react-navigation/native';
import { MessageSquare, Smartphone } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { type HapticsIntensity, useSettingsStore } from '@/entities/settings';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import { useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { SCREEN_PADDING, ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

import { getSettingsIconColor } from '../lib/settingsIconColor';
import { HapticsIntensitySlider } from './HapticsIntensitySlider';

export const GesturesSettingsScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const color = useColors();
  const isTablet = useIsTablet();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;

  const shakeToRecordEnabled = useSettingsStore((s) => s.shakeToRecordEnabled);
  const setShakeToRecordEnabled = useSettingsStore((s) => s.setShakeToRecordEnabled);
  const shakeToCancelAskAiEnabled = useSettingsStore((s) => s.shakeToCancelAskAiEnabled);
  const setShakeToCancelAskAiEnabled = useSettingsStore((s) => s.setShakeToCancelAskAiEnabled);
  const hapticsIntensity = useSettingsStore((s) => s.hapticsIntensity);
  const setHapticsIntensity = useSettingsStore((s) => s.setHapticsIntensity);

  const switchTrackColor = {
    false: color.background.tertiary,
    true: color.accent.primary,
  };

  const hapticsOptions = [
    { value: 'off' as const, label: t('settings.gestures.hapticsIntensity.off') },
    { value: 'subtle' as const, label: t('settings.gestures.hapticsIntensity.subtle') },
    { value: 'full' as const, label: t('settings.gestures.hapticsIntensity.full') },
  ] satisfies ReadonlyArray<{ value: HapticsIntensity; label: string }>;

  const hapticsLabelByValue = useMemo(
    () => new Map(hapticsOptions.map((option) => [option.value, option.label])),
    [hapticsOptions],
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('settings.gestures.title')} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: 16,
          paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth ?? windowWidth,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-4 text-[14px] leading-5" style={{ color: color.text.secondary }}>
          {t('settings.gestures.intro')}
        </Text>

        <SettingsSection title={t('settings.gestures.hapticsSectionTitle')}>
          <View className="px-4 pb-4 pt-3">
            <Text className="mb-1 text-[15px] font-medium" style={{ color: color.text.primary }}>
              {t('settings.gestures.hapticsIntensity.title')}
            </Text>
            <Text
              className="mb-3 text-[13px] leading-[18px]"
              style={{ color: color.text.secondary }}
            >
              {t('settings.gestures.hapticsIntensity.subtitle')}
            </Text>
            <HapticsIntensitySlider
              value={hapticsIntensity}
              onChange={setHapticsIntensity}
              tickLabel={(intensity) => hapticsLabelByValue.get(intensity) ?? intensity}
              sliderAccessibilityLabel={t('settings.gestures.hapticsIntensity.title')}
              color={color}
              embedded
            />
          </View>
        </SettingsSection>

        <SettingsSection title={t('settings.gestures.sectionTitle')}>
          <SettingsRow
            label={t('settings.gestures.shakeToRecord.title')}
            subtitle={t('settings.gestures.shakeToRecord.subtitle')}
            leftIcon={
              <Smartphone size={20} color={getSettingsIconColor(color, 'hand')} strokeWidth={1.8} />
            }
            isFirst
            rightSlot={
              <Switch
                value={shakeToRecordEnabled}
                onValueChange={setShakeToRecordEnabled}
                accessibilityLabel={t('settings.gestures.shakeToRecord.title')}
                trackColor={switchTrackColor}
                thumbColor={color.icon.onAccent}
              />
            }
            showChevron={false}
          />
          <SettingsRow
            label={t('settings.gestures.shakeToCancelAskAi.title')}
            subtitle={t('settings.gestures.shakeToCancelAskAi.subtitle')}
            leftIcon={
              <MessageSquare
                size={20}
                color={getSettingsIconColor(color, 'bot')}
                strokeWidth={1.8}
              />
            }
            isLast
            rightSlot={
              <Switch
                value={shakeToCancelAskAiEnabled}
                onValueChange={setShakeToCancelAskAiEnabled}
                accessibilityLabel={t('settings.gestures.shakeToCancelAskAi.title')}
                trackColor={switchTrackColor}
                thumbColor={color.icon.onAccent}
              />
            }
            showChevron={false}
          />
        </SettingsSection>
        <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
      </ScrollView>
    </View>
  );
};
