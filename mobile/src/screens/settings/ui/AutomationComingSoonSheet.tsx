import { Crown } from 'lucide-react-native';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useColors } from '@/shared/config';
import { logAnalyticsEvent } from '@/shared/lib/analytics';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

export type AutomationFeatureKind =
  | 'autoTranscribe'
  | 'autoAi'
  | 'autoArchive'
  | 'accentColor'
  | 'folderColor'
  | 'batchExport'
  | 'premiumAiModel'
  | 'privateCustomServer'
  | 'notesGraph'
  | 'githubSync';

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
                  : feature === 'premiumAiModel'
                    ? 'premium_ai_model'
                    : feature === 'privateCustomServer'
                      ? 'private_custom_server'
                      : feature === 'notesGraph'
                        ? 'notes_graph'
                        : feature === 'githubSync'
                          ? 'github_sync'
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
    } else if (feature === 'premiumAiModel') {
      void logAnalyticsEvent('premium_feature_tapped_ai_model', {
        surface: 'ai_model_picker',
      });
    } else if (feature === 'privateCustomServer') {
      void logAnalyticsEvent('premium_feature_tapped_private_server', {
        surface: 'ai_settings',
      });
    } else if (feature === 'notesGraph') {
      void logAnalyticsEvent('premium_feature_tapped_notes_graph', {
        surface: 'inbox_menu',
      });
    } else if (feature === 'githubSync') {
      void logAnalyticsEvent('premium_feature_tapped_github_sync', {
        surface: 'settings_backup',
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
              : feature === 'premiumAiModel'
                ? t('aiModels.proModelTitle')
                : feature === 'privateCustomServer'
                  ? t('aiSettings.privateProvider.proTitle')
                  : feature === 'notesGraph'
                    ? t('notesGraph.proTitle')
                    : feature === 'githubSync'
                      ? t('settings.githubSync.proTitle')
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
              : feature === 'premiumAiModel'
                ? t('aiModels.proModelBody')
                : feature === 'privateCustomServer'
                  ? t('aiSettings.privateProvider.proBody')
                  : feature === 'notesGraph'
                    ? t('notesGraph.proBody')
                    : feature === 'githubSync'
                      ? t('settings.githubSync.proBody')
                      : t('appearance.accentColor.proBody');

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <AppBottomSheetContent useTabletPadding>
        <SheetHeader
          title={title}
          subtitle={body}
          icon={<Crown size={28} color={c.accent.primary} strokeWidth={1.75} />}
          color={c}
          marginBottom={24}
        />
        <SheetFooterButtons
          color={c}
          primaryLabel={t('common.tryPro')}
          onPrimaryPress={onUpgradePress ?? onClose}
          primaryAccessibilityLabel={t('common.tryPro')}
        />
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
