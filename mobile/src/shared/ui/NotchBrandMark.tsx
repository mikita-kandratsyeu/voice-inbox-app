import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DeviceInfoModule } from 'react-native-nitro-device-info';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { i18n } from '@/shared/lib';
import { IS_IOS } from '@/shared/lib/platform';

import { useColors } from '../config';
import { PrivateModeBadge } from './PrivateModeBadge';

const IOS_NOTCH_OR_ISLAND_MIN_TOP_INSET = 44;

export function NotchBrandMark() {
  const color = useColors();
  const insets = useSafeAreaInsets();

  const visible =
    IS_IOS && DeviceInfoModule.isTablet !== true && insets.top >= IOS_NOTCH_OR_ISLAND_MIN_TOP_INSET;

  if (!visible) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { paddingTop: insets.top - IOS_NOTCH_OR_ISLAND_MIN_TOP_INSET }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <PrivateModeBadge color={color} compact text={i18n.t('common.notchBrandMark')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 999,
    elevation: 999,
  },
});
