import { AlertCircle, Loader, MicOff } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useColors } from '@/shared/config';

import type { RecordingStatus } from '../model/types';

type AiStatusPillProps = {
  aiStatus: RecordingStatus;
  transcriptProgress?: number;
  transcriptProgressLabel?: string;
  summaryStatus?: RecordingStatus;
  tasksStatus?: RecordingStatus;
  onPress: () => void;
};

const isAiProcessing = (s?: RecordingStatus) => s === 'processing';
const isAiError = (s?: RecordingStatus) => s === 'error';

export const AiStatusPill = ({
  aiStatus,
  transcriptProgressLabel,
  summaryStatus,
  tasksStatus,
  onPress,
}: AiStatusPillProps) => {
  const { t } = useTranslation();
  const color = useColors();
  const rotation = useSharedValue(0);

  const aiProcessing = isAiProcessing(summaryStatus) || isAiProcessing(tasksStatus);
  const aiError = isAiError(summaryStatus) || isAiError(tasksStatus);

  const isTranscriptionInProgress = aiStatus === 'loading_model' || aiStatus === 'processing';

  useEffect(() => {
    const isProcessing = isTranscriptionInProgress || aiProcessing;
    if (!isProcessing) return;
    rotation.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.linear }), -1);
    return () => cancelAnimation(rotation);
  }, [aiStatus, aiProcessing, isTranscriptionInProgress, rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 360}deg` }],
  }));

  if (aiStatus === 'done' && !aiProcessing && !aiError) {
    return null;
  }

  if (isTranscriptionInProgress) {
    const label =
      aiStatus === 'loading_model'
        ? t('aiStatus.loading_model')
        : (transcriptProgressLabel ?? t('aiStatus.processing'));
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
        style={{ backgroundColor: color.status.processing.bg }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Animated.View style={spinStyle}>
          <Loader size={11} color={color.status.processing.text} strokeWidth={2.5} />
        </Animated.View>
        <Text className="text-xs font-medium" style={{ color: color.status.processing.text }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  }

  if (aiProcessing) {
    const aiLabel = t('aiStatus.aiProcessing');
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={aiLabel}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
        style={{ backgroundColor: color.status.processing.bg }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Animated.View style={spinStyle}>
          <Loader size={11} color={color.status.processing.text} strokeWidth={2.5} />
        </Animated.View>
        <Text className="text-xs font-medium" style={{ color: color.status.processing.text }}>
          {aiLabel}
        </Text>
      </TouchableOpacity>
    );
  }

  if (aiStatus === 'error' || aiError) {
    const errLabel = t('common.error');
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={errLabel}
        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
        style={{ backgroundColor: color.status.error.bg }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <AlertCircle size={11} color={color.status.error.text} strokeWidth={2.5} />
        <Text className="text-xs font-medium" style={{ color: color.status.error.text }}>
          {errLabel}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
      className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
      style={{ backgroundColor: color.status.muted.bg }}
    >
      <MicOff size={11} color={color.status.muted.text} strokeWidth={2.5} />
      <Text className="text-xs font-medium" style={{ color: color.status.muted.text }}>
        {t('aiStatus.noTranscript')}
      </Text>
    </View>
  );
};
