import { useNavigation } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { AppLanguage, AppTheme } from '@/entities/settings';
import { useSettingsStore } from '@/entities/settings';
import { getColors, useAppTheme } from '@/shared/config';
import { applyAppLanguage } from '@/shared/lib/i18n';
import { ScreenHeader, SettingsSection } from '@/shared/ui';

const APP_LANGUAGES: AppLanguage[] = ['system', 'en', 'ru'];
const APP_THEMES: AppTheme[] = ['system', 'light', 'dark'];

type PickerRowProps<T extends string> = {
  options: T[];
  selected: T;
  onSelect: (value: T) => void;
  labelKey: (value: T) => string;
  color: ReturnType<typeof getColors>;
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
  const theme = useAppTheme();
  const color = getColors(theme);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const appLanguage = useSettingsStore((s) => s.appLanguage);
  const setAppLanguage = useSettingsStore((s) => s.setAppLanguage);
  const appTheme = useSettingsStore((s) => s.appTheme);
  const setAppTheme = useSettingsStore((s) => s.setAppTheme);

  const handleLanguageSelect = (value: AppLanguage) => {
    setAppLanguage(value);
    applyAppLanguage();
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('appearance.title')}
        color={color}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title={t('appearance.language')} color={color}>
          <PickerSection
            options={APP_LANGUAGES}
            selected={appLanguage}
            onSelect={handleLanguageSelect}
            labelKey={(v) => t(`appearance.languageOption.${v}`)}
            color={color}
          />
        </SettingsSection>

        <SettingsSection title={t('appearance.theme')} color={color}>
          <PickerSection
            options={APP_THEMES}
            selected={appTheme}
            onSelect={setAppTheme}
            labelKey={(v) => t(`appearance.themeOption.${v}`)}
            color={color}
          />
        </SettingsSection>
      </ScrollView>
    </View>
  );
};
