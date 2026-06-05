import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { isDarkSurfaceColor, withAlphaHex } from '@/shared/lib';

import {
  getRecordingMarkKindAccentColors,
  getRecordingMarkKindUi,
} from '../lib/recordingMarkKindUi';
import type { RecordingMarkKind } from '../model/types';

type RecordingMarkKindCardProps = {
  kind: RecordingMarkKind;
  color: Colors;
  onPress: (kind: RecordingMarkKind) => void;
  onLongPress?: (kind: RecordingMarkKind) => void;
  /** `fill` splits row width evenly; `scroll` sizes to label text for horizontal lists. */
  layout?: 'fill' | 'scroll';
};

export function RecordingMarkKindCard({
  kind,
  color: c,
  onPress,
  onLongPress,
  layout = 'fill',
}: RecordingMarkKindCardProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const surfaceDark = isDarkSurfaceColor(c);
  const { Icon, recordA11yKey, descriptionKey } = getRecordingMarkKindUi(kind);
  const { accent } = getRecordingMarkKindAccentColors(kind, theme, surfaceDark);

  const title = t(recordA11yKey);
  const description = t(descriptionKey);
  const iconBackground = withAlphaHex(accent, surfaceDark ? 0.2 : 0.14);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      accessibilityHint={onLongPress ? t('record.markHoldForLabel') : undefined}
      onPress={() => onPress(kind)}
      onLongPress={onLongPress ? () => onLongPress(kind) : undefined}
      delayLongPress={420}
      className={`items-center justify-center gap-2.5 rounded-2xl py-4 ${layout === 'fill' ? 'flex-1 px-2' : 'px-3'}`}
      style={({ pressed }) => ({
        backgroundColor: c.background.tertiary,
        opacity: pressed ? 0.82 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: iconBackground }}
      >
        <Icon size={22} color={accent} strokeWidth={2} />
      </View>
      <View className="w-full items-center gap-0.5 px-1">
        <Text
          className="text-center text-[15px] font-semibold leading-5"
          style={{ color: c.text.primary }}
          numberOfLines={layout === 'fill' ? 1 : undefined}
        >
          {title}
        </Text>
        <Text
          className="text-center text-[12px] leading-4"
          style={{ color: c.text.muted }}
          numberOfLines={layout === 'fill' ? 2 : undefined}
        >
          {description}
        </Text>
      </View>
    </Pressable>
  );
}
