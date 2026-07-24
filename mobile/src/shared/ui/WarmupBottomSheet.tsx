import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import React from 'react';

import { useAppBottomSheetChrome } from '@/shared/ui';

/** Mount-only warm-up; do not call present()/dismiss() — breaks gorhom v5 modal queue. */
export const WarmupBottomSheet = () => {
  const chrome = useAppBottomSheetChrome();

  return (
    <BottomSheetModal
      {...chrome}
      stackBehavior="push"
      enablePanDownToClose={false}
      style={{ opacity: 0, pointerEvents: 'none' }}
      backgroundStyle={{ opacity: 0 }}
      handleIndicatorStyle={{ opacity: 0 }}
      backdropComponent={undefined}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <BottomSheetView style={{ height: 1 }}>{null}</BottomSheetView>
    </BottomSheetModal>
  );
};
