import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import dayjs from 'dayjs';
import { Brain, CheckCircle2, Crown, Gift, ShieldCheck, Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
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
import { hapticError, hapticSuccess, IS_IOS, selectPlatform } from '@/shared/lib';
import { redeemProLicenseKey } from '@/shared/lib/ai-api/proLicenseApi';
import { resolveDayjsLocale } from '@/shared/lib/date';
import { AppBottomSheetContent, AppBottomSheetModal, SheetFooterButtons } from '@/shared/ui';

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

const VOUCHER_ORBIT_LAYOUT = [
  { x: -50, y: -30, delay: 0, icon: 'crown' as const, tilt: -14 },
  { x: 52, y: -28, delay: 110, icon: 'zap' as const, tilt: 10 },
  { x: -46, y: 40, delay: 220, icon: 'brain' as const, tilt: -8 },
  { x: 50, y: 38, delay: 330, icon: 'shield' as const, tilt: 12 },
] as const;

type VoucherOrbitIconKind = (typeof VOUCHER_ORBIT_LAYOUT)[number]['icon'];

type VoucherOrbitIconProps = {
  x: number;
  y: number;
  delay: number;
  tilt: number;
  icon: VoucherOrbitIconKind;
  accent: string;
};

function VoucherOrbitIconGlyph({ icon, accent }: { icon: VoucherOrbitIconKind; accent: string }) {
  const stroke = 2.15;
  const size = 14;

  switch (icon) {
    case 'crown':
      return <Crown size={size} color={accent} strokeWidth={stroke} />;
    case 'zap':
      return <Zap size={size} color={accent} strokeWidth={stroke} fill={`${accent}30`} />;
    case 'brain':
      return <Brain size={size} color={accent} strokeWidth={stroke} />;
    case 'shield':
      return <ShieldCheck size={size} color={accent} strokeWidth={stroke} />;
  }
}

function VoucherOrbitIcon({ x, y, delay, tilt, icon, accent }: VoucherOrbitIconProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = 0;
    pulse.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 500, easing: Easing.in(Easing.cubic) }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.35 + pulse.value * 0.65,
    transform: [
      { translateX: x },
      { translateY: y - pulse.value * 6 },
      { scale: 0.82 + pulse.value * 0.18 },
      { rotate: `${tilt + pulse.value * 6}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute items-center justify-center"
      style={style}
    >
      <View
        className="h-7 w-7 items-center justify-center rounded-full border"
        style={{
          borderColor: `${accent}30`,
          backgroundColor: `${accent}14`,
        }}
      >
        <VoucherOrbitIconGlyph icon={icon} accent={accent} />
      </View>
    </Animated.View>
  );
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
      <SheetFooterButtons
        className="mt-6 w-full"
        color={color}
        primaryLabel={t('proLicense.successButton')}
        onPrimaryPress={onDismiss}
      />
    </Animated.View>
  );
}

function VoucherActivationSuccessPanel({ color, expiresAtIso, onDismiss }: SuccessPanelProps) {
  const { t, i18n } = useTranslation();
  const cardScale = useSharedValue(0.9);
  const cardOpacity = useSharedValue(0);
  const giftScale = useSharedValue(0);
  const giftRotate = useSharedValue(0);
  const halo = useSharedValue(0);

  useEffect(() => {
    cardScale.value = 0.9;
    cardOpacity.value = 0;
    giftScale.value = 0;
    giftRotate.value = 0;
    halo.value = 0;

    cardOpacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
    cardScale.value = withSpring(1, { damping: 15, stiffness: 210, mass: 0.9 });
    giftScale.value = withDelay(100, withSpring(1, { damping: 11, stiffness: 240 }));
    giftRotate.value = withDelay(
      220,
      withSequence(
        withTiming(-10, { duration: 110, easing: Easing.out(Easing.quad) }),
        withTiming(10, { duration: 120, easing: Easing.inOut(Easing.quad) }),
        withTiming(-5, { duration: 90 }),
        withTiming(0, { duration: 90 }),
      ),
    );
    halo.value = withDelay(
      180,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
          withTiming(0.35, { duration: 900, easing: Easing.in(Easing.cubic) }),
        ),
        -1,
        true,
      ),
    );
  }, [cardOpacity, cardScale, giftRotate, giftScale, halo]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const giftStyle = useAnimatedStyle(() => ({
    transform: [{ scale: giftScale.value }, { rotate: `${giftRotate.value}deg` }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + halo.value * 0.28,
    transform: [{ scale: 0.92 + halo.value * 0.14 }],
  }));

  const dateText = formatExpiryDate(expiresAtIso, i18n.language);
  const accent = color.accent.primary;

  return (
    <Animated.View style={cardStyle} className="items-center py-1">
      <View className="relative mb-4 h-28 w-28 items-center justify-center">
        <Animated.View
          pointerEvents="none"
          className="absolute h-28 w-28 rounded-full"
          style={[haloStyle, { backgroundColor: accent }]}
        />
        {VOUCHER_ORBIT_LAYOUT.map((orbit) => (
          <VoucherOrbitIcon
            key={orbit.icon}
            x={orbit.x}
            y={orbit.y}
            delay={orbit.delay}
            tilt={orbit.tilt}
            icon={orbit.icon}
            accent={accent}
          />
        ))}
        <Animated.View style={giftStyle}>
          <View
            className="h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: `${accent}24` }}
          >
            <Gift size={42} color={accent} strokeWidth={2.1} />
          </View>
        </Animated.View>
      </View>
      <Text
        className="text-center text-xl font-bold tracking-tight"
        style={{ color: color.text.primary }}
      >
        {t('proLicense.voucher.successTitle')}
      </Text>
      <Text
        className="mt-2 px-3 text-center text-[15px] leading-[22px]"
        style={{ color: color.text.secondary }}
      >
        {t('proLicense.voucher.successSubtitle')}
      </Text>
      {dateText.length > 0 && (
        <Text
          className="mt-3 text-center text-sm font-medium"
          style={{ color: color.text.primary }}
        >
          {t('proLicense.voucher.successUntil', { date: dateText })}
        </Text>
      )}
      <SheetFooterButtons
        className="mt-6 w-full"
        color={color}
        primaryLabel={t('proLicense.voucher.successButton')}
        onPrimaryPress={onDismiss}
      />
    </Animated.View>
  );
}

export function ProLicenseKeyModal({ visible, onClose, onActivated }: ProLicenseKeyModalProps) {
  const { t } = useTranslation();
  const color = useColors();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [offerCodeCompact, setOfferCodeCompact] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'form' | 'success'>('form');
  const [successExpiresAt, setSuccessExpiresAt] = useState<string | null>(null);
  const [successIsVoucher, setSuccessIsVoucher] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const resetForm = useCallback(() => {
    setPhase('form');
    setOfferCodeCompact('');
    setError(null);
    setSuccessExpiresAt(null);
    setSuccessIsVoucher(false);
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
      setSuccessIsVoucher(result.isVoucher);
      setPhase('success');
      return;
    }
    hapticError();
    setError(proLicenseMessageForRedeemError(t, result, { voucher: true }));
  }, [offerCodeCompact, busy, onActivated, t]);

  const showActivatingOverlay = busy && phase !== 'success';

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
      backdropPressBehavior={busy ? 'none' : 'close'}
    >
      <AppBottomSheetContent>
        {showActivatingOverlay ? (
          <View className="items-center py-4">
            <ActivityIndicator size="large" color={color.accent.primary} />
            <Text
              className="mt-5 px-6 text-center text-[17px] font-semibold"
              style={{ color: color.text.primary }}
            >
              {t('proLicense.voucher.activatingTitle')}
            </Text>
            <Text
              className="px-2 text-center text-[13px] leading-[18px]"
              style={{ color: color.text.secondary }}
            >
              {t('proLicense.voucher.activatingSubtitle')}
            </Text>
          </View>
        ) : phase === 'success' && successExpiresAt != null ? (
          successIsVoucher ? (
            <VoucherActivationSuccessPanel
              color={color}
              expiresAtIso={successExpiresAt}
              onDismiss={finishSuccess}
            />
          ) : (
            <ProActivationSuccessPanel
              color={color}
              expiresAtIso={successExpiresAt}
              onDismiss={finishSuccess}
            />
          )
        ) : (
          <>
            <View className="mb-3 items-center">
              <View
                className="mb-2.5 h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: `${color.accent.primary}20` }}
              >
                <Gift size={22} color={color.accent.primary} strokeWidth={2.1} />
              </View>
            </View>
            <View className="mb-3 justify-center">
              <Text
                className="px-14 text-center text-[17px] font-semibold"
                style={{ color: color.text.primary }}
              >
                {t('proLicense.voucher.modalTitle')}
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
              {t('proLicense.voucher.modalSubtitle')}
            </Text>
            <View
              className="mb-3 rounded-xl border px-3 py-2.5"
              style={{
                borderColor: color.border.default,
                backgroundColor: color.background.secondary,
              }}
            >
              <Text
                className="mb-1.5 text-[12px] font-semibold"
                style={{ color: color.text.primary }}
              >
                {t('proLicense.voucher.activationStepsTitle')}
              </Text>
              {(t('proLicense.voucher.activationSteps', { returnObjects: true }) as string[]).map(
                (step, index) => (
                  <Text
                    key={step}
                    className="text-[12px] leading-[17px]"
                    style={{ color: color.text.secondary }}
                  >
                    {index + 1}. {step}
                  </Text>
                ),
              )}
            </View>
            <BottomSheetTextInput
              value={formatProOfferCodeDisplay(offerCodeCompact)}
              onChangeText={(text) => setOfferCodeCompact(parseProOfferCodeInput(text))}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!busy}
              maxLength={17}
              placeholder={t('proLicense.voucher.keyPlaceholder')}
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
            <SheetFooterButtons
              color={color}
              primaryLabel={t('proLicense.voucher.activate')}
              onPrimaryPress={() => void handleSubmit()}
              primaryDisabled={!isCompleteProOfferCode(offerCodeCompact) || busy}
            />
          </>
        )}
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
