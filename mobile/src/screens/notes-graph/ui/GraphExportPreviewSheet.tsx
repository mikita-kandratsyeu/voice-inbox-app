import { BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, Share, StyleSheet, Text, View } from 'react-native';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import { isUserCancelledShare } from '@/features/share-record/lib/isUserCancelledShare';
import { type Colors, useColors } from '@/shared/config';
import { diagWarn } from '@/shared/lib/appLogger';
import { hapticLight, hapticSuccess } from '@/shared/lib/haptics';
import { AppBottomSheetModal, SheetFooterButtons, useBottomSheetContentPadding } from '@/shared/ui';

import { getGraphExportViewShotCaptureOptions } from '../lib/computeGraphExportLayout';
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
import { GraphExportCropOverlay } from './GraphExportCropOverlay';
import { GraphExportCropTemplates } from './GraphExportCropTemplates';

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
  const [cropTemplateId, setCropTemplateId] = useState<CropAspectTemplateId>('full');

  useEffect(() => {
    if (!visible || !imageUri) {
      setImageSize(null);
      setCrop(null);
      setCropTemplateId('full');
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
  }, [imagePixelSize, imageUri, onClose, t, visible]);

  const containLayout = useMemo(() => {
    if (!imageSize || previewWidth <= 0) return null;
    return computeContainLayout(imageSize.width, imageSize.height, previewWidth, PREVIEW_HEIGHT);
  }, [imageSize, previewWidth]);

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
          {imageUri && containLayout ? (
            <Image
              source={{ uri: imageUri }}
              style={{
                height: containLayout.height,
                left: containLayout.x,
                position: 'absolute',
                top: containLayout.y,
                width: containLayout.width,
              }}
            />
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

          {isPreviewBusy ? <ExportSheetLoadingOverlay color={color} label={loadingLabel} /> : null}
        </View>

        {imageSize && !isPreviewBusy ? (
          <GraphExportCropTemplates
            activeTemplateId={cropTemplateId}
            canReset={canResetCrop}
            color={color}
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
      </BottomSheetView>

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
