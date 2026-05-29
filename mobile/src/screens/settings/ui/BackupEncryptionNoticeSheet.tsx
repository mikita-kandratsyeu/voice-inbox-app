import { BottomSheetView } from '@gorhom/bottom-sheet';
import { ShieldAlert } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useColors } from '@/shared/config';
import { withAlphaHex } from '@/shared/lib';
import { AppBottomSheetModal, SheetFooterButtons, useBottomSheetContentPadding } from '@/shared/ui';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAcknowledge: () => void;
};

export function BackupEncryptionNoticeSheet({ visible, onClose, onAcknowledge }: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const contentPadding = useBottomSheetContentPadding(24);

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <BottomSheetView
        style={{
          paddingHorizontal: 24,
          paddingTop: 8,
          ...contentPadding,
        }}
      >
        <View className="mb-1 items-center">
          <View
            className="mb-4 h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: c.background.tertiary }}
          >
            <ShieldAlert size={28} color={c.accent.primary} strokeWidth={1.75} />
          </View>
          <Text className="mb-2 text-center text-xl font-bold" style={{ color: c.text.primary }}>
            {t('settings.backupEncryption.noticeTitle')}
          </Text>
          <Text className="mb-4 text-center text-sm leading-5" style={{ color: c.text.secondary }}>
            {t('settings.backupEncryption.noticeBody')}
          </Text>
        </View>

        <View
          className="mb-6 rounded-2xl border px-3.5 py-3"
          style={{
            backgroundColor: c.status.error.bg,
            borderColor: withAlphaHex(c.status.error.text, 0.22),
          }}
        >
          <Text className="text-center text-sm leading-5" style={{ color: c.status.error.text }}>
            {t('settings.backupEncryption.noticeWarning')}
          </Text>
        </View>

        <SheetFooterButtons
          color={c}
          primaryLabel={t('settings.backupEncryption.noticeConfirm')}
          onPrimaryPress={onAcknowledge}
          secondaryLabel={t('common.cancel')}
          onSecondaryPress={onClose}
        />
      </BottomSheetView>
    </AppBottomSheetModal>
  );
}
