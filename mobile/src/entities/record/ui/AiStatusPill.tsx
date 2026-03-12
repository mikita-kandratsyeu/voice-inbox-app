import { AlertCircle, Loader, MicOff } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { getColors } from '@/shared/config';

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
  summaryStatus,
  tasksStatus,
  onPress,
}: AiStatusPillProps) => {
  const { t } = useTranslation();
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');
  const rotation = useSharedValue(0);

  const aiProcessing = isAiProcessing(summaryStatus) || isAiProcessing(tasksStatus);
  const aiError = isAiError(summaryStatus) || isAiError(tasksStatus);

  useEffect(() => {
    const isProcessing = aiStatus === 'processing' || aiProcessing;
    if (!isProcessing) return;
    rotation.value = withRepeat(withTiming(1, { duration: 1000, easing: Easing.linear }), -1);
    return () => cancelAnimation(rotation);
  }, [aiStatus, aiProcessing, rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 360}deg` }],
  }));

  if (aiStatus === 'done' && !aiProcessing && !aiError) {
    return null;
  }

  if (aiStatus === 'processing') {
    return (
      <TouchableOpacity
        className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
        style={{ backgroundColor: color.status.processing.bg }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Animated.View style={spinStyle}>
          <Loader size={11} color={color.status.processing.text} strokeWidth={2.5} />
        </Animated.View>
        <Text className="text-xs font-medium" style={{ color: color.status.processing.text }}>
          {t('aiStatus.processing')}
        </Text>
      </TouchableOpacity>
    );
  }

  if (aiProcessing) {
    return (
      <TouchableOpacity
        className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
        style={{ backgroundColor: color.status.processing.bg }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <Animated.View style={spinStyle}>
          <Loader size={11} color={color.status.processing.text} strokeWidth={2.5} />
        </Animated.View>
        <Text className="text-xs font-medium" style={{ color: color.status.processing.text }}>
          {t('aiStatus.aiProcessing')}
        </Text>
      </TouchableOpacity>
    );
  }

  if (aiStatus === 'error' || aiError) {
    return (
      <TouchableOpacity
        className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
        style={{ backgroundColor: color.status.error.bg }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <AlertCircle size={11} color={color.status.error.text} strokeWidth={2.5} />
        <Text className="text-xs font-medium" style={{ color: color.status.error.text }}>
          {t('common.error')}
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
