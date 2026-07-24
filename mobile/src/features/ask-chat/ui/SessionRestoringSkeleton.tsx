import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

import type { Colors } from '@/shared/config';

type SessionRestoringSkeletonProps = { color: Colors };
export const SessionRestoringSkeleton = ({ color }: SessionRestoringSkeletonProps) => {
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.72,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [pulse]);

  return (
    <Animated.View className="gap-4 pb-4 pt-1" style={{ opacity: pulse }}>
      <View
        className="rounded-xl px-3 py-2"
        style={{
          backgroundColor: color.background.tertiary,
          borderWidth: 1,
          borderColor: color.border.default,
        }}
      >
        <View
          className="h-4 rounded-md"
          style={{ width: '62%', backgroundColor: color.border.default }}
        />
      </View>
      {[0, 1].map((idx) => (
        <View key={idx} className="gap-2 pb-4">
          <View
            className="h-4 rounded-md"
            style={{ width: '28%', backgroundColor: color.border.default }}
          />
          <View
            className="h-4 rounded-md"
            style={{ width: '92%', backgroundColor: color.border.default }}
          />
          <View
            className="h-4 rounded-md"
            style={{ width: '84%', backgroundColor: color.border.default }}
          />
          {idx === 0 ? (
            <View
              className="mt-3"
              style={{
                borderBottomWidth: 1,
                borderBottomColor: color.border.default,
              }}
            />
          ) : null}
        </View>
      ))}
    </Animated.View>
  );
};
