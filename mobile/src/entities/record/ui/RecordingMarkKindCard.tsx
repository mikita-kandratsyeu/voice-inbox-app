import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { useAppTheme } from '@/shared/config';
import { hapticSelection, isDarkSurfaceColor } from '@/shared/lib';

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
  highlighted?: boolean;
};

export function RecordingMarkKindCard({
  kind,
  color: c,
  onPress,
  onLongPress,
  highlighted = false,
}: RecordingMarkKindCardProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const surfaceDark = isDarkSurfaceColor(c);
  const { Icon, recordA11yKey, descriptionKey } = getRecordingMarkKindUi(kind);
  const { accent, backgroundUnselected, borderUnselected } = getRecordingMarkKindAccentColors(
    kind,
    theme,
    surfaceDark,
  );

  const title = t(recordA11yKey);
  const description = t(descriptionKey);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: highlighted }}
      accessibilityLabel={`${title}. ${description}`}
      accessibilityHint={onLongPress ? t('record.markHoldForLabel') : undefined}
      onPress={() => {
        hapticSelection();
        onPress(kind);
      }}
      onLongPress={
        onLongPress
          ? () => {
              hapticSelection();
              onLongPress(kind);
            }
          : undefined
      }
      delayLongPress={420}
      className="min-h-[88px] flex-1 flex-row items-center gap-3 rounded-2xl px-3.5 py-3.5"
      style={({ pressed }) => ({
        borderWidth: highlighted ? 2 : 1,
        borderColor: highlighted ? accent : borderUnselected,
        backgroundColor: backgroundUnselected,
        opacity: pressed ? 0.88 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View className="w-9 items-center justify-center">
        <Icon size={22} color={accent} strokeWidth={2} />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-[16px] font-semibold leading-5" style={{ color: c.text.primary }}>
          {title}
        </Text>
        <Text className="text-[13px] leading-[18px]" style={{ color: c.text.secondary }}>
          {description}
        </Text>
      </View>
    </Pressable>
  );
}
