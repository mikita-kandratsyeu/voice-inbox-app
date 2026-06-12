import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Box } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';
import type { TextInput } from 'react-native-gesture-handler';

import type { Colors } from '@/shared/config';
import { hapticSelection, hapticSuccess } from '@/shared/lib';
import { listPrivateRemoteModels } from '@/shared/lib/ai-core/privateRemoteProvider';
import runAfterInteractions from '@/shared/lib/runAfterInteractions';
import {
  AppBottomSheetModal,
  RetryErrorState,
  SettingsRow,
  SheetFooterButtons,
  SheetHeader,
  useBottomSheetContentPadding,
} from '@/shared/ui';

import { PrivateRemoteSheetPickerRow } from './PrivateRemoteSheetPickerRow';

type PrivateRemoteModelsPickerProps = {
  baseUrl: string;
  apiKey: string;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  color: Colors;
  refreshNonce?: number;
};

export function PrivateRemoteModelsPicker({
  baseUrl,
  apiKey,
  selectedModel,
  onModelChange,
  color,
  refreshNonce = 0,
}: PrivateRemoteModelsPickerProps) {
  const { t } = useTranslation();
  const contentPadding = useBottomSheetContentPadding(24);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [presentRequestKey, setPresentRequestKey] = useState(0);
  const [models, setModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const modelInputRef = useRef<TextInput>(null);

  const trimmedSelected = selectedModel.trim();
  const trimmedUrl = baseUrl.trim();
  const canDone = trimmedSelected.length > 0;

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

  useEffect(() => {
    if (!sheetVisible) return;
    const task = runAfterInteractions(() => {
      requestAnimationFrame(() => {
        modelInputRef.current?.focus();
      });
    });
    return () => task.cancel();
  }, [sheetVisible]);

  const openSheet = useCallback(() => {
    hapticSelection();
    setPresentRequestKey((key) => key + 1);
    setSheetVisible((current) => {
      if (!current) return true;
      requestAnimationFrame(() => setSheetVisible(true));
      return false;
    });
  }, []);

  const closeSheet = useCallback(() => setSheetVisible(false), []);

  const handleDone = useCallback(() => {
    if (!canDone) return;
    onModelChange(trimmedSelected);
    hapticSuccess();
    closeSheet();
  }, [canDone, closeSheet, onModelChange, trimmedSelected]);

  const pickModel = useCallback(
    (modelId: string) => {
      onModelChange(modelId);
      hapticSuccess();
      closeSheet();
    },
    [closeSheet, onModelChange],
  );

  const handleRetry = useCallback(() => {
    hapticSelection();
    void loadModels();
  }, [loadModels]);

  const triggerSubtitle = useMemo(() => {
    if (trimmedSelected) return undefined;
    if (!trimmedUrl) return t('aiSettings.privateProvider.modelList.needBaseUrl');
    return t('aiSettings.privateProvider.modelList.pickFromServer');
  }, [t, trimmedSelected, trimmedUrl]);

  const serverListBody = (() => {
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
        <RetryErrorState
          color={color}
          title={t('aiSettings.privateProvider.modelList.loadErrorTitle')}
          message={error}
          retryLabel={t('recordingDetail.summaryRetry')}
          onRetry={handleRetry}
          retryDisabled={isLoading}
        />
      );
    }
    if (models.length === 0) {
      return (
        <RetryErrorState
          color={color}
          title={t('aiSettings.privateProvider.modelList.loadErrorTitle')}
          message={t('aiSettings.privateProvider.modelList.empty')}
          retryLabel={t('recordingDetail.summaryRetry')}
          onRetry={handleRetry}
          retryDisabled={isLoading}
        />
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
        {t('aiSettings.privateProvider.model')}
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

      <AppBottomSheetModal
        visible={sheetVisible}
        presentRequestKey={presentRequestKey}
        onClose={closeSheet}
      >
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 4,
            ...contentPadding,
            gap: 12,
          }}
        >
          <SheetHeader
            title={t('aiSettings.privateProvider.modelList.sheetTitle')}
            subtitle={t('aiSettings.privateProvider.modelList.sheetSubtitle')}
            color={color}
            marginBottom={16}
          />

          <Text className="mb-2 text-[13px] font-semibold" style={{ color: color.text.secondary }}>
            {t('aiSettings.privateProvider.modelList.manualInput')}
          </Text>
          <BottomSheetTextInput
            ref={modelInputRef}
            value={selectedModel}
            onChangeText={onModelChange}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('aiSettings.privateProvider.modelPlaceholder')}
            placeholderTextColor={color.text.muted}
            className="rounded-xl border px-4 py-3 text-[16px]"
            style={{
              borderColor: color.border.default,
              color: color.text.primary,
              backgroundColor: color.background.tertiary,
            }}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={handleDone}
            accessibilityLabel={t('aiSettings.privateProvider.model')}
          />

          <Text
            className="mb-1.5 mt-1 text-[13px] font-semibold"
            style={{ color: color.text.secondary }}
          >
            {t('aiSettings.privateProvider.modelList.fromServer')}
          </Text>
          <View
            style={{
              backgroundColor: color.background.card,
              borderColor: color.border.default,
              borderRadius: 12,
              borderWidth: 1,
              overflow: 'hidden',
            }}
          >
            {serverListBody}
          </View>

          <SheetFooterButtons
            className="mt-1 w-full"
            color={color}
            primaryLabel={t('common.done')}
            onPrimaryPress={handleDone}
            primaryDisabled={!canDone}
            primaryAccessibilityLabel={t('common.done')}
            secondaryLabel={t('common.cancel')}
            onSecondaryPress={closeSheet}
            secondaryAccessibilityLabel={t('common.cancel')}
          />
        </BottomSheetScrollView>
      </AppBottomSheetModal>
    </>
  );
}
