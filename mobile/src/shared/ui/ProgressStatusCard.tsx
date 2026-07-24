import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useColors } from '@/shared/config';

type ProgressStatusCardProps = {
  title: string;
  subtitle?: React.ReactNode;
  /** 0–1; when set, shows an animated bar and percent under the title. */
  progress?: number;
};

/** Centered loading card — same shell as auto-organize and import progress overlays. */
export function ProgressStatusCard({ title, subtitle, progress }: ProgressStatusCardProps) {
  const color = useColors();
  const animatedWidth = useSharedValue(0);
  const showProgress = progress != null;
  const clampedPercent = showProgress ? Math.min(100, Math.max(0, Math.round(progress * 100))) : 0;

  useEffect(() => {
    if (!showProgress) return;
    animatedWidth.value = withTiming(clampedPercent, { duration: 280 });
  }, [animatedWidth, clampedPercent, showProgress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  return (
    <View
      className="w-full max-w-sm rounded-2xl px-6 py-8"
      style={{
        backgroundColor: color.background.card,
        borderWidth: 1,
        borderColor: color.border.default,
        shadowColor: color.shadow.color,
        shadowOpacity: color.shadow.opacity,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={color.accent.primary} />
      </View>
      <Text
        className="mt-5 text-center text-[16px] font-semibold leading-6"
        style={{ color: color.text.primary }}
      >
        {title}
      </Text>
      {showProgress ? (
        <View className="mt-4 w-full gap-1.5">
          <View
            className="h-1.5 overflow-hidden rounded-full"
            style={{ backgroundColor: color.background.tertiary }}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: clampedPercent }}
            accessibilityLabel={title}
          >
            <Animated.View
              className="h-1.5 rounded-full"
              style={[fillStyle, { backgroundColor: color.accent.primary }]}
            />
          </View>
          <Text className="text-center text-xs font-medium" style={{ color: color.text.muted }}>
            {clampedPercent}%
          </Text>
        </View>
      ) : null}
      {subtitle != null ? (
        <View style={{ marginTop: 8, width: '100%', alignItems: 'center' }}>{subtitle}</View>
      ) : null}
    </View>
  );
}
