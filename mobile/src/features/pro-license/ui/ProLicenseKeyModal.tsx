import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { CheckCircle2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Colors } from '@/shared/config';
import { getColors, useAppTheme } from '@/shared/config';
import { hapticSuccess, modalKeyboardBehavior } from '@/shared/lib';
import { redeemProLicenseKey } from '@/shared/lib/ai-api/aiApi';

import { setProExpiresAtMsSync } from '../lib/proEntitlementStorage';
import { proLicenseMessageForRedeemError } from '../lib/redeemErrorMessage';

type ProLicenseKeyModalProps = {
  visible: boolean;
  onClose: () => void;
  onActivated: () => void;
};

function formatExpiryDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) {
    return '';
  }
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

type SuccessPanelProps = {
  color: Colors;
  expiresAtIso: string;
  onDismiss: () => void;
};

function ProActivationSuccessPanel({ color, expiresAtIso, onDismiss }: SuccessPanelProps) {
  const { t, i18n } = useTranslation();
  const cardScale = useSharedValue(0.88);
  const cardOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const shine = useSharedValue(0);

  useEffect(() => {
    cardScale.value = 0.88;
    cardOpacity.value = 0;
    iconScale.value = 0;
    shine.value = 0;

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
  }, [cardOpacity, cardScale, iconScale, shine]);

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

  const dateText = formatExpiryDate(expiresAtIso, i18n.language);

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
        {t('proLicense.successTitle')}
      </Text>
      <Text
        className="mt-2 text-center text-[15px] leading-[22px]"
        style={{ color: color.text.secondary }}
      >
        {t('proLicense.successSubtitle')}
      </Text>
      {dateText.length > 0 && (
        <Text
          className="mt-3 text-center text-sm font-medium"
          style={{ color: color.text.primary }}
        >
          {t('proLicense.successUntil', { date: dateText })}
        </Text>
      )}
      <Pressable
        onPress={onDismiss}
        className="mt-6 w-full rounded-xl py-3.5"
        style={{ backgroundColor: color.accent.primary }}
      >
        <Text className="text-center text-base font-semibold" style={{ color: '#ffffff' }}>
          {t('proLicense.successButton')}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function ProLicenseKeyModal({ visible, onClose, onActivated }: ProLicenseKeyModalProps) {
  const { t } = useTranslation();
  const color = getColors(useAppTheme());
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [keyText, setKeyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'form' | 'success'>('form');
  const [successExpiresAt, setSuccessExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setPhase('form');
      setKeyText('');
      setError(null);
      setSuccessExpiresAt(null);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
    } else {
      bottomSheetRef.current?.dismiss();
    }
  }, [visible]);

  const finishSuccess = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSheetDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleClose = useCallback(() => {
    if (busy) {
      return;
    }
    if (phase === 'success') {
      finishSuccess();
      return;
    }
    onClose();
  }, [busy, phase, finishSuccess, onClose]);

  const handleSubmit = useCallback(async () => {
    const trimmed = keyText.trim();
    if (!trimmed || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await redeemProLicenseKey(trimmed);
    setBusy(false);
    if (result.ok) {
      const ms = new Date(result.expiresAt).getTime();
      if (Number.isFinite(ms)) {
        setProExpiresAtMsSync(ms);
      }
      setKeyText('');
      onActivated();
      hapticSuccess();
      setSuccessExpiresAt(result.expiresAt);
      setPhase('success');
      return;
    }
    setError(proLicenseMessageForRedeemError(t, result));
  }, [keyText, busy, onActivated, t]);

  const showActivatingOverlay = busy && phase !== 'success';

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior={busy ? 'none' : 'close'} opacity={0.45} />
    ),
    [busy],
  );

  const canDismissByGesture = !busy;

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      enableDynamicSizing
      enablePanDownToClose={canDismissByGesture}
      enableOverDrag={false}
      keyboardBehavior={modalKeyboardBehavior}
      keyboardBlurBehavior="restore"
      enableBlurKeyboardOnGesture
      backdropComponent={renderBackdrop}
      onDismiss={handleSheetDismiss}
      backgroundStyle={{
        backgroundColor: color.background.primary,
        borderTopWidth: 1,
        borderTopColor: color.border.default,
      }}
      handleIndicatorStyle={{
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: color.icon.muted,
      }}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        {showActivatingOverlay ? (
          <View className="items-center py-4">
            <ActivityIndicator size="large" color={color.accent.primary} />
            <Text
              className="mt-5 text-center text-[16px] font-semibold leading-6"
              style={{ color: color.text.primary }}
            >
              {t('proLicense.activatingTitle')}
            </Text>
            <Text
              className="mt-2 text-center text-[14px] leading-5"
              style={{ color: color.text.secondary }}
            >
              {t('proLicense.activatingSubtitle')}
            </Text>
          </View>
        ) : phase === 'success' && successExpiresAt != null ? (
          <ProActivationSuccessPanel
            color={color}
            expiresAtIso={successExpiresAt}
            onDismiss={finishSuccess}
          />
        ) : (
          <>
            <Text className="text-lg font-semibold" style={{ color: color.text.primary }}>
              {t('proLicense.modalTitle')}
            </Text>
            <Text className="mt-2 text-sm leading-5" style={{ color: color.text.secondary }}>
              {t('proLicense.modalSubtitle')}
            </Text>
            <BottomSheetTextInput
              value={keyText}
              onChangeText={setKeyText}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!busy}
              placeholder={t('proLicense.keyPlaceholder')}
              placeholderTextColor={color.text.muted}
              className="mt-4 rounded-xl border px-3 py-3 font-mono text-base"
              style={{
                borderColor: color.border.default,
                color: color.text.primary,
                backgroundColor: color.background.secondary,
              }}
            />
            {error != null && error.length > 0 && (
              <Text className="mt-2 text-sm" style={{ color: color.accent.delete }}>
                {error}
              </Text>
            )}
            <View className="mt-5 flex-row justify-end gap-2">
              <Pressable onPress={handleClose} className="rounded-xl px-4 py-2.5">
                <Text className="text-base font-medium" style={{ color: color.text.secondary }}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void handleSubmit()}
                disabled={!keyText.trim()}
                className="rounded-xl px-4 py-2.5"
                style={{
                  backgroundColor: color.accent.primary,
                  opacity: !keyText.trim() ? 0.5 : 1,
                }}
              >
                <Text className="text-base font-semibold" style={{ color: '#ffffff' }}>
                  {t('proLicense.activate')}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
}
