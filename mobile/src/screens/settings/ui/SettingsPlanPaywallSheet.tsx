import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Check, Crown } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { type MonetizationMode } from '@/features/app-storefront';
import { useColors } from '@/shared/config';
import { modalKeyboardBehavior } from '@/shared/lib/platform';
import { Button } from '@/shared/ui';

type SettingsPlanPaywallSheetProps = {
  visible: boolean;
  mode: MonetizationMode;
  onClose: () => void;
  onUpgradePress?: () => void;
};

type FeatureRowProps = {
  text: string;
};

function FeatureRow({ text }: FeatureRowProps) {
  const c = useColors();

  return (
    <View className="mb-2 flex-row items-start">
      <View className="mr-2 mt-[2px] h-5 w-5 items-center justify-center rounded-full bg-[#7E5BFF22]">
        <Check size={13} color={c.accent.primary} strokeWidth={2.4} />
      </View>
      <Text className="flex-1 text-[14px] leading-5" style={{ color: c.text.primary }}>
        {text}
      </Text>
    </View>
  );
}

export function SettingsPlanPaywallSheet({
  visible,
  mode,
  onClose,
  onUpgradePress,
}: SettingsPlanPaywallSheetProps) {
  const { t } = useTranslation();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="close" opacity={0.45} />
    ),
    [],
  );

  const isComingSoon = mode === 'coming_soon';
  const upgradeDisabled = isComingSoon;
  const upgradeLabel = isComingSoon
    ? t('settings.planPaywall.comingSoon')
    : t('settings.planPaywall.upgrade');

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      enablePanDownToClose
      enableOverDrag={false}
      keyboardBehavior={modalKeyboardBehavior}
      keyboardBlurBehavior="restore"
      enableBlurKeyboardOnGesture
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
      backgroundStyle={{
        backgroundColor: c.background.primary,
        borderTopWidth: 1,
        borderTopColor: c.border.default,
      }}
      handleIndicatorStyle={{
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: c.icon.muted,
      }}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: 20,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 22),
        }}
      >
        <View className="mb-3 flex-row items-center">
          <View
            className="mr-3 h-11 w-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: c.background.tertiary }}
          >
            <Crown size={22} color={c.accent.primary} strokeWidth={1.8} />
          </View>
          <View className="flex-1">
            <Text className="text-[21px] font-bold" style={{ color: c.text.primary }}>
              {t('settings.planPaywall.title')}
            </Text>
            <Text className="mt-0.5 text-[13px]" style={{ color: c.text.secondary }}>
              {t('settings.planPaywall.subtitle')}
            </Text>
          </View>
        </View>

        <View
          className="mb-3 rounded-2xl border p-4"
          style={{ borderColor: c.border.default, backgroundColor: c.background.secondary }}
        >
          <Text className="text-sm font-semibold" style={{ color: c.text.primary }}>
            {t('settings.planPaywall.freeTitle')}
          </Text>
          <Text className="mt-1 text-[13px] leading-5" style={{ color: c.text.secondary }}>
            {t('settings.planPaywall.freeBody')}
          </Text>
        </View>

        <View
          className="mb-5 rounded-2xl border p-4"
          style={{ borderColor: `${c.accent.primary}66`, backgroundColor: c.background.secondary }}
        >
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-semibold" style={{ color: c.text.primary }}>
              {t('settings.planPaywall.proTitle')}
            </Text>
            <View
              className="rounded-full px-2.5 py-1"
              style={{ backgroundColor: `${c.accent.primary}18` }}
            >
              <Text className="text-[11px] font-semibold" style={{ color: c.accent.primary }}>
                PRO
              </Text>
            </View>
          </View>
          <FeatureRow text={t('settings.planPaywall.features.aiLimit75')} />
          <FeatureRow text={t('settings.planPaywall.features.recordingUpTo30Min')} />
          <FeatureRow text={t('settings.planPaywall.features.autoAi')} />
          <FeatureRow text={t('settings.planPaywall.features.autoTranscription')} />
          <FeatureRow text={t('settings.planPaywall.features.accentColor')} />
          <FeatureRow text={t('settings.planPaywall.features.earlyAccess')} />
          <FeatureRow text={t('settings.planPaywall.features.noAds')} />
        </View>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          label={upgradeLabel}
          onPress={onUpgradePress}
          disabled={upgradeDisabled}
          color={c}
          activeOpacity={0.85}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
}
