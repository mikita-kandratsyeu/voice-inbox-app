import { BottomSheetView } from '@gorhom/bottom-sheet';
import { RotateCcw } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import { isUserCancelledShare } from '@/features/share-record/lib/isUserCancelledShare';
import { type Colors, useColors } from '@/shared/config';
import { diagWarn } from '@/shared/lib/appLogger';
import { hapticLight, hapticSuccess } from '@/shared/lib/haptics';
import { AppBottomSheetModal, SheetFooterButtons, useBottomSheetContentPadding } from '@/shared/ui';

import {
  computeContainLayout,
  computeCropCaptureLayout,
  fullImageCrop,
  type ImageCropRect,
  imageCropToDisplayRect,
  type ImageSize,
  isFullImageCrop,
} from '../lib/graphExportCrop';
import { GraphExportCropOverlay } from './GraphExportCropOverlay';

const PREVIEW_HEIGHT = 380;

type GraphExportPreviewSheetProps = {
  visible: boolean;
  imageUri: string | null;
  imagePixelSize?: ImageSize | null;
  isLoadingPreview?: boolean;
  onClose: () => void;
};

function ExportSheetLoadingOverlay({ color, label }: { color: Colors; label: string }) {
  return (
    <View
      style={{
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.42)',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <ActivityIndicator color={color.accent.primary} size="large" />
      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function GraphExportPreviewSheet({
  visible,
  imageUri,
  imagePixelSize = null,
  isLoadingPreview = false,
  onClose,
}: GraphExportPreviewSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
  const contentPadding = useBottomSheetContentPadding(24);
  const cropCaptureRef = useRef<ViewShotRef>(null);

  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [crop, setCrop] = useState<ImageCropRect | null>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!visible || !imageUri) {
      setImageSize(null);
      setCrop(null);
      return;
    }

    if (imagePixelSize) {
      setImageSize(imagePixelSize);
      setCrop(fullImageCrop(imagePixelSize.width, imagePixelSize.height));
      return;
    }

    let cancelled = false;

    Image.getSize(
      imageUri,
      (width, height) => {
        if (cancelled) return;
        setImageSize({ width, height });
        setCrop(fullImageCrop(width, height));
      },
      (error) => {
        diagWarn('[notesGraph.export] image size failed', error);
        if (!cancelled) {
          Alert.alert(t('common.error'), t('notesGraph.export.failed'));
          onClose();
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [imagePixelSize, imageUri, onClose, t, visible]);

  const containLayout = useMemo(() => {
    if (!imageSize || previewWidth <= 0) return null;
    return computeContainLayout(imageSize.width, imageSize.height, previewWidth, PREVIEW_HEIGHT);
  }, [imageSize, previewWidth]);

  const displayCrop = useMemo(() => {
    if (!crop || !containLayout) return null;
    return imageCropToDisplayRect(crop, containLayout);
  }, [containLayout, crop]);

  const canResetCrop = Boolean(
    imageSize && crop && !isFullImageCrop(crop, imageSize.width, imageSize.height),
  );

  const handleResetCrop = useCallback(() => {
    if (!imageSize || !canResetCrop) return;
    hapticLight();
    setCrop(fullImageCrop(imageSize.width, imageSize.height));
  }, [canResetCrop, imageSize]);

  const handleCropChange = useCallback((next: ImageCropRect) => {
    setCrop(next);
  }, []);

  const cropCaptureLayout = useMemo(() => {
    if (!crop || !imageSize) return null;
    return computeCropCaptureLayout(crop, imageSize);
  }, [crop, imageSize]);

  const handleExport = useCallback(async () => {
    if (!imageUri || !imageSize || !crop || isExporting || isLoadingPreview) return;

    const needsCropCapture = !isFullImageCrop(crop, imageSize.width, imageSize.height);

    if (needsCropCapture) {
      setIsExporting(true);
      await waitForNextFrame();
    }

    try {
      let exportUri = imageUri;

      if (needsCropCapture) {
        const captured = await cropCaptureRef.current?.capture?.();
        if (!captured) {
          throw new Error('crop capture failed');
        }
        exportUri = captured;
      }

      const shareUrl = exportUri.startsWith('file://') ? exportUri : `file://${exportUri}`;

      await Share.share({
        url: shareUrl,
        title: t('notesGraph.export.shareTitle'),
      });

      hapticSuccess();
      onClose();
    } catch (error) {
      if (isUserCancelledShare(error)) {
        return;
      }
      diagWarn('[notesGraph.export] share failed', error);
      Alert.alert(t('common.error'), t('notesGraph.export.failed'));
    } finally {
      setIsExporting(false);
    }
  }, [crop, imageSize, imageUri, isExporting, isLoadingPreview, onClose, t]);

  const isPreviewBusy = isLoadingPreview || isExporting;
  const loadingLabel = isLoadingPreview
    ? t('notesGraph.export.capturingPreview')
    : t('share.exportPreparing');

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <BottomSheetView style={{ paddingHorizontal: 20, ...contentPadding }}>
        <Text
          style={{
            color: color.text.primary,
            fontSize: 17,
            fontWeight: '600',
            marginBottom: 4,
            marginTop: 4,
            textAlign: 'center',
          }}
        >
          {t('notesGraph.export.title')}
        </Text>
        <Text
          style={{
            color: color.text.secondary,
            fontSize: 14,
            lineHeight: 20,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          {t('notesGraph.export.subtitle')}
        </Text>

        <View
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            setPreviewWidth((prev) => (prev === width ? prev : width));
          }}
          style={{
            alignSelf: 'stretch',
            backgroundColor: color.background.tertiary,
            borderColor: color.border.default,
            borderRadius: 14,
            borderWidth: 1,
            height: PREVIEW_HEIGHT,
            marginBottom: 12,
            overflow: 'hidden',
          }}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              resizeMode="contain"
              style={{
                height: PREVIEW_HEIGHT,
                width: '100%',
              }}
            />
          ) : null}

          {displayCrop && crop && imageSize && containLayout && !isPreviewBusy ? (
            <GraphExportCropOverlay
              color={color}
              crop={crop}
              displayCrop={displayCrop}
              imageSize={imageSize}
              layoutScale={containLayout.scale}
              previewHeight={PREVIEW_HEIGHT}
              previewWidth={previewWidth}
              onCropChange={handleCropChange}
            />
          ) : null}

          {isPreviewBusy ? <ExportSheetLoadingOverlay color={color} label={loadingLabel} /> : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canResetCrop || isPreviewBusy }}
          disabled={!canResetCrop || isPreviewBusy}
          onPress={handleResetCrop}
          style={{
            alignItems: 'center',
            alignSelf: 'center',
            backgroundColor: canResetCrop ? color.background.card : color.background.tertiary,
            borderColor: color.border.default,
            borderRadius: 999,
            borderWidth: 1,
            flexDirection: 'row',
            gap: 6,
            marginBottom: 16,
            opacity: canResetCrop ? 1 : 0.45,
            paddingHorizontal: 14,
            paddingVertical: 8,
          }}
        >
          <RotateCcw
            color={canResetCrop ? color.accent.primary : color.text.muted}
            size={15}
            strokeWidth={2.2}
          />
          <Text
            style={{
              color: canResetCrop ? color.accent.primary : color.text.muted,
              fontSize: 14,
              fontWeight: '600',
            }}
          >
            {t('notesGraph.export.resetCrop')}
          </Text>
        </Pressable>

        <SheetFooterButtons
          color={color}
          onPrimaryPress={() => {
            void handleExport();
          }}
          primaryDisabled={!imageUri || !imageSize || !crop || isPreviewBusy}
          primaryLabel={t('notesGraph.export.share')}
          primaryLoading={isExporting}
          onSecondaryPress={onClose}
          secondaryDisabled={isExporting}
          secondaryLabel={t('common.cancel')}
        />
      </BottomSheetView>

      {visible && imageUri && imageSize && crop && cropCaptureLayout ? (
        <View pointerEvents="none" style={{ left: -10000, position: 'absolute', top: 0 }}>
          <ViewShot
            ref={cropCaptureRef}
            options={{ format: 'png', quality: 1, result: 'tmpfile' }}
            style={{
              height: cropCaptureLayout.shotHeight,
              width: cropCaptureLayout.shotWidth,
            }}
          >
            <Image
              source={{ uri: imageUri }}
              style={{
                height: cropCaptureLayout.imageHeight,
                left: cropCaptureLayout.offsetX,
                position: 'absolute',
                top: cropCaptureLayout.offsetY,
                width: cropCaptureLayout.imageWidth,
              }}
            />
          </ViewShot>
        </View>
      ) : null}
    </AppBottomSheetModal>
  );
}
