import type { TFunction } from 'i18next';
import { Sparkles, Zap } from 'lucide-react-native';
import React from 'react';
import { Switch, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { SettingsRow, SettingsSection } from '@/shared/ui';

import type { AutomationFeatureKind } from '../AutomationComingSoonSheet';

type Props = {
  color: Colors;
  t: TFunction;
  automationLocked: boolean;
  autoTranscribeOnSave: boolean;
  setAutoTranscribeOnSave: (v: boolean) => void;
  autoAiAfterTranscription: boolean;
  setAutoAiAfterTranscription: (v: boolean) => void;
  onLockedPress: (kind: AutomationFeatureKind) => void;
};

export const SettingsAutomationSection = ({
  color,
  t,
  automationLocked,
  autoTranscribeOnSave,
  setAutoTranscribeOnSave,
  autoAiAfterTranscription,
  setAutoAiAfterTranscription,
  onLockedPress,
}: Props) => (
  <SettingsSection title={t('settings.automation')}>
    <SettingsRow
      label={t('settings.autoTranscribeOnSave')}
      leftIcon={<Zap size={20} color={color.accent.transcript} strokeWidth={1.8} />}
      rightSlot={
        <View
          className="flex-row items-center gap-2"
          pointerEvents={automationLocked ? 'none' : 'box-none'}
        >
          <Switch
            disabled={automationLocked}
            value={automationLocked ? false : autoTranscribeOnSave}
            onValueChange={setAutoTranscribeOnSave}
            accessibilityLabel={t('settings.autoTranscribeOnSave')}
            trackColor={{
              false: color.background.tertiary,
              true: color.accent.primary,
            }}
            thumbColor={color.icon.onAccent}
          />
        </View>
      }
      showChevron={false}
      onPress={automationLocked ? () => onLockedPress('autoTranscribe') : undefined}
      isFirst
    />
    <SettingsRow
      label={t('settings.autoAiAfterTranscription')}
      leftIcon={<Sparkles size={20} color={color.accent.primary} strokeWidth={1.8} />}
      rightSlot={
        <View
          className="flex-row items-center gap-2"
          pointerEvents={automationLocked ? 'none' : 'box-none'}
        >
          <Switch
            disabled={automationLocked}
            value={automationLocked ? false : autoAiAfterTranscription}
            onValueChange={setAutoAiAfterTranscription}
            accessibilityLabel={t('settings.autoAiAfterTranscription')}
            trackColor={{
              false: color.background.tertiary,
              true: color.accent.primary,
            }}
            thumbColor={color.icon.onAccent}
          />
        </View>
      }
      showChevron={false}
      onPress={automationLocked ? () => onLockedPress('autoAi') : undefined}
      isLast
    />
  </SettingsSection>
);
