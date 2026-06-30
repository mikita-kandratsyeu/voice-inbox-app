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
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useIsMotionReduced } from '@/shared/config';

const BAR_COUNT = 32;
const BAR_MIN_HEIGHT = 8;
const BAR_MAX_HEIGHT = 58;
const BAR_WIDTH = 4;
const BAR_GAP = 3;
const LANE_HEIGHT = BAR_MAX_HEIGHT + 10;
const LIVE_INPUT_GAIN = 0.78;

const getBarSensitivity = (index: number) => {
  'worklet';
  const seed = Math.sin(index * 12.9898 + index * 78.233) * 43758.5453;
  const random = seed - Math.floor(seed);
  return 0.78 + random * 0.44;
};

const getCenterEnvelope = (index: number) => {
  'worklet';
  const center = (BAR_COUNT - 1) / 2;
  const normalizedDistance = Math.abs(index - center) / center;
  return Math.exp(-1.85 * normalizedDistance * normalizedDistance);
};

const getBarVisuals = (
  index: number,
  intensity: number,
  perceptualLevel: number,
  frameCounter: number,
) => {
  'worklet';
  const envelope = getCenterEnvelope(index);
  const ripple = Math.sin(frameCounter * 0.13 + index * 0.48) * 0.12 * perceptualLevel;
  const shimmer = Math.sin(frameCounter * 0.07 - index * 0.21) * 0.04;
  const blend = Math.min(1.28, intensity * (1 + ripple + shimmer));

  return {
    height:
      BAR_MIN_HEIGHT +
      (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT) * envelope * getBarSensitivity(index) * blend,
    opacity: 0.36 + envelope * 0.34 + perceptualLevel * 0.26,
    scaleX: 1 + perceptualLevel * 0.04,
    scaleY: 1 + perceptualLevel * 0.06,
  };
};

const applyMeteringToBar = (
  index: number,
  currentLevel: number,
  barSensitivity: number,
  smoothedLevel: SharedValue<number>,
  frameCounter: SharedValue<number>,
  height: SharedValue<number>,
  opacity: SharedValue<number>,
  scaleX: SharedValue<number>,
  scaleY: SharedValue<number>,
  liveFrame: boolean,
) => {
  'worklet';
  frameCounter.value += 1;

  const attack = liveFrame ? 0.58 : 0.9;
  const decay = liveFrame ? 0.12 : 0.4;
  const targetLevel = currentLevel * LIVE_INPUT_GAIN * barSensitivity;

  if (targetLevel > smoothedLevel.value) {
    smoothedLevel.value += (targetLevel - smoothedLevel.value) * attack;
  } else {
    smoothedLevel.value += (targetLevel - smoothedLevel.value) * decay;
  }

  const perceptualLevel = Math.pow(smoothedLevel.value, 0.38);
  const targetIntensity = Math.max(0.24, 0.16 + perceptualLevel * 1.2);
  const visuals = getBarVisuals(index, targetIntensity, perceptualLevel, frameCounter.value);

  height.value = visuals.height;
  opacity.value = visuals.opacity;
  scaleX.value = visuals.scaleX;
  scaleY.value = visuals.scaleY;
};

const applyIdleWaveToBar = (
  index: number,
  phase: number,
  height: SharedValue<number>,
  opacity: SharedValue<number>,
  scaleX: SharedValue<number>,
  scaleY: SharedValue<number>,
) => {
  'worklet';
  const envelope = getCenterEnvelope(index);
  const primary = 0.5 + 0.5 * Math.sin(phase + index * 0.36);
  const secondary = 0.5 + 0.5 * Math.sin(phase * 0.62 - index * 0.24);
  const blend = primary * 0.68 + secondary * 0.32;
  const intensity = 0.3 + blend * 0.62;
  const perceptual = blend * 0.4;

  height.value =
    BAR_MIN_HEIGHT +
    (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT) * envelope * getBarSensitivity(index) * intensity;
  opacity.value = 0.34 + envelope * 0.28 + perceptual * 0.18;
  scaleX.value = 1;
  scaleY.value = 1 + blend * 0.05;
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
  idlePhase: SharedValue<number>;
  motionReduced: boolean;
};

const WaveformBar = memo(
  ({
    index,
    isAnimating,
    color,
    inputLevel,
    hasAudioData,
    liveMetering,
    idlePhase,
    motionReduced,
  }: WaveformBarProps) => {
    const height = useSharedValue(BAR_MIN_HEIGHT);
    const opacity = useSharedValue(0.45);
    const scaleX = useSharedValue(1);
    const scaleY = useSharedValue(1);

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
        scaleX,
        scaleY,
        true,
      );
    });

    useEffect(() => {
      frameCallback.setActive(isAnimating && liveMetering);
    }, [isAnimating, liveMetering, frameCallback]);

    useEffect(() => {
      return () => {
        frameCallback.setActive(false);
      };
    }, [frameCallback]);

    useAnimatedReaction(
      () => ({
        level: inputLevel.value,
        active: isActive.value,
        hasAudio: hasAudioData.value,
        live: liveMeteringSV.value,
      }),
      (current) => {
        if (current.live || !current.active || !current.hasAudio) {
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
          scaleX,
          scaleY,
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

    useAnimatedReaction(
      () => ({
        phase: idlePhase.value,
        active: isActive.value,
        live: liveMeteringSV.value,
        hasAudio: hasAudioData.value,
      }),
      (current) => {
        if (!current.active || current.live || current.hasAudio) {
          return;
        }

        applyIdleWaveToBar(index, current.phase, height, opacity, scaleX, scaleY);
      },
      [idlePhase, isActive, liveMeteringSV, hasAudioData, index],
    );

    useEffect(() => {
      if (isAnimating && (hasAudioData.value || liveMetering)) {
        cancelAnimation(height);
        cancelAnimation(opacity);
        cancelAnimation(scaleX);
        cancelAnimation(scaleY);
        return;
      }

      if (!isAnimating || motionReduced) {
        smoothedLevel.value = 0;
        height.value = withTiming(BAR_MIN_HEIGHT + 4, {
          duration: 380,
          easing: Easing.out(Easing.cubic),
        });
        opacity.value = withTiming(0.38, {
          duration: 280,
          easing: Easing.out(Easing.quad),
        });
        scaleX.value = withTiming(1, { duration: 200 });
        scaleY.value = withTiming(1, { duration: 200 });
      }
    }, [
      hasAudioData,
      height,
      isAnimating,
      liveMetering,
      motionReduced,
      opacity,
      scaleX,
      scaleY,
      smoothedLevel,
    ]);

    const animatedStyle = useAnimatedStyle(() => ({
      height: height.value,
      opacity: opacity.value,
      transform: [{ scaleX: scaleX.value }, { scaleY: scaleY.value }],
    }));

    return (
      <View style={styles.barLane}>
        <Animated.View
          style={[
            styles.bar,
            {
              backgroundColor: color,
              width: BAR_WIDTH,
              borderRadius: BAR_WIDTH / 2,
            },
            animatedStyle,
          ]}
        />
      </View>
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
    const motionReduced = useIsMotionReduced();
    const internalInputLevel = useSharedValue(audioLevel ?? 0);
    const inputLevel = externalInputLevel ?? internalInputLevel;
    const idlePhase = useSharedValue(0);
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

    useEffect(() => {
      const shouldBreathe = isAnimating && !liveMetering && !hasAudioData.value && !motionReduced;

      if (!shouldBreathe) {
        cancelAnimation(idlePhase);
        idlePhase.value = 0;
        return;
      }

      idlePhase.value = withRepeat(
        withTiming(Math.PI * 2, { duration: 2600, easing: Easing.linear }),
        -1,
        false,
      );
    }, [hasAudioData, idlePhase, isAnimating, liveMetering, motionReduced]);

    return (
      <View style={styles.container}>
        {Array.from({ length: BAR_COUNT }).map((_, index) => (
          <WaveformBar
            key={index}
            index={index}
            isAnimating={isAnimating}
            color={color}
            inputLevel={inputLevel}
            hasAudioData={hasAudioData}
            liveMetering={liveMetering}
            idlePhase={idlePhase}
            motionReduced={motionReduced}
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
    height: LANE_HEIGHT,
  },
  barLane: {
    height: LANE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: BAR_GAP / 2,
  },
  bar: {
    minHeight: BAR_MIN_HEIGHT,
  },
});
