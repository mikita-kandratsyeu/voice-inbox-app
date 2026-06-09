import React, { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import type { Colors } from '@/shared/config';
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
const GRID_LINE_COLOR = 'rgba(255,255,255,0.28)';
const CORNER_ARM = 20;
const CORNER_THICKNESS = 3;
const CORNER_HANDLE_SIZE = 26;
const EDGE_HANDLE_LENGTH = 36;
const EDGE_HANDLE_THICKNESS = 7;
const MOVE_INSET = 28;

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
  color: Colors;
  crop: ImageCropRect;
  displayCrop: DisplayRect;
  imageSize: ImageSize;
  layoutScale: number;
  previewHeight: number;
  previewWidth: number;
  onCropChange: (next: ImageCropRect) => void;
};

function CropCornerBracket({
  corner,
  strokeColor,
}: {
  corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  strokeColor: string;
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
            backgroundColor: strokeColor,
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
            backgroundColor: strokeColor,
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

function CropHandleDot({ accentColor }: { accentColor: string }) {
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: accentColor,
        borderRadius: CORNER_HANDLE_SIZE / 2,
        borderWidth: 2,
        height: CORNER_HANDLE_SIZE,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.28,
        shadowRadius: 2,
        width: CORNER_HANDLE_SIZE,
      }}
    />
  );
}

function CropEdgeHandle({
  accentColor,
  vertical = false,
}: {
  accentColor: string;
  vertical?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: accentColor,
        borderRadius: EDGE_HANDLE_THICKNESS / 2,
        borderWidth: 1.5,
        height: vertical ? EDGE_HANDLE_LENGTH : EDGE_HANDLE_THICKNESS,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.22,
        shadowRadius: 2,
        width: vertical ? EDGE_HANDLE_THICKNESS : EDGE_HANDLE_LENGTH,
      }}
    />
  );
}

function getHandleStyle(handle: CropResizeHandle) {
  switch (handle) {
    case 'topLeft':
      return {
        left: -CORNER_HANDLE_SIZE / 2,
        position: 'absolute' as const,
        top: -CORNER_HANDLE_SIZE / 2,
      };
    case 'topRight':
      return {
        position: 'absolute' as const,
        right: -CORNER_HANDLE_SIZE / 2,
        top: -CORNER_HANDLE_SIZE / 2,
      };
    case 'bottomLeft':
      return {
        bottom: -CORNER_HANDLE_SIZE / 2,
        left: -CORNER_HANDLE_SIZE / 2,
        position: 'absolute' as const,
      };
    case 'bottomRight':
      return {
        bottom: -CORNER_HANDLE_SIZE / 2,
        position: 'absolute' as const,
        right: -CORNER_HANDLE_SIZE / 2,
      };
    case 'top':
      return {
        alignItems: 'center' as const,
        left: 0,
        position: 'absolute' as const,
        right: 0,
        top: -EDGE_HANDLE_THICKNESS / 2,
      };
    case 'bottom':
      return {
        alignItems: 'center' as const,
        bottom: -EDGE_HANDLE_THICKNESS / 2,
        left: 0,
        position: 'absolute' as const,
        right: 0,
      };
    case 'left':
      return {
        bottom: 0,
        justifyContent: 'center' as const,
        left: -EDGE_HANDLE_THICKNESS / 2,
        position: 'absolute' as const,
        top: 0,
        width: EDGE_HANDLE_THICKNESS,
      };
    case 'right':
      return {
        bottom: 0,
        justifyContent: 'center' as const,
        position: 'absolute' as const,
        right: -EDGE_HANDLE_THICKNESS / 2,
        top: 0,
        width: EDGE_HANDLE_THICKNESS,
      };
  }
}

export function GraphExportCropOverlay({
  color,
  crop,
  displayCrop,
  imageSize,
  layoutScale,
  previewHeight,
  previewWidth,
  onCropChange,
}: GraphExportCropOverlayProps) {
  const { t } = useTranslation();
  const cropGestureStartRef = useRef<ImageCropRect | null>(null);

  const moveCropGesture = useMemo(() => {
    return Gesture.Pan()
      .runOnJS(true)
      .onBegin(() => {
        cropGestureStartRef.current = crop;
        hapticLight();
      })
      .onUpdate((event) => {
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
      })
      .onFinalize(() => {
        cropGestureStartRef.current = null;
      });
  }, [crop, imageSize.height, imageSize.width, layoutScale, onCropChange]);

  const resizeGestures = useMemo(() => {
    const createResizeGesture = (handle: CropResizeHandle) =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin(() => {
          cropGestureStartRef.current = crop;
          hapticLight();
        })
        .onUpdate((event) => {
          const start = cropGestureStartRef.current;
          if (!start) return;

          const delta = displayDeltaToImageDelta(
            event.translationX,
            event.translationY,
            layoutScale,
          );
          onCropChange(
            resizeImageCropFromHandle(start, handle, delta, imageSize.width, imageSize.height),
          );
        })
        .onFinalize(() => {
          cropGestureStartRef.current = null;
        });

    return Object.fromEntries(
      RESIZE_HANDLES.map((handle) => [handle, createResizeGesture(handle)]),
    ) as Record<CropResizeHandle, ReturnType<typeof Gesture.Pan>>;
  }, [crop, imageSize.height, imageSize.width, layoutScale, onCropChange]);

  return (
    <>
      <View
        pointerEvents="none"
        style={{
          backgroundColor: OVERLAY_COLOR,
          height: displayCrop.y,
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: OVERLAY_COLOR,
          bottom: 0,
          height: Math.max(0, previewHeight - displayCrop.y - displayCrop.height),
          left: 0,
          position: 'absolute',
          right: 0,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: OVERLAY_COLOR,
          height: displayCrop.height,
          left: 0,
          position: 'absolute',
          top: displayCrop.y,
          width: displayCrop.x,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          backgroundColor: OVERLAY_COLOR,
          height: displayCrop.height,
          position: 'absolute',
          right: 0,
          top: displayCrop.y,
          width: Math.max(0, previewWidth - displayCrop.x - displayCrop.width),
        }}
      />

      <View
        style={{
          height: displayCrop.height,
          left: displayCrop.x,
          position: 'absolute',
          top: displayCrop.y,
          width: displayCrop.width,
        }}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <CropGrid />
          <CropCornerBracket corner="topLeft" strokeColor="#FFFFFF" />
          <CropCornerBracket corner="topRight" strokeColor="#FFFFFF" />
          <CropCornerBracket corner="bottomLeft" strokeColor="#FFFFFF" />
          <CropCornerBracket corner="bottomRight" strokeColor="#FFFFFF" />
          <View
            style={{
              alignSelf: 'center',
              backgroundColor: 'rgba(0,0,0,0.62)',
              borderRadius: 8,
              bottom: 10,
              paddingHorizontal: 10,
              paddingVertical: 5,
              position: 'absolute',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600', letterSpacing: 0.2 }}>
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
          const isCorner = handle === 'topLeft' || handle === 'topRight' || handle === 'bottomLeft' || handle === 'bottomRight';
          const isVerticalEdge = handle === 'left' || handle === 'right';

          return (
            <GestureDetector key={handle} gesture={resizeGestures[handle]}>
              <View
                accessibilityLabel={
                  isCorner
                    ? t('notesGraph.export.resizeCornerA11y')
                    : t('notesGraph.export.resizeEdgeA11y')
                }
                accessibilityRole="adjustable"
                style={getHandleStyle(handle)}
              >
                {isCorner ? (
                  <CropHandleDot accentColor={color.accent.primary} />
                ) : (
                  <CropEdgeHandle accentColor={color.accent.primary} vertical={isVerticalEdge} />
                )}
              </View>
            </GestureDetector>
          );
        })}
      </View>
    </>
  );
}
