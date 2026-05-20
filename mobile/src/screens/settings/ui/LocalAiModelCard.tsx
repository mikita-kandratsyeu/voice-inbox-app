import { Check, Download, RotateCcw } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';

import type {
  DownloadBytes,
  LocalAiModelCatalogEntry,
  LocalAiModelId,
  WhisperModelStatus,
} from '@/entities/settings';
import { formatModelContextTokens } from '@/entities/settings';
import type { Colors } from '@/shared/config';
import { getLocalLlmNCtx } from '@/shared/lib/ai-core/localLlmModelProfiles';
import { formatFileSize } from '@/shared/lib/whisper';

import { getCardRadiusClass } from '../lib';
import { type ModelMetaChip, ModelMetaChips } from './ModelMetaChips';
import { WhisperModelSpinner } from './WhisperModelSpinner';

type LocalAiModelCardProps = {
  model: LocalAiModelCatalogEntry;
  index: number;
  total: number;
  status: WhisperModelStatus;
  isSelected: boolean;
  displaySize: string;
  approxSizeLabel: string;
  recommendedModelId: LocalAiModelId;
  color: Colors;
  onPress: (id: LocalAiModelId) => void;
  onDelete: (id: LocalAiModelId) => void;
  onCancelDownload: (id: LocalAiModelId) => void;
  downloadPercent?: number;
  downloadBytes?: DownloadBytes;
};

export const LocalAiModelCard = ({
  model,
  index,
  total,
  status,
  isSelected,
  displaySize,
  recommendedModelId,
  color,
  onPress,
  onDelete,
  onCancelDownload,
  downloadPercent = 0,
  downloadBytes,
}: LocalAiModelCardProps) => {
  const { t } = useTranslation();
  const isDownloaded = status === 'downloaded';
  const isDownloading = status === 'downloading';
  const isError = status === 'error';
  const isLast = index === total - 1;
  const isRecommended = model.id === recommendedModelId;
  const metaChips: ModelMetaChip[] = [
    {
      key: 'context',
      label: t('aiModels.contextChip', {
        size: formatModelContextTokens(getLocalLlmNCtx(model.id)),
      }),
    },
    { key: 'size', label: displaySize },
    {
      key: 'speed',
      label: t(`aiModels.speed.${model.speed}`, { defaultValue: model.speed }),
    },
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

  return (
    <TouchableOpacity
      key={model.id}
      onPress={() => onPress(model.id)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={model.name}
      accessibilityState={{
        selected: isDownloaded && isSelected,
        disabled: isDownloading,
      }}
      className={`px-4 py-4 ${radiusClass}`}
      style={[{ backgroundColor: color.background.card }, borderStyle]}
    >
      <View className="flex-row items-center justify-between">
        <View className="mr-3 flex-1">
          <View className="mb-1 flex-row flex-wrap items-center gap-2">
            <Text className="text-[16px] font-semibold" style={{ color: color.text.primary }}>
              {model.name}
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
            {t(model.descriptionKey as 'aiModels.localQwen3Desc')}
          </Text>
          <ModelMetaChips color={color} chips={metaChips} className="mb-1.5" />

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
              <Text className="text-[12px] leading-4" style={{ color: color.text.muted }}>
                {t('whisper.downloadPhaseWeights')}
              </Text>
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
              {t('aiModels.localDownloadError')}
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
