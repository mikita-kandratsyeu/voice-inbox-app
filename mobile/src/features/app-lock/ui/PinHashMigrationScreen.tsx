import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setPinHashNeedsReset, useAppLockStore } from '@/entities/app-lock';
import { useColors } from '@/shared/config';

import { PinInput } from './PinInput';

type Step = 'verify' | 'new' | 'confirm';

export const PinHashMigrationScreen = () => {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();

  const { pinLength, verifyPin, setPin: savePin } = useAppLockStore();

  const [step, setStep] = useState<Step>('verify');
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleDigit = useCallback(
    async (digit: string) => {
      if (pin.length >= pinLength) return;

      const next = pin + digit;
      setPin(next);

      if (next.length < pinLength) return;

      if (step === 'verify') {
        const ok = await verifyPin(next);
        if (ok) {
          setError(false);
          setPin('');
          setStep('new');
        } else {
          setError(true);
          setPin('');
          setTimeout(() => setError(false), 500);
        }
        return;
      }

      if (step === 'new') {
        setNewPin(next);
        setPin('');
        setStep('confirm');
        return;
      }

      if (step === 'confirm') {
        if (next === newPin) {
          const ok = await savePin(next);
          if (ok) {
            setSuccess(true);
            setPinHashNeedsReset(false);
          } else {
            setError(true);
            setPin('');
            setTimeout(() => setError(false), 500);
          }
        } else {
          setError(true);
          setPin('');
          setNewPin('');
          setStep('new');
          setTimeout(() => setError(false), 500);
        }
      }
    },
    [pin, pinLength, step, newPin, verifyPin, savePin],
  );

  const handleBackspace = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);

  const subtitle =
    step === 'verify'
      ? t('appLock.migration.enterCurrent')
      : step === 'new'
        ? t('appLock.migration.enterNew')
        : t('appLock.migration.confirmNew');

  return (
    <View
      className="flex-1 items-center justify-center px-8"
      style={{
        backgroundColor: color.background.secondary,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <Text
        className="mb-2 text-center text-[18px] font-semibold"
        style={{ color: color.text.primary }}
      >
        {t('appLock.migration.title')}
      </Text>
      <Text className="mb-8 text-center text-[14px]" style={{ color: color.text.secondary }}>
        {subtitle}
      </Text>

      <PinInput
        pin={pin}
        pinLength={pinLength}
        color={color}
        onDigit={handleDigit}
        onBackspace={handleBackspace}
        error={error}
        success={success}
      />
    </View>
  );
};
