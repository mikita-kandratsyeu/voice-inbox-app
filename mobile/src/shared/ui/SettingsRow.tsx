import { ChevronRight } from 'lucide-react-native';
import React, { useContext } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';

import { ProCrownBadge } from './ProCrownBadge';
import { SettingsSurfaceColorContext } from './SettingsSurfaceColorContext';

type SettingsRowProps = {
  label: string;
  subtitle?: string | React.ReactNode;
  /** Plain-text subtitle for accessibility when `subtitle` is a React node. */
  subtitleA11y?: string;
  value?: string;
  onPress?: () => void;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  /** Spinner on the right; hides chevron and disables press while true. */
  loading?: boolean;
  showChevron?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  dangerous?: boolean;
  labelClassName?: string;
  /** Crown + Pro label beside the row title (locked Pro features for free users). */
  showProBadge?: boolean;
  testID?: string;
};

type SettingsRowInnerProps = SettingsRowProps & {
  color: Colors;
};

const SettingsRowInner = ({
  label,
  subtitle,
  subtitleA11y,
  value,
  onPress,
  leftIcon,
  rightSlot,
  loading = false,
  showChevron = true,
  isFirst = false,
  isLast = false,
  dangerous = false,
  labelClassName,
  showProBadge = false,
  testID,
  color,
}: SettingsRowInnerProps) => {
  const isBusy = loading;
  const resolvedOnPress = isBusy ? undefined : onPress;
  const resolvedShowChevron = isBusy ? false : showChevron;
  const resolvedRightSlot = isBusy ? (
    <ActivityIndicator size="small" color={color.accent.primary} />
  ) : (
    rightSlot
  );

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
      accessibilityState={isBusy ? { busy: true } : undefined}
    >
      {leftIcon && (
        <View className="mr-3 h-6 w-6 shrink-0 items-center justify-center">{leftIcon}</View>
      )}
      <View className="min-w-0 flex-1">
        <View className="flex-row flex-wrap items-center gap-1.5">
          <Text
            className={`text-[16px] ${labelClassName ?? ''}`}
            style={{
              color: dangerous ? color.accent.delete : color.text.primary,
              lineHeight: 21,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {label}
          </Text>
          {showProBadge ? <ProCrownBadge /> : null}
        </View>
        {subtitle ? (
          typeof subtitle === 'string' ? (
            <Text className="mt-0.5 text-[13px] leading-[18px]" style={{ color: color.text.muted }}>
              {subtitle}
            </Text>
          ) : (
            <View className="mt-0.5">{subtitle}</View>
          )
        ) : null}
      </View>
      {resolvedRightSlot && <View className="ml-2 shrink-0">{resolvedRightSlot}</View>}
      {!resolvedRightSlot && value && (
        <View className="ml-2 mr-2 shrink-0 self-center">
          <Text className="text-right text-[16px]" style={{ color: color.text.secondary }}>
            {value}
          </Text>
        </View>
      )}
      {resolvedShowChevron && resolvedOnPress && (
        <ChevronRight size={18} color={color.icon.muted} strokeWidth={2} />
      )}
    </View>
  );

  const subtitleLabel = subtitleA11y ?? (typeof subtitle === 'string' ? subtitle : undefined);
  const a11yLabel = [label, subtitleLabel, !resolvedRightSlot && value ? value : undefined]
    .filter(Boolean)
    .join(', ');

  if (resolvedOnPress) {
    return (
      <TouchableOpacity
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        onPress={resolvedOnPress}
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
