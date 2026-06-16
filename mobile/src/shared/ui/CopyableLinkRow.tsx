import Clipboard from '@react-native-clipboard/clipboard';
import { Check, Copy } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { hapticLight } from '@/shared/lib';

const COPY_PRESS_IN_MS = 70;
const COPY_SPRING_DAMPING = 14;
const COPY_SPRING_STIFFNESS = 420;
const COPY_OK_ICON_MS = 1600;

type CopyableLinkRowProps = {
  value: string;
  color: Colors;
  label?: string;
  copyAccessibilityLabel: string;
  copiedAccessibilityLabel: string;
  disabled?: boolean;
};

export function CopyableLinkRow({
  value,
  color,
  label,
  copyAccessibilityLabel,
  copiedAccessibilityLabel,
  disabled = false,
}: CopyableLinkRowProps) {
  const scale = useSharedValue(1);
  const [copied, setCopied] = useState(false);
  const resetCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trimmed = value.trim();
  const isDisabled = disabled || !trimmed;

  useEffect(
    () => () => {
      if (resetCopiedTimerRef.current) clearTimeout(resetCopiedTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    setCopied(false);
  }, [value]);

  const chipAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleCopy = useCallback(() => {
    if (!trimmed) return;
    Clipboard.setString(trimmed);
    hapticLight();
    scale.value = withSequence(
      withTiming(0.88, { duration: COPY_PRESS_IN_MS, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: COPY_SPRING_DAMPING, stiffness: COPY_SPRING_STIFFNESS }),
    );
    setCopied(true);
    if (resetCopiedTimerRef.current) clearTimeout(resetCopiedTimerRef.current);
    resetCopiedTimerRef.current = setTimeout(() => setCopied(false), COPY_OK_ICON_MS);
  }, [scale, trimmed]);

  const iconColor = copied ? color.accent.primary : color.text.secondary;

  return (
    <View style={{ gap: 8 }}>
      {label ? (
        <Text className="text-[13px] font-semibold" style={{ color: color.text.secondary }}>
          {label}
        </Text>
      ) : null}
      <View
        className="min-h-[48px] flex-row items-center rounded-xl border pr-1"
        style={{
          borderColor: color.border.default,
          backgroundColor: color.background.card,
          opacity: isDisabled ? 0.55 : 1,
        }}
      >
        <Text
          selectable
          numberOfLines={2}
          className="min-h-[48px] flex-1 px-4 py-3 text-[14px] leading-5"
          style={{
            color: color.text.primary,
            fontVariant: ['tabular-nums'],
          }}
        >
          {trimmed}
        </Text>
        <TouchableOpacity
          onPress={handleCopy}
          disabled={isDisabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={copied ? copiedAccessibilityLabel : copyAccessibilityLabel}
          accessibilityState={{ disabled: isDisabled }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="h-10 w-10 items-center justify-center rounded-lg"
        >
          <Animated.View className="items-center justify-center" style={chipAnimStyle}>
            {copied ? (
              <Check size={18} color={iconColor} strokeWidth={2.5} />
            ) : (
              <Copy size={18} color={iconColor} strokeWidth={2} />
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
