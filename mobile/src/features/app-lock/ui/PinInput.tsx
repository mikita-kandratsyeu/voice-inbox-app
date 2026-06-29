import { Delete } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { DEFAULT_PIN_LENGTH } from '@/entities/app-lock';
import type { Colors } from '@/shared/config';
import { hapticPinError, hapticPinKey, hapticPinSuccess, hapticSelection } from '@/shared/lib';

type PinInputProps = {
  bottomLeftSlot?: React.ReactNode;
  color: Colors;
  disabled?: boolean;
  error?: boolean;
  isLockScreen?: boolean;
  onBackspace: () => void;
  onDigit: (digit: string) => void;
  onSuccessAnimationComplete?: () => void;
  pin: string;
  pinLength?: number;
  success?: boolean;
};

const ROWS: (string | 'back' | '')[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'back'],
];

const SUCCESS_ANIM_DURATION = 220;

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
  const scale = useSharedValue(1);

  useEffect(() => {
    if (success) {
      scale.value = withSequence(
        withSpring(1.2, { damping: 12, stiffness: 200 }),
        withSpring(1, { damping: 12, stiffness: 200 }),
      );
    } else if (filled) {
      scale.value = withSequence(
        withSpring(1.3, { damping: 10, stiffness: 180 }),
        withSpring(1, { damping: 10, stiffness: 180 }),
      );
    } else {
      scale.value = 1;
    }
  }, [filled, scale, success]);

  const dotColor = getDotColor(filled, error, success, color);
  const borderColor = getBorderColor(filled, error, success, color);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      className="h-4 w-4 rounded-full"
      style={[
        {
          backgroundColor: dotColor,
          borderWidth: 2,
          borderColor,
        },
        animatedStyle,
      ]}
    />
  );
};

export const PinInput = ({
  bottomLeftSlot,
  color,
  disabled = false,
  error = false,
  isLockScreen = false,
  onBackspace,
  onDigit,
  onSuccessAnimationComplete,
  pin,
  pinLength = DEFAULT_PIN_LENGTH,
  success = false,
}: PinInputProps) => {
  const { t } = useTranslation();
  const dots = Array.from({ length: pinLength }, (_, i) => i < pin.length || success);
  const keypadLocked = success || disabled;
  const keypadTap = isLockScreen ? hapticPinKey : hapticSelection;

  useEffect(() => {
    if (success) {
      hapticPinSuccess();
    } else if (error) {
      hapticPinError();
    }
  }, [success, error]);

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

      <View className="gap-y-5" pointerEvents={keypadLocked ? 'none' : 'auto'}>
        {ROWS.map((row, rowIndex) => (
          <View key={rowIndex} className="flex-row justify-center gap-x-10">
            {row.map((key) => {
              if (key === '') {
                return (
                  <View
                    key="spacer"
                    className={`h-16 w-16 items-center justify-center ${isLockScreen ? 'h-20 w-20' : ''}`}
                  >
                    {bottomLeftSlot}
                  </View>
                );
              }
              if (key === 'back') {
                return (
                  <TouchableOpacity
                    key="back"
                    className={`h-16 w-16 items-center justify-center rounded-full ${isLockScreen ? 'h-20 w-20' : ''}`}
                    style={{
                      backgroundColor: color.background.tertiary,
                      opacity: keypadLocked ? 0.45 : 1,
                    }}
                    onPress={() => {
                      keypadTap();
                      onBackspace();
                    }}
                    activeOpacity={0.7}
                    disabled={keypadLocked}
                    accessibilityRole="button"
                    accessibilityLabel={t('appLock.backspace')}
                    accessibilityState={{ disabled: keypadLocked }}
                  >
                    <Delete size={28} color={color.text.primary} strokeWidth={2} />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={key}
                  className={`h-16 w-16 items-center justify-center rounded-full ${isLockScreen ? 'h-20 w-20' : ''}`}
                  style={{
                    backgroundColor: color.background.tertiary,
                    opacity: keypadLocked ? 0.45 : 1,
                  }}
                  onPress={() => {
                    keypadTap();
                    onDigit(key);
                  }}
                  activeOpacity={0.7}
                  disabled={keypadLocked}
                  accessibilityRole="button"
                  accessibilityLabel={key}
                  accessibilityState={{ disabled: keypadLocked }}
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
