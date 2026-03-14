import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-native-markdown-display';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getColors, useAppTheme } from '@/shared/config';
import { Button } from '@/shared/ui';

import { usePushSheet } from './usePushSheet';

export const PolicyUpdateSheet = () => {
  const { t } = useTranslation();
  const scheme = useAppTheme();
  const color = getColors(scheme);
  const insets = useSafeAreaInsets();
  const { visible, message, hide } = usePushSheet();
  const sheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} pressBehavior="none" opacity={0.6} />
    ),
    [],
  );

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
      bullet_list: {
        marginVertical: 4,
      },
      ordered_list: {
        marginVertical: 4,
      },
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

  const bottomPadding = Math.max(insets.bottom, 24);

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing={false}
      snapPoints={['50%', '80%']}
      enablePanDownToClose={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: color.background.card,
        borderTopWidth: 1,
        borderTopColor: color.border.default,
      }}
      handleIndicatorStyle={{
        width: 36,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: color.icon.muted,
      }}
      onDismiss={hide}
    >
      <BottomSheetView
        style={{
          flex: 1,
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          gap: 12,
        }}
      >
        <Markdown
          style={{
            body: {
              color: color.text.primary,
              fontSize: 17,
              fontWeight: '600',
              marginBottom: 0,
              lineHeight: 24,
            },
          }}
        >
          {t('push.policyUpdateTitle')}
        </Markdown>

        {Boolean(message) && (
          <BottomSheetScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            <Markdown style={markdownStyles}>{message}</Markdown>
          </BottomSheetScrollView>
        )}

        <Button
          label={t('push.policyUpdateAck')}
          variant="primary"
          size="lg"
          fullWidth
          color={color}
          onPress={hide}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
};
