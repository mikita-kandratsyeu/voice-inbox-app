import type { BottomSheetBackdropProps, BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop, BottomSheetTextInput, BottomSheetView } from '@gorhom/bottom-sheet';
import dayjs from 'dayjs';
import { CheckCircle2 } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
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
import { hapticError, hapticSuccess, IS_IOS, selectPlatform } from '@/shared/lib';
import { redeemProLicenseKey } from '@/shared/lib/ai-api/proLicenseApi';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { AppBottomSheetModal, Button, useBottomSheetContentPadding } from '@/shared/ui';

import {
  isRevenueCatStoreBillingConfigured,
  isStoreProEntitlementActiveNow,
} from '../lib/isStoreProEntitlementActive';
import { setProServerExpiresAtMsSync } from '../lib/proEntitlementStorage';
import {
  formatProOfferCodeDisplay,
  isCompleteProOfferCode,
  parseProOfferCodeInput,
} from '../lib/proOfferCodeFormat';
import { proLicenseMessageForRedeemError } from '../lib/redeemErrorMessage';

type ProLicenseKeyModalProps = {
  visible: boolean;
  onClose: () => void;
  onActivated: () => void;
};

function formatExpiryDate(iso: string, locale: string): string {
  const d = dayjs(iso);
  if (!d.isValid()) {
    return '';
  }

  return d.locale(resolveDayjsLocale(locale)).format('D MMMM YYYY');
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
      <Button
        variant="primary"
        label={t('proLicense.successButton')}
        color={color}
        onPress={onDismiss}
        fullWidth
        className="mt-6"
      />
    </Animated.View>
  );
}

export function ProLicenseKeyModal({ visible, onClose, onActivated }: ProLicenseKeyModalProps) {
  const { t } = useTranslation();
  const color = useColors();
  const contentPadding = useBottomSheetContentPadding(20);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [offerCodeCompact, setOfferCodeCompact] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'form' | 'success'>('form');
  const [successExpiresAt, setSuccessExpiresAt] = useState<string | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const resetForm = useCallback(() => {
    setPhase('form');
    setOfferCodeCompact('');
    setError(null);
    setSuccessExpiresAt(null);
  }, []);

  const finishSuccess = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleClose = useCallback(() => {
    if (busy) {
      return;
    }
    if (phase === 'success') {
      finishSuccess();
      return;
    }
    resetForm();
    onClose();
  }, [busy, phase, finishSuccess, onClose, resetForm]);

  useEffect(() => {
    if (!visible) {
      resetForm();
      return;
    }

    let cancelled = false;

    void (async () => {
      if (isRevenueCatStoreBillingConfigured() && (await isStoreProEntitlementActiveNow())) {
        if (!cancelled) {
          onCloseRef.current();
        }
        return;
      }
      if (!cancelled) {
        requestAnimationFrame(() => {
          bottomSheetRef.current?.present();
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, resetForm]);

  const handleSubmit = useCallback(async () => {
    if (!isCompleteProOfferCode(offerCodeCompact) || busy) {
      return;
    }
    const payload = formatProOfferCodeDisplay(offerCodeCompact);
    setBusy(true);
    setError(null);
    const result = await redeemProLicenseKey(payload);
    setBusy(false);
    if (!result.ok && result.code === 'iap_active') {
      onCloseRef.current();
      return;
    }
    if (result.ok) {
      const ms = dayjs(result.expiresAt).valueOf();
      if (Number.isFinite(ms)) {
        setProServerExpiresAtMsSync(ms);
      }
      setOfferCodeCompact('');
      onActivated();
      hapticSuccess();
      setSuccessExpiresAt(result.expiresAt);
      setPhase('success');
      return;
    }
    hapticError();
    setError(proLicenseMessageForRedeemError(t, result));
  }, [offerCodeCompact, busy, onActivated, t]);

  const showActivatingOverlay = busy && phase !== 'success';

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior={busy ? 'none' : 'close'} opacity={0.45} />
    ),
    [busy],
  );

  const canDismissByGesture = !busy;

  const codeFontFamily = selectPlatform({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  });

  return (
    <AppBottomSheetModal
      ref={bottomSheetRef}
      visible={visible}
      onClose={handleClose}
      presentOnVisible={false}
      enablePanDownToClose={canDismissByGesture}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView className="px-5 pt-1" style={contentPadding}>
        {showActivatingOverlay ? (
          <View className="items-center py-4">
            <ActivityIndicator size="large" color={color.accent.primary} />
            <Text
              className="mt-5 px-6 text-center text-[17px] font-semibold"
              style={{ color: color.text.primary }}
            >
              {t('proLicense.activatingTitle')}
            </Text>
            <Text
              className="px-2 text-center text-[13px] leading-[18px]"
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
            <View className="mb-3 justify-center">
              <Text
                className="px-14 text-center text-[17px] font-semibold"
                style={{ color: color.text.primary }}
              >
                {t('proLicense.modalTitle')}
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                className="absolute bottom-0 right-0 top-0 justify-center"
              >
                <Text className="text-[17px] font-semibold" style={{ color: color.accent.primary }}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
            <Text
              className="mb-3 px-2 text-center text-[13px] leading-[18px]"
              style={{ color: color.text.secondary }}
            >
              {t('proLicense.modalSubtitle')}
            </Text>
            <BottomSheetTextInput
              value={formatProOfferCodeDisplay(offerCodeCompact)}
              onChangeText={(text) => setOfferCodeCompact(parseProOfferCodeInput(text))}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!busy}
              maxLength={17}
              placeholder={t('proLicense.keyPlaceholder')}
              placeholderTextColor={color.text.muted}
              className="rounded-xl border px-3 text-[16px] leading-[22px]"
              style={{
                borderColor: color.border.default,
                color: color.text.primary,
                backgroundColor: color.background.secondary,
                fontFamily: codeFontFamily,
                letterSpacing: 0.5,
                ...(IS_IOS ? { paddingTop: 11, paddingBottom: 11 } : { paddingVertical: 12 }),
              }}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => void handleSubmit()}
            />
            {error != null && error.length > 0 && (
              <Text
                className="mt-2 px-2 text-center text-[13px] leading-[18px]"
                style={{ color: color.accent.delete }}
              >
                {error}
              </Text>
            )}
            <View className="mt-4 w-full">
              <Button
                variant="primary"
                size="lg"
                label={t('proLicense.activate')}
                color={color}
                onPress={() => void handleSubmit()}
                disabled={!isCompleteProOfferCode(offerCodeCompact) || busy}
              />
            </View>
          </>
        )}
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
