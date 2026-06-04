import type { TFunction } from 'i18next';
import { Newspaper } from 'lucide-react-native';
import { Command } from 'lucide-react-native';
import React from 'react';

import type { Colors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import { SettingsRow, SettingsSection } from '@/shared/ui';

type Props = {
  color: Colors;
  onOpenDigest: () => void;
  onOpenSiriShortcuts: () => void;
  t: TFunction;
};

export const SettingsDigestSection = ({ color, t, onOpenDigest, onOpenSiriShortcuts }: Props) => {
  return (
    <SettingsSection title={t('settings.digest.sectionTitle')}>
      <SettingsRow
        label={t('settings.digest.title')}
        subtitle={t('settings.digest.settingsSubtitle')}
        leftIcon={<Newspaper size={20} color={color.accent.transcript} strokeWidth={1.8} />}
        onPress={onOpenDigest}
        showChevron
        isFirst
      />
      {IS_IOS ? (
        <SettingsRow
          label={t('settings.siriShortcuts.entryTitle')}
          subtitle={t('settings.siriShortcuts.entrySubtitle')}
          leftIcon={<Command size={20} color={color.accent.pin} strokeWidth={1.8} />}
          onPress={onOpenSiriShortcuts}
          isLast
        />
      ) : null}
    </SettingsSection>
  );
};
