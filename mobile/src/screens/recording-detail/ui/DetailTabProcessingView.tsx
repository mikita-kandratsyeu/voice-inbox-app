import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { useRotatingI18nTip } from '@/shared/lib/aiGenerationTips';
import { AiProcessingCancelButton } from '@/shared/ui';

export type DetailTabProcessingContext = 'transcription' | 'private_llm' | 'cloud_ai';

type DetailTabProcessingViewProps = {
  progress: number;
  progressLabel?: string;
  phase: 'loading_model' | 'processing';
  color: Colors;
  onCancel?: () => void;
  leadingIcon: React.ReactNode;
  /** Static hint (e.g. transcription). Prefer `tipKeys` for AI generation. */
  hintText?: string;
  /** i18n keys rotated while processing (AI generation screens). */
  tipKeys?: readonly string[];
  context?: DetailTabProcessingContext;
  /** Overrides default title from `context` + `phase` (e.g. tab-specific cloud AI labels). */
  statusTitle?: string;
  /** Hide progress bar and time estimate (e.g. Ask AI cloud). */
  showProgress?: boolean;
};

export const DetailTabProcessingView = ({
  progress,
  progressLabel,
  phase,
  color,
  onCancel,
  leadingIcon,
  hintText,
  tipKeys,
  context = 'transcription',
  statusTitle: statusTitleOverride,
  showProgress = true,
}: DetailTabProcessingViewProps) => {
  const { t } = useTranslation();
  const rotatingTip = useRotatingI18nTip(tipKeys ?? []);
  const hintDisplay = tipKeys?.length ? rotatingTip : (hintText ?? '');
  const animatedWidth = useSharedValue(0);
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const statusTitleKey =
    context === 'private_llm'
      ? phase === 'loading_model'
        ? 'privateAi.loadingModel'
        : 'privateAi.processing'
      : context === 'cloud_ai'
        ? phase === 'loading_model'
          ? 'cloudAi.preparing'
          : 'cloudAi.processing'
        : (`aiStatus.${phase}` as const);

  const statusTitle = statusTitleOverride ?? t(statusTitleKey);

  const timeNs =
    context === 'private_llm' ? 'privateAi' : context === 'cloud_ai' ? 'cloudAi' : 'transcription';

  useEffect(() => {
    if (progress === 0) {
      animatedWidth.value = 0;
      return;
    }

    animatedWidth.value = withTiming(clampedProgress, { duration: 400 });
  }, [animatedWidth, clampedProgress, progress]);

  const secondsLeft = Math.round(((100 - clampedProgress) / 100) * 60);
  const timeLabel = progressLabel
    ? progressLabel
    : secondsLeft < 60
      ? t(`${timeNs}.secondsLeft`, { count: secondsLeft })
      : t(`${timeNs}.minutesLeft`, { count: Math.ceil(secondsLeft / 60) });

  const trackStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  return (
    <View className="gap-3 p-4">
      <View className="flex-row items-center gap-3">
        <View
          className="h-11 w-11 items-center justify-center rounded-full"
          style={{ backgroundColor: color.accent.primary + '1A' }}
        >
          {leadingIcon}
        </View>
        <View className="gap-0.5">
          <Text className="text-base font-bold" style={{ color: color.text.primary }}>
            {statusTitle}
          </Text>
          {showProgress ? (
            <Text className="text-[14px]" style={{ color: color.text.secondary }}>
              {timeLabel}
            </Text>
          ) : null}
        </View>
      </View>
      {hintDisplay ? (
        <View
          className="w-full rounded-xl px-4 py-3"
          style={{ backgroundColor: color.background.tertiary }}
        >
          <Text className="text-[13px] leading-5" style={{ color: color.text.secondary }}>
            {hintDisplay}
          </Text>
        </View>
      ) : null}
      {showProgress ? (
        <>
          <View
            className="h-1.5 overflow-hidden rounded-sm"
            style={{ backgroundColor: color.background.tertiary }}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: clampedProgress }}
            accessibilityLabel={statusTitle}
          >
            <Animated.View
              className="h-1.5 rounded-sm"
              style={[trackStyle, { backgroundColor: color.accent.primary }]}
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
        </>
      ) : null}
      {onCancel ? (
        <AiProcessingCancelButton color={color} onPress={onCancel} className="mt-1" />
      ) : null}
    </View>
  );
};
