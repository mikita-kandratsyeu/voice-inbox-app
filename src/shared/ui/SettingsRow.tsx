import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';

type SettingsRowProps = {
  label: string;
  value?: string;
  color: Colors;
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
  color,
  onPress,
  leftIcon,
  rightSlot,
  showChevron = true,
  isFirst = false,
  isLast = false,
  dangerous = false,
}: SettingsRowProps) => {
  const borderStyle = !isLast
    ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
    : {};

  let radiusClass = '';

  if (isFirst && isLast) {
    radiusClass = 'rounded-2xl';
  } else if (isFirst) {
    radiusClass = 'rounded-t-2xl';
  } else if (isLast) {
    radiusClass = 'rounded-b-2xl';
  }

  const content = (
    <View
      className={`flex-row items-center px-4 py-3.5 ${radiusClass}`}
      style={[{ backgroundColor: color.background.card, minHeight: 52 }, borderStyle]}
    >
      {leftIcon && <View className="mr-3">{leftIcon}</View>}
      <Text
        className="flex-1 text-[15px]"
        style={{ color: dangerous ? color.accent.delete : color.text.primary }}
      >
        {label}
      </Text>
      {rightSlot && <View className="ml-2">{rightSlot}</View>}
      {!rightSlot && value && (
        <Text className="mr-2 text-[14px]" style={{ color: color.text.secondary }}>
          {value}
        </Text>
      )}
      {showChevron && onPress && (
        <ChevronRight size={18} color={color.icon.muted} strokeWidth={2} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
};
