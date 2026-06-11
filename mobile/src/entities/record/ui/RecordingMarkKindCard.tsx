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
};

export function RecordingMarkKindCard({
  kind,
  color: c,
  onPress,
  onLongPress,
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
      className="w-full items-center justify-start rounded-2xl px-2 py-3"
      style={({ pressed }) => ({
        minHeight: 128,
        backgroundColor: c.background.tertiary,
        opacity: pressed ? 0.82 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View
        className="mb-2 h-11 w-11 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: iconBackground }}
      >
        <Icon size={22} color={accent} strokeWidth={2} />
      </View>
      <View className="w-full items-center">
        <Text
          className="h-5 w-full text-center text-[13px] font-semibold leading-5"
          style={{ color: c.text.primary }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          className="mt-0.5 h-8 w-full text-center text-[11px] leading-4"
          style={{ color: c.text.muted }}
          numberOfLines={2}
        >
          {description}
        </Text>
      </View>
    </Pressable>
  );
}
