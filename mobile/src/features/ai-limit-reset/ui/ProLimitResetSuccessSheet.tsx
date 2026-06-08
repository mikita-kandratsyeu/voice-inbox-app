import { BottomSheetView } from '@gorhom/bottom-sheet';
import { CheckCircle2 } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Colors } from '@/shared/config';
import { useColors } from '@/shared/config';
import { hapticSuccess } from '@/shared/lib';
import { AppBottomSheetModal, SheetFooterButtons, useBottomSheetContentPadding } from '@/shared/ui';

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

function ProLimitResetSuccessPanel({
  color,
  restoredAmount,
  limit,
  alreadyApplied,
  onDismiss,
}: SuccessPanelProps) {
  const { t } = useTranslation();
  const cardScale = useSharedValue(0.88);
  const cardOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const shine = useSharedValue(0);
  const amountScale = useSharedValue(0);

  useEffect(() => {
    cardScale.value = 0.88;
    cardOpacity.value = 0;
    iconScale.value = 0;
    shine.value = 0;
    amountScale.value = 0;

    cardOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    cardScale.value = withSpring(1, { damping: 16, stiffness: 220, mass: 0.85 });
    iconScale.value = withDelay(120, withSpring(1, { damping: 12, stiffness: 260 }));
    shine.value = withDelay(
      280,
      withSequence(
        withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 280 }),
      ),
    );
    if (!alreadyApplied && restoredAmount > 0) {
      amountScale.value = withDelay(200, withSpring(1, { damping: 13, stiffness: 240 }));
    }
  }, [alreadyApplied, amountScale, cardOpacity, cardScale, iconScale, restoredAmount, shine]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const shineStyle = useAnimatedStyle(() => ({
    opacity: shine.value * 0.35,
  }));

  const amountStyle = useAnimatedStyle(() => ({
    opacity: amountScale.value,
    transform: [{ scale: 0.84 + amountScale.value * 0.16 }],
  }));

  const subtitle =
    alreadyApplied
      ? t('settings.aiUsage.resetProLimitSuccessAlreadyApplied')
      : restoredAmount > 0
        ? t('settings.aiUsage.resetProLimitSuccess', {
            count: restoredAmount,
            limit,
          })
        : t('settings.aiUsage.resetProLimitSuccessNoChange', { limit });

  return (
    <Animated.View style={cardStyle} className="items-center py-1">
      <View className="relative mb-4 items-center justify-center">
        <Animated.View
          pointerEvents="none"
          className="absolute h-28 w-28 rounded-full"
          style={[shineStyle, { backgroundColor: color.accent.success }]}
        />
        <Animated.View style={iconStyle}>
          <View
            className="h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: `${color.accent.success}22` }}
          >
            <CheckCircle2 size={44} color={color.accent.success} strokeWidth={2.2} />
          </View>
        </Animated.View>
      </View>
      <Text
        className="text-center text-xl font-bold tracking-tight"
        style={{ color: color.text.primary }}
      >
        {t('settings.aiUsage.resetProLimitSuccessTitle')}
      </Text>
      {!alreadyApplied && restoredAmount > 0 ? (
        <Animated.View
          style={amountStyle}
          className="mt-4 rounded-full px-4 py-2"
          accessibilityLabel={t('settings.aiUsage.resetProLimitSuccessAmountA11y', {
            count: restoredAmount,
          })}
        >
          <Text
            className="text-center text-2xl font-bold"
            style={[styles.tabular, { color: color.accent.success }]}
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
  const contentPadding = useBottomSheetContentPadding(20);

  useEffect(() => {
    if (visible) {
      hapticSuccess();
    }
  }, [visible]);

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <BottomSheetView className="px-5 pt-1" style={contentPadding}>
        <ProLimitResetSuccessPanel
          color={color}
          restoredAmount={restoredAmount}
          limit={limit}
          alreadyApplied={alreadyApplied}
          onDismiss={onClose}
        />
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  tabular: {
    fontVariant: ['tabular-nums'],
  },
});
