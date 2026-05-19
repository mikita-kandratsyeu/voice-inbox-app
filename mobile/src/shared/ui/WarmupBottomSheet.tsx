import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useEffect, useRef } from 'react';

import { useAppBottomSheetChrome } from '@/shared/ui';

/** One-time native warm-up; avoid dismiss() here — it breaks other modals on gorhom v5. */
export const WarmupBottomSheet = () => {
  const ref = useRef<BottomSheetModal>(null);
  const chrome = useAppBottomSheetChrome();

  useEffect(() => {
    const timer = setTimeout(() => {
      ref.current?.present();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <BottomSheetModal
      ref={ref}
      {...chrome}
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
