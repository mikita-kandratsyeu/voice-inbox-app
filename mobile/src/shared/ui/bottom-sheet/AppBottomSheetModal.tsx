import type { BottomSheetBackdropProps, BottomSheetModalProps } from '@gorhom/bottom-sheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import type { ViewStyle } from 'react-native';

import { useBottomSheetModalVisibility, useIsTablet } from '@/shared/lib';

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
  /** Bumped while `visible` stays true to force another `present()` (e.g. header re-tap). */
  presentRequestKey?: number;
  surface?: AppBottomSheetChromeOptions['surface'];
  backdrop?: AppBottomSheetBackdropPreset;
  backdropPressBehavior?: AppBottomSheetChromeOptions['backdropPressBehavior'];
  keyboardBlurBehavior?: AppBottomSheetChromeOptions['keyboardBlurBehavior'];
  /** Custom backdrop; overrides `backdrop` preset. */
  backdropComponent?: React.FC<BottomSheetBackdropProps>;
  /**
   * On tablet: centered floating sheet with this max width (not full screen).
   * Uses Gorhom `detached` mode.
   */
  tabletMaxWidth?: number;
} & Omit<
  BottomSheetModalProps,
  'children' | 'ref' | 'onDismiss' | 'backdropComponent' | 'stackBehavior' | 'detached'
>;

export const AppBottomSheetModal = forwardRef<BottomSheetModal, AppBottomSheetModalProps>(
  function AppBottomSheetModal(
    {
      visible,
      onClose,
      children,
      presentOnVisible = true,
      presentRequestKey = 0,
      surface,
      backdrop,
      backdropPressBehavior,
      keyboardBlurBehavior,
      backdropComponent: backdropComponentOverride,
      snapPoints,
      enablePanDownToClose,
      enableContentPanningGesture,
      enableBlurKeyboardOnGesture,
      enableDynamicSizing,
      backgroundStyle,
      handleIndicatorStyle,
      tabletMaxWidth,
      style,
      ...rest
    },
    forwardedRef,
  ) {
    const modalRef = useRef<BottomSheetModal>(null);
    const isTablet = useIsTablet();
    useImperativeHandle(forwardedRef, () => modalRef.current as BottomSheetModal);

    const useTabletDetached =
      isTablet && tabletMaxWidth != null && Number.isFinite(tabletMaxWidth) && tabletMaxWidth > 0;

    const chrome = useAppBottomSheetChrome({
      surface,
      backdrop,
      backdropPressBehavior,
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

    const { handleDismiss, sheetKey } = useBottomSheetModalVisibility(modalRef, visible, onClose, {
      presentOnVisible,
      presentRequestKey,
      enableDynamicSizing: chrome.enableDynamicSizing,
    });

    const Backdrop = backdropComponentOverride ?? chrome.backdropComponent;

    const mergedBackgroundStyle = useMemo((): ViewStyle => {
      if (!useTabletDetached) {
        return chrome.backgroundStyle;
      }
      return {
        ...chrome.backgroundStyle,
        borderTopWidth: 0,
        borderRadius: 20,
      };
    }, [chrome.backgroundStyle, useTabletDetached]);

    const mergedStyle = useMemo((): ViewStyle | undefined => {
      if (!useTabletDetached) {
        return style;
      }
      return {
        width: tabletMaxWidth,
        maxWidth: '92%',
        alignSelf: 'center',
        ...style,
      };
    }, [style, tabletMaxWidth, useTabletDetached]);

    return (
      <BottomSheetModal
        key={sheetKey}
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
        backgroundStyle={mergedBackgroundStyle}
        handleIndicatorStyle={chrome.handleIndicatorStyle}
        backdropComponent={Backdrop}
        onDismiss={handleDismiss}
        detached={useTabletDetached}
        bottomInset={useTabletDetached ? 28 : undefined}
        style={mergedStyle}
        {...rest}
      >
        {children}
      </BottomSheetModal>
    );
  },
);
