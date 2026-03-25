import { Fingerprint, ScanFace } from 'lucide-react-native';
import type { TFunction } from 'i18next';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppLockStore, type BiometryType } from '@/entities/app-lock';

function biometricUnlockA11yLabel(t: TFunction, type: BiometryType | null) {
  if (!type) {
    return t('common.biometrics');
  }
  switch (type) {
    case 'FaceID':
      return t('appLock.biometry.FaceID');
    case 'TouchID':
      return t('appLock.biometry.TouchID');
    case 'Fingerprint':
      return t('appLock.biometry.Fingerprint');
    case 'Face':
      return t('appLock.biometry.Face');
    case 'Iris':
      return t('appLock.biometry.Iris');
    case 'OpticID':
      return t('appLock.biometry.OpticID');
    default:
      return t('common.biometrics');
  }
}
import { useColors } from '@/shared/config';

import { PinInput } from './PinInput';

const BIOMETRIC_PROMPT_DEBOUNCE_MS = 1500;
const LOCKOUT_STEPS_MS = [5000, 15000, 60000] as const;

export const LockScreen = () => {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutNow, setLockoutNow] = useState(Date.now());
  const failedAttemptsRef = useRef(0);
  const isBiometricPromptOpenRef = useRef(false);
  const lastBiometricPromptAtRef = useRef(0);
  const autoBiometricTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pinRef = useRef(pin);
  pinRef.current = pin;

  const {
    unlock,
    verifyPin,
    unlockWithBiometrics,
    useBiometrics,
    pinLength,
    biometryType,
    checkBiometryAvailable,
  } = useAppLockStore();

  const runBiometricUnlock = useCallback(async () => {
    const now = Date.now();
    if (isBiometricPromptOpenRef.current) {
      return false;
    }
    if (now - lastBiometricPromptAtRef.current < BIOMETRIC_PROMPT_DEBOUNCE_MS) {
      return false;
    }

    isBiometricPromptOpenRef.current = true;
    lastBiometricPromptAtRef.current = now;
    try {
      return await unlockWithBiometrics();
    } finally {
      isBiometricPromptOpenRef.current = false;
    }
  }, [unlockWithBiometrics]);

  React.useEffect(() => {
    void checkBiometryAvailable();

    if (!useBiometrics) {
      return;
    }

    autoBiometricTimerRef.current = setTimeout(() => {
      if (pinRef.current.length > 0) {
        return;
      }

      void runBiometricUnlock().then((ok) => {
        if (ok) {
          unlock();
        }
      });
    }, 350);

    return () => {
      if (autoBiometricTimerRef.current) {
        clearTimeout(autoBiometricTimerRef.current);
        autoBiometricTimerRef.current = null;
      }
    };
  }, [checkBiometryAvailable, runBiometricUnlock, unlock, useBiometrics]);

  const isLockedOut = lockoutUntil != null && lockoutUntil > lockoutNow;
  const remainingLockoutSeconds = isLockedOut
    ? Math.max(1, Math.ceil((lockoutUntil - lockoutNow) / 1000))
    : 0;

  React.useEffect(() => {
    if (!isLockedOut) {
      return;
    }
    const timer = setInterval(() => {
      setLockoutNow(Date.now());
    }, 250);
    return () => clearInterval(timer);
  }, [isLockedOut]);

  React.useEffect(() => {
    if (!isLockedOut && lockoutUntil != null) {
      setLockoutUntil(null);
    }
  }, [isLockedOut, lockoutUntil]);

  const handleDigit = useCallback(
    async (digit: string) => {
      if (isLockedOut || pin.length >= pinLength) {
        return;
      }

      const next = pin + digit;
      setPin(next);

      if (next.length === pinLength) {
        const ok = await verifyPin(next);

        if (ok) {
          setError(false);
          setSuccess(false);
          setPin('');
          failedAttemptsRef.current = 0;
          setLockoutUntil(null);
          unlock();
        } else {
          failedAttemptsRef.current += 1;
          setError(true);
          setPin('');
          const lockoutMs =
            LOCKOUT_STEPS_MS[Math.min(failedAttemptsRef.current - 1, LOCKOUT_STEPS_MS.length - 1)];
          setLockoutUntil(Date.now() + lockoutMs);
          setTimeout(() => setError(false), 500);
        }
      }
    },
    [isLockedOut, pin, pinLength, verifyPin, unlock],
  );

  const handleBackspace = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);

  const handleBiometricPress = useCallback(async () => {
    const ok = await runBiometricUnlock();

    if (ok) {
      unlock();
    } else {
      Alert.alert(t('common.error'), t('appLock.unlockError'));
    }
  }, [runBiometricUnlock, t, unlock]);

  const isFaceBiometry =
    biometryType === 'FaceID' || biometryType === 'Face' || biometryType === 'OpticID';
  const BioIcon = isFaceBiometry ? ScanFace : Fingerprint;

  return (
    <View
      className="flex-1 items-center justify-center px-8"
      style={{
        backgroundColor: color.background.secondary,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <Text className="mb-8 text-center text-[16px]" style={{ color: color.text.secondary }}>
        {t('appLock.enterPin', { digits: pinLength })}
      </Text>
      {isLockedOut && (
        <Text className="mb-4 text-center text-[14px]" style={{ color: color.accent.delete }}>
          {t('appLock.tryAgainIn', { seconds: remainingLockoutSeconds })}
        </Text>
      )}

      <PinInput
        pin={pin}
        pinLength={pinLength}
        color={color}
        onDigit={handleDigit}
        onBackspace={handleBackspace}
        error={error}
        success={success}
        bottomLeftSlot={
          useBiometrics &&
          biometryType && (
            <TouchableOpacity
              className="h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: color.background.tertiary }}
              onPress={handleBiometricPress}
              activeOpacity={0.7}
              disabled={isLockedOut}
              accessibilityRole="button"
              accessibilityLabel={biometricUnlockA11yLabel(t, biometryType)}
              accessibilityState={{ disabled: isLockedOut }}
            >
              <BioIcon size={28} color={color.accent.success} strokeWidth={1.8} />
            </TouchableOpacity>
          )
        }
      />
    </View>
  );
};
