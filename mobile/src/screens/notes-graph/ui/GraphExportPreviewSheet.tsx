import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, Share, StyleSheet, Text, View } from 'react-native';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import { isUserCancelledShare } from '@/features/share-record/lib/isUserCancelledShare';
import { type Colors, useColors } from '@/shared/config';
import { diagWarn } from '@/shared/lib/appLogger';
import { hapticLight, hapticSuccess } from '@/shared/lib/haptics';
import {
  AppBottomSheetContent,
  AppBottomSheetModal,
  SheetFooterButtons,
  SheetHeader,
} from '@/shared/ui';

import { getGraphExportViewShotCaptureOptions } from '../lib/computeGraphExportLayout';
import {
  GRAPH_EXPORT_DEFAULT_BACKGROUND_ID,
  type GraphExportBackgroundId,
  resolveGraphExportBackground,
} from '../lib/graphExportBackground';
import {
  clipDisplayCropToImageLayout,
  computeContainLayout,
  computeCropCaptureLayout,
  computeCropForAspectTemplate,
  type CropAspectTemplateId,
  fullImageCrop,
  type ImageCropRect,
  imageCropToDisplayRect,
  type ImageSize,
  isFullImageCrop,
} from '../lib/graphExportCrop';
import { GraphExportBackgroundFill } from './GraphExportBackgroundFill';
import { GraphExportCropOverlay } from './GraphExportCropOverlay';
import { GraphExportCropTemplates } from './GraphExportCropTemplates';
import { GraphExportPreviewLoadingState } from './GraphExportPreviewLoadingState';

const PREVIEW_HEIGHT = 380;

type GraphExportPreviewSheetProps = {
  visible: boolean;
  imageUri: string | null;
  imagePixelSize?: ImageSize | null;
  isLoadingPreview?: boolean;
  onBackgroundChange?: (backgroundId: GraphExportBackgroundId) => void;
  onPreviewReady?: (ready: boolean) => void;
  onClose: () => void;
};

function ExportSheetLoadingOverlay({ color, label }: { color: Colors; label: string }) {
  return (
    <View
      style={{
        ...StyleSheet.absoluteFill,
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
  onBackgroundChange,
  onPreviewReady,
  onClose,
}: GraphExportPreviewSheetProps) {
  const { t } = useTranslation();
  const color = useColors();
  const cropCaptureRef = useRef<ViewShotRef>(null);

  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [crop, setCrop] = useState<ImageCropRect | null>(null);
  const [previewWidth, setPreviewWidth] = useState(0);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [cropTemplateId, setCropTemplateId] = useState<CropAspectTemplateId>('full');
  const [backgroundId, setBackgroundId] = useState<GraphExportBackgroundId>(
    GRAPH_EXPORT_DEFAULT_BACKGROUND_ID,
  );

  const backgroundStyle = useMemo(
    () => resolveGraphExportBackground(backgroundId, color),
    [backgroundId, color],
  );

  useEffect(() => {
    if (!visible || !imageUri) {
      setImageSize(null);
      setCrop(null);
      setCropTemplateId('full');
      setBackgroundId(GRAPH_EXPORT_DEFAULT_BACKGROUND_ID);
      setIsImageLoaded(false);
      onPreviewReady?.(false);
      return;
    }

    if (imagePixelSize) {
      setImageSize(imagePixelSize);
      setCrop(fullImageCrop(imagePixelSize.width, imagePixelSize.height));
      setCropTemplateId('full');
      return;
    }

    let cancelled = false;

    Image.getSize(
      imageUri,
      (width, height) => {
        if (cancelled) return;
        setImageSize({ width, height });
        setCrop(fullImageCrop(width, height));
        setCropTemplateId('full');
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
  }, [imagePixelSize, imageUri, onClose, onPreviewReady, t, visible]);

  useEffect(() => {
    setIsImageLoaded(false);
  }, [imageUri]);

  const containLayout = useMemo(() => {
    if (!imageSize || previewWidth <= 0) return null;
    return computeContainLayout(imageSize.width, imageSize.height, previewWidth, PREVIEW_HEIGHT);
  }, [imageSize, previewWidth]);

  const isPreviewContentReady = Boolean(visible && imageUri && containLayout && isImageLoaded);

  useEffect(() => {
    onPreviewReady?.(isPreviewContentReady);
  }, [isPreviewContentReady, onPreviewReady]);

  const isPreviewBusy =
    isLoadingPreview || isExporting || (Boolean(imageUri) && !isPreviewContentReady);
  const showPreviewLoader = isPreviewBusy && (isLoadingPreview || Boolean(imageUri));
  const loadingLabel = t('share.exportPreparing');

  const displayCrop = useMemo(() => {
    if (!crop || !containLayout) return null;
    const mapped = imageCropToDisplayRect(crop, containLayout);
    return clipDisplayCropToImageLayout(mapped, containLayout);
  }, [containLayout, crop]);

  const canResetCrop = Boolean(
    imageSize && crop && !isFullImageCrop(crop, imageSize.width, imageSize.height),
  );

  const handleResetCrop = useCallback(() => {
    if (!imageSize || !canResetCrop) return;
    hapticLight();
    setCropTemplateId('full');
    setCrop(fullImageCrop(imageSize.width, imageSize.height));
  }, [canResetCrop, imageSize]);

  const handleApplyCropTemplate = useCallback(
    (templateId: Exclude<CropAspectTemplateId, 'custom'>) => {
      if (!imageSize) return;
      setCropTemplateId(templateId);
      setCrop(computeCropForAspectTemplate(templateId, imageSize));
    },
    [imageSize],
  );

  const handleCropChange = useCallback((next: ImageCropRect) => {
    setCropTemplateId('custom');
    setCrop(next);
  }, []);

  const cropCaptureLayout = useMemo(() => {
    if (!crop || !imageSize) return null;
    return computeCropCaptureLayout(crop, imageSize);
  }, [crop, imageSize]);

  const handleBackgroundSelect = useCallback(
    (nextBackgroundId: GraphExportBackgroundId) => {
      setBackgroundId(nextBackgroundId);
      onBackgroundChange?.(nextBackgroundId);
    },
    [onBackgroundChange],
  );

  const handleExport = useCallback(async () => {
    if (!imageUri || !imageSize || !crop || isExporting || isLoadingPreview) return;

    setIsExporting(true);
    await waitForNextFrame();

    try {
      let exportUri = imageUri;

      const captured = await cropCaptureRef.current?.capture?.();
      if (!captured) {
        throw new Error('composite capture failed');
      }
      exportUri = captured;

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

  return (
    <AppBottomSheetModal visible={visible} onClose={onClose}>
      <AppBottomSheetContent bottomPadding={24}>
        <SheetHeader
          title={t('notesGraph.export.title')}
          subtitle={t('notesGraph.export.subtitle')}
          color={color}
          marginBottom={12}
        />

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
          {showPreviewLoader ? (
            <GraphExportPreviewLoadingState label={t('notesGraph.export.capturingPreview')} />
          ) : null}

          {imageUri && containLayout ? (
            <View
              style={{
                height: containLayout.height,
                left: containLayout.x,
                overflow: 'hidden',
                position: 'absolute',
                top: containLayout.y,
                width: containLayout.width,
                opacity: isImageLoaded ? 1 : 0,
              }}
            >
              <GraphExportBackgroundFill
                background={backgroundStyle}
                height={containLayout.height}
                showTransparencyGrid
                width={containLayout.width}
              />
              <Image
                source={{ uri: imageUri }}
                onLoad={() => {
                  setIsImageLoaded(true);
                }}
                style={{
                  height: containLayout.height,
                  width: containLayout.width,
                }}
              />
            </View>
          ) : null}

          {displayCrop && crop && imageSize && containLayout && !isPreviewBusy ? (
            <GraphExportCropOverlay
              crop={crop}
              displayCrop={displayCrop}
              imageLayout={containLayout}
              imageSize={imageSize}
              layoutScale={containLayout.scale}
              onCropChange={handleCropChange}
            />
          ) : null}

          {isExporting ? <ExportSheetLoadingOverlay color={color} label={loadingLabel} /> : null}
        </View>

        {imageSize && !isPreviewBusy ? (
          <GraphExportCropTemplates
            activeTemplateId={cropTemplateId}
            backgroundId={backgroundId}
            canReset={canResetCrop}
            color={color}
            disabled={isPreviewBusy}
            onBackgroundSelect={handleBackgroundSelect}
            onReset={handleResetCrop}
            onSelect={handleApplyCropTemplate}
          />
        ) : null}

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
      </AppBottomSheetContent>

      {visible && imageUri && imageSize && crop && cropCaptureLayout ? (
        <View
          collapsable={false}
          pointerEvents="none"
          style={{
            height: cropCaptureLayout.shotHeight,
            left: 0,
            opacity: 0,
            position: 'absolute',
            top: 0,
            width: cropCaptureLayout.shotWidth,
            zIndex: -1,
          }}
        >
          <ViewShot
            ref={cropCaptureRef}
            options={getGraphExportViewShotCaptureOptions()}
            style={{
              backgroundColor: backgroundStyle.backgroundColor,
              height: cropCaptureLayout.shotHeight,
              width: cropCaptureLayout.shotWidth,
            }}
          >
            <GraphExportBackgroundFill
              background={backgroundStyle}
              height={cropCaptureLayout.imageHeight}
              offsetX={cropCaptureLayout.offsetX}
              offsetY={cropCaptureLayout.offsetY}
              showTransparencyGrid={false}
              width={cropCaptureLayout.imageWidth}
            />
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
