import { Check, Download, Smartphone, Trash2, X } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import type { WhisperModel, WhisperModelId, WhisperModelStatus } from '@/entities/settings';
import type { Colors } from '@/shared/config';

import { ACCURACY_LABEL, RECOMMENDED_MODEL_ID, SPEED_LABEL } from '../config';
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
  compatibility: CompatibilityInfo | null;
  color: Colors;
  onPress: (id: WhisperModelId) => void;
  onDelete: (id: WhisperModelId) => void;
  onCancelDownload: (id: WhisperModelId) => void;
};

export const WhisperModelCard = ({
  model,
  index,
  total,
  status,
  isSelected,
  displaySize,
  compatibility,
  color,
  onPress,
  onDelete,
  onCancelDownload,
}: WhisperModelCardProps) => {
  const isDownloaded = status === 'downloaded';
  const isDownloading = status === 'downloading';
  const isError = status === 'error';
  const isLast = index === total - 1;
  const isRecommended = model.id === RECOMMENDED_MODEL_ID;

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
                  Рекомендуется
                </Text>
              </View>
            )}
          </View>

          <Text className="mb-1.5 text-[14px] leading-5" style={{ color: color.text.secondary }}>
            {model.description}
          </Text>

          <View className="flex-row items-center gap-3">
            <Text className="text-[14px]" style={{ color: color.text.secondary }}>
              Качество: {ACCURACY_LABEL[model.accuracy]}
            </Text>
            <View className="flex-row items-center gap-1">
              <View
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: getSpeedColor(model.speed, color) }}
              />
              <Text className="text-[14px]" style={{ color: color.text.secondary }}>
                {SPEED_LABEL[model.speed]}
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
                {compatibility.isCompatible ? 'Совместимо с устройством' : compatibility.reason}
              </Text>
            </View>
          )}

          {isDownloading ? (
            <TouchableOpacity
              className="mt-2"
              onPress={() => onCancelDownload(model.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-[13px]" style={{ color: color.text.secondary }}>
                Отмена
              </Text>
            </TouchableOpacity>
          ) : isError ? (
            <Text className="mt-1.5 text-[14px] font-medium" style={{ color: color.accent.delete }}>
              Ошибка загрузки — нажмите для повтора
            </Text>
          ) : !isDownloaded ? (
            <Text className="mt-1.5 text-[14px]" style={{ color: color.text.secondary }}>
              Не скачана — нажмите для загрузки
            </Text>
          ) : null}
        </View>

        <View className="items-center gap-2">
          {isDownloaded && isSelected ? (
            <View
              className="h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: color.accent.primary }}
            >
              <Check size={16} color="#ffffff" strokeWidth={2.5} />
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
