import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DeviceInfoModule } from 'react-native-nitro-device-info';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { i18n } from '@/shared/lib';
import { IS_IOS } from '@/shared/lib/platform';

import { useColors } from '../config';

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
      <View style={[styles.labelContainer, { backgroundColor: color.accent.primary }]}>
        <Text style={[styles.label, { color: color.icon.onAccent }]} numberOfLines={1}>
          {i18n.t('common.notchBrandMark')}
        </Text>
      </View>
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
  labelContainer: {
    borderRadius: 56,
    height: 28,
    width: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
