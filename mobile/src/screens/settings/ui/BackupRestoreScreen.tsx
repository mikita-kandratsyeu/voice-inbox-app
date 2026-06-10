import { useNavigation } from '@react-navigation/native';
import { Download, LockKeyhole, UploadCloud } from 'lucide-react-native';
import React from 'react';
import { ScrollView, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getFloatingTabBarScrollPaddingBottom } from '@/app/navigation/config';
import { useRecordStore } from '@/entities/record';
import { useIsTablet, useTabletContentMaxWidth } from '@/shared/lib';
import { SCREEN_PADDING, ScreenHeader, SettingsRow, SettingsSection } from '@/shared/ui';

import { useBackupRestoreScreen } from '../lib/useBackupRestoreScreen';
import { BackupEncryptionNoticeSheet } from './BackupEncryptionNoticeSheet';
import { BackupPasswordSheet } from './BackupPasswordSheet';

export const BackupRestoreScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const recordsCount = useRecordStore((s) => s.records.length);
  const screen = useBackupRestoreScreen();

  return (
    <View style={{ flex: 1, backgroundColor: screen.color.background.secondary }}>
      <ScreenHeader
        title={screen.t('settings.backupRestoreScreen.title')}
        onBack={() => navigation.goBack()}
      />
      <>
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
          <Text
            className="mb-4 text-[14px] leading-5"
            style={{ color: screen.color.text.secondary }}
          >
            {screen.t('settings.backupRestoreScreen.intro')}
          </Text>

          <SettingsSection title={screen.t('settings.backupRestoreScreen.sectionTitle')}>
            <SettingsRow
              label={screen.t('settings.backupEncryption.toggleLabel')}
              subtitle={screen.t('settings.backupEncryption.toggleHint')}
              leftIcon={
                <LockKeyhole size={20} color={screen.color.accent.primary} strokeWidth={1.8} />
              }
              rightSlot={
                <Switch
                  value={screen.backupEncryptEnabled}
                  onValueChange={screen.handleEncryptBackupChange}
                  accessibilityLabel={screen.t('settings.backupEncryption.toggleLabel')}
                  trackColor={{
                    false: screen.color.background.tertiary,
                    true: screen.color.accent.primary,
                  }}
                  thumbColor={screen.color.icon.onAccent}
                />
              }
              showChevron={false}
              isFirst
            />
            <SettingsRow
              label={
                screen.isExporting ? screen.t('settings.exporting') : screen.t('settings.export')
              }
              value={screen.t('inbox.recordsCount', { count: recordsCount })}
              leftIcon={
                <UploadCloud size={20} color={screen.color.accent.primary} strokeWidth={1.8} />
              }
              loading={screen.isExporting}
              onPress={screen.handleExport}
            />
            <SettingsRow
              label={
                screen.isImporting ? screen.t('settings.importing') : screen.t('settings.import')
              }
              leftIcon={
                <Download size={20} color={screen.color.accent.primary} strokeWidth={1.8} />
              }
              loading={screen.isImporting}
              onPress={() => void screen.handleImport()}
              isLast
            />
          </SettingsSection>
        </ScrollView>
        <BackupEncryptionNoticeSheet
          visible={screen.backupNoticeSheetVisible}
          onClose={screen.handleBackupNoticeClose}
          onAcknowledge={screen.handleBackupNoticeAcknowledge}
        />
        <BackupPasswordSheet
          visible={screen.backupPasswordSheetVisible}
          mode={screen.backupPasswordSheetMode}
          busy={screen.isExporting || screen.isImporting}
          onClose={screen.handleBackupPasswordSheetClose}
          onSubmit={(password) => void screen.handleBackupPasswordSubmit(password)}
        />
      </>
    </View>
  );
};
