import { Box } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';

import type { Colors } from '@/shared/config';
import { hapticSelection } from '@/shared/lib';
import { listPrivateRemoteModels } from '@/shared/lib/ai-core/privateRemoteProvider';
import { SettingsRow } from '@/shared/ui';

import { PrivateRemotePickerSheetFrame } from './PrivateRemotePickerSheetFrame';
import { PrivateRemoteSheetPickerRow } from './PrivateRemoteSheetPickerRow';

type PrivateRemoteModelsPickerProps = {
  baseUrl: string;
  apiKey: string;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  color: Colors;
  refreshNonce?: number;
};

export function PrivateRemoteModelsPicker({
  baseUrl,
  apiKey,
  selectedModel,
  onSelectModel,
  color,
  refreshNonce = 0,
}: PrivateRemoteModelsPickerProps) {
  const { t } = useTranslation();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const trimmedSelected = selectedModel.trim();
  const trimmedUrl = baseUrl.trim();

  const loadModels = useCallback(async () => {
    if (!trimmedUrl) {
      setModels([]);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    const result = await listPrivateRemoteModels({
      privateRemoteBaseUrl: trimmedUrl,
      privateRemoteApiKey: apiKey,
    });

    if (requestId !== requestIdRef.current) return;

    setIsLoading(false);
    if (result.ok) {
      setModels(result.models);
      setError(null);
      return;
    }
    setModels([]);
    setError(result.error);
  }, [apiKey, trimmedUrl]);

  useEffect(() => {
    setModels([]);
    setError(null);
  }, [trimmedUrl, apiKey, refreshNonce]);

  useEffect(() => {
    if (!sheetVisible) return;
    void loadModels();
  }, [sheetVisible, loadModels, refreshNonce]);

  const openSheet = useCallback(() => {
    hapticSelection();
    setSheetVisible(true);
  }, []);

  const closeSheet = useCallback(() => setSheetVisible(false), []);

  const pickModel = useCallback(
    (modelId: string) => {
      onSelectModel(modelId);
      closeSheet();
    },
    [closeSheet, onSelectModel],
  );

  const triggerSubtitle = useMemo(() => {
    if (trimmedSelected) return undefined;
    if (!trimmedUrl) return t('aiSettings.privateProvider.modelList.needBaseUrl');
    return t('aiSettings.privateProvider.modelList.pickFromServer');
  }, [t, trimmedSelected, trimmedUrl]);

  const sheetBody = (() => {
    if (!trimmedUrl) {
      return (
        <View className="px-4 py-5">
          <Text
            className="text-center text-[14px] leading-5"
            style={{ color: color.text.secondary }}
          >
            {t('aiSettings.privateProvider.modelList.needBaseUrl')}
          </Text>
        </View>
      );
    }
    if (isLoading) {
      return (
        <View className="items-center py-8">
          <ActivityIndicator size="small" color={color.text.muted} />
        </View>
      );
    }
    if (error) {
      return (
        <View className="px-4 py-5">
          <Text
            className="text-center text-[14px] leading-5"
            style={{ color: color.accent.delete }}
          >
            {error}
          </Text>
        </View>
      );
    }
    if (models.length === 0) {
      return (
        <View className="px-4 py-5">
          <Text className="text-center text-[14px] leading-5" style={{ color: color.text.muted }}>
            {t('aiSettings.privateProvider.modelList.empty')}
          </Text>
        </View>
      );
    }
    return models.map((modelId, index) => (
      <PrivateRemoteSheetPickerRow
        key={modelId}
        label={modelId}
        color={color}
        icon={Box}
        selected={modelId === trimmedSelected}
        isLast={index === models.length - 1}
        onPress={() => pickModel(modelId)}
      />
    ));
  })();

  return (
    <>
      <Text className="mb-2 text-[13px] font-semibold" style={{ color: color.text.secondary }}>
        {t('aiSettings.privateProvider.modelList.title')}
      </Text>
      <View
        className="overflow-hidden rounded-2xl"
        style={{ borderWidth: 1, borderColor: color.border.default }}
      >
        <SettingsRow
          label={trimmedSelected || t('aiSettings.privateProvider.modelList.pickFromServer')}
          subtitle={triggerSubtitle}
          onPress={openSheet}
          leftIcon={<Box size={20} color={color.accent.primary} strokeWidth={2} />}
          showChevron
          isFirst
          isLast
        />
      </View>

      <PrivateRemotePickerSheetFrame
        visible={sheetVisible}
        title={t('aiSettings.privateProvider.modelList.sheetTitle')}
        subtitle={t('aiSettings.privateProvider.modelList.sheetSubtitle')}
        color={color}
        onClose={closeSheet}
      >
        {sheetBody}
      </PrivateRemotePickerSheetFrame>
    </>
  );
}
