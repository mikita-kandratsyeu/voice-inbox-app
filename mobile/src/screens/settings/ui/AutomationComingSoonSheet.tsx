import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Crown } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/shared/config';
import { logAnalyticsEvent } from '@/shared/lib/analytics';
import { modalKeyboardBehavior } from '@/shared/lib/platform';
import { Button } from '@/shared/ui';

export type AutomationFeatureKind = 'autoTranscribe' | 'autoAi' | 'accentColor' | 'folderColor';

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
  const c = useColors();
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) {
      ref.current?.present();
      void logAnalyticsEvent('premium_hint_opened', {
        feature:
          feature === 'autoTranscribe'
            ? 'auto_whisper'
            : feature === 'autoAi'
              ? 'auto_ai'
              : feature === 'folderColor'
                ? 'folder_color'
                : 'accent_color',
      });
      if (feature === 'autoTranscribe') {
        void logAnalyticsEvent('premium_feature_tapped_auto_whisper', {
          surface: 'settings_sheet',
        });
      } else if (feature === 'autoAi') {
        void logAnalyticsEvent('premium_feature_tapped_auto_ai', { surface: 'settings_sheet' });
      } else if (feature === 'folderColor') {
        void logAnalyticsEvent('premium_feature_tapped_folder_color', {
          surface: 'folder_form_sheet',
        });
      } else {
        void logAnalyticsEvent('premium_feature_tapped_accent_color', {
          surface: 'appearance_sheet',
        });
      }
    } else {
      ref.current?.dismiss();
    }
  }, [visible, feature]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="close" opacity={0.45} />
    ),
    [],
  );

  const title =
    feature === 'autoTranscribe'
      ? t('settings.automationSoon.autoTranscribeTitle')
      : feature === 'autoAi'
        ? t('settings.automationSoon.autoAiTitle')
        : feature === 'folderColor'
          ? t('folders.colorProTitle')
          : t('appearance.accentColor.proTitle');
  const body =
    feature === 'autoTranscribe'
      ? t('settings.automationSoon.autoTranscribeBody')
      : feature === 'autoAi'
        ? t('settings.automationSoon.autoAiBody')
        : feature === 'folderColor'
          ? t('folders.colorProBody')
          : t('appearance.accentColor.proBody');

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
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        <View className="mb-1 items-center">
          <View
            className="mb-4 h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: c.background.tertiary }}
          >
            <Crown size={28} color={c.accent.primary} strokeWidth={1.75} />
          </View>
          <Text className="mb-2 text-center text-xl font-bold" style={{ color: c.text.primary }}>
            {title}
          </Text>
          <Text className="mb-6 text-center text-sm leading-5" style={{ color: c.text.secondary }}>
            {body}
          </Text>
        </View>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          label={t('common.gotIt')}
          onPress={() => ref.current?.dismiss()}
          color={c}
          activeOpacity={0.85}
          accessibilityLabel={t('common.gotIt')}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
}
