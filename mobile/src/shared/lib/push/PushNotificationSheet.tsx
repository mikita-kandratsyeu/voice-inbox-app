import { BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, ScrollView, Text } from 'react-native';
import Markdown from 'react-native-markdown-display';

import { useColors } from '@/shared/config';
import { AppBottomSheetModal, Button, useBottomSheetContentPadding } from '@/shared/ui';

import { usePushSheet } from './usePushSheet';

const MAX_CONTENT_HEIGHT = Dimensions.get('window').height * 0.4;

export const PushNotificationSheet = () => {
  const { t } = useTranslation();
  const color = useColors();
  const contentPadding = useBottomSheetContentPadding(24);
  const { visible, message, type, hide } = usePushSheet();

  const title =
    type === 'limit_exceeded' ? t('push.limitExceededTitle') : t('push.policyUpdateTitle');

  const markdownStyles = useMemo(
    () => ({
      body: {
        color: color.text.secondary,
        fontSize: 14,
        lineHeight: 22,
      },
      strong: {
        color: color.text.primary,
        fontWeight: '600' as const,
      },
      link: {
        color: color.accent.primary,
        textDecorationLine: 'underline' as const,
      },
      heading1: {
        color: color.text.primary,
        fontSize: 17,
        fontWeight: '700' as const,
        marginBottom: 4,
      },
      heading2: {
        color: color.text.primary,
        fontSize: 15,
        fontWeight: '600' as const,
        marginBottom: 4,
      },
      bullet_list: { marginVertical: 4 },
      ordered_list: { marginVertical: 4 },
      list_item: {
        color: color.text.secondary,
        fontSize: 14,
        lineHeight: 22,
      },
      code_inline: {
        backgroundColor: color.background.tertiary,
        color: color.text.primary,
        borderRadius: 4,
        fontSize: 13,
      },
      fence: {
        backgroundColor: color.background.tertiary,
        borderRadius: 8,
        padding: 12,
      },
      blockquote: {
        backgroundColor: color.background.tertiary,
        borderLeftColor: color.accent.primary,
        borderLeftWidth: 3,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 4,
      },
    }),
    [color],
  );

  return (
    <AppBottomSheetModal
      visible={visible}
      onClose={hide}
      surface="card"
      backdrop="blocking"
      enablePanDownToClose={false}
    >
      <BottomSheetView style={{ paddingHorizontal: 20, ...contentPadding }}>
        <Text
          style={{
            color: color.text.primary,
            fontSize: 17,
            fontWeight: '600',
            lineHeight: 24,
            paddingTop: 8,
            marginBottom: 12,
          }}
        >
          {title}
        </Text>

        {Boolean(message) && (
          <ScrollView
            style={{ maxHeight: MAX_CONTENT_HEIGHT }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4 }}
          >
            <Markdown style={markdownStyles}>{message}</Markdown>
          </ScrollView>
        )}

        <Button
          label={t('push.policyUpdateAck')}
          variant="primary"
          size="lg"
          fullWidth
          color={color}
          onPress={hide}
          containerStyle={{ marginTop: 16 }}
        />
      </BottomSheetView>
    </AppBottomSheetModal>
  );
};
