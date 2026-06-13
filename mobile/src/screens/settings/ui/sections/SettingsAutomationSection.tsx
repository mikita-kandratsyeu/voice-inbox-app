import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TFunction } from 'i18next';
import { Archive, ClipboardList, Layers, Zap } from 'lucide-react-native';
import React from 'react';
import { Switch, View } from 'react-native';

import type { SettingsStackParamList } from '@/app/navigation/types';
import type { AutoArchiveAfterDays } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import { SettingsRow, SettingsSection } from '@/shared/ui';

import { getSettingsIconColor } from '../../lib/settingsIconColor';
import type { AutomationFeatureKind } from '../AutomationComingSoonSheet';

type Props = {
  color: Colors;
  t: TFunction;
  automationLocked: boolean;
  autoAiLocked?: boolean;
  autoTranscribeOnSave: boolean;
  setAutoTranscribeOnSave: (v: boolean) => void;
  autoAiAfterTranscription: boolean;
  setAutoAiAfterTranscription: (v: boolean) => void;
  autoArchiveEnabled: boolean;
  setAutoArchiveEnabled: (v: boolean) => void;
  autoArchiveAfterDays: AutoArchiveAfterDays;
  onAutoArchiveDelayPress: () => void;
  onLockedPress: (kind: AutomationFeatureKind) => void;
  showAutoAiRow?: boolean;
  showAutoArchiveRow?: boolean;
  navigation?: NativeStackNavigationProp<SettingsStackParamList>;
  showPrivateAiQueueRow?: boolean;
  privateAiQueueCount?: number;
};

export const SettingsAutomationSection = ({
  color,
  t,
  automationLocked,
  autoAiLocked,
  autoTranscribeOnSave,
  setAutoTranscribeOnSave,
  autoAiAfterTranscription,
  setAutoAiAfterTranscription,
  autoArchiveEnabled,
  setAutoArchiveEnabled,
  autoArchiveAfterDays,
  onAutoArchiveDelayPress,
  onLockedPress,
  showAutoAiRow = true,
  showAutoArchiveRow = true,
  navigation,
  showPrivateAiQueueRow = false,
  privateAiQueueCount = 0,
}: Props) => {
  const transcribeLocked = automationLocked;
  const summaryLocked = autoAiLocked ?? automationLocked;
  const archiveLocked = automationLocked;
  const showArchiveDelayRow = !archiveLocked && autoArchiveEnabled && showAutoArchiveRow;
  const showPrivateAiQueue =
    showPrivateAiQueueRow && autoAiAfterTranscription && !summaryLocked && navigation != null;

  return (
    <SettingsSection title={t('settings.automation')} showTitleProBadge={automationLocked}>
      <SettingsRow
        label={t('settings.autoTranscribeOnSave')}
        subtitle={t('settings.autoTranscribeOnSaveHint')}
        leftIcon={<Zap size={20} color={getSettingsIconColor(color, 'zap')} strokeWidth={1.8} />}
        isFirst={!IS_IOS}
        rightSlot={
          <View
            className="flex-row items-center gap-2"
            pointerEvents={transcribeLocked ? 'none' : 'box-none'}
          >
            <Switch
              disabled={transcribeLocked}
              value={transcribeLocked ? false : autoTranscribeOnSave}
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
        onPress={transcribeLocked ? () => onLockedPress('autoTranscribe') : undefined}
        isLast={!showAutoAiRow && !showAutoArchiveRow && !showArchiveDelayRow && !IS_IOS}
      />
      {showAutoAiRow ? (
        <SettingsRow
          label={t('settings.autoAiAfterTranscription')}
          subtitle={t('settings.autoAiAfterTranscriptionHint')}
          leftIcon={
            <ClipboardList
              size={20}
              color={getSettingsIconColor(color, 'clipboardList')}
              strokeWidth={1.8}
            />
          }
          rightSlot={
            <View
              className="flex-row items-center gap-2"
              pointerEvents={summaryLocked ? 'none' : 'box-none'}
            >
              <Switch
                disabled={summaryLocked}
                value={summaryLocked ? false : autoAiAfterTranscription}
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
          onPress={summaryLocked ? () => onLockedPress('autoAi') : undefined}
          isLast={!showPrivateAiQueue && !showAutoArchiveRow && !showArchiveDelayRow && !IS_IOS}
        />
      ) : null}
      {showPrivateAiQueue ? (
        <SettingsRow
          label={t('privateAiQueue.title')}
          subtitle={t('privateAiQueue.automationHint')}
          value={
            privateAiQueueCount > 0
              ? t('privateAiQueue.pendingCount', { count: privateAiQueueCount })
              : undefined
          }
          leftIcon={
            <Layers size={20} color={getSettingsIconColor(color, 'layers')} strokeWidth={1.8} />
          }
          onPress={() => navigation.navigate('PrivateAiQueue')}
          showChevron
          isLast={!showAutoArchiveRow && !showArchiveDelayRow && !IS_IOS}
        />
      ) : null}
      {showAutoArchiveRow ? (
        <SettingsRow
          label={t('settings.autoArchiveReadNotes')}
          subtitle={t('settings.autoArchiveReadNotesHint')}
          leftIcon={
            <Archive size={20} color={getSettingsIconColor(color, 'archive')} strokeWidth={1.8} />
          }
          rightSlot={
            <View
              className="flex-row items-center gap-2"
              pointerEvents={archiveLocked ? 'none' : 'box-none'}
            >
              <Switch
                disabled={archiveLocked}
                value={archiveLocked ? false : autoArchiveEnabled}
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
          onPress={archiveLocked ? () => onLockedPress('autoArchive') : undefined}
          isLast={!showArchiveDelayRow && !IS_IOS}
        />
      ) : null}
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
