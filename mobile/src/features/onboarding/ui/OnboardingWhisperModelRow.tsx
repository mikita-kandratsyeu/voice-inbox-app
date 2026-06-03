import { Check, Download } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import type { ModelMetaChip } from '@/entities/settings';
import { ModelMetaChips } from '@/screens/settings/ui/ModelMetaChips';
import type { Colors } from '@/shared/config';

type OnboardingWhisperModelRowProps = {
  title: string;
  metaChips: ModelMetaChip[];
  compatHint?: string;
  isSelected: boolean;
  isRecommended: boolean;
  isDownloaded: boolean;
  isDownloading: boolean;
  isLast: boolean;
  color: Colors;
  selectedColor: string;
  onPress: () => void;
};

export const OnboardingWhisperModelRow = ({
  title,
  metaChips,
  compatHint,
  isSelected,
  isRecommended,
  isDownloaded,
  isDownloading,
  isLast,
  color,
  selectedColor,
  onPress,
}: OnboardingWhisperModelRowProps) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isDownloading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected: isDownloaded && isSelected, disabled: isDownloading }}
      className={`flex-row items-center justify-between px-4 py-4 ${!isLast ? 'border-b' : ''}`}
      style={{
        backgroundColor: color.background.card,
        borderBottomColor: color.border.default,
      }}
    >
      <View className="mr-3 flex-1">
        <View className="mb-1 flex-row flex-wrap items-center gap-2">
          <Text className="text-[16px] font-semibold" style={{ color: color.text.primary }}>
            {title}
          </Text>
          {isRecommended ? (
            <View
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: color.status.processing.bg }}
            >
              <Text
                className="text-[12px] font-medium"
                style={{ color: color.status.processing.text }}
              >
                {t('whisper.recommended')}
              </Text>
            </View>
          ) : null}
        </View>
        {compatHint ? (
          <Text className="mb-2 text-[13px] leading-5" style={{ color: color.text.muted }}>
            {compatHint}
          </Text>
        ) : null}
        <ModelMetaChips color={color} chips={metaChips} />
      </View>
      {isDownloaded ? (
        isSelected ? (
          <View
            className="h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: selectedColor }}
          >
            <Check size={16} color="#ffffff" strokeWidth={2.5} />
          </View>
        ) : (
          <View
            className="h-8 w-8 rounded-full"
            style={{ borderWidth: 2, borderColor: color.border.default }}
          />
        )
      ) : isDownloading ? (
        <View
          className="h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: color.status.processing.bg }}
        >
          <ActivityIndicator size="small" color={color.status.processing.text} />
        </View>
      ) : (
        <View
          className="h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: color.background.tertiary }}
        >
          <Download size={16} color={selectedColor} strokeWidth={2} />
        </View>
      )}
    </TouchableOpacity>
  );
};
