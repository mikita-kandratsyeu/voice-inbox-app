import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useColors } from '@/shared/config';

type SettingsRowProps = {
  label: string;
  subtitle?: string;
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
  subtitle,
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

  const alignWithTitle = Boolean(subtitle);

  const content = (
    <View
      className={`flex-row px-4 py-3.5 ${alignWithTitle ? 'items-start' : 'items-center'} ${getRadiusClass()}`}
      style={[
        { backgroundColor: color.background.card, minHeight: subtitle ? 68 : 52 },
        borderStyle,
      ]}
    >
      {leftIcon && (
        <View
          className={`mr-3 h-6 w-6 items-center justify-center ${alignWithTitle ? 'mt-0.5' : ''}`}
        >
          {leftIcon}
        </View>
      )}
      <View className={`flex-1 ${alignWithTitle ? '' : 'justify-center'}`}>
        <Text
          className="text-[16px]"
          style={{
            color: dangerous ? color.accent.delete : color.text.primary,
            lineHeight: 21,
          }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-[13px] leading-[18px]" style={{ color: color.text.muted }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightSlot && (
        <View className={`ml-2 ${alignWithTitle ? 'mt-0.5' : 'self-center'}`}>{rightSlot}</View>
      )}
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

  const a11yLabel = [label, subtitle, !rightSlot && value ? value : undefined]
    .filter(Boolean)
    .join(', ');

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
