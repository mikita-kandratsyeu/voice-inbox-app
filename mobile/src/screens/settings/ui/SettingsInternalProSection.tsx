import { Sparkles } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { isTestflightInternalBuild } from '@/features/app-storefront/lib/testflightInternalBuild';
import { ProLicenseKeyModal, useProEntitlement } from '@/features/pro-license';
import type { Colors } from '@/shared/config/colors';
import { SettingsRow, SettingsSection } from '@/shared/ui';

type SettingsInternalProSectionProps = {
  color: Colors;
};

export function SettingsInternalProSection({ color }: SettingsInternalProSectionProps) {
  const { t } = useTranslation();
  const [proModalVisible, setProModalVisible] = useState(false);
  const { refresh: refreshProEntitlement } = useProEntitlement();

  const onActivated = useCallback(() => {
    void refreshProEntitlement({ force: true });
  }, [refreshProEntitlement]);

  if (!isTestflightInternalBuild()) {
    return null;
  }

  return (
    <>
      <ProLicenseKeyModal
        visible={proModalVisible}
        onClose={() => setProModalVisible(false)}
        onActivated={onActivated}
      />
      <SettingsSection title={t('settings.internalBuildSection')}>
        <SettingsRow
          label={t('settings.activatePro')}
          leftIcon={<Sparkles size={20} color={color.accent.primary} strokeWidth={1.8} />}
          onPress={() => setProModalVisible(true)}
          isFirst
          isLast
        />
      </SettingsSection>
    </>
  );
}
