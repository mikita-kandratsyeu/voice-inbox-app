import React from 'react';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { useColors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function IcloudUnavailableSheet({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const color = useColors();

  const openSettings = () => {
    if (IS_IOS) {
      void Linking.openSettings();
    }

    onClose();
  };

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <AppBottomSheetContent useTabletPadding>
        <SheetHeader
          title={t('settings.icloudSync.unavailableSheetTitle')}
          subtitle={t('settings.icloudSync.unavailableSheetBody')}
          color={color}
          marginBottom={24}
        />
        <SheetFooterButtons
          color={color}
          primaryLabel={t('settings.icloudSync.openSettings')}
          onPrimaryPress={openSettings}
          secondaryLabel={t('common.close')}
          onSecondaryPress={onClose}
        />
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
