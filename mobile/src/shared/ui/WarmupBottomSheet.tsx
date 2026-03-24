import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useEffect, useRef } from 'react';

export const WarmupBottomSheet = () => {
  const ref = useRef<BottomSheetModal>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      ref.current?.present();
      const dismissTimer = setTimeout(() => {
        ref.current?.dismiss();
      }, 16);

      return () => clearTimeout(dismissTimer);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
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
