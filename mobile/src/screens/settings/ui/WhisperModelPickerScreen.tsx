import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { WhisperModelId } from '@/entities/settings';
import {
  useRecommendedWhisperModelId,
  useSettingsStore,
  useWhisperModelCompatibility,
  WHISPER_MODELS,
} from '@/entities/settings';
import { InboxBannerAd } from '@/features/inbox-banner';
import { getModelFileSizeBytes, useModelManager } from '@/features/model-manager';
import { useColors } from '@/shared/config';
import { useTabletContentMaxWidth } from '@/shared/lib';
import { formatFileSize } from '@/shared/lib/whisper';
import { ScreenHeader } from '@/shared/ui';

import { WhisperDefaultLanguageSection } from './WhisperDefaultLanguageSection';
import { WhisperModelCard } from './WhisperModelCard';

export const WhisperModelPickerScreen = () => {
  const { t } = useTranslation();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const contentMaxWidth = useTabletContentMaxWidth();
  const { width: windowWidth } = useWindowDimensions();
  const bannerMaxWidth = contentMaxWidth ?? windowWidth;

  const selectedWhisperModel = useSettingsStore((s) => s.selectedWhisperModel);
  const whisperModelStatuses = useSettingsStore((s) => s.whisperModelStatuses);
  const whisperDownloadProgress = useSettingsStore((s) => s.whisperDownloadProgress);
  const whisperDownloadBytes = useSettingsStore((s) => s.whisperDownloadBytes);
  const whisperDownloadPhase = useSettingsStore((s) => s.whisperDownloadPhase);
  const setWhisperModel = useSettingsStore((s) => s.setWhisperModel);

  const compatibility = useWhisperModelCompatibility();
  const recommendedModelId = useRecommendedWhisperModelId();
  const { startDownload, cancelDownload, removeModel } = useModelManager();

  const [realSizes, setRealSizes] = useState<Partial<Record<WhisperModelId, string>>>({});
  const refreshRequestIdRef = useRef(0);

  const refreshRealSizes = useCallback(async () => {
    const requestId = ++refreshRequestIdRef.current;
    const entries = await Promise.all(
      WHISPER_MODELS.map(async (m) => {
        const status = whisperModelStatuses[m.id] ?? 'not_downloaded';
        if (status !== 'downloaded') return [m.id, null] as const;
        const bytes = await getModelFileSizeBytes(m.id);
        if (bytes <= 0) return [m.id, null] as const;
        return [m.id, formatFileSize(bytes)] as const;
      }),
    );

    if (requestId !== refreshRequestIdRef.current) {
      return;
    }

    const updated: Partial<Record<WhisperModelId, string>> = {};
    for (const [id, size] of entries) {
      if (size) updated[id] = size;
    }
    setRealSizes(updated);
  }, [whisperModelStatuses]);

  useEffect(() => {
    refreshRealSizes();
  }, [refreshRealSizes]);

  const handleDownload = (id: WhisperModelId, sizeMb: number) => {
    Alert.alert(t('whisper.downloadModel'), t('whisper.downloadConfirm', { size: sizeMb }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.download'), onPress: () => startDownload(id) },
    ]);
  };

  const handleDelete = (id: WhisperModelId) => {
    const model = WHISPER_MODELS.find((m) => m.id === id);
    Alert.alert(
      t('whisper.deleteModel'),
      t('whisper.deleteConfirmWithName', { name: model?.name ?? '' }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            await removeModel(id);
            await refreshRealSizes();
          },
        },
      ],
    );
  };

  const handleSelect = (id: WhisperModelId) => {
    const status = whisperModelStatuses[id] ?? 'not_downloaded';
    if (status === 'downloading') return;
    if (status !== 'downloaded') {
      const model = WHISPER_MODELS.find((m) => m.id === id);
      if (model) handleDownload(id, model.sizeMb);
      return;
    }
    setWhisperModel(id);
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.background.secondary }}>
      <ScreenHeader title={t('whisper.modelTitle')} onBack={() => navigation.goBack()} />
      <View
        style={{
          flex: 1,
          alignSelf: 'center',
          width: '100%',
          maxWidth: contentMaxWidth,
        }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="mb-4 text-[14px] leading-5" style={{ color: color.text.secondary }}>
            {t('whisper.modelDescription')}
          </Text>
          <WhisperDefaultLanguageSection color={color} />
          <View className="overflow-hidden rounded-2xl">
            {WHISPER_MODELS.map((model, index) => (
              <WhisperModelCard
                key={model.id}
                model={model}
                index={index}
                total={WHISPER_MODELS.length}
                status={whisperModelStatuses[model.id] ?? 'not_downloaded'}
                isSelected={model.id === selectedWhisperModel}
                displaySize={realSizes[model.id] || formatFileSize(model.sizeMb * 1024 * 1024)}
                recommendedModelId={recommendedModelId}
                compatibility={compatibility ? compatibility[model.id] : null}
                color={color}
                onPress={handleSelect}
                onDelete={handleDelete}
                onCancelDownload={cancelDownload}
                downloadPercent={whisperDownloadProgress[model.id]}
                downloadBytes={whisperDownloadBytes[model.id]}
                downloadPhase={whisperDownloadPhase[model.id]}
              />
            ))}
          </View>
          <InboxBannerAd color={color} contentMaxWidth={bannerMaxWidth} />
        </ScrollView>
      </View>
    </View>
  );
};
