import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection, isDarkSurfaceColor, withAlphaHex } from '@/shared/lib';

export type PickerKindCardProps = {
  color: Colors;
  icon: LucideIcon;
  accent: string;
  title: string;
  description: string;
  onPress: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/** Tile card for kind pickers (recording marks, task follow-up, etc.). */
export function PickerKindCard({
  color: c,
  icon: Icon,
  accent,
  title,
  description,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
}: PickerKindCardProps) {
  const surfaceDark = isDarkSurfaceColor(c);
  const iconBackground = withAlphaHex(accent, surfaceDark ? 0.2 : 0.14);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `${title}. ${description}`}
      accessibilityHint={accessibilityHint}
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      onLongPress={onLongPress}
      delayLongPress={onLongPress ? 420 : undefined}
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
