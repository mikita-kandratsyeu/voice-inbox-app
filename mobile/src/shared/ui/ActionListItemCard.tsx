import React, { memo } from 'react';
import { ActivityIndicator, Pressable, Text, View, type ViewStyle } from 'react-native';

import { getRecordCardChromeStyle } from '@/entities/record/lib/recordCardChrome';
import type { Colors } from '@/shared/config';
import { IS_ANDROID } from '@/shared/lib';

export const ACTION_LIST_ITEM_BTN_H = 40;

type ActionListItemCardAction = {
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
};

export type ActionListItemCardPrimaryAction = ActionListItemCardAction & {
  label: string;
  icon?: React.ReactNode;
  loading?: boolean;
};

export type ActionListItemCardSecondaryAction = ActionListItemCardAction & {
  icon: React.ReactNode;
};

type ActionListItemCardProps = {
  color: Colors;
  title: string;
  preview?: string | null;
  meta?: string;
  errorText?: string | null;
  primaryAction: ActionListItemCardPrimaryAction;
  secondaryAction: ActionListItemCardSecondaryAction;
  style?: ViewStyle;
};

export const ActionListItemCard = memo(function ActionListItemCard({
  color,
  title,
  preview,
  meta,
  errorText,
  primaryAction,
  secondaryAction,
  style,
}: ActionListItemCardProps) {
  const cardStyle = getRecordCardChromeStyle(color);
  const primaryDisabled = primaryAction.disabled || primaryAction.loading;
  const secondaryDisabled = secondaryAction.disabled || primaryAction.loading;

  return (
    <View
      style={[
        cardStyle,
        {
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 12,
          padding: 16,
        },
        style,
      ]}
    >
      <Text
        className="text-[16px] font-medium leading-[21px]"
        style={{
          color: color.text.primary,
          ...(IS_ANDROID ? { includeFontPadding: false } : {}),
        }}
        numberOfLines={2}
      >
        {title}
      </Text>
      {preview ? (
        <Text
          className="mt-2 text-[14px] leading-5"
          style={{ color: color.text.secondary }}
          numberOfLines={2}
        >
          {preview}
        </Text>
      ) : null}
      {meta ? (
        <Text className="mt-2 text-[13px] leading-[18px]" style={{ color: color.text.muted }}>
          {meta}
        </Text>
      ) : null}
      {errorText ? (
        <Text
          className="mt-2 text-[13px] leading-[18px]"
          style={{ color: color.status.error.text }}
        >
          {errorText}
        </Text>
      ) : null}
      <View
        style={{
          marginTop: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={primaryAction.accessibilityLabel}
          onPress={primaryAction.onPress}
          disabled={primaryDisabled}
          style={{
            flex: 1,
            height: ACTION_LIST_ITEM_BTN_H,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: color.border.default,
            backgroundColor: color.background.secondary,
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'row',
            gap: 6,
            opacity: primaryDisabled ? 0.6 : 1,
          }}
        >
          {primaryAction.loading ? (
            <ActivityIndicator size="small" color={color.accent.primary} />
          ) : (
            primaryAction.icon
          )}
          <Text
            className="text-[14px] font-semibold"
            style={{
              color: color.text.primary,
              ...(IS_ANDROID ? { includeFontPadding: false } : {}),
            }}
          >
            {primaryAction.label}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={secondaryAction.accessibilityLabel}
          onPress={secondaryAction.onPress}
          disabled={secondaryDisabled}
          style={{
            width: ACTION_LIST_ITEM_BTN_H,
            height: ACTION_LIST_ITEM_BTN_H,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: color.border.default,
            backgroundColor: color.background.secondary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: secondaryDisabled ? 0.6 : 1,
          }}
        >
          {secondaryAction.icon}
        </Pressable>
      </View>
    </View>
  );
});
