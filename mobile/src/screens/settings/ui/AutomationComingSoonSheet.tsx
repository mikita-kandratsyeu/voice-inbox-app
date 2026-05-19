import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Crown } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useColors } from '@/shared/config';
import { logAnalyticsEvent } from '@/shared/lib/analytics';
import { AppBottomSheetModal, Button, useBottomSheetContentPadding } from '@/shared/ui';

export type AutomationFeatureKind =
  | 'autoTranscribe'
  | 'autoAi'
  | 'autoArchive'
  | 'accentColor'
  | 'folderColor'
  | 'batchExport';

type AutomationComingSoonSheetProps = {
  visible: boolean;
  feature: AutomationFeatureKind;
  onClose: () => void;
  onUpgradePress?: () => void;
};

export function AutomationComingSoonSheet({
  visible,
  feature,
  onClose,
  onUpgradePress,
}: AutomationComingSoonSheetProps) {
  const { t } = useTranslation();
  const c = useColors();
  const contentPadding = useBottomSheetContentPadding(24);

  useEffect(() => {
    if (!visible) return;
    void logAnalyticsEvent('premium_hint_opened', {
      feature:
        feature === 'autoTranscribe'
          ? 'auto_whisper'
          : feature === 'autoAi'
            ? 'auto_ai'
            : feature === 'autoArchive'
              ? 'auto_archive'
              : feature === 'batchExport'
                ? 'batch_export'
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
    } else if (feature === 'autoArchive') {
      void logAnalyticsEvent('premium_feature_tapped_auto_archive', {
        surface: 'settings_sheet',
      });
    } else if (feature === 'batchExport') {
      void logAnalyticsEvent('premium_feature_tapped_batch_export', {
        surface: 'inbox_batch_bar',
      });
    } else if (feature === 'folderColor') {
      void logAnalyticsEvent('premium_feature_tapped_folder_color', {
        surface: 'folder_form_sheet',
      });
    } else {
      void logAnalyticsEvent('premium_feature_tapped_accent_color', {
        surface: 'appearance_sheet',
      });
    }
  }, [visible, feature]);

  const title =
    feature === 'autoTranscribe'
      ? t('settings.automationSoon.autoTranscribeTitle')
      : feature === 'autoAi'
        ? t('settings.automationSoon.autoAiTitle')
        : feature === 'autoArchive'
          ? t('settings.automationSoon.autoArchiveTitle')
          : feature === 'batchExport'
            ? t('batch.exportProTitle')
            : feature === 'folderColor'
              ? t('folders.colorProTitle')
              : t('appearance.accentColor.proTitle');
  const body =
    feature === 'autoTranscribe'
      ? t('settings.automationSoon.autoTranscribeBody')
      : feature === 'autoAi'
        ? t('settings.automationSoon.autoAiBody')
        : feature === 'autoArchive'
          ? t('settings.automationSoon.autoArchiveBody')
          : feature === 'batchExport'
            ? t('batch.exportProBody')
            : feature === 'folderColor'
              ? t('folders.colorProBody')
              : t('appearance.accentColor.proBody');

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <BottomSheetView
        style={{
          paddingHorizontal: 24,
          paddingTop: 8,
          ...contentPadding,
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
          label={t('common.tryPro')}
          onPress={onUpgradePress ?? onClose}
          color={c}
          activeOpacity={0.85}
          accessibilityLabel={t('common.tryPro')}
        />
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
