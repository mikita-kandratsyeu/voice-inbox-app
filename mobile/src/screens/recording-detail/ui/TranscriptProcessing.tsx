import { Mic, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { Button } from '@/shared/ui';

type TranscriptProcessingProps = {
  progress: number;
  color: Colors;
  onCancel: () => void;
  // Метка для длинных записей: "Обработано N из M фрагментов..."
  progressLabel?: string;
};

export const TranscriptProcessing = ({
  progress,
  color,
  onCancel,
  progressLabel,
}: TranscriptProcessingProps) => {
  const animatedWidth = useRef(new Animated.Value(progress)).current;
  const clampedProgress = Math.min(100, Math.max(0, progress));

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: clampedProgress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [clampedProgress, animatedWidth]);

  const secondsLeft = Math.round(((100 - clampedProgress) / 100) * 60);
  const timeLabel = progressLabel
    ? progressLabel
    : secondsLeft < 60
      ? `~${secondsLeft} сек осталось`
      : `~${Math.ceil(secondsLeft / 60)} мин осталось`;

  const trackWidthInterpolated = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View className="gap-3 p-4">
      <View className="flex-row items-center gap-3">
        <View
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: color.accent.primary + '1A' }}
        >
          <Mic size={22} color={color.accent.primary} strokeWidth={2} />
        </View>
        <View className="gap-0.5">
          <Text className="text-base font-bold" style={{ color: color.text.primary }}>
            Транскрибируется...
          </Text>
          <Text className="text-[14px]" style={{ color: color.text.secondary }}>
            {timeLabel}
          </Text>
        </View>
      </View>

      <View
        className="h-1.5 overflow-hidden rounded-sm"
        style={{ backgroundColor: color.background.tertiary }}
      >
        <Animated.View
          className="h-1.5 rounded-sm"
          style={{ width: trackWidthInterpolated, backgroundColor: color.accent.primary }}
        />
      </View>
      <View className="-mt-1 flex-row justify-between">
        <Text className="text-xs font-medium" style={{ color: color.text.secondary }}>
          {clampedProgress}%
        </Text>
        <Text className="text-xs font-medium" style={{ color: color.text.secondary }}>
          100%
        </Text>
      </View>
      <Button
        variant="secondary"
        size="lg"
        icon={<X size={16} color={color.text.secondary} strokeWidth={2.5} />}
        label="Отменить"
        color={color}
        onPress={onCancel}
        className="mt-1"
      />
    </View>
  );
};
