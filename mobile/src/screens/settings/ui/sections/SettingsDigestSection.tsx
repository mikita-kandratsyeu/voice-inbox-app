import type { TFunction } from 'i18next';
import { Newspaper } from 'lucide-react-native';
import React from 'react';

import type { Colors } from '@/shared/config';
import { SettingsRow, SettingsSection } from '@/shared/ui';

type Props = {
  color: Colors;
  t: TFunction;
  onOpenDigest: () => void;
};

export const SettingsDigestSection = ({ color, t, onOpenDigest }: Props) => {
  return (
    <SettingsSection title={t('settings.digest.sectionTitle')}>
      <SettingsRow
        label={t('settings.digest.title')}
        subtitle={t('settings.digest.settingsSubtitle')}
        leftIcon={<Newspaper size={20} color={color.accent.transcript} strokeWidth={1.8} />}
        onPress={onOpenDigest}
        showChevron
        isFirst
        isLast
      />
    </SettingsSection>
  );
};
