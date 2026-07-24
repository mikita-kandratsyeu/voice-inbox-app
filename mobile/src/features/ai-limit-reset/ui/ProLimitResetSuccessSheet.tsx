import { BadgeCent, Gauge } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { hapticSuccess, withAlphaHex } from '@/shared/lib';
import { AppBottomSheetContent, AppBottomSheetModal, SheetFooterButtons } from '@/shared/ui';

const ICON_SIZE = 76;

const SPARKLES = [
  { x: -40, y: 2, delay: 320, drift: -12 },
  { x: 38, y: -8, delay: 440, drift: -16 },
  { x: 4, y: 38, delay: 560, drift: -10 },
] as const;

type ProLimitResetSuccessSheetProps = {
  visible: boolean;
  onClose: () => void;
  restoredAmount: number;
  limit: number;
  alreadyApplied: boolean;
};

type SuccessPanelProps = {
  color: Colors;
  restoredAmount: number;
  limit: number;
  alreadyApplied: boolean;
  onDismiss: () => void;
};

type CreditSparkleProps = {
  x: number;
  y: number;
  delay: number;
  drift: number;
  accent: string;
};

function CreditSparkle({ x, y, delay, drift, accent }: CreditSparkleProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
        withTiming(0.55, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
    );
  }, [delay, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35, 1], [0, 1, 0.45]),
    transform: [
      { translateX: x },
      { translateY: y + interpolate(progress.value, [0, 1], [10, drift]) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [0.55, 1.08, 0.92]) },
      { rotate: `${interpolate(progress.value, [0, 1], [-8, 6])}deg` },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" className="absolute" style={style}>
      <View
        className="h-7 w-7 items-center justify-center rounded-full"
        style={{
          backgroundColor: withAlphaHex(accent, 0.14),
          borderWidth: 1,
          borderColor: withAlphaHex(accent, 0.28),
        }}
      >
        <BadgeCent size={14} color={accent} strokeWidth={2.2} />
      </View>
    </Animated.View>
  );
}

function LimitRefillHero({ color, showSparkles }: { color: Colors; showSparkles: boolean }) {
  const accent = color.accent.primary;
  const iconLift = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    iconLift.value = 0;
    glow.value = 0;

    iconLift.value = withDelay(80, withSpring(1, { damping: 11, stiffness: 210, mass: 0.82 }));
    glow.value = withDelay(
      420,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.35, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );
  }, [glow, iconLift]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(iconLift.value, [0, 1], [0, 1]),
    transform: [
      { translateY: interpolate(iconLift.value, [0, 1], [12, 0]) },
      { scale: interpolate(iconLift.value, [0, 1], [0.7, 1]) },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.1 + glow.value * 0.16,
    transform: [{ scale: 0.92 + glow.value * 0.1 }],
  }));

  return (
    <View
      className="relative mb-4 items-center justify-center"
      style={{ width: ICON_SIZE + 56, height: ICON_SIZE + 28 }}
    >
      <Animated.View
        pointerEvents="none"
        className="absolute rounded-full"
        style={[
          glowStyle,
          {
            width: ICON_SIZE + 18,
            height: ICON_SIZE + 18,
            backgroundColor: accent,
          },
        ]}
      />
      {showSparkles
        ? SPARKLES.map((sparkle, index) => (
            <CreditSparkle key={index} {...sparkle} accent={accent} />
          ))
        : null}
      <Animated.View style={iconStyle} className="items-center justify-center">
        <View
          className="items-center justify-center rounded-full"
          style={{
            width: ICON_SIZE,
            height: ICON_SIZE,
            backgroundColor: withAlphaHex(accent, 0.12),
          }}
        >
          <Gauge size={36} color={accent} strokeWidth={2} />
        </View>
      </Animated.View>
    </View>
  );
}

function ProLimitResetSuccessPanel({
  color,
  restoredAmount,
  limit,
  alreadyApplied,
  onDismiss,
}: SuccessPanelProps) {
  const { t } = useTranslation();
  const cardOpacity = useSharedValue(0);
  const cardLift = useSharedValue(18);
  const amountProgress = useSharedValue(0);

  useEffect(() => {
    cardOpacity.value = 0;
    cardLift.value = 18;
    amountProgress.value = 0;

    cardOpacity.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.cubic) });
    cardLift.value = withSpring(0, { damping: 17, stiffness: 190, mass: 0.9 });
    if (!alreadyApplied && restoredAmount > 0) {
      amountProgress.value = withDelay(380, withSpring(1, { damping: 12, stiffness: 220 }));
    }
  }, [alreadyApplied, amountProgress, cardLift, cardOpacity, restoredAmount]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardLift.value }],
  }));

  const amountStyle = useAnimatedStyle(() => ({
    opacity: amountProgress.value,
    transform: [
      { translateY: interpolate(amountProgress.value, [0, 1], [16, 0]) },
      { scale: interpolate(amountProgress.value, [0, 1], [0.86, 1]) },
    ],
  }));

  const subtitle = alreadyApplied
    ? t('settings.aiUsage.resetProLimitSuccessAlreadyApplied')
    : restoredAmount > 0
      ? t('settings.aiUsage.resetProLimitSuccess', { count: restoredAmount, limit })
      : t('settings.aiUsage.resetProLimitSuccessNoChange', { limit });

  return (
    <Animated.View style={cardStyle} className="items-center py-1">
      <LimitRefillHero color={color} showSparkles={!alreadyApplied && restoredAmount > 0} />
      <Text
        className="text-center text-xl font-bold tracking-tight"
        style={{ color: color.text.primary }}
      >
        {t('settings.aiUsage.resetProLimitSuccessTitle')}
      </Text>
      {!alreadyApplied && restoredAmount > 0 ? (
        <Animated.View
          style={[amountStyle, styles.amountWrap]}
          className="mt-3 px-5"
          accessibilityLabel={t('settings.aiUsage.resetProLimitSuccessAmountA11y', {
            count: restoredAmount,
          })}
        >
          <Text
            className="text-center font-bold"
            style={[styles.amountText, styles.tabular, { color: color.accent.primary }]}
          >
            +{restoredAmount}
          </Text>
        </Animated.View>
      ) : null}
      <Text
        className="mt-3 px-2 text-center text-[15px] leading-[22px]"
        style={{ color: color.text.secondary }}
      >
        {subtitle}
      </Text>
      <SheetFooterButtons
        className="mt-6 w-full"
        color={color}
        primaryLabel={t('settings.aiUsage.resetProLimitSuccessButton')}
        onPrimaryPress={onDismiss}
      />
    </Animated.View>
  );
}

export function ProLimitResetSuccessSheet({
  visible,
  onClose,
  restoredAmount,
  limit,
  alreadyApplied,
}: ProLimitResetSuccessSheetProps) {
  const color = useColors();
  useEffect(() => {
    if (visible) {
      hapticSuccess();
    }
  }, [visible]);

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <AppBottomSheetContent>
        <ProLimitResetSuccessPanel
          color={color}
          restoredAmount={restoredAmount}
          limit={limit}
          alreadyApplied={alreadyApplied}
          onDismiss={onClose}
        />
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  amountWrap: {
    minHeight: 52,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: 34,
    lineHeight: 46,
    paddingVertical: 2,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
