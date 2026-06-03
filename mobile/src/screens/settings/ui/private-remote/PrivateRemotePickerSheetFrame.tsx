import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import React from 'react';
import { Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { AppBottomSheetModal, useBottomSheetContentPadding } from '@/shared/ui';

type PrivateRemotePickerSheetFrameProps = {
  visible: boolean;
  title: string;
  subtitle?: string;
  color: Colors;
  onClose: () => void;
  children: React.ReactNode;
};

export function PrivateRemotePickerSheetFrame({
  visible,
  title,
  subtitle,
  color,
  onClose,
  children,
}: PrivateRemotePickerSheetFrameProps) {
  const contentPadding = useBottomSheetContentPadding(20);

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          ...contentPadding,
        }}
      >
        <Text
          style={{
            color: color.text.primary,
            fontSize: 17,
            fontWeight: '600',
            marginBottom: subtitle ? 4 : 16,
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: color.text.secondary,
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            {subtitle}
          </Text>
        ) : null}
        <View
          style={{
            backgroundColor: color.background.card,
            borderColor: color.border.default,
            borderRadius: 12,
            borderWidth: 1,
            overflow: 'hidden',
          }}
        >
          {children}
        </View>
      </BottomSheetScrollView>
    </AppBottomSheetModal>
  );
}
