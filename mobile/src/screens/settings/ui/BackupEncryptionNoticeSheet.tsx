import { ShieldAlert } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useColors } from '@/shared/config';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

import { BackupEncryptionWarningBanner } from './BackupEncryptionWarningBanner';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAcknowledge: () => void;
};

export function BackupEncryptionNoticeSheet({ visible, onClose, onAcknowledge }: Props) {
  const { t } = useTranslation();
  const c = useColors();

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <AppBottomSheetContent useTabletPadding>
        <SheetHeader
          title={t('settings.backupEncryption.noticeTitle')}
          subtitle={t('settings.backupEncryption.noticeBody')}
          icon={<ShieldAlert size={28} color={c.accent.primary} strokeWidth={1.75} />}
          color={c}
          marginBottom={16}
        />

        <BackupEncryptionWarningBanner style={{ marginBottom: 24 }}>
          {t('settings.backupEncryption.noticeWarning')}
        </BackupEncryptionWarningBanner>

        <SheetFooterButtons
          color={c}
          primaryLabel={t('settings.backupEncryption.noticeConfirm')}
          onPrimaryPress={onAcknowledge}
          secondaryLabel={t('common.cancel')}
          onSecondaryPress={onClose}
        />
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
