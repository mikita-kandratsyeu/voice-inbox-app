import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { PrivateLocalLlmBudget } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';
import { useRotatingI18nTip } from '@/shared/lib/aiGenerationTips';
import {
  estimateProcessingSecondsRemaining,
  formatProcessingTimeRemaining,
} from '@/shared/lib/estimateProcessingTimeRemaining';
import { AiProcessingCancelButton, ProcessingStatusTitle, RotatingTipText } from '@/shared/ui';

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
  processingStartedAtMs?: number;
  transcriptCharCount?: number;
  durationMs?: number;
  transcriptionSegments?: { current: number; total: number };
  privateLlmBudget?: PrivateLocalLlmBudget;
  cloudMeetingDialogue?: boolean;
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
  processingStartedAtMs,
  transcriptCharCount,
  durationMs,
  transcriptionSegments,
  privateLlmBudget,
  cloudMeetingDialogue,
}: DetailTabProcessingViewProps) => {
  const { t } = useTranslation();
  const rotatingTip = useRotatingI18nTip(tipKeys ?? []);
  const hintDisplay = tipKeys?.length ? rotatingTip : (hintText ?? '');
  const animatedWidth = useSharedValue(0);
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const isCompact = !showProgress;
  const [nowMs, setNowMs] = useState(() => Date.now());

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

  useEffect(() => {
    if (!showProgress || progressLabel) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [showProgress, progressLabel]);

  const timeLabel = useMemo(() => {
    if (progressLabel) return progressLabel;

    const secondsLeft = estimateProcessingSecondsRemaining({
      context,
      phase,
      progressPercent: clampedProgress,
      startedAtMs: processingStartedAtMs,
      nowMs,
      transcriptCharCount,
      durationMs,
      transcriptionSegments,
      privateLlmBudget,
      cloudMeetingDialogue,
    });

    return formatProcessingTimeRemaining(secondsLeft, t, timeNs);
  }, [
    clampedProgress,
    cloudMeetingDialogue,
    context,
    durationMs,
    nowMs,
    phase,
    privateLlmBudget,
    processingStartedAtMs,
    progressLabel,
    t,
    timeNs,
    transcriptCharCount,
    transcriptionSegments,
  ]);

  const trackStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  const cardStyle = {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: withAlphaHex(color.border.default, 0.9),
    backgroundColor: color.background.secondary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  } as const;

  return (
    <View
      className={isCompact ? 'w-full' : 'p-4'}
      style={isCompact ? { maxWidth: 440, width: '100%', alignSelf: 'center' } : undefined}
    >
      <View style={cardStyle}>
        <View className="flex-row items-start gap-3">
          <View className="h-9 w-9 shrink-0 items-center justify-center">{leadingIcon}</View>
          <View className="min-w-0 flex-1 gap-1.5">
            <ProcessingStatusTitle
              title={statusTitle}
              color={color.text.primary}
              loaderColor={color.accent.primary}
              className={isCompact ? 'text-[17px] font-semibold leading-6' : 'text-base font-bold'}
            />
            {showProgress ? (
              <Text className="text-[14px] leading-5" style={{ color: color.text.secondary }}>
                {timeLabel}
              </Text>
            ) : null}
            {hintDisplay ? (
              <RotatingTipText
                text={hintDisplay}
                color={color.text.secondary}
                className="text-[14px] leading-5"
              />
            ) : null}
          </View>
        </View>

        {showProgress ? (
          <View className="gap-1.5">
            <View
              className="h-1.5 overflow-hidden rounded-full"
              style={{ backgroundColor: color.background.tertiary }}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: clampedProgress }}
              accessibilityLabel={statusTitle}
            >
              <Animated.View
                className="h-1.5 rounded-full"
                style={[trackStyle, { backgroundColor: color.accent.primary }]}
              />
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs font-medium" style={{ color: color.text.muted }}>
                {clampedProgress}%
              </Text>
              <Text className="text-xs font-medium" style={{ color: color.text.muted }}>
                100%
              </Text>
            </View>
          </View>
        ) : null}

        {onCancel ? (
          <>
            <View style={{ height: 1, backgroundColor: color.border.default, opacity: 0.85 }} />
            <AiProcessingCancelButton color={color} onPress={onCancel} fullWidth />
          </>
        ) : null}
      </View>
    </View>
  );
};
