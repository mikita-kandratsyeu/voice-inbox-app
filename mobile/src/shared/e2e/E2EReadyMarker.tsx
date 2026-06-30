import React from 'react';
import { View } from 'react-native';

import { useE2ERuntime } from './e2eStorage';
import { TestIds } from './testIds';

/** Invisible anchor for Maestro to detect E2E configuration applied. */
export function E2EReadyMarker() {
  const active = useE2ERuntime((s) => s.active);

  if (!active) {
    return null;
  }

  return (
    <View
      testID={TestIds.e2e.ready}
      pointerEvents="none"
      style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
    />
  );
}
