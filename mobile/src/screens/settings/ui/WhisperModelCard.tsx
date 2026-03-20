import { Check, Download, Smartphone, Trash2, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import type {
  DownloadBytes,
  WhisperModel,
  WhisperModelId,
  WhisperModelStatus,
} from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { formatFileSize } from '@/shared/lib/whisper';

import { getAccuracyLabel, getSpeedLabel } from '../config';
import { getCardRadiusClass, getSpeedColor } from '../lib';
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
}: WhisperModelCardProps) => {
  const { t } = useTranslation();
  const isDownloaded = status === 'downloaded';
  const isDownloading = status === 'downloading';
  const isError = status === 'error';
  const isLast = index === total - 1;
  const isRecommended = model.id === recommendedModelId;
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

  return (
    <TouchableOpacity
      key={model.id}
      onPress={() => onPress(model.id)}
      activeOpacity={0.7}
      className={`px-4 py-4 ${radiusClass}`}
      style={[{ backgroundColor: color.background.card }, borderStyle]}
    >
      <View className="flex-row items-center justify-between">
        <View className="mr-3 flex-1">
          <View className="mb-1 flex-row flex-wrap items-center gap-2">
            <Text className="text-[16px] font-semibold" style={{ color: color.text.primary }}>
              Whisper {model.name}
            </Text>
            <View
              className="rounded-full px-2 py-0.5"
              style={{ backgroundColor: color.background.tertiary }}
            >
              <Text className="text-[12px]" style={{ color: color.text.secondary }}>
                {displaySize}
              </Text>
            </View>
            {isRecommended && (
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
            )}
          </View>

          <Text className="mb-1.5 text-[14px] leading-5" style={{ color: color.text.secondary }}>
            {t(
              `whisper.models.${model.id.replace('whisper-', '').replace('-', '_')}Desc` as 'whisper.models.tinyDesc',
            )}
          </Text>
          <View className="flex-row items-center gap-3">
            <Text className="text-[14px]" style={{ color: color.text.secondary }}>
              {t('whisper.qualityLabel')}: {getAccuracyLabel(model.accuracy)}
            </Text>
            <View className="flex-row items-center gap-1">
              <View
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: getSpeedColor(model.speed, color) }}
              />
              <Text className="text-[14px]" style={{ color: color.text.secondary }}>
                {getSpeedLabel(model.speed)}
              </Text>
            </View>
          </View>
          {compatibility && (
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
              <TouchableOpacity
                onPress={() => onCancelDownload(model.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
          ) : !isDownloaded ? (
            <Text className="mt-1.5 text-[14px]" style={{ color: color.text.secondary }}>
              {t('whisper.tapToDownload')}
            </Text>
          ) : null}
        </View>
        <View className="items-center gap-2">
          {isDownloaded && isSelected ? (
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: color.accent.primary }}
            >
              <Check size={16} color={color.icon.onAccent} strokeWidth={2.5} />
            </View>
          ) : isDownloaded ? (
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
              <Download size={16} color={color.accent.primary} strokeWidth={2} />
            </View>
          )}
          {isDownloaded && (
            <TouchableOpacity
              onPress={() => onDelete(model.id)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              className="h-7 w-7 items-center justify-center rounded-full"
              style={{ backgroundColor: color.background.tertiary }}
            >
              <Trash2 size={14} color={color.accent.delete} strokeWidth={2} />
            </TouchableOpacity>
          )}

          {isError && (
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: color.background.tertiary }}
            >
              <X size={16} color={color.accent.delete} strokeWidth={2} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};
