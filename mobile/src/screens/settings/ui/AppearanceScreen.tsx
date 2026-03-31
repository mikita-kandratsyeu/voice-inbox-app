import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Check, Crown } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { SettingsStackParamList } from '@/app/navigation/types';
import type { AppLanguage, AppTheme } from '@/entities/settings';
import { useSettingsStore } from '@/entities/settings';
import { useProEntitlement } from '@/features/pro-license';
import type { AccentColorId, Colors } from '@/shared/config';
import { getAccentColorSwatches, useAppTheme, useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { applyAppLanguage } from '@/shared/lib/i18n';
import { ScreenHeader, SettingsSection } from '@/shared/ui';

import { AutomationComingSoonSheet } from './AutomationComingSoonSheet';

const APP_LANGUAGES: AppLanguage[] = ['system', 'en', 'ru'];
const APP_THEMES: AppTheme[] = ['system', 'light', 'dark'];

const ACCENT_SWATCH_SIZE = 44;
const ACCENT_SWATCH_RING = 3;
const ACCENT_SWATCH_FILL = 36;
const ACCENT_SWATCH_FILL_SELECTED = ACCENT_SWATCH_SIZE - 2 * ACCENT_SWATCH_RING - 4;
const ACCENT_SWATCH_PAD_UNSELECTED = (ACCENT_SWATCH_SIZE - ACCENT_SWATCH_FILL) / 2;

type PickerRowProps<T extends string> = {
  options: T[];
  selected: T;
  onSelect: (value: T) => void;
  labelKey: (value: T) => string;
  color: Colors;
};

function PickerSection<T extends string>({
  options,
  selected,
  onSelect,
  labelKey,
  color,
}: PickerRowProps<T>) {
  return (
    <View
      className="overflow-hidden rounded-2xl"
      style={{ backgroundColor: color.background.card }}
    >
      {options.map((opt, index) => {
        const isSelected = opt === selected;
        const isLast = index === options.length - 1;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onSelect(opt)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={labelKey(opt)}
            accessibilityState={{ selected: isSelected }}
            className="flex-row items-center justify-between px-4 py-3.5"
            style={
              !isLast
                ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
                : undefined
            }
          >
            <Text className="text-[16px]" style={{ color: color.text.primary }}>
              {labelKey(opt)}
            </Text>
            {isSelected ? (
              <View
                className="h-6 w-6 rounded-full items-center justify-center"
                style={{ backgroundColor: color.accent.primary }}
              >
                <Check size={14} color="#ffffff" strokeWidth={2.5} />
              </View>
            ) : (
              <View
                className="h-6 w-6 rounded-full"
                style={{ borderWidth: 2, borderColor: color.border.default }}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export const AppearanceScreen = () => {
  const { t } = useTranslation();
  const color = useColors();
  const scheme = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const contentMaxWidth = useTabletContentMaxWidth();
  const [accentProSheet, setAccentProSheet] = useState(false);
  const { isProActive } = useProEntitlement();
  const isTablet = useIsTablet();

  const appLanguage = useSettingsStore((s) => s.appLanguage);
  const setAppLanguage = useSettingsStore((s) => s.setAppLanguage);
  const appTheme = useSettingsStore((s) => s.appTheme);
  const setAppTheme = useSettingsStore((s) => s.setAppTheme);
  const accentColorId = useSettingsStore((s) => s.accentColorId);
  const setAccentColorId = useSettingsStore((s) => s.setAccentColorId);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const accentSwatches = getAccentColorSwatches(scheme);
  const isPrivateMode = aiExecutionMode === 'private_experimental';

  const handleLanguageSelect = (value: AppLanguage) => {
    setAppLanguage(value);
    applyAppLanguage();
  };

  const handleAccentSelect = (id: AccentColorId) => {
    if (!isProActive) {
      setAccentProSheet(true);
      return;
    }
    setAccentColorId(id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('appearance.title')} onBack={() => navigation.goBack()} />
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
            paddingTop: 12,
            paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
          }}
          showsVerticalScrollIndicator={false}
        >
          <SettingsSection title={t('appearance.language')}>
            <PickerSection
              options={APP_LANGUAGES}
              selected={appLanguage}
              onSelect={handleLanguageSelect}
              labelKey={(v) => t(`appearance.languageOption.${v}`)}
              color={color}
            />
          </SettingsSection>

          {!isPrivateMode && (
            <SettingsSection title={t('appearance.theme')}>
              <PickerSection
                options={APP_THEMES}
                selected={appTheme}
                onSelect={setAppTheme}
                labelKey={(v) => t(`appearance.themeOption.${v}`)}
                color={color}
              />
            </SettingsSection>
          )}

          {!isPrivateMode && (
            <View className="mb-7">
              <View className="mb-2.5 flex-row items-center justify-between px-1">
                <Text
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: color.text.secondary }}
                >
                  {t('appearance.accentColor.title')}
                </Text>
                {!isProActive ? (
                  <View className="flex-row items-center gap-1">
                    <Crown size={14} color={color.accent.primary} strokeWidth={2} />
                    <Text className="text-xs font-semibold" style={{ color: color.accent.primary }}>
                      {t('common.pro')}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View
                className="overflow-hidden rounded-2xl"
                style={{ borderWidth: 1, borderColor: color.border.default }}
              >
                <View
                  className="flex-row flex-wrap px-4 py-4"
                  style={{
                    backgroundColor: color.background.card,
                    gap: 12,
                  }}
                >
                  {accentSwatches.map(({ id, previewHex }) => {
                    const selected = accentColorId === id;
                    const fillSize = selected ? ACCENT_SWATCH_FILL_SELECTED : ACCENT_SWATCH_FILL;
                    return (
                      <TouchableOpacity
                        key={id}
                        accessibilityRole="button"
                        accessibilityLabel={t(`appearance.accentColor.option.${id}`)}
                        accessibilityState={{ selected }}
                        onPress={() => handleAccentSelect(id)}
                        activeOpacity={0.75}
                        style={{
                          width: ACCENT_SWATCH_SIZE,
                          height: ACCENT_SWATCH_SIZE,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <View
                          style={{
                            width: ACCENT_SWATCH_SIZE,
                            height: ACCENT_SWATCH_SIZE,
                            borderRadius: ACCENT_SWATCH_SIZE / 2,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: selected ? ACCENT_SWATCH_RING : 0,
                            borderColor: selected ? previewHex : 'transparent',
                            padding: selected ? 0 : ACCENT_SWATCH_PAD_UNSELECTED,
                          }}
                        >
                          <View
                            style={{
                              width: fillSize,
                              height: fillSize,
                              borderRadius: fillSize / 2,
                              backgroundColor: previewHex,
                              borderWidth: 1,
                              borderColor: color.border.default,
                            }}
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              {!isProActive ? (
                <Text
                  className="mt-2 px-1 text-xs leading-5"
                  style={{ color: color.text.secondary }}
                >
                  {t('appearance.accentColor.subtitle')}
                </Text>
              ) : null}
            </View>
          )}
        </ScrollView>
      </View>

      <AutomationComingSoonSheet
        visible={accentProSheet}
        feature="accentColor"
        onUpgradePress={() => {
          setAccentProSheet(false);
          navigation.navigate('Settings', { openPlanPaywall: true });
        }}
        onClose={() => setAccentProSheet(false)}
      />
    </View>
  );
};
