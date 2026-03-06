import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const BAR_COUNT = 32;
const BAR_MIN_HEIGHT = 6;
const BAR_MAX_HEIGHT = 56;
const BAR_WIDTH = 3;
const BAR_GAP = 4;

const randomHeight = () => BAR_MIN_HEIGHT + Math.random() * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT);

type WaveformProps = {
  isAnimating: boolean;
  color?: string;
  /** Value in dB from metering (typically -160 to 0). When provided, drives real waveform. */
  meterLevel?: number;
};

/**
 * Converts a dB meter value (−160..0) to a bar height in [BAR_MIN_HEIGHT, BAR_MAX_HEIGHT].
 * Values below -60 dB map to near-silence; 0 dB maps to max height.
 */
const meterToHeight = (db: number): number => {
  const clamped = Math.max(-60, Math.min(0, db));
  const normalized = (clamped + 60) / 60; // 0..1
  return BAR_MIN_HEIGHT + normalized * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT);
};

export const Waveform = ({
  isAnimating,
  color = 'rgba(255,255,255,0.7)',
  meterLevel,
}: WaveformProps) => {
  const bars = useRef<Animated.Value[]>(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(randomHeight())),
  ).current;

  const loops = useRef<Animated.CompositeAnimation[]>([]);
  const historyRef = useRef<number[]>(Array(BAR_COUNT).fill(BAR_MIN_HEIGHT));

  // Drive bars from real meter data when available
  useEffect(() => {
    if (!isAnimating || meterLevel === undefined) return;

    const targetHeight = meterToHeight(meterLevel);

    // Shift history buffer and append the new sample
    historyRef.current = [...historyRef.current.slice(1), targetHeight];

    historyRef.current.forEach((h, i) => {
      Animated.spring(bars[i], {
        toValue: h,
        useNativeDriver: false,
        speed: 40,
        bounciness: 2,
      }).start();
    });
  }, [meterLevel, isAnimating, bars]);

  // Fallback synthetic animation when no meter data
  useEffect(() => {
    if (meterLevel !== undefined) return; // real meter drives bars

    if (isAnimating) {
      loops.current = bars.map((bar, i) => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.delay(i * 30),
            Animated.spring(bar, {
              toValue: randomHeight(),
              useNativeDriver: false,
              speed: 2 + Math.random() * 3,
              bounciness: 4,
            }),
            Animated.spring(bar, {
              toValue: randomHeight(),
              useNativeDriver: false,
              speed: 2 + Math.random() * 3,
              bounciness: 4,
            }),
          ]),
        );
        loop.start();
        return loop;
      });
    } else {
      loops.current.forEach((l) => l.stop());
      bars.forEach((bar) =>
        Animated.spring(bar, {
          toValue: BAR_MIN_HEIGHT + 4,
          useNativeDriver: false,
          speed: 10,
          bounciness: 2,
        }).start(),
      );
    }

    return () => {
      loops.current.forEach((l) => l.stop());
    };
  }, [isAnimating, meterLevel, bars]);

  return (
    <View style={styles.container}>
      {bars.map((height, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              height,
              backgroundColor: color,
              marginHorizontal: BAR_GAP / 2,
              width: BAR_WIDTH,
            },
          ]}
        />
      ))}
    </View>
  );
};

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
