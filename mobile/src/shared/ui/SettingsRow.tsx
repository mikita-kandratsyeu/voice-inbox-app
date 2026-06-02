import { ChevronRight } from 'lucide-react-native';
import React, { useContext } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';

import { SettingsSurfaceColorContext } from './SettingsSurfaceColorContext';

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
  labelClassName?: string;
};

type SettingsRowInnerProps = SettingsRowProps & {
  color: Colors;
};

const SettingsRowInner = ({
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
  labelClassName,
  color,
}: SettingsRowInnerProps) => {
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
      style={[
        { backgroundColor: color.background.card, minHeight: subtitle ? 68 : 52 },
        borderStyle,
      ]}
    >
      {leftIcon && (
        <View className="mr-3 h-6 w-6 shrink-0 items-center justify-center">{leftIcon}</View>
      )}
      <View className="min-w-0 flex-1">
        <Text
          className={`text-[16px] ${labelClassName ?? ''}`}
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
      {rightSlot && <View className="ml-2 shrink-0">{rightSlot}</View>}
      {!rightSlot && value && (
        <View className="ml-2 mr-2 shrink-0 self-center">
          <Text className="text-right text-[16px]" style={{ color: color.text.secondary }}>
            {value}
          </Text>
        </View>
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

const SettingsRowWithHook = (props: SettingsRowProps) => {
  const color = useColors();
  return <SettingsRowInner {...props} color={color} />;
};

export const SettingsRow = (props: SettingsRowProps) => {
  const contextColor = useContext(SettingsSurfaceColorContext);
  if (contextColor != null) {
    return <SettingsRowInner {...props} color={contextColor} />;
  }
  return <SettingsRowWithHook {...props} />;
};
