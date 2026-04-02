import { useNavigation } from '@react-navigation/native';
import { Check } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type {
  AiOutputLanguage,
  PrivateLocalLlmBudget,
  SummaryStyle,
  TaskStrictness,
} from '@/entities/settings';
import { useSettingsStore } from '@/entities/settings';
import { DeferredInboxBannerAd } from '@/features/inbox-banner';
import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { ScreenHeader, SettingsSection } from '@/shared/ui';

const SUMMARY_STYLES: SummaryStyle[] = ['brief', 'standard', 'detailed'];
const TASK_STRICTNESS_OPTIONS: TaskStrictness[] = ['strict', 'balanced', 'soft'];
const OUTPUT_LANGUAGES: AiOutputLanguage[] = ['same', 'ru', 'en'];
const PRIVATE_LOCAL_LLM_BUDGETS: PrivateLocalLlmBudget[] = ['efficient', 'balanced', 'expanded'];

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

export const AiSettingsScreen = () => {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;
  const isTablet = useIsTablet();

  const summaryStyle = useSettingsStore((s) => s.summaryStyle);
  const setSummaryStyle = useSettingsStore((s) => s.setSummaryStyle);
  const taskStrictness = useSettingsStore((s) => s.taskStrictness);
  const setTaskStrictness = useSettingsStore((s) => s.setTaskStrictness);
  const aiOutputLanguage = useSettingsStore((s) => s.aiOutputLanguage);
  const setAiOutputLanguage = useSettingsStore((s) => s.setAiOutputLanguage);
  const aiExecutionMode = useSettingsStore((s) => s.aiExecutionMode);
  const privateLocalLlmBudget = useSettingsStore((s) => s.privateLocalLlmBudget);
  const setPrivateLocalLlmBudget = useSettingsStore((s) => s.setPrivateLocalLlmBudget);
  const isPrivateMode = aiExecutionMode === 'private_experimental';

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('aiSettings.title')} onBack={() => navigation.goBack()} />
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
          <Text className="mb-4 text-[14px] leading-5" style={{ color: color.text.secondary }}>
            {t('aiSettings.description')}
          </Text>
          {isPrivateMode && (
            <>
              <SettingsSection title={t('aiSettings.privateLocalGeneration')}>
                <PickerSection
                  options={PRIVATE_LOCAL_LLM_BUDGETS}
                  selected={privateLocalLlmBudget}
                  onSelect={setPrivateLocalLlmBudget}
                  labelKey={(v) => t(`aiSettings.privateLocalGeneration.${v}`)}
                  color={color}
                />
              </SettingsSection>
            </>
          )}
          <SettingsSection title={t('aiSettings.summaryStyle')}>
            <PickerSection
              options={SUMMARY_STYLES}
              selected={summaryStyle}
              onSelect={setSummaryStyle}
              labelKey={(v) => t(`aiSettings.summaryStyle.${v}`)}
              color={color}
            />
          </SettingsSection>
          <SettingsSection title={t('aiSettings.taskStrictness')}>
            <PickerSection
              options={TASK_STRICTNESS_OPTIONS}
              selected={taskStrictness}
              onSelect={setTaskStrictness}
              labelKey={(v) => t(`aiSettings.taskStrictness.${v}`)}
              color={color}
            />
          </SettingsSection>
          <SettingsSection title={t('aiSettings.outputLanguage')}>
            <PickerSection
              options={OUTPUT_LANGUAGES}
              selected={aiOutputLanguage}
              onSelect={setAiOutputLanguage}
              labelKey={(v) => t(`aiSettings.outputLanguage.${v}`)}
              color={color}
            />
          </SettingsSection>
          <DeferredInboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
      </View>
    </View>
  );
};
