import React from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, ScrollView } from 'react-native';

import { useColors } from '@/shared/config';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  NoteMarkdown,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

import { usePushSheet } from './usePushSheet';

const MAX_CONTENT_HEIGHT = Dimensions.get('window').height * 0.4;

export const PushNotificationSheet = () => {
  const { t } = useTranslation();
  const color = useColors();
  const { visible, message, type, hide } = usePushSheet();

  const title =
    type === 'limit_exceeded' ? t('push.limitExceededTitle') : t('push.policyUpdateTitle');

  return (
    <AppBottomSheetModal
      visible={visible}
      onClose={hide}
      surface="card"
      backdrop="blocking"
      enablePanDownToClose={false}
    >
      <AppBottomSheetContent bottomPadding={24}>
        <SheetHeader title={title} color={color} marginBottom={12} />

        {Boolean(message) && (
          <ScrollView
            style={{ maxHeight: MAX_CONTENT_HEIGHT }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4 }}
          >
            <NoteMarkdown color={color} variant="push">
              {message}
            </NoteMarkdown>
          </ScrollView>
        )}

        <SheetFooterButtons
          className="mt-4 w-full"
          color={color}
          primaryLabel={t('push.policyUpdateAck')}
          onPrimaryPress={hide}
        />
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
};
