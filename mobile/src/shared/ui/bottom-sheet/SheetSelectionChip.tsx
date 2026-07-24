import React from 'react';
import { Pressable, Text } from 'react-native';

import type { Colors } from '@/shared/config';

type SheetSelectionChipProps<T extends string> = {
  value: T;
  selectedValue: T;
  label: string;
  onSelect: (value: T) => void;
  color: Colors;
  disabled?: boolean;
};

export function SheetSelectionChip<T extends string>({
  value,
  selectedValue,
  label,
  onSelect,
  color,
  disabled = false,
}: SheetSelectionChipProps<T>) {
  const selected = selectedValue === value;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onSelect(value)}
      className="min-h-[44px] min-w-0 flex-1 justify-center rounded-xl border-2 px-3.5 py-3"
      style={{
        borderColor: selected ? color.accent.primary : color.border.default,
        backgroundColor: color.background.tertiary,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Text
        className="text-center text-[15px] font-semibold leading-5"
        style={{ color: selected ? color.accent.primary : color.text.primary }}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  );
}
