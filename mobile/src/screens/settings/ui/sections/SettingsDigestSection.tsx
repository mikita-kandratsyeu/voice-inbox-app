import type { TFunction } from 'i18next';
import { Command, Newspaper, Smartphone } from 'lucide-react-native';
import React from 'react';
import { Switch, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import { SettingsRow, SettingsSection } from '@/shared/ui';

import { getSettingsIconColor } from '../../lib/settingsIconColor';

type Props = {
  color: Colors;
  onOpenDigest: () => void;
  onOpenSiriShortcuts: () => void;
  shakeToRecordEnabled: boolean;
  setShakeToRecordEnabled: (value: boolean) => void;
  t: TFunction;
};

export const SettingsDigestSection = ({
  color,
  t,
  onOpenDigest,
  onOpenSiriShortcuts,
  shakeToRecordEnabled,
  setShakeToRecordEnabled,
}: Props) => {
  const showSiri = IS_IOS;

  return (
    <SettingsSection title={t('settings.digest.sectionTitle')}>
      <SettingsRow
        label={t('settings.shakeToRecord.title')}
        subtitle={t('settings.shakeToRecord.subtitle')}
        leftIcon={
          <Smartphone size={20} color={getSettingsIconColor(color, 'mic')} strokeWidth={1.8} />
        }
        isFirst
        rightSlot={
          <View className="flex-row items-center gap-2" pointerEvents="box-none">
            <Switch
              value={shakeToRecordEnabled}
              onValueChange={setShakeToRecordEnabled}
              accessibilityLabel={t('settings.shakeToRecord.title')}
              trackColor={{
                false: color.background.tertiary,
                true: color.accent.primary,
              }}
              thumbColor={color.icon.onAccent}
            />
          </View>
        }
        showChevron={false}
      />
      <SettingsRow
        label={t('settings.digest.title')}
        subtitle={t('settings.digest.settingsSubtitle')}
        leftIcon={
          <Newspaper size={20} color={getSettingsIconColor(color, 'newspaper')} strokeWidth={1.8} />
        }
        onPress={onOpenDigest}
        showChevron
        isLast={!showSiri}
      />
      {showSiri ? (
        <SettingsRow
          label={t('settings.siriShortcuts.entryTitle')}
          subtitle={t('settings.siriShortcuts.entrySubtitle')}
          leftIcon={
            <Command size={20} color={getSettingsIconColor(color, 'command')} strokeWidth={1.8} />
          }
          onPress={onOpenSiriShortcuts}
          isLast
        />
      ) : null}
    </SettingsSection>
  );
};
