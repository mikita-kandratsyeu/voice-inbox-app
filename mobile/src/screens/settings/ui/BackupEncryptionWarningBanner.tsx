import React from 'react';
import { type StyleProp, Text, View, type ViewStyle } from 'react-native';

import { useColors } from '@/shared/config';
import { useIsTablet, withAlphaHex } from '@/shared/lib';

/** Readable line length for warning copy on wide tablet sheets. */
const TABLET_WARNING_MAX_WIDTH = 680;

type Props = {
  children: string;
  style?: StyleProp<ViewStyle>;
};

export function BackupEncryptionWarningBanner({ children, style }: Props) {
  const c = useColors();
  const isTablet = useIsTablet();

  return (
    <View
      className="rounded-2xl border px-3.5 py-3"
      style={[
        {
          backgroundColor: c.status.error.bg,
          borderColor: withAlphaHex(c.status.error.text, 0.22),
          ...(isTablet
            ? { alignSelf: 'center', width: '100%', maxWidth: TABLET_WARNING_MAX_WIDTH }
            : null),
        },
        style,
      ]}
    >
      <Text className="text-center text-sm leading-5" style={{ color: c.status.error.text }}>
        {children}
      </Text>
    </View>
  );
}
