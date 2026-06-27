import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';

type WhisperSegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type WhisperSegmentedControlProps<T extends string> = {
  value: T;
  options: readonly WhisperSegmentedOption<T>[];
  onChange: (value: T) => void;
  color: Colors;
  accessibilityLabel?: string;
};

export const WhisperSegmentedControl = <T extends string>({
  value,
  options,
  onChange,
  color,
  accessibilityLabel,
}: WhisperSegmentedControlProps<T>) => (
  <View
    accessibilityRole="tablist"
    accessibilityLabel={accessibilityLabel}
    className="flex-row rounded-xl p-1"
    style={{ backgroundColor: color.background.tertiary }}
  >
    {options.map((option) => {
      const selected = value === option.value;

      return (
        <TouchableOpacity
          key={option.value}
          onPress={() => {
            if (selected) {
              return;
            }
            hapticSelection();
            onChange(option.value);
          }}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected }}
          accessibilityLabel={option.label}
          className="flex-1 items-center justify-center rounded-lg px-2 py-2.5"
          style={{
            minHeight: 40,
            backgroundColor: selected ? color.background.card : 'transparent',
            borderWidth: selected ? 1 : 0,
            borderColor: selected ? color.accent.primary : 'transparent',
          }}
        >
          <Text
            className="text-center text-[14px] font-medium"
            style={{ color: selected ? color.accent.primary : color.text.secondary }}
            numberOfLines={1}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);
