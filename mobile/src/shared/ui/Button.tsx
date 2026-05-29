import React from 'react';
import {
  ActivityIndicator,
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  TouchableOpacity,
  type TouchableOpacityProps,
  View,
  type ViewStyle,
} from 'react-native';

import type { Colors } from '@/shared/config';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonShape = 'default' | 'circle';

/** Shared corner radius for labeled buttons (not chips / avatars). */
export const BUTTON_BORDER_RADIUS = 12;
type VariantStyle = { bg: ViewStyle; textColor?: string; textClassName?: string };

export type ButtonProps = TouchableOpacityProps & {
  label?: string;
  /** Rendered after `label` with smaller, subtler styling (e.g. dynamic size). */
  labelSuffix?: string;
  /** Rendered after the label row (e.g. arrow); hidden while `loading`. */
  trailingIcon?: React.ReactNode;
  icon?: React.ReactNode;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  color?: Colors;
  containerStyle?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
  /** `circle` — round icon-only controls (headers). `default` — 12px corners for actions. */
  shape?: ButtonShape;
  className?: string;
  /** `start` — icon/label left, trailing at end (sidebar rows). Default: centered. */
  contentAlign?: 'center' | 'start';
  labelStyle?: StyleProp<TextStyle>;
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

function radiusClass(shape: ButtonShape, isIconOnly: boolean): string {
  return shape === 'circle' && isIconOnly ? 'rounded-full' : 'rounded-xl';
}

function labeledContainerClass(size: ButtonSize, shape: ButtonShape, isIconOnly: boolean): string {
  const radius = radiusClass(shape, isIconOnly);
  const bySize: Record<ButtonSize, string> = {
    sm: `min-h-[44px] min-w-[44px] ${radius} px-3 py-2`,
    md: `min-h-[44px] ${radius} px-4 py-3`,
    lg: `min-h-[44px] ${radius} px-7 py-3.5`,
  };
  return bySize[size];
}

/** Icon-only: 44×44 pt minimum (Apple HIG); `lg` is slightly larger for primary actions. */
function iconOnlyContainerClass(size: ButtonSize, shape: ButtonShape): string {
  const radius = radiusClass(shape, true);
  const bySize: Record<ButtonSize, string> = {
    sm: `h-11 w-11 ${radius}`,
    md: `h-11 w-11 ${radius}`,
    lg: `h-12 w-12 ${radius}`,
  };
  return bySize[size];
}

const DANGER_BG = { backgroundColor: 'transparent' };

export const Button = ({
  label,
  labelSuffix,
  trailingIcon,
  icon,
  loading = false,
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  color,
  containerStyle,
  fullWidth,
  shape = 'default',
  activeOpacity = 0.75,
  disabled,
  className,
  contentAlign = 'center',
  labelStyle,
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

  const useCircle = shape === 'circle' && isIconOnly;
  const sizeClasses = isIconOnly
    ? iconOnlyContainerClass(size, shape)
    : labeledContainerClass(size, shape, isIconOnly);
  const textSizeClass = size === 'sm' ? 'text-sm' : 'text-[16px] font-semibold';

  const isStartAligned = contentAlign === 'start' && !isIconOnly;

  const containerClassName = [
    'flex-row items-center gap-2',
    isStartAligned ? 'justify-start' : 'justify-center',
    sizeClasses,
    fullWidth && 'w-full self-stretch',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const textClassName = [textSizeClass, variantTextClass].filter(Boolean).join(' ');

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
        useCircle ? { borderRadius: 9999 } : { borderRadius: BUTTON_BORDER_RADIUS },
        containerStyle,
        disabled && !loading && { opacity: 0.4 },
      ]}
      activeOpacity={activeOpacity}
      disabled={disabled || loading}
      {...rest}
    >
      {icon}
      {!isIconOnly && label && (
        <View
          className={[
            'flex-row items-center gap-2',
            isStartAligned ? 'min-w-0 flex-1' : 'justify-center',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <View
            className={
              isStartAligned ? 'min-w-0 flex-1 items-start' : 'items-center justify-center'
            }
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: isStartAligned ? 'flex-start' : 'center',
                maxWidth: '100%',
                opacity: loading ? 0 : 1,
              }}
            >
              <Text
                className={textClassName}
                style={[textStyle, { flexShrink: 1 }, labelStyle]}
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
          {!loading && trailingIcon ? (
            <View
              className={isStartAligned ? 'ml-auto shrink-0' : undefined}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {trailingIcon}
            </View>
          ) : null}
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
