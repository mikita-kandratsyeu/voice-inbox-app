import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CalendarClock, FolderOpen, History, RefreshCw, Unplug } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import type { SettingsStackParamList } from '@/app/navigation/types';
import { getSettingsIconColor } from '@/screens/settings/lib/settingsIconColor';
import { useColors } from '@/shared/config';
import { formatRelativeTime, useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import {
  FrostedHeaderIconButton,
  SCREEN_PADDING,
  ScreenHeader,
  SettingsRow,
  SettingsSection,
} from '@/shared/ui';

import type { IcloudSyncVersionSummary } from '../lib/fetchIcloudSyncHistory';
import type { IcloudSyncAutoIntervalHours } from '../lib/icloudSyncState';
import { useIcloudSync } from '../model/useIcloudSync';
import { IcloudSyncAutoIntervalSheet } from './IcloudSyncAutoIntervalSheet';
import { IcloudSyncHistorySheet } from './IcloudSyncHistorySheet';

function autoIntervalLabelKey(hours: IcloudSyncAutoIntervalHours): string {
  return `settings.icloudSync.autoInterval.h${hours}`;
}

export function IcloudSyncScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);

  useEffect(() => {
    isFocusedRef.current = isFocused;
  }, [isFocused]);

  const { t, i18n } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();

  const {
    loadHistory,
    isSyncing,
    lastSyncedAt,
    autoSyncEnabled,
    autoSyncIntervalHours,
    history,
    isLoadingHistory,
    disconnect,
    syncNow,
    restoreVersion,
    setAutoSyncEnabled,
    setAutoSyncIntervalHours,
  } = useIcloudSync();

  const [historyVisible, setHistoryVisible] = useState(false);
  const [intervalSheetVisible, setIntervalSheetVisible] = useState(false);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);

  const handleSync = useCallback(async () => {
    const result = await syncNow();
    if (!isFocusedRef.current) {
      return;
    }
    if (!result.ok) {
      if (result.code === 'sync_in_progress' || result.code === 'sync_cooldown') {
        return;
      }
      if (result.code === 'icloud_unavailable') {
        Alert.alert(t('common.error'), t('settings.icloudSync.unavailableSheetTitle'));
        return;
      }
      if (result.code === 'icloud_quota_exceeded') {
        Alert.alert(t('common.error'), t('settings.icloudSync.quotaExceeded'));
        return;
      }
      if (result.code === 'sync_timeout') {
        Alert.alert(t('common.error'), t('settings.icloudSync.syncTimeout'));
        return;
      }
      Alert.alert(
        t('common.error'),
        'message' in result && result.message
          ? result.message
          : t('settings.icloudSync.syncFailed'),
      );
      return;
    }
    if (result.alreadyUpToDate) {
      Alert.alert(t('common.done'), t('settings.icloudSync.alreadyUpToDate'));
      return;
    }
    Alert.alert(t('common.done'), t('settings.icloudSync.syncSuccess'));
  }, [syncNow, t]);

  const handleRestoreVersion = useCallback(
    (version: IcloudSyncVersionSummary) => {
      Alert.alert(t('settings.icloudSync.restoreTitle'), t('settings.icloudSync.restoreMessage'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.icloudSync.restoreConfirm'),
          onPress: () => {
            void (async () => {
              setRestoringVersionId(version.versionId);
              try {
                const result = await restoreVersion(version.versionId);
                if (!isFocusedRef.current) {
                  return;
                }
                if (!result.ok) {
                  Alert.alert(t('common.error'), t('settings.icloudSync.restoreFailed'));
                  return;
                }
                setHistoryVisible(false);
                navigation.navigate('ImportRecords', {
                  records: result.importResult.records,
                  folders: result.importResult.folders,
                  legacyFolders: result.importResult.legacyFolders,
                  graphLayouts: result.importResult.graphLayouts,
                  remoteSyncAuxiliary: result.auxiliaryData,
                  icloudRestore: {
                    versionId: version.versionId,
                    exportedAt: result.exportedAt,
                  },
                });
              } finally {
                setRestoringVersionId(null);
              }
            })();
          },
        },
      ]);
    },
    [navigation, restoreVersion, t],
  );

  const handleDisconnect = useCallback(() => {
    Alert.alert(
      t('settings.icloudSync.disconnectTitle'),
      t('settings.icloudSync.disconnectMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.icloudSync.disconnectConfirm'),
          style: 'destructive',
          onPress: () => {
            disconnect();
            navigation.goBack();
          },
        },
      ],
    );
  }, [disconnect, navigation, t]);

  const syncSubtitle =
    lastSyncedAt != null
      ? t('settings.icloudSync.lastSynced', {
          time: formatRelativeTime(lastSyncedAt, i18n.language),
        })
      : t('settings.icloudSync.neverSynced');

  const infoTextStyle = {
    color: color.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  } as const;

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader
        title={t('settings.icloudSync.sectionTitle')}
        onBack={() => navigation.goBack()}
        rightSlot={
          <FrostedHeaderIconButton
            iconOnly
            variant="icon"
            size="md"
            accessibilityLabel={t('settings.icloudSync.disconnect')}
            icon={<Unplug size={18} color={color.status.error.text} strokeWidth={2.2} />}
            color={color}
            onPress={handleDisconnect}
          />
        }
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PADDING,
          paddingTop: 16,
          paddingBottom: getFloatingTabBarScrollPaddingBottom(insets.bottom, isTablet),
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth ?? windowWidth,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="mb-4 text-[14px] leading-5" style={{ color: color.text.secondary }}>
          {t('settings.icloudSync.plaintextWarning')}
        </Text>
        <Text className="mb-4 text-[14px] leading-5" style={{ color: color.text.secondary }}>
          {t('settings.icloudSync.audioRestoreHint')}
        </Text>

        <SettingsSection title={t('settings.icloudSync.connectedSectionTitle')}>
          <SettingsRow
            label={t('settings.icloudSync.locationRow')}
            subtitle={t('settings.icloudSync.locationSubtitle')}
            leftIcon={
              <FolderOpen
                size={20}
                color={getSettingsIconColor(color, 'uploadCloud')}
                strokeWidth={1.8}
              />
            }
            showChevron={false}
            isFirst
          />
          <SettingsRow
            label={isSyncing ? t('settings.icloudSync.syncing') : t('settings.icloudSync.syncNow')}
            subtitle={syncSubtitle}
            leftIcon={
              <RefreshCw
                size={20}
                color={getSettingsIconColor(color, 'refreshCw')}
                strokeWidth={1.8}
              />
            }
            loading={isSyncing}
            onPress={isSyncing ? undefined : () => void handleSync()}
          />
          <SettingsRow
            label={t('settings.icloudSync.history')}
            leftIcon={<History size={20} color={color.accent.cache} strokeWidth={1.8} />}
            onPress={() => setHistoryVisible(true)}
            isLast
          />
        </SettingsSection>

        <SettingsSection title={t('settings.icloudSync.scheduleSectionTitle')}>
          <SettingsRow
            label={t('settings.icloudSync.autoSync')}
            subtitle={t('settings.icloudSync.autoSyncHint')}
            leftIcon={
              <CalendarClock
                size={20}
                color={getSettingsIconColor(color, 'calendarClock')}
                strokeWidth={1.8}
              />
            }
            rightSlot={
              <Switch
                value={autoSyncEnabled}
                onValueChange={setAutoSyncEnabled}
                accessibilityLabel={t('settings.icloudSync.autoSync')}
                trackColor={{
                  false: color.background.tertiary,
                  true: color.accent.primary,
                }}
                thumbColor={color.icon.onAccent}
              />
            }
            showChevron={false}
            isFirst
            isLast={!autoSyncEnabled}
          />
          {autoSyncEnabled ? (
            <SettingsRow
              label={t('settings.icloudSync.autoIntervalRow')}
              value={t(autoIntervalLabelKey(autoSyncIntervalHours))}
              onPress={() => setIntervalSheetVisible(true)}
              isLast
            />
          ) : null}
        </SettingsSection>

        <SettingsSection title={t('settings.icloudSync.aboutSectionTitle')}>
          <View
            className="rounded-2xl px-4 py-3.5"
            style={{ backgroundColor: color.background.card }}
          >
            <Text style={infoTextStyle}>{t('settings.icloudSync.storageHint')}</Text>
            <Text style={[infoTextStyle, { marginTop: 12 }]}>
              {t('settings.icloudSync.multiDeviceHint')}
            </Text>
            <Text style={[infoTextStyle, { marginTop: 12 }]}>
              {t('settings.icloudSync.filesEditHint')}
            </Text>
          </View>
        </SettingsSection>
      </ScrollView>

      <IcloudSyncHistorySheet
        visible={historyVisible}
        color={color}
        versions={history}
        loading={isLoadingHistory}
        restoringVersionId={restoringVersionId}
        onClose={() => setHistoryVisible(false)}
        onLoad={() => void loadHistory()}
        onRestore={handleRestoreVersion}
      />
      <IcloudSyncAutoIntervalSheet
        visible={intervalSheetVisible}
        color={color}
        selectedHours={autoSyncIntervalHours}
        onSelect={(hours) => {
          setAutoSyncIntervalHours(hours);
          setIntervalSheetVisible(false);
        }}
        onClose={() => setIntervalSheetVisible(false)}
      />
    </View>
  );
}
