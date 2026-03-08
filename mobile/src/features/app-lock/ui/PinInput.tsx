import { Delete } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';

import { PIN_LENGTH } from '@/entities/app-lock';
import type { Colors } from '@/shared/config';

type PinInputProps = {
  pin: string;
  color: Colors;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  error?: boolean;
  success?: boolean;
  onSuccessAnimationComplete?: () => void;
  bottomLeftSlot?: React.ReactNode;
};

const ROWS: (string | 'back' | '')[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'back'],
];

const SUCCESS_ANIM_DURATION = 100;

const getDotColor = (filled: boolean, error: boolean, success: boolean, color: Colors): string => {
  if (success) {
    return color.accent.success;
  }

  if (filled) {
    return error ? color.accent.delete : color.accent.success;
  }

  return 'transparent';
};

const getBorderColor = (
  filled: boolean,
  error: boolean,
  success: boolean,
  color: Colors,
): string => {
  if (success) {
    return color.accent.success;
  }

  if (error) {
    return color.accent.delete;
  }

  if (filled) {
    return color.accent.success;
  }

  return color.border.default;
};

const AnimatedDot = ({
  filled,
  error,
  success,
  color,
}: {
  filled: boolean;
  error: boolean;
  success: boolean;
  color: Colors;
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (success) {
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.2,
          useNativeDriver: true,
          speed: 14,
          bounciness: 6,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 14,
          bounciness: 6,
        }),
      ]).start();
    } else if (filled) {
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.3,
          useNativeDriver: true,
          speed: 12,
          bounciness: 8,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 8,
        }),
      ]).start();
    } else {
      scale.setValue(1);
    }
  }, [filled, success, scale]);

  const dotColor = getDotColor(filled, error, success, color);
  const borderColor = getBorderColor(filled, error, success, color);

  return (
    <Animated.View
      className="h-4 w-4 rounded-full"
      style={{
        backgroundColor: dotColor,
        borderWidth: 2,
        borderColor,
        transform: [{ scale }],
      }}
    />
  );
};

export const PinInput = ({
  pin,
  color,
  onDigit,
  onBackspace,
  error = false,
  success = false,
  onSuccessAnimationComplete,
  bottomLeftSlot,
}: PinInputProps) => {
  const dots = Array.from({ length: PIN_LENGTH }, (_, i) => i < pin.length || success);

  useEffect(() => {
    if (success && onSuccessAnimationComplete) {
      const timer = setTimeout(onSuccessAnimationComplete, SUCCESS_ANIM_DURATION);
      return () => clearTimeout(timer);
    }
  }, [success, onSuccessAnimationComplete]);

  return (
    <View className="items-center">
      <View className="mb-8 flex-row gap-3">
        {dots.map((filled, i) => (
          <AnimatedDot key={i} filled={filled} error={error} success={success} color={color} />
        ))}
      </View>

      <View className="gap-y-5" pointerEvents={success ? 'none' : 'auto'}>
        {ROWS.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row justify-center gap-x-10">
            {row.map((key) => {
              if (key === '') {
                return (
                  <View key="spacer" className="h-16 w-16 items-center justify-center">
                    {bottomLeftSlot}
                  </View>
                );
              }
              if (key === 'back') {
                return (
                  <TouchableOpacity
                    key="back"
                    className="h-16 w-16 items-center justify-center rounded-full"
                    style={{ backgroundColor: color.background.tertiary }}
                    onPress={onBackspace}
                    activeOpacity={0.7}
                  >
                    <Delete size={28} color={color.text.primary} strokeWidth={2} />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={key}
                  className="h-16 w-16 items-center justify-center rounded-full"
                  style={{ backgroundColor: color.background.tertiary }}
                  onPress={() => onDigit(key)}
                  activeOpacity={0.7}
                >
                  <Text className="text-3xl font-semibold" style={{ color: color.text.primary }}>
                    {key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};
