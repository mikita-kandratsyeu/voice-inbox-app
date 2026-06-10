import type { TFunction } from 'i18next';
import { Archive, ClipboardList, Zap } from 'lucide-react-native';
import React from 'react';
import { Switch, View } from 'react-native';

import type { AutoArchiveAfterDays } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
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
  onLockedPress,
}: Props) => {
  const showArchiveDelayRow = !automationLocked && autoArchiveEnabled;

  return (
    <SettingsSection title={t('settings.automation')} showTitleProBadge={automationLocked}>
      <SettingsRow
        label={t('settings.autoTranscribeOnSave')}
        subtitle={t('settings.autoTranscribeOnSaveHint')}
        leftIcon={<Zap size={20} color={color.accent.primary} strokeWidth={1.8} />}
        isFirst={!IS_IOS}
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
      />
      <SettingsRow
        label={t('settings.autoAiAfterTranscription')}
        subtitle={t('settings.autoAiAfterTranscriptionHint')}
        leftIcon={<ClipboardList size={20} color={color.accent.primary} strokeWidth={1.8} />}
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
        isLast={!showArchiveDelayRow && !IS_IOS}
      />
      {showArchiveDelayRow ? (
        <SettingsRow
          label={t('settings.autoArchiveDelay')}
          value={t('settings.autoArchiveDelayValue', { count: autoArchiveAfterDays })}
          onPress={onAutoArchiveDelayPress}
          showChevron
          isLast={!IS_IOS}
        />
      ) : null}
    </SettingsSection>
  );
};
