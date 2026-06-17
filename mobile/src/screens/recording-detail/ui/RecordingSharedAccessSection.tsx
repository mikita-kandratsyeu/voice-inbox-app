import { Globe } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { formatShareExpiresAt, resolveDayjsLocale } from '@/shared/lib/date';

type RecordingSharedAccessSectionProps = {
  expiresAt: string | null;
  stale?: boolean;
  disabled?: boolean;
  actionLabel?: string;
  color: Colors;
  surfaceBackgroundColor: string;
  onPressAction: () => void;
};

export const RecordingSharedAccessSection = ({
  expiresAt,
  stale = false,
  disabled = false,
  actionLabel,
  color,
  surfaceBackgroundColor,
  onPressAction,
}: RecordingSharedAccessSectionProps) => {
  const { t, i18n } = useTranslation();
  const dayjsLocale = resolveDayjsLocale(i18n.language);

  const formattedExpiry = useMemo(() => {
    if (!expiresAt) return null;
    return formatShareExpiresAt(expiresAt, dayjsLocale);
  }, [dayjsLocale, expiresAt]);

  const expiryHint = formattedExpiry
    ? t('share.publishActiveUntil', { date: formattedExpiry })
    : t('share.publishActiveNoExpiry');

  return (
    <View
      className="overflow-hidden rounded-2xl"
      style={{ backgroundColor: surfaceBackgroundColor }}
    >
      <View className="flex-row items-center gap-3 px-4 py-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('share.publicBadge')}. ${expiryHint}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onPressAction}
          className="min-w-0 flex-1 flex-row items-center gap-2.5"
        >
          <View
            className="h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: color.accent.primary }}
          >
            <Globe size={17} color="#fff" strokeWidth={2} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[15px] font-semibold" style={{ color: color.text.primary }}>
              {t('share.publicBadge')}
            </Text>
            <Text
              className="mt-0.5 text-[12px] leading-4"
              numberOfLines={2}
              style={{ color: color.text.secondary }}
            >
              {expiryHint}
            </Text>
            {stale ? (
              <Text
                className="mt-1 text-[12px] leading-4"
                numberOfLines={2}
                style={{ color: color.text.muted }}
              >
                {t('share.publishStaleHint')}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={actionLabel ?? t('common.open')}
          onPress={onPressAction}
          disabled={disabled}
          activeOpacity={0.75}
          style={{
            alignSelf: 'center',
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: color.background.tertiary,
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Text className="text-[13px] font-semibold" style={{ color: color.accent.primary }}>
            {actionLabel ?? t('common.open')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
