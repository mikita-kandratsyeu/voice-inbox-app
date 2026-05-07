import type { TFunction } from 'i18next';
import { Archive, CalendarDays, Sparkles, Zap } from 'lucide-react-native';
import React from 'react';
import { Switch, View } from 'react-native';

import type { AutoArchiveAfterDays } from '@/entities/settings';
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
  autoArchiveEnabled: boolean;
  setAutoArchiveEnabled: (v: boolean) => void;
  autoArchiveAfterDays: AutoArchiveAfterDays;
  onAutoArchiveDelayPress: () => void;
  onOpenDigest: () => void;
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
  autoArchiveEnabled,
  setAutoArchiveEnabled,
  autoArchiveAfterDays,
  onAutoArchiveDelayPress,
  onOpenDigest,
  onLockedPress,
}: Props) => {
  const showArchiveDelayRow = !automationLocked && autoArchiveEnabled;

  return (
    <SettingsSection title={t('settings.automation')}>
      <SettingsRow
        label={t('settings.autoTranscribeOnSave')}
        subtitle={t('settings.autoTranscribeOnSaveHint')}
        leftIcon={<Zap size={20} color={color.accent.primary} strokeWidth={1.8} />}
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
        subtitle={t('settings.autoAiAfterTranscriptionHint')}
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
      />
      <SettingsRow
        label={t('settings.autoArchiveReadNotes')}
        subtitle={t('settings.autoArchiveReadNotesHint')}
        leftIcon={<Archive size={20} color={color.accent.primary} strokeWidth={1.8} />}
        rightSlot={
          <View
            className="flex-row items-center gap-2"
            pointerEvents={automationLocked ? 'none' : 'box-none'}
          >
            <Switch
              disabled={automationLocked}
              value={automationLocked ? false : autoArchiveEnabled}
              onValueChange={setAutoArchiveEnabled}
              accessibilityLabel={t('settings.autoArchiveReadNotes')}
              trackColor={{
                false: color.background.tertiary,
                true: color.accent.primary,
              }}
              thumbColor={color.icon.onAccent}
            />
          </View>
        }
        showChevron={false}
        onPress={automationLocked ? () => onLockedPress('autoArchive') : undefined}
      />
      {showArchiveDelayRow ? (
        <SettingsRow
          label={t('settings.autoArchiveDelay')}
          value={t('settings.autoArchiveDelayValue', { count: autoArchiveAfterDays })}
          onPress={onAutoArchiveDelayPress}
          showChevron
        />
      ) : null}
      <SettingsRow
        label={t('settings.digest.title')}
        subtitle={t('settings.digest.settingsSubtitle')}
        leftIcon={<CalendarDays size={20} color={color.accent.primary} strokeWidth={1.8} />}
        onPress={onOpenDigest}
        isLast
      />
    </SettingsSection>
  );
};
