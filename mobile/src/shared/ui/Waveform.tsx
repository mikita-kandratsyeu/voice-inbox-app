import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const BAR_COUNT = 32;
const BAR_MIN_HEIGHT = 6;
const BAR_MAX_HEIGHT = 56;
const BAR_WIDTH = 3;
const BAR_GAP = 4;
/** Scales raw metering into bar motion; lower = smaller waves. */
const LIVE_INPUT_GAIN = 0.72;

const getBarSensitivity = (index: number) => {
  'worklet';
  const seed = Math.sin(index * 12.9898 + index * 78.233) * 43758.5453;
  const random = seed - Math.floor(seed);
  return 0.7 + random * 0.6;
};

const getWaveHeight = (index: number, intensity: number = 1) => {
  'worklet';
  const center = BAR_COUNT / 2;
  const distanceFromCenter = Math.abs(index - center);
  const normalizedDistance = distanceFromCenter / center;

  const baseHeight =
    BAR_MIN_HEIGHT +
    (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT) * Math.exp(-2.5 * normalizedDistance * normalizedDistance);

  const variation = getBarSensitivity(index);

  return baseHeight * variation * intensity;
};

const getBarDelay = (index: number) => {
  const center = BAR_COUNT / 2;
  const distanceFromCenter = Math.abs(index - center);
  return distanceFromCenter * 1.5;
};

const applyMeteringToBar = (
  index: number,
  currentLevel: number,
  barSensitivity: number,
  smoothedLevel: SharedValue<number>,
  frameCounter: SharedValue<number>,
  height: SharedValue<number>,
  opacity: SharedValue<number>,
  scale: SharedValue<number>,
  liveFrame: boolean,
) => {
  'worklet';
  frameCounter.value += 1;

  const attack = liveFrame ? 0.48 : 0.92;
  const decay = liveFrame ? 0.22 : 0.45;
  const targetLevel = currentLevel * LIVE_INPUT_GAIN * barSensitivity;

  if (targetLevel > smoothedLevel.value) {
    smoothedLevel.value += (targetLevel - smoothedLevel.value) * attack;
  } else {
    smoothedLevel.value += (targetLevel - smoothedLevel.value) * decay;
  }

  const perceptualLevel = Math.pow(smoothedLevel.value, 0.48);
  const targetIntensity = Math.max(0.32, 0.3 + perceptualLevel * 1.05);
  const microVariation = Math.sin(frameCounter.value * 0.12 + index) * 0.018;
  const finalIntensity = targetIntensity * (1 + microVariation);

  height.value = getWaveHeight(index, finalIntensity);
  opacity.value = 0.66 + perceptualLevel * 0.3;
  scale.value = 1 + perceptualLevel * 0.055;
};

type WaveformProps = {
  isAnimating: boolean;
  color?: string;
  audioLevel?: number;
  inputLevel?: SharedValue<number>;
  liveMetering?: boolean;
};

type WaveformBarProps = {
  index: number;
  isAnimating: boolean;
  color: string;
  inputLevel: SharedValue<number>;
  hasAudioData: SharedValue<boolean>;
  liveMetering: boolean;
};

const WaveformBar = memo(
  ({ index, isAnimating, color, inputLevel, hasAudioData, liveMetering }: WaveformBarProps) => {
    const height = useSharedValue(getWaveHeight(index, 0.3));
    const opacity = useSharedValue(0.6);
    const scale = useSharedValue(1);

    const smoothedLevel = useSharedValue(0);
    const barSensitivity = useSharedValue(getBarSensitivity(index));
    const isActive = useSharedValue(isAnimating);
    const liveMeteringSV = useSharedValue(liveMetering ? 1 : 0);
    const frameCounter = useSharedValue(0);

    useEffect(() => {
      isActive.value = isAnimating;
    }, [isAnimating, isActive]);

    useEffect(() => {
      liveMeteringSV.value = liveMetering ? 1 : 0;
    }, [liveMetering, liveMeteringSV]);

    const frameCallback = useFrameCallback(() => {
      'worklet';
      if (!liveMeteringSV.value || !isActive.value || !hasAudioData.value) {
        return;
      }

      applyMeteringToBar(
        index,
        inputLevel.value,
        barSensitivity.value,
        smoothedLevel,
        frameCounter,
        height,
        opacity,
        scale,
        true,
      );
    });

    useEffect(() => {
      frameCallback.setActive(isAnimating && liveMetering);
    }, [isAnimating, liveMetering, frameCallback]);

    useAnimatedReaction(
      () => {
        return { level: inputLevel.value, active: isActive.value, hasAudio: hasAudioData.value };
      },
      (current) => {
        if (liveMeteringSV.value || !current.active || !current.hasAudio) {
          return;
        }

        applyMeteringToBar(
          index,
          current.level,
          barSensitivity.value,
          smoothedLevel,
          frameCounter,
          height,
          opacity,
          scale,
          false,
        );
      },
      [
        inputLevel,
        isActive,
        hasAudioData,
        smoothedLevel,
        frameCounter,
        barSensitivity,
        liveMeteringSV,
        index,
      ],
    );

    useEffect(() => {
      if (isAnimating && (hasAudioData.value || liveMetering)) {
        cancelAnimation(height);
        cancelAnimation(opacity);
        cancelAnimation(scale);
        return;
      }

      if (isAnimating) {
        const delay = getBarDelay(index);

        height.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(getWaveHeight(index, 1.2), {
                duration: 350,
                easing: Easing.out(Easing.sin),
              }),
              withTiming(getWaveHeight(index, 0.6), {
                duration: 400,
                easing: Easing.inOut(Easing.sin),
              }),
              withTiming(getWaveHeight(index, 0.95), {
                duration: 380,
                easing: Easing.inOut(Easing.sin),
              }),
              withTiming(getWaveHeight(index, 0.4), {
                duration: 420,
                easing: Easing.in(Easing.sin),
              }),
            ),
            -1,
            false,
          ),
        );

        opacity.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(1, { duration: 350, easing: Easing.inOut(Easing.ease) }),
              withTiming(0.7, { duration: 400, easing: Easing.inOut(Easing.ease) }),
              withTiming(0.85, { duration: 380, easing: Easing.inOut(Easing.ease) }),
              withTiming(0.6, { duration: 420, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
          ),
        );

        scale.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(1.06, { duration: 350, easing: Easing.out(Easing.quad) }),
              withTiming(0.98, { duration: 400, easing: Easing.inOut(Easing.quad) }),
              withTiming(1.03, { duration: 380, easing: Easing.inOut(Easing.quad) }),
              withTiming(1, { duration: 420, easing: Easing.in(Easing.quad) }),
            ),
            -1,
            false,
          ),
        );
        return;
      }

      smoothedLevel.value = 0;

      height.value = withTiming(getWaveHeight(index, 0.3), {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      });
      opacity.value = withTiming(0.5, {
        duration: 300,
        easing: Easing.out(Easing.quad),
      });
      scale.value = withTiming(1, {
        duration: 200,
      });
    }, [isAnimating, liveMetering, hasAudioData, height, opacity, scale, index, smoothedLevel]);

    const animatedStyle = useAnimatedStyle(() => ({
      height: height.value,
      opacity: opacity.value,
      transform: [{ scaleX: scale.value }],
    }));

    return (
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: color,
            marginHorizontal: BAR_GAP / 2,
            width: BAR_WIDTH,
          },
          animatedStyle,
        ]}
      />
    );
  },
);

export const Waveform = memo(
  ({
    isAnimating,
    color = 'rgba(255,255,255,0.7)',
    audioLevel,
    inputLevel: externalInputLevel,
    liveMetering = false,
  }: WaveformProps) => {
    const internalInputLevel = useSharedValue(audioLevel ?? 0);
    const inputLevel = externalInputLevel ?? internalInputLevel;
    const hasAudioData = useSharedValue(
      liveMetering || externalInputLevel !== undefined || audioLevel !== undefined,
    );

    useEffect(() => {
      if (externalInputLevel) {
        hasAudioData.value = liveMetering || audioLevel !== undefined;
        return;
      }

      if (audioLevel !== undefined) {
        internalInputLevel.value = audioLevel;
        hasAudioData.value = true;
      } else {
        hasAudioData.value = false;
      }
    }, [audioLevel, externalInputLevel, internalInputLevel, hasAudioData, liveMetering]);

    useEffect(() => {
      if (externalInputLevel) {
        hasAudioData.value = liveMetering;
      }
    }, [externalInputLevel, hasAudioData, liveMetering]);

    return (
      <View style={styles.container}>
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <WaveformBar
            key={i}
            index={i}
            isAnimating={isAnimating}
            color={color}
            inputLevel={inputLevel}
            hasAudioData={hasAudioData}
            liveMetering={liveMetering}
          />
        ))}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_MAX_HEIGHT + 8,
  },
  bar: {
    borderRadius: 2,
  },
});
