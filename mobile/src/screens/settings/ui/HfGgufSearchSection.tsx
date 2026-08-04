import { Search, X } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';

import type { DownloadBytes, LocalAiModelId, WhisperModelStatus } from '@/entities/settings';
import {
  customEntryToCatalogEntry,
  DEFAULT_LOCAL_AI_MODEL_ID,
  useSettingsStore,
} from '@/entities/settings';
import {
  buildCustomEntryFromSearchResult,
  buildCustomLocalAiModelId,
  isInstallableGgufFilename,
  useHfGgufSearch,
} from '@/features/hf-model-search';
import type { Colors } from '@/shared/config';
import { IS_IOS } from '@/shared/lib';
import { getInputFieldInputStyle } from '@/shared/ui';

import { LocalAiModelCard } from './LocalAiModelCard';

const HF_SEARCH_STATUS_MIN_HEIGHT = 56;

function formatApproxSizeMb(sizeMb: number): string {
  if (sizeMb <= 0) return '';
  if (sizeMb >= 1000) {
    return `~${(sizeMb / 1000).toFixed(1)} GB`;
  }
  return `~${sizeMb} MB`;
}

type HfGgufSearchSectionProps = {
  color: Colors;
  hasActiveDownload: boolean;
  localLlmModelStatuses: Partial<Record<LocalAiModelId, WhisperModelStatus>>;
  localLlmDownloadProgress: Partial<Record<LocalAiModelId, number>>;
  localLlmDownloadBytes: Partial<Record<LocalAiModelId, DownloadBytes>>;
  onInstall: (modelId: LocalAiModelId, sizeMb: number) => void;
  onSelect: (modelId: LocalAiModelId) => void;
  onDelete: (modelId: LocalAiModelId) => void;
  onCancelDownload: (modelId: LocalAiModelId) => void;
};

export const HfGgufSearchSection = ({
  color,
  hasActiveDownload,
  localLlmModelStatuses,
  localLlmDownloadProgress,
  localLlmDownloadBytes,
  onInstall,
  onSelect,
  onDelete,
  onCancelDownload,
}: HfGgufSearchSectionProps) => {
  const { t } = useTranslation();
  const addCustomLocalAiModel = useSettingsStore((s) => s.addCustomLocalAiModel);

  const {
    query,
    setQuery,
    results,
    isSearching,
    isSearchPending,
    searchError,
    clear,
    flushSearch,
  } = useHfGgufSearch();

  const [focused, setFocused] = React.useState(false);

  const handlePressModelId = useCallback(
    (modelId: LocalAiModelId) => {
      const result = results.find(
        (item) => buildCustomLocalAiModelId(item.repoId, item.fileName) === modelId,
      );
      if (!result) return;

      if (!isInstallableGgufFilename(result.fileName)) {
        Alert.alert(
          t('aiModels.hfSearchAuxiliaryBlockedTitle'),
          t('aiModels.hfSearchAuxiliaryBlockedBody'),
        );
        return;
      }

      const status = localLlmModelStatuses[modelId] ?? 'not_downloaded';

      if (status === 'downloading') return;

      if (status === 'downloaded') {
        onSelect(modelId);
        return;
      }

      if (hasActiveDownload) {
        Alert.alert(
          t('aiModels.localDownloadBlockedTitle'),
          t('aiModels.localDownloadBlockedBody'),
        );
        return;
      }

      const entry = buildCustomEntryFromSearchResult(result);
      addCustomLocalAiModel(entry);
      onInstall(modelId, entry.sizeMb);
    },
    [
      addCustomLocalAiModel,
      hasActiveDownload,
      localLlmModelStatuses,
      onInstall,
      onSelect,
      results,
      t,
    ],
  );

  const hasActiveSearch = query.trim().length >= 2;
  const isLoading = isSearching || isSearchPending;
  const hasResults = results.length > 0;
  const showResultsPanel = hasActiveSearch && (hasResults || isLoading || !!searchError);

  return (
    <View className="mb-5">
      <Text
        className="mb-1 px-1 text-xs font-semibold uppercase tracking-widest"
        style={{ color: color.text.secondary }}
      >
        {t('aiModels.hfSearchSectionTitle')}
      </Text>
      <Text className="mb-3 px-1 text-[13px] leading-5" style={{ color: color.text.muted }}>
        {t('aiModels.hfSearchSectionDescription')}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: color.background.tertiary,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: IS_IOS ? 10 : 8,
          borderWidth: 1,
          borderColor: focused ? color.accent.primary : color.border.default,
          marginBottom: 8,
        }}
      >
        <Search
          size={16}
          color={focused || query ? color.accent.primary : color.icon.muted}
          strokeWidth={2}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('aiModels.hfSearchPlaceholder')}
          placeholderTextColor={color.text.secondary}
          returnKeyType="search"
          onSubmitEditing={flushSearch}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          autoCorrect={false}
          style={[getInputFieldInputStyle(color), { flex: 1 }]}
          accessibilityLabel={t('aiModels.hfSearchPlaceholder')}
        />
        {query.length > 0 ? (
          <View
            style={{
              width: 16,
              height: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={color.accent.primary} />
            ) : (
              <Pressable
                onPress={clear}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('common.clear')}
              >
                <X size={16} color={color.text.secondary} strokeWidth={2.2} />
              </Pressable>
            )}
          </View>
        ) : null}
      </View>

      {showResultsPanel ? (
        hasResults ? (
          <View
            className="overflow-hidden rounded-2xl"
            style={{ opacity: isLoading ? 0.55 : 1 }}
            pointerEvents={isLoading ? 'none' : 'auto'}
          >
            {results.map((result, index) => {
              const catalogEntry = customEntryToCatalogEntry(
                buildCustomEntryFromSearchResult(result),
              );
              const modelId = catalogEntry.id;
              const status = localLlmModelStatuses[modelId] ?? 'not_downloaded';
              const approxSizeLabel = formatApproxSizeMb(catalogEntry.sizeMb);

              return (
                <LocalAiModelCard
                  key={`${result.repoId}/${result.fileName}`}
                  model={catalogEntry}
                  index={index}
                  total={results.length}
                  status={status}
                  isSelected={false}
                  displaySize={approxSizeLabel || t('aiModels.hfSearchUnknownSize')}
                  approxSizeLabel={approxSizeLabel || t('aiModels.hfSearchUnknownSize')}
                  recommendedModelId={DEFAULT_LOCAL_AI_MODEL_ID}
                  color={color}
                  onPress={handlePressModelId}
                  onDelete={onDelete}
                  onCancelDownload={onCancelDownload}
                  downloadPercent={localLlmDownloadProgress[modelId]}
                  downloadBytes={localLlmDownloadBytes[modelId]}
                />
              );
            })}
          </View>
        ) : (
          <View
            style={{
              minHeight: HF_SEARCH_STATUS_MIN_HEIGHT,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 4,
            }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={color.accent.primary} />
            ) : searchError ? (
              <Text className="text-[13px] leading-5" style={{ color: color.text.muted }}>
                {searchError}
              </Text>
            ) : null}
          </View>
        )
      ) : null}
    </View>
  );
};
