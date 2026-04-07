import React, { useEffect, useState } from 'react';
import { AppState, type AppStateStatus, StyleSheet, View } from 'react-native';

import { useAppLockStore } from '@/entities/app-lock';
import { FrostedChromeBackground } from '@/shared/ui';

import { setAndroidWindowSecure } from '../lib/setAndroidWindowSecure';

const OVERLAY_Z_INDEX = 50_000;

export function AppSwitcherPrivacyOverlay() {
  const isAppLockEnabled = useAppLockStore((s) => s.isEnabled);

  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', setAppState);

    return () => sub.remove();
  }, []);

  useEffect(() => {
    setAndroidWindowSecure(isAppLockEnabled);
    return () => setAndroidWindowSecure(false);
  }, [isAppLockEnabled]);

  const shouldObscure = isAppLockEnabled && (appState === 'inactive' || appState === 'background');

  if (!shouldObscure) {
    return null;
  }

  return (
    <View style={styles.overlay} pointerEvents="auto" collapsable={false}>
      <FrostedChromeBackground style={styles.fill} />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: OVERLAY_Z_INDEX,
    elevation: OVERLAY_Z_INDEX,
  },
  fill: {
    ...StyleSheet.absoluteFill,
  },
});
