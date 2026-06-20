import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TFunction } from 'i18next';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SettingsStackParamList } from '@/app/navigation/types';
import { openPlanPaywall } from '@/features/plan-paywall';
import { getSettingsIconColor } from '@/screens/settings/lib/settingsIconColor';
import { AutomationComingSoonSheet } from '@/screens/settings/ui/AutomationComingSoonSheet';
import type { Colors } from '@/shared/config';
import { formatRelativeTime, IS_IOS } from '@/shared/lib';
import { SettingsRow } from '@/shared/ui';

import { useIcloudSync } from '../model/useIcloudSync';
import { IcloudIcon } from './IcloudIcon';
import { IcloudUnavailableSheet } from './IcloudUnavailableSheet';

type Props = {
  color: Colors;
  t: TFunction;
  suppressProBadge?: boolean;
  onLockedPress?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
};

export function SettingsIcloudSyncRows({
  color,
  t,
  suppressProBadge = false,
  onLockedPress,
  isFirst,
  isLast = false,
}: Props) {
  const { i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { isProActive, enabled, isSyncing, lastSyncedAt, refreshState, enableSync } =
    useIcloudSync();

  const [proSheetVisible, setProSheetVisible] = useState(false);
  const [unavailableVisible, setUnavailableVisible] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshState();
    }, [refreshState]),
  );

  const handleLockedPress = useCallback(() => {
    if (onLockedPress) {
      onLockedPress();
      return;
    }
    setProSheetVisible(true);
  }, [onLockedPress]);

  const handleEnable = useCallback(async () => {
    if (!isProActive) {
      handleLockedPress();
      return;
    }
    setIsEnabling(true);
    try {
      const result = await enableSync();
      if (!result.ok) {
        setUnavailableVisible(true);
        return;
      }
      navigation.navigate('IcloudSync');
    } finally {
      setIsEnabling(false);
    }
  }, [enableSync, handleLockedPress, isProActive, navigation]);

  if (!IS_IOS) {
    return null;
  }

  const syncSubtitle = isSyncing
    ? t('settings.icloudSync.syncing')
    : lastSyncedAt != null
      ? t('settings.icloudSync.lastSynced', {
          time: formatRelativeTime(lastSyncedAt, i18n.language),
        })
      : t('settings.icloudSync.neverSynced');

  let rows: React.ReactNode;

  if (!isProActive) {
    rows = (
      <SettingsRow
        label={t('settings.icloudSync.connect')}
        subtitle={t('settings.icloudSync.connectHint')}
        leftIcon={<IcloudIcon size={20} color={getSettingsIconColor(color, 'icloud')} />}
        showProBadge={!suppressProBadge}
        onPress={handleLockedPress}
        isFirst={isFirst}
        isLast={isLast}
      />
    );
  } else if (!enabled) {
    rows = (
      <SettingsRow
        label={isEnabling ? t('settings.icloudSync.enabling') : t('settings.icloudSync.connect')}
        subtitle={t('settings.icloudSync.connectHint')}
        leftIcon={<IcloudIcon size={20} color={getSettingsIconColor(color, 'icloud')} />}
        loading={isEnabling}
        onPress={() => void handleEnable()}
        isFirst={isFirst}
        isLast={isLast}
      />
    );
  } else {
    rows = (
      <SettingsRow
        label={t('settings.icloudSync.settingsRowTitle')}
        subtitle={syncSubtitle}
        leftIcon={<IcloudIcon size={20} color={getSettingsIconColor(color, 'icloud')} />}
        loading={isSyncing}
        onPress={() => navigation.navigate('IcloudSync')}
        isFirst={isFirst}
        isLast={isLast}
      />
    );
  }

  return (
    <>
      {rows}
      <IcloudUnavailableSheet
        visible={unavailableVisible}
        onClose={() => setUnavailableVisible(false)}
      />
      {!onLockedPress ? (
        <AutomationComingSoonSheet
          visible={proSheetVisible}
          feature="icloudSync"
          onUpgradePress={() => {
            setProSheetVisible(false);
            openPlanPaywall();
          }}
          onClose={() => setProSheetVisible(false)}
        />
      ) : null}
    </>
  );
}
