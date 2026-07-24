import React from 'react';
import { View } from 'react-native';

import type { Colors } from '@/shared/config';
import { AppBottomSheetContent, AppBottomSheetModal, SheetHeader } from '@/shared/ui';

type PrivateRemotePickerSheetFrameProps = {
  visible: boolean;
  presentRequestKey?: number;
  title: string;
  subtitle?: string;
  color: Colors;
  onClose: () => void;
  children: React.ReactNode;
};

export function PrivateRemotePickerSheetFrame({
  visible,
  presentRequestKey = 0,
  title,
  subtitle,
  color,
  onClose,
  children,
}: PrivateRemotePickerSheetFrameProps) {
  return (
    <AppBottomSheetModal visible={visible} presentRequestKey={presentRequestKey} onClose={onClose}>
      <AppBottomSheetContent scrollable>
        <SheetHeader
          title={title}
          subtitle={subtitle}
          color={color}
          marginBottom={subtitle ? 16 : 16}
        />
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
      </AppBottomSheetContent>
    </AppBottomSheetModal>
  );
}
