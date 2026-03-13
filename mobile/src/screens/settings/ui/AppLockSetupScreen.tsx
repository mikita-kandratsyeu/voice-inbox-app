import { useNavigation } from '@react-navigation/native';
import { Fingerprint, ScanFace } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppLockStore } from '@/entities/app-lock';
import { PinInput } from '@/features/app-lock/ui/PinInput';
import { getColors, useAppTheme } from '@/shared/config';
import { ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

type SetupStep = 'confirm' | 'initial';

export const AppLockSetupScreen = () => {
  const { t } = useTranslation();
  const color = getColors(useAppTheme());
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [step, setStep] = useState<SetupStep>('initial');
  const [initialPin, setInitialPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    isEnabled,
    useBiometrics,
    setEnabled,
    setUseBiometrics,
    setPin: savePin,
    checkBiometryAvailable,
    biometryType,
  } = useAppLockStore();

  useEffect(() => {
    checkBiometryAvailable();
  }, [checkBiometryAvailable]);

  const handleDigit = useCallback(
    async (digit: string) => {
      if (pin.length >= 4) return;

      const next = pin + digit;
      setPin(next);

      if (next.length === 4) {
        if (step === 'initial') {
          setInitialPin(next);
          setStep('confirm');
          setPin('');
        } else {
          if (next === initialPin) {
            const ok = await savePin(next);

            if (ok) {
              setSuccess(true);
            } else {
              setError(true);
              setPin('');
              setTimeout(() => setError(false), 500);
            }
          } else {
            setError(true);
            setPin('');
            setTimeout(() => setError(false), 500);
          }
        }
      }
    },
    [pin, step, initialPin, savePin],
  );

  const handleBackspace = useCallback(() => {
    setPin((p) => p.slice(0, -1));
  }, []);

  const handleSuccessComplete = useCallback(async () => {
    await setEnabled(true);
    if (useBiometrics && biometryType) {
      await setUseBiometrics(true);
    }
    navigation.goBack();
  }, [setEnabled, setUseBiometrics, useBiometrics, biometryType, navigation]);

  const handleDisable = useCallback(() => {
    Alert.alert(t('appLock.disableTitle'), t('appLock.disableMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('appLock.disable'),
        style: 'destructive',
        onPress: async () => {
          await setEnabled(false);
          navigation.goBack();
        },
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setEnabled, navigation]);

  const handleToggleEnabled = useCallback(
    async (value: boolean) => {
      if (value) {
        setStep('initial');
        setPin('');
      } else {
        await handleDisable();
      }
    },
    [handleDisable],
  );

  const handleToggleBiometrics = useCallback(
    async (value: boolean) => {
      if (!biometryType) return;

      await setUseBiometrics(value);
    },
    [biometryType, setUseBiometrics],
  );

  const bioLabel = biometryType
    ? t(`appLock.biometry.${biometryType}` as 'appLock.biometry.FaceID') || biometryType
    : t('common.biometrics');
  const isFaceBiometry =
    biometryType === 'FaceID' || biometryType === 'Face' || biometryType === 'OpticID';
  const BioIcon = isFaceBiometry ? ScanFace : Fingerprint;

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('appLock.title')} color={color} onBack={() => navigation.goBack()} />

      {!isEnabled ? (
        <View
          className="flex-1 justify-center px-6"
          style={{ paddingTop: 24, paddingBottom: insets.bottom + 24 }}
        >
          <Text className="mb-6 text-center text-[16px]" style={{ color: color.text.secondary }}>
            {t('appLock.setPinPrompt')}
          </Text>

          <View className="mb-6 min-h-[52px] justify-center">
            {biometryType && (
              <View
                className="flex-row items-center justify-between rounded-2xl px-4 py-3.5"
                style={{
                  backgroundColor: color.background.card,
                  borderWidth: 1,
                  borderColor: color.border.default,
                }}
              >
                <View className="flex-row items-center gap-3">
                  <BioIcon size={20} color={color.accent.success} strokeWidth={1.8} />
                  <Text className="text-[16px]" style={{ color: color.text.primary }}>
                    {bioLabel}
                  </Text>
                </View>
                <Switch
                  value={useBiometrics}
                  onValueChange={(v) => setUseBiometrics(v)}
                  trackColor={{
                    false: color.background.tertiary,
                    true: color.accent.success,
                  }}
                  thumbColor="#fff"
                />
              </View>
            )}
          </View>

          <PinInput
            pin={pin}
            color={color}
            onDigit={handleDigit}
            onBackspace={handleBackspace}
            error={error}
            success={success}
            onSuccessAnimationComplete={handleSuccessComplete}
          />

          <View className="mt-4 h-8 items-center justify-center">
            {step === 'confirm' && (
              <Text className="text-center text-sm" style={{ color: color.text.secondary }}>
                {t('appLock.confirmPin')}
              </Text>
            )}
          </View>
        </View>
      ) : (
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 24,
          }}
        >
          <SettingsSection title={t('appLock.settings')} color={color}>
            <SettingsRow
              label={t('appLock.title')}
              color={color}
              leftIcon={<Fingerprint size={20} color={color.accent.primary} strokeWidth={1.8} />}
              rightSlot={
                <Switch
                  value={isEnabled}
                  onValueChange={handleToggleEnabled}
                  trackColor={{
                    false: color.background.tertiary,
                    true: color.accent.success,
                  }}
                  thumbColor="#fff"
                />
              }
              showChevron={false}
              onPress={undefined}
              isFirst
              isLast={!biometryType}
            />
            {biometryType && (
              <SettingsRow
                label={bioLabel}
                value={useBiometrics ? t('settings.on') : t('settings.off')}
                color={color}
                leftIcon={<BioIcon size={20} color={color.accent.success} strokeWidth={1.8} />}
                rightSlot={
                  <Switch
                    value={useBiometrics}
                    onValueChange={handleToggleBiometrics}
                    trackColor={{
                      false: color.background.tertiary,
                      true: color.accent.success,
                    }}
                    thumbColor="#fff"
                  />
                }
                showChevron={false}
                onPress={undefined}
                isLast
              />
            )}
          </SettingsSection>
        </View>
      )}
    </View>
  );
};
