import type { BottomSheetBackdropProps, BottomSheetModalProps } from '@gorhom/bottom-sheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';

import { useBottomSheetModalVisibility } from '@/shared/lib';

import {
  type AppBottomSheetBackdropPreset,
  type AppBottomSheetChromeOptions,
  useAppBottomSheetChrome,
} from './appBottomSheetChrome';

export type AppBottomSheetModalProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** @default true */
  presentOnVisible?: boolean;
  surface?: AppBottomSheetChromeOptions['surface'];
  backdrop?: AppBottomSheetBackdropPreset;
  keyboardBlurBehavior?: AppBottomSheetChromeOptions['keyboardBlurBehavior'];
  /** Custom backdrop; overrides `backdrop` preset. */
  backdropComponent?: React.FC<BottomSheetBackdropProps>;
} & Omit<
  BottomSheetModalProps,
  'children' | 'ref' | 'onDismiss' | 'backdropComponent' | 'stackBehavior'
>;

export const AppBottomSheetModal = forwardRef<BottomSheetModal, AppBottomSheetModalProps>(
  function AppBottomSheetModal(
    {
      visible,
      onClose,
      children,
      presentOnVisible = true,
      surface,
      backdrop,
      keyboardBlurBehavior,
      backdropComponent: backdropComponentOverride,
      snapPoints,
      enablePanDownToClose,
      enableContentPanningGesture,
      enableBlurKeyboardOnGesture,
      enableDynamicSizing,
      backgroundStyle,
      handleIndicatorStyle,
      ...rest
    },
    forwardedRef,
  ) {
    const modalRef = useRef<BottomSheetModal>(null);
    useImperativeHandle(forwardedRef, () => modalRef.current as BottomSheetModal);

    const handleDismiss = useBottomSheetModalVisibility(modalRef, visible, onClose, {
      presentOnVisible,
    });

    const chrome = useAppBottomSheetChrome({
      surface,
      backdrop,
      keyboardBlurBehavior,
      snapPoints: snapPoints as (string | number)[] | undefined,
      enablePanDownToClose,
      enableContentPanningGesture,
      enableBlurKeyboardOnGesture,
      enableDynamicSizing,
      backgroundStyle: backgroundStyle as AppBottomSheetChromeOptions['backgroundStyle'],
      handleIndicatorStyle:
        handleIndicatorStyle as AppBottomSheetChromeOptions['handleIndicatorStyle'],
    });

    const Backdrop = backdropComponentOverride ?? chrome.backdropComponent;

    return (
      <BottomSheetModal
        ref={modalRef}
        stackBehavior={chrome.stackBehavior}
        enableDynamicSizing={chrome.enableDynamicSizing}
        enablePanDownToClose={chrome.enablePanDownToClose}
        enableOverDrag={chrome.enableOverDrag}
        enableContentPanningGesture={chrome.enableContentPanningGesture}
        keyboardBehavior={chrome.keyboardBehavior}
        keyboardBlurBehavior={chrome.keyboardBlurBehavior}
        enableBlurKeyboardOnGesture={chrome.enableBlurKeyboardOnGesture}
        snapPoints={chrome.snapPoints}
        backgroundStyle={chrome.backgroundStyle}
        handleIndicatorStyle={chrome.handleIndicatorStyle}
        backdropComponent={Backdrop}
        onDismiss={handleDismiss}
        {...rest}
      >
        {children}
      </BottomSheetModal>
    );
  },
);
