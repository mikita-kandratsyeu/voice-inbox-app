import { Check, Download, RotateCcw, Smartphone } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import type {
  DownloadBytes,
  WhisperDownloadPhase,
  WhisperModel,
  WhisperModelId,
  WhisperModelStatus,
} from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { formatFileSize, getWhisperLabel, getWhisperModelShortLabelKey } from '@/shared/lib/whisper';

import { getSpeedLabel } from '../config';
import { getCardRadiusClass } from '../lib';
import { type ModelMetaChip, ModelMetaChips } from './ModelMetaChips';
import { WhisperModelSpinner } from './WhisperModelSpinner';

type CompatibilityInfo = {
  isCompatible: boolean;
  reason?: string;
};

type WhisperModelCardProps = {
  model: WhisperModel;
  index: number;
  total: number;
  status: WhisperModelStatus;
  isSelected: boolean;
  displaySize: string;
  recommendedModelId: WhisperModelId;
  compatibility: CompatibilityInfo | null;
  color: Colors;
  onPress: (id: WhisperModelId) => void;
  onDelete: (id: WhisperModelId) => void;
  onCancelDownload: (id: WhisperModelId) => void;
  downloadPercent?: number;
  downloadBytes?: DownloadBytes;
  downloadPhase?: WhisperDownloadPhase;
  /** iOS: Core ML encoder present on disk for this model (matches runtime init). */
  coreMlEncoderActive: boolean;
  /** iOS WhisperKit: model is used on demand without a local ggml file. */
  iosWhisperKitManaged?: boolean;
  /** Render inside a SettingsSection card (no standalone card chrome). */
  embedded?: boolean;
};

export const WhisperModelCard = ({
  model,
  index,
  total,
  status,
  isSelected,
  displaySize,
  recommendedModelId,
  compatibility,
  color,
  onPress,
  onDelete,
  onCancelDownload,
  downloadPercent = 0,
  downloadBytes,
  downloadPhase,
  coreMlEncoderActive,
  iosWhisperKitManaged = false,
  embedded = false,
}: WhisperModelCardProps) => {
  const { t } = useTranslation();
  const isDownloaded = status === 'downloaded';
  const isIosManaged = iosWhisperKitManaged && !isDownloaded;
  const isReadyForUse = isDownloaded || isIosManaged;
  const isDownloading = status === 'downloading';
  const isError = status === 'error';
  const isLast = index === total - 1;
  const isRecommended = model.id === recommendedModelId;
  // speed → size → Core ML (no provider row; behavior → specs → platform)
  const metaChips: ModelMetaChip[] = [
    ...(iosWhisperKitManaged ? [] : [{ key: 'speed', label: getSpeedLabel(model.speed) }]),
    { key: 'size', label: displaySize },
    ...(coreMlEncoderActive ? [{ key: 'coreml', label: t('whisper.coreMlChip') }] : []),
  ];
  const pct = Math.min(100, Math.max(0, Math.round(downloadPercent)));
  const showByteProgress =
    downloadBytes !== undefined &&
    downloadBytes.total > 0 &&
    downloadBytes.written >= 0 &&
    downloadBytes.written <= downloadBytes.total * 1.02;

  const borderStyle = !isLast
    ? { borderBottomWidth: 1, borderBottomColor: color.border.default }
    : {};
  const radiusClass = getCardRadiusClass(index, total);

  const displayTitle = iosWhisperKitManaged
    ? t(getWhisperModelShortLabelKey(model.id))
    : getWhisperLabel(model.id);
  const descriptionText = iosWhisperKitManaged
    ? t(`whisper.iosModelQuality.${model.id}`)
    : t(
        `whisper.models.${model.id.replace('whisper-', '').replace('-', '_')}Desc` as 'whisper.models.tinyDesc',
      );

  const rowStatusA11y = isError
    ? t('whisper.a11yRowError')
    : isDownloading
      ? t('whisper.a11yRowDownloading')
      : isReadyForUse
        ? isSelected
          ? t('whisper.a11yRowSelected')
          : t('whisper.a11yRowDownloaded')
        : t('whisper.a11yRowNotDownloaded');
  const cardA11yLabel = [
    t('whisper.a11yModelPrefix', {
      name: iosWhisperKitManaged ? t(getWhisperModelShortLabelKey(model.id)) : model.name,
    }),
    coreMlEncoderActive ? t('whisper.coreMlAcceleratedA11y') : null,
    isRecommended ? t('whisper.recommended') : null,
    rowStatusA11y,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <TouchableOpacity
      key={model.id}
      onPress={() => onPress(model.id)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={cardA11yLabel}
      accessibilityState={{
        selected: isReadyForUse && isSelected,
        disabled: isDownloading,
      }}
      className={`px-4 py-3.5 ${radiusClass}`}
      style={[
        { backgroundColor: embedded ? color.background.card : color.background.card },
        borderStyle,
      ]}
    >
      <View className="flex-row items-center justify-between">
        <View className="mr-3 flex-1">
          <View className="mb-1 flex-row flex-wrap items-center gap-2">
            <Text className="text-[16px] font-semibold" style={{ color: color.text.primary }}>
              {displayTitle}
            </Text>
            {isRecommended ? (
              <View
                className="rounded-full px-2 py-0.5"
                style={{ backgroundColor: color.status.processing.bg }}
              >
                <Text
                  className="text-[12px] font-medium"
                  style={{ color: color.status.processing.text }}
                >
                  {t('whisper.recommended')}
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="mb-2 text-[14px] leading-5" style={{ color: color.text.secondary }}>
            {descriptionText}
          </Text>
          <ModelMetaChips color={color} chips={metaChips} className="mb-1.5" />
          {!iosWhisperKitManaged && compatibility && (
            <View className="mt-1.5 flex-row items-center gap-2">
              <Smartphone
                size={14}
                color={compatibility.isCompatible ? color.accent.success : color.accent.delete}
                strokeWidth={2}
              />
              <Text
                className="flex-1 text-[14px]"
                style={{
                  color: compatibility.isCompatible ? color.accent.success : color.accent.delete,
                }}
              >
                {compatibility.isCompatible ? t('whisper.compatible') : compatibility.reason}
              </Text>
            </View>
          )}
          {isDownloading ? (
            <View className="mt-2 gap-2">
              <View
                className="h-1.5 overflow-hidden rounded-full"
                style={{ backgroundColor: color.background.tertiary }}
              >
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color.status.processing.text,
                  }}
                />
              </View>
              <Text className="text-[13px]" style={{ color: color.text.secondary }}>
                {showByteProgress
                  ? t('whisper.downloadProgressBytes', {
                      downloaded: formatFileSize(downloadBytes.written),
                      total: formatFileSize(downloadBytes.total),
                    })
                  : t('whisper.downloadProgressPercent', { percent: pct })}
              </Text>
              {downloadPhase != null && (
                <Text className="text-[12px] leading-4" style={{ color: color.text.muted }}>
                  {downloadPhase === 'coreml'
                    ? t('whisper.downloadPhaseCoreMl')
                    : t('whisper.downloadPhaseWeights')}
                </Text>
              )}
              <TouchableOpacity
                onPress={() => onCancelDownload(model.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('common.cancel')}
              >
                <Text className="text-[13px]" style={{ color: color.text.secondary }}>
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : isError ? (
            <Text className="mt-1.5 text-[14px] font-medium" style={{ color: color.accent.delete }}>
              {t('whisper.downloadError')}
            </Text>
          ) : isIosManaged ? (
            <Text className="mt-1.5 text-[14px]" style={{ color: color.text.secondary }}>
              {t('whisper.iosModelOnDemandHint')}
            </Text>
          ) : !isDownloaded ? (
            <Text className="mt-1.5 text-[14px]" style={{ color: color.text.secondary }}>
              {t('whisper.tapToDownload')}
            </Text>
          ) : (
            <TouchableOpacity
              onPress={() => onDelete(model.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              className="mt-2 self-start"
              accessibilityRole="button"
              accessibilityLabel={t('common.remove')}
            >
              <Text className="text-[13px]" style={{ color: color.text.secondary }}>
                {t('common.remove')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View className="items-center">
          {isReadyForUse && isSelected ? (
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: color.accent.primary }}
            >
              <Check size={16} color={color.icon.onAccent} strokeWidth={2.5} />
            </View>
          ) : isReadyForUse ? (
            <View
              className="h-8 w-8 rounded-full"
              style={{ borderWidth: 2, borderColor: color.border.default }}
            />
          ) : isDownloading ? (
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: color.status.processing.bg }}
            >
              <WhisperModelSpinner color={color.status.processing.text} />
            </View>
          ) : (
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: color.background.tertiary }}
            >
              {isError ? (
                <RotateCcw size={16} color={color.accent.primary} strokeWidth={2} />
              ) : (
                <Download size={16} color={color.accent.primary} strokeWidth={2} />
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};
