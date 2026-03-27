import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useColors } from '@/shared/config';

type SettingsRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  showChevron?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  dangerous?: boolean;
};

export const SettingsRow = ({
  label,
  value,
  onPress,
  leftIcon,
  rightSlot,
  showChevron = true,
  isFirst = false,
  isLast = false,
  dangerous = false,
}: SettingsRowProps) => {
  const color = useColors();
  const borderStyle = !isLast
    ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
    : {};

  const getRadiusClass = () => {
    if (isFirst && isLast) {
      return 'rounded-2xl';
    }
    if (isFirst) {
      return 'rounded-t-2xl';
    }
    if (isLast) {
      return 'rounded-b-2xl';
    }

    return '';
  };

  const content = (
    <View
      className={`flex-row items-center px-4 py-3.5 ${getRadiusClass()}`}
      style={[{ backgroundColor: color.background.card, minHeight: 52 }, borderStyle]}
    >
      {leftIcon && (
        <View className="mr-3 h-6 w-6 items-center justify-center self-center">{leftIcon}</View>
      )}
      <View className="flex-1 justify-center">
        <Text
          className="text-[16px]"
          style={{
            color: dangerous ? color.accent.delete : color.text.primary,
            lineHeight: 21,
          }}
        >
          {label}
        </Text>
      </View>
      {rightSlot && <View className="ml-2 self-center">{rightSlot}</View>}
      {!rightSlot && value && (
        <Text className="mr-2 text-[16px]" style={{ color: color.text.secondary }}>
          {value}
        </Text>
      )}
      {showChevron && onPress && (
        <ChevronRight size={18} color={color.icon.muted} strokeWidth={2} />
      )}
    </View>
  );

  const a11yLabel = value ? `${label}, ${value}` : label;

  if (onPress) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};
