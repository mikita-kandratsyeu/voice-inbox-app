import { useNavigation } from '@react-navigation/native';
import { Fingerprint, ScanFace } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { useAppLockStore } from '@/entities/app-lock';
import { PIN_LENGTH_OPTIONS } from '@/entities/app-lock';
import { PinInput } from '@/features/app-lock/ui/PinInput';
import { useColors } from '@/shared/config';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

import { getSettingsIconColor } from '../lib/settingsIconColor';

type SetupStep = 'confirm' | 'initial';

export const AppLockSetupScreen = () => {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const contentMaxWidth = useTabletContentMaxWidth();
  const isTablet = useIsTablet();

  const [step, setStep] = useState<SetupStep>('initial');
  const [initialPin, setInitialPin] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    isEnabled,
    useBiometrics,
    pinLength,
    setEnabled,
    setUseBiometrics,
    setPinLength,
    setPin: savePin,
    checkBiometryAvailable,
    biometryType,
  } = useAppLockStore();

  useEffect(() => {
    checkBiometryAvailable();
  }, [checkBiometryAvailable]);

  const handleDigit = useCallback(
    async (digit: string) => {
      if (pin.length >= pinLength) return;

      const next = pin + digit;
      setPin(next);

      if (next.length === pinLength) {
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
    [pin, pinLength, step, initialPin, savePin],
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
  const bioIconColor = getSettingsIconColor(color, isFaceBiometry ? 'scanFace' : 'fingerprint');

  const pinLengthLocked = step !== 'initial';

  const scrollPaddingBottom = getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet);

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('appLock.title')} onBack={() => navigation.goBack()} />
      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: scrollPaddingBottom,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!isEnabled ? (
            <>
              <Text
                className="mb-6 text-[15px] leading-[22px]"
                style={{ color: color.text.secondary }}
              >
                {step === 'confirm'
                  ? t('appLock.confirmPin', { digits: pinLength })
                  : t('appLock.setPinPrompt')}
              </Text>

              <SettingsSection title={t('appLock.pinLengthTitle')}>
                <View
                  className="flex-row flex-wrap items-center justify-center gap-2 px-4 py-3.5"
                  style={{
                    backgroundColor: color.background.card,
                    opacity: pinLengthLocked ? 0.5 : 1,
                  }}
                >
                  {PIN_LENGTH_OPTIONS.map((length) => {
                    const selected = pinLength === length;
                    return (
                      <TouchableOpacity
                        key={length}
                        disabled={pinLengthLocked}
                        onPress={() => {
                          if (pinLengthLocked) return;
                          setPin('');
                          setInitialPin('');
                          setPinLength(length);
                        }}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={t('appLock.pinLengthOption', { digits: length })}
                        accessibilityState={{ selected, disabled: pinLengthLocked }}
                        className="rounded-full px-4 py-2"
                        style={{
                          backgroundColor: selected
                            ? color.accent.primary
                            : color.background.tertiary,
                        }}
                      >
                        <Text
                          className="text-[13px] font-medium"
                          style={{
                            color: selected ? color.icon.onAccent : color.text.secondary,
                          }}
                        >
                          {t('appLock.pinLengthOption', { digits: length })}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </SettingsSection>

              {biometryType ? (
                <SettingsSection title={t('common.biometrics')}>
                  <SettingsRow
                    label={bioLabel}
                    leftIcon={<BioIcon size={20} color={bioIconColor} strokeWidth={1.8} />}
                    rightSlot={
                      <Switch
                        value={useBiometrics}
                        onValueChange={(v) => setUseBiometrics(v)}
                        accessibilityLabel={bioLabel}
                        trackColor={{
                          false: color.background.tertiary,
                          true: color.accent.primary,
                        }}
                        thumbColor={color.icon.onAccent}
                      />
                    }
                    showChevron={false}
                    onPress={undefined}
                    isFirst
                    isLast
                  />
                </SettingsSection>
              ) : null}

              <View className="mt-2 items-center pb-2">
                <PinInput
                  pin={pin}
                  pinLength={pinLength}
                  color={color}
                  onDigit={handleDigit}
                  onBackspace={handleBackspace}
                  error={error}
                  success={success}
                  onSuccessAnimationComplete={handleSuccessComplete}
                />
              </View>
            </>
          ) : (
            <SettingsSection title={t('appLock.settings')}>
              <SettingsRow
                label={t('appLock.title')}
                leftIcon={
                  <Fingerprint
                    size={20}
                    color={getSettingsIconColor(color, 'fingerprint')}
                    strokeWidth={1.8}
                  />
                }
                rightSlot={
                  <Switch
                    value={isEnabled}
                    onValueChange={handleToggleEnabled}
                    accessibilityLabel={t('appLock.title')}
                    trackColor={{
                      false: color.background.tertiary,
                      true: color.accent.primary,
                    }}
                    thumbColor={color.icon.onAccent}
                  />
                }
                showChevron={false}
                onPress={undefined}
                isFirst
                isLast={!biometryType}
              />
              {biometryType ? (
                <SettingsRow
                  label={bioLabel}
                  value={useBiometrics ? t('settings.on') : t('settings.off')}
                  leftIcon={<BioIcon size={20} color={bioIconColor} strokeWidth={1.8} />}
                  rightSlot={
                    <Switch
                      value={useBiometrics}
                      onValueChange={handleToggleBiometrics}
                      accessibilityLabel={bioLabel}
                      trackColor={{
                        false: color.background.tertiary,
                        true: color.accent.primary,
                      }}
                      thumbColor={color.icon.onAccent}
                    />
                  }
                  showChevron={false}
                  onPress={undefined}
                  isLast
                />
              ) : null}
            </SettingsSection>
          )}
        </ScrollView>
      </View>
    </View>
  );
};
