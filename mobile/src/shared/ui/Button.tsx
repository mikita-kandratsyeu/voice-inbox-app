import React from 'react';
import {
  ActivityIndicator,
  type StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
  View,
  type ViewStyle,
} from 'react-native';

import type { Colors } from '@/shared/config';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';
type VariantStyle = { bg: ViewStyle; textColor?: string; textClassName?: string };

export type ButtonProps = TouchableOpacityProps & {
  label?: string;
  /** Rendered after `label` with smaller, subtler styling (e.g. dynamic size). */
  labelSuffix?: string;
  icon?: React.ReactNode;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  color?: Colors;
  containerStyle?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
  className?: string;
};

const VARIANT_STYLES: Record<ButtonVariant, (color: Colors) => VariantStyle> = {
  primary: (color) => ({
    bg: { backgroundColor: color.accent.primary },
    textClassName: 'text-white',
    textColor: color.icon.onAccent,
  }),
  secondary: (color) => ({
    bg: { backgroundColor: color.background.tertiary },
    textColor: color.text.primary,
  }),
  ghost: (color) => ({
    bg: {},
    textColor: color.text.secondary,
  }),
  danger: () => ({
    bg: {},
    textClassName: 'text-red-600 dark:text-red-400',
  }),
  icon: (color) => ({
    bg: { backgroundColor: color.background.tertiary },
    textColor: color.text.primary,
  }),
};

const SIZE_CLASSES = {
  sm: {
    container: 'min-h-[44px] min-w-[44px] rounded-full px-3 py-2',
    text: 'text-sm',
  },
  md: {
    container: 'min-h-[44px] rounded-full px-4 py-3',
    text: 'text-[16px] font-semibold',
  },
  lg: {
    container: 'min-h-[44px] rounded-full px-7 py-3.5',
    text: 'text-[16px] font-semibold',
  },
};

/** Icon-only: 44×44 pt minimum (Apple HIG); `lg` is slightly larger for primary actions. */
const ICON_ONLY_SIZES: Record<ButtonSize, string> = {
  sm: 'h-11 w-11',
  md: 'h-11 w-11',
  lg: 'h-12 w-12',
};

const DANGER_BG = { backgroundColor: 'transparent' };

export const Button = ({
  label,
  labelSuffix,
  icon,
  loading = false,
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  color,
  containerStyle,
  fullWidth,
  activeOpacity = 0.75,
  disabled,
  className,
  accessibilityLabel: accessibilityLabelProp,
  accessibilityState: accessibilityStateProp,
  ...rest
}: ButtonProps) => {
  const isIconOnly = iconOnly || (Boolean(icon) && !label && !loading);
  const variantKey = isIconOnly ? 'icon' : variant;
  const colorScheme =
    color ??
    ({
      background: { tertiary: '#f3f4f6' },
      text: { primary: '#1f2937', secondary: '#9ca3af' },
      accent: { primary: '#3b82f6' },
    } as Colors);

  const {
    bg,
    textColor,
    textClassName: variantTextClass,
  } = variantKey === 'danger'
    ? { bg: DANGER_BG, textColor: undefined, textClassName: 'text-red-600 dark:text-red-400' }
    : VARIANT_STYLES[variantKey](colorScheme);

  const sizeClasses = isIconOnly ? ICON_ONLY_SIZES[size] : SIZE_CLASSES[size].container;

  const containerClassName = [
    'flex-row items-center justify-center gap-2',
    sizeClasses,
    fullWidth && 'w-full self-stretch',
    isIconOnly && 'rounded-full',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const textClassName = [SIZE_CLASSES[size].text, variantTextClass].filter(Boolean).join(' ');

  const textStyle = textColor ? { color: textColor } : undefined;

  const accessibilityLabel =
    accessibilityLabelProp ??
    (!isIconOnly && label ? (labelSuffix ? `${label} ${labelSuffix}` : label) : undefined);
  const accessibilityState = {
    ...accessibilityStateProp,
    disabled: Boolean(disabled || loading || accessibilityStateProp?.disabled),
    ...(loading ? { busy: true as const } : {}),
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      className={containerClassName}
      style={[
        variantKey === 'danger' ? DANGER_BG : bg,
        containerStyle,
        disabled && !loading && { opacity: 0.4 },
      ]}
      activeOpacity={activeOpacity}
      disabled={disabled || loading}
      {...rest}
    >
      {icon}
      {!isIconOnly && label && (
        <View className="items-center justify-center">
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'center',
              maxWidth: '100%',
              opacity: loading ? 0 : 1,
            }}
          >
            <Text
              className={textClassName}
              style={[textStyle, { flexShrink: 1 }]}
              numberOfLines={1}
            >
              {label}
            </Text>
            {labelSuffix ? (
              <Text
                className={[
                  'text-[14px] font-medium leading-6',
                  variantKey === 'danger' ? variantTextClass : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={[
                  textStyle,
                  {
                    fontVariant: ['tabular-nums'],
                    opacity:
                      variantKey === 'primary' ? 0.88 : variantKey === 'danger' ? 0.92 : 0.82,
                  },
                ]}
                numberOfLines={1}
              >
                {' '}
                {labelSuffix}
              </Text>
            ) : null}
          </View>
          {loading && (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                { alignItems: 'center', justifyContent: 'center' },
              ]}
            >
              <ActivityIndicator
                size="small"
                color={
                  variantKey === 'primary'
                    ? colorScheme.icon.onAccent
                    : (textColor ?? colorScheme.text.primary)
                }
              />
            </View>
          )}
        </View>
      )}
      {!isIconOnly && !label && loading && (
        <ActivityIndicator
          color={
            variantKey === 'primary'
              ? colorScheme.icon.onAccent
              : (textColor ?? colorScheme.text.primary)
          }
        />
      )}
    </TouchableOpacity>
  );
};
