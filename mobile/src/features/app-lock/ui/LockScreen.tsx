import { useFocusEffect } from '@react-navigation/native';
import { Fingerprint, ScanFace } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Alert, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppLockStore } from '@/entities/app-lock';
import { getColors } from '@/shared/config';

import { PinInput } from './PinInput';

export const LockScreen = () => {
  const color = getColors(useColorScheme() === 'dark' ? 'dark' : 'light');
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    unlock,
    verifyPin,
    unlockWithBiometrics,
    useBiometrics,
    biometryType,
    checkBiometryAvailable,
  } = useAppLockStore();

  useFocusEffect(
    useCallback(() => {
      checkBiometryAvailable();
      if (useBiometrics) {
        unlockWithBiometrics().then((ok) => {
          if (ok) unlock();
        });
      }
    }, [checkBiometryAvailable, useBiometrics, unlockWithBiometrics, unlock]),
  );

  const handleDigit = useCallback(
    async (digit: string) => {
      if (pin.length >= 4) {
        return;
      }

      const next = pin + digit;
      setPin(next);

      if (next.length === 4) {
        const ok = await verifyPin(next);

        if (ok) {
          setError(false);
          setSuccess(true);
        } else {
          setError(true);
          setPin('');
          setTimeout(() => setError(false), 500);
        }
      }
    },
    [pin, verifyPin],
  );

  const handleBackspace = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);

  const handleBiometricPress = useCallback(async () => {
    const ok = await unlockWithBiometrics();

    if (ok) {
      unlock();
    } else {
      Alert.alert('Ошибка', 'Не удалось разблокировать. Попробуйте ввести PIN-код.');
    }
  }, [unlockWithBiometrics, unlock]);

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
        Введите PIN-код для входа
      </Text>

      <PinInput
        pin={pin}
        color={color}
        onDigit={handleDigit}
        onBackspace={handleBackspace}
        error={error}
        success={success}
        onSuccessAnimationComplete={unlock}
        bottomLeftSlot={
          useBiometrics &&
          biometryType && (
            <TouchableOpacity
              className="h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: color.background.tertiary }}
              onPress={handleBiometricPress}
              activeOpacity={0.7}
            >
              <BioIcon size={28} color={color.accent.success} strokeWidth={1.8} />
            </TouchableOpacity>
          )
        }
      />
    </View>
  );
};
