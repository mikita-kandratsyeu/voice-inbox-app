import React from 'react';
import type { ViewStyle } from 'react-native';
import { View } from 'react-native';

import type { Colors } from '@/shared/config';

import { Button, BUTTON_BORDER_RADIUS } from '../Button';

export const SHEET_FOOTER_BUTTON_RADIUS = BUTTON_BORDER_RADIUS;

export function sheetFooterButtonContainerStyle(
  color: Colors,
  role: 'primary' | 'secondary',
): ViewStyle {
  return {
    backgroundColor: role === 'primary' ? color.accent.primary : color.background.tertiary,
    borderRadius: SHEET_FOOTER_BUTTON_RADIUS,
  };
}

export function sheetFooterPrimaryButtonContainerStyle(
  color: Colors,
  options?: {
    backgroundColor?: string;
    disabledBackgroundColor?: string;
    disabled?: boolean;
  },
): ViewStyle {
  const disabled = options?.disabled ?? false;
  return {
    backgroundColor: disabled
      ? (options?.disabledBackgroundColor ?? color.status.muted.bg)
      : (options?.backgroundColor ?? color.accent.primary),
    borderRadius: SHEET_FOOTER_BUTTON_RADIUS,
    ...(disabled ? { borderWidth: 1, borderColor: color.border.default } : {}),
  };
}

export type SheetFooterButtonsProps = {
  color: Colors;
  primaryLabel: string;
  onPrimaryPress: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  labelSuffix?: string;
  primaryAccessibilityLabel?: string;
  onPrimaryPressIn?: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  onSecondaryPressIn?: () => void;
  secondaryDisabled?: boolean;
  secondaryAccessibilityLabel?: string;
  /** When there is no secondary action: `primary` (default) or `secondary` (e.g. Cancel-only). */
  singleVariant?: 'primary' | 'secondary';
  /** Full-width action below the main row or single button (e.g. delete folder). */
  bottomAction?: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
  };
  className?: string;
  /** Primary button background when enabled (default: `color.accent.primary`). */
  primaryBackgroundColor?: string;
  /** Primary button background when disabled (default: `color.background.tertiary`). */
  primaryDisabledBackgroundColor?: string;
};

const ROW_BUTTON_CLASS = 'min-w-0 flex-1';

export function SheetFooterButtons({
  color,
  primaryLabel,
  onPrimaryPress,
  primaryDisabled = false,
  primaryLoading = false,
  labelSuffix,
  primaryAccessibilityLabel,
  onPrimaryPressIn,
  secondaryLabel,
  onSecondaryPress,
  onSecondaryPressIn,
  secondaryDisabled = false,
  secondaryAccessibilityLabel,
  singleVariant = 'primary',
  bottomAction,
  className = 'mt-4 w-full',
  primaryBackgroundColor,
  primaryDisabledBackgroundColor,
}: SheetFooterButtonsProps) {
  const hasSecondary = Boolean(secondaryLabel && onSecondaryPress);
  const primaryContainerStyle = sheetFooterPrimaryButtonContainerStyle(color, {
    backgroundColor: primaryBackgroundColor,
    disabledBackgroundColor: primaryDisabledBackgroundColor,
    disabled: primaryDisabled,
  });
  const primaryLabelStyle = primaryDisabled ? { color: color.text.muted } : undefined;

  return (
    <View className={className}>
      {hasSecondary ? (
        <View className="flex-row gap-3">
          <Button
            variant="secondary"
            label={secondaryLabel}
            onPress={onSecondaryPress}
            onPressIn={onSecondaryPressIn}
            activeOpacity={0.8}
            className={ROW_BUTTON_CLASS}
            color={color}
            disabled={secondaryDisabled}
            containerStyle={sheetFooterButtonContainerStyle(color, 'secondary')}
            accessibilityLabel={secondaryAccessibilityLabel ?? secondaryLabel}
          />
          <Button
            variant="primary"
            label={primaryLabel}
            labelSuffix={labelSuffix}
            onPress={onPrimaryPress}
            onPressIn={onPrimaryPressIn}
            activeOpacity={0.85}
            className={ROW_BUTTON_CLASS}
            color={color}
            disabled={primaryDisabled}
            loading={primaryLoading}
            containerStyle={primaryContainerStyle}
            labelStyle={primaryLabelStyle}
            accessibilityLabel={primaryAccessibilityLabel ?? primaryLabel}
            accessibilityState={{ disabled: primaryDisabled }}
          />
        </View>
      ) : singleVariant === 'secondary' ? (
        <Button
          variant="secondary"
          fullWidth
          label={primaryLabel}
          color={color}
          onPress={onPrimaryPress}
          onPressIn={onPrimaryPressIn}
          disabled={primaryDisabled}
          loading={primaryLoading}
          activeOpacity={0.8}
          containerStyle={sheetFooterButtonContainerStyle(color, 'secondary')}
          accessibilityLabel={primaryAccessibilityLabel ?? primaryLabel}
        />
      ) : (
        <Button
          variant="primary"
          fullWidth
          label={primaryLabel}
          labelSuffix={labelSuffix}
          color={color}
          onPress={onPrimaryPress}
          onPressIn={onPrimaryPressIn}
          disabled={primaryDisabled}
          loading={primaryLoading}
          activeOpacity={0.85}
          containerStyle={primaryContainerStyle}
          labelStyle={primaryLabelStyle}
          accessibilityLabel={primaryAccessibilityLabel ?? primaryLabel}
          accessibilityState={{ disabled: primaryDisabled }}
        />
      )}
      {bottomAction ? (
        <View className="mt-2.5">
          <Button
            variant="secondary"
            fullWidth
            label={bottomAction.label}
            color={color}
            onPress={bottomAction.onPress}
            disabled={bottomAction.disabled}
            activeOpacity={0.8}
            containerStyle={sheetFooterButtonContainerStyle(color, 'secondary')}
          />
        </View>
      ) : null}
    </View>
  );
}
