import { Check, Crown } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import type { ModelMetaChip } from '@/entities/settings';
import { ModelMetaChips } from '@/screens/settings/ui/ModelMetaChips';
import type { Colors } from '@/shared/config';

type OnboardingCloudModelRowProps = {
  tierLabel: string;
  name: string;
  description: string;
  metaChips: ModelMetaChip[];
  isSelected: boolean;
  isRecommended?: boolean;
  isProLocked?: boolean;
  isLast: boolean;
  color: Colors;
  selectedColor: string;
  onPress: () => void;
};

export const OnboardingCloudModelRow = ({
  tierLabel,
  name,
  description,
  metaChips,
  isSelected,
  isRecommended = false,
  isProLocked = false,
  isLast,
  color,
  selectedColor,
  onPress,
}: OnboardingCloudModelRowProps) => {
  const { t } = useTranslation();
  const showName = name.trim().length > 0 && name.trim() !== tierLabel.trim();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={showName ? name : tierLabel}
      accessibilityState={{ selected: isSelected }}
      accessibilityHint={isProLocked ? t('aiModels.proModelTitle') : undefined}
      className={`px-4 py-4 flex-row items-center justify-between ${!isLast ? 'border-b' : ''}`}
      style={{
        backgroundColor: color.background.card,
        borderBottomColor: color.border.default,
      }}
    >
      <View className="mr-3 flex-1">
        <View className="mb-1 flex-row flex-wrap items-center gap-2">
          <Text className="text-[16px] font-semibold" style={{ color: color.text.primary }}>
            {tierLabel}
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
          {isProLocked ? (
            <View className="flex-row items-center gap-1">
              <Crown size={14} color={color.accent.primary} strokeWidth={2} />
              <Text className="text-xs font-semibold" style={{ color: color.accent.primary }}>
                {t('common.pro')}
              </Text>
            </View>
          ) : null}
        </View>
        {showName ? (
          <Text className="mb-1 text-[13px] leading-5" style={{ color: color.text.muted }}>
            {name}
          </Text>
        ) : null}
        <Text
          className={`text-[14px] leading-5 ${showName ? 'mb-2' : 'mb-1'}`}
          style={{ color: color.text.secondary }}
        >
          {description}
        </Text>
        <ModelMetaChips color={color} chips={metaChips} />
      </View>
      {isSelected ? (
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
      )}
    </TouchableOpacity>
  );
};
