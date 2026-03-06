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
};

export const Waveform = ({ isAnimating, color = 'rgba(255,255,255,0.7)' }: WaveformProps) => {
  const bars = useRef<Animated.Value[]>(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(randomHeight())),
  ).current;

  const loops = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
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
  }, [isAnimating, bars]);

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
