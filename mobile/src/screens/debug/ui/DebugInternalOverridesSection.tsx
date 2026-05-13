import { Ban, Crown } from 'lucide-react-native';
import React, { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { isInternalDebugBuild } from '@/shared/config/buildEnv';
import {
  getInternalDebugDisableAdsSnapshot,
  getInternalDebugForceProSnapshot,
  setInternalDebugDisableAdsSync,
  setInternalDebugForceProSync,
  subscribeInternalDebugDisableAds,
  subscribeInternalDebugForcePro,
} from '@/shared/lib/internal-debug/internalDebugFlags';
import { SettingsRow, SettingsSection } from '@/shared/ui';

type Props = {
  color: Colors;
};

export function DebugInternalOverridesSection({ color }: Props) {
  const { t } = useTranslation();
  const gate = isInternalDebugBuild();
  const forcePro = useSyncExternalStore(
    subscribeInternalDebugForcePro,
    getInternalDebugForceProSnapshot,
    getInternalDebugForceProSnapshot,
  );
  const disableAds = useSyncExternalStore(
    subscribeInternalDebugDisableAds,
    getInternalDebugDisableAdsSnapshot,
    getInternalDebugDisableAdsSnapshot,
  );

  if (!gate) {
    return null;
  }

  return (
    <SettingsSection title={t('settings.debugScreen.internalOverridesSection')}>
      <SettingsRow
        label={t('settings.debugScreen.disableAds')}
        subtitle={t('settings.debugScreen.disableAdsSubtitle')}
        leftIcon={<Ban size={20} color={color.icon.muted} strokeWidth={1.8} />}
        rightSlot={
          <View pointerEvents="box-none">
            <Switch
              value={disableAds}
              onValueChange={setInternalDebugDisableAdsSync}
              accessibilityLabel={t('settings.debugScreen.disableAds')}
              trackColor={{
                false: color.background.tertiary,
                true: color.accent.primary,
              }}
              thumbColor={color.icon.onAccent}
            />
          </View>
        }
        showChevron={false}
        isFirst
        isLast={false}
      />
      <SettingsRow
        label={t('settings.debugScreen.forcePro')}
        subtitle={t('settings.debugScreen.forceProSubtitle')}
        leftIcon={<Crown size={20} color={color.icon.muted} strokeWidth={1.8} />}
        rightSlot={
          <View pointerEvents="box-none">
            <Switch
              value={forcePro}
              onValueChange={setInternalDebugForceProSync}
              accessibilityLabel={t('settings.debugScreen.forcePro')}
              trackColor={{
                false: color.background.tertiary,
                true: color.accent.primary,
              }}
              thumbColor={color.icon.onAccent}
            />
          </View>
        }
        showChevron={false}
        isFirst={false}
        isLast
      />
    </SettingsSection>
  );
}
