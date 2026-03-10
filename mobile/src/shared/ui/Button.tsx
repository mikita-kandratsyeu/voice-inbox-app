import React from 'react';
import {
  type StyleProp,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
  type ViewStyle,
} from 'react-native';

import type { Colors } from '@/shared/config';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg';
type VariantStyle = { bg: ViewStyle; textColor?: string; textClassName?: string };

export type ButtonProps = TouchableOpacityProps & {
  label?: string;
  icon?: React.ReactNode;
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
  sm: { container: 'h-9 w-9', text: 'text-sm' },
  md: { container: 'rounded-full px-4 py-3', text: 'text-[16px] font-semibold' },
  lg: { container: 'rounded-full px-7 py-3.5', text: 'text-[16px] font-semibold' },
};

const ICON_ONLY_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const DANGER_BG = { backgroundColor: 'transparent' };

export const Button = ({
  label,
  icon,
  variant = 'primary',
  size = 'md',
  iconOnly = false,
  color,
  containerStyle,
  fullWidth,
  activeOpacity = 0.75,
  disabled,
  className,
  ...rest
}: ButtonProps) => {
  const isIconOnly = iconOnly || (Boolean(icon) && !label);
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
    fullWidth && 'flex-1',
    isIconOnly && 'rounded-full',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const textClassName = [SIZE_CLASSES[size].text, variantTextClass].filter(Boolean).join(' ');

  const textStyle = textColor ? { color: textColor } : undefined;

  return (
    <TouchableOpacity
      className={containerClassName}
      style={[
        variantKey === 'danger' ? DANGER_BG : bg,
        containerStyle,
        disabled && { opacity: 0.4 },
      ]}
      activeOpacity={activeOpacity}
      disabled={disabled}
      {...rest}
    >
      {icon}
      {!isIconOnly && label && (
        <Text className={textClassName} style={textStyle} numberOfLines={1}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
};
