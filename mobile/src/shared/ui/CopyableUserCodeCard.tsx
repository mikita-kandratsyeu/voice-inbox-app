import Clipboard from '@react-native-clipboard/clipboard';
import { Check } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, ToastAndroid, View } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { hapticLight, hapticSuccess, IS_ANDROID } from '@/shared/lib';

const COPY_PRESS_IN_MS = 70;
const COPY_SPRING_DAMPING = 14;
const COPY_SPRING_STIFFNESS = 280;
const COPY_OK_ICON_MS = 900;

export type CopyableUserCodeCardProps = {
  userCode: string;
  color: Colors;
  hint: string;
  copyLabel: string;
  copiedLabel: string;
  copyAccessibilityLabel: string;
  externalCopySignal?: number;
  variant?: 'userCode' | 'link';
  disabled?: boolean;
};

export function CopyableUserCodeCard({
  userCode,
  color,
  hint,
  copyLabel,
  copiedLabel,
  copyAccessibilityLabel,
  externalCopySignal = 0,
  variant = 'userCode',
  disabled = false,
}: CopyableUserCodeCardProps) {
  const scale = useSharedValue(1);
  const [copied, setCopied] = useState(false);
  const resetCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetCopiedTimerRef.current) clearTimeout(resetCopiedTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    setCopied(false);
  }, [userCode]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const copyWithFeedback = useCallback(
    (options: { haptic: 'success' | 'light'; toast: boolean }) => {
      if (disabled || !userCode.trim()) return;
      Clipboard.setString(userCode);
      if (options.haptic === 'light') {
        hapticLight();
      } else {
        hapticSuccess();
      }
      scale.value = withSequence(
        withTiming(0.94, {
          duration: COPY_PRESS_IN_MS,
          easing: Easing.out(Easing.quad),
        }),
        withSpring(1, { damping: COPY_SPRING_DAMPING, stiffness: COPY_SPRING_STIFFNESS }),
      );
      setCopied(true);
      if (resetCopiedTimerRef.current) clearTimeout(resetCopiedTimerRef.current);
      resetCopiedTimerRef.current = setTimeout(() => setCopied(false), COPY_OK_ICON_MS);
      if (options.toast && IS_ANDROID) {
        ToastAndroid.show(copiedLabel, ToastAndroid.SHORT);
      }
    },
    [copiedLabel, disabled, scale, userCode],
  );

  useEffect(() => {
    if (externalCopySignal <= 0) return;
    copyWithFeedback({ haptic: 'light', toast: false });
  }, [copyWithFeedback, externalCopySignal]);

  const handlePress = useCallback(() => {
    copyWithFeedback({ haptic: 'success', toast: true });
  }, [copyWithFeedback]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || !userCode.trim()}
      accessibilityRole="button"
      accessibilityLabel={copyAccessibilityLabel}
      accessibilityState={{ disabled: disabled || !userCode.trim() }}
      className="items-center rounded-2xl px-4 py-5"
      style={{
        backgroundColor: color.background.secondary,
        borderWidth: 1,
        borderColor: color.border.default,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Reanimated.View className="w-full items-center" style={cardAnimStyle}>
        <Text
          className="text-xs font-medium tracking-wide uppercase"
          style={{ color: color.text.secondary }}
        >
          {hint}
        </Text>
        <Text
          selectable={variant === 'link'}
          numberOfLines={variant === 'link' ? 3 : undefined}
          className={
            variant === 'link'
              ? 'mt-2 px-1 text-center text-xl font-medium'
              : 'mt-2 text-3xl font-bold tracking-[0.2em]'
          }
          style={{ color: color.text.primary }}
        >
          {userCode}
        </Text>
        <View className="mt-2 min-h-4 flex-row items-center justify-center gap-1.5">
          {copied ? (
            <>
              <Check size={14} color={color.accent.primary} strokeWidth={2.5} />
              <Text className="text-xs font-medium" style={{ color: color.accent.primary }}>
                {copiedLabel}
              </Text>
            </>
          ) : (
            <Text className="text-xs" style={{ color: color.accent.primary }}>
              {copyLabel}
            </Text>
          )}
        </View>
      </Reanimated.View>
    </Pressable>
  );
}
