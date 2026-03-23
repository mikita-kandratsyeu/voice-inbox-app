import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Zap } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getColors, useAppTheme } from '@/shared/config';
import { logAnalyticsEvent } from '@/shared/lib/analytics';
import { modalKeyboardBehavior } from '@/shared/lib/platform';
import { Button } from '@/shared/ui';

export type AutomationFeatureKind = 'autoTranscribe' | 'autoAi';

type AutomationComingSoonSheetProps = {
  visible: boolean;
  feature: AutomationFeatureKind;
  onClose: () => void;
};

export function AutomationComingSoonSheet({
  visible,
  feature,
  onClose,
}: AutomationComingSoonSheetProps) {
  const { t } = useTranslation();
  const scheme = useAppTheme();
  const c = getColors(scheme);
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) {
      ref.current?.present();
      void logAnalyticsEvent('premium_hint_opened', {
        feature: feature === 'autoTranscribe' ? 'auto_whisper' : 'auto_ai',
      });
      void logAnalyticsEvent(
        feature === 'autoTranscribe'
          ? 'premium_feature_tapped_auto_whisper'
          : 'premium_feature_tapped_auto_ai',
        { surface: 'settings_sheet' },
      );
    } else {
      ref.current?.dismiss();
    }
  }, [visible, feature]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="close" opacity={0.35} />
    ),
    [],
  );

  const title =
    feature === 'autoTranscribe'
      ? t('settings.automationSoon.autoTranscribeTitle')
      : t('settings.automationSoon.autoAiTitle');
  const body =
    feature === 'autoTranscribe'
      ? t('settings.automationSoon.autoTranscribeBody')
      : t('settings.automationSoon.autoAiBody');

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      keyboardBehavior={modalKeyboardBehavior}
      backdropComponent={renderBackdrop}
      onDismiss={onClose}
      backgroundStyle={{ backgroundColor: c.background.card }}
      handleIndicatorStyle={{ backgroundColor: c.text.muted }}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 20),
          gap: 16,
        }}
      >
        <View
          className="mb-1 items-center justify-center rounded-2xl py-4"
          style={{ backgroundColor: c.accent.primary + '18' }}
        >
          <Zap size={28} color={c.accent.primary} strokeWidth={1.75} />
        </View>
        <Text className="text-lg font-bold" style={{ color: c.text.primary }}>
          {title}
        </Text>
        <Text className="text-[15px] leading-6" style={{ color: c.text.secondary }}>
          {body}
        </Text>
        <Text
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: c.text.muted }}
        >
          {t('settings.automationSoon.badge')}
        </Text>
        <Button
          variant="primary"
          label={t('common.done')}
          onPress={() => ref.current?.dismiss()}
          color={c}
          containerStyle={{ backgroundColor: c.accent.primary, borderRadius: 14 }}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
}
