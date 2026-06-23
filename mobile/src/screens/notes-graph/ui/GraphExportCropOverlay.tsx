import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import {
  GestureDetector,
  type PanGestureActiveEvent,
  usePanGesture,
} from 'react-native-gesture-handler';

import { hapticLight } from '@/shared/lib/haptics';

import {
  clampImageCropRect,
  type CropResizeHandle,
  displayDeltaToImageDelta,
  type DisplayRect,
  formatImageCropSize,
  type ImageCropRect,
  type ImageSize,
  resizeImageCropFromHandle,
} from '../lib/graphExportCrop';

const OVERLAY_COLOR = 'rgba(0,0,0,0.58)';
const GRID_LINE_COLOR = 'rgba(255,255,255,0.22)';
const FRAME_BORDER_COLOR = 'rgba(255,255,255,0.9)';
const HANDLE_STROKE = '#FFFFFF';
const CORNER_ARM = 18;
const CORNER_THICKNESS = 2;
const CORNER_HIT = 32;
const EDGE_HIT_LONG = 40;
const EDGE_HIT_SHORT = 20;
const EDGE_BAR_LONG = 22;
const EDGE_BAR_SHORT = 3;
const MOVE_INSET = 24;

const RESIZE_HANDLES: CropResizeHandle[] = [
  'topLeft',
  'topRight',
  'bottomLeft',
  'bottomRight',
  'top',
  'right',
  'bottom',
  'left',
];

type GraphExportCropOverlayProps = {
  crop: ImageCropRect;
  displayCrop: DisplayRect;
  imageLayout: DisplayRect;
  imageSize: ImageSize;
  layoutScale: number;
  onCropChange: (next: ImageCropRect) => void;
};

type CropResizeHandleDetectorProps = {
  handle: CropResizeHandle;
  crop: ImageCropRect;
  imageSize: ImageSize;
  layoutScale: number;
  onCropChange: (next: ImageCropRect) => void;
  cropGestureStartRef: React.MutableRefObject<ImageCropRect | null>;
  accessibilityLabel: string;
  style: object;
  children?: React.ReactNode;
};

function CropResizeHandleDetector({
  handle,
  crop,
  imageSize,
  layoutScale,
  onCropChange,
  cropGestureStartRef,
  accessibilityLabel,
  style,
  children,
}: CropResizeHandleDetectorProps) {
  const resizeGesture = usePanGesture({
    runOnJS: true,
    onBegin: () => {
      cropGestureStartRef.current = crop;
      hapticLight();
    },
    onUpdate: (event: PanGestureActiveEvent) => {
      const start = cropGestureStartRef.current;
      if (!start) return;

      const delta = displayDeltaToImageDelta(event.translationX, event.translationY, layoutScale);
      onCropChange(
        resizeImageCropFromHandle(start, handle, delta, imageSize.width, imageSize.height),
      );
    },
    onFinalize: () => {
      cropGestureStartRef.current = null;
    },
  });

  return (
    <GestureDetector gesture={resizeGesture}>
      <View accessibilityLabel={accessibilityLabel} accessibilityRole="adjustable" style={style}>
        {children}
      </View>
    </GestureDetector>
  );
}

function CropCornerBracket({
  corner,
}: {
  corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}) {
  const horizontalStyle =
    corner === 'topLeft' || corner === 'bottomLeft' ? { left: 0 } : { right: 0 };
  const verticalStyle = corner === 'topLeft' || corner === 'topRight' ? { top: 0 } : { bottom: 0 };

  return (
    <>
      <View
        pointerEvents="none"
        style={[
          {
            backgroundColor: HANDLE_STROKE,
            height: CORNER_THICKNESS,
            position: 'absolute',
            width: CORNER_ARM,
          },
          horizontalStyle,
          verticalStyle,
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          {
            backgroundColor: HANDLE_STROKE,
            height: CORNER_ARM,
            position: 'absolute',
            width: CORNER_THICKNESS,
          },
          horizontalStyle,
          verticalStyle,
        ]}
      />
    </>
  );
}

function CropGrid() {
  return (
    <>
      {[1 / 3, 2 / 3].map((fraction) => (
        <React.Fragment key={fraction}>
          <View
            pointerEvents="none"
            style={{
              backgroundColor: GRID_LINE_COLOR,
              bottom: 0,
              left: `${fraction * 100}%`,
              position: 'absolute',
              top: 0,
              width: StyleSheet.hairlineWidth,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              backgroundColor: GRID_LINE_COLOR,
              height: StyleSheet.hairlineWidth,
              left: 0,
              position: 'absolute',
              right: 0,
              top: `${fraction * 100}%`,
            }}
          />
        </React.Fragment>
      ))}
    </>
  );
}

function CropEdgeBar({ vertical = false }: { vertical?: boolean }) {
  return (
    <View
      pointerEvents="none"
      style={{
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 999,
        height: vertical ? EDGE_BAR_LONG : EDGE_BAR_SHORT,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 1.5,
        width: vertical ? EDGE_BAR_SHORT : EDGE_BAR_LONG,
      }}
    />
  );
}

function getCornerHandleAlignment(handle: CropResizeHandle) {
  switch (handle) {
    case 'topLeft':
      return { alignItems: 'flex-end' as const, justifyContent: 'flex-end' as const };
    case 'topRight':
      return { alignItems: 'flex-start' as const, justifyContent: 'flex-end' as const };
    case 'bottomLeft':
      return { alignItems: 'flex-end' as const, justifyContent: 'flex-start' as const };
    case 'bottomRight':
      return { alignItems: 'flex-start' as const, justifyContent: 'flex-start' as const };
    default:
      return { alignItems: 'center' as const, justifyContent: 'center' as const };
  }
}

function getHandleStyle(handle: CropResizeHandle) {
  switch (handle) {
    case 'topLeft':
      return {
        height: CORNER_HIT,
        left: -CORNER_HIT / 2,
        position: 'absolute' as const,
        top: -CORNER_HIT / 2,
        width: CORNER_HIT,
      };
    case 'topRight':
      return {
        height: CORNER_HIT,
        position: 'absolute' as const,
        right: -CORNER_HIT / 2,
        top: -CORNER_HIT / 2,
        width: CORNER_HIT,
      };
    case 'bottomLeft':
      return {
        bottom: -CORNER_HIT / 2,
        height: CORNER_HIT,
        left: -CORNER_HIT / 2,
        position: 'absolute' as const,
        width: CORNER_HIT,
      };
    case 'bottomRight':
      return {
        bottom: -CORNER_HIT / 2,
        height: CORNER_HIT,
        position: 'absolute' as const,
        right: -CORNER_HIT / 2,
        width: CORNER_HIT,
      };
    case 'top':
      return {
        alignItems: 'center' as const,
        height: EDGE_HIT_SHORT,
        justifyContent: 'center' as const,
        left: '50%' as const,
        marginLeft: -EDGE_HIT_LONG / 2,
        position: 'absolute' as const,
        top: -EDGE_HIT_SHORT / 2,
        width: EDGE_HIT_LONG,
      };
    case 'bottom':
      return {
        alignItems: 'center' as const,
        bottom: -EDGE_HIT_SHORT / 2,
        height: EDGE_HIT_SHORT,
        justifyContent: 'center' as const,
        left: '50%' as const,
        marginLeft: -EDGE_HIT_LONG / 2,
        position: 'absolute' as const,
        width: EDGE_HIT_LONG,
      };
    case 'left':
      return {
        height: EDGE_HIT_LONG,
        justifyContent: 'center' as const,
        left: -EDGE_HIT_SHORT / 2,
        marginTop: -EDGE_HIT_LONG / 2,
        position: 'absolute' as const,
        top: '50%' as const,
        width: EDGE_HIT_SHORT,
      };
    case 'right':
      return {
        height: EDGE_HIT_LONG,
        justifyContent: 'center' as const,
        marginTop: -EDGE_HIT_LONG / 2,
        position: 'absolute' as const,
        right: -EDGE_HIT_SHORT / 2,
        top: '50%' as const,
        width: EDGE_HIT_SHORT,
      };
  }
}

export function GraphExportCropOverlay({
  crop,
  displayCrop,
  imageLayout,
  imageSize,
  layoutScale,
  onCropChange,
}: GraphExportCropOverlayProps) {
  const { t } = useTranslation();
  const cropGestureStartRef = useRef<ImageCropRect | null>(null);

  const moveCropGesture = usePanGesture({
    runOnJS: true,
    onBegin: () => {
      cropGestureStartRef.current = crop;
      hapticLight();
    },
    onUpdate: (event: PanGestureActiveEvent) => {
      const start = cropGestureStartRef.current;
      if (!start) return;

      const delta = displayDeltaToImageDelta(event.translationX, event.translationY, layoutScale);
      onCropChange(
        clampImageCropRect(
          {
            ...start,
            x: start.x + delta.dx,
            y: start.y + delta.dy,
          },
          imageSize.width,
          imageSize.height,
        ),
      );
    },
    onFinalize: () => {
      cropGestureStartRef.current = null;
    },
  });

  const imageRight = imageLayout.x + imageLayout.width;
  const imageBottom = imageLayout.y + imageLayout.height;
  const cropRight = displayCrop.x + displayCrop.width;
  const cropBottom = displayCrop.y + displayCrop.height;

  return (
    <>
      <View
        pointerEvents="none"
        style={{
          backgroundColor: OVERLAY_COLOR,
          height: Math.max(0, displayCrop.y - imageLayout.y),
          left: imageLayout.x,
          position: 'absolute',
          top: imageLayout.y,
          width: imageLayout.width,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: OVERLAY_COLOR,
          height: Math.max(0, imageBottom - cropBottom),
          left: imageLayout.x,
          position: 'absolute',
          top: cropBottom,
          width: imageLayout.width,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: OVERLAY_COLOR,
          height: displayCrop.height,
          left: imageLayout.x,
          position: 'absolute',
          top: displayCrop.y,
          width: Math.max(0, displayCrop.x - imageLayout.x),
        }}
      />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: OVERLAY_COLOR,
          height: displayCrop.height,
          left: cropRight,
          position: 'absolute',
          top: displayCrop.y,
          width: Math.max(0, imageRight - cropRight),
        }}
      />

      <View
        style={{
          borderColor: FRAME_BORDER_COLOR,
          borderWidth: StyleSheet.hairlineWidth,
          height: displayCrop.height,
          left: displayCrop.x,
          position: 'absolute',
          top: displayCrop.y,
          width: displayCrop.width,
        }}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <CropGrid />
          <CropCornerBracket corner="topLeft" />
          <CropCornerBracket corner="topRight" />
          <CropCornerBracket corner="bottomLeft" />
          <CropCornerBracket corner="bottomRight" />
          <View
            style={{
              alignSelf: 'center',
              backgroundColor: 'rgba(0,0,0,0.55)',
              borderRadius: 6,
              bottom: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              position: 'absolute',
            }}
          >
            <Text
              style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600', letterSpacing: 0.15 }}
            >
              {formatImageCropSize(crop)}
            </Text>
          </View>
        </View>

        <GestureDetector gesture={moveCropGesture}>
          <View
            accessibilityLabel={t('notesGraph.export.moveCropA11y')}
            accessibilityRole="adjustable"
            style={{
              bottom: MOVE_INSET,
              left: MOVE_INSET,
              position: 'absolute',
              right: MOVE_INSET,
              top: MOVE_INSET,
            }}
          />
        </GestureDetector>

        {RESIZE_HANDLES.map((handle) => {
          const isCorner =
            handle === 'topLeft' ||
            handle === 'topRight' ||
            handle === 'bottomLeft' ||
            handle === 'bottomRight';
          const isVerticalEdge = handle === 'left' || handle === 'right';

          return (
            <CropResizeHandleDetector
              key={handle}
              handle={handle}
              crop={crop}
              imageSize={imageSize}
              layoutScale={layoutScale}
              onCropChange={onCropChange}
              cropGestureStartRef={cropGestureStartRef}
              accessibilityLabel={
                isCorner
                  ? t('notesGraph.export.resizeCornerA11y')
                  : t('notesGraph.export.resizeEdgeA11y')
              }
              style={[getHandleStyle(handle), getCornerHandleAlignment(handle)]}
            >
              {isCorner ? null : <CropEdgeBar vertical={isVerticalEdge} />}
            </CropResizeHandleDetector>
          );
        })}
      </View>
    </>
  );
}
