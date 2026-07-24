import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

import type { ShareBriefTemplate } from '../model/useShareRecord';

export type EmailBodyFormatOption = {
  tpl: ShareBriefTemplate;
  Icon: LucideIcon;
  chipLabel: string;
  accessibilityHint: string;
};

type EmailBodyFormatPickerProps = {
  options: EmailBodyFormatOption[];
  selected: ShareBriefTemplate | null;
  onSelect: (template: ShareBriefTemplate) => void;
  color: Colors;
};

export function EmailBodyFormatPicker({
  options,
  selected,
  onSelect,
  color,
}: EmailBodyFormatPickerProps) {
  const selectedOption = options.find((option) => option.tpl === selected);

  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        {options.map(({ tpl, Icon, chipLabel, accessibilityHint }) => {
          const isSelected = selected === tpl;
          const iconColor = isSelected ? color.accent.primary : color.text.secondary;
          return (
            <Pressable
              key={tpl}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={chipLabel}
              accessibilityHint={accessibilityHint}
              onPress={() => onSelect(tpl)}
              className="min-h-[52px] min-w-0 flex-1 items-center justify-center rounded-xl border-2 px-2 py-2.5"
              style={{
                borderColor: isSelected ? color.accent.primary : color.border.default,
                backgroundColor: isSelected
                  ? color.status.processing.bg
                  : color.background.tertiary,
                gap: 6,
              }}
            >
              <Icon size={18} color={iconColor} strokeWidth={2.1} />
              <Text
                className="text-center text-[12px] font-semibold leading-4"
                style={{ color: isSelected ? color.accent.primary : color.text.primary }}
                numberOfLines={2}
              >
                {chipLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {selectedOption ? (
        <Text
          className="text-[13px] leading-5"
          style={{ color: color.text.muted }}
          accessibilityLiveRegion="polite"
        >
          {selectedOption.accessibilityHint}
        </Text>
      ) : null}
    </View>
  );
}
