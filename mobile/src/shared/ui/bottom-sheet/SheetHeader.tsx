import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';

type SheetHeaderProps = {
  /** Title text or i18n key */
  title: string;
  /** Optional subtitle text */
  subtitle?: string;
  color: Colors;
  /** @default 'center' */
  textAlign?: 'center' | 'left';
  /** Icon element to show above title */
  icon?: React.ReactNode;
  /** @default 4 when no subtitle, 12 when subtitle exists */
  marginBottom?: number;
};

/**
 * Standardized sheet header with title, optional subtitle and icon.
 * Reduces boilerplate for common sheet header patterns.
 *
 * @example
 * <SheetHeader
 *   title={t('settings.title')}
 *   subtitle={t('settings.subtitle')}
 *   color={c}
 * />
 *
 * @example With icon
 * <SheetHeader
 *   title={t('backup.title')}
 *   icon={<ShieldAlert size={28} color={c.accent.primary} />}
 *   color={c}
 * />
 */
export function SheetHeader({
  title,
  subtitle,
  color,
  textAlign = 'center',
  icon,
  marginBottom: marginBottomProp,
}: SheetHeaderProps) {
  const marginBottom = marginBottomProp ?? (subtitle ? 12 : 4);

  return (
    <View
      style={{
        marginBottom,
        alignItems: textAlign === 'center' ? 'center' : 'flex-start',
      }}
    >
      {icon ? (
        <View
          className="mb-4 h-14 w-14 items-center justify-center rounded-2xl"
          style={{ backgroundColor: color.background.tertiary }}
        >
          {icon}
        </View>
      ) : null}

      <Text
        className="text-xl font-bold"
        style={{
          color: color.text.primary,
          textAlign,
          paddingTop: icon ? 0 : 4,
          marginBottom: subtitle ? 8 : 0,
        }}
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          className="text-sm leading-5"
          style={{
            color: color.text.secondary,
            textAlign,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
