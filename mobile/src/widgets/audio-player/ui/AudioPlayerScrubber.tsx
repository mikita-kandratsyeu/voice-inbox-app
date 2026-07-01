import React, { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { Colors } from '@/shared/config';
import { IOS_MIN_TOUCH_TARGET } from '@/shared/lib/iosTouchTarget';

const SCRUB_TOUCH_HEIGHT = IOS_MIN_TOUCH_TARGET;

type AudioPlayerScrubberProps = {
  color: Colors;
  hasAudio: boolean;
  thumbSize: number;
  progressValue?: SharedValue<number>;
  trackWidthValue?: SharedValue<number>;
  progressFraction?: number;
  onScrubStart?: () => void;
  onScrubChange?: (progress: number) => void;
  onScrubEnd?: (progress: number) => void;
};

function clampProgress(progress: number) {
  'worklet';
  return Math.min(1, Math.max(0, progress));
}

function progressFromX(x: number, width: number) {
  'worklet';
  if (width <= 0) return 0;
  return clampProgress(x / width);
}

export function AudioPlayerScrubber({
  color,
  hasAudio,
  thumbSize,
  progressValue,
  trackWidthValue,
  progressFraction,
  onScrubStart,
  onScrubChange,
  onScrubEnd,
}: AudioPlayerScrubberProps) {
  const isScrubbingRef = useRef(false);
  const localDisplayProgress = useSharedValue(progressFraction ?? 0);
  const localTrackWidth = useSharedValue(0);
  const animatedProgress = progressValue ?? localDisplayProgress;
  const animatedTrackWidth = trackWidthValue ?? localTrackWidth;
  const scrubEnabled = hasAudio && Boolean(onScrubStart && onScrubChange && onScrubEnd);

  const onScrubStartRef = useRef(onScrubStart);
  const onScrubChangeRef = useRef(onScrubChange);
  const onScrubEndRef = useRef(onScrubEnd);
  onScrubStartRef.current = onScrubStart;
  onScrubChangeRef.current = onScrubChange;
  onScrubEndRef.current = onScrubEnd;

  useEffect(() => {
    if (isScrubbingRef.current || progressValue != null) return;
    localDisplayProgress.value = progressFraction ?? 0;
  }, [localDisplayProgress, progressFraction, progressValue]);

  const notifyScrubStart = useCallback((progress: number) => {
    isScrubbingRef.current = true;
    onScrubStartRef.current?.();
    onScrubChangeRef.current?.(progress);
  }, []);

  const lastScrubNotifyMsRef = useRef(0);

  const notifyScrubChange = useCallback((progress: number) => {
    const now = Date.now();
    if (now - lastScrubNotifyMsRef.current < 32) return;
    lastScrubNotifyMsRef.current = now;
    onScrubChangeRef.current?.(progress);
  }, []);

  const notifyScrubEnd = useCallback((progress: number) => {
    isScrubbingRef.current = false;
    onScrubEndRef.current?.(progress);
  }, []);

  const scrubGesture = usePanGesture({
    enabled: scrubEnabled,
    activeOffsetX: [-2, 2],
    failOffsetY: [-10, 10],
    onBegin: (event) => {
      'worklet';
      const progress = progressFromX(event.x, animatedTrackWidth.value);
      animatedProgress.value = progress;
      scheduleOnRN(notifyScrubStart, progress);
    },
    onUpdate: (event) => {
      'worklet';
      const progress = progressFromX(event.x, animatedTrackWidth.value);
      animatedProgress.value = progress;
      scheduleOnRN(notifyScrubChange, progress);
    },
    onFinalize: (event) => {
      'worklet';
      const progress = progressFromX(event.x, animatedTrackWidth.value);
      animatedProgress.value = progress;
      scheduleOnRN(notifyScrubEnd, progress);
    },
  });

  const fillStyle = useAnimatedStyle(() => {
    const progress = clampProgress(animatedProgress.value);
    return { width: progress * animatedTrackWidth.value };
  });

  const thumbStyle = useAnimatedStyle(() => {
    const progress = clampProgress(animatedProgress.value);
    const width = animatedTrackWidth.value;
    if (width <= 0) return { left: 0 };
    const position = progress * width;
    return { left: Math.max(0, position - thumbSize / 2) };
  });

  return (
    <GestureDetector gesture={scrubGesture}>
      <View
        accessibilityRole="adjustable"
        accessibilityState={{ disabled: !scrubEnabled }}
        style={{
          justifyContent: 'center',
          minHeight: SCRUB_TOUCH_HEIGHT,
          marginVertical: -(SCRUB_TOUCH_HEIGHT - 4) / 2,
        }}
      >
        <View
          className="h-1 justify-center overflow-visible rounded-sm"
          style={{ backgroundColor: color.background.tertiary }}
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            animatedTrackWidth.value = width;
          }}
        >
          <Animated.View
            className="absolute left-0 top-0 h-1 rounded-sm"
            style={[
              fillStyle,
              { backgroundColor: hasAudio ? color.accent.primary : color.background.tertiary },
            ]}
          />
          <Animated.View
            className="absolute rounded-full shadow-sm"
            style={[
              thumbStyle,
              {
                top: -(thumbSize - 4) / 2,
                width: thumbSize,
                height: thumbSize,
                backgroundColor: hasAudio ? color.accent.primary : 'transparent',
              },
            ]}
          />
        </View>
      </View>
    </GestureDetector>
  );
}
